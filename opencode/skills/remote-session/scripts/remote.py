#!/usr/bin/env python3
"""Static remote metadata and route installer for the Remote session skill."""

import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
from urllib.parse import urlencode

SESSION_ID = re.compile(r"ses_[A-Za-z0-9]+\Z")
ROUTE_ID = re.compile(r"[a-f0-9]{32}\Z")
HOST = "thearch"
MAX_INPUT = 1024 * 1024
MAX_OUTPUT = 16 * 1024 * 1024
MAX_PAGES = 200


class RemoteError(Exception):
    pass


def fail(message):
    raise RemoteError(message)


def route_id(caller_id, target_id):
    value = f"{HOST}\0{caller_id}\0{target_id}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()[:32]


def absolute_directory(value):
    if (not isinstance(value, str) or not value or "\0" in value
            or not Path(value).is_absolute()):
        fail("session directory is not absolute")
    return value


def discover_opencode():
    candidates = []
    found = shutil.which("opencode")
    if found:
        candidates.append(found)
    home = Path.home()
    candidates.extend(str(home / item) for item in (
        ".local/bin/opencode", ".bun/bin/opencode", ".opencode/bin/opencode"))
    candidates.extend(("/usr/local/bin/opencode", "/usr/bin/opencode"))
    for candidate in candidates:
        path = Path(candidate).expanduser()
        if path.is_file() and os.access(path, os.X_OK):
            resolved = path.resolve()
            if resolved.is_absolute():
                return str(resolved)
    fail("cannot find an executable OpenCode CLI")


def api_get(executable, cwd, endpoint):
    directory = absolute_directory(str(cwd))
    if not Path(directory).is_dir():
        fail("OpenCode API directory is unavailable")
    try:
        result = subprocess.run([executable, "api", "get", endpoint], cwd=directory,
                                capture_output=True, timeout=30, check=False)
    except (OSError, subprocess.TimeoutExpired):
        fail("OpenCode API request failed")
    if result.returncode != 0 or len(result.stdout) > MAX_OUTPUT:
        fail("OpenCode API request failed")
    try:
        payload = json.loads(result.stdout)
    except (TypeError, UnicodeError, json.JSONDecodeError):
        fail("OpenCode API returned malformed JSON")
    if not isinstance(payload, dict) or "data" not in payload:
        fail("OpenCode API returned malformed JSON")
    return payload


def session_metadata(record):
    if not isinstance(record, dict):
        fail("OpenCode returned malformed session metadata")
    session_id = record.get("id")
    title = record.get("title")
    location = record.get("location")
    directory = location.get("directory") if isinstance(location, dict) else record.get("directory")
    directory = absolute_directory(directory)
    if not isinstance(session_id, str) or not SESSION_ID.fullmatch(session_id):
        fail("OpenCode returned malformed session metadata")
    if title is not None and not isinstance(title, str):
        fail("OpenCode returned malformed session metadata")
    parent_id = record.get("parentID")
    if parent_id is not None and not isinstance(parent_id, str):
        fail("OpenCode returned malformed session metadata")
    timing = record.get("time", {})
    if not isinstance(timing, dict):
        fail("OpenCode returned malformed session metadata")
    archived = timing.get("archived", record.get("archived"))
    if archived is not None and not isinstance(archived, (bool, int, float, str)):
        fail("OpenCode returned malformed session metadata")
    return {"id": session_id, "title": title, "directory": directory,
            "parentID": parent_id, "archived": archived}


def list_sessions(executable, search=None):
    if search is not None and (not isinstance(search, str) or "\0" in search or len(search) > 4096):
        fail("search text is invalid")
    results, cursor, seen = [], None, set()
    cwd = str(Path.home())
    for _page_number in range(MAX_PAGES):
        params = [("limit", "50"), ("order", "desc")]
        if search is not None:
            params.append(("search", search))
        if cursor is not None:
            params.append(("cursor", cursor))
        payload = api_get(executable, cwd, "/api/session?" + urlencode(params))
        entries = payload.get("data")
        if not isinstance(entries, list):
            fail("OpenCode returned malformed session list")
        results.extend(session_metadata(entry) for entry in entries)
        if "cursor" not in payload:
            return results
        page_cursor = payload["cursor"]
        if not isinstance(page_cursor, dict) or "next" not in page_cursor:
            fail("OpenCode returned malformed pagination cursor")
        next_cursor = page_cursor["next"]
        if next_cursor is None:
            return results
        if not isinstance(next_cursor, str) or not next_cursor:
            fail("OpenCode returned malformed pagination cursor")
        if next_cursor in seen:
            fail("OpenCode repeated a pagination cursor")
        seen.add(next_cursor)
        cursor = next_cursor
    fail("session listing is incomplete after 200 pages")


def exact_session(executable, session_id, directory):
    if not isinstance(session_id, str) or not SESSION_ID.fullmatch(session_id):
        fail("session ID is invalid")
    directory = absolute_directory(directory)
    payload = api_get(executable, directory, "/api/session/" + session_id)
    metadata = session_metadata(payload["data"])
    if metadata["id"] != session_id or metadata["directory"] != directory:
        fail("session identity or directory changed")
    return metadata


def inspect_target(executable, target_id):
    matches = [item for item in list_sessions(executable) if item["id"] == target_id]
    if len(matches) != 1:
        fail("exact remote session was not found uniquely")
    return exact_session(executable, target_id, matches[0]["directory"])


def archived(metadata):
    value = metadata["archived"]
    return value is True or (isinstance(value, (int, float)) and not isinstance(value, bool) and value != 0) or (isinstance(value, str) and bool(value))


def canonical_config(config):
    return (json.dumps(config, sort_keys=True, indent=2) + "\n").encode("utf-8")


def check_private_directory(path):
    info = path.lstat()
    if (stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode)
            or info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) & 0o077):
        fail("route directory is not a private directory owned by this user")


def ensure_directories(path):
    if not path.is_absolute():
        fail("route path is not absolute")
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current = current / part
        created = False
        try:
            info = current.lstat()
        except FileNotFoundError:
            try:
                os.mkdir(current, 0o700)
                created = True
            except FileExistsError:
                pass
            info = current.lstat()
        if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
            fail("route path contains a symlink or non-directory")
        if created:
            os.chmod(current, 0o700)


def private_file(path):
    try:
        info = path.lstat()
    except FileNotFoundError:
        return False
    if (stat.S_ISLNK(info.st_mode) or not stat.S_ISREG(info.st_mode)
            or info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) & 0o077):
        fail("route file is not private or is not owned by this user")
    return True


def safe_install(route, files):
    ensure_directories(route)
    check_private_directory(route.parent)
    check_private_directory(route)
    lock_path = route / "install.lock"
    if private_file(lock_path):
        flags = os.O_RDWR | getattr(os, "O_NOFOLLOW", 0)
        fd = os.open(lock_path, flags)
    else:
        flags = os.O_CREAT | os.O_EXCL | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0)
        fd = os.open(lock_path, flags, 0o600)
        os.fchmod(fd, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        expected = {}
        for name, (content, mode) in files.items():
            if name not in ("config.json", "relay.py") or "/" in name:
                fail("unexpected route file")
            if not isinstance(content, bytes):
                fail("route file content is invalid")
            path = route / name
            if private_file(path):
                if path.read_bytes() != content:
                    fail("existing route files differ; manual review is required")
            else:
                expected[name] = (content, mode)
        for name, (content, mode) in expected.items():
            path = route / name
            flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
            try:
                out = os.open(path, flags, mode)
            except FileExistsError:
                if not private_file(path) or path.read_bytes() != content:
                    fail("existing route files differ; manual review is required")
                continue
            try:
                os.fchmod(out, mode)
                view = memoryview(content)
                while view:
                    view = view[os.write(out, view):]
                os.fsync(out)
            except BaseException:
                os.close(out)
                try:
                    path.unlink()
                except OSError:
                    pass
                raise
            else:
                os.close(out)
        directory_fd = os.open(route, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        os.close(fd)
    return str(route)


def request_main(request):
    if not isinstance(request, dict) or not isinstance(request.get("op"), str):
        fail("request is invalid")
    op = request["op"]
    executable = discover_opencode()
    if op == "sessions":
        if set(request) - {"op", "search"}:
            fail("request is invalid")
        return {"sessions": list_sessions(executable, request.get("search"))}
    if op == "session":
        if set(request) != {"op", "target_id"} or not SESSION_ID.fullmatch(str(request.get("target_id", ""))):
            fail("request is invalid")
        return {"target": inspect_target(executable, request["target_id"])}
    if op == "install":
        if set(request) != {"op", "caller_id", "target_id", "route_id", "expected_target", "relay_source"}:
            fail("request is invalid")
        caller, target, route = request["caller_id"], request["target_id"], request["route_id"]
        if (not isinstance(caller, str) or not SESSION_ID.fullmatch(caller)
                or not isinstance(target, str) or not SESSION_ID.fullmatch(target)
                or not isinstance(route, str) or not ROUTE_ID.fullmatch(route)
                or route != route_id(caller, target)):
            fail("route identity is invalid")
        expected = request["expected_target"]
        if not isinstance(expected, dict) or set(expected) != {"id", "title", "directory", "parentID", "archived"}:
            fail("target metadata is invalid")
        if expected["id"] != target:
            fail("target metadata does not match")
        current = exact_session(executable, target, expected["directory"])
        if current != expected:
            fail("target session metadata changed; manual review is required")
        if archived(current):
            fail("target session is archived; ask before unarchiving")
        source = request["relay_source"]
        if not isinstance(source, str) or "\0" in source:
            fail("relay template is invalid")
        try:
            source_bytes = source.encode("utf-8")
        except UnicodeError:
            fail("relay template is invalid")
        if len(source_bytes) > 256 * 1024:
            fail("relay template is invalid")
        try:
            compile(source, "relay.py", "exec")
        except (SyntaxError, ValueError):
            fail("relay template is invalid")
        home = Path.home()
        route_dir = home / ".local/share/opencode/agent-relay/routes" / route
        relay_path = route_dir / "relay.py"
        if any(char in str(relay_path) for char in "\r\n\0"):
            fail("remote route path is invalid")
        config = {"role": "remote", "session_id": target, "opencode": executable,
                  "directory": current["directory"], "label": "thearch " + target,
                  "peer_label": "Mac " + caller}
        safe_install(route_dir, {"config.json": (canonical_config(config), 0o600),
                                 "relay.py": (source_bytes, 0o700)})
        return {"caller_id": caller, "target_id": target, "route_id": route,
                "remote_route": str(route_dir), "remote_script": str(relay_path),
                "target": current}
    fail("operation is invalid")


def read_request():
    raw = sys.stdin.buffer.read(MAX_INPUT + 1)
    if not raw or len(raw) > MAX_INPUT:
        fail("request is empty or too large")
    try:
        request = json.loads(raw)
    except (UnicodeError, json.JSONDecodeError):
        fail("request JSON is invalid")
    return request


def main():
    try:
        result = request_main(read_request())
        sys.stdout.write(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")
        return 0
    except RemoteError as error:
        print("remote: " + str(error), file=sys.stderr)
        return 1
    except OSError:
        print("remote: local file or process operation failed", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("remote: interrupted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
