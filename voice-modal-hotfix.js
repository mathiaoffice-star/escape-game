(()=>{'use strict';
const $=id=>document.getElementById(id);
function showCategory(slot){
 const modal=$('voiceLibraryModal');if(!modal)return;
 const home=$('voiceCategoryHome');
 const view=$(slot+'VoiceCategoryView');
 if(!view){const body=$('voiceModalBody');if(body){let msg=$('voiceCategoryError');if(!msg){msg=document.createElement('p');msg.id='voiceCategoryError';msg.style.cssText='padding:16px;color:#b91c1c';body.appendChild(msg);}msg.textContent='「'+(slot==='attack'?'攻撃':'敗北')+'」の画面がまだ作られていません。初期化処理を確認中です。';}return;}
 if(home)home.style.setProperty('display','none','important');
 const back=$('backVoiceCategories');if(back){back.style.setProperty('display','inline-flex','important');}
 const other=$( (slot==='attack'?'defeat':'attack')+'VoiceCategoryView');if(other)other.style.setProperty('display','none','important');
 view.hidden=false;view.style.setProperty('display','block','important');view.style.setProperty('visibility','visible','important');view.style.setProperty('opacity','1','important');
 view.querySelectorAll('button,input').forEach(el=>el.disabled=false);
 const body=$('voiceModalBody');if(body){body.scrollTop=0;}
}
function backHome(){
 const home=$('voiceCategoryHome');if(home)home.style.setProperty('display','grid','important');
 ['attack','defeat'].forEach(s=>{const v=$(s+'VoiceCategoryView');if(v)v.style.setProperty('display','none','important');});
 const back=$('backVoiceCategories');if(back)back.style.setProperty('display','none','important');
 const err=$('voiceCategoryError');if(err)err.remove();
}
function bind(){
 const trigger=$('openAdditionalVoices');if(!trigger)return;
 let modal=$('voiceLibraryModal');
 if(!modal){modal=document.createElement('div');modal.id='voiceLibraryModal';modal.innerHTML='<section><b>🎙️ 追加ボイス</b><button id="closeVoiceModal">閉じる</button><div id="voiceModalBody"><div id="voiceCategoryHome"><button id="openAttackVoiceCategory">⚔️ 攻撃ボイス</button><button id="openDefeatVoiceCategory">💥 敗北ボイス</button></div></div></section>';document.body.appendChild(modal);}
 if(!trigger.dataset.voiceOpenBound){trigger.dataset.voiceOpenBound='1';trigger.addEventListener('click',e=>{e.preventDefault();modal.style.setProperty('display','flex','important');},true);}
}
function delegated(e){
 const t=e.target&&e.target.closest?e.target.closest('#openAttackVoiceCategory,#openDefeatVoiceCategory,#backVoiceCategories,#closeVoiceModal'):null;
 if(!t)return;
 if(t.id==='openAttackVoiceCategory'||t.id==='openDefeatVoiceCategory'){
  e.preventDefault();e.stopPropagation();showCategory(t.id==='openAttackVoiceCategory'?'attack':'defeat');
 }else if(t.id==='backVoiceCategories'){e.preventDefault();e.stopPropagation();backHome();}
 else if(t.id==='closeVoiceModal'){e.preventDefault();e.stopPropagation();const m=$('voiceLibraryModal');if(m)m.style.setProperty('display','none','important');document.body.style.overflow='';}
}
function start(){
 bind();
 ['click','pointerup','touchend'].forEach(type=>document.addEventListener(type,delegated,{capture:true,passive:false}));
 const mo=new MutationObserver(bind);mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();