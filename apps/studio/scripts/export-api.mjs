import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {randomUUID} from 'node:crypto';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {dirname, extname, join, resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const STUDIO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS = resolve(STUDIO, 'public', 'render-uploads');
const BOUND_HOST = '127.0.0.1';
const BOUND_PORT = 8787;
const ALLOWED_ORIGIN = 'http://127.0.0.1:5173';
const MAX_AUDIO = 25 * 1024 * 1024;
const MAX_BODY = 27 * 1024 * 1024;
const MAX_MP4 = 160 * 1024 * 1024;
const EXTENSIONS = new Set(['.wav', '.mp3', '.m4a', '.aac', '.ogg']);
const THEMES = new Set(['arctic', 'mint', 'violet']);
const DURATIONS = new Set([8, 15, 30]);

export function validateMetadata(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Invalid props');
  const {title, theme, seconds, levels, notes} = raw;
  if (typeof title !== 'string' || title.length < 1 || title.length > 64 || /[\x00-\x1f]/.test(title)) {
    throw Error('Invalid title');
  }
  if (!THEMES.has(theme) || !DURATIONS.has(seconds)) throw Error('Invalid theme or duration');
  if (!Array.isArray(levels) || levels.length !== seconds * 30 ||
    !levels.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) {
    throw Error('Invalid audio levels');
  }
  if (!Array.isArray(notes) || notes.length > 20000 ||
    !notes.every(n => n && typeof n === 'object' && Number.isInteger(n.pitch) &&
      n.pitch >= 0 && n.pitch <= 127 && Number.isFinite(n.time) && n.time >= 0 &&
      n.time <= 3600 && Number.isFinite(n.duration) && n.duration > 0 && n.duration <= 120)) {
    throw Error('Invalid MIDI notes');
  }
  return {title, theme, seconds, levels, notes: notes.map(n => ({pitch:n.pitch,time:n.time,duration:n.duration}))};
}

export function validateAudio(bytes, extension) {
  if (!EXTENSIONS.has(extension) || bytes.length < 12 || bytes.length > MAX_AUDIO) return false;
  const ascii=(offset,len)=>bytes.subarray(offset,offset+len).toString('ascii');
  if (extension === '.wav') return ascii(0,4)==='RIFF' && ascii(8,4)==='WAVE';
  if (extension === '.ogg') return ascii(0,4)==='OggS';
  if (extension === '.m4a') return ascii(4,4)==='ftyp';
  if (extension === '.mp3') return ascii(0,3)==='ID3' || (bytes[0]===255 && (bytes[1]&224)===224);
  if (extension === '.aac') return bytes[0]===255 && (bytes[1]&246)===240;
  return false;
}

async function readLimited(request) {
  let total=0;
  const chunks=[];
  for await(const chunk of request){
    total+=chunk.length;
    if(total>MAX_BODY)throw Error('Upload exceeds size limit');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function parseForm(request) {
  const contentType=request.headers['content-type'] ?? '';
  if (!/^multipart\/form-data;\s*boundary=/i.test(contentType)) throw Error('Expected multipart form data');
  if (Number(request.headers['content-length'] ?? 0)>MAX_BODY) throw Error('Upload exceeds size limit');
  const data=await readLimited(request);
  const req=new Request('http://127.0.0.1:'+BOUND_PORT+'/api/export',{
    method:'POST',
    headers:{'content-type':contentType},
    body:data,
  });
  const form=await req.formData();
  const audio=form.get('audio');
  const rawProps=form.get('props');
  if (!(audio instanceof Blob) || typeof rawProps !== 'string' || rawProps.length > 500000) {
    throw Error('Invalid upload fields');
  }
  const name=typeof audio.name==='string'?audio.name:'audio.wav';
  const extension=extname(name).toLowerCase();
  const bytes=Buffer.from(await audio.arrayBuffer());
  if (!validateAudio(bytes,extension)) throw Error('Unsupported or invalid audio file');
  return {bytes,extension,metadata:validateMetadata(JSON.parse(rawProps))};
}

function cliPath(){
  const packageDir=resolve(STUDIO,'node_modules','@remotion','cli');
  const info=JSON.parse(readFileSync(join(packageDir,'package.json'),'utf8'));
  const bin=typeof info.bin==='string'?info.bin:info.bin?.remotion;
  if (typeof bin!=='string') throw Error('Remotion executable is unavailable');
  const path=resolve(packageDir,bin);
  if (!path.startsWith(packageDir+sep)) throw Error('Invalid Remotion executable');
  return path;
}

async function cliRender({propsPath,outputPath,seconds}){
  const args=[cliPath(),'render','src/remotion/entry.ts','OTO-Demo',outputPath,
    '--codec=h264','--frames=0-'+String(seconds*30-1),'--concurrency=2','--props='+propsPath,'--log=error'];
  await new Promise((ok,fail)=>{
    const child=spawn(process.execPath,args,{cwd:STUDIO,windowsHide:true,stdio:['ignore','pipe','pipe'],env:process.env});
    let stderr='';
    child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-3000);});
    child.stdout.resume();
    const timer=setTimeout(()=>{child.kill();fail(Error('Remotion render timed out'));},240000);
    child.on('error',e=>{clearTimeout(timer);fail(e);});
    child.on('close',code=>{
      clearTimeout(timer);
      if (code===0)ok();
      else fail(Error('Remotion render failed (exit '+code+'): '+stderr.slice(-500)));
    });
  });
}

function sendError(res,status,reason){
  const body=JSON.stringify({error:reason});
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Content-Length':Buffer.byteLength(body),
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'
  });
  res.end(body);
}

export function makeExportServer({render=cliRender}={}){
  let busy=false;
  return createServer(async(req,res)=>{
    if(req.headers.host!==BOUND_HOST+':'+BOUND_PORT){sendError(res,403,'Invalid Host');return;}
    if(req.url!=='/api/export'||req.method!=='POST'){sendError(res,404,'Not found');return;}
    if(req.headers.origin!==ALLOWED_ORIGIN){sendError(res,403,'Origin not allowed');return;}
    if(busy){sendError(res,409,'Another render is already running');return;}
    busy=true;
    let uploadDir=null;
    let workDir=null;
    try{
      const {bytes,extension,metadata}=await parseForm(req);
      await mkdir(UPLOADS,{recursive:true});
      uploadDir=await mkdtemp(join(UPLOADS,'job-'));
      workDir=await mkdtemp(join(tmpdir(),'oto-render-'));
      const fileName='audio'+extension;
      await writeFile(join(uploadDir,fileName),bytes,{mode:0o600});
      const relative=uploadDir.slice(UPLOADS.length+1).replaceAll('\\','/');
      const props={
        title:metadata.title,theme:metadata.theme,notes:metadata.notes,levels:metadata.levels,
        audioSrc:'static:render-uploads/'+relative+'/'+fileName
      };
      const propsPath=join(workDir,'props.json');
      const outputPath=join(workDir,'output.mp4');
      await writeFile(propsPath,JSON.stringify(props),{mode:0o600});
      await render({propsPath,outputPath,seconds:metadata.seconds});
      const mp4=await readFile(outputPath);
      if(mp4.length<1000||mp4.length>MAX_MP4)throw Error('Invalid MP4 result');
      await rm(uploadDir,{recursive:true,force:true});
      await rm(workDir,{recursive:true,force:true});
      uploadDir=null;workDir=null;
      busy=false;
      res.writeHead(200,{
        'Content-Type':'video/mp4','Content-Length':mp4.length,
        'Content-Disposition':'attachment; filename="oto-custom.mp4"',
        'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
      });
      res.end(mp4);
    }catch(error){
      console.error('Local export:',error instanceof Error?error.message:'Error');
      if(!res.headersSent)sendError(res,400,'書き出しに失敗しました。音声形式とFFmpeg/Remotion環境を確認してください。');
      else res.end();
    }finally{
      if(uploadDir)await rm(uploadDir,{recursive:true,force:true});
      if(workDir)await rm(workDir,{recursive:true,force:true});
      busy=false;
    }
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  makeExportServer().listen(BOUND_PORT,BOUND_HOST,()=>console.log('OTO export API at http://'+BOUND_HOST+':'+BOUND_PORT));
}
