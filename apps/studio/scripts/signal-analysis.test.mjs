import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzePcm, trimAnalysis, BIN_COUNT} from '../src/signal-analysis.mjs';

function tone(hz, seconds = 2, amplitude = 0.45, rate = 22050) {
  return Float32Array.from({length: seconds * rate},
    (_, i) => Math.sin(i * 2 * Math.PI * hz / rate) * amplitude);
}
test('Silence creates finite zero spectral bins and band levels',()=>{
  const result=analyzePcm(new Float32Array(22050),22050,1);
  assert.equal(result.levels.length,30);
  assert.deepEqual(result.spectrum[5],Array(BIN_COUNT).fill(0));
  assert.deepEqual(result.bands[5],[0,0,0]);
});
test('Bass/mid/treble detect actual sine frequency instead of fabricated scaling',()=>{
  const cases=[[95,0],[440,1],[4000,2]];
  for(const [freq,band] of cases) {
    const result=analyzePcm(tone(freq),22050,2);
    const values=result.bands[10];
    assert.equal(values.indexOf(Math.max(...values)),band,
      'wrong strongest band for '+freq+'Hz '+JSON.stringify(values));
    assert.ok(values[band]>.45,'weak response for '+freq+'Hz');
    assert.equal(result.spectrum[10].length,BIN_COUNT);
  }
});
test('Spectrum follows frame time: loud tone stops and silence remains',()=>{
  const signal=tone(440,1);
  const data=analyzePcm(signal,22050,3);
  assert.ok(data.bands[10][1]>.45);
  assert.equal(data.bands[50][1],0);
  assert.equal(data.levels[50],0);
});
test('Stereo downmix source shape and bounded finite serialized values',()=>{
  const data=analyzePcm(tone(440,1),22050,2);
  for(const list of [...data.spectrum,...data.bands,[...data.levels]]){
    assert.ok(list.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
  }
  assert.equal(trimAnalysis(data,30).spectrum.length,30);
  assert.throws(()=>trimAnalysis(data,901));
  assert.throws(()=>analyzePcm(tone(440),22050,31));
});
test('Deterministic analysis repeated on identical PCM input',()=>{
  const input=tone(220,1);
  assert.deepEqual(analyzePcm(input,22050,1),analyzePcm(input,22050,1));
});
test('Audio analysis window selects the requested source frames and pads after source end',()=>{
  const source=analyzePcm(
    Float32Array.from({length:22050*3},(_,i)=>i<22050?0:Math.sin(i*2*Math.PI*440/22050)*.45),
    22050,4);
  const fromSecondOne=trimAnalysis(source,30,30);
  assert.equal(fromSecondOne.levels.length,30);
  assert.ok(fromSecondOne.levels[10]>.2);
  assert.ok(fromSecondOne.bands[10][1]>.3);
  assert.equal(trimAnalysis(source,30,0).levels[10],0);
  const padding=trimAnalysis(source,30,115);
  assert.equal(padding.levels[29],0);
  assert.deepEqual(padding.spectrum[29],Array(BIN_COUNT).fill(0));
  assert.deepEqual(padding.bands[29],[0,0,0]);
  assert.throws(()=>trimAnalysis(source,8,-1),/frame window/);
  assert.throws(()=>trimAnalysis(source,8,2.5),/frame window/);
});
