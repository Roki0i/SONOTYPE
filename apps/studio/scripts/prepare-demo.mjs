import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {analyzePcm} from '../src/signal-analysis.mjs';
import {spawnSync} from 'node:child_process';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const output = resolve(here, '../public');
mkdirSync(output, {recursive: true});
if (!existsSync(resolve(root, 'assets/demo.wav')) || !existsSync(resolve(root, 'assets/demo.mid'))) {
  const commands = process.platform === 'win32'
    ? [['py', ['-3', resolve(root, 'generate_demo.py')]], ['python', [resolve(root, 'generate_demo.py')]]]
    : [['python3', [resolve(root, 'generate_demo.py')]], ['python', [resolve(root, 'generate_demo.py')]]];
  let ok = false;
  for (const [cmd, args] of commands) {
    const res = spawnSync(cmd, args, {cwd: root, stdio: 'inherit'});
    if (res.status === 0) {ok = true; break;}
  }
  if (!ok) throw Error('Could not generate original demo; Python 3 required');
}
for (const file of ['demo.wav', 'demo.mid']) {
  copyFileSync(resolve(root, 'assets', file), resolve(output, file));
}
console.log('Prepared demo WAV and MIDI');
// Interpret the original generated 16-bit PCM WAV (not a synthetic spectrum).
// Uses the same FFT implementation as user-uploaded browser PCM, eliminating
// the old simulated amplitude/spectrum in CLI defaultProps.
const wav=readFileSync(resolve(root,'assets/demo.wav'));
if(wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')
  throw Error('Expected RIFF WAVE demo');
let format=null, chunk=null;
for(let offset=12;offset+8<=wav.length;){
  const id=wav.toString('ascii',offset,offset+4);
  const length=wav.readUInt32LE(offset+4),start=offset+8;
  if(start+length>wav.length)throw Error('Invalid demo WAV chunk');
  if(id==='fmt ')format={codec:wav.readUInt16LE(start),channels:wav.readUInt16LE(start+2),
    sampleRate:wav.readUInt32LE(start+4),bits:wav.readUInt16LE(start+14)};
  if(id==='data'){chunk=wav.subarray(start,start+length);break;}
  offset=start+length+(length&1);
}
if(!format||!chunk||format.codec!==1||format.channels!==1||format.bits!==16)
  throw Error('Demo WAV must be mono PCM16');
const data=new Float32Array(chunk.length/2);
for(let i=0;i<data.length;i++)data[i]=chunk.readInt16LE(i*2)/32768;
const measured=analyzePcm(data,format.sampleRate,30);
writeFileSync(resolve(output,'demo-analysis.json'),JSON.stringify(measured));
console.log('Measured FFT spectrum and RMS for original demo');

