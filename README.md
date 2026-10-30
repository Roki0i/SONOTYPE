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

詳細は docs/architecture.md を参照してください。
