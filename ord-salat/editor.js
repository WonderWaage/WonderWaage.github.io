(function () {
'use strict';
const E=window.SaladEngine, $=id=>document.getElementById(id);
const STORAGE='ord-salat-editor-v1';
const published=(window.ORDSALAT_PUZZLES||[]).filter(E.validatePuzzle);
let puzzles,selected=null;
try {const raw=JSON.parse(localStorage.getItem(STORAGE));puzzles=Array.isArray(raw)?raw.filter(E.validatePuzzle):published.slice();}
catch {puzzles=published.slice();}
function store(){try{localStorage.setItem(STORAGE,JSON.stringify(puzzles))}catch{}}
function words(){return $('words-in').value.split(/[\n,;]+/).map(E.normalizeWord).filter(Boolean);}
function meter(){const n=words().reduce((sum,w)=>sum+E.countLetters(w),0);$('letter-total').textContent=n+' bogstaver';$('letter-total').className=n>=16&&n<=48?'good':'bad';}
function say(text,error=false){$('editor-message').textContent=text;$('editor-message').className='editor-message'+(error?' error':'');}
function preview(p){
 selected=p;$('preview-title').textContent=p?p.theme+' · '+p.words.length+' ord':'Tryk på “Generer puslespil”.';
 const root=$('mini-board');root.replaceChildren();
 for(let i=0;i<16;i++){const div=document.createElement('div');div.className='mini-tile'+(!p?' blank':'');div.textContent=p?p.grid[i]:'·';root.append(div);}
 $('play-preview').disabled=!p;
}
function drawList(){
 $('puzzle-count').textContent='('+puzzles.length+')';const root=$('draft-list');root.replaceChildren();
 if(!puzzles.length){const p=document.createElement('p');p.className='side-copy';p.textContent='Endnu ingen puslespil.';root.append(p);return;}
 puzzles.forEach((p,index)=>{
   const row=document.createElement('div');row.className='draft';
   const view=document.createElement('button');view.type='button';view.className='btn btn-small';view.style.flex='1';view.style.justifyContent='flex-start';view.style.textAlign='left';
   const label=document.createElement('span');const strong=document.createElement('strong');strong.textContent=p.theme;
   const small=document.createElement('small');small.textContent=p.words.length+' ord · '+p.words.join(', ');label.append(strong,small);view.append(label);
   view.addEventListener('click',()=>preview(p));
   const del=document.createElement('button');del.className='btn btn-small btn-danger';del.textContent='Fjern';del.type='button';del.setAttribute('aria-label','Fjern '+p.theme);
   del.addEventListener('click',()=>{if(!confirm('Fjerne “'+p.theme+'” fra samlingen?'))return;puzzles.splice(index,1);if(selected?.id===p.id)preview(null);store();drawList();say('Puslespillet er fjernet fra din lokale samling. Hent puzzles.js for at opdatere hjemmesiden.');});
   row.append(view,del);root.append(row);
 });
}
function download(name,content,type){const blob=new Blob([content],{type});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),2000);}
$('generate').addEventListener('click',()=>{
 try{
   const p=E.makePuzzle($('theme-in').value,$('hint-in').value,words());
   puzzles.push(p);store();drawList();preview(p);say('Puslespillet er klar og gemt på denne enhed. Hent puzzles.js for at udgive det.');
 }catch(err){say(err.message,true);}
});
$('play-preview').addEventListener('click',()=>{
 if(!selected)return;
 // Preview the *exact* generated grid, using the actual game, without publishing it.
 try{localStorage.setItem('ord-salat-preview-v1',JSON.stringify(selected));}catch{}
 window.open('preview.html','_blank','noopener');
});
$('download-js').addEventListener('click',()=>{
 if(!puzzles.length){say('Du har ingen puslespil at hente.',true);return;}
 download('puzzles.js','window.ORDSALAT_PUZZLES = '+JSON.stringify(puzzles,null,2)+';\n','text/javascript;charset=utf-8');
 say('puzzles.js er hentet. Upload den til dit GitHub-lager for at udgive ændringerne.');
});
$('download-json').addEventListener('click',()=>{download('ord-salat-sikkerhedskopi.json',JSON.stringify(puzzles,null,2)+'\n','application/json;charset=utf-8');say('Sikkerhedskopien er hentet.');});
$('import-json').addEventListener('change',async ev=>{
 const file=ev.target.files?.[0];if(!file)return;
 try{const data=JSON.parse(await file.text());const list=Array.isArray(data)?data:data.puzzles;
  if(!Array.isArray(list)||!list.every(E.validatePuzzle))throw new Error('Filen indeholder ikke gyldige 4×4-puslespil.');
  if(!confirm('Erstat din nuværende samling med de '+list.length+' puslespil fra filen?'))return;
  puzzles=list;store();drawList();preview(null);say('Sikkerhedskopien er indlæst.');
 }catch(err){say('Kunne ikke indlæse filen: '+err.message,true);}finally{ev.target.value='';}
});
$('words-in').addEventListener('input',meter);
$('theme-in').addEventListener('input',()=>say(''));
meter();preview(null);drawList();
})();
