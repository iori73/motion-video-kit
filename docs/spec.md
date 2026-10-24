# 仕様書 (spec) リファレンス

`spec` は JSON か、`export default {...}` の ES モジュール（`examples/*/spec.mjs`）。

## 全体

```js
{
  meta:   {title, w, h, fps, duration, background: {kind: 'paper', mottle?: [[cx,cy,w,h,color,opacity],...]}},
  tokens: {colors: {name: '#hex'}, fonts: {name: {css, figma, styles}}},   // 省略した分は既定値
  audio:  {events: [{t, k: 'tick'|'thunk'|'whoosh'|'chime'}]},
  scenes: [{id, name, start, end, bg?, fade?, motion?, children: [element...]}]
}
```
- 色は `'#RRGGBB'` か `'$名前'`（tokens.colors）。既定の `$muted` `$tealText` は 4.5:1 を満たす値。
- シーンは `start`〜`end` の間だけ見える（既定で 0.1秒フェードイン・0.08秒フェードアウト。`fade:false` で無し、`fade:'in'` で入りだけ）。
- 時間はすべて**秒の絶対時刻**（シーン内の相対ではない）。

## 要素 (element)

共通: 位置は `x,y`（左上）か `cx,cy`（中心）。`rot`（度、**時計回りが正**）、`opacity`、`motion: [...]`。

| type | 主な項目 |
|---|---|
| `text` | `text` か `runs:[{t,font,weight,color}]`、`font`(serif/hand/sans/mono)、`weight`、`size`、`lh`、`align`、`ls`、`w`(数 or 'fill')、`color` |
| `card` | `variant`(message/note/audio/doc)、`who`、`text`、`w`、`size`、`whoSize`、`pad`、`padV`、`center`、`big`、`fill`、`stroke`、`bold` |
| `table` | `style:'orders'`(行ごとに Reading→Entered と件数) / `'sheet'`(セルを順に表示)。`rows`、`cols`、`header`、`reveal:{at,gap,cellGap,countFrom}` |
| `clock` | `cx,cy,size,from:{hour,min},to:{hour,min},at,dur` |
| `counter` | `from,at,dur,steps,to,decimals,suffix,font,size,y,h` |
| `caption` | `text`、`by`（下端の位置）。見える時間は `motion:[{preset:'window',...}]` |
| `path` | `points:[[x,y]...]`、`tangents:[[tsx,tsy,tex,tey]...]`（区間ごと）、`color`、`weight`、`x,y` |
| `shape` | `shape:'rect'/'ellipse'`、`w,h,fill`（`{gradient:[a,b]}` 可）、`radius`、`stroke`、`blur` |
| `frame` | `layout:'v'/'h'`、`gap`、`pad:[上,右,下,左]`、`align`、`sizeW/sizeH:'hug'`、`children` |

## 動きの型 (motion preset)

| preset | 意味 | 主な引数 |
|---|---|---|
| `enterTiltBlur` | 傾き + ぼけ + ease-out で入る（複数枚は `at` を 0.1〜0.12 秒ずつずらす） | `at, dur, dy, dx, rot, blur, ease` |
| `fadeUp` | 下から少し上がりながらフェードイン | `at, dur, dy` |
| `fadeIn` | フェードイン | `at, dur` |
| `window` | 見える時間を作る | `in:[a,b]`, `out:[c,d]`, `to` |
| `scale` | 拡大縮小（ゆっくり寄る「pushIn」もこれ） | `at, dur, from, to, ease` |
| `draw` | 手書き線をなぞる | `at, dur` |
| `pileToList` | 重なりから一覧へ広がる | `enterAt, holdUntil, spreadDur, dx, dy, rot` |
| `keys` | 生のキーフレーム | `tracks:{FIELD:[[t,v,ease],...]}` |

## キーフレームの意味

- フィールド: `TRANSLATION_X/Y`（加算・px）、`ROTATION`（加算・度・時計回りが正）、`SCALE_X/Y`（乗算）、`OPACITY`（絶対）、`BLUR`（絶対・Figma のレイヤーブラーの半径）、`PATH_TRIM_END`（絶対 0〜1）。
- イージング: `LINEAR` `EASE_IN` `EASE_OUT` `EASE_IN_AND_OUT` `EASE_OUT_BACK` `HOLD`。キーフレームのイージングは「前のキーフレームからそこまで」の動きに効く。
- 最初のキーフレームより前は最初の値のまま、最後のあとは最後の値のまま。
- 回転・拡大縮小の中心は要素の中心。
