/**
 * Deterministic offline frame-based audio analysis.
 *
 * Every spectrum row is computed from PCM around the center of its own video
 * frame; no wall-clock AnalyserNode, smoothing across frames or simulated bars.
 * FFT 1024 samples, Hann window, logarithmic 26-bin frequency mapping.
 * Output values are bounded 0..1 and rounded for safe JSON transport.
 */
export const FFT_SIZE = 1024;
export const BIN_COUNT = 26;
export const FPS = 30;
const LOW_HZ = 35;
const HIGH_HZ = 10000;
const TAU = 2 * Math.PI;

const hann = Float64Array.from({length: FFT_SIZE}, (_, i) =>
  0.5 * (1 - Math.cos(TAU * i / (FFT_SIZE - 1))));
const cos = new Float64Array(FFT_SIZE / 2);
const sin = new Float64Array(FFT_SIZE / 2);
for (let i = 0; i < FFT_SIZE / 2; i++) {
  cos[i] = Math.cos(TAU * i / FFT_SIZE);
  sin[i] = -Math.sin(TAU * i / FFT_SIZE);
}
const precision = x => Math.round(Math.min(1, Math.max(0, x)) * 10000) / 10000;

function fft(re, im) {
  const n = FFT_SIZE;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {j ^= bit; bit >>= 1;}
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len *= 2) {
    const half = len / 2, step = n / len;
    for (let start = 0; start < n; start += len) {
      for (let k = 0; k < half; k++) {
        const u = start + k, v = u + half, tw = k * step;
        const real = re[v] * cos[tw] - im[v] * sin[tw];
        const imag = re[v] * sin[tw] + im[v] * cos[tw];
        re[v] = re[u] - real;
        im[v] = im[u] - imag;
        re[u] += real;
        im[u] += imag;
      }
    }
  }
}

function frequencyIndex(freq, maximum) {
  return Math.max(0, Math.min(BIN_COUNT - 1,
    Math.floor(Math.log(freq / LOW_HZ) / Math.log(maximum / LOW_HZ) * BIN_COUNT)));
}

function displayMagnitude(value) {
  // dBFS amplitude mapping: <= -72dB is black, -6dB approaches full height.
  if (value <= 0) return 0;
  return precision((20 * Math.log10(value) + 72) / 66);
}

export function analyzePcm(samples, sampleRate, seconds, fps = FPS) {
  if (!(samples instanceof Float32Array) ||
      !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000 ||
      !Number.isInteger(seconds) || seconds < 1 || seconds > 30 ||
      fps !== FPS) throw Error('Invalid PCM analysis input');
  const count = seconds * fps;
  const levels = new Array(count);
  const spectrum = new Array(count);
  const bands = new Array(count);
  const nyquist = sampleRate / 2;
  const maximum = Math.min(HIGH_HZ, nyquist * 0.98);
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const binPowers = new Float64Array(BIN_COUNT);

  for (let frame = 0; frame < count; frame++) {
    const begin = Math.floor(frame * sampleRate / fps);
    const end = Math.min(samples.length, Math.floor((frame + 1) * sampleRate / fps));
    let energy = 0;
    for (let i = begin; i < end; i++) {
      const value = samples[i] || 0;
      energy += value * value;
    }
    levels[frame] = precision(end > begin ? Math.sqrt(energy / (end - begin)) * 2.4 : 0);

    const center = Math.floor((frame + 0.5) * sampleRate / fps);
    re.fill(0); im.fill(0); binPowers.fill(0);
    let windowEnergy = 0;
    for (let k = 0; k < FFT_SIZE; k++) {
      const idx = center - FFT_SIZE / 2 + k;
      const value = idx >= 0 && idx < samples.length ? samples[idx] : 0;
      re[k] = value * hann[k];
      windowEnergy += Math.abs(value) * hann[k];
    }
    if (windowEnergy < 1e-7) {
      spectrum[frame] = Array(BIN_COUNT).fill(0);
      bands[frame] = [0, 0, 0];
      continue;
    }
    fft(re, im);
    for (let k = 1; k < FFT_SIZE / 2; k++) {
      const hz = k * sampleRate / FFT_SIZE;
      if (hz < LOW_HZ || hz > maximum) continue;
      const magnitude = Math.hypot(re[k], im[k]) * (4 / FFT_SIZE);
      const b = frequencyIndex(hz, maximum);
      binPowers[b] = Math.max(binPowers[b], magnitude);
    }
    const row = Array.from(binPowers, displayMagnitude);
    spectrum[frame] = row;
    // Labels correspond to actual spectral frequency ranges (not arbitrary
    // amplitude multipliers); use the same max display in every category.
    const measured = [0, 0, 0];
    for (let b = 0; b < BIN_COUNT; b++) {
      const hz = LOW_HZ * Math.pow(maximum / LOW_HZ, (b + 0.5) / BIN_COUNT);
      const group = hz < 220 ? 0 : hz < 2000 ? 1 : 2;
      measured[group] = Math.max(measured[group], row[b]);
    }
    bands[frame] = measured;
  }
  return {levels, spectrum, bands};
}

export function trimAnalysis(analysis, count) {
  if (!Number.isInteger(count) || count < 0 || count > 900) throw Error('Invalid frame count');
  return {
    levels: analysis.levels.slice(0, count),
    spectrum: analysis.spectrum.slice(0, count),
    bands: analysis.bands.slice(0, count)
  };
}
