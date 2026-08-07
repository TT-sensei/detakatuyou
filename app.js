
// 町のデータ探偵団 — 学習・練習・進捗を一体で管理するアプリ
const STORAGE={legacy:'detective_data_progress_v1',story:'detective_story_progress',ranks:'detective_rank_steps',patterns:'detective_weak_patterns',titles:'detective_titles',caseNo:'detective_case_no'};
const freshState=()=>({story:[false,false,false,false,false],ranks:[0,0,0,0,0],patterns:{},titles:[],caseNo:0,solved:0});
let state=loadState(),mode='home',step=0,queue=[],questionIndex=0,practiceIndex=0,current=null,answered=false,forcedPracticePattern=null,buildCounts=[];

const STEPS=[
  {title:'散らばりの事件',short:'ドットプロット',icon:'●',intro:'6年1組のハンドボール投げの記録。去年より強くなったというウワサは本当か、散らばりから調べよう。',flavor:['学校の記録','町内運動会の記録','スポーツ大会の記録']},
  {title:'代表値の事件',short:'平均・中央値・最頻値',icon:'Ⅲ',intro:'商店街の靴屋さんから相談がきた。どのサイズを多く仕入れるべきか、3つの代表値を使い分けよう。',flavor:['靴屋の相談','給食の記録','図書館の貸出記録']},
  {title:'整理の事件',short:'度数分布表',icon:'▤',intro:'町の調査データが多すぎて読めない。階級に分け、度数分布表で手がかりを整理しよう。',flavor:['町の調査','健康調査','通学時間の調査']},
  {title:'山の形の事件',short:'ヒストグラム',icon:'▥',intro:'同じデータなのに、グラフの形がちがって見える。柱をすき間なく並べて分布の山を見つけよう。',flavor:['気温の記録','歩数の記録','読書時間の記録']},
  {title:'結論の事件',short:'読み解き・吟味',icon:'⌕',intro:'「この町の人はみんな運動が得意」と書かれた報告書。データの集め方や目盛りまで調べ、結論を吟味しよう。',flavor:['町の健康報告','アンケート結果','新聞のグラフ']}
];

function read(key,fallback){try{const value=localStorage.getItem(key);return value===null?fallback:JSON.parse(value)}catch{return fallback}}
function loadRanks(fallback){
  return fallback.map(function(value,index){return read('detective_rank_step'+(index+1),value)});
}
function loadState(){
  const old=read(STORAGE.legacy,{});
  return {...freshState(),...old,
    story:read(STORAGE.story,old.story||freshState().story),
    ranks:loadRanks(read(STORAGE.ranks,old.ranks||freshState().ranks)),
    patterns:read(STORAGE.patterns,old.patterns||{}),
    titles:read(STORAGE.titles,old.titles||[]),
    caseNo:read(STORAGE.caseNo,old.caseNo||0)};
}
function saveState(){
  localStorage.setItem(STORAGE.legacy,JSON.stringify(state));
  localStorage.setItem(STORAGE.story,JSON.stringify(state.story));
  localStorage.setItem(STORAGE.ranks,JSON.stringify(state.ranks));
  state.ranks.forEach(function(value,index){localStorage.setItem('detective_rank_step'+(index+1),JSON.stringify(value))});
  localStorage.setItem(STORAGE.patterns,JSON.stringify(state.patterns));
  localStorage.setItem(STORAGE.titles,JSON.stringify(state.titles));
  localStorage.setItem(STORAGE.caseNo,JSON.stringify(state.caseNo));
}
function esc(value){return String(value).replace(/[&<>"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]})}
function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min}
function sum(data){return data.reduce(function(a,b){return a+b},0)}
function mean(data){return sum(data)/data.length}
function count(data,value){return data.filter(function(x){return x===value}).length}
function unique(values){return values.filter(function(value,index){return values.indexOf(value)===index})}
function shuffle(items){const copy=items.slice();for(let i=copy.length-1;i>0;i--){const j=rand(0,i);[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
function choice(items){return items[rand(0,items.length-1)]}

function header(){
  return '<header class="top"><div class="brand"><div class="badge">⌕</div><div><h1>町のデータ探偵団</h1><small>データを見て、考えて、確かな結論を</small></div></div><div class="top-actions"><button class="btn" onclick="showNotebook()">探偵手帳</button><button class="btn ghost" onclick="goHome()">トップ</button></div></header>';
}
function render(html){document.querySelector('#app').innerHTML=header()+html;window.scrollTo({top:0,behavior:'smooth'})}
function goHome(){mode='home';renderHome()}

function renderHome(){
  const cleared=state.story.filter(Boolean).length;
  render('<section class="hero"><div class="eyebrow">CASE FILE 000　データ活用調査本部</div><h2>町のデータ探偵団</h2><p>町に届く「本当かな？」を、データという手がかりで解決しよう。散らばり・代表値・度数分布表・ヒストグラム・結論の吟味まで、5つの事件に挑戦します。</p><div class="top-actions"><button class="btn primary" onclick="startStory()">'+(cleared?'物語をつづける':'基本学習をはじめる')+'</button><button class="btn gold" onclick="showPracticeSelect()">名探偵への道</button></div></section><div class="grid"><article class="card mode-card"><div><div class="mode-icon">📖</div><h3>基本学習モード</h3><p class="muted">物語を追いながら、5つの事件を順番に解決します。</p></div><span class="pill">'+cleared+'/5章クリア</span></article><article class="card mode-card"><div><div class="mode-icon">🕵️</div><h3>練習モード</h3><p class="muted">問題は毎回変化。未解決事件（にがて）が優先して出ます。</p></div><span class="pill gold">ランクアップ式</span></article></div><div class="section-title"><h2>5つの事件</h2><span class="muted">'+(cleared===5?'全事件解決！':'順番に解決しよう')+'</span></div><div class="steps">'+STEPS.map(function(s,i){return '<article class="card step-card '+(i>0&&!state.story[i-1]?'locked':'')+'"><div class="num">'+s.icon+' '+(i+1)+'</div><h3>'+s.short+'</h3><span class="'+(state.story[i]?'pill':'muted')+'">'+(state.story[i]?'解決済み':i>0&&!state.story[i-1]?'🔒 前の事件から':'挑戦できる')+'</span></article>'}).join('')+'</div>');
}

function startStory(){mode='story';renderChapters()}
function renderChapters(){
  render('<div class="section-title"><h2>事件選択</h2><span class="muted">基本学習モード</span></div><div class="steps">'+STEPS.map(function(s,i){const open=i===0||state.story[i-1];return '<button class="card step-card '+(!open?'locked':'')+'" '+(open?'onclick="openStory('+i+')"':'')+'><div class="num">'+s.icon+' '+(i+1)+'</div><h3>'+s.title+'</h3><span class="'+(state.story[i]?'pill':'muted')+'">'+(state.story[i]?'解決済み':open?'調査開始':'🔒 前の事件を解決')+'</span></button>'}).join('')+'</div><div class="card" style="margin-top:18px"><h3>調査の進み具合</h3><div class="progress"><i style="width:'+(state.story.filter(Boolean).length*20)+'%"></i></div><p class="muted">'+state.story.filter(Boolean).length+'/5事件</p></div>');
}
function openStory(index){
  step=index;answered=false;current=null;queue=[];
  if(state.story[index]){beginStoryQuiz();return}
  const s=STEPS[index];
  render('<section class="card" style="max-width:820px;margin:auto"><div class="eyebrow">第'+(index+1)+'章　'+s.short+'</div><h2>'+s.title+'</h2><div class="case-file"><b>依頼状</b><p>'+s.intro+'</p></div><div class="insight"><b>今回の見方</b><p>'+chapterTip(index)+'</p></div><button class="btn primary" onclick="beginStoryQuiz()">調査をはじめる</button></section>');
}
function chapterTip(index){
  return ['点がどこに集まり、どこまで広がっているかを見る。','目的に合う代表値を選ぶ。平均値だけで決めない。','値を同じ幅の区間に分けて、数を整理する。','柱の高さだけでなく、山の形や広がりを見る。','データの集め方やグラフの見せ方まで確かめる。'][index];
}
function beginStoryQuiz(){queue=[getQuestion(step),getQuestion(step),getQuestion(step),getQuestion(step)];questionIndex=0;answered=false;renderQuiz()}
function showPracticeSelect(){
  mode='practice-select';
  render('<div class="section-title"><h2>名探偵への道</h2><span class="muted">鍛えたい章を選ぼう</span></div><div class="steps">'+STEPS.map(function(s,i){const n=state.ranks[i]||0;return '<button class="card step-card" onclick="startPractice('+i+')"><div class="num">'+s.icon+' '+(i+1)+'</div><h3>'+s.short+'</h3><span class="rank">'+rankName(n)+'</span><small class="muted">正解 '+n+'問</small></button>'}).join('')+'</div>');
}
function startPractice(index,pattern){
  mode='practice';step=index;practiceIndex=0;forcedPracticePattern=pattern||null;answered=false;nextPractice();
}
function nextPractice(){
  state.caseNo++;saveState();current=getQuestion(step,forcedPracticePattern);answered=false;renderQuiz();
}

function makeMCQ(pattern,text,options,correct,explain,visual){
  if(typeof correct!=='number'){visual=explain;explain=correct;correct=0}
  const pairs=options.map(function(value,index){return {value:String(value),correct:index===correct}}).filter(function(item,index,all){return all.findIndex(function(other){return other.value===item.value})===index});
  const shuffled=shuffle(pairs);
  return {kind:'mcq',pattern:pattern,text:text,choices:shuffled.map(function(item){return item.value}),answer:shuffled.findIndex(function(item){return item.correct}),explain:explain,visual:visual||''};
}
function dotData(){
  const values=[3,4,5,6,7,8,9],data=[];
  values.forEach(function(value){const times=value===6?rand(2,4):rand(0,3);for(let i=0;i<times;i++)data.push(value)});
  return data.sort(function(a,b){return a-b});
}
function dotVisual(data){
  const min=Math.min.apply(null,data),max=Math.max.apply(null,data);
  return '<div class="chart"><div class="dotplot">'+Array.from({length:max-min+1},function(_,i){const value=min+i;return '<div class="dot-col">'+Array.from({length:count(data,value)},function(){return '<i class="dot"></i>'}).join('')+'<span class="dot-label">'+value+'</span></div>'}).join('')+'</div></div>';
}
function histVisual(counts,labels){
  labels=labels||counts.map(function(_,i){return i*10+'〜'+(i*10+9)});
  return '<div class="chart"><div class="bars">'+counts.map(function(value,i){return '<div class="bar-col"><b style="height:'+value*15+'px"></b><span>'+labels[i]+'</span></div>'}).join('')+'</div></div>';
}
function tableVisual(data){
  return '<div class="chart"><table class="table"><tr><th>データ</th></tr><tr><td>'+data.slice().sort(function(a,b){return a-b}).join('、')+'</td></tr></table></div>';
}

function qDotMax(){const d=dotData(),answer=Math.max.apply(null,d);return makeMCQ('dot-max','このドットプロットの最大値はいくつですか。',[answer,Math.min.apply(null,d),answer-Math.min.apply(null,d),d.length],'最大値は、いちばん右にある点の値です。',dotVisual(d))}
function qDotMin(){const d=dotData(),answer=Math.min.apply(null,d);return makeMCQ('dot-min','このドットプロットの最小値はいくつですか。',[answer,Math.max.apply(null,d),Math.max.apply(null,d)-answer,d.length],'最小値は、いちばん左にある点の値です。',dotVisual(d))}
function qDotRange(){const d=dotData(),min=Math.min.apply(null,d),max=Math.max.apply(null,d),answer=max-min;return makeMCQ('dot-range','このドットプロットの範囲（最大値−最小値）はいくつですか。',[answer,max+min,d.length,answer+1],'範囲は、最大値'+max+'から最小値'+min+'をひいた値です。'+max+'−'+min+'='+answer+'。',dotVisual(d))}
function qDotSpread(){
  const a=[3,4,5,5,5,6,7],b=[1,2,4,5,6,8,9];
  return makeMCQ('dot-compare-spread','記録の散らばりがより大きいのは、どちらですか。',['A','B','同じ','データの個数が多い方'],1,'Aの範囲は4、Bの範囲は8です。範囲が大きいBの方が散らばりが大きいといえます。','<div class="chart"><b>A</b>'+dotVisual(a)+'<b>B</b>'+dotVisual(b)+'</div>');
}
function qDotBuild(){
  const values=[3,4,5,6,7],counts=values.map(function(){return rand(1,3)}),data=[];
  values.forEach(function(value,i){for(let n=0;n<counts[i];n++)data.push(value)});
  return {kind:'build-dot',pattern:'dot-build',text:'データをドットプロットに表しましょう。数直線の数をタップして、同じ数の点を積み上げます。',data:data,values:values,targetCounts:counts,explain:'同じ値のデータは、数直線の同じ場所に縦に積み上げます。'};
}

function repData(length){
  const other=[3,4,5,7,8],data=Array.from({length:length-2},function(){return choice(other)});data.push(6,6);return data.sort(function(a,b){return a-b});
}
function qMean(){
  let d,answer;do{d=repData(rand(5,7));answer=mean(d)}while(!Number.isInteger(answer));
  return makeMCQ('rep-mean','データ '+d.join('、')+' の平均値はいくつですか。',[answer,sum(d),d[0],d[d.length-1]],'合計'+sum(d)+'を個数'+d.length+'で割ります。'+sum(d)+'÷'+d.length+'='+answer+'。');
}
function qMedianOdd(){
  const d=repData(5),answer=d[2];
  return makeMCQ('rep-median-odd','データ '+d.join('、')+' の中央値はいくつですか。',[answer,d[1],d[3],mean(d)],'小さい順に並べたとき、中央にある1つの値が中央値です。');
}
function qMedianEven(){
  const d=repData(6),answer=(d[2]+d[3])/2;
  return makeMCQ('rep-median-even','データ '+d.join('、')+' の中央値はいくつですか。',[answer,d[2],d[3],mean(d)],'個数が偶数のときは、中央の2つの値の平均をとります。('+d[2]+'＋'+d[3]+')÷2='+answer+'。');
}
function qMode(){
  const d=[4,5,6,6,6,7,8];
  return makeMCQ('rep-mode','データ '+d.join('、')+' の最頻値はいくつですか。',[6,4,8,mean(d)],'最頻値は、最も多く現れる値です。6が3回で最も多く現れています。');
}
function qRepresentativeUse(){
  return makeMCQ('rep-use','靴屋が「一番多く売れたサイズ」を知りたいとき、最も役立つ代表値はどれですか。',['最頻値','平均値','中央値','範囲'],'最も多く現れる値を表す最頻値は、よく売れたサイズを知るのに向いています。');
}
function qOutlier(){
  const d=[4,5,5,6,6,7,30];
  return makeMCQ('rep-outlier','このデータで、30のような極端に大きい値の影響を受けにくい代表値はどれですか。',['中央値','平均値','最頻値だけ','範囲'],'極端な値があると平均値は大きく動きます。中央値は中央の位置を使うため、影響を受けにくいです。');
}

function frequencyData(){return Array.from({length:16},function(){return rand(1,30)})}
function qFreqClass(){
  const data=frequencyData(),low=choice([0,5,10,15]),high=low+5,answer=data.filter(function(x){return x>=low&&x<high}).length;
  return makeMCQ('freq-class','階級「'+low+'以上'+high+'未満」に入るデータの度数はいくつですか。',[answer,data.filter(function(x){return x>low&&x<=high}).length,high-low,data.length-answer],'「以上」は入れ、「未満」は入れません。'+low+'以上'+high+'未満の値を数えると'+answer+'個です。',tableVisual(data));
}
function qFreqBoundary(){
  return makeMCQ('freq-boundary','「10以上20未満」という階級に、20ちょうどのデータは入りますか。',['入らない','入る','度数が多ければ入る','平均値で決まる'],'「未満」はその数をふくみません。20ちょうどは次の階級に入ります。');
}
function qFreqWidth(){
  return makeMCQ('freq-width','「0以上5未満、5以上10未満…」の度数分布表で、階級の幅はいくつですか。',[5,10,1,0],'1つの階級がどこからどこまでかの幅を階級の幅といいます。ここでは5です。');
}
function qFreqTotal(){
  const counts=[3,5,4,6],answer=sum(counts);
  return makeMCQ('freq-total','度数分布表の4つの階級の度数が '+counts.join('、')+' のとき、全部のデータは何個ですか。',[answer,Math.max.apply(null,counts),counts.length,answer-1],'度数をすべて足すと、データの個数が分かります。'+counts.join('＋')+'='+answer+'。');
}

function qHistPeak(){
  const counts=[rand(2,4),rand(3,5),rand(7,9),rand(3,5),rand(2,4)],answer=2;
  return makeMCQ('hist-peak','このヒストグラムで、最も度数が多い階級はどれですか。',counts.map(function(_,i){return i*10+'〜'+(i*10+9)}),answer,'いちばん高い柱が、最も度数が多い階級です。',histVisual(counts));
}
function qHistShape(){
  const counts=[2,6,3,2,6,3];
  return makeMCQ('hist-shape','このヒストグラムの分布の形として最も近いものはどれですか。',['山が1つ','山が2つ','全部同じ高さ','右に行くほど必ず増える'],1,'高い柱のまとまりが左右に2つあるので、山が2つある分布です。',histVisual(counts));
}
function qHistSpread(){
  const a=[2,4,8,4,2],b=[5,5,5,5,5];
  return makeMCQ('hist-spread','散らばりがより大きいと考えられるのはどちらの分布ですか。',['A','B','同じ','度数が多い方'],'Aは中央に集まり、Bは全体に広がっています。横方向の広がりにも注目します。','<div class="chart"><b>A</b>'+histVisual(a)+'<b>B</b>'+histVisual(b)+'</div>');
}
function qHistRule(){
  return makeMCQ('hist-rule','ヒストグラムの柱と柱の間にすき間をあけないのはなぜですか。',['連続した区間の分布の形を見やすくするため','色をきれいに見せるため','度数を増やすため','棒グラフと同じにするため'],'ヒストグラムは連続した値を階級で区切ります。柱をつなげると分布の形が読み取りやすくなります。');
}

function qSample(){
  return makeMCQ('crit-sample','「町全体の人は、みんな毎日1時間運動する」と結論づけました。調査対象がクラスの友達10人だけなら、どう考えるのが妥当ですか。',['町全体と決めつけるには、調査対象がかたよっている可能性がある','10人調べたので必ず正しい','平均値だけ見れば十分','データは使わない'],'調査対象の人数や選び方を確かめ、町全体について言えるかを慎重に考えます。');
}
function qScale(){
  return makeMCQ('crit-scale','グラフの変化を実際より大きく見せないために、まず何を確認しますか。',['目盛りの間隔や省略がないか','柱の色だけ','タイトルの長さ','データを見ない'],'目盛りの幅や省略線によって印象が変わることがあります。');
}
function qConclusion(){
  const d=[4,5,5,6,6,7,28],average=mean(d),median=d[3];
  return makeMCQ('crit-conclusion','データ '+d.join('、')+' を見て「みんなの記録は'+average+'くらい」と言い切る前に、確認するとよい値はどれですか。',['中央値 '+median,'データの文字数','問題番号','グラフの色'],'28のような極端な値があるため、平均値だけでは分かりにくいことがあります。中央値も合わせて見ます。');
}
function qClassWidthEffect(){
  return makeMCQ('crit-class-width','同じデータでも階級の幅を変えると、ヒストグラムはどうなりますか。',['見える山や広がりの印象が変わることがある','必ず全く同じ形になる','データの個数が増える','平均値が必ず0になる'],'階級の幅で柱のまとまり方が変わります。目的に合う幅かを考えることが大切です。');
}

const GENERATORS=[
  { 'dot-max':qDotMax,'dot-min':qDotMin,'dot-range':qDotRange,'dot-compare-spread':qDotSpread,'dot-build':qDotBuild },
  { 'rep-mean':qMean,'rep-median-odd':qMedianOdd,'rep-median-even':qMedianEven,'rep-mode':qMode,'rep-use':qRepresentativeUse,'rep-outlier':qOutlier },
  { 'freq-class':qFreqClass,'freq-boundary':qFreqBoundary,'freq-width':qFreqWidth,'freq-total':qFreqTotal },
  { 'hist-peak':qHistPeak,'hist-shape':qHistShape,'hist-spread':qHistSpread,'hist-rule':qHistRule },
  { 'crit-sample':qSample,'crit-scale':qScale,'crit-conclusion':qConclusion,'crit-class-width':qClassWidthEffect }
];
const MINI_TO_PATTERN={'mini-spread':'dot-range','mini-representative':'rep-use','mini-class':'freq-boundary','mini-shape':'hist-rule','crit-class-width':'crit-class-width'};
function getQuestion(stepIndex,forcedPattern){
  const generators=GENERATORS[stepIndex];
  let pattern=forcedPattern;
  if(!pattern){
    const weak=Object.keys(state.patterns).filter(function(key){return key.startsWith('s'+(stepIndex+1)+'-')&&state.patterns[key].weak}).map(function(key){return key.slice(3)});
    pattern=weak.length&&Math.random()<.65?choice(weak):choice(Object.keys(generators));
  }
  pattern=MINI_TO_PATTERN[pattern]||pattern;
  return (generators[pattern]||generators[Object.keys(generators)[0]])();
}

function renderQuiz(){
  const q=current||(mode==='story'?queue[questionIndex]:null),s=STEPS[step];
  current=q;answered=false;
  const number=mode==='story'?'第'+(step+1)+'章　'+(questionIndex+1)+'/'+queue.length:'事件ファイル No.'+String(state.caseNo).padStart(3,'0')+'　（'+(practiceIndex+1)+'/5問）';
  const flavor=choice(s.flavor);
  let body='';
  if(q.kind==='build-dot'){
    buildCounts=q.values.map(function(){return 0});
    body='<div class="case-file"><b>作成ドリル</b><p>データ：'+q.data.join('、')+'</p></div><div class="build-board"><div id="buildDots">'+buildDotsMarkup(q)+'</div></div><p id="buildStatus" class="muted">数直線の数をタップして点を置こう。</p><button class="btn primary" onclick="checkBuild()">できた！判定する</button>';
  }else{
    body=(q.visual||'')+'<div class="choices">'+q.choices.map(function(c,i){return '<button class="choice" id="choice'+i+'" onclick="answerChoice('+i+')">'+esc(c)+'</button>'}).join('')+'</div>';
  }
  render('<section class="card question"><div class="q-head"><span class="q-number">'+number+'</span><span class="pill">'+s.short+'</span></div>'+(mode==='practice'?'<div class="case-file"><b>'+flavor+'</b>から届いた未解決事件。データを手がかりに調査しよう。</div>':'')+'<h2 class="q-title">'+q.text+'</h2>'+body+'<div id="feedback"></div></section>');
}
function buildDotsMarkup(q){
  return '<div class="build-axis">'+q.values.map(function(value,index){return '<div class="build-column"><div class="build-stack">'+Array.from({length:buildCounts[index]||0},function(){return '<i class="dot build-dot"></i>'}).join('')+'</div><div class="build-controls"><button class="axis-number minus" onclick="removeBuildDot('+index+')">−</button><span class="axis-number value">'+value+'</span><button class="axis-number" onclick="addBuildDot('+index+')">＋</button></div></div>'}).join('')+'</div>';
}
function addBuildDot(index){
  if(answered)return;buildCounts[index]++;document.querySelector('#buildDots').innerHTML=buildDotsMarkup(current);document.querySelector('#buildStatus').textContent='点を置きました。足りない数・多すぎる数がないか確かめよう。';
}
function removeBuildDot(index){
  if(answered||buildCounts[index]===0)return;buildCounts[index]--;document.querySelector('#buildDots').innerHTML=buildDotsMarkup(current);document.querySelector('#buildStatus').textContent='点を1つ減らしました。データの数と見比べよう。';
}
function checkBuild(){
  if(answered)return;
  const ok=current.targetCounts.every(function(n,i){return n===buildCounts[i]});
  if(ok){submitAnswer(true);return}
  record(current.pattern,false);
  const first=buildCounts.findIndex(function(n,i){return n!==current.targetCounts[i]});
  document.querySelector('#buildStatus').textContent=buildCounts[first]>current.targetCounts[first]?'この数の点が少し多いようです。データの数を数え直そう。':'この数の点がまだ足りないようです。データの数を数え直そう。';
}
function answerChoice(index){
  if(answered)return;
  const ok=index===current.answer;
  document.querySelectorAll('.choice').forEach(function(button,i){if(i===current.answer&&ok)button.classList.add('correct');if(i===index&&!ok)button.classList.add('wrong')});
  submitAnswer(ok);
}
function hintFor(pattern){
  if(pattern.startsWith('dot-'))return 'ドットの位置と、同じ数の点の数をもう一度見よう。';
  if(pattern.startsWith('rep-'))return '「何を知りたいか」と、代表値の意味を結び付けて考えよう。';
  if(pattern.startsWith('freq-'))return '階級の下の値は入れ、上の「未満」の値は入れないことを確かめよう。';
  if(pattern.startsWith('hist-'))return '柱の高さだけでなく、横への広がりや山のまとまりも見よう。';
  return '結論だけでなく、データの集め方や見せ方に目を向けよう。';
}
function retryCurrent(){answered=false;renderQuiz()}
function submitAnswer(ok){
  if(answered)return;answered=true;record(current.pattern,ok);
  if(!ok){
    const feedback=document.querySelector('#feedback');feedback.className='feedback bad';
    feedback.innerHTML='<b>おしい。まだ次の事件には進めません。</b><p><b>ヒント：</b>'+hintFor(current.pattern)+'</p><button class="btn primary" onclick="retryCurrent()">同じ問題にもう一度挑戦</button>';
    return;
  }
  let rankUp='';
  if(mode==='practice'){
    const before=rankName(state.ranks[step]);state.ranks[step]++;state.solved++;const after=rankName(state.ranks[step]);
    if(before!==after)rankUp='<div class="rank-up">🎉 '+after+'に昇格！<br><small>先輩探偵「その調子で、データの見方をみがこう！」</small></div>';
    if(state.ranks.every(function(n){return n>=200})&&!state.titles.includes('殿堂入り探偵'))state.titles.push('殿堂入り探偵');
    saveState();
  }
  const feedback=document.querySelector('#feedback');feedback.className='feedback ok';
  feedback.innerHTML='<b>正解！</b>'+rankUp+'<p>'+current.explain+'</p><button class="btn primary" onclick="afterAnswer()">'+(mode==='story'?(questionIndex<queue.length-1?'次の問題へ':'章末ミニ問題へ'):'次の事件を調べる')+'</button>';
}
function afterAnswer(){
  if(mode==='story'){if(questionIndex<queue.length-1){questionIndex++;current=queue[questionIndex];renderQuiz()}else renderMini();return}
  if(practiceIndex<4){practiceIndex++;nextPractice()}else renderPracticeResult();
}
function renderPracticeResult(){
  render('<section class="result-card card"><div style="font-size:4rem">🕵️</div><div class="eyebrow">5問セッション完了</div><h2>'+STEPS[step].short+'の調査結果</h2><p>5問の調査を終えました。間違えた問題も、次の出題で手がかりとして活用されます。</p><div class="case-file"><b>現在のランク</b><p class="rank">'+rankName(state.ranks[step])+'　／　累積正解 '+state.ranks[step]+'問</p></div><button class="btn primary" onclick="startPractice('+step+')">もう5問調べる</button><button class="btn ghost" onclick="showPracticeSelect()">章選択へ</button><button class="btn" onclick="showNotebook()">探偵手帳を見る</button></section>');
}
function record(pattern,ok){
  const key='s'+(step+1)+'-'+pattern,p=state.patterns[key]||{wrong:0,right:0,weak:false};
  if(ok){p.right++;p.wrong=0;if(p.right>=2)p.weak=false}else{p.wrong++;p.right=0;if(p.wrong>=3)p.weak=true}
  state.patterns[key]=p;saveState();
}

function miniQuestion(index){
  return [
    function(){return makeMCQ('mini-spread','記録の散らばりを比べるときに使える値はどれですか。',['範囲','最頻値','階級の幅','調査人数'],0,'最大値と最小値の差である範囲を見ると、データがどれくらい広がっているか分かります。')},
    function(){return makeMCQ('mini-representative','靴屋が「一番多く売れたサイズ」を知りたいとき、どの代表値が役立ちますか。',['最頻値','平均値','中央値','範囲'],0,'最も多く現れる値を表す最頻値が役立ちます。')},
    function(){return makeMCQ('mini-class','「10分以上20分未満」という階級に、20分ちょうどのデータは入りますか。',['入らない','入る','データが多いと入る','平均値によって決まる'],0,'「未満」はその数をふくみません。20分は次の階級に入ります。')},
    function(){return makeMCQ('mini-shape','ヒストグラムの柱と柱の間にすき間をあけないのはなぜですか。',['分布の形を見やすくするため','色をきれいに見せるため','棒グラフと同じにするため','度数を増やすため'],0,'連続した区間の分布を表すため、柱をつなげて形を読み取ります。')},
    function(){return qClassWidthEffect()}
  ][index]();
}
function renderMini(){
  current=miniQuestion(step);renderMiniCurrent();
}
function renderMiniCurrent(){
  answered=false;
  render('<section class="card question"><div class="eyebrow">章末ミニ問題</div><h2 class="q-title">'+current.text+'</h2><div class="choices">'+current.choices.map(function(c,i){return '<button class="choice" onclick="answerMini('+i+')">'+esc(c)+'</button>'}).join('')+'</div><div id="feedback"></div></section>');
}
function answerMini(index){
  if(answered)return;const ok=index===current.answer;document.querySelectorAll('.choice').forEach(function(button,i){if(i===current.answer&&ok)button.classList.add('correct');if(i===index&&!ok)button.classList.add('wrong')});answered=true;record(current.pattern,ok);
  const feedback=document.querySelector('#feedback');
  if(!ok){feedback.className='feedback bad';feedback.innerHTML='<b>おしい。章を解決するには正解が必要です。</b><p><b>ヒント：</b>'+hintFor(current.pattern)+'</p><button class="btn primary" onclick="renderMiniCurrent()">もう一度考える</button>';return}
  feedback.className='feedback ok';feedback.innerHTML='<b>正解！</b><p>'+current.explain+'</p><button class="btn primary" onclick="finishStory()">事件解決へ</button>';
}
function finishStory(){
  state.story[step]=true;saveState();
  if(step===4){render('<section class="result-card card"><div style="font-size:4rem">🏆</div><div class="eyebrow">全事件解決</div><h2>事件解決レポート</h2><p>5つの事件を通して、データを整理し、特徴を見つけ、根拠を確かめる力を身につけました。</p><div class="case-file"><b>探偵団の結論</b><p>平均値だけで決めつけず、分布の形、中央値、調査対象、目盛りにも目を向けると、より妥当な判断ができます。</p></div><button class="btn gold" onclick="showPracticeSelect()">名探偵への道へ</button><button class="btn ghost" onclick="showNotebook()">探偵手帳を見る</button></section>');return}
  render('<section class="result-card card"><div style="font-size:4rem">🗂️</div><div class="eyebrow">事件解決</div><h2>'+STEPS[step].title+'を解決！</h2><p>手がかりカード「'+STEPS[step].short+'」を探偵手帳に保存しました。</p><button class="btn primary" onclick="openStory('+(step+1)+')">次の事件へ</button></section>');
}
function rankName(n){return n>=200?'伝説の探偵':n>=100?'名探偵':n>=50?'ベテラン探偵':n>=20?'一人前探偵':'見習い探偵'}
function patternLabel(id){
  const labels={
    's1-dot-max':'ドットプロット：最大値','s1-dot-min':'ドットプロット：最小値','s1-dot-range':'ドットプロット：範囲','s1-dot-compare-spread':'ドットプロット：散らばり比較','s1-dot-build':'ドットプロット：作成',
    's2-rep-mean':'代表値：平均値','s2-rep-median-odd':'代表値：中央値（奇数個）','s2-rep-median-even':'代表値：中央値（偶数個）','s2-rep-mode':'代表値：最頻値','s2-rep-use':'代表値：使い分け','s2-rep-outlier':'代表値：極端な値',
    's3-freq-class':'度数分布表：階級の度数','s3-freq-boundary':'度数分布表：以上・未満','s3-freq-width':'度数分布表：階級の幅','s3-freq-total':'度数分布表：合計',
    's4-hist-peak':'ヒストグラム：山の頂上','s4-hist-shape':'ヒストグラム：山の数','s4-hist-spread':'ヒストグラム：広がり','s4-hist-rule':'ヒストグラム：柱の意味',
    's5-crit-sample':'結論：調査対象','s5-crit-scale':'結論：目盛り','s5-crit-conclusion':'結論：代表値の吟味','s5-crit-class-width':'結論：階級の幅'
  };
  return labels[id]||id;
}
function startWeakPractice(index,pattern){startPractice(Number(index),pattern)}
function showNotebook(){
  const chapters=STEPS.map(function(s,i){const n=state.ranks[i]||0;return '<article class="card"><div class="bar"><b>Step '+(i+1)+'　'+s.short+'</b><span class="rank">'+rankName(n)+'</span></div><p class="muted">累積正解 '+n+'問　／　解決済み事件 '+n+'件</p><div class="progress"><i style="width:'+Math.min(100,n/2)+'%"></i></div><button class="btn primary" style="margin-top:12px" onclick="startPractice('+i+')">この章を特訓</button></article>'}).join('');
  const weak=Object.entries(state.patterns).filter(function(pair){return pair[1].weak}).map(function(pair){const id=pair[0],p=pair[1],index=Number(id[1])-1;return '<div class="weak"><span><b>'+patternLabel(id)+'</b><br><small>連続'+p.wrong+'回不正解</small></span><button class="btn" data-step="'+index+'" data-pattern="'+id.slice(3)+'" onclick="startWeakPractice(this.dataset.step,this.dataset.pattern)">特訓</button></div>'}).join('')||'<div class="empty">まだ未解決事件はありません。間違いも大切な手がかりです。</div>';
  render('<div class="section-title"><h2>探偵手帳</h2><span class="muted">調査の記録</span></div><div class="grid">'+chapters+'</div><section class="card" style="margin-top:18px"><h3>未解決事件（にがてパターン）</h3><div class="note-list">'+weak+'</div></section><section class="card" style="margin-top:18px"><h3>称号</h3><p>'+(state.titles.includes('殿堂入り探偵')?'<span class="pill gold">殿堂入り探偵</span>':'5つの章すべてで伝説の探偵を目指そう。')+'</p></section>');
}
function renderHome(){
  const cleared=state.story.filter(Boolean).length;
  const chapters=STEPS.map(function(s,i){
    const open=i===0||state.story[i-1];
    return '<button class="card step-card '+(!open?'locked':'')+'" '+(open?'onclick="openStory('+i+')"':'disabled')+'><div class="num">'+s.icon+' '+(i+1)+'</div><h3>'+s.short+'</h3><span class="'+(state.story[i]?'pill':'muted')+'">'+(state.story[i]?'解決済み':open?'この事件へ':'🔒 前の事件から')+'</span></button>';
  }).join('');
  render('<section class="hero"><div class="eyebrow">CASE FILE 000　データ活用調査本部</div><h2>町のデータ探偵団</h2><p>町に届く「本当かな？」を、データという手がかりで解決しよう。5つの事件を調べながら、データの見方を身につけます。</p><div class="top-actions"><button class="btn primary" onclick="startStory()">'+(cleared?'物語をつづける':'基本学習をはじめる')+'</button><button class="btn gold" onclick="showPracticeSelect()">名探偵への道</button></div></section><div class="grid"><article class="card mode-card"><div><div class="mode-icon">📖</div><h3>基本学習モード</h3><p class="muted">物語を追いながら、5つの事件を順番に解決します。</p></div><span class="pill">'+cleared+'/5章クリア</span></article><article class="card mode-card"><div><div class="mode-icon">🕵️</div><h3>練習モード</h3><p class="muted">名探偵への道は最初から挑戦できます。5問ごとに結果を確認します。</p></div><span class="pill gold">5問セッション</span></article></div><div class="section-title"><h2>事件ファイル</h2><span class="muted">カードを押して調査へ</span></div><div class="steps">'+chapters+'</div>');
}
renderHome();
