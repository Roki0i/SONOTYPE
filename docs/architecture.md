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
