import {useMemo, useRef, useState} from 'react';
import {Player} from '@remotion/player';
import {staticFile} from 'remotion';
import {SignalScene} from './remotion/SignalScene';
import {demoNotes, makeDemoLevels} from './remotion/defaults';
import type {Theme, Note} from './remotion/types';
import {analyzeAudio} from './audio-analysis';
import {readMidi} from './midi';

const FPS=30;
export function App(){
  const [theme,setTheme]=useState<Theme>('arctic');
  const [seconds,setSeconds]=useState(15);
  const [notes,setNotes]=useState<Note[]>(demoNotes);
  const [levels,setLevels]=useState<number[]>(makeDemoLevels());
  const [source,setSource]=useState(staticFile('demo.wav'));
  const [title,setTitle]=useState('ORIGINAL DEMO');
  const [status,setStatus]=useState('デモ音源 / MIDIを使用中');
  const [loading,setLoading]=useState(false);
  const uploaded=useRef<string|null>(null);
  const props=useMemo(()=>({title,theme,audioSrc:source,notes,levels}),[title,theme,source,notes,levels]);
  async function setAudio(file?:File){
    if(!file)return;
    if(!file.type.startsWith('audio/')&&!/\.(wav|mp3|m4a|aac|ogg)$/i.test(file.name)){setStatus('音声ファイルを選んでください');return;}
    setLoading(true);
    try{
      const data=await analyzeAudio(file,seconds,FPS);
      const url=URL.createObjectURL(file);
      if(uploaded.current)URL.revokeObjectURL(uploaded.current);
      uploaded.current=url;
      setSource(url);setTitle(file.name.replace(/\.[^.]+$/,'').slice(0,40));
      setLevels(data);setNotes([]);setStatus('音声を解析しました。音程表示はMIDIが必要です');
    }catch(e){setStatus(e instanceof Error?e.message:'音声の読み込みに失敗しました');}
    finally{setLoading(false);}
  }
  async function setMidi(file?:File){
    if(!file)return;
    if(file.size>5*1024*1024){setStatus('MIDIファイルは5MB以内');return;}
    try{const parsed=readMidi(await file.arrayBuffer());setNotes(parsed);setStatus(String(parsed.length)+'ノートを読み込みました');}
    catch(e){setStatus(e instanceof Error?e.message:'MIDI解析エラー');}
  }
  function reset(){
    if(uploaded.current)URL.revokeObjectURL(uploaded.current);
    uploaded.current=null;
    setSource(staticFile('demo.wav'));setTitle('ORIGINAL DEMO');
    setNotes(demoNotes);setLevels(makeDemoLevels(seconds*FPS));setStatus('デモ音源 / MIDIに戻しました');
  }
  function updateSeconds(n:number){
    setSeconds(n);
    if(!uploaded.current)setLevels(makeDemoLevels(n*FPS));
    else setLevels(prev=>Array.from({length:n*FPS},(_,i)=>prev[i]??0));
  }
  return <div className="layout">
    <aside className="sidebar">
      <div className="brand">OTO <span>/</span> STUDIO <small>REMOTION ENGINE v0.2</small></div>
      <section><span className="eyebrow">01 / SOURCE</span>
        <label className="file-label">音声ファイル <input disabled={loading} type="file" accept="audio/*,.mp3,.wav,.m4a"
          onChange={e=>{void setAudio(e.target.files?.[0]);e.target.value='';}}/></label>
        <label className="file-label">MIDIファイル <input disabled={loading} type="file" accept=".mid,.midi"
          onChange={e=>{void setMidi(e.target.files?.[0]);e.target.value='';}}/></label>
        <button className="muted-button" onClick={reset}>オリジナルのデモに戻す</button>
      </section>
      <section><span className="eyebrow">02 / STYLE</span><p>カラーテーマ</p>
        <div className="choices">{(['arctic','mint','violet'] as const).map(n=><button key={n} className={theme===n?'active':''} onClick={()=>setTheme(n)}>{n.toUpperCase()}</button>)}</div>
        <p>動画の長さ</p><div className="choices">{[8,15,30].map(n=><button key={n} className={seconds===n?'active':''} onClick={()=>updateSeconds(n)}>{n}秒</button>)}</div>
      </section>
      <section><span className="eyebrow">03 / OUTPUT</span>
        <p>1080 × 1920 / 30 FPS</p>
        <p className="hint">ブラウザのプレビューはReactとRemotion Playerで描画します。</p>
        <p className="hint">現段階のRemotion CLI動画書き出しはデモ音源のみ対応。アップロード音源のMP4出力は次の実装対象です。</p>
      </section>
      <div className="sidebar-status" role="status">{loading?'解析中…':status}</div>
    </aside>
    <main className="main">
      <header><span>STUDIO / REMOTION PREVIEW</span><span>FRAME-DRIVEN</span></header>
      <div className="stage-layout"><h1>音楽を、視覚に。</h1>
        <p className="hint">デモ波形は合成パターンです。アップロード音声はブラウザ内でフレーム別RMSを解析します。</p>
        <div className="preview"><Player key={seconds} component={SignalScene} inputProps={props}
          durationInFrames={seconds*FPS} fps={FPS} compositionWidth={1080} compositionHeight={1920}
          controls style={{width:'100%',maxWidth:420,aspectRatio:'9 / 16'}}/></div>
        <p className="small">タイムラインとプレビューは同じRemotionコンポジションを使用します。</p>
      </div>
    </main>
  </div>;
}
