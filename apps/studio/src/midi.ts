import type {Note} from './remotion/types';

/** Read standard MIDI format 0/1 with PPQ timing (no external parser). */
export function readMidi(buffer: ArrayBuffer): Note[] {
  const d = new DataView(buffer);
  let p = 0;
  function requireBytes(n:number){if(p+n>d.byteLength)throw Error('MIDIが途中で切れています');}
  function byte(){requireBytes(1);return d.getUint8(p++);}
  function word(){requireBytes(2);const v=d.getUint16(p,false);p+=2;return v;}
  function long(){requireBytes(4);const v=d.getUint32(p,false);p+=4;return v;}
  function chunk(){const type=String.fromCharCode(byte(),byte(),byte(),byte());const size=long(), start=p;requireBytes(size);p+=size;return {type,start,end:p};}
  function vlq(end:number){let value=0;for(let i=0;i<4;i++){if(p>=end)throw Error('MIDIイベントが壊れています');const b=byte();value=(value<<7)|(b&127);if((b&128)===0)return value;}throw Error('MIDIの可変長値が不正です');}
  if(d.byteLength<14)throw Error('MIDI形式ではありません');
  const h=chunk();if(h.type!=='MThd')throw Error('MIDIヘッダーがありません');
  p=h.start;const format=word(), tracks=word(), ppq=word();p=h.end;
  if(format>1||!ppq||(ppq&32768)||tracks>1000)throw Error('MIDIは形式0/1のPPQのみ対応');
  const events:{start:number;end:number;pitch:number}[]=[];
  const tempos:[number,number][]=[[0,500000]];
  for(let i=0;i<tracks;i++){
    const tr=chunk();if(tr.type!=='MTrk')throw Error('MIDIトラックが不正です');
    p=tr.start;let tick=0,status=0;
    const opened=new Map<string,number[]>();
    while(p<tr.end){
      tick+=vlq(tr.end);
      let s=d.getUint8(p);
      if(s&128){p++;if(s<240)status=s;}else{if(!status)throw Error('MIDIステータスがありません');s=status;}
      if(s===255){
        const kind=byte(),len=vlq(tr.end);if(p+len>tr.end)throw Error('MIDIメタイベント破損');
        if(kind===81&&len===3){const tempo=(byte()<<16)|(byte()<<8)|byte();if(tempo>0)tempos.push([tick,tempo]);}
        else p+=len;
        if(kind===47)break;status=0;continue;
      }
      if(s===240||s===247){const len=vlq(tr.end);p+=len;if(p>tr.end)throw Error('MIDI SysEx破損');status=0;continue;}
      const kind=s&240,ch=s&15,note=byte();
      const velocity=(kind===192||kind===208)?0:byte();
      const key=String(ch)+':'+String(note);
      if(kind===144&&velocity>0){const stack=opened.get(key)??[];stack.push(tick);opened.set(key,stack);}
      else if(kind===128||(kind===144&&velocity===0)){const q=opened.get(key);if(q?.length)events.push({start:q.shift()!,end:tick,pitch:note});}
      if(p>tr.end)throw Error('MIDIトラック破損');
    }
    p=tr.end;
  }
  tempos.sort((a,b)=>a[0]-b[0]);
  function sec(at:number){
    let lastTick=0,lastTempo=500000,result=0;
    for(const [tick,tempo] of tempos){if(tick>at)break;result+=(tick-lastTick)*lastTempo/ppq/1e6;lastTick=tick;lastTempo=tempo;}
    return result+(at-lastTick)*lastTempo/ppq/1e6;
  }
  return events.slice(0,20000).map(e=>({pitch:e.pitch,time:sec(e.start),duration:Math.max(.02,sec(e.end)-sec(e.start))})).sort((a,b)=>a.time-b.time);
}
