/**
 * Compute serializable per-frame RMS levels using decoded PCM.
 * All values are bounded and do not depend on wall-clock playback.
 */
export async function analyzeAudio(file: File, seconds: number, fps = 30): Promise<number[]> {
  if (file.size > 25 * 1024 * 1024) throw Error('音声ファイルは25MB以内');
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(await file.arrayBuffer());
    const samples = audio.getChannelData(0);
    const count = seconds * fps;
    const levels: number[] = [];
    for (let i=0;i<count;i++) {
      const start=Math.floor(i/fps*audio.sampleRate);
      const end=Math.min(samples.length,Math.floor((i+1)/fps*audio.sampleRate));
      if (start>=end) {levels.push(0);continue;}
      let sum=0, n=0;
      const step=Math.max(1,Math.floor((end-start)/500));
      for(let j=start;j<end;j+=step){sum+=samples[j]*samples[j];n++;}
      levels.push(Math.min(1,Math.sqrt(sum/Math.max(n,1))*2.4));
    }
    return levels;
  } finally {
    await ctx.close();
  }
}
