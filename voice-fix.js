(()=> {
'use strict';
// 追加ボイスの画面UIは customize.js がショップ内に構築する。
// このファイルはプリセット音声の再生処理だけを担当し、ショップDOMを書き換えない。
const db=()=>new Promise((resolve,reject)=>{
 const q=indexedDB.open('escapeGameCustomMediaV1',3);
 q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('media'))q.result.createObjectStore('media');};
 q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
});
const get=async key=>{const d=await db();return new Promise((resolve,reject)=>{
 const q=d.transaction('media','readonly').objectStore('media').get(key);
 q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error);
});};
const load=async path=>{
 const r=await fetch(path+'?v=voice-playback-8',{cache:'no-store'});
 if(!r.ok)throw Error('音声取得失敗 '+r.status);
 const raw=atob((await r.text()).trim()),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return new Blob([bytes],{type:'audio/mpeg'});
};
async function initPlayback(){
 const [attack,defeat]=await Promise.all([get('attackVoice'),get('defeatVoice')]);
 window.__voiceFixAttack=attack?new Audio(URL.createObjectURL(attack)):null;
 window.__voiceFixDefeat=defeat?new Audio(URL.createObjectURL(defeat)):null;
}
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
initPlayback().catch(e=>console.error('[voice-fix preload]',e));
console.info('[voice-fix] playback initialized; shop UI remains managed by customize.js');
})();