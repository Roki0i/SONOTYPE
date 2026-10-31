"""Check original demo A/V timing (requires FFmpeg/FFprobe; Python stdlib only).

Compares decoded AAC with the generated demo WAV and checks frame-exact note
highlight transitions in the Remotion piano roll. Only valid for the bundled
ORIGINAL DEMO; synthetic level meters do not measure real audio amplitude.
"""
import array
import json
import math
import subprocess
import sys
import wave
from pathlib import Path

NOTES = [74, 77, 81, 79, 77, 74, 72, 69, 74, 77, 81, 84, 81, 79, 77, 74,
         76, 79, 83, 81, 79, 76, 74, 71, 76, 79, 83, 86, 83, 81, 79, 76]
RATE = 22050
FPS = 30


def output(*args):
    return subprocess.check_output(args, stderr=subprocess.PIPE)


def details(path):
    obj = json.loads(output('ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(path)))
    v = next(s for s in obj['streams'] if s['codec_type'] == 'video')
    a = next(s for s in obj['streams'] if s['codec_type'] == 'audio')
    count = int(v['nb_frames'])
    assert v['codec_name'] == 'h264' and (v['width'], v['height']) == (1080, 1920)
    assert v['avg_frame_rate'] == '30/1' and a['codec_name'] == 'aac'
    assert abs(float(v.get('start_time', 0)) - float(a.get('start_time', 0))) <= .010
    assert abs(float(v['duration']) - float(a['duration'])) <= .050
    assert abs(float(v['duration']) - count / FPS) <= .005
    assert count >= 60, 'At least 2s of demo video required'
    return count


def sound_matches(mp4, wav_path, frames):
    with wave.open(str(wav_path)) as src:
        assert (src.getframerate(), src.getnchannels(), src.getsampwidth()) == (RATE, 1, 2)
        original = array.array('h', src.readframes(src.getnframes()))
    rendered = array.array('h')
    rendered.frombytes(output('ffmpeg', '-v', 'error', '-i', str(mp4), '-map', '0:a:0',
                              '-ac', '1', '-ar', str(RATE), '-f', 's16le', 'pipe:1'))
    if sys.byteorder != 'little':
        original.byteswap()
        rendered.byteswap()
    seconds = frames / FPS
    windows = [t for t in [0.25, 1.25, 2.25, 5.25, 8.25, 12.25] if t + 0.18 < seconds]
    assert len(windows) >= 2
    results = []
    for t in windows:
        start = round(t * RATE)
        length = round(.18 * RATE)
        target = original[start:start+length]
        norm1 = math.sqrt(sum(int(v)*int(v) for v in target))
        assert norm1 > 1000, 'Unexpected silent source window'
        limit = round(RATE * .010)
        best = (-1., 0)
        for shift in range(-limit, limit+1):
            base = start + shift
            if base < 0 or base + length > len(rendered):
                continue
            section = rendered[base:base+length]
            dot = sum(int(x)*int(y) for x, y in zip(target, section))
            energy = sum(int(x)*int(x) for x in section)
            score = dot / (norm1 * math.sqrt(energy)) if energy else 0
            if score > best[0]:
                best = (score, shift)
        quality, shift = best
        delta_ms = shift / RATE * 1000
        assert quality >= .93, f'Audio mismatch at {t:.2f}s: {quality:.3f}'
        assert abs(delta_ms) <= 2.0, f'Audio shift at {t:.2f}s: {delta_ms:.2f}ms'
        results.append((t, round(delta_ms, 3), round(quality, 5)))
    return results


def piano_roll_onsets(mp4, frames):
    events = list(range(1, min(len(NOTES), (frames - 1)//15 + 1)))
    frame_ids = sorted({n for k in events for n in [k*15-1, k*15]})
    # Test crop dimensions and note placement follow SignalScene.tsx.
    expression = '+'.join(f'eq(n\\,{n})' for n in frame_ids)
    raw = output('ffmpeg', '-v', 'error', '-i', str(mp4),
                 '-vf', f"select='{expression}',crop=40:160:450:200,format=rgb24",
                 '-vsync', '0', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1')
    stride = 40 * 160 * 3
    assert len(raw) == stride * len(frame_ids), 'Incorrect video frame count'
    crops = {f: memoryview(raw)[i*stride:(i+1)*stride]
             for i, f in enumerate(frame_ids)}
    confirmed = []
    for k in events:
        pitch = NOTES[k]
        expected_y = round(201 + 260 - (pitch-48)*6.4 + 2)
        before, after = crops[k*15-1], crops[k*15]
        highlighted = 0
        for y in range(max(200, expected_y-9), min(360, expected_y+10)):
            for x in range(462, 489):
                idx = ((y-200)*40+(x-450))*3
                if before[idx] < 105 and after[idx] > 155 and after[idx]-before[idx] > 75:
                    highlighted += 1
        assert highlighted >= 15, f'Piano-roll highlight not frame aligned at {k/2}s'
        confirmed.append(k/2)
    return confirmed


def main():
    if len(sys.argv) != 3:
        sys.exit('Usage: python scripts/check-av-sync.py <demo.mp4> <assets/demo.wav>')
    mp4, wav_file = [Path(v).resolve() for v in sys.argv[1:]]
    frames = details(mp4)
    audio = sound_matches(mp4, wav_file, frames)
    onsets = piano_roll_onsets(mp4, frames)
    print('AV SYNC PASS: frames=', frames, 'audio probes=', audio,
          'MIDI note transitions=', len(onsets), 'first/last=', (onsets[0], onsets[-1]))


if __name__ == '__main__':
    main()
