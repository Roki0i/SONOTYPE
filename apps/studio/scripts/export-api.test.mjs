import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {makeExportServer,validateMetadata,validateAudio} from './export-api.mjs';

const ORIGIN='http://127.0.0.1:5173';
const base={title:'TEST',theme:'mint',seconds:8,
  levels:Array.from({length:240},()=>.25),
  spectrum:Array.from({length:240},()=>Array(26).fill(.2)),
  bands:Array.from({length:240},()=>[.2,.3,.4]),
  notes:[{pitch:60,time:0,duration:.5}]};
const audio=Buffer.alloc(1200);
audio.write('RIFF',0);audio.write('WAVE',8);
let server;
before(async()=>{
  server=makeExportServer({render:async({outputPath})=>writeFile(outputPath,Buffer.alloc(1201,0x11))});
  await new Promise(ok=>server.listen(8787,'127.0.0.1',ok));
});
after(async()=>{await new Promise(ok=>server.close(ok));});
async function request({origin=ORIGIN,props=base,mime='audio/wav'}={}){
  const form=new FormData();
  form.append('audio',new Blob([audio],{type:mime}),'test.wav');
  form.append('props',JSON.stringify(props));
  return fetch('http://127.0.0.1:8787/api/export',{
    method:'POST',headers:{Origin:origin},body:form
  });
}
test('Valid metadata is accepted',()=>{
  assert.deepEqual(validateMetadata(base).notes,base.notes);
});
test('Invalid duration, level, and MIDI rejected',()=>{
  assert.throws(()=>validateMetadata({...base,seconds:120}),/duration/);
  assert.throws(()=>validateMetadata({...base,levels:[NaN]}),/levels/);
  assert.throws(()=>validateMetadata({...base,spectrum:[]}),/FFT/);
  assert.throws(()=>validateMetadata({...base,spectrum:[...base.spectrum.slice(0,-1),[-1,...Array(25).fill(0)]]}),/FFT/);
  assert.throws(()=>validateMetadata({...base,bands:base.bands.map(row=>row.slice(0,2))}),/bands/);
  assert.throws(()=>validateMetadata({...base,notes:[{pitch:-1,time:0,duration:.2}]}),/MIDI/);
});
test('Audio signature must match file extension',()=>{
  assert.equal(validateAudio(audio,'.wav'),true);
  assert.equal(validateAudio(audio,'.mp3'),false);
  assert.equal(validateAudio(audio,'.exe'),false);
});
test('Origin check blocks cross-site requests',async()=>{
  const r=await request({origin:'https://other.example'});
  assert.equal(r.status,403);
});
test('Missing Origin blocked',async()=>{
  const form=new FormData();form.append('audio',new Blob([audio]),'test.wav');
  form.append('props',JSON.stringify(base));
  const r=await fetch('http://127.0.0.1:8787/api/export',{method:'POST',body:form});
  assert.equal(r.status,403);
});
test('Wrong method and unrecognized path rejected',async()=>{
  assert.equal((await fetch('http://127.0.0.1:8787/api/export')).status,404);
});
test('Valid WAV exports an MP4 response',async()=>{
  const r=await request();
  assert.equal(r.status,200);
  assert.equal(r.headers.get('content-type'),'video/mp4');
  assert.equal((await r.arrayBuffer()).byteLength,1201);
});
test('Wrong properties rejected',async()=>{
  const r=await request({props:{...base,levels:[]}});
  assert.equal(r.status,400);
});

test('Development command launches both UI and export API', async()=>{
  const {readFile}=await import('node:fs/promises');
  const {resolve}=await import('node:path');
  const {fileURLToPath}=await import('node:url');
  const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
  const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
  const launcher=await readFile(resolve(root,'scripts/dev.mjs'),'utf8');
  assert.match(pkg.scripts.dev,/node scripts\/dev\.mjs/);
  assert.match(launcher,/export-api\.mjs/);
  assert.match(launcher,/vite\/bin\/vite\.js/);
});
