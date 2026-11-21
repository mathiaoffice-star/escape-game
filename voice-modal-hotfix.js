(()=>{'use strict';
const $=id=>document.getElementById(id);
function ensureModal(){
 let modal=$('voiceLibraryModal');
 if(!modal){
  modal=document.createElement('div');modal.id='voiceLibraryModal';
  modal.style.cssText='display:none;position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.78);padding:16px;box-sizing:border-box;align-items:center;justify-content:center';
  modal.innerHTML='<section style="width:min(100%,560px);max-height:100%;overflow:auto;background:white;border-radius:18px;padding:16px;color:#111827"><header style="display:flex;justify-content:space-between;align-items:center"><b>🎙️ 追加ボイス</b><button id="closeVoiceModal" type="button">閉じる ✕</button></header><div id="voiceModalBody"><div id="voiceCategoryHome" style="display:grid;gap:12px;margin-top:16px"><button id="openAttackVoiceCategory" type="button" style="padding:20px">⚔️ 攻撃ボイス</button><button id="openDefeatVoiceCategory" type="button" style="padding:20px">💥 敗北ボイス</button></div></div></section>';
  document.body.appendChild(modal);
 }
 if(modal.parentElement!==document.body)document.body.appendChild(modal);
 return modal;
}
function bind(){
 const trigger=$('openAdditionalVoices');if(!trigger)return;
 const modal=ensureModal();
 if(!trigger.dataset.voiceOpenBound){
  trigger.dataset.voiceOpenBound='1';
  trigger.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();modal.style.setProperty('display','flex','important');document.body.style.overflow='hidden';},true);
 }
 const body=$('voiceModalBody'),home=$('voiceCategoryHome');
 if(body&&!body.dataset.voiceCategoryBound){
  body.dataset.voiceCategoryBound='1';
  body.addEventListener('click',e=>{
   const attack=e.target.closest&&e.target.closest('#openAttackVoiceCategory');
   const defeat=e.target.closest&&e.target.closest('#openDefeatVoiceCategory');
   if(attack||defeat){
    e.preventDefault();e.stopPropagation();
    const slot=attack?'attack':'defeat';
    const view=$(slot+'VoiceCategoryView');
    if(!view){
     const fallback=document.createElement('div');fallback.style.cssText='padding:14px;color:#b91c1c';
     fallback.textContent='ボイス画面の初期化に失敗しました。ページを再読み込みしてください。';
     body.appendChild(fallback);return;
    }
    home.style.display='none';
    const back=$('backVoiceCategories');
    if(back){back.style.display='inline-flex';back.onclick=()=>{view.style.display='none';home.style.display='grid';back.style.display='none';};}
    view.style.display='block';
    view.style.visibility='visible';
    view.querySelectorAll('button,input').forEach(el=>el.disabled=false);
    ['attack','defeat'].forEach(other=>{if(other!==slot){const v=$(other+'VoiceCategoryView');if(v)v.style.display='none';}});
   }
  },true);
 }
 const close=()=>{modal.style.setProperty('display','none','important');document.body.style.overflow='';};
 const closeBtn=$('closeVoiceModal');
 if(closeBtn&&!closeBtn.dataset.voiceCloseBound){closeBtn.dataset.voiceCloseBound='1';closeBtn.addEventListener('click',close,true);}
 if(!modal.dataset.voiceOverlayBound){modal.dataset.voiceOverlayBound='1';modal.addEventListener('click',e=>{if(e.target===modal)close();});}
}
function start(){bind();const mo=new MutationObserver(bind);mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),20000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();