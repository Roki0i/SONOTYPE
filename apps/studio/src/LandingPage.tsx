import {TEMPLATES, type TemplateId} from './templates.mjs';
import './landing.css';

type Props={
  onStart:()=>void;
  onPick:(template:TemplateId)=>void;
};

// The record and its escaping grooves are vector artwork, not a rendered video preview.
function GrooveArtwork(){
  return <div className="sono-groove-art" role="img" aria-label="右のレコードの溝が曲線になり、左のSONOTYPEの文字へつながるアートワーク">
    <svg viewBox="0 0 940 680" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="sono-vinyl-surface" cx="48%" cy="44%" r="65%">
          <stop offset="0%" stopColor="#36332d"/>
          <stop offset="32%" stopColor="#1e201d"/>
          <stop offset="72%" stopColor="#111310"/>
          <stop offset="94%" stopColor="#2b2a25"/>
          <stop offset="100%" stopColor="#0b0c0a"/>
        </radialGradient>
        <linearGradient id="sono-groove-ink" x1="100%" y1="0%" x2="0%" y2="65%">
          <stop offset="0%" stopColor="#b59a7a"/>
          <stop offset="48%" stopColor="#d0b89e"/>
          <stop offset="100%" stopColor="#d3c4ad"/>
        </linearGradient>
      </defs>
      <g className="sono-record">
        <circle cx="755" cy="326" r="312" fill="url(#sono-vinyl-surface)"/>
        <circle cx="755" cy="326" r="311" fill="none" stroke="#7d766a" strokeWidth="1"/>
        {Array.from({length:31},(_,i)=><circle key={i} cx="755" cy="326"
          r={122+i*5.8} fill="none"
          stroke={i%5===0?'#c4a78a':'#807a6e'}
          strokeWidth={i%5===0?0.9:0.48} opacity={i%5===0?0.5:0.27}/>)}
        <circle cx="755" cy="326" r="102" fill="#c6b8a1" stroke="#796f60" strokeWidth="1"/>
        <circle cx="755" cy="326" r="88" fill="none" stroke="#7f7566" strokeWidth=".6"/>
        <text x="755" y="305" textAnchor="middle" className="sono-label-name">SONOTYPE</text>
        <text x="755" y="357" textAnchor="middle" className="sono-label-number">33 ⅓ / VISUAL STUDIES</text>
        <circle cx="755" cy="326" r="7" fill="#161714"/>
      </g>
      <g className="sono-groove-trails" fill="none" stroke="url(#sono-groove-ink)" strokeWidth="1">
        {Array.from({length:13},(_,i)=>
          <path key={i} d={`M ${534+i*3.4} ${110+i*10}
          C ${438+i*2} ${124+i*8}, ${428-i*3} ${180+i*10}, ${333-i*2} ${205+i*10}
          S ${184+i*2} ${273+i*9}, ${65} ${330+i*8}`}
          opacity={0.18+(i%4)*.09}/>)}
      </g>
      <text x="52" y="445" className="sono-groove-lettering">SONOTYPE</text>
      <path d="M 54 479 H 344" fill="none" stroke="#b49b7f" strokeWidth="1" opacity=".4"/>
      <text x="55" y="505" className="sono-groove-caption">THE SHAPE OF SOUND</text>
    </svg>
  </div>;
}

export function LandingPage({onStart,onPick}:Props){
  return <div className="oto-home">
    <header className="oto-home-nav">
      <a className="oto-home-logo" href="#home" aria-label="SONOTYPE ホーム">SONOTYPE</a>
      <nav aria-label="ページ内ナビゲーション">
        <a href="#oto-templates">スタイル</a>
        <button type="button" className="oto-nav-cta" onClick={onStart}>編集を始める <span aria-hidden="true">↗</span></button>
      </nav>
    </header>

    <main>
      <section className="oto-hero" aria-labelledby="oto-hero-title">
        <div className="oto-hero-copy">
          <p className="oto-hero-eyebrow">SOUND / IMAGE / FORM</p>
          <h1 id="oto-hero-title">音を、<br/><em>映像に。</em></h1>
          <p className="oto-hero-lead">音楽から、あなただけの映像を。<br/>ブラウザで編集し、MP4で保存。</p>
          <div className="oto-hero-actions">
            <button type="button" onClick={onStart} className="oto-main-cta">動画をつくる <span aria-hidden="true">↗</span></button>
            <a className="oto-text-link" href="#oto-templates">スタイルを見る <span aria-hidden="true">↓</span></a>
          </div>
          <p className="oto-hero-fine">登録不要 / SHORTS · REELS · TIKTOK</p>
        </div>
        <div className="oto-hero-stage"><GrooveArtwork/></div>
      </section>

      <div className="oto-specs" aria-label="制作できること">
        <span>5つのスタイル</span><span>縦型 9:16</span><span>MP4出力</span><span>ブラウザ内保存</span>
      </div>

      <section className="oto-home-section" id="oto-templates" aria-labelledby="oto-templates-heading">
        <div className="oto-section-header">
          <p className="oto-section-eyebrow">01 / ART DIRECTION</p>
          <h2 id="oto-templates-heading">スタイルを選ぶ。</h2>
        </div>
        <div className="oto-home-gallery">
          {TEMPLATES.map((t,i)=><button className={'oto-home-template oto-home-template-'+t.id} key={t.id}
            type="button" onClick={()=>onPick(t.id)} aria-label={t.name+'で編集を始める'}>
            <span className="oto-home-template-art" aria-hidden="true">
              <span className="oto-card-no">{String(i+1).padStart(2,'0')} / 05</span>
              <span className="oto-card-signal">{t.id==='signal'?'▥':t.id==='retro-grid'?'R/G':t.id==='lofi-player'?'◉':t.id==='dopa-rush'?'RUSH':'○'}</span>
              <span className="oto-card-action">↗</span>
            </span>
            <span className="oto-home-template-text"><strong>{t.name}</strong><small>{t.category}</small></span>
          </button>)}
        </div>
      </section>

      <section className="oto-guide" aria-labelledby="oto-guide-heading">
        <div className="oto-section-header">
          <p className="oto-section-eyebrow">02 / PROCESS</p>
          <h2 id="oto-guide-heading">音源から、作品へ。</h2>
        </div>
        <ol className="oto-guide-steps">
          <li><span>01</span><strong>音源を選ぶ</strong></li>
          <li><span>02</span><strong>デザインする</strong></li>
          <li><span>03</span><strong>MP4で保存</strong></li>
        </ol>
        <div className="oto-guide-end">
          <p>編集内容は、このブラウザに保存・復元できます。</p>
          <button className="oto-main-cta" type="button" onClick={onStart}>編集を始める <span aria-hidden="true">↗</span></button>
        </div>
      </section>
    </main>

    <footer className="oto-home-footer">
      <div><strong>SONOTYPE</strong><p>音源・画像はブラウザで処理。保存データはサイトデータ削除で消える場合があります。外部テレメトリ通信が発生する場合があります。</p></div>
      <a href="https://github.com/Roki0i/oto-signal-studio" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    </footer>
  </div>;
}
