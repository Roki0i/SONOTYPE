# OTO / Signal Studio (v0.1)

音声・MIDIから波形、スペクトラム、ピアノロールを描画し、縦型のMP4動画として書き出すローカルWebアプリです。

**構成:** JavaScript / Canvas / Web Audio API / MediaRecorder / Python標準ライブラリ / FFmpeg。
React・Remotionは後続の改善予定であり、まだ導入していません。

## 起動

Windows（Python 3.10以上、Chrome/Edge、FFmpeg推奨）:

~~~powershell
winget install Gyan.FFmpeg
py -3 server.py
~~~

macOS / Linux:

~~~bash
python3 server.py
~~~

ブラウザで http://127.0.0.1:8765 を開きます。デモ音声とMIDIは初回起動時に自動生成します（別パッケージ不要）。

## 操作

1. 音声ファイル（MP3/WAV/M4A等）を読み込みます。
2. 正確な音程を表示したい場合は、音声に対応するMIDIを読み込みます。
3. テーマと動画の長さ（8/15/30秒）を選択します。
4. プレビューを再生し、「MP4を書き出す」を押します。

音声/MIDIの開始時刻は自動では照合しません。録画は実時間で進み、FFmpegがMP4へ変換します。
音声はクラウドへ送信されず、127.0.0.1上のローカルサーバーだけが処理します。

## 制限と検証

- 録画・音声同期はブラウザ依存。Windows Chrome/Edgeでの通し検証が必要です。
- MIDIは形式0/1（PPQ）のみ。MP3から音程を自動推定しません。
- 最大解析・録画時間30秒。音声上限25MB、MIDI上限5MB、録画上限160MB。
- FFmpegはPATH上に存在する必要があります。
- JavaScriptユニットテストは npm test、CIは GitHub Actions で実行。
- 誤解を避けるため、実機E2EやActions成功は確認できた場合だけ記録します。


## 自動ブラウザ検証（Linux Chromium）

GitHub Actionsの `browser-e2e` ジョブでは、Playwrightでデモ音源とMIDIの表示、音声再生、テーマ切替、8秒のMP4書き出しを通し検証します。さらに `ffprobe` で1080×1920・H.264・AACを確認し、`ffmpeg volumedetect` で無音でないことを検査します。

- [初回E2E成功結果（2026/10/31）](https://github.com/Roki0i/oto-signal-studio/actions/runs/41104455841) — 動画7.82秒、音声音量平均 -15.2 dB、ユニットテスト5/5成功。
- ローカルで再実行する場合は、Playwright Python・Chromium・FFmpegをインストールしたうえで `python tests/e2e_browser.py` を実行してください。
- この結果は **Linux上のChromiumによるE2E成功** を示します。Windows版Chrome/Edgeでの実機動作は引き続き未確認です。

## Windows Chrome・Edge 自動検証（2026-10-31）

- GitHub Actions の Windows Server 2025 ランナー上で、Chrome Stable と Edge Stable の実ブラウザを Playwright 1.64.1 で操作。
- Chrome `156.0.8078.48` / Edge `155.0.4283.62`、FFmpeg `9.0.2` を確認。
- 各ブラウザで音声・MIDI読込、再生・停止、テーマ変更、8秒MP4出力、H.264/AAC・1080×1920・非無音の検証に成功。
- Chrome：出力 `7.95秒 / 1,985,071 bytes`、Edge：`7.95秒 / 2,005,929 bytes`。いずれも平均音量 `-15.2 dB`。
- [PR #1](https://github.com/Roki0i/oto-signal-studio/pull/1) / [Windows・Linux E2E成功](https://github.com/Roki0i/oto-signal-studio/actions/runs/41160459284)。
- これは **GitHub-hosted Windows Server 2025のCI検証**です。利用者のWindows PC上での操作確認・音画同期精度の測定は未実施です。

WindowsでE2Eを再実行する場合、Python 3.12、ChromeまたはEdge、FFmpeg/ffprobeを準備してから以下を実行します。

~~~powershell
python -m pip install -r requirements-e2e.txt
$env:OTO_BROWSER_CHANNEL='chrome'; python tests/e2e_browser.py
$env:OTO_BROWSER_CHANNEL='msedge'; python tests/e2e_browser.py
~~~
## セキュリティとバージョン管理（2026-10-31）

- ローカルHTTPサーバーは127.0.0.1のみにバインド。Host検証、GET/HEAD配信ファイル制限、Origin検証を実施。
- MP4変換APIはWebMのContent-Type、先頭ヘッダー、160MB上限、タイムアウトを検証。FFmpegのプロトコルをfile/pipeに制限します。
- GitHub Actionsは公式リリースのfull commit SHAに固定。contents: read、checkoutのpersist-credentials: falseを設定。
- .github/dependabot.ymlがGitHub ActionsおよびPython依存関係の更新PRを週次提案（自動マージなし）。
- Playwright 1.64.1をrequirements-e2e.txtに固定（2026-10-22公開）。アプリ本体にはnpmの外部ランタイム依存はありません。
- FFmpegは公式の[セキュリティ一覧](https://ffmpeg.org/security.html)を確認して、修正を含む配布元の最新版を使ってください。8.0.3 / 8.1.2 / 9.0等に2026年の修正が含まれます。旧版に修正がバックポートされた可能性は配布元で確認してください。
- ffmpeg -version と python --version でローカルの版を確認してください。CIはUbuntu配布版FFmpeg 6.1.1で自作デモのみ動作検証するため、未知の外部動画に対する安全性は証明できません。
- Dependabot alerts / security updatesのGitHub Settings上での有効化は未確認です。

**注意：** これらはリスク低減策であり、音声・動画ファイルや外部ライブラリの安全性を保証するものではありません。
詳細は docs/architecture.md を参照してください。

## v0.2 React / TypeScript / Remotion (experimental)

The existing root v0.1 remains the tested stable local app. A separate React+TS+Vite editor and Remotion Player/CLI composition live in `apps/studio`. Dependencies are fixed to exact versions and reviewed using npm audit and CI. The new composition is frame-deterministic, 1080x1920 at 30fps.

From `apps/studio` after installing Node.js 24 and Python 3:

```powershell
npm install
npm run dev
npm run render:demo
```

`npm run render:demo` renders the **original bundled demo** to `out/oto-demo.mp4`; it does not yet export user-uploaded audio. The browser preview can load user audio and MIDI (local processing) and the visualizer uses sampled per-frame RMS from the uploaded audio. The bundled demo's visual level data is synthetic and should not be labeled as measured waveform data. The original app continues working via `python server.py` at the repository root.

Remotion requires a company license for some commercial organizations; review https://github.com/remotion-dev/remotion/blob/main/LICENSE.md before deployment. Windows browser E2E for the new React editor is not yet implemented; the existing v0.1 browser tests are unchanged.

## v0.3 ローカル音声からのMP4書き出し

`apps/studio` から `npm ci` → `npm run dev` を実行し、`http://127.0.0.1:5173` を開くと、読み込んだWAV / MP3 / M4A / AAC / OGG音声とMIDIを使って「MP4を書き出す」が利用できます。音声はローカルのみで処理します。

- Viteの127.0.0.1:5173から127.0.0.1:8787へローカルプロキシ接続します。ポート8787を外部公開しないでください。
- アップロード上限は音声25MiB、全リクエスト27MiB。タイトル・テーマ・動画尺・波形RMS・MIDIノートを検証し、送信元OriginとHostを限定します。
- Remotion CLIの`--props`へJSONをファイル経由で渡し、フレーム範囲を8 / 15 / 30秒に固定します。Windowsのシェルへユーザー入力を直接渡しません。
- 音声は一時的に`apps/studio/public/render-uploads`へ保存して描画し、MP4送信後に自動消去します。一時データは.gitignoreで除外しています。
- MP4は1080×1920・30fps・H.264/AAC。同時書き出しは1件のみ、240秒タイムアウト。
- Reactプレビューは音声から計算したRMSを表示します。デモ音源の既定レベルは合成データです。MIDI未入力時、音程は推定しません。
- 自動テストは`node --test scripts/export-api.test.mjs`、エンドツーエンド試験は`node scripts/export-api-smoke.mjs`（FFmpeg/ffprobeとRemotion実行可能環境が必要）です。

これはローカル専用の試作アプリであり、インターネット公開や認証無しでのLAN公開は想定していません。

## Audio / video sync regression (original demo)

`python apps/studio/scripts/check-av-sync.py <rendered-demo.mp4> <generated-demo.wav>` checks: H.264 1080x1920/30fps, AAC, media start/end timestamps, source WAV versus decoded AAC correlation, and piano-roll note highlights at exact 0.5-second frame boundaries. Requires FFmpeg and FFprobe, uses only Python standard library. CI exercises a 60-frame render and verifies two audio sample windows plus three note transitions. This checker is **specific to the original demo MIDI and the current reference scene layout**, not arbitrary user-uploaded music. The original demo uses **synthetic visual levels**; the checker does **not** certify accurate real-time audio spectrum or lip-sync for other audio. For longer validation, run against a full 15-second `npm run render:demo` output.

## v0.4 / 実音声FFTスペクトラム

- デモ音源とアップロード音源の**両方**を対象に、30fpsのフレーム中心時刻で1024-point Hann窓FFTとフレーム別RMSを測定。対数26周波数帯、BASS/MID/TREBLE（220Hzと2kHzで区分）を可視化。
- ローカルで音声ファイルを解析し、同じ測定済みデータをプレビューとRemotion MP4に使う。外部サービスへの送信なし。
- `npm run prepare:demo` が元の `assets/demo.wav` から `apps/studio/public/demo-analysis.json` を生成する。この生成物は `.gitignore` に入れており、`npm run dev` / `npm run build` / `npm run render:demo` の前に生成される。
- 音声の先頭最大30秒を解析。動画尺を8/15/30秒に変えても同じ解析結果をスライスでき、音声が終了した後の音量・スペクトラムはゼロ。
- 各周波数帯はFFTピークをdB変換、音量はフレーム区間RMSを表示。放送音響基準のラウドネス測定器ではなく、窓長による時間・周波数分解能制約がある。
- `node --test scripts/signal-analysis.test.mjs` で無音、95/440/4000Hzの周波数分離、終了後の無音、値域と再現性を検証。CIにはnpm監査、TypeScript、MP4出力、同期検査を維持。

## v0.5 音楽投稿テンプレートエディタ（MVP）

OTOは「音楽をアップロードし、テンプレートを選んで、曲名・アーティスト・ジャケットと色を編集し、MP4を作る」ローカルWebアプリとして拡張中です。初期版ではログイン・クラウド送信・公開ギャラリー・高度な自由配置は提供しません。

- **4種類のテンプレート:** Signal Lab（従来データUI）、Retro Grid（モノクロ6パネル）、After Hours（ローファイ風プレイヤー）、Cover Flow（ジャケット中心）。レイアウトは共通Remotionコンポジションから切替。
- **編集画面:** 左にテンプレート、中央に再生プレビュー、右に音源／MIDI／ジャケット画像、曲名、アーティスト名、配色、8/15/30秒、MP4書き出しを配置。スマートフォン幅では縦並び。
- **画像:** PNG / JPEG / WebP（最大5MiB）。ローカルエクスポートAPIは拡張子とMIMEと先頭バイトを照合し、レンダリング中の一時ファイルのみ使用。SVGや外部URLは受け付けません。
- **音声:** WAV / MP3 / M4A / AAC / OGG（最大25MiB）、実音声RMS/FFT計測、任意のMIDI音符。プレビューと書き出しに同一の解析値を使います。
- **動画:** 1080×1920（9:16）、30fps、H.264/AACのMP4。クラウド出力には対応せず、音源と画像はこのPC上で処理します。
- **デザインの制約:** Signal Labは従来版のレイアウトを維持するため、アーティスト名・ジャケット画像は表示しません。他3テンプレートで画像・文字を使用します。自由配置、フォント選択、横長・正方形、タイムライン編集は後続です。

Macでの更新と起動:

```bash
cd ~/oto-signal-studio
git pull --ff-only
cd apps/studio
npm ci
npm run dev
```

ブラウザで http://127.0.0.1:5173 にアクセスしてください。ルートの従来型 v0.1 は従来どおり `python server.py` で利用できます。

## v0.6 / ショート動画投稿テンプレート

- **Dopa Rush**：YouTube Shorts・Instagram Reels・TikTok向けの縦型テンプレート。大きな曲名・ジャケット・高速に切り替わる短いメッセージ・実音声FFT/低音/RMS連動の穏やかな拡大アニメーションを使用。高速な全画面点滅（ストロボ）は使用しない。
- **投稿先プリセット**：YouTube Shorts / Instagram Reels / TikTok。現状はすべて **9:16・1080×1920・30fps・H.264/AAC** で、投稿先選択はダウンロード名（`oto-tiktok-...`等）とプレビュー用の文字位置ガイドを切り替える。各プラットフォーム専用の画質/長さへの自動変換ではない。
- **文字位置ガイド**：各サービスの操作ボタン等を避けるための保守的な**編集目安**。プラットフォームの公式安全領域とは限らず、アプリのUI変更で異なる。ガイドは動画に焼き込まれない。
- **データの扱い**：既存のローカルMP4書き出しAPIを利用。Web公開用のブラウザ内レンダラーへの移行は**別タスクで未実装**。GitHub Pagesに現在のAPIをそのまま置いてもMP4生成は動かない。
- **検証**：NodeでテンプレートID・投稿先・安全領域値を検証。既存RemotionのH.264/AAC出力とLinux ChromiumでのUI操作E2E（5テンプレート・3投稿先・Dopa Rushによる画像アップロード/MP4保存）を実施する。

## v0.7 GitHub Pages / ブラウザ完結Web版

- 対象: `apps/studio` のReactエディタ。GitHub Pages向けのビルドは `VITE_PAGES_BUILD=true npm run build:pages`。Viteの`base`は`/oto-signal-studio/`となり、公開先のサブディレクトリに合わせて音声・JS・CSSを読み込む。
- MP4書き出し: `@remotion/web-renderer` 4.0.539を利用し、WebCodecsが利用できるブラウザで**利用者の端末内**でH.264/AAC MP4を生成する。現在のローカルNode.js/Remotion CLI経由の書き出しも既存のまま維持する。
- ブラウザのコーデック対応を `canRenderMediaOnWeb()` で検査し、非対応なら明示的にエラー表示する。映像のCSS対応はサーバー版と異なり、全テンプレートのピクセル単位での同一性は保証しない。ブラウザや端末の負荷次第でレンダリング時間が異なる。
- `.github/workflows/pages.yml`: Pull RequestではPages用ビルド・監査のみ検証し、`main`更新時にはGitHub Pagesへデプロイを試行する。サイトを公開する前に、リポジトリ `Settings > Pages > Build and deployment > Source` で `GitHub Actions` を選択する必要がある。
- 現在GitHubリポジトリは**Private**。GitHub FreeではPrivateからPagesを公開できず、GitHub Proなどの対応プランが必要。GitHub Freeなら**公開に同意した場合に限り**リポジトリをPublicへ変更する。Pages公開物は、Privateリポジトリであっても原則公開Webサイトになる。
- Pagesの想定URL: `https://roki0i.github.io/oto-signal-studio/` （サイトの公開成功を示すURLではない）。デプロイ後にSettingsの`Visit site`で実URLを確認する。
- 端末にアップロードした音声・画像は、Web版では独自動画変換APIへ送信しない。ただしRemotionの**レンダリングテレメトリ**通信があるため、完全オフライン・外部通信ゼロとは説明しない。
- GitHub Pagesは個人制作・デモ目的での利用に留め、SaaS/商用サービス化する場合はGitHub Pagesの利用制限とRemotionライセンスを確認する。

## v0.8 エディタ操作性（GitHub Pages / ローカル共通）

- **大きなプレビュー**：標準幅は460px（従来365px）。ツールバーから小340px・標準460px・大550pxを選択可能。狭い画面では利用可能な幅に自動縮小し、動画の実際の解像度は1080×1920のまま。
- **設定の整理**：右側を「素材・文字」と「デザイン・投稿」の2つの表示タブに分割。音源・ジャケット・任意のMIDI・曲名・アーティストは前者、色・SNS投稿先・動画尺は後者。編集中の入力内容はタブ切替で失われない。
- **書き出しの視認性**：右側の書き出し領域はタブに依存せず常に表示。デスクトップでは右側の設定のみ独立スクロールし、MP4ボタン・出力先・秒数・進捗を下部に維持。小画面では縦積み表示。
- 音声解析、5テンプレート、既存H.264/AAC MP4出力、ローカル/ブラウザの2つのレンダリング経路は変更しない。新規依存なし。公開URLは `https://roki0i.github.io/oto-signal-studio/`。

## v0.9 使用する音楽区間の選択

- **任意の開始位置**：音声を読み込んだ後、「素材・文字」タブの「曲の使用区間」で開始位置を1秒刻みで変更。動画は選択した開始位置から従来の8/15/30秒を使用し、プレビューと書き出しで一致する。動画の解像度と出力形式（1080×1920、30fps、H.264/AAC）は変更なし。
- **実装**：`@remotion/media`の`Audio.trimBefore`へソース音声上の開始フレームを渡す。最初のファイルデコードをキャッシュし、選択区間（最大30秒）だけダウンミックスしてFFT/RMSを再計算する。MIDIノートは区間に重なる部分だけを切り取り、表示時刻を動画の0秒基準に変換する。
- **制限**：開始位置は1秒単位。音源の実際の尺より動画尺が長い場合は開始位置0秒とし、不足部分は無音。動画尺変更時は選択できる開始位置を再計算。16秒の同梱デモは8秒動画なら0〜8秒、15秒動画なら0〜1秒、30秒動画では0秒のみ選択可能。
- **ローカルとPages**：ローカル書き出しAPIには`startFrame`を入力検証付きで追加。GitHub PagesのWeb Rendererも同じSceneProps/フレームに依存する。0秒の場合は従来の音声の先頭からそのまま出力し、過去のデモCI回帰を維持。
- **セキュリティとプライバシー**：音声上限25MiB、長さ1時間以内。選択区間のFFTはユーザー端末内で計算し、Pagesでは音声を外部の動画変換サーバーへ送信しない。音楽・映像の著作権に関する公開判断は利用者が行う。
