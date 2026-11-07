#!/usr/bin/env python3
"""Minimal NanoKVM Pro screenshot and raw keyboard client."""
import argparse
import base64
import getpass
import json
import os
import socket
import ssl
import sys
import time
import urllib.parse
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url', default=os.environ.get('KVM_URL'), help='KVM base URL or KVM_URL')
    p.add_argument('--user', default=os.environ.get('KVM_USER'), help='Username or KVM_USER')
    p.add_argument('--insecure', action='store_true', help='Disable TLS verification (only with explicit user approval)')
    sub = p.add_subparsers(dest='command', required=True)
    cap = sub.add_parser('capture', help='Save one JPEG frame')
    cap.add_argument('--output', required=True)
    key = sub.add_parser('key', help='Send one USB HID key press and release')
    key.add_argument('code', type=int)
    key.add_argument('--modifier', type=int, default=0)
    seq = sub.add_parser('sequence', help='Send JSON array of [USB HID code, modifier] pairs')
    seq.add_argument('pairs')
    text = sub.add_parser('text', help='Type ASCII text using the lab Windows ENG CMS layout')
    text.add_argument('value', help='Text to type; does not submit it')
    text.add_argument('--layout', required=True, choices=['lab-windows-cms'], help='Explicitly select the verified target layout')
    mouse = sub.add_parser('mouse', help='Send absolute mouse movement, click or wheel input')
    mouse.add_argument('x', type=int, help='X coordinate in screenshot pixels')
    mouse.add_argument('y', type=int, help='Y coordinate in screenshot pixels')
    mouse.add_argument('--width', required=True, type=int, help='Screenshot width in pixels')
    mouse.add_argument('--height', required=True, type=int, help='Screenshot height in pixels')
    mouse.add_argument('--button', choices=['left', 'right', 'middle'], help='Click after moving')
    mouse.add_argument('--wheel', type=int, default=0, help='Signed wheel delta (-127 to 127)')
    relative = sub.add_parser('mouse-relative', help='Send relative movement; target must support relative mouse mode')
    relative.add_argument('dx', type=int, help='Horizontal delta (-127 to 127)')
    relative.add_argument('dy', type=int, help='Vertical delta (-127 to 127)')
    relative.add_argument('--button', choices=['left', 'right', 'middle'], help='Click after moving')
    relative.add_argument('--wheel', type=int, default=0, help='Signed wheel delta (-127 to 127)')
    for action in (key, seq, text):
        action.add_argument('--hold', type=float, default=0.01)
        action.add_argument('--interval', type=float, default=0)
    args = p.parse_args()
    if not args.url or not args.user:
        p.error('--url/KVM_URL and --user/KVM_USER are required')
    if args.command == 'mouse' and (args.width < 2 or args.height < 2 or not 0 <= args.x < args.width or not 0 <= args.y < args.height):
        p.error('Mouse coordinates must be inside a screenshot at least 2 by 2 pixels')
    if args.command in ('mouse', 'mouse-relative') and not -127 <= args.wheel <= 127:
        p.error('Wheel delta must be between -127 and 127')
    if args.command == 'mouse-relative' and not (-127 <= args.dx <= 127 and -127 <= args.dy <= 127):
        p.error('Relative deltas must be between -127 and 127')
    url = urllib.parse.urlsplit(args.url)
    if url.scheme not in ('http', 'https') or not url.hostname or url.path not in ('', '/') or url.query or url.fragment:
        p.error('URL must be an HTTP(S) origin without path, query, or fragment')
    password = os.environ.get('KVM_PASSWORD') or getpass.getpass('KVM password: ')
    ctx = ssl._create_unverified_context() if args.insecure else ssl.create_default_context()
    opener = urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=ctx))
    origin = f'{url.scheme}://{url.netloc}'
    request = urllib.request.Request(origin + '/api/auth/login', data=json.dumps({'username': args.user, 'password': password}).encode(), headers={'Content-Type': 'application/json'})
    with opener.open(request, timeout=15) as response:
        result = json.load(response)
    if result.get('code') != 0 or not (result.get('data') or {}).get('token'):
        raise RuntimeError('KVM authentication failed')
    token = result['data']['token']
    if args.command == 'capture':
        req = urllib.request.Request(origin + '/api/stream/mjpeg', headers={'Cookie': 'nano-kvm-token=' + token})
        with opener.open(req, timeout=15) as response:
            data = bytearray()
            while len(data) < 20_000_000:
                chunk = response.read(4096)
                if not chunk:
                    break
                data.extend(chunk)
                start = data.find(b'\xff\xd8')
                end = data.find(b'\xff\xd9', max(start, 0))
                if start >= 0 and end >= 0:
                    with open(args.output, 'wb') as out:
                        out.write(data[start:end + 2])
                    print('Saved screenshot:', args.output)
                    return
        raise RuntimeError('No complete JPEG frame received')
    if args.command in ('mouse', 'mouse-relative'):
        pairs = None
    elif args.command == 'key':
        pairs = [[args.code, args.modifier]]
    elif args.command == 'sequence':
        pairs = json.loads(args.pairs)
    else:
        mapping = {chr(97 + i): [(4 + i, 0)] for i in range(26)}
        mapping.update({chr(65 + i): [(4 + i, 2)] for i in range(26)})
        mapping.update({ch: [(30 + i, 0)] for i, ch in enumerate('1234567890')})
        mapping.update({ch: [(30 + i, 2)] for i, ch in enumerate('!@#$%?&*()')})
        mapping.update({ch: [pair] for ch, pair in {
            ' ': (44, 0), '-': (45, 0), '_': (45, 2), '=': (46, 0), '+': (46, 2),
            '/': (53, 0), '\\': (53, 2), '|': (53, 64),
            '[': (38, 64), ']': (39, 64), '{': (36, 64), '}': (37, 64),
            ';': (51, 0), ':': (51, 2), ',': (54, 0), "'": (54, 2), '<': (54, 64),
            '.': (55, 0), '"': (55, 2), '>': (55, 64),
        }.items()})
        # Dead keys need a space to emit the mark on its own.
        mapping.update({'^': [(47, 0), (44, 0)], '`': [(47, 64), (44, 0)], '~': [(48, 64), (44, 0)]})
        missing = sorted(set(args.value) - mapping.keys())
        if missing:
            raise ValueError('Unsupported characters; nothing sent: ' + repr(''.join(missing)))
        pairs = [list(pair) for ch in args.value for pair in mapping[ch]]
    if pairs is not None and (not isinstance(pairs, list) or not pairs or any(not isinstance(x, list) or len(x) != 2 or any(type(v) is not int or not 0 <= v <= 255 for v in x) for x in pairs)):
        raise ValueError('Expected a nonempty JSON array of [code, modifier] byte pairs')
    if pairs is not None and not (0.01 <= args.hold <= 10 and 0 <= args.interval <= 10):
        raise ValueError('hold must be 0.01–10 seconds and interval 0–10 seconds')
    raw = socket.create_connection((url.hostname, url.port or (443 if url.scheme == 'https' else 80)), timeout=15)
    with (ctx.wrap_socket(raw, server_hostname=url.hostname) if url.scheme == 'https' else raw) as sock:
        nonce = base64.b64encode(os.urandom(16)).decode()
        handshake = (f'GET /api/ws HTTP/1.1\r\nHost: {url.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {nonce}\r\nSec-WebSocket-Version: 13\r\nOrigin: {origin}\r\nCookie: nano-kvm-token={token}\r\n\r\n')
        sock.sendall(handshake.encode())
        header = b''
        while b'\r\n\r\n' not in header and len(header) < 16384:
            chunk = sock.recv(4096)
            if not chunk:
                break
            header += chunk
        if not header.startswith(b'HTTP/1.1 101 '):
            raise RuntimeError('KVM WebSocket upgrade failed')
        def send(data):
            mask = os.urandom(4)
            sock.sendall(bytes([0x82, 0x80 | len(data)]) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
        if pairs is not None:
            completed = 0
            for code, modifier in pairs:
                try:
                    send(bytes([1, modifier, 0, code, 0, 0, 0, 0, 0]))
                    time.sleep(args.hold)
                    send(bytes([1, 0, 0, 0, 0, 0, 0, 0, 0]))
                    completed += 1
                except (OSError, KeyboardInterrupt) as exc:
                    try:
                        send(bytes([1, 0, 0, 0, 0, 0, 0, 0, 0]))
                    except OSError:
                        pass
                    raise RuntimeError(f'Input interrupted after {completed} complete pairs; current pair may be partial. Release attempted; verify target, do not replay blindly.') from exc
                time.sleep(args.interval)
        else:
            button = {None: 0, 'left': 1, 'right': 2, 'middle': 4}[args.button]
            if args.command == 'mouse':
                x = min(32768, 1 + int(32767 * args.x / (args.width - 1)))
                y = min(32768, 1 + int(32767 * args.y / (args.height - 1)))
                def report(b, wheel=0):
                    return bytes([2, b, x & 255, x >> 8, y & 255, y >> 8, wheel & 255])
            else:
                def report(b, wheel=0, dx=0, dy=0):
                    return bytes([2, b, dx & 255, dy & 255, wheel & 255])
            if args.command == 'mouse':
                send(report(0, args.wheel))
            else:
                send(report(0, args.wheel, args.dx, args.dy))
            if button:
                time.sleep(0.15)
                try:
                    send(report(button))
                    time.sleep(0.1)
                finally:
                    send(report(0))
    print('Input sent; verify on screen.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError) as exc:
        print(f'KVM error: {exc}', file=sys.stderr)
        sys.exit(1)
