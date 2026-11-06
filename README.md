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
