# FlowArrow

Google スライド等に貼れる「**流れる矢印**」のアニメGIFを、ブラウザだけで作るツール。
パスを描く → 流れをプレビュー → **透過GIF**で書き出し。サーバ不要(静的ファイルのみ)。

## 使い方(ローカル)

`file://` だと GIF の Web Worker が動かないため、簡易サーバ経由で開きます:

```bash
cd flowarrow
python3 -m http.server 8765
# ブラウザで http://localhost:8765 を開く
```

1. キャンバスを**クリックして点を追加**(最初=始点 / 最後=終点・矢じり)。点は**ドラッグ**で移動
2. プリセット(直線/フック/M字/S字)から始めてもOK
3. スタイル・色・太さ・間隔・速さ・矢じりを調整
4. **フチ合わせ色**をスライドの背景色に合わせる(その色がGIFで透明になる=フチが目立たない)
5. **GIF書き出し** → `flow-arrow.gif` がダウンロードされる
6. スライドに **挿入 → 画像** で貼る(編集中・発表中ともに自動ループ再生)

## デプロイ

静的ファイルだけなので、`flowarrow/` をそのまま **Vercel / GitHub Pages / Netlify** に置けば公開できます。

```bash
npx vercel deploy   # or: drag the folder to Netlify
```

## 構成

- `index.html` — アプリ本体(UI + アニメーションエンジン + GIF書き出し)
- `vendor/gif.js`, `vendor/gif.worker.js` — クライアントサイドGIFエンコーダ([gif.js](https://github.com/jnordberg/gif.js), MIT)

## 既知の制約 / TODO

- 透過GIFは2値アルファのため、フチ合わせ色と異なる背景に貼るとフチが見えることがある(matte方式)
- WebM / APNG / Lottie 書き出し、パスのインポート(SVG/Excalidraw)、複数矢印、URL共有 などは今後
- Google スライドのアニメは API 非対応のため「貼るGIFを作る」方式が本質(プラグインでは実現不可)
