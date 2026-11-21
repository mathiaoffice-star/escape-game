(()=>{'use strict';
const log=(...a)=>console.info('[voice-modal]',...a);
function makeFallbackModal(){
 let modal=document.getElementById('voiceLibraryModal');
 if(modal)return modal;
 modal=document.createElement('div');modal.id='voiceLibraryModal';
 modal.style.cssText='display:none;position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.78);padding: max(14px,env(safe-area-inset-top)) 12px max(14px,env(safe-area-inset-bottom));box-sizing:border-box;align-items:center;justify-content:center';
 modal.innerHTML='<section style="width:min(100%,560px);max-height:100%;overflow:auto;background:white;border-radius:18px;padding:16px;box-sizing:border-box;color:#111827"><header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><b style="font-size:19px">🎙️ 追加ボイス</b><button id="closeVoiceModal" type="button">閉じる ✕</button></header><div id="voiceModalBody"><div id="voiceCategoryHome" style="display:grid;gap:12px"><button id="openAttackVoiceCategory" type="button" style="padding:20px;font-size:18px">⚔️ 攻撃ボイス</button><button id="openDefeatVoiceCategory" type="button" style="padding:20px;font-size:18px">💥 敗北ボイス</button></div><div id="fallbackVoiceContent"></div></div></section>';
 document.body.appendChild(modal);
 const body=modal.querySelector('#fallbackVoiceContent');
 const source=document.getElementById('additionalVoicesPage');
 if(source){
  const cards=source.querySelectorAll(':scope > div > div > section');
  if(cards.length>=2){
   ['attack','defeat'].forEach((slot,i)=>{
    const view=document.createElement('div');view.id='fallback-'+slot;view.hidden=true;
    const back=document.createElement('button');back.type='button';back.textContent='← ボイス選択に戻る';back.style.marginBottom='12px';
    back.addEventListener('click',()=>{view.hidden=true;modal.querySelector('#voiceCategoryHome').style.display='grid';});
    view.appendChild(back);view.appendChild(cards[i]);body.appendChild(view);
   });
  }
 }
 const home=modal.querySelector('#voiceCategoryHome');
 ['attack','defeat'].forEach(slot=>{
  const b=modal.querySelector('#open'+(slot==='attack'?'Attack':'Defeat')+'VoiceCategory');
  b.addEventListener('click',()=>{
   home.style.display='none';
   const view=modal.querySelector('#fallback-'+slot);
   if(view)view.hidden=false;
   else body.textContent=slot==='attack'?'攻撃ボイスの画面を初期化できませんでした。ページを再読み込みしてください。':'敗北ボイスの画面を初期化できませんでした。ページを再読み込みしてください。';
  });
 });
 return modal;
}
function bind(){
 const button=document.getElementById('openAdditionalVoices');
 if(!button){log('shop button not found');return;}
 const modal=makeFallbackModal();
 if(modal.parentElement!==document.body)document.body.appendChild(modal);
 const open=e=>{
  if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();}
  modal.style.setProperty('display','flex','important');
  modal.style.setProperty('z-index','2147483647','important');
  modal.removeAttribute('hidden');
  document.body.style.overflow='hidden';
  log('opened modal');
 };
 const close=()=>{modal.style.setProperty('display','none','important');document.body.style.overflow='';};
 if(!button.dataset.voiceHotfixBound){
  button.dataset.voiceHotfixBound='1';
  button.addEventListener('click',open,true);
  button.addEventListener('pointerup',open,true);
  button.addEventListener('touchend',open,{capture:true,passive:false});
 }
 if(!modal.dataset.voiceHotfixBound){
  modal.dataset.voiceHotfixBound='1';
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  modal.addEventListener('click',e=>{if(e.target.closest?.('#closeVoiceModal'))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 }
 log('bound',!!document.getElementById('voiceLibraryModal'));
}
function start(){
 bind();
 const observer=new MutationObserver(()=>bind());
 observer.observe(document.documentElement,{childList:true,subtree:true});
 setTimeout(()=>observer.disconnect(),20000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();