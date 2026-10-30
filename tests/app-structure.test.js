import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('App UI has required control targets',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const id of ['scene','audioFile','midiFile','playButton','seek','exportButton','progress','status'])
  assert.match(html,new RegExp('id="'+id+'"'));
});
test('Local server exposes only loopback',()=>{
 const src=readFileSync(new URL('../server.py',import.meta.url),'utf8');
 assert.match(src,/127\.0\.0\.1/);
 assert.match(src,/MAX_BYTES/);
});
