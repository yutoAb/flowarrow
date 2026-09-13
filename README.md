# FlowArrow

Google スライド等に貼れる「**流れる矢印**」のアニメGIFを、ブラウザだけで作るツール。
パスを描く → 流れをプレビュー → **透過GIF**で書き出し。サーバ不要(静的ファイルのみ)。

Web版: **https://flow-arrow.com/** (矢印・[スピナー](https://flow-arrow.com/spinner.html)・[強調アニメ](https://flow-arrow.com/highlight.html)の3ツール)

## CLI で使う

Web版と同じエンジンでGIFをコマンドラインから生成できます(Node 18+):

```bash
npx flowarrow --preset m --color "#5f6368" --out arrow.gif
npx flowarrow arrow --points "80,235 450,120 820,350" --mode draw --space 0
npx flowarrow spinner --style dots --color "#4f8cff" --size 200
npx flowarrow highlight --style circle --color "#e5484d" --width 800 --height 400
npx flowarrow --help   # 全オプション
```

- 座標系は矢印 900×470 / スピナー 300×300 / 強調 600×300 の論理キャンバス(出力サイズは `--width/--height/--size` で拡縮)
- `--matte` に貼り先スライドの背景色を指定すると、その色が透明になりフチが目立ちません

## MCP サーバーとして使う(AIエージェント向け)

Claude Code / Claude Desktop などのMCPクライアントに登録すると、AIが
`create_flow_arrow` / `create_spinner` / `create_highlight` の3ツールで
スライド用の透過GIFを直接生成できます:

```bash
# Claude Code の場合
claude mcp add flowarrow -- npx flowarrow mcp
```

```json
// 汎用のMCPクライアント設定 (stdio)
{ "mcpServers": { "flowarrow": { "command": "npx", "args": ["flowarrow", "mcp"] } } }
```

例:「処理フローのスライドに、左から右へ流れる灰色の矢印GIFを作って `assets/` に保存して」→ エージェントが `create_flow_arrow` を呼んでGIFを配置、という使い方ができます。

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
- `spinner.html` / `highlight.html` — スピナー・強調アニメのミニツール
- `theme.css` / `theme.js` — 全ページ共通のライト/ダークテーマとヘッダーナビ
- `cli/` — CLI と MCP サーバー(`engine.js` はWeb版から移植した描画エンジン、`render.js` は node-canvas + gifenc によるヘッドレスGIF書き出し)
- `vendor/gif.js`, `vendor/gif.worker.js` — クライアントサイドGIFエンコーダ([gif.js](https://github.com/jnordberg/gif.js), MIT)

## 既知の制約 / TODO

- 透過GIFは2値アルファのため、フチ合わせ色と異なる背景に貼るとフチが見えることがある(matte方式)
- WebM / APNG / Lottie 書き出し、パスのインポート(SVG/Excalidraw)、複数矢印、URL共有 などは今後
- Google スライドのアニメは API 非対応のため「貼るGIFを作る」方式が本質(プラグインでは実現不可)
