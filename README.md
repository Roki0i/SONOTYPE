# SONOTYPE

音楽から **YouTube Shorts / Instagram Reels / TikTok向けの縦型MP4**を作るWebアプリ。

**[Web版を使う](https://roki0i.github.io/oto-signal-studio/)**

## できること

- 5種類の音楽ビジュアルテンプレート（Signal Lab / Retro Grid / After Hours / Cover Flow / Dopa Rush）
- 音源とジャケット画像（任意）、MIDI（任意）を読み込み、曲名・色・再生位置を編集
- 8 / 15 / 30秒の9:16動画をプレビューし、1080×1920・30fps・H.264/AACのMP4に書き出し
- 1件の編集プロジェクトをブラウザ内のIndexedDBへ保存・復元・削除

開始するにはWeb版で「動画をつくる」を押し、音源とテンプレートを選択して「MP4を書き出す」を押します。アカウント登録は不要です。

## 制限・データの取り扱い

- 音源は **25MiB / 1時間以内**、画像は **5MiB以内**、MIDIは **5MiB以内**。切り出し開始位置は1秒単位です。
- Web版は対応ブラウザのWebCodecsで動画を端末内生成します。SONOTYPE専用の動画変換サーバーへ音源・画像を送信しません。ただしRemotionなどのテレメトリ通信は発生する場合があります。
- 保存した音源・画像・設定は**そのブラウザだけ**に保持されます。サイトデータ削除やストレージ制限によって消える場合があり、別端末同期やプロジェクトのダウンロードは未対応です。
- 端末性能やブラウザによって動画出力できない場合があります。スマートフォンでのMP4出力動作は未保証です。
- 他者の音源・ジャケットを使う場合は公開・投稿に必要な権利を確認してください。

## 開発

Node.js 24、Python 3、ローカルMP4検証にはFFmpegを使用します。

```bash
cd apps/studio
npm ci
npm run dev
```

ローカル編集画面：`http://127.0.0.1:5173/`。ローカルモードは127.0.0.1のRemotion書き出しAPIを使用します。

```bash
npm run build            # React / TypeScript
npm run render:demo      # RemotionデモMP4（FFmpeg環境）
npm audit --audit-level=high
```

GitHub Pages向けの静的ビルドと公開は `.github/workflows/pages.yml` が担当します。検証は `.github/workflows/ci.yml` にまとまっています。自動テストにはNode/Pythonユニットテスト、Linux Chromium・Windows Chrome/Edge、音画同期、MP4出力検査が含まれます。

```bash
# ローカルでPages用バンドルを作成（macOS/Linux）
VITE_PAGES_BUILD=true npm run build:pages
```

### コードの構成

- `apps/studio/src/` — Reactエディタ、トップページ、音声解析と保存機能
- `apps/studio/src/remotion/` — 5種類の動画シーンとプレビュー/書き出し
- `apps/studio/scripts/` — デモ生成準備、ローカル書き出しAPI、各種検査
- `tests/` — ブラウザE2Eテスト
- `generate_demo.py` — オリジナルの検証用WAV/MIDI生成

**互換性維持：** リポジトリ直下の `server.py` / `index.html` / `src/` は初期のPython/Canvas版です。公開サイトの実装には使われませんが、旧版テストと互換性確認のため残しています。旧版を使う場合はルートで `python3 server.py` を実行します。

Remotionの商用利用時は [Remotionのライセンス条件](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) を確認してください。
