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
