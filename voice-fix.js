(()=>{
'use strict';
const DB='escapeGameCustomMediaV1',STORE='media';
const openDB=()=>new Promise((resolve,reject)=>{const q=indexedDB.open(DB,3);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE);};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
const read=async k=>{const d=await openDB();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,'readonly'),q=t.objectStore(STORE).get(k);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error);});};
const write=async(k,v)=>{const d=await openDB();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(v,k);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});};
const remove=async k=>{const d=await openDB();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).delete(k);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});};
const decode=async path=>{const r=await fetch(path+'?v=6',{cache:'no-store'});if(!r.ok)throw Error('音声ファイルを取得できません ('+r.status+')');const b=(await r.text()).trim();const raw=atob(b);const a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return new Blob([a],{type:'audio/mpeg'});};
let attackPool=[],attackIndex=0,defeatAudio=null,attackUrl=null,defeatUrl=null;
async function refreshAudio(){
 const [ab,db]=await Promise.all([read('attackVoice'),read('defeatVoice')]);
 attackPool.forEach(a=>{try{a.pause();a.src='';}catch(e){}});
 if(attackUrl)URL.revokeObjectURL(attackUrl);
 attackPool=[];attackUrl=null;
 if(defeatAudio){try{defeatAudio.pause();defeatAudio.src='';}catch(e){}}
 if(defeatUrl)URL.revokeObjectURL(defeatUrl);
 defeatAudio=null;defeatUrl=null;
 if(ab){attackUrl=URL.createObjectURL(ab);attackPool=Array.from({length:6},()=>{const a=new Audio(attackUrl);a.preload='auto';a.playsInline=true;return a;});}
 if(db){defeatUrl=URL.createObjectURL(db);defeatAudio=new Audio(defeatUrl);defeatAudio.preload='auto';}
}
function volume(){return Math.max(0,Math.min(1,(typeof audioPrefs!=='undefined'&&audioPrefs?audioPrefs.voice:100)/100));}
const oldAttack=playAttack;
playAttack=function(){if(window.__escapeMasterMute)return;if(!attackPool.length){oldAttack();return;}const a=attackPool[attackIndex++%attackPool.length];a.volume=volume();try{a.pause();a.currentTime=0;a.play().catch(()=>{});}catch(e){}};
const oldEnd=endGame;
endGame=function(){if(gameOver)return;if(window.__escapeMasterMute){oldEnd();return;}if(!defeatAudio){oldEnd();return;}gameOver=true;bgmAudio.pause();bgmStarted=false;defeatAudio.volume=volume();try{defeatAudio.pause();defeatAudio.currentTime=0;defeatAudio.play().catch(()=>{});}catch(e){}};
const section=document.getElementById('additionalVoiceShopCard');
if(section){
 section.innerHTML='<b>🎙️ 追加ボイス</b><p>攻撃・敗北時のボイスを変更できます。</p><button id="voiceFixOpen" type="button" style="width:100%">開く</button>';
 const overlay=document.createElement('div');overlay.id='voiceFixPage';overlay.style.cssText='display:none;position:fixed;inset:0;z-index:100001;background:#f8fafc;color:#111827;overflow:auto;padding:calc(18px + env(safe-area-inset-top)) 16px calc(28px + env(safe-area-inset-bottom));box-sizing:border-box';
 overlay.innerHTML='<div style="max-width:620px;margin:auto"><button id="voiceFixClose" type="button">← ショップに戻る</button><h2>🎙️ 追加ボイス</h2><p>購入後は自動設定されます。購入済みなら無料で切り替えできます。</p><section class="shop-item"><h3>⚔️ 攻撃ボイス</h3><p>シャマルピー（関西ver）</p><button id="vfPreviewA">▶ 試聴</button> <button id="vfSetA">購入・設定（200金の玉）</button><button id="vfResetA">初期ボイスに戻す</button></section><section class="shop-item"><h3>💥 敗北ボイス</h3><p>ンニイイイ（全員ver）</p><button id="vfPreviewD">▶ 試聴</button> <button id="vfSetD">購入・設定（200金の玉）</button><button id="vfResetD">初期ボイスに戻す</button></section><p id="vfStatus" role="status"></p></div>';
 document.body.appendChild(overlay);
 const status=t=>{const e=document.getElementById('vfStatus');if(e)e.textContent=t;};
 const preview=async path=>{try{const blob=await decode(path),url=URL.createObjectURL(blob),a=new Audio(url);a.volume=volume();a.onended=()=>URL.revokeObjectURL(url);await a.play();status('試聴中');}catch(e){status('試聴できません：'+e.message);}};
 const setup=async(key,path,label)=>{let stage='音声取得';try{const blob=await decode(path);if(!blob.size)throw Error('音声データが空です');const apply=async()=>{stage='保存';await write(key,blob);await write(key+'Purchased',true);stage='再生準備';await refreshAudio();status(label+'を設定しました');};if(await read(key+'Purchased')){await apply();return;}if(typeof window.chargeGameCoins==='function'){stage='決済';const ok=await window.chargeGameCoins(200,label,apply);if(ok===false)return;}else{if(typeof wallet==='undefined'||wallet<200){status('金の玉が足りません');return;}wallet-=200;saveWallet();updateShopUI();await apply();}}catch(e){console.error('Voice setup',stage,e);status('設定失敗（'+stage+'）：'+e.message);}};
 document.getElementById('voiceFixOpen').onclick=async()=>{overlay.style.display='block';try{const [a,d]=await Promise.all([read('attackVoicePurchased'),read('defeatVoicePurchased')]);document.getElementById('vfSetA').textContent=a?'設定':'購入・設定（200金の玉）';document.getElementById('vfSetD').textContent=d?'設定':'購入・設定（200金の玉）';}catch(e){status(e.message);}};
 document.getElementById('voiceFixClose').onclick=()=>overlay.style.display='none';
 document.getElementById('vfPreviewA').onclick=()=>preview('./audio/shamarupi-kansai.mp3.b64');
 document.getElementById('vfPreviewD').onclick=()=>preview('./audio/nni-all.mp3.b64');
 document.getElementById('vfSetA').onclick=()=>setup('attackVoice','./audio/shamarupi-kansai.mp3.b64','攻撃ボイス');
 document.getElementById('vfSetD').onclick=()=>setup('defeatVoice','./audio/nni-all.mp3.b64','敗北ボイス');
 document.getElementById('vfResetA').onclick=async()=>{await remove('attackVoice');await refreshAudio();status('攻撃ボイスを初期化しました');};
 document.getElementById('vfResetD').onclick=async()=>{await remove('defeatVoice');await refreshAudio();status('敗北ボイスを初期化しました');};
}
refreshAudio().catch(e=>console.error('Voice preload',e));
})();