import {spawn} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const children=[
  spawn(process.execPath,[resolve(root,'scripts/export-api.mjs')],{cwd:root,stdio:'inherit'}),
  spawn(process.execPath,[resolve(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1'],{cwd:root,stdio:'inherit'}),
];
let stopping=false;
function stop(){
  if(stopping)return;
  stopping=true;
  for(const child of children)if(child.exitCode===null)child.kill();
}
process.on('SIGINT',stop);
process.on('SIGTERM',stop);
for(const child of children){
  child.on('error',e=>{console.error(e);stop();process.exitCode=1;});
  child.on('exit',(code)=>{if(!stopping&&code!==0){stop();process.exitCode=code||1;}});
}
