const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const K={r:'sl_recipes',s:'sl_shop',t:'sl_theme'};let recipes=load(K.r,[]),shop=load(K.s,[]),myFilter='all',onlineFilter='all',portugalLoaded=false;
function load(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
function save(){localStorage.setItem(K.r,JSON.stringify(recipes));localStorage.setItem(K.s,JSON.stringify(shop));render()}
function id(){return Date.now()+'-'+Math.random().toString(16).slice(2)}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(window.tt);window.tt=setTimeout(()=>t.classList.remove('show'),2200)}
function go(v){$('.view').forEach(x=>x.classList.toggle('active',x.id===v));$('.bottom-nav button').forEach(x=>x.classList.toggle('active',x.dataset.go===v));location.hash=v;if(v==='portuguesas')loadPortuguese()}
function normText(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function normalizeShopName(v=''){return normText(v).replace(/\s+/g,' ')}
function mergeQty(a='',b=''){a=(a||'').trim();b=(b||'').trim();if(!a)return b;if(!b)return a;if(a===b)return a+' + '+b;return a+' + '+b}
function categoryMatch(r,f){
  if(f==='all')return true;
  if(f==='favorite')return !!r.favorite;
  const c=normText(r.category||''),n=normText(r.name||'');
  if(f==='dessert')return /sobrem|dessert|cake|doce|bolo/.test(c+' '+n);
  if(f==='pasta')return /massa|pasta|spaghetti|lasagna|noodle/.test(c+' '+n);
  if(f==='meat')return /carne|beef|pork|lamb|steak/.test(c+' '+n);
  if(f==='fish')return /peixe|seafood|fish|salmon|tuna/.test(c+' '+n);
  if(f==='quick'){const m=parseInt(String(r.time||'').match(/\d+/)?.[0]||'999',10);return m<=30}
  return true;
}
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');if(g)return go(g.dataset.go);
  if(e.target.closest('[data-new]'))return openEditor();
  if(e.target.closest('[data-close]'))return e.target.closest('dialog')?.close();
  const mf=e.target.closest('[data-my-filter]');
  if(mf){myFilter=mf.dataset.myFilter;$$('[data-my-filter]').forEach(b=>b.classList.toggle('active',b===mf));renderMine();return}
  const sf=e.target.closest('[data-search-category]');
  if(sf){onlineFilter=sf.dataset.searchCategory;$$('[data-search-category]').forEach(b=>b.classList.toggle('active',b===sf));searchCategory(onlineFilter);return}
});
function card(r,ext=false){return `<article class="card"><div class="media">${r.image?`<img src="${esc(r.image)}" alt="${esc(r.name)}">`:'<div class="placeholder">🍽️</div>'}${ext?'':`<button class="fav" onclick="fav('${r.id}')">${r.favorite?'♥':'♡'}</button>`}</div><div class="card-body"><div class="meta">${r.category?`<span class="pill">${esc(r.category)}</span>`:''}${r.time?`<span class="pill">⏱ ${esc(r.time)}</span>`:''}</div><h3>${esc(r.name)}</h3><p>${esc((r.description||'').slice(0,100))}</p><div class="card-actions"><button class="btn secondary" onclick="${ext?`openOnline('${r.externalId}')`:`openRecipe('${r.id}')`}">Ver</button>${ext?`<button class="btn primary" onclick="saveOnline('${r.externalId}')">Guardar</button>`:`<button class="btn" onclick="editRecipe('${r.id}')">Editar</button>`}</div></div></article>`}
function render(){
  $('#nRecipes').textContent=recipes.length;$('#nFavs').textContent=recipes.filter(x=>x.favorite).length;$('#nShop').textContent=shop.filter(x=>!x.done).length;
  $('#recent').innerHTML=recipes.slice(0,3).map(card).join('')||'<p class="muted">Ainda não tens receitas guardadas.</p>';
  renderMine();
  $('#favoriteRecipes').innerHTML=recipes.filter(x=>x.favorite).map(card).join('')||'<p class="muted">Ainda não tens favoritos.</p>';
  renderShop()
}
function renderMine(){
  const q=normText($('#mySearch').value||'');
  const list=recipes.filter(r=>normText(r.name+' '+(r.description||'')+' '+(r.category||'')).includes(q)&&categoryMatch(r,myFilter));
  $('#myRecipes').innerHTML=list.map(card).join('')||'<p class="muted">Nenhuma receita encontrada com estes filtros.</p>'
}
$('#mySearch').oninput=renderMine;
function fav(i){let r=recipes.find(x=>x.id===i);if(r){r.favorite=!r.favorite;save()}}
function normalize(m){
  let ing=[];for(let i=1;i<=20;i++){let n=(m['strIngredient'+i]||'').trim(),q=(m['strMeasure'+i]||'').trim();if(n)ing.push({name:n,qty:q})}
  return{externalId:m.idMeal,name:m.strMeal,image:m.strMealThumb,category:m.strCategory||'Online',description:m.strInstructions||'',ingredients:ing,steps:(m.strInstructions||'').split(/\r?\n+/).filter(Boolean)}
}
const onlineCategories={dessert:'Dessert',pasta:'Pasta',meat:'Beef',fish:'Seafood',chicken:'Chicken',vegetarian:'Vegetarian'};
async function loadPortuguese(force=false){
  if(portugalLoaded&&!force)return;
  const status=$('#portugueseStatus'),grid=$('#portugueseRecipes');
  if(!status||!grid)return;
  status.textContent='A carregar receitas portuguesas…';
  try{
    const d=await fetch('https://www.themealdb.com/api/json/v1/1/filter.php?a=Portuguese').then(r=>r.json());
    const ms=(d.meals||[]).map(m=>({externalId:m.idMeal,name:m.strMeal,image:m.strMealThumb,category:'Portuguesa',description:''}));
    window.online={...(window.online||{}),...Object.fromEntries(ms.map(m=>[m.externalId,m]))};
    portugalLoaded=true;
    status.textContent=ms.length?ms.length+' receita(s) portuguesa(s) encontrada(s).':'Não encontrei receitas portuguesas neste momento.';
    grid.innerHTML=ms.map(m=>card(m,true)).join('')||'<p class="muted">Não há receitas portuguesas disponíveis.</p>';
  }catch{
    status.textContent='Não foi possível carregar as receitas portuguesas. Tenta novamente daqui a pouco.';
  }
}
async function searchCategory(key){
  if(key==='all'){ $('#searchStatus').textContent='Escreve o nome de uma receita ou escolhe uma categoria.';$('#searchResults').innerHTML='';return}
  const cat=onlineCategories[key];if(!cat)return;
  $('#searchStatus').textContent='A carregar '+cat+'…';
  try{
    const d=await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(cat)}`).then(r=>r.json());
    const ms=(d.meals||[]).slice(0,24).map(m=>({externalId:m.idMeal,name:m.strMeal,image:m.strMealThumb,category:cat,description:''}));
    window.online={...(window.online||{}),...Object.fromEntries(ms.map(m=>[m.externalId,m]))};
    $('#searchStatus').textContent=ms.length?`${ms.length} receita(s) em ${cat}.`:'Nada encontrado.';
    $('#searchResults').innerHTML=ms.map(m=>card(m,true)).join('')
  }catch{$('#searchStatus').textContent='Erro ao carregar a categoria.'}
}
$('#searchForm').onsubmit=async e=>{
  e.preventDefault();let q=$('#searchInput').value.trim();if(!q)return;
  $('#searchStatus').textContent='A pesquisar…';
  try{
    let d=await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`).then(r=>r.json());
    let ms=(d.meals||[]).map(normalize);
    if(onlineFilter!=='all'&&onlineCategories[onlineFilter])ms=ms.filter(m=>normText(m.category)===normText(onlineCategories[onlineFilter]));
    window.online=Object.fromEntries(ms.map(m=>[m.externalId,m]));
    $('#searchStatus').textContent=ms.length?`${ms.length} receita(s) encontrada(s).`:'Nada encontrado.';
    $('#searchResults').innerHTML=ms.map(m=>card(m,true)).join('')
  }catch{$('#searchStatus').textContent='Erro ao pesquisar.'}
};
async function getOnline(i){
  if(window.online?.[i]?.ingredients)return window.online[i];
  let d=await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${i}`).then(r=>r.json());
  const r=normalize(d.meals[0]);window.online=window.online||{};window.online[i]=r;return r
}
async function openOnline(i){show(await getOnline(i),true)}
async function saveOnline(i){let r=await getOnline(i);if(recipes.some(x=>x.externalId===i))return toast('Já está guardada.');recipes.unshift({...r,id:id(),favorite:false,source:'online'});save();toast('Receita guardada.')}
function openRecipe(i){let r=recipes.find(x=>x.id===i);if(r)show(r,false)}
function show(r,ext){$('#detailBody').innerHTML=`${r.image?`<img class="detail-img" src="${esc(r.image)}" alt="">`:''}<h2>${esc(r.name)}</h2><p>${esc(r.description||'')}</p><div class="detail-grid"><div><h3>Ingredientes</h3><ul>${(r.ingredients||[]).map(x=>`<li><b>${esc(x.qty||'')}</b> ${esc(x.name)}</li>`).join('')}</ul></div><div><h3>Preparação</h3><ol>${(r.steps||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div></div>${ext?'':`<div class="dialog-actions"><button class="btn primary" onclick="addToShop('${r.id}')">Adicionar ingredientes às compras</button><button class="btn secondary" onclick="delRecipe('${r.id}')">Apagar</button></div>`}`;$('#detail').showModal()}
function addIng(x={name:'',qty:''}){let d=document.createElement('div');d.className='row';d.innerHTML=`<input class="ingName" placeholder="Ingrediente" value="${esc(x.name)}"><input class="ingQty" placeholder="Quantidade" value="${esc(x.qty)}"><button type="button" class="remove">×</button>`;d.querySelector('.remove').onclick=()=>d.remove();$('#ingredients').appendChild(d)}
function addStep(x=''){let d=document.createElement('div');d.className='row step-row';d.innerHTML=`<input class="stepText" placeholder="Passo" value="${esc(x)}"><button type="button" class="remove">×</button>`;d.querySelector('.remove').onclick=()=>d.remove();$('#steps').appendChild(d)}
$('#addIngredient').onclick=()=>addIng();$('#addStep').onclick=()=>addStep();
function openEditor(r=null){$('#recipeForm').reset();$('#recipeId').value=r?.id||'';$('#editorTitle').textContent=r?.id?'Editar receita':'Nova receita';$('#rName').value=r?.name||'';$('#rCategory').value=r?.category||'';$('#rTime').value=r?.time||'';$('#rImage').value=r?.image||'';$('#rDescription').value=r?.description||'';$('#rNotes').value=r?.notes||'';$('#ingredients').innerHTML='';(r?.ingredients?.length?r.ingredients:[{}]).forEach(addIng);$('#steps').innerHTML='';(r?.steps?.length?r.steps:['']).forEach(addStep);$('#editor').showModal()}
function editRecipe(i){openEditor(recipes.find(x=>x.id===i))}
$('#recipeForm').onsubmit=e=>{e.preventDefault();let rid=$('#recipeId').value,data={name:$('#rName').value.trim(),category:$('#rCategory').value.trim(),time:$('#rTime').value.trim(),image:$('#rImage').value.trim(),description:$('#rDescription').value.trim(),notes:$('#rNotes').value.trim(),ingredients:$$('.row').filter(x=>x.querySelector('.ingName')).map(x=>({name:x.querySelector('.ingName').value.trim(),qty:x.querySelector('.ingQty').value.trim()})).filter(x=>x.name),steps:$$('.stepText').map(x=>x.value.trim()).filter(Boolean)};if(rid){let i=recipes.findIndex(x=>x.id===rid);recipes[i]={...recipes[i],...data}}else recipes.unshift({...data,id:id(),favorite:false,source:'local'});save();$('#editor').close();go('minhas');toast('Receita guardada.')};
function delRecipe(i){if(confirm('Apagar esta receita?')){recipes=recipes.filter(x=>x.id!==i);save();$('#detail').close()}}
function addShopItemLocal(name,qty=''){
  const key=normalizeShopName(name);if(!key)return;
  const ex=shop.find(x=>normalizeShopName(x.name)===key);
  if(ex){ex.qty=mergeQty(ex.qty,qty);ex.done=false}else shop.push({id:id(),name:name.trim(),qty:(qty||'').trim(),done:false})
}
function addToShop(i){let r=recipes.find(x=>x.id===i);(r.ingredients||[]).forEach(x=>addShopItemLocal(x.name,x.qty));save();toast('Ingredientes adicionados e repetidos agrupados.')}
$('#shopForm').onsubmit=e=>{e.preventDefault();const n=$('#shopName').value.trim(),q=$('#shopQty').value.trim();if(!n)return;addShopItemLocal(n,q);e.target.reset();save()};
function renderShop(){
  const pending=shop.filter(x=>!x.done).length,done=shop.length-pending;
  $('#shopSummary').textContent=shop.length?`${pending} por comprar · ${done} comprado(s)`:'A lista está vazia.';
  $('#shopList').innerHTML=shop.map(x=>`<div class="shop-row ${x.done?'done':''}"><input type="checkbox" ${x.done?'checked':''} onchange="toggleShop('${x.id}')"><div><b>${esc(x.name)}</b><div class="muted">${esc(x.qty||'')}</div></div><button class="remove" onclick="delShop('${x.id}')">×</button></div>`).join('')||'<p class="muted">Adiciona produtos manualmente ou a partir de uma receita.</p>'
}
function toggleShop(i){let x=shop.find(x=>x.id===i);if(x){x.done=!x.done;save()}}
function delShop(i){shop=shop.filter(x=>x.id!==i);save()}
function clearBought(){const n=shop.filter(x=>x.done).length;if(!n)return toast('Ainda não há produtos comprados.');shop=shop.filter(x=>!x.done);save();toast('Produtos comprados removidos.')}
$('#clearBought').onclick=clearBought;

function recipeNameFromVideoText(text=''){
  const clean=String(text)
    .replace(/https?:\/\/\S+/gi,' ')
    .replace(/#[\p{L}\p{N}_]+/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
  if(!clean)return 'Receita do TikTok';
  return clean.split(/[.!?]\n]|[.!?]\s/)[0].trim().slice(0,80)||'Receita do TikTok';
}

function parseVideoRecipeText(text=''){
  const ingredients=[],steps=[];
  const lines=String(text)
    .replace(/\r/g,'')
    .split(/\n|•|·/)
    .map(x=>x.trim())
    .filter(Boolean);

  let mode='';
  const ingredientHeading=/^(ingredientes?|ingredients?)\s*:?$/i;
  const stepHeading=/^(prepara(?:ç|c)ão|modo de preparo|modo de prepara(?:ç|c)ão|passos?|instructions?|preparation)\s*:?$/i;
  const qty=/^(\d+(?:[.,]\d+)?|\d+\/\d+|½|¼|¾|⅓|⅔)\s*(kg|g|mg|l|ml|cl|dl|chávena(?:s)?|xicara(?:s)?|xícara(?:s)?|colher(?:es)?(?:\s+de\s+(?:sopa|chá))?|c\.\s*(?:sopa|chá)|cup(?:s)?|tbsp|tsp|unidades?|un\.?|dentes?)?\s+(.+)$/i;

  for(const original of lines){
    const line=original.replace(/^[-–—]\s*/,'').trim();
    if(ingredientHeading.test(line)){mode='ingredients';continue}
    if(stepHeading.test(line)){mode='steps';continue}

    const numbered=line.match(/^\d+[.)-]\s*(.+)$/);
    if(mode==='steps'||numbered){
      const value=(numbered?.[1]||line).trim();
      if(value)steps.push(value);
      continue;
    }

    const match=line.match(qty);
    if(mode==='ingredients'||match){
      if(match){
        ingredients.push({
          qty:[match[1],match[2]||''].join(' ').trim(),
          name:match[3].trim()
        });
      }else if(line.length<120){
        ingredients.push({qty:'',name:line.replace(/^[-–—]\s*/,'').trim()});
      }
    }
  }

  return {ingredients,steps};
}

const videoImportBtn=$('#openVideoImportBtn');
if(videoImportBtn){
  videoImportBtn.onclick=()=>{
    $('#videoImportForm').reset();
    $('#videoImportStatus').textContent='';
    $('#videoImportPreview').hidden=true;
    $('#videoImportPreview').innerHTML='';
    $('#videoImport').showModal();
  };
}

const videoImportForm=$('#videoImportForm');
if(videoImportForm){
  videoImportForm.onsubmit=async e=>{
    e.preventDefault();

    const url=$('#videoImportUrl').value.trim();
    const extra=$('#videoImportText').value.trim();
    const status=$('#videoImportStatus');
    const preview=$('#videoImportPreview');

    if(!/https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\//i.test(url)){
      status.textContent='Cola um link válido do TikTok.';
      return;
    }

    status.textContent='A analisar o vídeo…';
    preview.hidden=true;

    try{
      const res=await fetch('/.netlify/functions/tiktok-oembed?url='+encodeURIComponent(url));
      const data=await res.json();

      if(!res.ok)throw new Error(data.error||'Não foi possível ler este vídeo.');

      const sourceText=(extra||data.title||'').trim();
      const parsed=parseVideoRecipeText(sourceText);
      const name=recipeNameFromVideoText(sourceText||data.title);
      const notes=[
        'Fonte TikTok: '+url,
        data.author_name?'Criador: '+data.author_name:''
      ].filter(Boolean).join('\n');

      preview.hidden=false;
      preview.innerHTML=
        (data.thumbnail_url?'<img src="'+esc(data.thumbnail_url)+'" alt="">':'')+
        '<div><strong>'+esc(name)+'</strong>'+
        (data.author_name?'<small>'+esc(data.author_name)+'</small>':'')+
        '</div>';

      status.textContent='Vídeo encontrado. A preparar o rascunho…';

      setTimeout(()=>{
        $('#videoImport').close();
        openEditor({
          name,
          category:'TikTok',
          image:data.thumbnail_url||'',
          description:sourceText,
          ingredients:parsed.ingredients,
          steps:parsed.steps,
          notes
        });

        if(parsed.ingredients.length||parsed.steps.length){
          toast('Rascunho criado. Confirma os ingredientes e passos antes de guardar.');
        }else{
          toast('Vídeo encontrado. Completa os ingredientes e passos antes de guardar.');
        }
      },250);
    }catch(err){
      status.textContent=err.message||'Não foi possível importar este vídeo.';
    }
  };
}

$('#themeBtn').onclick=()=>{document.body.classList.toggle('dark');let d=document.body.classList.contains('dark');localStorage.setItem(K.t,d?'dark':'light');$('#themeBtn').textContent=d?'☀':'☾'};if(localStorage.getItem(K.t)==='dark'){document.body.classList.add('dark');$('#themeBtn').textContent='☀'}
let start=(location.hash||'#inicio').slice(1);go(['inicio','pesquisar','portuguesas','minhas','favoritos','compras'].includes(start)?start:'inicio');render();Object.assign(window,{fav,openRecipe,editRecipe,openOnline,saveOnline,addToShop,delRecipe,toggleShop,delShop,clearBought,mergeQty,normalizeShopName,loadPortuguese});