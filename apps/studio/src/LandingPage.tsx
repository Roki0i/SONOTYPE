import {TEMPLATES, type TemplateId} from './templates.mjs';
import './landing.css';

type Props={
  onStart:()=>void;
  onPick:(template:TemplateId)=>void;
};

export function LandingPage({onStart,onPick}:Props){
  return <div className="oto-home">
    <header className="oto-home-nav">
      <a className="oto-home-logo" href="#home" aria-label="SONOTYPE ホーム">
        <span className="oto-home-symbol" aria-hidden="true">≋</span>
        <strong>SONOTYPE</strong>
      </a>
      <nav aria-label="ページ内ナビゲーション">
        <a href="#oto-templates">スタイル</a>
        <button type="button" className="oto-nav-cta" onClick={onStart}>編集する <span aria-hidden="true">↗</span></button>
      </nav>
    </header>

    <main>
      <section className="oto-hero" aria-labelledby="oto-hero-title">
        <div className="oto-hero-copy">
          <p className="oto-hero-eyebrow">MUSIC INTO MOTION</p>
          <h1 id="oto-hero-title">音を、<br/><em>映像に。</em></h1>
          <p className="oto-hero-lead">音楽から、縦型ミュージックビデオを。<br/>ブラウザで編集して、MP4で保存。</p>
          <div className="oto-hero-actions">
            <button type="button" onClick={onStart} className="oto-main-cta">動画をつくる <span aria-hidden="true">↗</span></button>
            <a className="oto-text-link" href="#oto-templates">スタイルを見る <span aria-hidden="true">↓</span></a>
          </div>
          <p className="oto-hero-fine">登録不要 · Shorts / Reels / TikTok</p>
        </div>
        <div className="oto-hero-stage" aria-label="制作イメージ">
          <div className="oto-art-frame" aria-hidden="true">
            <div className="oto-art-inner">
              <div className="oto-art-top"><span>SONOTYPE / 001</span><span>◉ REC</span></div>
              <div className="oto-art-disc"><div className="oto-art-disc-core"/></div>
              <div className="oto-art-title">SOUND<br/>IN MOTION.</div>
              <div className="oto-art-wave">{Array.from({length:20},(_,i)=><i key={i} style={{height:(16+(i*37%76))+'%'}}/>)}</div>
              <div className="oto-art-bottom"><span>YOUR MUSIC, VISUALIZED.</span><span>00:15</span></div>
            </div>
          </div>
          <span className="oto-art-side-note" aria-hidden="true">9:16 / VISUAL STUDIO</span>
        </div>
      </section>

      <div className="oto-specs" aria-label="制作機能">
        <span>5 STYLES</span><span>9:16 VIDEO</span><span>MP4 EXPORT</span><span>PROJECT SAVE</span>
      </div>

      <section className="oto-home-section" id="oto-templates" aria-labelledby="oto-templates-heading">
        <div className="oto-section-header">
          <p className="oto-section-eyebrow">01 / STYLES</p>
          <h2 id="oto-templates-heading">スタイルを選ぶ。</h2>
        </div>
        <div className="oto-home-gallery">
          {TEMPLATES.map((t,i)=><button className={'oto-home-template oto-home-template-'+t.id} key={t.id}
            type="button" onClick={()=>onPick(t.id)} aria-label={t.name+'で編集を始める'}>
            <span className="oto-home-template-art" aria-hidden="true">
              <span className="oto-card-no">{String(i+1).padStart(2,'0')}</span>
              <span className="oto-card-signal">{t.id==='signal'?'▥ ▥ ▥':t.id==='retro-grid'?'▣ ▦':t.id==='lofi-player'?'◎':t.id==='dopa-rush'?'RUSH':'◉'}</span>
              <span className="oto-card-action">↗</span>
            </span>
            <span className="oto-home-template-text"><strong>{t.name}</strong><small>{t.category}</small></span>
          </button>)}
        </div>
      </section>

      <section className="oto-guide" aria-labelledby="oto-guide-heading">
        <div className="oto-section-header">
          <p className="oto-section-eyebrow">02 / CREATE</p>
          <h2 id="oto-guide-heading">3ステップで完成。</h2>
        </div>
        <div className="oto-guide-grid">
          <div><span>01</span><strong>音源を選ぶ</strong></div>
          <div><span>02</span><strong>デザインする</strong></div>
          <div><span>03</span><strong>MP4で保存</strong></div>
        </div>
        <p className="oto-guide-note">編集内容はブラウザ内に保存・復元できます。</p>
        <button className="oto-main-cta" type="button" onClick={onStart}>編集を始める <span aria-hidden="true">↗</span></button>
      </section>
    </main>

    <footer className="oto-home-footer">
      <div><strong>SONOTYPE</strong><p>音源・画像はブラウザで処理。保存データはサイトデータ削除で消える場合があります。外部テレメトリ通信が発生する場合があります。</p></div>
      <a href="https://github.com/Roki0i/oto-signal-studio" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    </footer>
  </div>;
}
