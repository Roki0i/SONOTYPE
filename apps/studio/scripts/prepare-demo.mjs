import {copyFileSync, existsSync, mkdirSync} from 'node:fs';
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
