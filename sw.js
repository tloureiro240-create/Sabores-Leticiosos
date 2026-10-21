const CACHE='sabores-leticiosos-v10';
const SHELL=['/','/index.html','/styles.css?v=20261021-3','/app.js?v=20261021-1','/cloud.js?v=20261011-4','/pwa.js?v=20261016-5','/i18n.js?v=20261021-2','/recipe-language.js?v=20261021-1','/manifest.json','/assets/icon.svg','/assets/logo-completo.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(new URL(e.request.url).pathname.startsWith('/.netlify/functions/'))return;
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))))
});