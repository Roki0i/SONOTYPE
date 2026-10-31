"""Chromium E2E: demo, MIDI, playback, MP4 download and audible AAC track."""
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = "http://127.0.0.1:8765"

def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True)

def check_mp4(path):
    streams = json.loads(run("ffprobe", "-v", "error", "-show_streams",
                             "-of", "json", str(path)).stdout)["streams"]
    video = next((s for s in streams if s["codec_type"] == "video"), None)
    audio = next((s for s in streams if s["codec_type"] == "audio"), None)
    assert video and video["codec_name"] == "h264", streams
    assert (video["width"], video["height"]) == (1080, 1920), video
    assert audio and audio["codec_name"] == "aac", streams
    duration = float(video.get("duration") or 0)
    assert 7.0 < duration < 11, f"Unexpected duration: {duration}"
    levels = run("ffmpeg", "-hide_banner", "-i", str(path), "-vn",
                 "-af", "volumedetect", "-f", "null", "-").stderr
    m = re.search(r"mean_volume:\s*(-?[\d.]+)\s*dB", levels)
    assert m and float(m.group(1)) > -65, f"Silent or missing audio: {levels[-800:]}"
    print(f"MP4 OK: {path.stat().st_size} bytes, {duration:.2f}s, audio={m.group(1)}dB")

def main():
    if not (ROOT / "assets" / "demo.wav").exists():
        run(sys.executable, str(ROOT / "generate_demo.py"))
    server = subprocess.Popen([sys.executable, "-u", "server.py"], cwd=ROOT,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                              env={**os.environ, "OTO_PORT": "8765"})
    try:
        for _ in range(100):
            if server.poll() is not None:
                raise RuntimeError("Local server crashed")
            try:
                with urllib.request.urlopen(URL, timeout=1) as res:
                    if res.status == 200:
                        break
            except Exception:
                time.sleep(.1)
        else:
            raise RuntimeError("Local server unavailable")
        with sync_playwright() as p:
            channel = os.environ.get("OTO_BROWSER_CHANNEL", "").strip()
            if channel not in ("", "chrome", "msedge"):
                raise ValueError("Invalid browser channel")
            options = {"headless": True, "args": ["--autoplay-policy=no-user-gesture-required"]}
            if channel:
                options["channel"] = channel
            browser = p.chromium.launch(**options)
            print("TEST BROWSER:", channel or "playwright-chromium", browser.version, flush=True)
            context = browser.new_context(accept_downloads=True, viewport={"width":1440,"height":900})
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            try:
                page.goto(URL, wait_until="networkidle")
                page.locator("#status").get_by_text("デモ音源の準備ができました").wait_for(timeout=20000)
                assert "NOTES" in page.locator("#midiName").inner_text()
                scene = page.locator("#scene")
                assert scene.evaluate("(e) => e.width===1080 && e.height===1920")
                pixel = lambda: scene.evaluate("(e) => [...e.getContext('2d').getImageData(4,4,1,1).data]")
                before = pixel()
                page.locator("[data-theme='mint']").click()
                page.wait_for_timeout(150)
                assert pixel() != before, "Theme did not redraw canvas"
                page.locator("#playButton").click()
                # Poll from Python; CSP blocks eval-based wait_for_function.
                deadline = time.monotonic() + 15
                while time.monotonic() < deadline:
                    if float(page.locator("#seek").input_value()) > .25:
                        break
                    page.wait_for_timeout(80)
                else:
                    raise AssertionError("Audio playhead did not advance")
                page.locator("#playButton").click()
                assert page.locator("#playButton").inner_text() == "▶"
                page.locator("#audioFile").set_input_files(str(ROOT/"assets"/"demo.wav"))
                page.locator("#midiName").get_by_text("MIDI未選択").wait_for()
                page.locator("#midiFile").set_input_files(str(ROOT/"assets"/"demo.mid"))
                page.locator("#midiName").get_by_text("NOTES",exact=False).wait_for()
                page.locator("[data-duration='8']").click()
                assert page.locator("#length").inner_text()=="00:08"
                with tempfile.TemporaryDirectory(prefix="oto-e2e-") as tmp:
                    with page.expect_download(timeout=120000) as download_info:
                        page.locator("#exportButton").click()
                    download = download_info.value
                    assert download.suggested_filename.endswith(".mp4")
                    target=Path(tmp)/"result.mp4"
                    download.save_as(str(target))
                    page.locator("#status").get_by_text("MP4を書き出しました",exact=False).wait_for()
                    check_mp4(target)
                assert not errors, f"JavaScript exceptions: {errors}"
                print("BROWSER E2E PASS:", channel or "chromium", "audio/MIDI, playback, theme and MP4+audio")
            except Exception:
                try:
                    (ROOT/"test-results").mkdir(exist_ok=True)
                    page.screenshot(path=str(ROOT/"test-results"/"browser-failure.png"))
                    print("STATUS:",page.locator("#status").inner_text())
                    print("JS ERRORS:",errors)
                except Exception as exc:
                    print("Screenshot error:",exc)
                raise
            finally:
                context.close()
                browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

if __name__ == "__main__":
    main()
