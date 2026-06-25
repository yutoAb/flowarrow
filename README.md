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

## SEO / 広告(収益化)メモ

オンページSEO(title/meta/OGP/見出し/FAQ/構造化データ)と `sitemap.xml`・`robots.txt` は実装済み。

次の手順:
1. **Google Search Console** にサイト登録 → `sitemap.xml` を送信(インデックス促進)
2. 初速は **X / Zenn / Qiita** に「作り方」記事を出して被リンク&流入を作る
3. **独自ドメイン取得**(Cloudflare Registrar 等、年 ~¥1,500)→ GitHub Pages にカスタムドメイン設定(`CNAME` + DNS)。`*.github.io` では AdSense が通らないため必須
4. **Google AdSense 申請**(コンテンツが薄いと落ちるので、使い方/作例/FAQ を充実させてから)
5. 承認後、`index.html` の `<div class="adslot">` を AdSense の `<ins class="adsbygoogle">` + 配信スクリプトに差し替え。EEA/UK向けは **認定CMP(同意管理)** を導入
6. メタ/OGP/canonical/sitemap の URL は独自ドメインに合わせて更新

> 収益はツール単体だと薄い前提。広告は「仕組みを学ぶ」目的＋作者ブランディング(footer の @ReactYuto)の補助として。

