(()=>{'use strict';
const log=(...a)=>console.info('[voice-modal]',...a);
function ensure(){
 const button=document.getElementById('openAdditionalVoices');
 let modal=document.getElementById('voiceLibraryModal');
 if(!button){log('open button not found yet');return;}
 if(!modal){log('modal not found; waiting for main voice UI');return;}
 if(modal.parentElement!==document.body)document.body.appendChild(modal);
 const open=e=>{
  if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();}
  modal.style.cssText+=';display:flex!important;position:fixed!important;inset:0!important;z-index:2147483647!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important';
  modal.removeAttribute('hidden');
  document.body.style.overflow='hidden';
  log('opened');
 };
 const close=()=>{
  modal.style.setProperty('display','none','important');
  document.body.style.overflow='';
 };
 if(!button.dataset.voiceHotfixBound){
  button.dataset.voiceHotfixBound='1';
  ['click','pointerup','touchend'].forEach(type=>button.addEventListener(type,open,{capture:true,passive:false}));
  button.onclick=open;
 }
 if(!modal.dataset.voiceHotfixBound){
  modal.dataset.voiceHotfixBound='1';
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  modal.addEventListener('pointerup',e=>{const c=e.target.closest&&e.target.closest('#closeVoiceModal');if(c)close();});
  modal.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('#closeVoiceModal');if(c)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.style.display!=='none')close();});
 }
 log('bound');
}
function start(){ensure();const observer=new MutationObserver(()=>ensure());observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),15000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();