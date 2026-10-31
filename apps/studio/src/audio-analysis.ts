/** Decode uploaded audio once, mix all channels and compute fixed-frame FFT/RMS. */
import {analyzePcm, type AudioAnalysis} from './signal-analysis.mjs';

export async function analyzeAudio(file: File, seconds = 30): Promise<AudioAnalysis> {
  if (file.size > 25 * 1024 * 1024) throw Error('音声ファイルは25MB以内');
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    if (!Number.isFinite(decoded.duration) || decoded.duration > 3600) {
      throw Error('音声は1時間以内にしてください');
    }
    // Only the first 30s are needed, even for compressed longer recordings.
    const count = Math.min(decoded.length, seconds * decoded.sampleRate);
    const mixed = new Float32Array(count);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const samples = decoded.getChannelData(channel);
      for (let i = 0; i < count; i++) mixed[i] += samples[i] / decoded.numberOfChannels;
    }
    return analyzePcm(mixed, decoded.sampleRate, seconds);
  } finally {
    await ctx.close();
  }
}
