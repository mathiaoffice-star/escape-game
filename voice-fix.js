(()=> {
'use strict';
function init(){
 const section=document.getElementById('additionalVoiceShopCard')||Array.from(document.querySelectorAll('.shop-item,section,article,div')).find(e=>(e.innerText||'').includes('追加ボイス'));
 if(!section){console.error('[voice-fix] target card not found');return;}
 section.id='additionalVoiceShopCard';
 section.innerHTML='<b>🎙️ 追加ボイス</b><p>攻撃・敗北時のボイスを変更できます。</p><button type="button" id="voiceFixOpen">開く</button>';
 let modal=document.getElementById('voiceFixModal');if(modal)modal.remove();
 modal=document.createElement('div');modal.id='voiceFixModal';
 modal.style.cssText='display:none;position:fixed;z-index:2147483000;inset:0;overflow:auto;background:#f8fafc;color:#111827;padding:calc(20px + env(safe-area-inset-top)) 16px calc(30px + env(safe-area-inset-bottom));box-sizing:border-box';
 modal.innerHTML='<main style="max-width:620px;margin:auto"><button id="vClose" type="button">← ショップに戻る</button><h2>🎙️ 追加ボイス</h2><p>購入済みなら無料で「設定」できます。</p><section style="background:white;border:1px solid #dbe1ea;border-radius:18px;padding:18px;margin:12px 0"><h3>⚔️ 攻撃ボイス</h3><p>シャマルピー（関西ver）</p><button id="vPrevA">▶ 試聴</button><button id="vSetA">購入・設定（200金の玉）</button><button id="vResetA">初期ボイスに戻す</button></section><section style="background:white;border:1px solid #dbe1ea;border-radius:18px;padding:18px;margin:12px 0"><h3>💥 敗北ボイス</h3><p>ンニイイイ（全員ver）</p><button id="vPrevD">▶ 試聴</button><button id="vSetD">購入・設定（200金の玉）</button><button id="vResetD">初期ボイスに戻す</button></section><p id="vStatus" role="status"></p></main>';
 document.body.appendChild(modal);
 const $=id=>document.getElementById(id),say=t=>{$('vStatus').textContent=t;};
 const db=()=>new Promise((res,rej)=>{const q=indexedDB.open('escapeGameCustomMediaV1',3);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('media'))q.result.createObjectStore('media');};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});
 const get=async k=>{const d=await db();return new Promise((res,rej)=>{const q=d.transaction('media','readonly').objectStore('media').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error);});};
 const put=async(k,v)=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction('media','readwrite');t.objectStore('media').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error);});};
 const del=async k=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction('media','readwrite');t.objectStore('media').delete(k);t.oncomplete=res;t.onerror=()=>rej(t.error);});};
 const load=async path=>{const r=await fetch(path+'?v=voice-recovery-7',{cache:'no-store'});if(!r.ok)throw Error('音声取得失敗 '+r.status);const raw=atob((await r.text()).trim()),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:'audio/mpeg'});};
 const paths={attackVoice:'./audio/shamarupi-kansai.mp3.b64',defeatVoice:'./audio/nni-all.mp3.b64'};
 async function refresh(){
  const a=await get('attackVoice'),d=await get('defeatVoice');
  window.__voiceFixAttack=a?new Audio(URL.createObjectURL(a)):null;
  window.__voiceFixDefeat=d?new Audio(URL.createObjectURL(d)):null;
 }
 let vfAttackIndex=0;
 const baseAttack=window.playAttack;
 if(typeof baseAttack==='function'&&!window.__voiceFixAttackWrapped){
  window.playAttack=function(){
   if(window.__escapeMasterMute)return;
   const a=window.__voiceFixAttack;
   if(!a){baseAttack();return;}
   try{a.volume=typeof audioPrefs!=='undefined'&&audioPrefs?audioPrefs.voice/100:1;a.pause();a.currentTime=0;a.play().catch(()=>{});}catch(e){}
  };
  window.__voiceFixAttackWrapped=true;
 }
 const baseEnd=window.endGame;
 if(typeof baseEnd==='function'&&!window.__voiceFixEndWrapped){
  window.endGame=function(){
   if(gameOver)return;
   const a=window.__voiceFixDefeat;
   if(!a){baseEnd();return;}
   if(window.__escapeMasterMute){baseEnd();return;}
   gameOver=true;bgmAudio.pause();bgmStarted=false;
   try{a.volume=typeof audioPrefs!=='undefined'&&audioPrefs?audioPrefs.voice/100:1;a.pause();a.currentTime=0;a.play().catch(()=>{});}catch(e){}
  };
  window.__voiceFixEndWrapped=true;
 }
 const preview=async key=>{try{const b=await load(paths[key]),u=URL.createObjectURL(b),a=new Audio(u);a.onended=()=>URL.revokeObjectURL(u);await a.play();say('試聴中');}catch(e){say('試聴エラー：'+e.message);}};
 async function setup(key,label){
  try{
   const blob=await load(paths[key]);if(!blob.size)throw Error('音声データが空です');
   const purchased=await get(key+'Purchased');
   const save=async()=>{await put(key,blob);await put(key+'Purchased',true);await refresh();say(label+'を設定しました');};
   if(purchased){await save();return;}
   if(typeof window.chargeGameCoins==='function'){await window.chargeGameCoins(200,label,save);return;}
   say('決済機能が読み込まれていません'); 
  }catch(e){console.error('[voice-fix setup]',e);say('設定エラー：'+e.message);}
 }
 $('voiceFixOpen').onclick=async()=>{modal.style.display='block';try{const [a,d]=await Promise.all([get('attackVoicePurchased'),get('defeatVoicePurchased')]);$('vSetA').textContent=a?'設定':'購入・設定（200金の玉）';$('vSetD').textContent=d?'設定':'購入・設定（200金の玉）';}catch(e){say('DBエラー：'+e.message);}};
 $('vClose').onclick=()=>modal.style.display='none';
 $('vPrevA').onclick=()=>preview('attackVoice');$('vPrevD').onclick=()=>preview('defeatVoice');
 $('vSetA').onclick=()=>setup('attackVoice','攻撃ボイス');$('vSetD').onclick=()=>setup('defeatVoice','敗北ボイス');
 $('vResetA').onclick=async()=>{try{await del('attackVoice');await refresh();say('攻撃ボイスを初期化しました');}catch(e){say(e.message);}};
 $('vResetD').onclick=async()=>{try{await del('defeatVoice');await refresh();say('敗北ボイスを初期化しました');}catch(e){say(e.message);}};
 refresh().catch(e=>console.error('[voice-fix preload]',e));
 console.info('[voice-fix] UI initialized');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();