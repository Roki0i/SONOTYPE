import {readFileSync, statSync} from 'node:fs';
import {basename, join} from 'node:path';

const html=readFileSync('dist/index.html','utf8');
const name=html.match(/src="[^"]*\/assets\/(index-[^"]+\.js)"/)?.[1];
if(!name)throw Error('Vite entry script was not found in the build');
const bytes=statSync(join('dist','assets',basename(name))).size;
console.log('Initial home entry JavaScript: '+bytes+' bytes');
if(bytes>=900000)throw Error('Initial entry bundle is larger than the 900kB budget');
