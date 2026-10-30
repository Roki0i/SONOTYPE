#!/usr/bin/env python3
"""Loopback-only static server and tightly scoped WebM-to-MP4 converter."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent
MAX_BYTES = 160 * 1024 * 1024
WEBM_MAGIC = b"\x1a\x45\xdf\xa3"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def setup(self):
        super().setup()
        self.connection.settimeout(30)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "connect-src 'self'; img-src 'self' data:; media-src 'self' blob:; "
            "object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
        )
        super().end_headers()

    def local_origin(self):
        return f"http://127.0.0.1:{self.server.server_address[1]}"

    def parse_request(self):
        if not super().parse_request():
            return False
        expected_host = self.local_origin().removeprefix("http://")
        if self.headers.get("Host", "") != expected_host:
            self.send_error(403, "Only the loopback host is allowed")
            return False
        return True

    def error_json(self, code, message):
        data = json.dumps({"error": message}, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path != "/api/convert":
            return self.error_json(404, "Not found")
        # Same-origin protection blocks cross-site form/fetch requests to localhost.
        if self.headers.get("Origin") != self.local_origin():
            return self.error_json(403, "Origin not allowed")
        if self.headers.get("Transfer-Encoding") or self.headers.get("Content-Encoding"):
            return self.error_json(400, "Unsupported transfer encoding")
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "video/webm":
            return self.error_json(415, "WebM upload required")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.error_json(400, "Invalid Content-Length")
        if not 0 < length <= MAX_BYTES:
            return self.error_json(413, "動画は160MB以内にしてください")
        if not shutil.which("ffmpeg"):
            return self.error_json(503, "FFmpegが見つかりません")

        with tempfile.TemporaryDirectory(prefix="oto-") as tmp:
            source = Path(tmp) / "input.webm"
            target = Path(tmp) / "output.mp4"
            remaining = length
            with source.open("wb") as handle:
                while remaining:
                    chunk = self.rfile.read(min(remaining, 1024 * 1024))
                    if not chunk:
                        break
                    handle.write(chunk)
                    remaining -= len(chunk)
            if remaining:
                return self.error_json(400, "不完全な録画データ")
            with source.open("rb") as handle:
                if handle.read(4) != WEBM_MAGIC:
                    return self.error_json(415, "Invalid WebM header")
            command = [
                "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                "-protocol_whitelist", "file,pipe", "-f", "matroska", "-i", str(source),
                "-map", "0:v:0", "-map", "0:a:0?",
                "-c:v", "libx264", "-preset", "fast", "-crf", "21",
                "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                "-movflags", "+faststart", str(target)
            ]
            try:
                run = subprocess.run(command, capture_output=True, timeout=180, check=False)
            except subprocess.TimeoutExpired:
                return self.error_json(504, "動画変換がタイムアウトしました")
            if run.returncode or not target.is_file():
                self.log_error("FFmpeg conversion failed (exit %s)", run.returncode)
                return self.error_json(500, "動画変換に失敗しました")
            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", str(target.stat().st_size))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            try:
                with target.open("rb") as handle:
                    shutil.copyfileobj(handle, self.wfile)
            except (BrokenPipeError, ConnectionResetError):
                pass


if __name__ == "__main__":
    if not (ROOT / "assets" / "demo.wav").exists():
        subprocess.run([sys.executable, str(ROOT / "generate_demo.py")], check=True)
    port = int(os.environ.get("OTO_PORT", "8765"))
    print(f"OTO Studio: http://127.0.0.1:{port}", flush=True)
    if shutil.which("ffmpeg"):
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, timeout=5)
        if result.stdout:
            print("Using " + result.stdout.splitlines()[0], flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
