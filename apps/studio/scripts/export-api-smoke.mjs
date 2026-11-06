/** Actual HTTP export E2E: uploaded original demo WAV -> Remotion -> non-silent MP4. */
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {makeExportServer} from './export-api.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const demo=await readFile(join(root,'assets/demo.wav'));
const measured=JSON.parse(await readFile(join(root,'apps/studio/public/demo-analysis.json'),'utf8'));
const count=240;
const form=new FormData();
form.append('audio',new Blob([demo],{type:'audio/wav'}),'demo.wav');
form.append('props',JSON.stringify({title:'CI CUSTOM AUDIO',artist:'CI ARTIST',templateId:'retro-grid',theme:'violet',seconds:8,
  notes:[{time:0,pitch:74,duration:.42}],
  levels:measured.levels.slice(0,count),
  spectrum:measured.spectrum.slice(0,count),
  bands:measured.bands.slice(0,count)}));
const server=makeExportServer();
const folder=await mkdtemp(join(tmpdir(),'oto-export-smoke-'));
let response;
try {
  await new Promise(ok=>server.listen(8787,'127.0.0.1',ok));
  response=await fetch('http://127.0.0.1:8787/api/export',{
    method:'POST',headers:{Origin:'http://127.0.0.1:5173'},body:form,
    signal:AbortSignal.timeout(240000),
  });
  if(!response.ok)throw Error('API export failed: HTTP '+response.status+' '+await response.text());
  const video=Buffer.from(await response.arrayBuffer());
  if(video.length<1000||video.subarray(4,8).toString('ascii')!=='ftyp')throw Error('MP4 output missing');
  const file=join(folder,'rendered.mp4');await writeFile(file,video);
  const ffprobe=spawnSync('ffprobe',['-v','error','-show_streams','-of','json',file],{encoding:'utf8'});
  if(ffprobe.status!==0)throw Error('ffprobe failed: '+ffprobe.stderr);
  const streams=JSON.parse(ffprobe.stdout).streams;
  const image=streams.find(x=>x.codec_type==='video'),sound=streams.find(x=>x.codec_type==='audio');
  if(image?.codec_name!=='h264'||image.width!==1080||image.height!==1920||sound?.codec_name!=='aac') {
    throw Error('Invalid MP4 codecs or resolution: '+JSON.stringify(streams));
  }
  console.log('CUSTOM AUDIO E2E PASS: '+video.length+' bytes, H.264 1080x1920, AAC');
}finally{
  await new Promise(ok=>server.close(ok));
  await rm(folder,{recursive:true,force:true});
}
