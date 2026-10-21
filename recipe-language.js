(()=>{
  const cache=new Map(),pending=new Map();let generation=0,detail=null,editorToken=0;
  try{for(const [k,v] of JSON.parse(localStorage.getItem('sl_translations_v1')||'[]'))cache.set(k,v)}catch{}
  const language=()=>window.SaboresLanguage.get();
  const message=()=>language()==='fr'?'Traduction indisponible. Le texte original est affiché. Réessayez plus tard.':'Tradução indisponível. É apresentado o texto original. Tenta novamente mais tarde.';
  function source(r){if(r.language)return r.language;const text=[r.name,r.description,...(r.steps||[])].join(' ').toLowerCase();const scores={fr:(text.match(/\b(avec|dans|ajouter|faites|cuire|mélanger|préchauffer|une|les|puis)\b/g)||[]).length,pt:(text.match(/\b(com|uma|junte|adicione|misture|cozinhe|forno|depois|coloque|para)\b/g)||[]).length,en:(text.match(/\b(the|with|add|cook|mix|preheat|then|into|until|stir)\b/g)||[]).length};const best=Object.keys(scores).sort((a,b)=>scores[b]-scores[a])[0];return scores[best]>1?best:((r.externalId||r.source==='online')?'en':'pt')}
  function key(r){return JSON.stringify([language(),source(r),r.name,r.category,r.time,r.description,r.notes,r.ingredients,r.steps])}
  function fields(r){const f=[];for(const k of ['name','category','time','description','notes'])if(r[k])f.push([r,k]);for(const ing of r.ingredients||[])for(const k of ['name','qty'])if(ing[k])f.push([ing,k]);for(let i=0;i<(r.steps||[]).length;i++)f.push([r.steps,i]);return f}
  async function translated(r){
    if(source(r)===language())return r;
    const k=key(r);if(cache.has(k))return cache.get(k);if(pending.has(k))return pending.get(k);
    const target=language(),src=source(r);
    const job=(async()=>{const copy=JSON.parse(JSON.stringify(r)),entries=fields(copy),pieces=[];
      for(const [obj,k] of entries){const words=String(obj[k]).match(/\S+\s*/g)||[];let part='',chunks=[];for(const word of words){if(part.length+word.length>280&&part){chunks.push(part);part=''}if(word.length>280){if(part){chunks.push(part);part=''}for(let n=0;n<word.length;n+=280)chunks.push(word.slice(n,n+280))}else part+=word}if(part)chunks.push(part);const values=[];chunks.forEach((text,j)=>pieces.push({text,write:value=>{values[j]=value;obj[k]=values.join(' ')}}))}

      for(let i=0;i<pieces.length;i+=6){const batch=pieces.slice(i,i+6),texts=batch.map(p=>p.text);
        const res=await fetch('/.netlify/functions/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({texts,source:src,target})});
        if(!res.ok)throw Error('translate');const data=await res.json();if(data.texts?.length!==batch.length)throw Error('translate');
        batch.forEach((p,j)=>p.write(data.texts[j]));
      }
      copy.language=target;cache.set(k,copy);try{const entries=[...cache].slice(-80);localStorage.setItem('sl_translations_v1',JSON.stringify(entries))}catch{}return copy;
    })();pending.set(k,job);try{return await job}finally{pending.delete(k)}
  }
  let reported=0;function fail(){if(Date.now()-reported>5000){toast(message());reported=Date.now()}}
  const baseCard=card;
  card=function(r,ext=false){const k=key(r),v=cache.get(k)||r;const html=baseCard(v,ext);if(source(r)===language()||cache.has(k))return html;
    const token='translation-'+(++generation),wrapper=document.createElement('div');wrapper.innerHTML=html;wrapper.firstElementChild.dataset.translation=token;
    translated(r).then(copy=>{const el=document.querySelector('[data-translation="'+token+'"]');if(el&&key(r)===k){el.outerHTML=baseCard(copy,ext)}}).catch(fail);return wrapper.innerHTML;
  };
  const baseShow=show;let detailToken=0;
  show=async function(r,ext){detail={r,ext};const token=++detailToken,k=key(r);baseShow(r,ext);try{const copy=await translated(r);if(token===detailToken&&k===key(r)&&$('#detail').open){$('#detail').close();baseShow(copy,ext)}}catch{fail()}};
  const baseEditor=openEditor;
  openEditor=async function(r=null){const token=++editorToken,target=language();if(!r)return baseEditor(r);let copy=r;try{copy=await translated(r)}catch{fail()}if(token===editorToken&&target===language())baseEditor(copy)};
  document.addEventListener('sabores:language',()=>{generation++;render();for(const grid of ['searchResults','portugueseRecipes']){const el=document.getElementById(grid);if(el)el.innerHTML=[...el.querySelectorAll('[onclick^="openOnline"]')].map(btn=>{const i=btn.getAttribute('onclick').match(/'([^']+)'/)?.[1];return window.online?.[i]}).filter(Boolean).map(r=>card(r,true)).join('')}if(detail&&$('#detail').open)show(detail.r,detail.ext)});
  // Recipe originals and quantities stay intact in storage when only viewing a translation.
  const baseShop=renderShop;
  renderShop=function(){baseShop();const rows=[...document.querySelectorAll('.shop-row')];shop.forEach((item,i)=>{if(!rows[i])return;const k=language();translated({name:item.name,time:item.qty,language:item.language||'pt'}).then(copy=>{if(language()===k&&rows[i].isConnected){rows[i].querySelector('b').textContent=copy.name;rows[i].querySelector('.muted').textContent=copy.time||''}}).catch(fail)})};
  const searchSubmit=$('#searchForm').onsubmit;
  $('#searchForm').onsubmit=async function(e){e.preventDefault();const input=$('#searchInput'),original=input.value,target=language();if(!original.trim())return;
    try{const res=await fetch('/.netlify/functions/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({texts:[original],source:target,target:'en'})});if(!res.ok)throw Error('translate');const data=await res.json();input.value=data.texts[0];await searchSubmit.call(this,e)}catch{fail()}finally{input.value=original}
  };
  window.SaboresRecipes={translated};
  Object.assign(window,{openOnline,openRecipe,editRecipe});render();
})();
