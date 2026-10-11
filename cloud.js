const cloud = (window.supabase && window.SUPABASE_URL && window.SUPABASE_PUBLISHABLE_KEY)
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY)
  : null;

let cloudUser = null;
let cloudHousehold = null;

function cloudToast(message) {
  if (typeof toast === 'function') toast(message);
}

function cloudRecipe(r, favIds) {
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    category: r.category || '',
    image: r.image_url || '',
    time: r.time_minutes ? r.time_minutes + ' min' : '',
    ingredients: r.ingredients || [],
    steps: r.steps || [],
    notes: r.notes || '',
    source: r.source || 'local',
    externalId: r.external_id || null,
    favorite: favIds.has(r.id)
  };
}

async function loadCloudData() {
  if (!cloudUser) return;

  const member = await cloud
    .from('household_members')
    .select('household_id')
    .eq('user_id', cloudUser.id)
    .limit(1);

  if (member.error) return cloudToast(member.error.message);

  cloudHousehold = member.data?.[0]?.household_id || null;
  if (!cloudHousehold) return cloudToast('Não encontrei o teu espaço de receitas.');

  const [rr, ff, ss] = await Promise.all([
    cloud.from('recipes').select('*').eq('household_id', cloudHousehold).order('created_at', { ascending: false }),
    cloud.from('favorites').select('recipe_id').eq('user_id', cloudUser.id),
    cloud.from('shopping_items').select('*').eq('household_id', cloudHousehold).order('created_at', { ascending: false })
  ]);

  if (rr.error) return cloudToast(rr.error.message);
  if (ff.error) return cloudToast(ff.error.message);
  if (ss.error) return cloudToast(ss.error.message);

  const favIds = new Set((ff.data || []).map(x => x.recipe_id));

  recipes = (rr.data || []).map(r => cloudRecipe(r, favIds));
  shop = (ss.data || []).map(x => ({
    id: x.id,
    name: x.name,
    qty: x.quantity || '',
    done: !!x.completed
  }));

  render();
}

async function cloudCreateRecipe(data) {
  const payload = {
    household_id: cloudHousehold,
    created_by: cloudUser.id,
    name: data.name,
    description: data.description || '',
    category: data.category || '',
    image_url: data.image || '',
    time_minutes: parseInt(data.time, 10) || null,
    ingredients: data.ingredients || [],
    steps: data.steps || [],
    notes: data.notes || '',
    source: data.source || 'local',
    external_id: data.externalId || null
  };

  const res = await cloud.from('recipes').insert(payload);
  if (res.error) return cloudToast(res.error.message);
  await loadCloudData();
}

async function cloudUpdateRecipe(recipeId, data) {
  const payload = {
    name: data.name,
    description: data.description || '',
    category: data.category || '',
    image_url: data.image || '',
    time_minutes: parseInt(data.time, 10) || null,
    ingredients: data.ingredients || [],
    steps: data.steps || [],
    notes: data.notes || ''
  };

  const res = await cloud.from('recipes').update(payload).eq('id', recipeId);
  if (res.error) return cloudToast(res.error.message);
  await loadCloudData();
}

function installCloudHandlers() {
  const oldFav = window.fav;
  window.fav = async function(recipeId) {
    if (!cloudUser) return oldFav(recipeId);

    const r = recipes.find(x => x.id === recipeId);
    if (!r) return;

    const res = r.favorite
      ? await cloud.from('favorites').delete().eq('user_id', cloudUser.id).eq('recipe_id', recipeId)
      : await cloud.from('favorites').insert({ user_id: cloudUser.id, recipe_id: recipeId });

    if (res.error) return cloudToast(res.error.message);
    await loadCloudData();
  };

  const oldSaveOnline = window.saveOnline;
  window.saveOnline = async function(externalId) {
    if (!cloudUser) return oldSaveOnline(externalId);

    const onlineRecipe = await getOnline(externalId);
    if (recipes.some(x => x.externalId === externalId)) return cloudToast('Já está guardada.');

    await cloudCreateRecipe({
      ...onlineRecipe,
      favorite: false,
      source: 'online'
    });

    cloudToast('Receita guardada na conta.');
  };

  const oldDeleteRecipe = window.delRecipe;
  window.delRecipe = async function(recipeId) {
    if (!cloudUser) return oldDeleteRecipe(recipeId);
    if (!confirm('Apagar esta receita?')) return;

    const res = await cloud.from('recipes').delete().eq('id', recipeId);
    if (res.error) return cloudToast(res.error.message);

    await loadCloudData();
    $('#detail').close();
  };

  const oldAddToShop = window.addToShop;
  window.addToShop = async function(recipeId) {
    if (!cloudUser) return oldAddToShop(recipeId);

    const r = recipes.find(x => x.id === recipeId);
    if (!r) return;

    const rows = (r.ingredients || [])
      .filter(x => x.name)
      .map(x => ({
        household_id: cloudHousehold,
        created_by: cloudUser.id,
        name: x.name,
        quantity: x.qty || '',
        recipe_name: r.name,
        completed: false
      }));

    if (rows.length) {
      const res = await cloud.from('shopping_items').insert(rows);
      if (res.error) return cloudToast(res.error.message);
    }

    await loadCloudData();
    cloudToast('Ingredientes adicionados.');
  };

  const oldToggleShop = window.toggleShop;
  window.toggleShop = async function(itemId) {
    if (!cloudUser) return oldToggleShop(itemId);

    const item = shop.find(x => x.id === itemId);
    if (!item) return;

    const res = await cloud.from('shopping_items').update({ completed: !item.done }).eq('id', itemId);
    if (res.error) return cloudToast(res.error.message);
    await loadCloudData();
  };

  const oldDelShop = window.delShop;
  window.delShop = async function(itemId) {
    if (!cloudUser) return oldDelShop(itemId);

    const res = await cloud.from('shopping_items').delete().eq('id', itemId);
    if (res.error) return cloudToast(res.error.message);
    await loadCloudData();
  };

  const oldRecipeSubmit = $('#recipeForm').onsubmit;
  $('#recipeForm').onsubmit = async e => {
    if (!cloudUser) return oldRecipeSubmit.call($('#recipeForm'), e);

    e.preventDefault();

    const recipeId = $('#recipeId').value;
    const data = {
      name: $('#rName').value.trim(),
      category: $('#rCategory').value.trim(),
      time: $('#rTime').value.trim(),
      image: $('#rImage').value.trim(),
      description: $('#rDescription').value.trim(),
      notes: $('#rNotes').value.trim(),
      ingredients: $$('.row')
        .filter(x => x.querySelector('.ingName'))
        .map(x => ({
          name: x.querySelector('.ingName').value.trim(),
          qty: x.querySelector('.ingQty').value.trim()
        }))
        .filter(x => x.name),
      steps: $$('.stepText').map(x => x.value.trim()).filter(Boolean)
    };

    if (recipeId) await cloudUpdateRecipe(recipeId, data);
    else await cloudCreateRecipe({ ...data, source: 'local' });

    $('#editor').close();
    go('minhas');
    cloudToast('Receita guardada na conta.');
  };

  const oldShopSubmit = $('#shopForm').onsubmit;
  $('#shopForm').onsubmit = async e => {
    if (!cloudUser) return oldShopSubmit.call($('#shopForm'), e);

    e.preventDefault();

    const name = $('#shopName').value.trim();
    const qty = $('#shopQty').value.trim();
    if (!name) return;

    const res = await cloud.from('shopping_items').insert({
      household_id: cloudHousehold,
      created_by: cloudUser.id,
      name,
      quantity: qty,
      completed: false
    });

    if (res.error) return cloudToast(res.error.message);

    e.target.reset();
    await loadCloudData();
  };
}

function setupCloudAccount() {
  const button = document.createElement('button');
  button.id = 'cloudAccountBtn';
  button.className = 'btn secondary';
  button.style.padding = '9px 12px';
  button.textContent = 'Entrar';
  $('.topbar').appendChild(button);

  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="cloudAuth">
      <button class="close" data-close>×</button>

      <div id="cloudLoggedOut">
        <h2>Conta Sabores Leticiosos</h2>
        <p>Recebe um link por e-mail para entrar. Não precisas de palavra-passe.</p>

        <label>
          E-mail
          <input id="cloudEmail" type="email" autocomplete="email" placeholder="teu@email.com">
        </label>

        <p id="cloudAuthMessage" class="muted"></p>

        <div class="dialog-actions">
          <button id="cloudSendLink" class="btn primary" type="button">Enviar link</button>
        </div>
      </div>

      <div id="cloudLoggedIn" hidden>
        <h2>A tua conta</h2>
        <p id="cloudAccountEmail"></p>
        <p class="muted">As receitas e a lista de compras desta conta estão sincronizadas.</p>

        <div class="dialog-actions">
          <button id="cloudSignOut" class="btn secondary" type="button">Terminar sessão</button>
        </div>
      </div>
    </dialog>
  `);

  button.onclick = () => {
    $('#cloudLoggedOut').hidden = !!cloudUser;
    $('#cloudLoggedIn').hidden = !cloudUser;
    $('#cloudAccountEmail').textContent = cloudUser?.email || '';
    $('#cloudAuthMessage').textContent = '';
    $('#cloudAuth').showModal();
  };

  $('#cloudSendLink').onclick = async () => {
    const email = $('#cloudEmail').value.trim();
    if (!email) return $('#cloudAuthMessage').textContent = 'Escreve o teu e-mail.';

    const res = await cloud.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: location.origin
      }
    });

    if (res.error) return $('#cloudAuthMessage').textContent = res.error.message;

    $('#cloudAuthMessage').textContent = 'Enviámos um link para o teu e-mail.';
  };

  $('#cloudSignOut').onclick = async () => {
    await cloud.auth.signOut();
    $('#cloudAuth').close();
  };
}

async function applyCloudSession(session) {
  cloudUser = session?.user || null;
  cloudHousehold = null;

  const btn = $('#cloudAccountBtn');
  if (btn) btn.textContent = cloudUser ? 'Conta ✓' : 'Entrar';

  if (cloudUser) {
    await loadCloudData();
  } else {
    recipes = load(K.r, []);
    shop = load(K.s, []);
    render();
  }
}

async function initCloud() {
  if (!cloud) return;

  setupCloudAccount();
  installCloudHandlers();

  const sessionResult = await cloud.auth.getSession();
  await applyCloudSession(sessionResult.data.session);

  cloud.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => applyCloudSession(session), 0);
  });
}

initCloud();
