import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WEB_MP4_CONFIG,webMp4SupportIssue} from '../src/mp4-support.ts';

test('Browser and export use the required audio MP4 codec configuration',()=>{
  assert.deepEqual(WEB_MP4_CONFIG,{
    container:'mp4',videoCodec:'h264',audioCodec:'aac',
    width:1080,height:1920,outputTarget:'arraybuffer'
  });
});

test('Supported browser has no MP4 blocking issue',()=>{
  assert.equal(webMp4SupportIssue({canRender:true,issues:[]}),null);
});

test('Unsupported browser shows actionable reasons before export',()=>{
  assert.equal(
    webMp4SupportIssue({canRender:false,issues:[{message:'H.264 unavailable'},{message:'AAC unavailable'}]}),
    'このブラウザでは音声付きMP4を書き出せません: H.264 unavailable / AAC unavailable'
  );
  assert.match(webMp4SupportIssue({canRender:false,issues:[]}),/別の対応ブラウザ/);
});
