"""Run the GitHub Pages Vite bundle under its repository subpath and export MP4 in Chromium.

The web edition must not rely on Node/FFmpeg APIs at runtime. FFprobe is used only
by the test harness to validate the downloaded media container and codecs.
"""
import json
import os
import signal
import subprocess
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
STUDIO=ROOT/'apps'/'studio'
URL='http://127.0.0.1:4173/oto-signal-studio/'
RESULTS=ROOT/'test-results'


def await_server(proc, timeout=60):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        if proc.poll() is not None:
            raise RuntimeError('Vite preview exited before becoming ready')
        try:
            with urllib.request.urlopen(URL, timeout=1.5) as res:
                if res.status==200:
                    return
        except OSError:
            time.sleep(.5)
    raise TimeoutError('GitHub Pages preview did not start')


def inspect(path):
    info=json.loads(subprocess.check_output([
        'ffprobe','-v','error','-show_streams','-of','json',str(path)],
        text=True,timeout=30))
    video=next(s for s in info['streams'] if s['codec_type']=='video')
    sound=next(s for s in info['streams'] if s['codec_type']=='audio')
    assert video['codec_name']=='h264'
    assert (video['width'],video['height'])==(1080,1920)
    assert sound['codec_name']=='aac'
    assert path.stat().st_size>1000
    return path.stat().st_size


def main():
    RESULTS.mkdir(exist_ok=True)
    with (RESULTS/'oto-pages-preview.log').open('w',encoding='utf8') as log:
        proc=subprocess.Popen(['node','node_modules/vite/bin/vite.js','preview',
            '--host','127.0.0.1','--port','4173','--strictPort'],
            cwd=STUDIO,stdout=log,stderr=subprocess.STDOUT,
            start_new_session=(os.name!='nt'))
        try:
            await_server(proc)
            with sync_playwright() as p:
                # Playwright chromium may be incapable of encoding AAC/H.264 on
                # some runners: any such failure is reported, never silently skipped.
                browser=p.chromium.launch(headless=True)
                page=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                try:
                    page.goto(URL,wait_until='networkidle',timeout=90000)
                    assert page.locator('button.template-card').count()==5
                    assert page.locator('button.platform-option').count()==3
                    assert page.locator('text=ブラウザ制作').count()>0
                    assert page.evaluate("fetch('./demo.wav').then(r=>r.ok)")
                    page.locator('button.template-card').last.click()
                    page.locator('div.length-options button').first.click()
                    page.locator('#song-title').fill('WEB EXPORT TEST')
                    assert not errors, errors
                    with page.expect_download(timeout=270000) as download_info:
                        page.locator('button.export-button').click()
                    download=download_info.value
                    assert download.suggested_filename.startswith('oto-shorts-')
                    target=RESULTS/'oto-pages-chromium.mp4'
                    download.save_as(str(target))
                    size=inspect(target)
                    assert not errors, errors
                    print(f'PAGES WEB MP4 PASS: {size} bytes H264/AAC 1080x1920')
                except Exception:
                    page.screenshot(path=str(RESULTS/'oto-pages-error.png'),full_page=True)
                    print('Pages status:',page.locator('p.status-message').inner_text(),flush=True)
                    raise
                finally:
                    browser.close()
        finally:
            if proc.poll() is None:
                if os.name!='nt':
                    os.killpg(proc.pid,signal.SIGTERM)
                else:
                    proc.terminate()
                try:
                    proc.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    proc.kill()


if __name__=='__main__':
    main()
