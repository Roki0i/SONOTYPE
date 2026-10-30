# OTO / Signal Studio architecture

- Local HTTP server: Python standard library, loopback 127.0.0.1 only
- Audio playback: HTMLAudioElement via Web Audio API, MediaStreamDestination for recording audio
- Spectrum & waveform: AnalyserNode
- MIDI: Standard MIDI Files type 0/1 (PPQ) parsed in browser; MIDI is optional
- Visualization: same Canvas scene for preview and MediaRecorder capture
- Output: browser MediaRecorder -> local POST /api/convert -> FFmpeg -> MP4 (H.264/AAC)
- Generated demo: generate_demo.py creates an original WAV and aligned MIDI on first start
- Exports take real time and need active foreground playback; deterministic Remotion export is a future milestone

## Boundaries
No remote upload. No note inference from audio. The Python server is intended for trusted, local use only.

## Security boundaries (2026-10-31)

- HTTP Host must be 127.0.0.1:PORT; GET/HEAD serve only the small UI/static allowlist.
- POST /api/convert requires the exact local Origin, video/webm MIME, EBML signature, size limit and timeouts.
- FFmpeg uses a local temporary file, the Matroska demuxer and a protocol allowlist of file,pipe.
- CSP disallows unsafe-eval. Browser tests must use Playwright polling without wait_for_function.
- CI runs Python negative security tests and Chromium MP4 output checks, but this is not a security audit of the FFmpeg binary.
- The server has no authentication: do not bind it to 0.0.0.0 or route it to other networks.
- Review the upstream FFmpeg security advisory and distribution security backports regularly.
