(async function(){
  const folder='https://api.github.com/repos/WonderWaage/WonderWaage.github.io/contents/ord-salat/pakker?ref=master';
  window.ORDSALAT_PACKS=[];
  let files=['pakker/start-300.js'];
  try{
    const response=await fetch(folder,{cache:'no-store'});
    if(response.ok){
      const listing=await response.json();
      const discovered=listing.filter(f=>f.type==='file'&&/^[-a-zA-Z0-9_]+\\.js$/.test(f.name)).map(f=>'pakker/'+f.name).sort();
      if(discovered.length)files=discovered.sort((a,b)=>a.endsWith('/start-300.js')?-1:b.endsWith('/start-300.js')?1:a.localeCompare(b));
    }
  }catch(e){console.warn('Pakkelisten kunne ikke indlæses; bruger startpakken.',e);}
  const load=src=>new Promise((resolve,reject)=>{
    const tag=document.createElement('script');tag.src=src;tag.onload=resolve;tag.onerror=()=>reject(Error(src));document.body.append(tag);
  });
  for(const file of files){try{await load(file+'?v='+Date.now());}catch(e){console.warn('Pakken kunne ikke indlæses:',file,e);}}
  const seen=new Set(), all=[];
  for(const p of [...(window.ORDSALAT_PUZZLES||[]),...(window.ORDSALAT_PACKS||[]).flat()]){
    if(p&&typeof p.id==='string'&&!seen.has(p.id)&&window.SaladEngine.validatePuzzle(p)){seen.add(p.id);all.push(p);}
  }
  window.ORDSALAT_PUZZLES=all;
  await load(document.body.dataset.page==='editor'?'editor.js':'game.js');
})().catch(console.error);
