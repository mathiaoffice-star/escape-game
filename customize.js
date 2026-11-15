(()=> {
'use strict';
const DB='escapeGameCustomMediaV1', STORE='media';
const $=id=>document.getElementById(id);
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,2);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function getMedia(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}
async function putMedia(key,blob){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
async function removeMedia(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
function status(s){const el=$('shopStatus');if(el)el.textContent=s;}
function charge(cost,label,done){if(window.chargeGameCoins){window.chargeGameCoins(cost,label,done);return true;}if(wallet<cost){status('金の玉が足りません。'+label+'には'+cost+'金の玉が必要です。');return false;}wallet-=cost;saveWallet();updateShopUI();status(label+'を設定しました！');done();return true;}
const shopGrid=document.querySelector('#shopScreen .shop-grid');
if(!shopGrid||!$('playerImg')&&typeof playerImg==='undefined')return;
const panel=document.createElement('section');panel.className='shop-item custom-media-panel';panel.style.gridColumn='1/-1';
panel.innerHTML='<strong>🖼️ キャラクター画像カスタマイズ</strong><p>写真をアップロードしてプレイヤーの見た目を変更（1回200金の玉）</p><input id="customPlayerImage" type="file" accept="image/*" style="max-width:100%"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px"><img id="customPlayerPreview" alt="画像プレビュー" style="width:64px;height:64px;object-fit:cover;border-radius:12px;display:none"><button id="saveCustomPlayerImage" type="button">200金の玉で設定</button><button id="resetCustomPlayerImage" type="button">初期画像に戻す</button></div><hr style="margin:14px 0;border-color:#ddd"><strong>🎙️ ボイスカスタマイズ</strong><p>攻撃時に再生するボイスを録音、または音声ファイルから設定（1回200金の玉）</p><input id="customVoiceFile" type="file" accept="audio/*" style="max-width:100%"><div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button id="recordCustomVoice" type="button">録音開始</button><button id="stopCustomVoice" type="button" disabled>録音停止</button><button id="saveCustomVoice" type="button" disabled>200金の玉で設定</button><button id="previewCustomVoice" type="button" disabled>試聴</button><button id="resetCustomVoice" type="button">初期ボイスに戻す</button></div><p id="customMediaStatus" class="tiny-note">画像・ボイスはこの端末のブラウザに保存されます。</p>';
shopGrid.appendChild(panel);
let imageBlob=null,voiceBlob=null,recording=null,recorder=null,voicePreview=null,customVoiceUrl=null,customImageUrl=null;
const imgInput=$('customPlayerImage'),imgPreview=$('customPlayerPreview'),voiceInput=$('customVoiceFile'),recordBtn=$('recordCustomVoice'),stopBtn=$('stopCustomVoice'),saveVoiceBtn=$('saveCustomVoice'),previewBtn=$('previewCustomVoice'),msg=$('customMediaStatus');
function msgSet(t){msg.textContent=t;}
function previewImage(blob){if(customImageUrl)URL.revokeObjectURL(customImageUrl);customImageUrl=URL.createObjectURL(blob);playerImg.src=customImageUrl;imgPreview.src=customImageUrl;imgPreview.style.display='block';}
function previewVoice(blob){if(customVoiceUrl)URL.revokeObjectURL(customVoiceUrl);customVoiceUrl=URL.createObjectURL(blob);previewBtn.disabled=false;}
imgInput.addEventListener('change',()=>{const f=imgInput.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){msgSet('画像ファイルを選択してください。');return;}if(f.size>8*1024*1024){msgSet('画像は8MB以下にしてください。');return;}imageBlob=f;imgPreview.src=URL.createObjectURL(f);imgPreview.style.display='block';msgSet('画像を選択しました。設定には200金の玉が必要です。');});
$('saveCustomPlayerImage').addEventListener('click',async()=>{if(!imageBlob){msgSet('先に画像を選択してください。');return;}charge(200,'キャラクター画像',async()=>{try{await putMedia('playerImage',imageBlob);previewImage(imageBlob);msgSet('画像を保存しました。');}catch(e){msgSet('保存に失敗しました：'+e.message);}});});
$('resetCustomPlayerImage').addEventListener('click',async()=>{try{await removeMedia('playerImage');playerImg.src=ASSETS.player;if(customImageUrl)URL.revokeObjectURL(customImageUrl);imgPreview.style.display='none';imageBlob=null;msgSet('初期画像に戻しました。');}catch(e){msgSet('初期化に失敗しました。');}});
voiceInput.addEventListener('change',()=>{const f=voiceInput.files?.[0];if(!f)return;if(!f.type.startsWith('audio/')){msgSet('音声ファイルを選択してください。');return;}if(f.size>12*1024*1024){msgSet('音声ファイルは12MB以下にしてください。');return;}voiceBlob=f;saveVoiceBtn.disabled=false;previewBtn.disabled=false;msgSet('音声ファイルを選択しました。設定には200金の玉が必要です。');});
recordBtn.addEventListener('click',async()=>{try{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('このブラウザでは録音に対応していません。音声ファイルを選択してください。');const stream=await navigator.mediaDevices.getUserMedia({audio:true});const chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{voiceBlob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});stream.getTracks().forEach(t=>t.stop());saveVoiceBtn.disabled=false;previewBtn.disabled=false;msgSet('録音しました。試聴してから設定できます。');};recorder.start();recordBtn.disabled=true;stopBtn.disabled=false;msgSet('録音中…');}catch(e){msgSet(e.message||'マイクを利用できません。');}});
stopBtn.addEventListener('click',()=>{if(recorder&&recorder.state!=='inactive'){recorder.stop();recordBtn.disabled=false;stopBtn.disabled=true;}});
$('saveCustomVoice').addEventListener('click',async()=>{if(!voiceBlob){msgSet('先に録音または音声ファイルを選択してください。');return;}charge(200,'カスタムボイス',async()=>{try{await putMedia('attackVoice',voiceBlob);msgSet('ボイスを保存しました。攻撃時に再生されます。');}catch(e){msgSet('保存に失敗しました：'+e.message);}});});
previewBtn.addEventListener('click',()=>{if(!voiceBlob)return;const u=URL.createObjectURL(voiceBlob),a=new Audio(u);a.play().catch(()=>msgSet('試聴を開始できませんでした。'));a.onended=()=>URL.revokeObjectURL(u);});
$('resetCustomVoice').addEventListener('click',async()=>{await removeMedia('attackVoice');voiceBlob=null;msgSet('初期ボイスに戻しました。');});
const originalPlayAttack=playAttack;
playAttack=function(){if(window.__escapeMasterMute)return;getMedia('attackVoice').then(blob=>{if(blob){const u=URL.createObjectURL(blob),a=new Audio(u);a.volume=audioPrefs.voice/100;a.play().catch(()=>{});a.onended=()=>URL.revokeObjectURL(u);}else originalPlayAttack();}).catch(()=>originalPlayAttack());};
const MUTE_KEY='escapeGameMasterMuteV1';window.__escapeMasterMute=localStorage.getItem(MUTE_KEY)==='1';
const settings=$('#settingsScreen .ranking-panel');
const muteRow=document.createElement('div');muteRow.className='setting-row';muteRow.innerHTML='<span>🔇 マスターミュート</span><button type="button" id="masterMuteToggle">ミュート OFF</button>';settings.insertBefore(muteRow,settings.querySelector('.setting-row'));
const muteBtn=$('masterMuteToggle');
function applyMute(){muteBtn.textContent=window.__escapeMasterMute?'ミュート ON':'ミュート OFF';muteBtn.setAttribute('aria-pressed',String(window.__escapeMasterMute));if(window.__escapeMasterMute){bgmAudio.pause();bgmStarted=false;attackAudioPool.forEach(a=>{a.pause();a.currentTime=0;});gameoverAudio.pause();gameoverAudio.currentTime=0;if(audioContext&&audioContext.state==='running')audioContext.suspend().catch(()=>{});}else if(audioContext&&audioContext.state==='suspended')audioContext.resume().catch(()=>{});}
muteBtn.addEventListener('click',()=>{window.__escapeMasterMute=!window.__escapeMasterMute;localStorage.setItem(MUTE_KEY,window.__escapeMasterMute?'1':'0');applyMute();});
const originalStartBGM=startBGM;startBGM=function(){if(window.__escapeMasterMute)return;originalStartBGM();};
const originalPlay=play;play=function(a){if(window.__escapeMasterMute)return;originalPlay(a);};
const originalAttack=playAttack;playAttack=function(){if(window.__escapeMasterMute)return;originalAttack();};
const originalEndGame=endGame;endGame=function(){if(window.__escapeMasterMute){gameOver=true;bgmAudio.pause();bgmStarted=false;return;}originalEndGame();};
getMedia('playerImage').then(blob=>{if(blob)previewImage(blob);}).catch(()=>{});
getMedia('attackVoice').then(blob=>{if(blob){voiceBlob=blob;previewBtn.disabled=false;saveVoiceBtn.disabled=false;msgSet('保存済みのカスタムボイスがあります。');}}).catch(()=>{});
applyMute();
})();