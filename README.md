# motion-video-kit

仕様書（spec）を1つ書くと、**モーションブラー付きの MP4**（HTML + headless Chrome + ffmpeg）と、**編集できる Figma Motion 版**の両方が出る、短尺モーション動画の仕組み。

Write one scene spec; get a motion-blurred MP4 and an editable Figma Motion version from the same keyframes.

- 題材を問わない（UIの説明動画、文芸の予告、数字の見せ方など）。動きの型は `docs/spec.md`。
- 見本は3本: `examples/kurumi`（横16:9・45秒・架空のパン卸サービス）、`examples/podcast-teaser`（縦9:16・15秒・文芸の予告）、`examples/brand-reel`（横16:9・12秒・架空のスタジオのリール。他社の動画から学んだ技法を使った）。素材はすべて自作か著作権切れ。
- 参考動画があっても**技法の分析だけ**。映像・台本・人物は複製しない（`docs/analysis-method.md`）。他社の動画から測った学びは `docs/learnings.md`。

## 使い方 / Quick start

```bash
npm install                                   # puppeteer-core。Google Chrome と ffmpeg が必要
node engine/core/contrast.mjs examples/kurumi/spec.mjs        # 文字と背景のコントラスト検査（0件が合格）
node engine/core/pacing.mjs  examples/brand-reel/spec.mjs     # ペース検査（場面長・動きの長さ。警告が無いのが合格）
node engine/html/build-html.mjs examples/kurumi/spec.mjs out/kurumi.html
node engine/html/snap.mjs out/kurumi.html out/snaps 3 9.2 21.5   # 指定秒の静止画で確認
node engine/html/render.mjs out/kurumi.html out/frames           # 120fps相当のサブフレーム（--from/--to で部分書き出し）
node engine/html/build.mjs out/frames out/kurumi.mp4            # 4枚平均のブラー + 音の合成 + MP4
node engine/figma/emit.mjs examples/kurumi/spec.mjs out/figma --page "Kurumi"   # Figma 用のチャンク
```

Chrome の場所が違う場合は `CHROME_PATH` を設定する（既定は macOS の Google Chrome）。

## 仕組み / How it works

```
spec (JSON or ES module)
   │  engine/core/compile.mjs   動きの型を「キーフレームの列」に展開、部品(card/table/clock…)を図形と文字に展開
   ▼
compiled tree + tracks ──┬─ engine/html/*    runtime.js が seek(t) で描く → render.mjs(サブフレーム) → build.mjs(MP4)
                         └─ engine/figma/*   emit.mjs が use_figma 用チャンクを出力、interp.js が編集可能レイヤーを作る
```

両方の出力が**同じキーフレーム**を読むので、仕様書の意味は同じになる。

## Figma に出す / Figma output

`emit.mjs` が出す `chunk-NN.js` は、Figma の `use_figma` ツールにそのまま渡せる（各45k文字以内）。順番に実行する。
実行したあとは、`export_video`（小さく・低fps）→ ffmpeg でコマを抜き、`get_screenshot` は静止状態だけ見える点に注意。
詳細は `docs/figma.md`。

## 品質チェック / Before you ship

`docs/quality-checklist.md`。コントラスト（機械検査）、音量、ブラーのコマ、Figma 上の再生、第三者素材の混入、案件情報の混入。

## 限界 / Limits

- Figma Motion は3D遠近と音声を持たないため、Figma 版は平面の位置移動で近似する。MP4 側にも3Dはない。
- Figma MCP は呼び出し数に上限がある（プランによる）。チャンクを少なくまとめてある。
- 書体は `tokens.fonts` の `css`（HTML）と `figma`（Figma）を別々に持つ。見た目は完全には一致しない。
- 動きの型は、見本3本と、調べた他社の動画(`docs/learnings.md`)で見えたものに限る。必要になったら足す(2件以上で見えたものだけ)。

## ライセンス / License

MIT（`LICENSE`）。コードも `examples/` も自作です。他社の動画から学んだことは数字と型だけで、映像・台本・人物・ロゴは含みません（`docs/analysis-method.md`）。
MIT. Code and examples are original; nothing from third-party videos is included.
