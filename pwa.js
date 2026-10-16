let deferredInstall=null;
const installBtn=document.querySelector('#installAppBtn');
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js?v=20261016-3',{updateViaCache:'none'}).catch(()=>{}))}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;if(installBtn)installBtn.hidden=false});
if(installBtn){
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(ios&&!standalone)installBtn.hidden=false;
  installBtn.addEventListener('click',async()=>{
    if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;installBtn.hidden=true}
    else if(ios){toast('No iPhone: Partilhar → Adicionar ao ecrã principal.')}
  });
}
window.addEventListener('appinstalled',()=>{if(installBtn)installBtn.hidden=true;toast('Sabores Leticiosos instalado!')});