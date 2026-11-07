import {useEffect, useMemo, useRef, useState} from 'react';
import {Player} from '@remotion/player';
import {TemplateScene} from './remotion/TemplateScene';
import {demoNotes, demoAnalysis} from './remotion/defaults';
import {TEMPLATES, type TemplateId} from './templates.mjs';
import {SOCIAL_PRESETS, type SocialId} from './social-presets.mjs';
import {trimAnalysis} from './signal-analysis.mjs';
import type {SceneProps, Theme, Note} from './remotion/types';
import {decodeAudio, analyzeAudioSegment} from './audio-analysis';
import {readMidi} from './midi';
import {LandingPage} from './LandingPage';
import {saveProject,loadProject,clearProject} from './project-storage';

const FPS=30;
const THEMES:Theme[]=['arctic','mint','violet'];
const MAX_COVER=5*1024*1024;
const IS_PAGES=import.meta.env.VITE_PAGES_BUILD==='true';
const DEMO_AUDIO_URL=import.meta.env.BASE_URL+'demo.wav';
const DEMO_DURATION=16;
const formatSeconds=(seconds:number)=>{
  const whole=Math.floor(seconds);
  return String(Math.floor(whole/60))+':'+String(whole%60).padStart(2,'0');
};

export function App(){
  const [page,setPage]=useState<'home'|'editor'>(()=>
    window.location.hash==='#editor'?'editor':'home');
  const [templateId,setTemplateId]=useState<TemplateId>('retro-grid');
  const [theme,setTheme]=useState<Theme>('arctic');
  const [seconds,setSeconds]=useState(15);
  const [startFrame,setStartFrame]=useState(0);
  const [sourceDuration,setSourceDuration]=useState(DEMO_DURATION);
  const [decodedAudio,setDecodedAudio]=useState<AudioBuffer|null>(null);
  const [platform,setPlatform]=useState<SocialId>('shorts');
  const [showSafeArea,setShowSafeArea]=useState(false);
  const [previewWidth,setPreviewWidth]=useState(460);
  const [settingsTab,setSettingsTab]=useState<'content'|'style'>('content');
  const [notes,setNotes]=useState<Note[]>(demoNotes);
  const [source,setSource]=useState(DEMO_AUDIO_URL);
  const [title,setTitle]=useState('ORIGINAL DEMO');
  const [artist,setArtist]=useState('Your artist');
  const [coverSrc,setCoverSrc]=useState('');
  const [status,setStatus]=useState('デモ音源を使用中。テンプレートと文字を編集できます。');
  const [loading,setLoading]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [saving,setSaving]=useState(false);
  const uploaded=useRef<string|null>(null);
  const coverUrl=useRef<string|null>(null);
  const audioFile=useRef<File|null>(null);
  const coverFile=useRef<File|null>(null);
  useEffect(()=>{
    const sync=()=>setPage(window.location.hash==='#editor'?'editor':'home');
    window.addEventListener('hashchange',sync);
    return ()=>window.removeEventListener('hashchange',sync);
  },[]);
  const goTo=(view:'home'|'editor')=>{
    window.location.hash=view;
    setPage(view);
    window.scrollTo(0,0);
  };
  useEffect(()=>()=> {
    if(uploaded.current)URL.revokeObjectURL(uploaded.current);
    if(coverUrl.current)URL.revokeObjectURL(coverUrl.current);
  },[]);
  // Slider steps are one second (30 frames); limit to a complete selected interval.
  // If the audio is shorter than the chosen output duration, pad the remainder with silence.
  const maxStartFrame=Math.max(0,Math.floor(sourceDuration-seconds)*FPS);
  const selectedStartFrame=Math.min(startFrame,maxStartFrame);
  const clipStartSeconds=selectedStartFrame/FPS;
  const frames=useMemo(()=>
    decodedAudio
      ? analyzeAudioSegment(decodedAudio,seconds,selectedStartFrame)
      : trimAnalysis(demoAnalysis,seconds*FPS,selectedStartFrame),
    [decodedAudio,seconds,selectedStartFrame]);
  const clipNotes=useMemo(()=>notes.flatMap(note=>{
    const first=Math.max(0,note.time-clipStartSeconds);
    const last=Math.min(seconds,note.time+note.duration-clipStartSeconds);
    return last>first?[{...note,time:first,duration:last-first}]:[];
  }),[notes,clipStartSeconds,seconds]);
  const selectedPlatform=SOCIAL_PRESETS.find(p=>p.id===platform)??SOCIAL_PRESETS[0];
  const props=useMemo<SceneProps>(()=>({
    title:title.trim()||'UNTITLED',artist,templateId,theme,audioSrc:source,
    startFrame:selectedStartFrame,coverSrc,notes:clipNotes,...frames
  }),[title,artist,templateId,theme,source,selectedStartFrame,coverSrc,clipNotes,frames]);

  async function setAudio(file?:File){
    if(!file)return;
    if(file.size>25*1024*1024||!/\.(wav|mp3|m4a|aac|ogg)$/i.test(file.name)){
      setStatus('音声はWAV / MP3 / M4A / AAC / OGG、25MiB以内にしてください');return;
    }
    setLoading(true);
    try{
      const decoded=await decodeAudio(file);
      // Verify the decoded PCM and initial clip before updating the active audio.
      analyzeAudioSegment(decoded,seconds,0);
      const url=URL.createObjectURL(file);
      if(uploaded.current)URL.revokeObjectURL(uploaded.current);
      uploaded.current=url;
      audioFile.current=file;
      setSource(url);
      setDecodedAudio(decoded);
      setSourceDuration(decoded.duration);
      setStartFrame(0);
      setTitle(file.name.replace(/\.[^.]+$/,'').replace(/[\x00-\x1f]/g,' ').slice(0,64));
      setNotes([]);
      setStatus('音声を解析しました。MIDIを入れると音程も表示できます。');
    }catch(e){setStatus(e instanceof Error?e.message:'音声解析エラー');}
    finally{setLoading(false);}
  }
  function setCover(file?:File){
    if(!file)return;
    if(file.size>MAX_COVER|| !/\.(png|jpe?g|webp)$/i.test(file.name) ||
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
    setSource(DEMO_AUDIO_URL);setCoverSrc('');setTitle('ORIGINAL DEMO');setArtist('Your artist');
    setNotes(demoNotes);setDecodedAudio(null);setSourceDuration(DEMO_DURATION);setStartFrame(0);
    setStatus('デモ音源と既定のジャケットに戻しました');
  }
  async function exportMp4(){
    if(exporting||loading)return;
    setExporting(true);setStatus('MP4を作成しています。ウィンドウを閉じずにお待ちください。');
    try{
      let video:Blob;
      if(IS_PAGES){
        // GitHub Pages has no server; render and encode entirely in this browser.
        const {canRenderMediaOnWeb,renderMediaOnWeb}=await import('@remotion/web-renderer');
        const support=await canRenderMediaOnWeb({
          container:'mp4',videoCodec:'h264',audioCodec:'aac',width:1080,height:1920,
          outputTarget:'arraybuffer'
        });
        if(!support.canRender){
          throw Error('このブラウザでは音声付きMP4を書き出せません: '+
            support.issues.map(issue=>issue.message).join(' / '));
        }
        const {getBlob}=await renderMediaOnWeb({
          composition:{id:'OTO-Web-Export',component:TemplateScene,
            width:1080,height:1920,fps:FPS,durationInFrames:seconds*FPS,defaultProps:props},
          inputProps:props,
          container:'mp4',videoCodec:'h264',audioCodec:'aac',
          outputTarget:'arraybuffer',
          onProgress:({progress})=>setStatus('ブラウザでMP4を生成中: '+Math.round(progress*100)+'%')
        });
        video=await getBlob();
      }else{
        // Keep the existing trusted loopback workflow for Windows/Mac local users.
        const file=audioFile.current??new File([await(await fetch(DEMO_AUDIO_URL)).blob()],
          'demo.wav',{type:'audio/wav'});
        const form=new FormData();
        form.append('audio',file);
        if(coverFile.current)form.append('cover',coverFile.current);
        form.append('props',JSON.stringify({
          title:props.title,artist:props.artist,templateId:props.templateId,
          theme,seconds,startFrame:selectedStartFrame,notes:clipNotes,...frames
        }));
        const response=await fetch('/api/export',{method:'POST',body:form});
        if(!response.ok){
          const error=await response.json().catch(()=>({error:'書き出しに失敗しました'}));
          throw Error(typeof error.error==='string'?error.error:'書き出しに失敗しました');
        }
        video=await response.blob();
      }
      if(video.size<1000)throw Error('空の動画が生成されました');
      const url=URL.createObjectURL(video);
      const a=document.createElement('a');
      a.href=url;a.download='oto-'+selectedPlatform.filename+'-'+Date.now()+'.mp4';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      setStatus('MP4を保存しました（'+(video.size/1048576).toFixed(1)+' MiB）');
    }catch(e){setStatus(e instanceof Error?e.message:'書き出しに失敗しました');}
    finally{setExporting(false);}
  }


  async function saveCurrentProject(){
    if(loading||exporting||saving)return;
    setSaving(true);
    try{
      await saveProject({
        version:1,updatedAt:Date.now(),
        settings:{title,artist,templateId,theme,
          seconds:seconds as 8|15|30,platform,startFrame:selectedStartFrame},
        notes,audio:audioFile.current,cover:coverFile.current
      });
      setStatus('音源・画像と編集設定をこのブラウザに保存しました。');
    }catch(error){
      setStatus(error instanceof Error?'保存に失敗しました: '+error.message:'保存に失敗しました');
    }finally{setSaving(false);}
  }
  async function restoreSavedProject(){
    if(loading||exporting||saving)return;
    setSaving(true);
    setLoading(true);
    try{
      const saved=await loadProject();
      if(!saved){setStatus('保存済みプロジェクトがありません。');return;}
      const decoded=saved.audio?await decodeAudio(saved.audio):null;
      const newSource=saved.audio?URL.createObjectURL(saved.audio):DEMO_AUDIO_URL;
      const newCover=saved.cover?URL.createObjectURL(saved.cover):'';
      if(uploaded.current)URL.revokeObjectURL(uploaded.current);
      if(coverUrl.current)URL.revokeObjectURL(coverUrl.current);
      uploaded.current=saved.audio?newSource:null;
      coverUrl.current=saved.cover?newCover:null;
      audioFile.current=saved.audio;
      coverFile.current=saved.cover;
      setSource(newSource);
      setCoverSrc(newCover);
      setDecodedAudio(decoded);
      setSourceDuration(decoded?.duration??DEMO_DURATION);
      setNotes(saved.notes);
      setTitle(saved.settings.title);
      setArtist(saved.settings.artist);
      setTemplateId(saved.settings.templateId);
      setTheme(saved.settings.theme);
      setSeconds(saved.settings.seconds);
      setPlatform(saved.settings.platform);
      setStartFrame(saved.settings.startFrame);
      setStatus('音源・画像・編集内容を復元しました。');
    }catch(error){
      setStatus(error instanceof Error?'復元に失敗しました: '+error.message:'復元に失敗しました');
    }finally{setLoading(false);setSaving(false);}
  }
  async function removeSavedProject(){
    if(loading||exporting||saving)return;
    if(!window.confirm('このブラウザに保存したOTOプロジェクトを削除しますか？編集画面の内容はそのまま残ります。'))return;
    setSaving(true);
    try{await clearProject();setStatus('このブラウザの保存データを削除しました。');}
    catch(error){setStatus(error instanceof Error?error.message:'削除に失敗しました');}
    finally{setSaving(false);}
  }
  if(page==='home')return <LandingPage onStart={()=>goTo('editor')}
    onPick={id=>{setTemplateId(id);goTo('editor');}}/>;

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
              <span className="thumb-emblem">{entry.id==='signal'?'▥▥▥':entry.id==='retro-grid'?'▣ ▦':entry.id==='lofi-player'?'◎':entry.id==='dopa-rush'?'▣▰':'◉'}</span>
              <span className="thumb-barlines"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span>
            </div>
            <span className="template-card-meta">
              <strong>{entry.name}</strong>
              <span>{entry.category}</span>
            </span>
            <span className="template-description">{entry.description}</span>
          </button>)}
      </div>
      <div className="aside-foot">{IS_PAGES?'WEB EDITION':'LOCAL EDITION'} <span>v1.0</span></div>
    </aside>

    <main className="editor-stage">
      <header className="editor-topbar">
        <div><button className="back-to-home" type="button" onClick={()=>goTo('home')}>← ホームへ</button>
          <span className="eyebrow">MUSIC VISUAL CREATOR</span><h1>音楽を、見せる。</h1></div>
        <span className="workspace-status"><span className="status-dot"/>{IS_PAGES?'ブラウザ制作':'ローカル制作'}</span>
      </header>
      <div className="canvas-area">

        <div className="canvas-toolbar">
          <span><b>プレビュー</b> / {TEMPLATES.find(t=>t.id===templateId)?.name}</span>
          <div className="canvas-display-options">
            <span className="canvas-format">9:16 <span className="toolbar-dot">•</span> 1080 × 1920 <span className="toolbar-dot">•</span> 30 FPS</span>
            <div className="preview-zoom" role="group" aria-label="プレビューサイズ">
              {([{size:340,label:'小'},{size:460,label:'標準'},{size:550,label:'大'}] as const).map(option=>
                <button key={option.size} type="button" className="preview-zoom-button"
                  aria-pressed={previewWidth===option.size}
                  onClick={()=>setPreviewWidth(option.size)}>{option.label}</button>)}
            </div>
            <button type="button" className="guide-toggle" aria-pressed={showSafeArea}
              onClick={()=>setShowSafeArea(value=>!value)}>{showSafeArea?'ガイドを隠す':'文字位置ガイド'}</button>
          </div>
        </div>
        <div className="preview-shell">
          <div className="player-with-guide" style={{maxWidth:previewWidth}}>
            <Player key={seconds+'-'+selectedStartFrame} component={TemplateScene} inputProps={props}
              durationInFrames={seconds*FPS} fps={FPS} compositionWidth={1080} compositionHeight={1920}
              controls style={{width:'100%',aspectRatio:'9 / 16'}}/>
            {showSafeArea?<div className="safe-zone-guide" aria-hidden="true" style={{
              top:(selectedPlatform.safe.top*100)+'%',
              right:(selectedPlatform.safe.right*100)+'%',
              bottom:(selectedPlatform.safe.bottom*100)+'%',
              left:(selectedPlatform.safe.left*100)+'%'
            }}><span>文字位置の目安</span></div>:null}
          </div>
        </div>
        <p className="editor-caption">テンプレート・文字・配色はすぐ反映。ガイド枠はMP4に含まれません。</p>
      </div>
    </main>

    <aside className="settings-sidebar">
      <div className="settings-header"><span className="eyebrow">STEP 02 — MAKE IT YOURS</span><h2>カスタマイズ</h2></div>
      <div className="project-actions" aria-label="ローカルプロジェクト">
        <button type="button" onClick={()=>void saveCurrentProject()} disabled={loading||exporting||saving}>保存</button>
        <button type="button" onClick={()=>void restoreSavedProject()} disabled={loading||exporting||saving}>復元</button>
        <button className="project-clear" type="button" onClick={()=>void removeSavedProject()}
          disabled={loading||exporting||saving} aria-label="保存済みのプロジェクトを削除">削除</button>
        <p>音源・ジャケットもこのブラウザ内に保存。別の端末には同期されません。</p>
      </div>
      <div className="settings-tabs" role="group" aria-label="設定カテゴリー">
        <button type="button" className={'settings-tab'+(settingsTab==='content'?' active':'')}
          aria-pressed={settingsTab==='content'} aria-controls="settings-content"
          onClick={()=>setSettingsTab('content')}>素材・文字</button>
        <button type="button" className={'settings-tab'+(settingsTab==='style'?' active':'')}
          aria-pressed={settingsTab==='style'} aria-controls="settings-style"
          onClick={()=>setSettingsTab('style')}>デザイン・投稿</button>
      </div>
      <div className="settings-scroll">
        <div id="settings-content" hidden={settingsTab!=='content'}>
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
      <section className="settings-section clip-section">
        <h3>曲の使用区間</h3>
        <div className="clip-positions">
          <span>開始 <strong>{formatSeconds(clipStartSeconds)}</strong></span>
          <span>終了 <strong>{formatSeconds(Math.min(sourceDuration,clipStartSeconds+seconds))}</strong></span>
        </div>
        <input id="clip-start" aria-label="切り出し開始位置" className="clip-range" type="range"
          min={0} max={maxStartFrame} step={FPS} value={selectedStartFrame}
          disabled={loading||exporting||maxStartFrame===0}
          onChange={event=>setStartFrame(Number(event.target.value))}/>
        <div className="clip-ruler"><span>0:00</span><span>音源 {formatSeconds(sourceDuration)}</span></div>
        <p className="setting-note">
          {maxStartFrame===0
            ? (sourceDuration<seconds?'音源が短いため、残りは無音になります。':'この動画尺では開始位置を変更できません。')
            : '1秒単位で開始位置を選択。動画と波形・MIDIを同時に切り出します。'}
        </p>
      </section>
      <section className="settings-section">
        <h3>文字の編集</h3>
        <label className="field-label" htmlFor="song-title">曲名</label>
        <input id="song-title" className="text-field" value={title} maxLength={64} onChange={e=>setTitle(e.target.value)}/>
        <label className="field-label" htmlFor="artist-name">アーティスト名</label>
        <input id="artist-name" className="text-field" value={artist} maxLength={64} onChange={e=>setArtist(e.target.value)}/>
      </section>
        </div>
        <div id="settings-style" hidden={settingsTab!=='style'}>
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
        <h3>投稿先プリセット</h3>
        <div className="platform-options" role="group" aria-label="投稿プラットフォーム">
          {SOCIAL_PRESETS.map(item=><button key={item.id} type="button"
            className={'platform-option'+(platform===item.id?' active':'')}
            aria-pressed={platform===item.id} onClick={()=>setPlatform(item.id)}>
            {item.name}
          </button>)}
        </div>
        <p className="setting-note">どの投稿先も9:16の同じMP4です。安全領域の表示は目安で、アプリのUIによって変わります。</p>
      </section>
      <section className="settings-section">
        <h3>動画の長さ</h3>
        <div className="length-options" role="group" aria-label="動画の長さ">
          {[8,15,30].map(n=><button key={n} type="button" aria-pressed={seconds===n}
            className={seconds===n?'active':''} onClick={()=>setSeconds(n)}>{n}秒</button>)}
        </div>
      </section>
        </div>
      </div>
      <div className="export-panel">
        <div className="export-head"><span className="eyebrow">STEP 03 — EXPORT</span>
          <span className="export-format">{selectedPlatform.name} · {formatSeconds(clipStartSeconds)}から{seconds}秒 · MP4</span></div>
        <button className="export-button" type="button" disabled={loading||exporting}
          onClick={()=>void exportMp4()}>{exporting?'書き出し中…':'MP4を書き出す'} <span aria-hidden="true">↗</span></button>
        <button type="button" className="reset-button" onClick={resetDemo}
          disabled={loading||exporting}>デモに戻す</button>
        <p role="status" className="status-message">{loading?'音声を解析しています…':status}</p>
        <p className="privacy-note">{IS_PAGES?'音源・画像は動画生成サーバーへ送信しません。Remotionの利用状況テレメトリが送信される場合があります。':'音源・画像はこのPC内で処理します。外部サーバーには送信しません。'}</p>
      </div>
    </aside>
  </div>;
}
