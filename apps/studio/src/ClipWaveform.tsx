import {useMemo, useState, type PointerEvent} from 'react';

const BARS=144;
const WIDTH=576;
const HEIGHT=92;
const MID=HEIGHT/2;
const MAX_SAMPLES_PER_BAR=384;

// A bounded, read-only RMS overview. Never retain a second copy of the decoded PCM.
function summarizeAudio(audio:AudioBuffer):number[]{
  const channels=Array.from({length:audio.numberOfChannels},(_,i)=>audio.getChannelData(i));
  const result:number[]=[];
  for(let bar=0;bar<BARS;bar++){
    const begin=Math.floor(bar*audio.length/BARS);
    const end=Math.floor((bar+1)*audio.length/BARS);
    const stride=Math.max(1,Math.ceil((end-begin)/MAX_SAMPLES_PER_BAR));
    let energy=0,count=0;
    for(let i=begin;i<end;i+=stride){
      // Vary positions within each stride to avoid sampling a periodic zero crossing.
      const offset=Math.floor(stride*((count%7)+1)/9);
      const index=Math.min(end-1,i+offset);
      for(const channel of channels){
        const sample=channel[index]??0;
        energy+=sample*sample;
        count++;
      }
    }
    result.push(count?Math.min(1,Math.sqrt(energy/count)*2.6):0);
  }
  return result;
}

// Reuse the already-measured frame amplitudes for the bundled demo.
function summarizeDemo(levels:readonly number[]):number[]{
  return Array.from({length:BARS},(_,i)=>{
    const begin=Math.floor(i*levels.length/BARS);
    const end=Math.floor((i+1)*levels.length/BARS);
    let peak=0;
    for(let j=begin;j<end;j++)peak=Math.max(peak,levels[j]??0);
    return Math.min(1,Math.max(0,peak));
  });
}

function pathForBars(values:readonly number[]):string{
  return values.map((amp,i)=>{
    const x=((i+.5)/values.length*WIDTH).toFixed(2);
    const half=(Math.max(.018,amp)*38).toFixed(2);
    return `M${x} ${MID-Number(half)}v${Number(half)*2}`;
  }).join(' ');
}

type Props={
  audio:AudioBuffer|null;
  demoLevels:readonly number[];
  duration:number;
  clipSeconds:number;
  startFrame:number;
  maxStartFrame:number;
  disabled:boolean;
  onStartFrameChange:(frame:number)=>void;
};

export function ClipWaveform({
  audio,demoLevels,duration,clipSeconds,startFrame,maxStartFrame,disabled,onStartFrameChange
}:Props){
  const samples=useMemo(()=>audio?summarizeAudio(audio):summarizeDemo(demoLevels),[audio,demoLevels]);
  const bars=useMemo(()=>pathForBars(samples),[samples]);
  const [dragFrame,setDragFrame]=useState<number|null>(null);
  const currentStart=Math.min(dragFrame??startFrame,maxStartFrame)/30;
  const safeDuration=Math.max(duration,0.001);
  const left=Math.min(WIDTH,Math.max(0,currentStart/safeDuration*WIDTH));
  const right=Math.min(WIDTH,Math.max(left,(currentStart+clipSeconds)/safeDuration*WIDTH));

  const frameAt=(event:PointerEvent<HTMLDivElement>):number=>{
    const rect=event.currentTarget.getBoundingClientRect();
    const fraction=rect.width>0?(event.clientX-rect.left)/rect.width:0;
    const second=Math.max(0,Math.min(maxStartFrame/30,
      Math.round(Math.max(0,Math.min(1,fraction))*duration)));
    return second*30;
  };
  const onDown=(event:PointerEvent<HTMLDivElement>)=>{
    if(disabled||event.button!==0)return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragFrame(frameAt(event));
  };
  const onMove=(event:PointerEvent<HTMLDivElement>)=>{
    if(disabled||!event.currentTarget.hasPointerCapture(event.pointerId))return;
    setDragFrame(frameAt(event));
  };
  const onUp=(event:PointerEvent<HTMLDivElement>)=>{
    if(disabled||!event.currentTarget.hasPointerCapture(event.pointerId))return;
    const nextFrame=frameAt(event);
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragFrame(null);
    onStartFrameChange(nextFrame);
  };

  return <div
    className={'clip-waveform'+(disabled?' is-disabled':'')}
    data-waveform-source={audio?'uploaded':'demo'}
    aria-hidden="true"
    onPointerDown={onDown}
    onPointerMove={onMove}
    onPointerUp={onUp}
    onPointerCancel={()=>setDragFrame(null)}
  >
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" focusable="false">
      <defs>
        <clipPath id="sonotype-clip-selection">
          <rect x={left} y="0" width={Math.max(0,right-left)} height={HEIGHT}/>
        </clipPath>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="#252921"/>
      <path d={bars} fill="none" stroke="#77786c" strokeWidth="2.6" strokeLinecap="round"/>
      <rect x={left} y="0" width={Math.max(0,right-left)} height={HEIGHT} fill="#ac8a65" opacity=".15"/>
      <path d={bars} fill="none" stroke="#dcc4a2" strokeWidth="2.6"
        strokeLinecap="round" clipPath="url(#sonotype-clip-selection)"/>
      <line x1={left} x2={left} y1="0" y2={HEIGHT} stroke="#e8d2b4" strokeWidth="2.4"/>
      <line x1={right} x2={right} y1="0" y2={HEIGHT} stroke="#c0a07b" strokeWidth="1.6"/>
    </svg>
  </div>;
}
