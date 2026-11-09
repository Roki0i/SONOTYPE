"""Browser E2E for the React template editor including uploaded cover -> MP4.

Requires Python Playwright, Node 24 and FFmpeg. Runs in Linux Chromium and
Windows Chrome/Edge CI, and verifies long-MIDI IndexedDB persistence.
"""
import json
import math
import io
import re
import wave
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


def seek_wav():
    """16s deterministic WAV: first 8s silent, second 8s 440Hz tone."""
    rate=22050
    pcm=bytearray(rate*16*2)
    for sample in range(rate*8,rate*16):
        value=int(math.sin(2*math.pi*440*(sample-rate*8)/rate)*12000)
        struct.pack_into("<h",pcm,sample*2,value)
    out=io.BytesIO()
    with wave.open(out,"wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(rate)
        file.writeframes(pcm)
    return out.getvalue()


def long_note_midi():
    """Valid format-0 MIDI: a single 180-second note at default tempo."""
    def vlq(value):
        octets = [value & 0x7F]
        value >>= 7
        while value:
            octets.insert(0, (value & 0x7F) | 0x80)
            value >>= 7
        return bytes(octets)

    track = b"\x00\x90\x3c\x64" + vlq(180 * 960) + b"\x80\x3c\x00\x00\xff\x2f\x00"
    return b"MThd" + struct.pack(">IHHH", 6, 0, 1, 480) + b"MTrk" + struct.pack(">I", len(track)) + track


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
    # The source first eight seconds are silence; a non-silent output proves
    # Audio.trimBefore is applied in the rendered MP4 (not just its waveform).
    measured=subprocess.run(
        ["ffmpeg","-hide_banner","-i",str(video_path),"-vn","-af","volumedetect","-f","null","-"],
        check=True,capture_output=True,text=True,timeout=45,
    )
    volume=re.search(r"mean_volume:\s*(-?[0-9.]+) dB",measured.stderr)
    assert volume and float(volume.group(1))>-45, "Clip start ignored: exported AAC is silent"
    return video_path.stat().st_size


def main():
    RESULTS.mkdir(exist_ok=True)
    with (RESULTS / "studio-dev.log").open("w", encoding="utf-8") as log:
        proc = subprocess.Popen(
            ["npm.cmd" if os.name == "nt" else "npm", "run", "dev"],
            cwd=STUDIO, stdout=log, stderr=subprocess.STDOUT,
            start_new_session=(os.name != "nt"),
        )
        try:
            wait_for_server(proc)
            with sync_playwright() as playwright:
                channel = os.environ.get("OTO_BROWSER_CHANNEL", "").strip()
                if channel not in ("", "chrome", "msedge"):
                    raise ValueError("Invalid OTO_BROWSER_CHANNEL")
                launch_options = {"headless": True}
                if channel:
                    launch_options["channel"] = channel
                browser = playwright.chromium.launch(**launch_options)
                print("REACT STUDIO BROWSER:", channel or "playwright-chromium", browser.version, flush=True)
                page = browser.new_page(accept_downloads=True, viewport={"width": 1440, "height": 900})
                errors = []
                page.on("pageerror", lambda e: errors.append(str(e)))
                try:
                    page.goto(URL, wait_until="networkidle", timeout=90000)
                    assert page.locator(".oto-hero").is_visible()
                    assert page.locator("button.oto-home-template").count() == 5
                    page.locator("button.oto-main-cta").first.click()
                    cards = page.locator("button.template-card")
                    assert cards.count() == 5, "Expected five template options"

                    for i in (0, 1, 2, 3, 4):
                        cards.nth(i).click()
                        assert cards.nth(i).get_attribute("aria-pressed") == "true"
                    # Editor settings are grouped into two retained-state tabs.
                    tabs = page.locator("button.settings-tab")
                    assert tabs.count() == 2
                    tabs.nth(1).click()
                    assert tabs.nth(1).get_attribute("aria-pressed") == "true"
                    assert page.locator("#settings-style").is_visible()
                    assert not page.locator("#settings-content").is_visible()
                    platforms = page.locator("button.platform-option")
                    assert platforms.count() == 3, "Expected three publishing presets"
                    for i in (0, 1, 2):
                        platforms.nth(i).click()
                        assert platforms.nth(i).get_attribute("aria-pressed") == "true"
                    page.locator("button.guide-toggle").click()
                    assert page.locator(".safe-zone-guide").count() == 1
                    page.locator("button.guide-toggle").click()
                    assert page.locator(".safe-zone-guide").count() == 0
                    page.locator("button.theme-option.theme-violet").click()
                    assert page.locator("button.theme-option.theme-violet").get_attribute("aria-pressed") == "true"
                    page.locator("button.length-options").count()  # Keep original test independent of CSS layout
                    page.locator("div.length-options button").first.click()
                    assert page.locator("div.length-options button").first.get_attribute("aria-pressed") == "true"
                    tabs.first.click()
                    assert page.locator("#settings-content").is_visible()
                    assert not page.locator("#settings-style").is_visible()
                    page.locator("#song-title").fill("CI TEST TRACK")
                    page.locator("#artist-name").fill("CI TEST ARTIST")
                    page.locator('input[aria-label="MIDIファイルを選択"]').set_input_files(
                        {"name": "long-note.mid", "mimeType": "audio/midi", "buffer": long_note_midi()}
                    )
                    page.get_by_role("status").filter(
                        has_text="1個のMIDIノートを読み込みました"
                    ).wait_for(timeout=12000)
                    page.get_by_role("button", name="保存", exact=True).click()
                    page.get_by_role("status").filter(has_text="保存しました").wait_for(timeout=12000)
                    stored_notes = page.evaluate("""async () => {
                        const db = await new Promise((resolve, reject) => {
                            const req = indexedDB.open('oto-signal-studio', 1);
                            req.onsuccess = () => resolve(req.result);
                            req.onerror = () => reject(req.error);
                        });
                        try {
                            return await new Promise((resolve, reject) => {
                                const req = db.transaction('projects', 'readonly')
                                    .objectStore('projects').get('latest');
                                req.onsuccess = () => resolve(req.result?.notes);
                                req.onerror = () => reject(req.error);
                            });
                        } finally {
                            db.close();
                        }
                    }""")
                    assert stored_notes == [{"pitch": 60, "time": 0, "duration": 180}], stored_notes
                    page.reload(wait_until="networkidle", timeout=90000)
                    page.get_by_role("button", name="復元", exact=True).click()
                    page.get_by_role("status").filter(has_text="復元しました").wait_for(timeout=60000)
                    assert page.locator("#song-title").input_value()=="CI TEST TRACK"
                    assert page.locator('.upload-input').filter(
                        has_text="MIDIファイル"
                    ).locator('.upload-name').inner_text()=="1ノート"
                    # Preview width is user adjustable, without changing composition dimensions.
                    sizes = page.locator("button.preview-zoom-button")
                    assert sizes.count() == 3
                    sizes.last.click()
                    assert sizes.last.get_attribute("aria-pressed") == "true"
                    assert page.locator(".player-with-guide").bounding_box()["width"] >= 500
                    # Export is pinned in the side panel even with scrolled settings.
                    export_box = page.locator("button.export-button").bounding_box()
                    assert export_box is not None
                    assert export_box["y"] >= 0 and export_box["y"] + export_box["height"] <= 900

                    page.locator('input[aria-label="音楽ファイルを選択"]').set_input_files(
                        {"name":"seek.wav","mimeType":"audio/wav","buffer":seek_wav()})
                    page.get_by_role("status").filter(has_text="音声を解析しました").wait_for(timeout=60000)
                    slider=page.locator("#clip-start")
                    assert slider.get_attribute("max")=="240"
                    waveform=page.locator(".clip-waveform")
                    assert waveform.get_attribute("data-waveform-source")=="uploaded"
                    bounds=waveform.bounding_box()
                    assert bounds is not None
                    waveform.click(position={"x":bounds["width"]*.5,"y":bounds["height"]*.5})
                    assert slider.input_value()=="240"
                    slider.focus()
                    slider.press("Home")
                    assert slider.input_value()=="0"
                    slider.press("End")
                    assert slider.input_value()=="240"
                    assert page.locator(".clip-positions").inner_text().find("0:08")>=0
                    page.locator('input[aria-label="ジャケット画像を選択"]').set_input_files(
                        {"name":"test-cover.png", "mimeType":"image/png", "buffer":test_png()}
                    )
                    page.screenshot(path=str(RESULTS/"studio-editor.png"), full_page=True)
                    # Responsive mobile UI should not have horizontal page overflow.
                    page.set_viewport_size({"width":390,"height":844})
                    overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                    assert overflow <= 2, f"Mobile editor overflow: {overflow}px"
                    assert page.locator("button.settings-tab").count() == 2
                    page.set_viewport_size({"width":1440,"height":900})
                    if errors:
                        raise RuntimeError("React page errors: " + " | ".join(errors))

                    with page.expect_download(timeout=240000) as download_info:
                        page.locator("button.export-button").click()
                    download = download_info.value
                    assert download.suggested_filename.startswith("sonotype-tiktok-")
                    path = RESULTS / "studio-upload-cover.mp4"
                    download.save_as(str(path))
                    bytes_count = inspect_mp4(path)
                    assert not errors, "Browser errors: " + " | ".join(errors)
                    print(
                        f"STUDIO EDITOR E2E PASS: five templates, three social presets, text/theme/duration, "
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
                    # npm.cmd launches Node child processes. Stop the complete job tree.
                    subprocess.run(
                        ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                        check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                    )
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
