import {parseMidi} from './midi.js';
import {drawScene} from './visualizer.js';

const $=id=>document.getElementById(id);
const canvas=$('scene'),ctx=canvas.getContext('2d',{alpha:false});
const audio=new Audio();audio.preload='auto';
let objectUrl=null,source=null,ac=null,analyser=null,destination=null;
const state={midi:null,theme:'arctic',requested:15,title:'ORIGINAL DEMO',busy:false,playing:false,demo:true};
const clock=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
const cap=()=>Math.max(.1,Math.min(state.requested,Number.isFinite(audio.duration)?audio.duration:state.requested));
function message(text,error=false){$('status').textContent=text;$('status').style.color=error?'#ffb2ae':'#a4b9cb';}
function progress(value){$('progress').hidden=value===null;if(value!==null)$('progress').value=value;}
function labels(){
 const len=cap();$('seek').max=len;$('length').textContent=clock(len);
 $('audioName').textContent=state.title;
 $('midiName').textContent=state.midi?state.midi.notes.length+' NOTES / '+state.midi.trackCount+' TRACKS':'MIDI未選択';
}
async function ensureGraph(){
 if(ac)return;
 const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error('Web Audio APIが利用できません');
 ac=new C();source=ac.createMediaElementSource(audio);analyser=ac.createAnalyser();
 analyser.fftSize=2048;analyser.smoothingTimeConstant=.72;
 destination=ac.createMediaStreamDestination();
 source.connect(analyser);analyser.connect(ac.destination);analyser.connect(destination);
}
async function loadAudio(blob,name,demo=false){
 if(state.busy)throw Error('書き出し中は変更できません');
 audio.pause();state.playing=false;$('playButton').textContent='▶';
 if(objectUrl)URL.revokeObjectURL(objectUrl);
 objectUrl=URL.createObjectURL(blob);audio.src=objectUrl;
 audio.load();state.title=name.replace(/\.[^.]+$/,'');state.demo=demo;
 await new Promise((resolve,reject)=>{
  if(audio.readyState>=1)return resolve();
  audio.addEventListener('loadedmetadata',resolve,{once:true});
  audio.addEventListener('error',()=>reject(Error('音声の読み込みに失敗しました')),{once:true});
 });
 audio.currentTime=0;labels();message('音声を読み込みました / '+state.title);
}
async function userAudio(file){
 if(!file)return;if(file.size>25*1024*1024)throw Error('音声は25MB以内にしてください');
 if(!/\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name)&&!file.type.startsWith('audio/'))throw Error('音声ファイルを指定してください');
 state.midi=null;await loadAudio(file,file.name);labels();
}
async function userMidi(file){
 if(!file)return;if(state.busy)throw Error('書き出し中は変更できません');
 if(file.size>5*1024*1024)throw Error('MIDIは5MB以内にしてください');
 const midi=parseMidi(await file.arrayBuffer());state.midi=midi;labels();message('MIDIを読み込みました');
}
$('audioFile').onchange=async e=>{try{await userAudio(e.target.files?.[0]);}catch(err){message(err.message,true);}finally{e.target.value='';}};
$('midiFile').onchange=async e=>{try{await userMidi(e.target.files?.[0]);}catch(err){message(err.message,true);}finally{e.target.value='';}};
const drop=$('drop');
for(const event of ['dragenter','dragover'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add('dragging');});
for(const event of ['dragleave','drop'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.remove('dragging');});
drop.addEventListener('drop',async e=>{try{await userAudio(e.dataTransfer?.files?.[0]);}catch(err){message(err.message,true);}});
for(const button of document.querySelectorAll('[data-theme]'))button.onclick=()=>{
 state.theme=button.dataset.theme;document.querySelectorAll('[data-theme]').forEach(b=>b.classList.toggle('chosen',b===button));
};
for(const button of document.querySelectorAll('[data-duration]'))button.onclick=()=>{
 if(state.busy)return;state.requested=Number(button.dataset.duration);
 document.querySelectorAll('[data-duration]').forEach(b=>b.classList.toggle('chosen',b===button));
 if(audio.currentTime>cap())audio.currentTime=0;labels();
};
$('playButton').onclick=async()=>{
 if(state.busy||!audio.src)return;
 try{
  await ensureGraph();await ac.resume();
  if(state.playing){audio.pause();state.playing=false;$('playButton').textContent='▶';}
  else{if(audio.currentTime>=cap()-.04)audio.currentTime=0;await audio.play();state.playing=true;$('playButton').textContent='Ⅱ';}
 }catch(err){message(err.message,true);}
};
$('seek').oninput=()=>{if(!state.busy&&audio.src)audio.currentTime=Number($('seek').value);};
function frame(){
 const wave=new Uint8Array(2048).fill(128),freq=new Uint8Array(1024);
 if(analyser){analyser.getByteTimeDomainData(wave);analyser.getByteFrequencyData(freq);}
 const time=Math.min(cap(),audio.currentTime||0);
 drawScene(ctx,{time,duration:cap(),theme:state.theme,midi:state.midi,title:state.title,wave,freq});
 $('elapsed').textContent=clock(time);$('seek').value=String(time);
 if(state.playing&&time>=cap()-.03&&!state.busy){
  audio.pause();state.playing=false;$('playButton').textContent='▶';
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
function recorderMime(){
 if(typeof MediaRecorder==='undefined')return null;
 return ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
}
async function record(){
 if(state.busy||!audio.src)return;
 const mime=recorderMime();if(!mime||!canvas.captureStream)throw Error('このブラウザは録画に未対応です');
 state.busy=true;$('exportButton').disabled=true;
 const previous=audio.currentTime;let stream,recorder;
 try{
  await ensureGraph();await ac.resume();
  audio.pause();state.playing=false;$('playButton').textContent='▶';audio.currentTime=0;
  const wave=new Uint8Array(2048).fill(128),freq=new Uint8Array(1024);
  drawScene(ctx,{time:0,duration:cap(),theme:state.theme,midi:state.midi,title:state.title,wave,freq});
  stream=canvas.captureStream(30);
  for(const track of destination.stream.getAudioTracks())stream.addTrack(track);
  const parts=[];
  recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000,audioBitsPerSecond:192000});
  const finished=new Promise((resolve,reject)=>{
   recorder.addEventListener('dataavailable',e=>{if(e.data.size)parts.push(e.data);});
   recorder.addEventListener('stop',()=>resolve(new Blob(parts,{type:mime})),{once:true});
   recorder.addEventListener('error',e=>reject(e.error||Error('録画エラー')),{once:true});
  });
  recorder.start(250);await audio.play();message('録画中…');progress(2);
  const length=cap(),started=performance.now();
  await new Promise((resolve,reject)=>{
   function tick(){
    const current=audio.currentTime;
    progress(Math.min(75,Math.round(5+70*current/length)));
    if(current>=length-.04||audio.ended)return resolve();
    if(performance.now()-started>(length+15)*1000)return reject(Error('再生が停止したため録画を中断しました'));
    requestAnimationFrame(tick);
   }requestAnimationFrame(tick);
  });
  audio.pause();recorder.stop();
  const webm=await finished;
  if(webm.size<1000)throw Error('録画ファイルが空です');
  message('MP4へ変換中…');progress(83);
  const response=await fetch('/api/convert',{method:'POST',headers:{'Content-Type':mime},body:webm});
  if(!response.ok){const data=await response.json().catch(()=>({error:'変換に失敗しました'}));throw Error(data.error||'変換に失敗しました');}
  const mp4=await response.blob();if(mp4.size<1000)throw Error('MP4が空です');
  const url=URL.createObjectURL(mp4),link=document.createElement('a');
  link.href=url;link.download='oto-'+Date.now()+'.mp4';document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  progress(100);message('MP4を書き出しました ('+(mp4.size/1048576).toFixed(1)+'MB)');
 }finally{
  audio.pause();if(recorder?.state==='recording')recorder.stop();
  stream?.getVideoTracks().forEach(t=>t.stop());
  audio.currentTime=Math.min(previous,cap());state.busy=false;state.playing=false;
  $('exportButton').disabled=false;setTimeout(()=>progress(null),1500);
 }
}
$('exportButton').onclick=async()=>{try{await record();}catch(err){console.error(err);message(err.message||'動画の書き出しに失敗しました',true);progress(null);}};
(async()=>{
 try{
  const [wave,midi]=await Promise.all([fetch('/assets/demo.wav'),fetch('/assets/demo.mid')]);
  if(!wave.ok||!midi.ok)throw Error('デモデータを取得できませんでした');
  state.midi=parseMidi(await midi.arrayBuffer());
  await loadAudio(await wave.blob(),'ORIGINAL DEMO',true);
  labels();message('デモ音源の準備ができました');
 }catch(err){message('デモ読み込み失敗: '+err.message,true);}
})();
