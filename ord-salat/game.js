(function () {
'use strict';
const E = window.SaladEngine;
const $ = id => document.getElementById(id);
const builtIn = (window.ORDSALAT_PUZZLES || []).filter(E.validatePuzzle);
const params = new URLSearchParams(location.search);
let puzzle = null, board = [], found = [], hints = 0, selection = [], hintedCell = -1, dragId = null, dragMoved = false, elapsedSeconds = 0, msg = '', msgKind = '', hintWord = '', revealedHints = 0, hintPath = [];
const STORAGE = 'ord-salat-state-v1:';
function safeRead(key) {try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
function safeWrite(key, data) {try{localStorage.setItem(key, JSON.stringify(data))}catch{}}
function signature(p) {return p.grid.join('') + ':' + p.words.join('|')}
function savedProgress(p) {
  const save = safeRead(STORAGE + p.id);
  if (!save || save.signature !== signature(p)) return null;
  return save;
}
function start(p) {
  puzzle = p; selection=[]; hintedCell=-1;dragId=null;hintWord='';revealedHints=0;hintPath=[];
  const save = savedProgress(p);
  board = save && Array.isArray(save.board) && save.board.length===16 ? save.board : p.grid.map((ch,i)=>({ch,id:i}));
  found = save && Array.isArray(save.found) ? save.found.filter(w=>p.words.includes(w)) : [];
  hints = save && Number.isFinite(save.hints) ? save.hints : 0;
  hintWord = save && p.words.includes(save.hintWord) && !found.includes(save.hintWord) ? save.hintWord : '';
  revealedHints = hintWord ? Math.min(Number(save.revealedHints)||0,hintWord.length) : 0;
  hintPath = hintWord ? (E.findPaths(board.map(t=>t?.ch||null),hintWord,1)[0]||[]) : [];
  elapsedSeconds = save && Number.isFinite(save.elapsedSeconds) ? save.elapsedSeconds : 0;
  msg = ''; msgKind='';
  history.replaceState(null, '', location.pathname + '?p=' + encodeURIComponent(p.id));
  render();
}
function remember() {safeWrite(STORAGE + puzzle.id, {signature:signature(puzzle),board,found,hints,elapsedSeconds,hintWord,revealedHints});}
function remaining() {return puzzle.words.filter(w=>!found.includes(w))}
function clock() {const m=Math.floor(elapsedSeconds/60);const sec=elapsedSeconds%60;return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
function possible(tiles, words){
  if (puzzle.words.join('').length===16) return !!E.solve(tiles,words,new Set(),{visits:0,max:35000});
  return words.every(word=>E.findPaths(tiles, word, 1).length > 0);
}
function settleSelection(indices, remainingWords){
  if (!remainingWords.length) return Array(16).fill(null);
  let result=board.slice();
  // A correct word always counts. Remove used tiles where doing so keeps every remaining answer traceable.
  // As in Word Salad, letters shared by other answers may remain on the board.
  const tryClear = picks => E.falling(result, picks);
  const whole=tryClear(indices);
  if(possible(whole.map(t=>t?.ch||null),remainingWords))return whole;
  // For overlapping answers, keep letters that later words still require.
  const removed=[];
  for(const i of indices){
    const candidate=removed.concat(i), next=tryClear(candidate);
    if(possible(next.map(t=>t?.ch||null),remainingWords))removed.push(i);
  }
  return tryClear(removed);
}
function letters() {return board.map(tile=>tile?tile.ch:null)}
function setMessage(text, kind='') {msg=text;msgKind=kind;$('feedback').textContent=msg;$('feedback').className='feedback '+kind;}
function currentText(){const t=selection.map(i=>board[i]?.ch||'').join('');$('current-word').textContent=t||'Vælg et bogstav for at begynde';$('current-word').classList.toggle('empty',!t);}
function makeLine() {
  const bounds=$('board').getBoundingClientRect();
  const points=selection.map(i=>{
    const tile=$('board').querySelector(`[data-index="${i}"]`);
    if (!tile) return null;
    const rect=tile.getBoundingClientRect();
    return `${(rect.left+rect.width/2-bounds.left).toFixed(1)},${(rect.top+rect.height/2-bounds.top).toFixed(1)}`;
  }).filter(Boolean).join(' ');
  $('lines').setAttribute('viewBox',`0 0 ${Math.max(bounds.width,1)} ${Math.max(bounds.height,1)}`);
  $('path-line').setAttribute('points',points);
}
function paintSelection() {
  $('board').querySelectorAll('.tile').forEach(el=>{
    const i=Number(el.dataset.index);
    el.classList.toggle('selected',selection.includes(i));
    el.classList.toggle('hinted',hintPath.slice(0,revealedHints).includes(i));
  });
  currentText();makeLine();
}
function renderBoard(previous=null) {
  const root=$('board');root.replaceChildren();
  board.forEach((tile,i)=>{
    if(!tile){const empty=document.createElement('div');empty.className='tile-empty';empty.setAttribute('aria-hidden','true');root.appendChild(empty);return;}
    const btn=document.createElement('button');btn.type='button';btn.className='tile';btn.dataset.index=String(i);btn.dataset.tileId=String(tile.id);btn.textContent=tile.ch;
    btn.setAttribute('aria-label',`Række ${Math.floor(i/4)+1}, kolonne ${i%4+1}: ${tile.ch}`);
    btn.addEventListener('pointerdown',onPointerDown);
    btn.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();addTile(i);paintSelection();acceptIfComplete();}});
    root.appendChild(btn);
  });
  paintSelection();
  if(previous && typeof Element.prototype.animate==='function') {
    const bounds=root.getBoundingClientRect();
    const gap=parseFloat(getComputedStyle(root).columnGap)||0;
    const cell=(bounds.width-gap*3)/4 + gap;
    root.querySelectorAll('.tile').forEach(el=>{
      const id=Number(el.dataset.tileId), old=previous.findIndex(t=>t && t.id===id), now=Number(el.dataset.index);
      if(old>=0 && old!==now){const dy=(Math.floor(old/4)-Math.floor(now/4))*cell;
        if(dy!==0) el.animate([{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.23,.95,.4,1)'});
      }
    });
  }
}
function render() {
  $('theme').textContent=puzzle.theme;
  $('hint').textContent=puzzle.hint||'Find ordene, der passer til temaet.';
  $('eyebrow').textContent='Dansk ordsalat · 4 × 4';
  $('progress').innerHTML='Fundet: <strong>'+found.length+' af '+puzzle.words.length+'</strong>';
  $('status').textContent=hints+' hint brugt';
  $('timer').textContent=clock();
  const lengths=$('lengths');lengths.replaceChildren();
  puzzle.words.map((word,i)=>({word,i})).sort((a,b)=>a.word.length-b.word.length).forEach(({word})=>{
    const span=document.createElement('span');span.className='length'+(found.includes(word)?' found':'');span.textContent=found.includes(word)?word:word.length;span.title=found.includes(word)?'Fundet: '+word:word.length+' bogstaver';lengths.appendChild(span);
  });
  renderBoard();
  $('feedback').textContent=msg||'Træk over bogstaver, også på skrå.';$('feedback').className='feedback '+msgKind;
  $('victory').hidden=found.length!==puzzle.words.length;
  if(found.length===puzzle.words.length){$('victory').innerHTML='<div class="success-card"><h2>🎉 Flot klaret!</h2><p>Du fandt alle '+puzzle.words.length+' ord på '+clock()+' med '+hints+' hint. Vælg en ny opgave til højre.</p></div>';}
  $('archive').replaceChildren();
  builtIn.forEach((p,index)=>{
    const finished=savedProgress(p)?.found?.length===p.words.length;
    const btn=document.createElement('button');btn.className='archive-item'+(p.id===puzzle.id?' active':'');btn.type='button';
    const left=document.createElement('span');left.innerHTML='';
    const name=document.createElement('span');name.className='archive-name';name.textContent=(index+1)+'. '+p.theme;
    const sub=document.createElement('span');sub.className='archive-sub';sub.textContent=p.words.length+' ord';left.append(name,sub);btn.append(left);
    if(finished){const check=document.createElement('span');check.className='archive-check';check.textContent='✓';btn.append(check);}
    btn.addEventListener('click',()=>start(p));$('archive').append(btn);
  });
}
function addTile(i) {
  if (!board[i] || remaining().length===0) return;
  if(selection.length===0){selection=[i];return;}
  const last=selection[selection.length-1];
  if(i===last)return;
  if(selection.length>1&&i===selection[selection.length-2]){selection.pop();return;}
  if(selection.includes(i)||!E.isNeighbor(last,i)){
    if(dragId===null) selection=[i];
    return;
  }
  selection.push(i);
}
function onPointerDown(ev) {
  if(ev.button!==0&&ev.pointerType==='mouse')return;
  ev.preventDefault();dragId=ev.pointerId;dragMoved=false;
  addTile(Number(ev.currentTarget.dataset.index));paintSelection();
}
function onPointerMove(ev) {
  if(dragId!==ev.pointerId)return;
  const el=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.tile');
  if(!el||!$('board').contains(el))return;
  const i=Number(el.dataset.index), old=selection.join(',');
  addTile(i);
  if(selection.join(',')!==old)dragMoved=true;
  paintSelection();
}
function onPointerEnd(ev){
  if(dragId!==ev.pointerId)return;
  dragId=null;
  acceptIfComplete();
}
// Keep incomplete selections visible. Accept only a complete remaining answer.
function acceptIfComplete(){
  if (!selection.length || !puzzle) return false;
  const text=selection.map(i=>board[i]?.ch||'').join('');
  if (!remaining().includes(text)) return false;
  const before=board.slice();
  const left=remaining().filter(w=>w!==text);
  board=settleSelection(selection,left);
  found.push(text);
  selection=[];hintedCell=-1;hintWord='';revealedHints=0;hintPath=[];
  msg='Godt fundet: '+text+'!';msgKind='success';
  remember();render();renderBoard(before);
  return true;
}
function showHint() {
  if(!remaining().length)return;
  const available=remaining().map(word=>({word,path:E.findPaths(letters(),word,1)[0]})).filter(x=>x.path?.length);
  if(!available.length){setMessage('Ingen mulige ord lige nu. Start opgaven forfra.','error');return;}
  if(!hintWord || revealedHints>=hintWord.length || !available.some(x=>x.word===hintWord)){
    const next=available.slice().sort((a,b)=>a.word.length-b.word.length)[0];
    hintWord=next.word;hintPath=next.path;revealedHints=0;
  } else {
    hintPath=available.find(x=>x.word===hintWord).path;
  }
  if(revealedHints<hintWord.length){revealedHints++;hints++;}
  remember();
  paintSelection();
  $('status').textContent=hints+' hint brugt';
  const display=Array.from(hintWord).map((ch,i)=>i<revealedHints?ch:'_').join(' ');
  setMessage('Hint: '+display+' ('+revealedHints+' af '+hintWord.length+' bogstaver)');
}
window.addEventListener('pointermove',onPointerMove);
window.addEventListener('pointerup',onPointerEnd);
window.addEventListener('pointercancel',()=>{dragId=null;paintSelection();});
window.addEventListener('resize',makeLine);
window.addEventListener('keydown',e=>{if(e.key==='Escape'){selection=[];paintSelection();}else if(e.key==='Enter'&&e.target.tagName!=='BUTTON'){acceptIfComplete();}});
setInterval(()=>{if(puzzle && remaining().length && document.visibilityState==='visible'){elapsedSeconds++;$('timer').textContent=clock();if(elapsedSeconds%5===0)remember();}},1000);

$('clear').addEventListener('click',()=>{selection=[];setMessage('Vælg et nyt ord.');paintSelection();});
$('hint-btn').addEventListener('click',showHint);
$('restart').addEventListener('click',()=>{if(!puzzle||!confirm('Vil du starte puslespillet forfra?'))return;try{localStorage.removeItem(STORAGE+puzzle.id)}catch{}start(puzzle);});
if(!builtIn.length){$('theme').textContent='Ingen puslespil endnu';$('hint').textContent='Åbn “Lav puslespil” for at lave det første.';$('check').disabled=true;$('hint-btn').disabled=true;}
else{start(builtIn.find(p=>p.id===params.get('p'))||builtIn[0]);}
})();
