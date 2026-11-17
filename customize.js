(()=> {
'use strict';
const DB='escapeGameCustomMediaV1', STORE='media';
const $=id=>document.getElementById(id);
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,3);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function getMedia(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}
async function putMedia(key,blob){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
async function removeMedia(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
function status(s){const el=$('shopStatus');if(el)el.textContent=s;}
function charge(cost,label,done){if(window.chargeGameCoins){window.chargeGameCoins(cost,label,done);return true;}if(wallet<cost){status('金の玉が足りません。'+label+'には'+cost+'金の玉が必要です。');return false;}wallet-=cost;saveWallet();updateShopUI();status(label+'を設定しました！');done();return true;}
const shopGrid=document.querySelector('#shopScreen .shop-grid');
if(!shopGrid||!$('playerImg')&&typeof playerImg==='undefined')return;
const panel=document.createElement('section');panel.className='shop-item custom-media-panel';panel.style.gridColumn='1/-1';
panel.innerHTML='<strong>🖼️ キャラクター画像カスタマイズ</strong><p>写真をアップロードしてプレイヤーの見た目を変更（1回200金の玉）</p><input id="customPlayerImage" type="file" accept="image/*" style="max-width:100%"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px"><img id="customPlayerPreview" alt="画像プレビュー" style="width:64px;height:64px;object-fit:cover;border-radius:12px;display:none"><button id="saveCustomPlayerImage" type="button">200金の玉で設定</button><button id="resetCustomPlayerImage" type="button">初期画像に戻す</button></div><hr style="margin:14px 0;border-color:#ddd"><details style="margin-top:10px"><summary>自分の攻撃ボイスを録音・アップロード</summary><p>録音または音声ファイルから攻撃時のボイスを設定（1回200金の玉）</p><input id="customVoiceFile" type="file" accept="audio/*" style="max-width:100%"><div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button id="recordCustomVoice" type="button">録音開始</button><button id="stopCustomVoice" type="button" disabled>録音停止</button><button id="saveCustomVoice" type="button" disabled>200金の玉で設定</button><button id="previewCustomVoice" type="button" disabled>試聴</button></div></details><p id="customMediaStatus" class="tiny-note">画像・ボイスはこの端末のブラウザに保存されます。</p>';
shopGrid.appendChild(panel);
// 既存ショップの「追加ボイス／準備中」カードそのものを探して置き換える
const voiceSection=(()=>{
 const byId=$('additionalVoiceShopCard');if(byId)return byId;
 const matches=Array.from(document.querySelectorAll('section,article,div')).filter(el=>{
  const t=(el.innerText||'').replace(/\\s+/g,' ');
  return t.includes('追加ボイス')&&t.includes('準備中')&&el.querySelector('button');
 }).sort((x,y)=>(x.innerText||'').length-(y.innerText||'').length);
 return matches[0]||null;
})();
if(!voiceSection)throw new Error('既存の追加ボイス枠が見つかりません');
voiceSection.id='additionalVoiceShopCard';
voiceSection.classList.add('additional-voice-section');
voiceSection.innerHTML='<b>🎙️ 追加ボイス</b><p>攻撃・敗北時のボイスを変更できます。</p><button id="openAdditionalVoices" type="button" style="width:100%">開く</button>';
const voicePage=document.createElement('div');
voicePage.id='additionalVoicesPage';
voicePage.style.cssText='display:none;position:fixed;inset:0;z-index:100000;background:#f8fafc;color:#111827;overflow-y:auto;padding:calc(18px + env(safe-area-inset-top)) 16px calc(28px + env(safe-area-inset-bottom));box-sizing:border-box;font-family:inherit';
voicePage.innerHTML='<div style="max-width:620px;margin:0 auto"><button id="closeAdditionalVoices" type="button" style="background:#475569;color:white;border:0;border-radius:12px;padding:11px 16px;font-weight:800">← ショップに戻る</button><h2 style="margin:20px 0 6px">🎙️ 追加ボイス</h2><p style="color:#64748b;margin:0 0 18px">購入後は自動設定されます。購入済みなら「設定」だけで切り替えできます。</p><section class="shop-item" style="margin:12px 0;padding:18px;border:1px solid #dbe1ea;border-radius:18px;background:white"><h3>⚔️ 攻撃ボイス</h3><p>シャマルピー（関西ver）</p><p style="color:#64748b">攻撃時に再生</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px"><button id="previewShamarupiPreset" type="button">▶ 試聴</button><button id="setShamarupiPreset" type="button">200金の玉で購入</button><button id="resetAttackPreset" type="button" style="grid-column:1/-1;background:#64748b">初期ボイスに戻す</button></div></section><section class="shop-item" style="margin:12px 0;padding:18px;border:1px solid #dbe1ea;border-radius:18px;background:white"><h3>💥 敗北ボイス</h3><p>ンニイイイ（全員ver）</p><p style="color:#64748b">敗北時に再生</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px"><button id="previewNniPreset" type="button">▶ 試聴</button><button id="setNniPreset" type="button">200金の玉で購入</button><button id="resetDefeatVoice" type="button" style="grid-column:1/-1;background:#64748b">初期ボイスに戻す</button></div></section><p id="additionalVoiceStatus" role="status" style="padding:12px;color:#475569"></p></div>';
document.body.appendChild(voicePage);
$('openAdditionalVoices').addEventListener('click',()=>{voicePage.style.display='block';refreshVoiceButtons();});
$('closeAdditionalVoices').addEventListener('click',()=>{voicePage.style.display='none';});
function voiceStatus(t){const el=$('additionalVoiceStatus');if(el)el.textContent=t;}
async function refreshVoiceButtons(){
 const [ap,dp,av,dv]=await Promise.all([getMedia('attackVoicePurchased'),getMedia('defeatVoicePurchased'),getMedia('attackVoice'),getMedia('defeatVoice')]);
 $('setShamarupiPreset').textContent=ap?'設定':'200金の玉で購入';
 $('setNniPreset').textContent=dp?'設定':'200金の玉で購入';
 $('resetAttackPreset').style.display=av?'block':'none';
 $('resetDefeatVoice').style.display=dv?'block':'none';
}
let imageBlob=null,voiceBlob=null,recording=null,recorder=null,voicePreview=null,customVoiceUrl=null,customImageUrl=null,resumeBgmAfterRecording=false;
const imgInput=$('customPlayerImage'),imgPreview=$('customPlayerPreview'),voiceInput=$('customVoiceFile'),recordBtn=$('recordCustomVoice'),stopBtn=$('stopCustomVoice'),saveVoiceBtn=$('saveCustomVoice'),previewBtn=$('previewCustomVoice'),msg=$('customMediaStatus');
function msgSet(t){msg.textContent=t;}
async function presetBlob(path){const res=await fetch(path+'?v=2');if(!res.ok)throw new Error('音声ファイルを読み込めません');const b64=(await res.text()).trim();const raw=atob(b64);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:'audio/mpeg'});}
async function previewPreset(path){try{const blob=await presetBlob(path),url=URL.createObjectURL(blob),a=new Audio(url);a.volume=audioPrefs.voice/100;a.play().catch(()=>voiceStatus('試聴を開始できませんでした。'));a.onended=()=>URL.revokeObjectURL(url);}catch(e){voiceStatus('試聴に失敗しました：'+e.message);}}
$('previewShamarupiPreset').addEventListener('click',()=>previewPreset('./audio/shamarupi-kansai.mp3.b64'));
$('previewNniPreset').addEventListener('click',()=>previewPreset('./audio/nni-all.mp3.b64'));
$('setShamarupiPreset').addEventListener('click',async()=>{try{const purchased=await getMedia('attackVoicePurchased');const apply=async()=>{await putMedia('attackVoice',await presetBlob('./audio/shamarupi-kansai.mp3.b64'));await putMedia('attackVoicePurchased',true);voiceBlob=null;voiceStatus('攻撃ボイスを設定しました。');await refreshVoiceButtons();};if(purchased){await apply();return;}charge(200,'攻撃ボイス',apply);}catch(e){voiceStatus('設定に失敗しました：'+e.message);}});
$('setNniPreset').addEventListener('click',async()=>{try{const purchased=await getMedia('defeatVoicePurchased');const apply=async()=>{await putMedia('defeatVoice',await presetBlob('./audio/nni-all.mp3.b64'));await putMedia('defeatVoicePurchased',true);voiceStatus('敗北ボイスを設定しました。');await refreshVoiceButtons();};if(purchased){await apply();return;}charge(200,'敗北ボイス',apply);}catch(e){voiceStatus('設定に失敗しました：'+e.message);}});
$('resetAttackPreset').addEventListener('click',async()=>{await removeMedia('attackVoice');voiceBlob=null;voiceStatus('攻撃ボイスを初期設定に戻しました。');await refreshVoiceButtons();});
$('resetDefeatVoice').addEventListener('click',async()=>{await removeMedia('defeatVoice');voiceStatus('敗北ボイスを初期設定に戻しました。');await refreshVoiceButtons();});

function previewImage(blob){if(customImageUrl)URL.revokeObjectURL(customImageUrl);customImageUrl=URL.createObjectURL(blob);playerImg.src=customImageUrl;imgPreview.src=customImageUrl;imgPreview.style.display='block';}
function previewVoice(blob){if(customVoiceUrl)URL.revokeObjectURL(customVoiceUrl);customVoiceUrl=URL.createObjectURL(blob);previewBtn.disabled=false;}
imgInput.addEventListener('change',()=>{const f=imgInput.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){msgSet('画像ファイルを選択してください。');return;}if(f.size>8*1024*1024){msgSet('画像は8MB以下にしてください。');return;}imageBlob=f;imgPreview.src=URL.createObjectURL(f);imgPreview.style.display='block';msgSet('画像を選択しました。設定には200金の玉が必要です。');});
$('saveCustomPlayerImage').addEventListener('click',async()=>{if(!imageBlob){msgSet('先に画像を選択してください。');return;}charge(200,'キャラクター画像',async()=>{try{await putMedia('playerImage',imageBlob);previewImage(imageBlob);msgSet('画像を保存しました。');}catch(e){msgSet('保存に失敗しました：'+e.message);}});});
$('resetCustomPlayerImage').addEventListener('click',async()=>{try{await removeMedia('playerImage');playerImg.src=ASSETS.player;if(customImageUrl)URL.revokeObjectURL(customImageUrl);imgPreview.style.display='none';imageBlob=null;msgSet('初期画像に戻しました。');}catch(e){msgSet('初期化に失敗しました。');}});
voiceInput.addEventListener('change',()=>{const f=voiceInput.files?.[0];if(!f)return;if(!f.type.startsWith('audio/')){msgSet('音声ファイルを選択してください。');return;}if(f.size>12*1024*1024){msgSet('音声ファイルは12MB以下にしてください。');return;}voiceBlob=f;saveVoiceBtn.disabled=false;previewBtn.disabled=false;msgSet('音声ファイルを選択しました。設定には200金の玉が必要です。');});
function setIOSAudioSession(type){try{if(navigator.audioSession)navigator.audioSession.type=type;}catch(e){console.warn('audioSession:',e);}}
function restoreAudioAfterRecording(){setIOSAudioSession('playback');setIOSAudioSession('auto');window.__customVoiceRecording=false;if(resumeBgmAfterRecording&&!window.__escapeMasterMute){resumeBgmAfterRecording=false;try{if(typeof bgmAudio!=='undefined')bgmAudio.muted=false;startBGM();}catch(e){}}else resumeBgmAfterRecording=false;}
recordBtn.addEventListener('click',async()=>{try{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('このブラウザでは録音に対応していません。音声ファイルを選択してください。');resumeBgmAfterRecording=!!(typeof bgmAudio!=='undefined'&&!bgmAudio.paused&&!window.__escapeMasterMute);window.__customVoiceRecording=true;window.__pauseGameAudioForRecording();setIOSAudioSession('auto');const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});setIOSAudioSession('play-and-record');const chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{voiceBlob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});stream.getTracks().forEach(t=>t.stop());restoreAudioAfterRecording();saveVoiceBtn.disabled=false;previewBtn.disabled=false;msgSet('録音しました。試聴してから設定できます。');};recorder.start();recordBtn.disabled=true;stopBtn.disabled=false;msgSet('録音中… BGMは停止しています。');}catch(e){restoreAudioAfterRecording();recordBtn.disabled=false;stopBtn.disabled=true;msgSet(e.message||'マイクを利用できません。');}});
stopBtn.addEventListener('click',()=>{if(recorder&&recorder.state!=='inactive'){recorder.stop();recordBtn.disabled=false;stopBtn.disabled=true;}});
$('saveCustomVoice').addEventListener('click',async()=>{if(!voiceBlob){msgSet('先に録音または音声ファイルを選択してください。');return;}charge(200,'カスタムボイス',async()=>{try{await putMedia('attackVoice',voiceBlob);msgSet('ボイスを保存しました。攻撃時に再生されます。');}catch(e){msgSet('保存に失敗しました：'+e.message);}});});
previewBtn.addEventListener('click',()=>{if(!voiceBlob)return;const u=URL.createObjectURL(voiceBlob),a=new Audio(u);a.play().catch(()=>msgSet('試聴を開始できませんでした。'));a.onended=()=>URL.revokeObjectURL(u);});
$('resetCustomVoice').addEventListener('click',async()=>{await removeMedia('attackVoice');voiceBlob=null;msgSet('初期ボイスに戻しました。');});
// Attack voice playback is handled by the unified wrapper below.
window.__pauseGameAudioForRecording=()=>{try{document.querySelectorAll('audio,video').forEach(el=>{try{el.pause();el.currentTime=0;}catch(e){}});if(typeof bgmAudio!=='undefined'){bgmAudio.pause();bgmAudio.currentTime=0;}if(typeof attackAudioPool!=='undefined')attackAudioPool.forEach(a=>{a.pause();a.currentTime=0;});if(typeof gameoverAudio!=='undefined'){gameoverAudio.pause();gameoverAudio.currentTime=0;}if(typeof audioContext!=='undefined'&&audioContext&&audioContext.state==='running')audioContext.suspend().catch(()=>{});}catch(e){console.warn('audio pause:',e);}};
const mediaPlayOriginal=HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play=function(){
 if(window.__customVoiceRecording)return Promise.resolve();
 // ゲーム本体が攻撃音声プールを直接再生する経路も捕捉する
 let isAttackPoolAudio=false;
 try{isAttackPoolAudio=typeof attackAudioPool!=='undefined'&&Array.isArray(attackAudioPool)&&attackAudioPool.includes(this);}catch(e){}
 if(isAttackPoolAudio&&!window.__playingCustomVoice&&!window.__escapeMasterMute){
  const originalElement=this;
  return getMedia('attackVoice').then(blob=>{
   if(!blob)return mediaPlayOriginal.apply(originalElement,arguments);
   const url=URL.createObjectURL(blob),custom=new Audio(url);
   custom.volume=(typeof audioPrefs!=='undefined'&&audioPrefs?audioPrefs.voice:100)/100;
   custom.onended=()=>URL.revokeObjectURL(url);custom.onerror=()=>URL.revokeObjectURL(url);
   return mediaPlayOriginal.call(custom).catch(err=>{URL.revokeObjectURL(url);throw err;});
  }).catch(err=>{console.warn('Custom attack voice playback failed:',err);return mediaPlayOriginal.apply(originalElement,arguments);});
 }
 return mediaPlayOriginal.apply(this,arguments);
};
const MUTE_KEY='escapeGameMasterMuteV1';window.__escapeMasterMute=localStorage.getItem(MUTE_KEY)==='1';
const settings=$('#settingsScreen .ranking-panel');
const muteRow=document.createElement('div');muteRow.className='setting-row';muteRow.innerHTML='<span>🔇 マスターミュート</span><button type="button" id="masterMuteToggle">ミュート OFF</button>';settings.insertBefore(muteRow,settings.querySelector('.setting-row'));
const muteBtn=$('masterMuteToggle');
function applyMute(){muteBtn.textContent=window.__escapeMasterMute?'ミュート ON':'ミュート OFF';muteBtn.setAttribute('aria-pressed',String(window.__escapeMasterMute));if(window.__escapeMasterMute){bgmAudio.pause();bgmStarted=false;attackAudioPool.forEach(a=>{a.pause();a.currentTime=0;});gameoverAudio.pause();gameoverAudio.currentTime=0;if(audioContext&&audioContext.state==='running')audioContext.suspend().catch(()=>{});}else if(audioContext&&audioContext.state==='suspended')audioContext.resume().catch(()=>{});}
muteBtn.addEventListener('click',()=>{window.__escapeMasterMute=!window.__escapeMasterMute;localStorage.setItem(MUTE_KEY,window.__escapeMasterMute?'1':'0');applyMute();});
const originalStartBGM=startBGM;startBGM=function(){if(window.__escapeMasterMute||window.__customVoiceRecording)return;originalStartBGM();};
const originalPlay=play;play=function(a){if(window.__escapeMasterMute)return;originalPlay(a);};
// 音声再生は1か所で制御。購入済み音声がある場合は標準音声を鳴らさず、カスタム音声だけを再生する。
let customAttackAudio=null,customDefeatAudio=null;
async function playStoredVoice(key,slot){
 const blob=await getMedia(key);
 if(!blob)return false;
 const url=URL.createObjectURL(blob);
 const audio=new Audio(url);
 audio.preload='auto';
 audio.volume=(typeof audioPrefs!=='undefined'&&audioPrefs?audioPrefs.voice:100)/100;
 audio.onended=()=>URL.revokeObjectURL(url);
 audio.onerror=()=>URL.revokeObjectURL(url);
 if(slot==='attack')customAttackAudio=audio;else customDefeatAudio=audio;
 try{await audio.play();return true;}catch(e){URL.revokeObjectURL(url);return false;}
}
const basePlayAttack=playAttack;
playAttack=function(){
 if(window.__escapeMasterMute)return;
 getMedia('attackVoice').then(blob=>{
  if(blob){playStoredVoice('attackVoice','attack').catch(()=>{});}
  else basePlayAttack();
 }).catch(()=>basePlayAttack());
};
const baseEndGame=endGame;
endGame=function(){
 if(window.__escapeMasterMute){gameOver=true;bgmAudio.pause();bgmStarted=false;return;}
 getMedia('defeatVoice').then(async blob=>{
  if(blob){
   try{if(typeof gameoverAudio!=='undefined'){gameoverAudio.pause();gameoverAudio.currentTime=0;}}catch(e){}
   await playStoredVoice('defeatVoice','defeat');
  }
 }).catch(()=>{});
 baseEndGame();
};
getMedia('playerImage').then(blob=>{if(blob)previewImage(blob);}).catch(()=>{});
getMedia('attackVoice').then(blob=>{if(blob){voiceBlob=blob;if(previewBtn)previewBtn.disabled=false;if(saveVoiceBtn)saveVoiceBtn.disabled=false;msgSet('保存済みの攻撃ボイスがあります。');}}).catch(()=>{});
applyMute();
})();