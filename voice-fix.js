(()=>{
'use strict';
// ゲーム本編の攻撃・敗北ボイスは、設定済み音声を優先。
// 未設定時も、ショップで試聴する高音質プリセットを標準音声として使う。
const DB='escapeGameCustomMediaV1';
let attackUrl=null,defeatUrl=null;
const openDB=()=>new Promise((resolve,reject)=>{
 const req=indexedDB.open(DB,3);
 req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('media'))req.result.createObjectStore('media');};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});
const get=async key=>{
 const d=await openDB();
 return new Promise((resolve,reject)=>{
  const req=d.transaction('media','readonly').objectStore('media').get(key);
  req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
 });
};
const preset=async path=>{
 const response=await fetch(path+'?v=4',{cache:'no-store'});
 if(!response.ok)throw new Error('音声取得失敗 '+response.status);
 const raw=atob((await response.text()).trim()),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return new Blob([bytes],{type:'audio/mpeg'});
};
const makeAudio=(blob)=>{
 const url=URL.createObjectURL(blob),audio=new Audio(url);
 audio.preload='auto';audio.playsInline=true;
 return {audio,url};
};
async function initPlayback(){
 const [savedAttack,savedDefeat]=await Promise.all([get('attackVoice'),get('defeatVoice')]);
 const [attackBlob,defeatBlob]=await Promise.all([
  savedAttack?Promise.resolve(savedAttack):preset('./audio/shamarupi-kansai.mp3.b64'),
  savedDefeat?Promise.resolve(savedDefeat):preset('./audio/nnniiii-defeat.mp3.b64')
 ]);
 const attack=makeAudio(attackBlob),defeat=makeAudio(defeatBlob);
 if(attackUrl)URL.revokeObjectURL(attackUrl);
 if(defeatUrl)URL.revokeObjectURL(defeatUrl);
 attackUrl=attack.url;defeatUrl=defeat.url;
 window.__voiceFixAttack=attack.audio;
 window.__voiceFixDefeat=defeat.audio;
 console.info('[voice-fix] high-quality game voices ready');
}
window.refreshVoiceFixPlayback=()=>initPlayback().catch(e=>console.error('[voice-fix refresh]',e));
window.addEventListener('customvoicechange',window.refreshVoiceFixPlayback);
const baseAttack=window.playAttack;
if(typeof baseAttack==='function'&&!window.__voiceFixAttackWrapped){
 window.playAttack=function(){
  if(window.__escapeMasterMute)return;
  const audio=window.__voiceFixAttack;
  if(!audio){baseAttack();return;}
  try{
   audio.volume=typeof audioPrefs!=='undefined'&&audioPrefs?audioPrefs.voice/100:1;
   audio.pause();audio.currentTime=0;
   const result=audio.play();if(result&&result.catch)result.catch(()=>{});
  }catch(e){console.warn('[voice-fix] attack playback failed',e);}
 };
 window.__voiceFixAttackWrapped=true;
}
const baseEnd=window.endGame;
if(typeof baseEnd==='function'&&!window.__voiceFixEndWrapped){
 window.endGame=function(){
  if(gameOver)return;
  const audio=window.__voiceFixDefeat;
  if(!audio){baseEnd();return;}
  if(window.__escapeMasterMute){baseEnd();return;}
  gameOver=true;bgmAudio.pause();bgmStarted=false;
  try{
   audio.volume=typeof audioPrefs!=='undefined'&&audioPrefs?audioPrefs.voice/100:1;
   audio.pause();audio.currentTime=0;
   const result=audio.play();if(result&&result.catch)result.catch(()=>{});
  }catch(e){console.warn('[voice-fix] defeat playback failed',e);}
 };
 window.__voiceFixEndWrapped=true;
}
initPlayback().catch(e=>console.error('[voice-fix preload]',e));
})();