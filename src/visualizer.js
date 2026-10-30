export const WIDTH=1080,HEIGHT=1920;
const COLORS={
 arctic:{accent:'#3a90e7',light:'#c5e6ff',dark:'#102941',paper:'#f0f7fd',ink:'#244660'},
 mint:{accent:'#17b5a0',light:'#b6f4e6',dark:'#103b36',paper:'#eefbf6',ink:'#235f57'},
 violet:{accent:'#9261df',light:'#dfc9ff',dark:'#2c264a',paper:'#f5f0fc',ink:'#584877'}
};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
function text(c,s,x,y,size=17,color='#66849c',weight='normal',align='left'){
 c.textAlign=align;c.font=weight+' '+size+'px monospace';c.fillStyle=color;c.fillText(String(s),x,y);c.textAlign='left';
}
function line(c,x,y,x2,y2,color='#d9e8f3',width=1){
 c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.lineWidth=width;c.strokeStyle=color;c.stroke();
}
function panel(c,x,y,w,h,title,i,theme){
 rect(c,x,y,w,h,'#fff');c.strokeStyle='#cbddea';c.strokeRect(x,y,w,h);
 rect(c,x+22,y+22,7,7,theme.accent);text(c,title,x+45,y+31,15,theme.ink,'bold');
 text(c,'0'+i,x+w-20,y+31,14,'#9bb0bf','normal','right');
 line(c,x+20,y+52,x+w-20,y+52);
}
function piano(c,midi,time,theme){
 const x=50,y=164,w=980,h=284;rect(c,x,y,w,h,'#102034');
 for(let i=0;i<=16;i++){
  line(c,x+i*w/16,y,x+i*w/16,y+h,'#2b4459');
  line(c,x,y+i*h/16,x+w,y+i*h/16,'#2b4459');
 }
 const start=Math.max(0,time-2.4),span=6.4;
 c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
 for(const n of midi?.notes||[]){
  if(n.time+n.duration<start||n.time>start+span||n.pitch<48||n.pitch>84)continue;
  const px=x+(n.time-start)/span*w,py=y+h-(n.pitch-47)*h/38;
  rect(c,px,py,Math.max(4,n.duration/span*w),h/38*.78,n.time<=time&&n.time+n.duration>=time?theme.light:theme.accent);
 }
 line(c,x+(time-start)/span*w,y,x+(time-start)/span*w,y+h,theme.light,3);
 c.restore();
}
export function drawScene(ctx,{time=0,duration=15,theme='arctic',midi=null,title='ORIGINAL DEMO',wave=null,freq=null}={}){
 const c=COLORS[theme]||COLORS.arctic;wave=wave||new Uint8Array(2048).fill(128);freq=freq||new Uint8Array(1024);
 ctx.save();ctx.clearRect(0,0,WIDTH,HEIGHT);rect(ctx,0,0,WIDTH,HEIGHT,c.paper);
 rect(ctx,0,0,WIDTH,500,c.dark);rect(ctx,0,0,WIDTH,8,c.accent);
 text(ctx,'OTO / SIGNAL STUDIO',50,75,24,'#f0f9ff','bold');
 text(ctx,'AUDIO-REACTIVE VISUAL SYSTEM',50,110,14,'#83afce');
 text(ctx,'MIDI / PIANO ROLL',50,152,15,'#b4cbe0');
 text(ctx,midi?midi.notes.length+' NOTES':'NO MIDI DATA',1030,152,15,c.light,'normal','right');
 piano(ctx,midi,time,c);
 text(ctx,'PLAYHEAD',50,476,14,'#82abc5');
 text(ctx,time.toFixed(2)+' s',1030,476,18,c.light,'bold','right');
 text(ctx,'SIGNAL / ANALYTICS',50,563,16,c.accent,'bold');
 text(ctx,'MUSIC IS DATA.',50,643,56,c.dark,'bold');
 text(ctx,'AUDIO TELEMETRY / 30 FPS',50,685,16,'#7793aa');
 panel(ctx,50,722,980,347,'WAVEFORM / AMPLITUDE',1,c);
 const waveformX=80,waveformY=905,waveformW=915;
 line(ctx,80,905,995,905,'#b7cee0');
 for(let x=0;x<450;x++){
  const idx=Math.floor(x*wave.length/450);
  const amp=Math.abs((wave[idx]-128)/128);
  const h=Math.max(2,amp*150);rect(ctx,waveformX+x*waveformW/450,waveformY-h,1.8,h*2,c.accent);
 }
 text(ctx,'0:00',80,1044,14);text(ctx,duration.toFixed(1)+'s',1000,1044,14,'#7793aa','normal','right');
 panel(ctx,50,1090,610,338,'FREQUENCY / SPECTRUM',2,c);
 let low=0,mid=0,high=0;
 for(let i=0;i<24;i++){
  const idx=Math.min(freq.length-1,Math.floor(Math.pow(i/23,1.7)*(freq.length-1)));
  const v=(freq[idx]||0)/255;const h=v*226;
  rect(ctx,83+i*23.1,1390-h,15,h,i<8?c.accent:i<17?c.light:'#95b6d5');
  if(i<8)low+=v;else if(i<16)mid+=v;else high+=v;
 }
 low/=8;mid/=8;high/=8;
 text(ctx,'LOW',83,1414,13);text(ctx,'HIGH',625,1414,13,'#7793aa','normal','right');
 panel(ctx,680,1090,350,338,'ENERGY / LEVEL',3,c);
 const energy=(low+mid+high)/3;
 ctx.lineWidth=22;ctx.strokeStyle='#d7e7f4';ctx.beginPath();ctx.arc(855,1263,104,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle=c.accent;ctx.beginPath();ctx.arc(855,1263,104,-Math.PI/2,-Math.PI/2+2*Math.PI*energy);ctx.stroke();
 text(ctx,String(Math.round(energy*100)).padStart(2,'0'),855,1280,50,c.dark,'bold','center');
 const vals=[low,mid,high],names=['LOW / BASS','MID / BODY','HIGH / AIR'];
 for(let i=0;i<3;i++){const x=50+i*330;panel(ctx,x,1449,315,204,names[i],i+4,c);
  text(ctx,Math.round(vals[i]*100)+'%',x+22,1574,42,c.dark,'bold');
  rect(ctx,x+22,1604,270,12,'#d8e7f1');rect(ctx,x+22,1604,270*clamp(vals[i]),12,c.accent);
 }
 panel(ctx,50,1676,980,170,'SESSION / NOTE ACTIVITY',7,c);
 for(let i=0;i<48;i++){
  const at=time+(i-24)*.085;
  const active=midi?.notes?.some(n=>n.time<=at&&n.time+n.duration>at);
  const v=freq[(i*7)%freq.length]/255;
  rect(ctx,78+i*19,1811-(active?90:v*70),12,active?90:v*70,active?c.accent:c.light);
 }
 text(ctx,midi?'MIDI DATA ENABLED':'AUDIO-ONLY / NO PITCH INFERENCE',78,1833,13);
 rect(ctx,0,1872,WIDTH,48,c.dark);
 text(ctx,'OTO / STUDIO  •  LOCAL VISUAL ENGINE v0.1',50,1904,14,'#c6e2f5','bold');
 text(ctx,title.slice(0,32).toUpperCase(),1030,1904,14,c.light,'normal','right');
 ctx.restore();
}
