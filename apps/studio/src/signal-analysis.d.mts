export declare const FFT_SIZE: 1024;
export declare const BIN_COUNT: 26;
export declare const FPS: 30;
export interface AudioAnalysis {
  levels: number[];
  spectrum: number[][];
  bands: number[][];
}
export declare function analyzePcm(
  samples: Float32Array, sampleRate: number, seconds: number, fps?: number
): AudioAnalysis;
export declare function trimAnalysis(analysis: AudioAnalysis, count: number): AudioAnalysis;
