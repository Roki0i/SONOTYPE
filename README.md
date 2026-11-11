# SONOTYPE

**音楽を、短い縦型映像に。**

Shorts・Reels・TikTok向けの音楽ビジュアル動画を、ブラウザで編集・MP4書き出しできるWebアプリです。

**[Webアプリ](https://roki0i.github.io/SONOTYPE/)** · [編集画面](https://roki0i.github.io/SONOTYPE/#editor) · [完成動画デモ](https://roki0i.github.io/SONOTYPE/sonotype-demo.mp4)

[![CI](https://github.com/Roki0i/SONOTYPE/actions/workflows/ci.yml/badge.svg)](https://github.com/Roki0i/SONOTYPE/actions/workflows/ci.yml)

## 主な機能

- 音量・周波数に反応する**5種類のテンプレート**、曲名・配色・ジャケットの調整
- WAV / MP3等の音源解析、MIDIの読み込み、波形から開始位置を指定
- **8・15・30秒／1080×1920／30fps**のH.264/AAC MP4書き出し
- プレビューと出力に共通のRemotion映像シーンを使用
- IndexedDBへ1作品の素材・設定を保存・復元

**技術**：React / TypeScript / Vite / Remotion / Web Audio API / WebCodecs / IndexedDB。公開版は動画生成サーバーなしで対応ブラウザ内で書き出し、ローカル版はループバックAPIを使用します。

## 使い方

1. [Webアプリ](https://roki0i.github.io/SONOTYPE/)で「動画をつくる」を選ぶ（デモ音源を同梱）。
2. テンプレート・素材・使用区間を設定する。
3. 「MP4を書き出す」を選ぶ。

## ローカル起動・検証

Node.js 24、Python 3、ローカル動画生成の検証にはFFmpegが必要です。

```bash
cd apps/studio
npm ci
npm run dev
npm run build
npm run render:demo
npm audit --audit-level=high
```

[CI・ブラウザE2E](https://github.com/Roki0i/SONOTYPE/actions/workflows/ci.yml) · [Pagesビルド・公開](https://github.com/Roki0i/SONOTYPE/actions/workflows/pages.yml)

## 制約・利用条件

- 音源は最大25MiB・1時間、画像は最大5MiB、MIDIは最大5MiB。使用可能形式は音源WAV/MP3/M4A/AAC/OGG、画像PNG/JPEG/WebP。
- **スマートフォンでのMP4出力は未保証**。CIのモバイル画面検証は物理端末での動作保証ではありません。
- 素材は利用ブラウザ内に保存されます。サイトデータ削除で消える可能性があり、端末間同期はありません。
- アップロードした音源・画像はSONOTYPE専用の動画生成サーバーへ送信しません。ただし、ライブラリのテレメトリ通信が発生する場合があります。
- 第三者の素材の利用権を確認してください。Remotionの商用利用は[ライセンス](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)を確認してください。

現行エディタは`apps/studio/src/`、E2Eは`tests/`。ルートの旧Canvas版は回帰テスト用に保持しています。
