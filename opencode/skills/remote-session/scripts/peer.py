#!/usr/bin/env python3
"""Discover and provision one explicit OpenCode session route on thearch."""

import argparse
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys

import remote

HOST = "thearch"
SESSION_ID = remote.SESSION_ID
HERE = Path(__file__).resolve().parent
REMOTE_SOURCE = (HERE / "remote.py").read_text(encoding="utf-8")
RELAY_PATH = HERE / "relay.py"


class PeerError(Exception):
    pass


def fail(message):
    raise PeerError(message)


def route_id(caller_id, target_id):
    return remote.route_id(caller_id, target_id)


def ssh_argv():
    command = "python3 -c " + shlex.quote(REMOTE_SOURCE)
    return ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10",
            "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=2",
            HOST, command]


def ssh_request(request):
    data = (json.dumps(request, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    try:
        result = subprocess.run(ssh_argv(), input=data, capture_output=True,
                                timeout=60, check=False)
    except (OSError, subprocess.TimeoutExpired):
        fail("SSH request failed")
    if result.returncode != 0 or len(result.stdout) > remote.MAX_OUTPUT:
        fail("SSH request failed")
    try:
        response = json.loads(result.stdout)
    except (TypeError, UnicodeError, json.JSONDecodeError):
        fail("remote returned malformed JSON")
    if not isinstance(response, dict):
        fail("remote returned malformed JSON")
    return response


def sessions(search=None):
    request = {"op": "sessions"}
    if search is not None:
        request["search"] = search
    response = ssh_request(request)
    results = response.get("sessions")
    if set(response) != {"sessions"} or not isinstance(results, list):
        fail("remote returned malformed session metadata")
    try:
        return [remote.session_metadata(item) for item in results]
    except remote.RemoteError:
        fail("remote returned malformed session metadata")


def discover_local_opencode():
    found = shutil.which("opencode")
    if not found:
        fail("cannot find the local OpenCode CLI")
    path = Path(found).resolve()
    if not path.is_absolute() or not path.is_file() or not os.access(path, os.X_OK):
        fail("cannot find the local OpenCode CLI")
    return str(path)


def local_session(executable, session_id, cwd):
    try:
        result = subprocess.run([executable, "api", "get", "/api/session/" + session_id],
                                cwd=cwd, capture_output=True, timeout=30, check=False)
    except (OSError, subprocess.TimeoutExpired):
        fail("local OpenCode session lookup failed")
    if result.returncode != 0:
        fail("local OpenCode session lookup failed")
    try:
        payload = json.loads(result.stdout)
        data = payload["data"]
        location = data["location"]
        directory = location["directory"]
    except (TypeError, KeyError, UnicodeError, json.JSONDecodeError):
        fail("local OpenCode returned malformed session metadata")
    if (not isinstance(data, dict) or data.get("id") != session_id
            or not isinstance(directory, str) or not Path(directory).is_absolute() or "\0" in directory):
        fail("local OpenCode session identity or directory is invalid")
    if not Path(directory).is_dir():
        fail("local OpenCode session directory is unavailable")
    title = data.get("title")
    if title is not None and not isinstance(title, str):
        fail("local OpenCode returned malformed session metadata")
    return {"id": session_id, "title": title, "directory": directory}


def archived(metadata):
    return remote.archived(metadata)


def connect(target_id):
    caller_id = os.environ.get("OPENCODE_SESSION_ID")
    if not isinstance(caller_id, str) or not SESSION_ID.fullmatch(caller_id):
        fail("OPENCODE_SESSION_ID is missing or invalid; no route was installed")
    if not isinstance(target_id, str) or not SESSION_ID.fullmatch(target_id):
        fail("connect requires one exact session ID")

    local_opencode = discover_local_opencode()
    caller = local_session(local_opencode, caller_id, os.getcwd())
    route = route_id(caller_id, target_id)
    target_response = ssh_request({"op": "session", "target_id": target_id})
    target = target_response.get("target")
    if (set(target_response) != {"target"} or not isinstance(target, dict)
            or set(target) != {"id", "title", "directory", "parentID", "archived"}
            or target.get("id") != target_id):
        fail("remote returned malformed target metadata")
    try:
        if remote.session_metadata(target) != target:
            fail("remote returned malformed target metadata")
    except remote.RemoteError:
        fail("remote returned malformed target metadata")
    if archived(target):
        fail("target session is archived; ask before unarchiving")

    try:
        relay_source = RELAY_PATH.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        fail("cannot read the route relay template")
    try:
        receipt = ssh_request({"op": "install", "caller_id": caller_id,
                               "target_id": target_id, "route_id": route,
                               "expected_target": target, "relay_source": relay_source})
    except PeerError as error:
        fail(f"remote install returned no verified receipt; it may be partial, no live connection: {error}")
    remote_route = receipt.get("remote_route") if isinstance(receipt, dict) else None
    if (not isinstance(receipt, dict) or set(receipt) != {
            "caller_id", "target_id", "route_id", "remote_route", "remote_script", "target"}
            or receipt.get("caller_id") != caller_id or receipt.get("target_id") != target_id
            or receipt.get("route_id") != route or receipt.get("target") != target
            or not isinstance(remote_route, str) or not Path(remote_route).is_absolute()
            or any(char in remote_route for char in "\r\n\0")
            or not isinstance(receipt.get("remote_script"), str)
            or receipt["remote_script"] != str(Path(remote_route) / "relay.py")
            or tuple(Path(remote_route).parts[-6:]) != (
                ".local", "share", "opencode", "agent-relay", "routes", route)):
        fail("remote install receipt did not match the requested route; route may be partial")

    local_route = Path.home() / ".local/share/opencode/agent-relay/routes" / route
    config = {"role": "local", "session_id": caller_id, "opencode": local_opencode,
              "directory": caller["directory"], "label": "Mac " + caller_id,
              "peer_label": "thearch " + target_id, "ssh_host": HOST,
              "remote_script": receipt["remote_script"]}
    try:
        remote.safe_install(local_route, {
            "config.json": (remote.canonical_config(config), 0o600),
            "relay.py": (relay_source.encode("utf-8"), 0o700)})
    except (remote.RemoteError, OSError) as error:
        fail(f"remote route is installed at {remote_route}, but local route was not installed; no live connection: {error}")

    local_script = str(local_route / "relay.py")
    remote_script = receipt["remote_script"]
    return {"caller": caller, "target": target, "route_id": route,
            "local_route": str(local_route), "remote_route": remote_route,
            "run_command": "python3 " + shlex.quote(local_script) + " run",
            "send_command": "python3 " + shlex.quote(local_script) + " send",
            "reply_command": "python3 " + shlex.quote(remote_script) + " send"}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Explicit Remote session route setup")
    commands = parser.add_subparsers(dest="command", required=True)
    sessions_parser = commands.add_parser("sessions")
    sessions_parser.add_argument("--search")
    connect_parser = commands.add_parser("connect")
    connect_parser.add_argument("--session", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "sessions":
            result = {"sessions": sessions(args.search)}
        else:
            result = connect(args.session)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except PeerError as error:
        print("peer: " + str(error), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("peer: interrupted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
