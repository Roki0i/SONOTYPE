"""Browser E2E for the React template editor including uploaded cover -> MP4.

Requires Python Playwright/Chromium, Node 24 and FFmpeg. Runs on Linux CI.
"""
import json
import os
import signal
import struct
import subprocess
import time
import urllib.request
import zlib
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
STUDIO = ROOT / "apps" / "studio"
RESULTS = ROOT / "test-results"
URL = "http://127.0.0.1:5173"


def png_chunk(label, data):
    return struct.pack(">I", len(data)) + label + data + struct.pack(
        ">I", zlib.crc32(label + data) & 0xFFFFFFFF
    )


def test_png():
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", zlib.compress(bytes([0, 30, 130, 200, 255])))
        + png_chunk(b"IEND", b"")
    )


def wait_for_server(proc, timeout=90):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if proc.poll() is not None:
            raise RuntimeError("Development servers exited before becoming ready")
        try:
            with urllib.request.urlopen(URL, timeout=1.5) as response:
                if response.status == 200:
                    return
        except OSError:
            time.sleep(0.5)
    raise TimeoutError("Studio Vite server failed to start")


def inspect_mp4(video_path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(video_path)],
        check=True, capture_output=True, text=True, timeout=15,
    )
    streams = json.loads(result.stdout)["streams"]
    video = next(s for s in streams if s["codec_type"] == "video")
    audio = next(s for s in streams if s["codec_type"] == "audio")
    assert video["codec_name"] == "h264"
    assert (video["width"], video["height"]) == (1080, 1920)
    assert audio["codec_name"] == "aac"
    assert video_path.stat().st_size > 1000
    return video_path.stat().st_size


def main():
    RESULTS.mkdir(exist_ok=True)
    with (RESULTS / "studio-dev.log").open("w", encoding="utf-8") as log:
        proc = subprocess.Popen(
            ["npm", "run", "dev"], cwd=STUDIO, stdout=log, stderr=subprocess.STDOUT,
            start_new_session=(os.name != "nt"),
        )
        try:
            wait_for_server(proc)
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True)
                page = browser.new_page(accept_downloads=True, viewport={"width": 1440, "height": 900})
                errors = []
                page.on("pageerror", lambda e: errors.append(str(e)))
                try:
                    page.goto(URL, wait_until="networkidle", timeout=90000)
                    cards = page.locator("button.template-card")
                    assert cards.count() == 4, "Expected four template options"

                    for i in (0, 1, 2, 3, 1):
                        cards.nth(i).click()
                        assert cards.nth(i).get_attribute("aria-pressed") == "true"
                    page.locator("#song-title").fill("CI TEST TRACK")
                    page.locator("#artist-name").fill("CI TEST ARTIST")
                    page.locator("button.theme-option.theme-violet").click()
                    assert page.locator("button.theme-option.theme-violet").get_attribute("aria-pressed") == "true"
                    page.locator("button.length-options").count()  # Keep original test independent of CSS layout
                    page.locator("div.length-options button").first.click()
                    assert page.locator("div.length-options button").first.get_attribute("aria-pressed") == "true"

                    page.locator('input[aria-label="ジャケット画像を選択"]').set_input_files(
                        {"name":"test-cover.png", "mimeType":"image/png", "buffer":test_png()}
                    )
                    page.screenshot(path=str(RESULTS/"studio-editor.png"), full_page=True)
                    if errors:
                        raise RuntimeError("React page errors: " + " | ".join(errors))

                    with page.expect_download(timeout=240000) as download_info:
                        page.locator("button.export-button").click()
                    download = download_info.value
                    path = RESULTS / "studio-upload-cover.mp4"
                    download.save_as(str(path))
                    bytes_count = inspect_mp4(path)
                    assert not errors, "Browser errors: " + " | ".join(errors)
                    print(
                        f"STUDIO EDITOR E2E PASS: four templates, text/theme/duration, "
                        f"uploaded cover, H.264/AAC MP4 ({bytes_count} bytes)", flush=True
                    )
                except Exception:
                    try:
                        page.screenshot(path=str(RESULTS/"studio-error.png"), full_page=True)
                    except Exception:
                        pass
                    raise
                finally:
                    browser.close()
        finally:
            if proc.poll() is None:
                if os.name != "nt":
                    os.killpg(proc.pid, signal.SIGTERM)
                else:
                    proc.terminate()
                try:
                    proc.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    if os.name != "nt":
                        os.killpg(proc.pid, signal.SIGKILL)
                    else:
                        proc.kill()
                    proc.wait(timeout=5)


if __name__ == "__main__":
    main()
