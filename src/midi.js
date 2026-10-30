/** Read Standard MIDI Files type 0/1, PPQ time division. No dependencies. */
export function parseMidi(buffer) {
  const data=new DataView(buffer);let pos=0;
  const u8=()=>data.getUint8(pos++);
  const u16=()=>{const n=data.getUint16(pos,false);pos+=2;return n;};
  const u32=()=>{const n=data.getUint32(pos,false);pos+=4;return n;};
  function chunk(){
    if(pos+8>data.byteLength)throw Error('MIDI: truncated chunk');
    const id=String.fromCharCode(u8(),u8(),u8(),u8()),len=u32(),start=pos;
    if(start+len>data.byteLength)throw Error('MIDI: malformed chunk');
    pos+=len;return{id,start,end:pos,len};
  }
  function varlen(end){
    let n=0;for(let i=0;i<4;i++){if(pos>=end)throw Error('MIDI: truncated VLQ');
      const b=u8();n=(n<<7)|(b&127);if(!(b&128))return n;}
    throw Error('MIDI: malformed VLQ');
  }
  if(data.byteLength<14)throw Error('MIDI: too short');
  const header=chunk();if(header.id!=='MThd'||header.len<6)throw Error('MIDI: invalid header');
  pos=header.start;
  const format=u16(),count=u16(),division=u16();
  if(format>1||(division&0x8000)||!division)throw Error('MIDI: type 0/1 PPQ only');
  pos=header.end;
  const raw=[],tempos=[{tick:0,value:500000,track:-1}];
  for(let t=0;t<count;t++){
    const tr=chunk();if(tr.id!=='MTrk')throw Error('MIDI: missing MTrk');
    pos=tr.start;let tick=0,status=0;const opened=new Map();
    while(pos<tr.end){
      tick+=varlen(tr.end);if(pos>=tr.end)break;
      let s=data.getUint8(pos);
      if(s&128){pos++;if(s<0xf0)status=s;}
      else {if(!status)throw Error('MIDI: missing running status');s=status;}
      if(s===0xff){
        const kind=u8(),len=varlen(tr.end);
        if(pos+len>tr.end)throw Error('MIDI: broken meta event');
        if(kind===0x51&&len===3){const value=(u8()<<16)|(u8()<<8)|u8();if(value)tempos.push({tick,value,track:t});}
        else pos+=len;
        if(kind===0x2f)break;
        status=0;continue;
      }
      if(s===0xf0||s===0xf7){const len=varlen(tr.end);pos+=len;if(pos>tr.end)throw Error('MIDI: broken sysex');status=0;continue;}
      const kind=s&0xf0,channel=s&15,keyBase=String(channel)+':';
      const a=u8(),b=(kind===0xc0||kind===0xd0)?0:u8();
      if(pos>tr.end)throw Error('MIDI: broken event');
      const key=keyBase+a;
      if(kind===0x90&&b>0){
        const q=opened.get(key)||[];q.push({tick,pitch:a,velocity:b/127,track:t});opened.set(key,q);
      }else if(kind===0x80||(kind===0x90&&b===0)){
        const q=opened.get(key);if(q?.length){const n=q.shift();raw.push({...n,end:tick});}
      }
    }
    for(const q of opened.values())for(const n of q)raw.push({...n,end:tick});
    pos=tr.end;
  }
  tempos.sort((a,b)=>a.tick-b.tick||a.track-b.track);
  const compact=[];for(const t of tempos){if(compact.length&&compact.at(-1).tick===t.tick)compact[compact.length-1]=t;else compact.push(t);}
  let sec=0,tick=0,current=500000;
  for(const t of compact){sec+=(t.tick-tick)*current/(1e6*division);t.sec=sec;tick=t.tick;current=t.value;}
  function at(t){let index=0;for(let i=1;i<compact.length;i++){if(compact[i].tick>t)break;index=i;}
    const q=compact[index];return q.sec+(t-q.tick)*q.value/(1e6*division);}
  const notes=raw.slice(0,20000).map(n=>({time:at(n.tick),duration:Math.max(.02,at(n.end)-at(n.tick)),pitch:n.pitch,velocity:n.velocity,track:n.track})).sort((a,b)=>a.time-b.time);
  return {format,notes,trackCount:count,bpm:Math.round(60e6/compact[0].value),duration:notes.reduce((a,n)=>Math.max(a,n.time+n.duration),0)};
}
