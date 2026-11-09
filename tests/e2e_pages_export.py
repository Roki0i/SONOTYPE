"""Run the GitHub Pages Vite bundle under its repository subpath and export MP4 in Chromium.

The web edition must not rely on Node/FFmpeg APIs at runtime. FFprobe is used only
by the test harness to validate the downloaded media container and codecs.
"""
import json
import os
import re
import signal
import subprocess
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright
from e2e_studio_templates import test_png, seek_wav

ROOT=Path(__file__).resolve().parents[1]
STUDIO=ROOT/'apps'/'studio'
URL='http://127.0.0.1:4173/SONOTYPE/'
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
    measured=subprocess.run(['ffmpeg','-hide_banner','-i',str(path),
        '-vn','-af','volumedetect','-f','null','-'],
        text=True,capture_output=True,timeout=45,check=True)
    value=re.search(r'mean_volume:\s*(-?[0-9.]+) dB',measured.stderr)
    assert value is not None, 'Failed to decode exported AAC audio'
    assert float(value.group(1))>-50, 'Rendered audio unexpectedly silent'
    return path.stat().st_size


def main():
    RESULTS.mkdir(exist_ok=True)
    with (RESULTS/'oto-pages-preview.log').open('w',encoding='utf8') as log:
        proc=subprocess.Popen(['node','node_modules/vite/bin/vite.js','preview',
            '--host','127.0.0.1','--port','4173','--strictPort'],
            cwd=STUDIO,stdout=log,stderr=subprocess.STDOUT,
            start_new_session=(os.name!='nt'),
            env={**os.environ,'VITE_PAGES_BUILD':'true'})
        try:
            await_server(proc)
            with sync_playwright() as p:
                # Playwright chromium may be incapable of encoding AAC/H.264 on
                # some runners: any such failure is reported, never silently skipped.
                browser=p.chromium.launch(headless=True)
                page=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
                # Monitor real Web Audio transitions. A pause must not suspend the
                # AudioContext, which can cut a nonzero sample and click audibly.
                page.add_init_script("""
                    window.__sonotypeAudioTransitions = {suspends:0, resumes:0};
                    const originalSuspend = AudioContext.prototype.suspend;
                    const originalResume = AudioContext.prototype.resume;
                    AudioContext.prototype.suspend = function(...args) {
                      window.__sonotypeAudioTransitions.suspends++;
                      return originalSuspend.apply(this,args);
                    };
                    AudioContext.prototype.resume = function(...args) {
                      window.__sonotypeAudioTransitions.resumes++;
                      return originalResume.apply(this,args);
                    };
                """)
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                try:
                    started_at=time.monotonic()
                    page.goto(URL,wait_until='networkidle',timeout=90000)
                    first_load_ms=round((time.monotonic()-started_at)*1000)
                    assert page.locator('.oto-hero').is_visible()
                    assert page.locator('.sono-groove-art svg').is_visible()
                    assert page.locator('.sono-record').count()==1
                    assert page.locator('.oto-guide-steps li').count()==3
                    assert page.title().startswith('SONOTYPE')
                    assert 'SONOTYPE' in page.locator('.oto-home-logo').inner_text()
                    assert page.locator('button.oto-home-template').count()==5
                    assert page.locator('button.oto-home-template .template-preview').count()==5
                    # Diagnostic only: CI desktop hardware cannot establish a mobile speed budget.
                    thumb_nodes=page.evaluate("Array.from(document.querySelectorAll('.template-preview')).reduce((total,el)=>total+el.querySelectorAll('*').length,0)")
                    print(f'PAGES LANDING: {first_load_ms} ms to network-idle, {thumb_nodes} thumbnail DOM descendants',flush=True)
                    # Check common small viewports without pretending to emulate mobile Safari.
                    for width,height in ((360,780),(390,844),(430,932)):
                        page.set_viewport_size({'width':width,'height':height})
                        assert page.locator('button.oto-main-cta').first.is_visible()
                        assert page.locator('button.oto-home-template').count()==5
                        overflow=page.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
                        assert overflow<=2, f'Landing viewport {width}px overflow: {overflow}px'
                    page.set_viewport_size({'width':1440,'height':900})
                    page.locator('button.oto-main-cta').first.click()
                    page.locator('button.template-card').first.wait_for(state='visible',timeout=30000)
                    assert page.locator('button.template-card').count()==5
                    assert page.locator('button.template-card .template-preview').count()==5
                    assert 'SONOTYPE' in page.locator('.brand').inner_text()
                    assert page.locator('button.platform-option').count()==3
                    assert page.locator('text=ブラウザ制作').count()>0
                    assert page.evaluate("fetch('./demo.wav').then(r=>r.ok)")
                    # Verify the actual video preview carries the renamed brand for every style.
                    labels=[
                        'SONOTYPE / SIGNAL STUDIO',
                        'SONOTYPE / VISUAL STUDIO',
                        'NOW PLAYING / SONOTYPE',
                        'SONOTYPE / ARTWORK',
                        'SONOTYPE / SHORTS'
                    ]
                    for index,label in enumerate(labels):
                        page.locator('button.template-card').nth(index).click()
                        page.locator('.player-with-guide').get_by_text(label,exact=True).wait_for(state='visible',timeout=10000)
                    # Toggle real player controls (not synthetic audio stubs).
                    # The audio context should remain active during pause.
                    page.locator('.player-with-guide').hover()
                    play_control=page.locator('.player-with-guide button[aria-label="Play video"]')
                    play_control.click(timeout=15000)
                    pause_control=page.locator('.player-with-guide button[aria-label="Pause video"]')
                    pause_control.wait_for(state='visible',timeout=15000)
                    page.wait_for_timeout(300)
                    transitions_before=page.evaluate('window.__sonotypeAudioTransitions')
                    assert transitions_before['resumes']>0, 'Test did not start Web Audio'
                    pause_control.click(timeout=15000)
                    play_control.wait_for(state='visible',timeout=15000)
                    page.wait_for_timeout(200)
                    transitions_after=page.evaluate('window.__sonotypeAudioTransitions')
                    assert transitions_after['suspends']==transitions_before['suspends'], (
                        f"AudioContext suspended on pause: {transitions_before} -> {transitions_after}")
                    # Playback remains usable after a pause.
                    play_control.click(timeout=15000)
                    pause_control.wait_for(state='visible',timeout=15000)
                    pause_control.click(timeout=15000)
                    play_control.wait_for(state='visible',timeout=15000)
                    print('PLAYER PAUSE PASS: preview context stays running through pause/resume',flush=True)
                    assert page.locator("button.settings-tab").count()==2
                    assert page.locator("#settings-content").is_visible()
                    page.locator("button.preview-zoom-button").last.click()
                    assert page.locator(".player-with-guide").bounding_box()["width"]>=500
                    page.locator("button.settings-tab").nth(1).click()
                    assert page.locator("#settings-style").is_visible()
                    page.locator('div.length-options button').first.click()
                    page.locator("button.settings-tab").first.click()
                    assert page.locator('.clip-waveform').get_attribute('data-waveform-source')=='demo'
                    # Verify that user-provided blob audio and artwork are supported
                    # by web renderer, not only the bundled static demo.
                    page.locator('input[aria-label="音楽ファイルを選択"]').set_input_files(
                        {'name':'reference.wav','mimeType':'audio/wav',
                         'buffer':seek_wav()})
                    page.get_by_role('status').filter(has_text='音声を解析しました').wait_for(timeout=60000)
                    clip=page.locator('#clip-start')
                    assert clip.get_attribute('max')=='240'
                    waveform=page.locator('.clip-waveform')
                    assert waveform.get_attribute('data-waveform-source')=='uploaded'
                    assert waveform.locator('svg path').count()==2
                    assert len(waveform.locator('svg path').first.get_attribute('d'))>100
                    # Drag across the uploaded source: the selected 8s interval begins at 8s.
                    bounds=waveform.bounding_box()
                    assert bounds is not None
                    y=bounds['y']+bounds['height']/2
                    page.mouse.move(bounds['x']+bounds['width']*.2,y)
                    page.mouse.down()
                    page.mouse.move(bounds['x']+bounds['width']*.5,y,steps=5)
                    page.mouse.up()
                    assert clip.input_value()=='240'
                    clip.focus()
                    clip.press('Home')
                    assert clip.input_value()=='0'
                    clip.press('End')
                    assert clip.input_value()=='240'
                    assert '0:08' in page.locator('.clip-positions').inner_text()
                    page.locator('input[aria-label="ジャケット画像を選択"]').set_input_files(
                        {'name':'cover.png','mimeType':'image/png','buffer':test_png()})
                    page.locator('#song-title').fill('WEB EXPORT TEST')
                    page.get_by_role('button',name='保存',exact=True).click()
                    page.get_by_role('status').filter(has_text='保存しました').wait_for(timeout=12000)
                    # Verify media Files persist (not merely text settings).
                    page.reload(wait_until='networkidle',timeout=90000)
                    assert page.locator('button.template-card').count()==5
                    page.get_by_role('button',name='復元',exact=True).click()
                    page.get_by_role('status').filter(has_text='復元しました').wait_for(timeout=60000)
                    assert page.locator('#song-title').input_value()=='WEB EXPORT TEST'
                    assert 'reference.wav' in page.locator('.upload-name').first.inner_text()
                    assert page.locator('.clip-waveform').get_attribute('data-waveform-source')=='uploaded'
                    assert page.locator('#clip-start').input_value()=='240'
                    assert page.locator('button.template-card').last.get_attribute('aria-pressed')=='true'
                    page.locator("button.settings-tab").nth(1).click()
                    page.locator("button.settings-tab").first.click()
                    assert page.locator('#song-title').input_value() == 'WEB EXPORT TEST'
                    export_box=page.locator('button.export-button').bounding_box()
                    assert export_box is not None
                    assert export_box['y']>=0 and export_box['y']+export_box['height']<=900
                    for width,height in ((360,780),(390,844),(430,932)):
                        page.set_viewport_size({'width':width,'height':height})
                        overflow=page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                        assert overflow<=2, f'Editor viewport {width}px overflow: {overflow}px'
                        # Verify that actual controls remain usable at narrow widths.
                        page.locator('button.template-card').last.click()
                        assert page.locator('button.template-card').last.get_attribute('aria-pressed')=='true'
                        page.locator('button.settings-tab').nth(1).click()
                        assert page.locator('#settings-style').is_visible()
                        page.locator('button.settings-tab').first.click()
                        assert page.locator('#settings-content').is_visible()
                        page.locator('button.export-button').scroll_into_view_if_needed()
                        assert page.locator('button.export-button').is_enabled()
                    page.set_viewport_size({'width':1440,'height':900})
                    assert not errors, errors
                    with page.expect_download(timeout=270000) as download_info:
                        page.locator('button.export-button').click()
                    download=download_info.value
                    assert download.suggested_filename.startswith('sonotype-shorts-')
                    target=RESULTS/'oto-pages-chromium.mp4'
                    download.save_as(str(target))
                    size=inspect(target)
                    assert not errors, errors
                    print(f'PAGES WEB MP4 PASS: trimmed 8s from source 0:08 (first 8s silent), uploaded WAV + PNG, {size} bytes H264/AAC 1080x1920 non-silent audio')
                except Exception as error:
                    print('Pages E2E root cause:',repr(error),flush=True)
                    try:
                        if not page.is_closed():
                            page.screenshot(path=str(RESULTS/'oto-pages-error.png'),full_page=True,timeout=5000)
                            messages=page.locator('p.status-message')
                            if messages.count()>0:
                                print('Pages UI status:',messages.first.inner_text(timeout=2000),flush=True)
                            print('Loaded page URL:',page.url,flush=True)
                    except Exception as diagnostics_error:
                        print('Unable to capture diagnostics:',repr(diagnostics_error),flush=True)
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
