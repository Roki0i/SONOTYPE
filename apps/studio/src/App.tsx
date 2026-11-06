import {useEffect, useMemo, useRef, useState} from 'react';
import {Player} from '@remotion/player';
import {staticFile} from 'remotion';
import {TemplateScene} from './remotion/TemplateScene';
import {demoNotes, demoAnalysis} from './remotion/defaults';
import {TEMPLATES, type TemplateId} from './templates.mjs';
import {trimAnalysis, type AudioAnalysis} from './signal-analysis.mjs';
import type {SceneProps, Theme, Note} from './remotion/types';
import {analyzeAudio} from './audio-analysis';
import {readMidi} from './midi';

const FPS=30;
const THEMES:Theme[]=['arctic','mint','violet'];
const MAX_COVER=5*1024*1024;

export function App(){
  const [templateId,setTemplateId]=useState<TemplateId>('retro-grid');
  const [theme,setTheme]=useState<Theme>('arctic');
  const [seconds,setSeconds]=useState(15);
  const [notes,setNotes]=useState<Note[]>(demoNotes);
  const [analysis,setAnalysis]=useState<AudioAnalysis>(demoAnalysis);
  const [source,setSource]=useState(staticFile('demo.wav'));
  const [title,setTitle]=useState('ORIGINAL DEMO');
  const [artist,setArtist]=useState('Your artist');
  const [coverSrc,setCoverSrc]=useState('');
  const [status,setStatus]=useState('デモ音源を使用中。テンプレートと文字を編集できます。');
  const [loading,setLoading]=useState(false);
  const [exporting,setExporting]=useState(false);
  const uploaded=useRef<string|null>(null);
  const coverUrl=useRef<string|null>(null);
  const audioFile=useRef<File|null>(null);
  const coverFile=useRef<File|null>(null);
  useEffect(()=>()=> {
    if(uploaded.current)URL.revokeObjectURL(uploaded.current);
    if(coverUrl.current)URL.revokeObjectURL(coverUrl.current);
  },[]);
  const frames=useMemo(()=>trimAnalysis(analysis,seconds*FPS),[analysis,seconds]);
  const props=useMemo<SceneProps>(()=>({
    title:title.trim()||'UNTITLED',artist,templateId,theme,audioSrc:source,
    coverSrc,notes,...frames
  }),[title,artist,templateId,theme,source,coverSrc,notes,frames]);

  async function setAudio(file?:File){
    if(!file)return;
    if(file.size>25*1024*1024||!/\\.(wav|mp3|m4a|aac|ogg)$/i.test(file.name)){
      setStatus('音声はWAV / MP3 / M4A / AAC / OGG、25MiB以内にしてください');return;
    }
    setLoading(true);
    try{
      const measured=await analyzeAudio(file,30);
      const url=URL.createObjectURL(file);
      if(uploaded.current)URL.revokeObjectURL(uploaded.current);
      uploaded.current=url;
      audioFile.current=file;
      setSource(url);
      setTitle(file.name.replace(/\\.[^.]+$/,'').replace(/[\\x00-\\x1f]/g,' ').slice(0,64));
      setAnalysis(measured);
      setNotes([]);
      setStatus('音声を解析しました。MIDIを入れると音程も表示できます。');
    }catch(e){setStatus(e instanceof Error?e.message:'音声解析エラー');}
    finally{setLoading(false);}
  }
  function setCover(file?:File){
    if(!file)return;
    if(file.size>MAX_COVER|| !/\\.(png|jpe?g|webp)$/i.test(file.name) ||
      !['image/png','image/jpeg','image/webp'].includes(file.type)){
      setStatus('ジャケット画像はPNG / JPEG / WebP、5MiB以内にしてください');return;
    }
    const url=URL.createObjectURL(file);
    if(coverUrl.current)URL.revokeObjectURL(coverUrl.current);
    coverUrl.current=url;
    coverFile.current=file;
    setCoverSrc(url);
    setStatus('ジャケット画像を設定しました');
  }
  async function setMidi(file?:File){
    if(!file)return;
    if(file.size>5*1024*1024){setStatus('MIDIは5MiB以内にしてください');return;}
    try{const parsed=readMidi(await file.arrayBuffer());
      setNotes(parsed);setStatus(parsed.length+'個のMIDIノートを読み込みました');
    }catch(e){setStatus(e instanceof Error?e.message:'MIDI解析エラー');}
  }
  function resetDemo(){
    if(uploaded.current)URL.revokeObjectURL(uploaded.current);
    if(coverUrl.current)URL.revokeObjectURL(coverUrl.current);
    uploaded.current=null;coverUrl.current=null;audioFile.current=null;coverFile.current=null;
    setSource(staticFile('demo.wav'));setCoverSrc('');setTitle('ORIGINAL DEMO');setArtist('Your artist');
    setNotes(demoNotes);setAnalysis(demoAnalysis);
    setStatus('デモ音源と既定のジャケットに戻しました');
  }
  async function exportMp4(){
    if(exporting||loading)return;
    setExporting(true);setStatus('MP4を作成しています。ウィンドウを閉じずにお待ちください。');
    try{
      const file=audioFile.current??new File([await(await fetch(staticFile('demo.wav'))).blob()],
        'demo.wav',{type:'audio/wav'});
      const form=new FormData();
      form.append('audio',file);
      if(coverFile.current)form.append('cover',coverFile.current);
      form.append('props',JSON.stringify({
        title:props.title,artist:props.artist,templateId:props.templateId,
        theme,seconds,notes,...frames
      }));
      const response=await fetch('/api/export',{method:'POST',body:form});
      if(!response.ok){
        const error=await response.json().catch(()=>({error:'書き出しに失敗しました'}));
        throw Error(typeof error.error==='string'?error.error:'書き出しに失敗しました');
      }
      const video=await response.blob();
      if(video.size<1000)throw Error('空の動画が生成されました');
      const url=URL.createObjectURL(video);
      const a=document.createElement('a');
      a.href=url;a.download='oto-'+Date.now()+'.mp4';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      setStatus('MP4を保存しました（'+(video.size/1048576).toFixed(1)+' MiB）');
    }catch(e){setStatus(e instanceof Error?e.message:'書き出しに失敗しました');}
    finally{setExporting(false);}
  }

  return <div className="app-shell">
    <aside className="templates-sidebar">
      <div className="brand">
        <div className="brand-mark">O<span>∿</span></div>
        <div><strong>OTO STUDIO</strong><small>CREATE MUSIC VISUALS</small></div>
      </div>
      <div className="sidebar-intro">
        <span className="eyebrow">STEP 01 — PICK A LOOK</span>
        <h2>テンプレート</h2>
        <p>音楽の雰囲気に合わせてデザインを選択。</p>
      </div>
      <div className="template-gallery" aria-label="テンプレート一覧">
        {TEMPLATES.map((entry,i)=>
          <button key={entry.id} type="button"
            onClick={()=>setTemplateId(entry.id)} aria-pressed={templateId===entry.id}
            className={'template-card'+(templateId===entry.id?' selected':'')}>
            <div className={'template-thumbnail thumb-'+entry.id}>
              <span className="thumb-kicker">{String(i+1).padStart(2,'0')} / OTO</span>
              <span className="thumb-emblem">{entry.id==='signal'?'▥▥▥':entry.id==='retro-grid'?'▣ ▦':entry.id==='lofi-player'?'◎':'◉'}</span>
              <span className="thumb-barlines"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span>
            </div>
            <span className="template-card-meta">
              <strong>{entry.name}</strong>
              <span>{entry.category}</span>
            </span>
            <span className="template-description">{entry.description}</span>
          </button>)}
      </div>
      <div className="aside-foot">LOCAL EDITION <span>v0.5</span></div>
    </aside>

    <main className="editor-stage">
      <header className="editor-topbar">
        <div><span className="eyebrow">MUSIC VISUAL CREATOR</span><h1>音楽を、見せる。</h1></div>
        <span className="workspace-status"><span className="status-dot"/>ローカル制作</span>
      </header>
      <div className="canvas-area">
        <div className="canvas-toolbar">
          <span><b>プレビュー</b> / {TEMPLATES.find(t=>t.id===templateId)?.name}</span>
          <span>9:16 <span className="toolbar-dot">•</span> 1080 × 1920 <span className="toolbar-dot">•</span> 30 FPS</span>
        </div>
        <div className="preview-shell">
          <Player key={seconds} component={TemplateScene} inputProps={props}
            durationInFrames={seconds*FPS} fps={FPS} compositionWidth={1080} compositionHeight={1920}
            controls style={{width:'100%',maxWidth:365,aspectRatio:'9 / 16'}}/>
        </div>
        <p className="editor-caption">テンプレート・文字・配色はすぐにプレビューへ反映されます。</p>
      </div>
    </main>

    <aside className="settings-sidebar">
      <div className="settings-header"><span className="eyebrow">STEP 02 — MAKE IT YOURS</span><h2>カスタマイズ</h2></div>
      <section className="settings-section">
        <h3>音源とジャケット</h3>
        <label className="upload-input">
          <span>音楽ファイル</span><span className="upload-name">{audioFile.current?.name??'デモ音源'}</span>
          <input aria-label="音楽ファイルを選択" disabled={loading||exporting} type="file"
            accept=".wav,.mp3,.m4a,.aac,.ogg,audio/*"
            onChange={e=>{void setAudio(e.target.files?.[0]);e.target.value='';}}/>
        </label>
        <label className="upload-input">
          <span>ジャケット画像 <em>任意</em></span>
          <span className="upload-name">{coverFile.current?.name??'未設定（既定のアートを使用）'}</span>
          <input aria-label="ジャケット画像を選択" disabled={loading||exporting} type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={e=>{setCover(e.target.files?.[0]);e.target.value='';}}/>
        </label>
        <label className="upload-input">
          <span>MIDIファイル <em>任意</em></span><span className="upload-name">{notes.length}ノート</span>
          <input aria-label="MIDIファイルを選択" disabled={loading||exporting} type="file" accept=".mid,.midi"
            onChange={e=>{void setMidi(e.target.files?.[0]);e.target.value='';}}/>
        </label>
      </section>
      <section className="settings-section">
        <h3>文字の編集</h3>
        <label className="field-label" htmlFor="song-title">曲名</label>
        <input id="song-title" className="text-field" value={title} maxLength={64} onChange={e=>setTitle(e.target.value)}/>
        <label className="field-label" htmlFor="artist-name">アーティスト名</label>
        <input id="artist-name" className="text-field" value={artist} maxLength={64} onChange={e=>setArtist(e.target.value)}/>
      </section>
      <section className="settings-section">
        <h3>カラー</h3>
        <div className="theme-swatches" role="group" aria-label="カラーテーマ">
          {THEMES.map(color=><button type="button" key={color}
            className={'theme-option theme-'+color+(theme===color?' active':'')}
            aria-pressed={theme===color} onClick={()=>setTheme(color)}>
            <span className="swatch-preview"/><span>{color}</span>
          </button>)}
        </div>
      </section>
      <section className="settings-section">
        <h3>動画の長さ</h3>
        <div className="length-options" role="group" aria-label="動画の長さ">
          {[8,15,30].map(n=><button key={n} type="button" aria-pressed={seconds===n}
            className={seconds===n?'active':''} onClick={()=>setSeconds(n)}>{n}秒</button>)}
        </div>
      </section>
      <div className="export-panel">
        <div className="export-head"><span className="eyebrow">STEP 03 — EXPORT</span>
          <span className="export-format">MP4 · H.264/AAC</span></div>
        <button className="export-button" type="button" disabled={loading||exporting}
          onClick={()=>void exportMp4()}>{exporting?'書き出し中…':'MP4を書き出す'} <span aria-hidden="true">↗</span></button>
        <button type="button" className="reset-button" onClick={resetDemo}
          disabled={loading||exporting}>デモに戻す</button>
        <p role="status" className="status-message">{loading?'音声を解析しています…':status}</p>
        <p className="privacy-note">音源・画像はこのPC内で処理します。外部サーバーには送信しません。</p>
      </div>
    </aside>
  </div>;
}
