import {TEMPLATES, type TemplateId} from './templates.mjs';
import './landing.css';

type Props={
  onStart:()=>void;
  onPick:(template:TemplateId)=>void;
};

export function LandingPage({onStart,onPick}:Props){
  return <div className="oto-home">
    <header className="oto-home-nav">
      <a className="oto-home-logo" href="#home" aria-label="OTO Studio ホーム">
        <span className="oto-home-symbol">O∿</span><strong>OTO <span>STUDIO</span></strong>
      </a>
      <nav aria-label="ページ内ナビゲーション">
        <a href="#oto-templates">テンプレート</a>
        <a href="#oto-guide">使い方</a>
        <button type="button" className="oto-nav-cta" onClick={onStart}>編集を始める <span aria-hidden="true">↗</span></button>
      </nav>
    </header>

    <main>
      <section className="oto-hero" aria-labelledby="oto-hero-title">
        <div className="oto-hero-copy">
          <p className="oto-hero-eyebrow"><span className="oto-live-dot"/> FREE WEB CREATOR · 9:16 MUSIC VISUALS</p>
          <h1 id="oto-hero-title">あなたの音楽に、<br/><em>映える映像を。</em></h1>
          <p className="oto-hero-lead">音源を読み込んで、テンプレートを選ぶだけ。ビートに反応する縦型動画をブラウザで作成し、MP4で保存できます。</p>
          <div className="oto-hero-actions">
            <button type="button" onClick={onStart} className="oto-main-cta">無料で動画をつくる <span aria-hidden="true">↗</span></button>
            <a className="oto-text-link" href="#oto-templates">テンプレートを見る <span aria-hidden="true">↓</span></a>
          </div>
          <p className="oto-hero-fine">アカウント登録不要 · Shorts / Reels / TikTok向け · PC版Chrome/Edgeで動作確認済み</p>
        </div>
        <div className="oto-hero-stage" aria-label="制作できるショート動画のデザインイメージ">
          <div className="oto-stage-halo"/>
          <div className="oto-phone-preview">
            <div className="oto-phone-topline"><span>OTO / VISUAL</span><span>PLAYING ●</span></div>
            <div className="oto-phone-art">
              <span>YOUR<br/>TRACK.</span>
              <div className="oto-art-orbit oto-art-orbit-a"/><div className="oto-art-orbit oto-art-orbit-b"/>
            </div>
            <div className="oto-phone-category">DOPA RUSH / 001</div>
            <div className="oto-phone-song">MAKE IT<br/>LOUD.</div>
            <div className="oto-phone-bands">{Array.from({length:25},(_,i)=>
              <i key={i} style={{height:(14+(i*31%57))+'%'}}/>)}</div>
            <div className="oto-phone-track"><i/></div>
          </div>
          <div className="oto-stage-sticker oto-sticker-top">1080 × 1920<br/>30 FPS</div>
          <div className="oto-stage-sticker oto-sticker-bottom">AUDIO REACTIVE ↗</div>
        </div>
      </section>

      <section className="oto-benefits" aria-label="OTOの特徴">
        <div><strong>05</strong><span>音楽に合わせる<br/>デザイン</span></div>
        <div><strong>03</strong><span>投稿先<br/>プリセット</span></div>
        <div><strong>30s</strong><span>最長30秒の<br/>動画出力</span></div>
        <div><strong>MP4</strong><span>H.264 / AACで<br/>保存</span></div>
      </section>

      <section className="oto-home-section" id="oto-templates">
        <div className="oto-section-header">
          <div><p className="oto-section-eyebrow">01 / DESIGN</p><h2>曲に合うスタイルを選ぼう。</h2></div>
          <p>5つのテンプレートから選択。色・テキスト・ジャケットを自由に調整できます。</p>
        </div>
        <div className="oto-home-gallery">
          {TEMPLATES.map((t,i)=><button className={'oto-home-template oto-home-template-'+t.id} key={t.id}
            type="button" onClick={()=>onPick(t.id)}>
            <span className="oto-home-template-art"><span className="oto-card-no">{String(i+1).padStart(2,'0')} / 05</span>
              <span className="oto-card-signal">{t.id==='signal'?'▥ ▥ ▥':t.id==='retro-grid'?'▣ ▦':t.id==='lofi-player'?'◎':t.id==='dopa-rush'?'RUSH!':'◉'}</span>
              <span className="oto-card-note">CLICK TO EDIT ↗</span>
            </span>
            <span className="oto-home-template-text"><strong>{t.name}</strong><small>{t.category}</small></span>
            <span className="oto-home-template-summary">{t.description}</span>
          </button>)}
        </div>
      </section>

      <section className="oto-guide" id="oto-guide">
        <div className="oto-section-header">
          <div><p className="oto-section-eyebrow">02 / WORKFLOW</p><h2>編集は、たった3ステップ。</h2></div>
        </div>
        <div className="oto-guide-grid">
          <article><span className="oto-step-no">01</span><h3>音楽をアップロード</h3><p>WAVやMP3などの音源と、任意のジャケット画像を選択。使いたい開始位置を指定できます。</p></article>
          <article><span className="oto-step-no">02</span><h3>デザインを編集</h3><p>テンプレート・色・曲名・投稿先・8/15/30秒の尺を選択。再生プレビューで確認できます。</p></article>
          <article><span className="oto-step-no">03</span><h3>MP4で保存</h3><p>ブラウザ内で音声付きMP4を生成。端末のメディアプレイヤーで再生できます。</p></article>
        </div>
        <div className="oto-guide-action"><button className="oto-main-cta" type="button" onClick={onStart}>制作を始める <span aria-hidden="true">↗</span></button></div>
      </section>

      <section className="oto-trust">
        <div><p className="oto-section-eyebrow">03 / PRIVACY</p><h2>音楽を、手元で編集。</h2></div>
        <p>公開Web版の映像・音声の変換はブラウザで処理され、OTO専用の変換サーバーにはアップロードしません。編集プロジェクトを保存した場合は、このブラウザ内に音源・画像も保存します。ブラウザデータの削除で失われる場合があります。Remotionの利用状況テレメトリなど外部通信が発生する場合があります。</p>
      </section>
    </main>
    <footer className="oto-home-footer">
      <span>© OTO STUDIO · MAKE MUSIC VISUAL.</span>
      <a href="https://github.com/Roki0i/oto-signal-studio" target="_blank" rel="noopener noreferrer">GitHubでコードを見る ↗</a>
    </footer>
  </div>;
}
