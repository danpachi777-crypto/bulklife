import {readFileSync,writeFileSync} from 'node:fs';
const app=new URL('../src/ui/App.tsx',import.meta.url);let text=readFileSync(app,'utf8');text=text.replace('min={30} max={250} step={5}','min={30} max={250} step={1}');writeFileSync(app,text);
const progress=new URL('../docs/progress.md',import.meta.url);text=readFileSync(progress,'utf8');text=text.replace('4deo.','4.').replace('自動テスト22件','自動テスト23件');
text=text.replace('実ブラウザーの今回の操作確認はこれから。下記の制約と分けて追記する。','実ブラウザー（Windows Chrome、ウィンドウ約770×980）でも正面/背面の衣装・背面照明、1週間の実行、日次実績、セット数3→4の編集、テンプレート適用で3へ復元、再読込後の同じ選手と7日目・体重64.27kg・筋質量26.21kgの復元を確認。画面で進めたのは既存P4選手の7日間。');
text=text.replace('## 検証','12. 初期タンパク質量（102g等）が5g刻みの入力検証と矛盾：1g刻みに修正。\n13. 非ゼロRNGの抽選端点で剰余の区間数が1つ違う：1〜4294967292の6で割り切れる区間へ修正し、端点検証を追加。既存の選手や抽選済み候補は変更しない。\n\n## 検証');
text=text.replace('次は実ブラウザーで正面・側面・背面と既存ループの操作を確認し、第2段階の練習/食事/生活の詳細へ進む。','次は第2段階の練習/食事/生活の詳細へ進む。大会と引退を実装した後、通常プレイから世界タイトル/未優勝引退までの通し検証を別途行う。');
writeFileSync(progress,text);
