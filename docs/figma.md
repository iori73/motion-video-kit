# Figma Motion に出す

## 手順
1. `node engine/figma/emit.mjs <spec> out/figma --page "<ページ名>"` で `chunk-00.js ...` を作る。
2. Figma のファイルを開き（`figma.com/design/<fileKey>`）、`create_session` のあと、各チャンクの中身を `use_figma` の `code` にそのまま渡す。**順番に**。chunk-00 がメインフレームと紙の背景と最初のシーンを作る。
   - 同じ名前のメインフレームがページにあると chunk-00 はエラーを返して止まる（二重に作らない）。
   - 1つのシーンが大きすぎるときは、シーンの根と子を別チャンクに分ける。
3. 検証: `export_video`（`constraint: WIDTH 360〜640`、`fps: 10`、`quality: low`）→ ダウンロード → `ffmpeg` で主要な時刻のコマを並べる。

## 注意
- アニメーションは**最上位フレームではなく、その子**に付ける。メインフレームの直下にシーンのフレームを置く作りはこのためで、変えない。
- `get_screenshot` は静止状態だけ。動きは `export_video` でしか見えない。
- Figma MCP は呼び出し回数に上限がある（Starter プランは少ない）。上限に達したら止めて、プランを変えるか待つ。
- 組織（仕事）のプランに作る場合は、中身に案件情報を入れない。個人事業と仕事のファイルは分ける。
- ROTATION は Figma では反時計回りが正。spec は時計回りが正なので、emit が符号を反転する。
- 書体: Figma に入っている書体名（`EB Garamond` `Caveat` `Inter` `Fira Code` など）だけを使う。`listAvailableFontsAsync` で確認できる。
