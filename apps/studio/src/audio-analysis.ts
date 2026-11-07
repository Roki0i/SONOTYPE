/** Decode an uploaded audio file once; analyze only the selected video window. */
import {analyzePcm, type AudioAnalysis} from './signal-analysis.mjs';

export async function decodeAudio(file:File): Promise<AudioBuffer> {
  if(file.size > 25*1024*1024)throw Error('音声ファイルは25MiB以内');
  const context=new AudioContext();
  try {
    const decoded=await context.decodeAudioData(await file.arrayBuffer());
    if(!Number.isFinite(decoded.duration)||decoded.duration<=0||decoded.duration>3600){
      throw Error('音声は1時間以内にしてください');
    }
    return decoded;
  }finally{
    await context.close();
  }
}

/** frameOffset is the source position at 30 fps. Never mix the whole song. */
export function analyzeAudioSegment(
  decoded:AudioBuffer, seconds=30, frameOffset=0
):AudioAnalysis {
  if(!Number.isInteger(frameOffset)||frameOffset<0||frameOffset>3600*30){
    throw Error('Invalid audio start position');
  }
  const start=Math.round(frameOffset*decoded.sampleRate/30);
  const size=Math.max(0,Math.min(decoded.length-start,seconds*decoded.sampleRate));
  const mixed=new Float32Array(size);
  for(let channel=0;channel<decoded.numberOfChannels;channel++){
    const samples=decoded.getChannelData(channel);
    for(let i=0;i<size;i++)mixed[i]+=samples[start+i]/decoded.numberOfChannels;
  }
  return analyzePcm(mixed,decoded.sampleRate,seconds);
}

/** Retain the previous public helper for callers that only need the start. */
export async function analyzeAudio(file:File,seconds=30):Promise<AudioAnalysis>{
  return analyzeAudioSegment(await decodeAudio(file),seconds);
}
