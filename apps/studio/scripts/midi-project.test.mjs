import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isMidiNotes,readMidi} from '../src/midi.ts';
import {isStoredProject,saveProject,loadProject} from '../src/project-storage.ts';

const uint32=value=>[(value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255];
function vlq(value){
  const bytes=[value&127];
  while(value>>=7)bytes.unshift((value&127)|128);
  return bytes;
}
function midi(track){
  return Uint8Array.from([
    77,84,104,100,0,0,0,6,0,0,0,1,1,224,
    77,84,114,107,...uint32(track.length),...track
  ]).buffer;
}
function sustainedNote(seconds,startSeconds=0){
  return midi([...vlq(startSeconds*960),0x90,60,100,
    ...vlq(seconds*960),0x80,60,0,0,0xff,0x2f,0]);
}
function installMemoryIndexedDb(){
  let snapshot=null;
  let created=false;
  const db={
    objectStoreNames:{contains:()=>created},
    createObjectStore:()=>{created=true;},
    close:()=>{},
    transaction:()=>{
      const tx={oncomplete:null,onerror:null,onabort:null,objectStore:()=>({
        put(value){
          snapshot=structuredClone(value);
          queueMicrotask(()=>tx.oncomplete?.());
          return {transaction:tx};
        },
        get(){
          const request={result:null,onsuccess:null};
          queueMicrotask(()=>{
            request.result=structuredClone(snapshot);
            request.onsuccess?.();
          });
          return request;
        }
      })};
      return tx;
    }
  };
  globalThis.indexedDB={open:()=>{
    const request={result:db,onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};
    queueMicrotask(()=>{
      if(!created)request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  }};
}

const projectWithNotes=notes=>({version:1,updatedAt:Date.now(),settings:{
  title:'Long MIDI',artist:'Artist',templateId:'signal',theme:'arctic',
  seconds:8,platform:'shorts',startFrame:0
},notes,audio:null,cover:null});

async function roundTrip(notes){
  const original=globalThis.indexedDB;
  installMemoryIndexedDb();
  try{
    const project=projectWithNotes(notes);
    assert.equal(isStoredProject(project),true);
    await saveProject(project);
    return (await loadProject())?.notes;
  }finally{
    if(original===undefined)delete globalThis.indexedDB;
    else globalThis.indexedDB=original;
  }
}

test('A 180-second MIDI note survives project save and restore',async()=>{
  const notes=readMidi(sustainedNote(180));
  assert.deepEqual(notes,[{pitch:60,time:0,duration:180}]);
  assert.deepEqual(await roundTrip(notes),notes);
});

test('A note ending after one hour remains valid in version 1 projects',async()=>{
  const notes=readMidi(sustainedNote(180,3590));
  assert.deepEqual(notes,[{pitch:60,time:3590,duration:180}]);
  assert.equal(notes[0].time+notes[0].duration,3770);
  assert.deepEqual(await roundTrip(notes),notes);
  const previouslyValid=[{pitch:60,time:3590,duration:120}];
  assert.deepEqual(await roundTrip(previouslyValid),previouslyValid);
});

test('Sparse and invalid MIDI note entries are rejected',async()=>{
  const note={pitch:60,time:0,duration:180};
  const sparse=[note,,note];
  assert.equal(isMidiNotes(sparse),false);
  assert.equal(isStoredProject(projectWithNotes(sparse)),false);
  await assert.rejects(saveProject(projectWithNotes(sparse)),/保存する設定/);
  for(const invalid of [undefined,null,0,{...note,pitch:128},
    {...note,time:NaN},{...note,time:Infinity},{...note,time:-1},
    {...note,duration:Infinity},{...note,duration:-1},{...note,duration:0}]){
    assert.equal(isMidiNotes([note,invalid,note]),false);
  }
});

test('The 20000-note limit accepts dense data and rejects holes or excess',()=>{
  const note={pitch:60,time:0,duration:.5};
  const full=Array(20000).fill(note);
  assert.equal(isMidiNotes(full),true);
  assert.equal(isStoredProject(projectWithNotes(full)),true);
  assert.equal(isMidiNotes(Array(20000)),false);
  assert.equal(isMidiNotes([...full,note]),false);
});

test('MIDI notes longer than one hour are rejected explicitly',()=>{
  assert.throws(()=>readMidi(sustainedNote(3601)),/1時間以内/);
});

test('More than 20000 MIDI notes are rejected instead of truncated',()=>{
  const track=[];
  for(let i=0;i<20001;i++)track.push(0,0x90,60,100,0,0x80,60,0);
  track.push(0,0xff,0x2f,0);
  assert.throws(()=>readMidi(midi(track)),/20000個以内/);
});
