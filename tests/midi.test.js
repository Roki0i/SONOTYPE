import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMidi} from '../src/midi.js';
import {drawScene} from '../src/visualizer.js';
test('Reject truncated MIDI',()=>assert.throws(()=>parseMidi(new ArrayBuffer(3)),/MIDI/));
test('Parse basic MIDI with note on/off',()=>{
  const bytes=Uint8Array.from([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,0,0,0,13,0,144,60,100,131,96,128,60,0,0,255,47,0]);
  const m=parseMidi(bytes.buffer);
  assert.equal(m.trackCount,1);assert.equal(m.notes.length,1);assert.equal(m.notes[0].pitch,60);
  assert.ok(Math.abs(m.notes[0].duration-.5)<.001);
});
test('Canvas scene renders with no MIDI',()=>{
  let draws=0;const ctx={};
  for(const key of ['save','restore','clearRect','fillRect','strokeRect','beginPath','moveTo','lineTo','stroke','arc','rect','clip','fillText'])
    ctx[key]=()=>{draws++;};
  drawScene(ctx,{time:0});assert.ok(draws>50);
});
