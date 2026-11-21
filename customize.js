(()=> {
'use strict';
const DB='escapeGameCustomMediaV1', STORE='media';
// 音声状態はイベント登録より前に初期化し、iOSでの初回設定時のTDZを防ぐ
let customAttackPool=[],customAttackIndex=0,customDefeatAudio=null;
let customAttackUrl=null,customDefeatUrl=null;
const $=id=>document.getElementById(id);
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,3);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function getMedia(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}
async function putMedia(key,blob){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
async function removeMedia(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
function status(s){const el=$('shopStatus');if(el)el.textContent=s;}
function charge(cost,label,done){if(window.chargeGameCoins){window.chargeGameCoins(cost,label,done);return true;}if(wallet<cost){status('金の玉が足りません。'+label+'には'+cost+'金の玉が必要です。');return false;}wallet-=cost;saveWallet();updateShopUI();status(label+'を設定しました！');done();return true;}
const shopGrid=document.querySelector('#shopScreen .shop-grid');
if(!shopGrid){console.error('[customize] shop grid not found');return;}
const panel=document.createElement('section');panel.className='shop-item custom-media-panel';panel.style.gridColumn='1/-1';
panel.innerHTML='<strong>🖼️ キャラクター画像カスタマイズ</strong><p>写真をアップロード（初回登録200金の玉）。登録済み画像はいつでも無料で切り替えできます。</p><input id="customPlayerImage" type="file" accept="image/*" style="max-width:100%"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px"><img id="customPlayerPreview" alt="画像プレビュー" style="width:64px;height:64px;object-fit:cover;border-radius:12px;display:none"><button id="saveCustomPlayerImage" type="button">200金の玉で登録</button><button id="resetCustomPlayerImage" type="button">初期画像に戻す</button></div><hr style="margin:14px 0;border-color:#ddd"><h3 style="margin:8px 0">🗂️ 画像ライブラリ</h3><p class="tiny-note">これまでに登録した画像をいつでも選んで設定できます。</p><div id="playerImageLibrary" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:9px"></div><p id="customMediaStatus" class="tiny-note">画像はこの端末のブラウザに保存されます。</p>';
shopGrid.appendChild(panel);
// 既存ショップの「追加ボイス／準備中」カードそのものを探して置き換える
const voiceSection=(()=>{
 const byId=$('additionalVoiceShopCard');if(byId)return byId;
 const matches=Array.from(document.querySelectorAll('#shopScreen .shop-item')).filter(el=>{
  const t=(el.textContent||'').replace(/\\s+/g,' ');
  return t.includes('追加ボイス');
 });
 return matches[0]||null;
})()||(()=>{
 // 置換が失敗していても、ショップ内に追加ボイス欄を新規作成する
 const card=document.createElement('section');
 card.className='shop-item additional-voice-section';
 shopGrid.appendChild(card);
 return card;
})();
voiceSection.id='additionalVoiceShopCard';
voiceSection.classList.add('additional-voice-section');
// ショップの2カラム配置でも、追加ボイス欄は画面幅いっぱいに展開する
voiceSection.style.cssText+=';grid-column:1/-1;width:100%;max-width:none;min-width:0;box-sizing:border-box';
voiceSection.innerHTML='<b>🎙️ 追加ボイス</b><p>攻撃・敗北ボイスを録音・アップロードして、ライブラリからいつでも切り替えできます。</p>';
const voicePage=document.createElement('div');
voicePage.id='additionalVoicesPage';
voicePage.style.cssText='display:block;position:static;z-index:auto;background:transparent;color:#111827;overflow:visible;padding:10px 0 0;box-sizing:border-box;font-family:inherit;width:100%;max-width:none;min-width:0';
voicePage.innerHTML='<div style="width:100%;max-width:none;margin:0 auto"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:start"><section class="shop-item" style="margin:0;padding:12px;border:1px solid #dbe1ea;border-radius:14px;background:white;min-width:0;box-sizing:border-box"><h3 style="font-size:16px;margin:0 0 6px">⚔️ 攻撃ボイス</h3><p style="font-size:13px;margin:0 0 8px">シャマルピー（関西ver）</p><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px"><button id="previewShamarupiPreset" type="button">▶ 試聴</button><button id="setShamarupiPreset" type="button">200金の玉で購入・設定</button><button id="resetAttackPreset" type="button" style="grid-column:1/-1;background:#64748b;padding:7px;font-size:12px">初期ボイスに戻す</button><button id="chooseMyAttackVoice" type="button" style="grid-column:1/-1;min-height:40px;padding:8px;font-size:13px">自分のボイスを設定</button></div><div id="attackVoiceManager" hidden style="margin-top:9px;padding-top:9px;border-top:1px solid #dbe1ea"><h4 style="font-size:13px;margin:4px 0">📁 攻撃ボイスを追加</h4><input id="attackLibraryFile" type="file" accept="audio/*" style="width:100%;max-width:100%;font-size:13px;box-sizing:border-box"><div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0"><button id="recordAttackLibrary" type="button">🎙️ 録音</button><button id="stopAttackLibrary" type="button" disabled>停止</button><button id="saveAttackLibrary" type="button" disabled>100金でライブラリに追加</button></div><h4>📚 登録済み攻撃ボイス</h4><div id="attackLibraryList"></div></div></section><section class="shop-item" style="margin:0;padding:12px;border:1px solid #dbe1ea;border-radius:14px;background:white;min-width:0;box-sizing:border-box"><h3 style="font-size:16px;margin:0 0 6px">💥 敗北ボイス</h3><p style="font-size:13px;margin:0 0 8px">ンニイイイ（全員ver）</p><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px"><button id="previewNniPreset" type="button">▶ 試聴</button><button id="setNniPreset" type="button">200金の玉で購入・設定</button><button id="resetDefeatVoice" type="button" style="grid-column:1/-1;background:#64748b">初期ボイスに戻す</button><button id="chooseMyDefeatVoice" type="button" style="grid-column:1/-1;min-height:40px;padding:8px;font-size:13px">自分のボイスを設定</button></div><div id="defeatVoiceManager" hidden style="margin-top:14px;padding-top:12px;border-top:1px solid #dbe1ea"><h4>📁 敗北ボイスを追加</h4><input id="defeatLibraryFile" type="file" accept="audio/*" style="width:100%;font-size:13px"><div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0"><button id="recordDefeatLibrary" type="button">🎙️ 録音</button><button id="stopDefeatLibrary" type="button" disabled>停止</button><button id="saveDefeatLibrary" type="button" disabled>100金でライブラリに追加</button></div><h4>📚 登録済み敗北ボイス</h4><div id="defeatLibraryList"></div></div></section></div><p id="additionalVoiceStatus" role="status" style="padding:5px 2px;margin:4px 0;color:#475569;font-size:12px"></p></div>';
voiceSection.appendChild(voicePage);
// 編集画面は専用モーダルに分離し、ショップの購入カードはそのまま残す
const voiceModal=document.createElement('div');voiceModal.id='voiceLibraryModal';voiceModal.hidden=true;
voiceModal.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.72);padding: max(14px,env(safe-area-inset-top)) 12px max(14px,env(safe-area-inset-bottom));box-sizing:border-box;display:flex;align-items:center;justify-content:center';
voiceModal.innerHTML='<section style="width:min(100%,560px);max-height:100%;overflow:auto;background:#fff;border-radius:18px;padding:16px;box-sizing:border-box;color:#111827"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px"><strong id="voiceModalTitle" style="font-size:18px">🎙️ ボイス設定</strong><button id="closeVoiceModal" type="button" style="padding:7px 12px">閉じる ✕</button></div><p style="font-size:13px;color:#64748b;margin:0 0 12px">録音または音声ファイルを追加し、ライブラリから設定できます。</p><div id="voiceModalBody"></div></section>';
document.body.appendChild(voiceModal);
const voiceModalBody=voiceModal.querySelector('#voiceModalBody');
for(const slot of ['attack','defeat']){const manager=$(slot+'VoiceManager');manager.hidden=false;manager.style.cssText='display:block;margin:0;padding:0;border:0';voiceModalBody.appendChild(manager);manager.hidden=true;}
function openVoiceModal(slot){$('attackVoiceManager').hidden=slot!=='attack';$('defeatVoiceManager').hidden=slot!=='defeat';$('voiceModalTitle').textContent=slot==='attack'?'⚔️ 攻撃ボイスの設定':'💥 敗北ボイスの設定';voiceModal.hidden=false;renderVoiceLibraries();voiceStatus(slot==='attack'?'攻撃ボイスを選択、または新しく追加してください。':'敗北ボイスを選択、または新しく追加してください。');}
$('closeVoiceModal').addEventListener('click',()=>{voiceModal.hidden=true;});
voiceModal.addEventListener('click',e=>{if(e.target===voiceModal)voiceModal.hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!voiceModal.hidden)voiceModal.hidden=true;});
$('chooseMyAttackVoice').addEventListener('click',()=>openVoiceModal('attack'));
$('chooseMyDefeatVoice').addEventListener('click',()=>openVoiceModal('defeat'));
refreshVoiceButtons();

function voiceStatus(t){const el=$('additionalVoiceStatus');if(el)el.textContent=t;}
const libraryDraft={attack:null,defeat:null},libraryRecorders={attack:null,defeat:null};
const libraryNames={attack:'attackVoiceLibrary',defeat:'defeatVoiceLibrary'},activeKeys={attack:'attackVoice',defeat:'defeatVoice'};
async function readLibrary(slot){return (await getMedia(libraryNames[slot]))||[];}
async function renderVoiceLibraries(){
 for(const slot of ['attack','defeat']){
  const list=await readLibrary(slot),host=$(slot+'LibraryList');if(!host)continue;host.innerHTML='';
  if(!list.length){host.textContent='登録したボイスはありません';host.style.cssText='font-size:12px;color:#94a3b8;margin-top:8px';continue;}
  host.style.cssText='display:grid;gap:7px;margin-top:8px';
  list.forEach((item,index)=>{
   const row=document.createElement('div');row.style.cssText='border:1px solid #dbe1ea;border-radius:10px;padding:8px;font-size:12px;background:#f8fafc';
   const title=document.createElement('div');title.textContent=(item.name||('ボイス '+(index+1)))+(item.active?' ✓ 使用中':'');title.style.fontWeight='800';
   const actions=document.createElement('div');actions.style.cssText='display:flex;gap:5px;flex-wrap:wrap;margin-top:6px';
   const set=document.createElement('button');set.textContent='設定';set.disabled=!!item.active;set.addEventListener('click',()=>selectLibraryVoice(slot,item.id));
   const preview=document.createElement('button');preview.textContent='試聴';preview.addEventListener('click',()=>{const u=URL.createObjectURL(item.blob),a=new Audio(u);a.volume=typeof audioPrefs!=='undefined'?audioPrefs.voice/100:1;a.play().catch(()=>voiceStatus('試聴を開始できませんでした'));a.onended=()=>URL.revokeObjectURL(u);});
   const del=document.createElement('button');del.textContent='削除';del.style.background='#64748b';del.addEventListener('click',()=>deleteLibraryVoice(slot,item.id));
   actions.append(set,preview,del);row.append(title,actions);host.appendChild(row);
  });
 }
}
renderVoiceLibraries();

async function selectLibraryVoice(slot,id){
 const list=await readLibrary(slot),item=list.find(x=>x.id===id);if(!item)return;
 await putMedia(activeKeys[slot],item.blob);await loadCustomAudio();
 list.forEach(x=>x.active=x.id===id);await putMedia(libraryNames[slot],list);
 await renderVoiceLibraries();await refreshVoiceButtons();voiceStatus((slot==='attack'?'攻撃':'敗北')+'ボイスを設定しました。');
}
async function deleteLibraryVoice(slot,id){
 const list=await readLibrary(slot),item=list.find(x=>x.id===id);if(!item)return;
 await putMedia(libraryNames[slot],list.filter(x=>x.id!==id));
 if(item.active){await removeMedia(activeKeys[slot]);await loadCustomAudio();}
 await renderVoiceLibraries();await refreshVoiceButtons();voiceStatus('ライブラリから削除しました。');
}
function setLibraryDraft(slot,blob,name){
 if(!blob||!blob.size){voiceStatus('音声データを読み込めませんでした');return;}
 if(blob.size>12*1024*1024){voiceStatus('音声ファイルは12MB以下にしてください');return;}
 libraryDraft[slot]={blob,name:String(name||'録音ボイス').replace(/[<>]/g,'').slice(0,32)||'録音ボイス'};
 $('save'+(slot==='attack'?'Attack':'Defeat')+'Library').disabled=false;
}
for(const slot of ['attack','defeat']){
 const cap=slot==='attack'?'Attack':'Defeat';
 $(slot+'LibraryFile').addEventListener('change',e=>{const file=e.target.files&&e.target.files[0];if(file)setLibraryDraft(slot,file,file.name.replace(/\.[^.]+$/,''));});
 $('record'+cap+'Library').addEventListener('click',async()=>{
  try{
   if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder)throw new Error('録音非対応です。音声ファイルを選択してください。');
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
   const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t));
   const recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream),chunks=[];
   libraryRecorders[slot]={recorder,stream,chunks};
   recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
   recorder.onstop=()=>{setLibraryDraft(slot,new Blob(chunks,{type:recorder.mimeType||'audio/webm'}),slot==='attack'?'自分の攻撃ボイス':'自分の敗北ボイス');stream.getTracks().forEach(t=>t.stop());$('record'+cap+'Library').disabled=false;$('stop'+cap+'Library').disabled=true;};
   recorder.start();$('record'+cap+'Library').disabled=true;$('stop'+cap+'Library').disabled=false;voiceStatus('録音中…');
  }catch(e){voiceStatus(e.message||'録音できませんでした');}
 });
 $('stop'+cap+'Library').addEventListener('click',()=>{const r=libraryRecorders[slot];if(r&&r.recorder.state!=='inactive')r.recorder.stop();});
 $('save'+cap+'Library').addEventListener('click',()=>{
  const draft=libraryDraft[slot];if(!draft)return;
  charge(100,'ボイスライブラリへの追加',async()=>{
   try{const list=await readLibrary(slot);list.push({id:'v'+Date.now()+Math.random().toString(36).slice(2,6),name:draft.name,blob:draft.blob,active:false,createdAt:Date.now()});await putMedia(libraryNames[slot],list);libraryDraft[slot]=null;$('save'+cap+'Library').disabled=true;$(slot+'LibraryFile').value='';await renderVoiceLibraries();voiceStatus('ライブラリに追加しました。設定ボタンからいつでも切り替えできます。');}
   catch(e){voiceStatus('保存に失敗しました：'+e.message);}
  });
 });
}

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
async function presetBlob(path){const res=await fetch(path+'?v=3');if(!res.ok)throw new Error('音声ファイルを読み込めません');const b64=(await res.text()).trim();const raw=atob(b64);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:'audio/mpeg'});}
async function previewPreset(path){try{const blob=await presetBlob(path),url=URL.createObjectURL(blob),a=new Audio(url);a.volume=audioPrefs.voice/100;a.play().catch(()=>voiceStatus('試聴を開始できませんでした。'));a.onended=()=>URL.revokeObjectURL(url);}catch(e){voiceStatus('試聴に失敗しました：'+e.message);}}
$('previewShamarupiPreset').addEventListener('click',()=>previewPreset('./audio/shamarupi-kansai.mp3.b64'));
$('previewNniPreset').addEventListener('click',()=>previewPreset('./audio/nni-all.mp3.b64'));
async function applyPresetVoice(key,path,label){
 let stage='購入状態の確認';
 try{
  const purchased=await getMedia(key+'Purchased');
  stage='音声ファイルの取得';
  const blob=await presetBlob(path);
  if(!blob||!blob.size)throw new Error('音声データが空です');
  stage='端末への保存';
  const save=async()=>{
   await putMedia(key,blob);
   await putMedia(key+'Purchased',true);
   stage='再生用データの準備';
   try{await loadCustomAudio();}catch(e){console.warn('Audio preload warning:',e);}
   stage='画面の更新';
   await refreshVoiceButtons();
   voiceStatus(label+'を設定しました。ゲームで確認してください。');
  };
  if(purchased){await save();return;}
  if(window.chargeGameCoins){
   stage='金の玉の決済';
   await window.chargeGameCoins(200,label,save);
   return;
  }
  if(wallet<200){voiceStatus('金の玉が足りません。');return;}
  wallet-=200;saveWallet();updateShopUI();await save();
 }catch(e){
  console.error('Preset voice setup failed at '+stage,e);
  voiceStatus('設定に失敗しました（'+stage+'）：'+(e&&e.message?e.message:String(e)));
 }
}
$('setShamarupiPreset').addEventListener('click',()=>applyPresetVoice('attackVoice','./audio/shamarupi-kansai.mp3.b64','攻撃ボイス'));
$('setNniPreset').addEventListener('click',()=>applyPresetVoice('defeatVoice','./audio/nni-all.mp3.b64','敗北ボイス'));
$('resetAttackPreset').addEventListener('click',async()=>{await removeMedia('attackVoice');await loadCustomAudio();voiceBlob=null;voiceStatus('攻撃ボイスを初期設定に戻しました。');await refreshVoiceButtons();});
$('resetDefeatVoice').addEventListener('click',async()=>{await removeMedia('defeatVoice');await loadCustomAudio();voiceStatus('敗北ボイスを初期設定に戻しました。');await refreshVoiceButtons();});

function previewImage(blob){if(customImageUrl)URL.revokeObjectURL(customImageUrl);customImageUrl=URL.createObjectURL(blob);playerImg.src=customImageUrl;imgPreview.src=customImageUrl;imgPreview.style.display='block';}
async function renderImageLibrary(){
 const host=$('playerImageLibrary');if(!host)return;const list=(await getMedia('playerImageLibrary'))||[];const activeId=await getMedia('playerImageActiveId');
 host.innerHTML='';
 if(!list.length){host.textContent='登録した画像はまだありません。';host.style.color='#94a3b8';return;}
 list.forEach((item,index)=>{
  const card=document.createElement('div');card.style.cssText='border:1px solid #dbe1ea;border-radius:12px;padding:7px;background:#f8fafc;text-align:center;min-width:0';
  const img=document.createElement('img');img.src=URL.createObjectURL(item.blob);img.alt='保存画像 '+(index+1);img.style.cssText='width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px';
  const active=document.createElement('div');active.textContent=activeId===item.id?'✓ 使用中':'保存済み';active.style.cssText='font-size:11px;color:#64748b;margin:4px 0';
  const choose=document.createElement('button');choose.type='button';choose.textContent='この画像に設定';choose.style.cssText='width:100%;font-size:11px;padding:7px 3px';choose.addEventListener('click',async()=>{await putMedia('playerImage',item.blob);await putMedia('playerImageActiveId',item.id);previewImage(item.blob);await renderImageLibrary();msgSet('保存済み画像に変更しました。');});
  card.append(img,active,choose);host.appendChild(card);
 });
}

function previewVoice(blob){if(customVoiceUrl)URL.revokeObjectURL(customVoiceUrl);customVoiceUrl=URL.createObjectURL(blob);previewBtn.disabled=false;}
imgInput?.addEventListener('change',()=>{const f=imgInput.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){msgSet('画像ファイルを選択してください。');return;}if(f.size>8*1024*1024){msgSet('画像は8MB以下にしてください。');return;}imageBlob=f;imgPreview.src=URL.createObjectURL(f);imgPreview.style.display='block';msgSet('画像を選択しました。設定には200金の玉が必要です。');});
$('saveCustomPlayerImage')?.addEventListener('click',async()=>{if(!imageBlob){msgSet('先に画像を選択してください。');return;}charge(200,'キャラクター画像',async()=>{try{const list=(await getMedia('playerImageLibrary'))||[];const id='img'+Date.now()+Math.random().toString(36).slice(2,6);list.unshift({id,blob:imageBlob,createdAt:Date.now()});await putMedia('playerImageLibrary',list);await putMedia('playerImage',imageBlob);await putMedia('playerImageActiveId',id);previewImage(imageBlob);imageBlob=null;imgInput.value='';await renderImageLibrary();msgSet('画像をライブラリに登録しました。次回から無料で切り替えできます。');}catch(e){msgSet('保存に失敗しました：'+e.message);}});});
$('resetCustomPlayerImage')?.addEventListener('click',async()=>{try{await removeMedia('playerImage');await removeMedia('playerImageActiveId');playerImg.src=ASSETS.player;if(customImageUrl)URL.revokeObjectURL(customImageUrl);imgPreview.style.display='none';imageBlob=null;await renderImageLibrary();msgSet('初期画像に戻しました。ライブラリの画像は保存されています。');}catch(e){msgSet('初期化に失敗しました。');}});
voiceInput?.addEventListener('change',()=>{const f=voiceInput.files?.[0];if(!f)return;if(!f.type.startsWith('audio/')){msgSet('音声ファイルを選択してください。');return;}if(f.size>12*1024*1024){msgSet('音声ファイルは12MB以下にしてください。');return;}voiceBlob=f;saveVoiceBtn.disabled=false;previewBtn.disabled=false;msgSet('音声ファイルを選択しました。設定には200金の玉が必要です。');});
function setIOSAudioSession(type){try{if(navigator.audioSession)navigator.audioSession.type=type;}catch(e){console.warn('audioSession:',e);}}
function restoreAudioAfterRecording(){setIOSAudioSession('playback');setIOSAudioSession('auto');window.__customVoiceRecording=false;if(resumeBgmAfterRecording&&!window.__escapeMasterMute){resumeBgmAfterRecording=false;try{if(typeof bgmAudio!=='undefined')bgmAudio.muted=false;startBGM();}catch(e){}}else resumeBgmAfterRecording=false;}
recordBtn.addEventListener('click',async()=>{try{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('このブラウザでは録音に対応していません。音声ファイルを選択してください。');resumeBgmAfterRecording=!!(typeof bgmAudio!=='undefined'&&!bgmAudio.paused&&!window.__escapeMasterMute);window.__customVoiceRecording=true;window.__pauseGameAudioForRecording();setIOSAudioSession('auto');const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});setIOSAudioSession('play-and-record');const chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{voiceBlob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});stream.getTracks().forEach(t=>t.stop());restoreAudioAfterRecording();saveVoiceBtn.disabled=false;previewBtn.disabled=false;msgSet('録音しました。試聴してから設定できます。');};recorder.start();recordBtn.disabled=true;stopBtn.disabled=false;msgSet('録音中… BGMは停止しています。');}catch(e){restoreAudioAfterRecording();recordBtn.disabled=false;stopBtn.disabled=true;msgSet(e.message||'マイクを利用できません。');}});
stopBtn.addEventListener('click',()=>{if(recorder&&recorder.state!=='inactive'){recorder.stop();recordBtn.disabled=false;stopBtn.disabled=true;}});
$('saveCustomVoice').addEventListener('click',async()=>{if(!voiceBlob){msgSet('先に録音または音声ファイルを選択してください。');return;}charge(200,'カスタムボイス',async()=>{try{await putMedia('attackVoice',voiceBlob);await loadCustomAudio();msgSet('ボイスを保存しました。攻撃時に再生されます。');}catch(e){msgSet('保存に失敗しました：'+e.message);}});});
previewBtn.addEventListener('click',()=>{if(!voiceBlob)return;const u=URL.createObjectURL(voiceBlob),a=new Audio(u);a.play().catch(()=>msgSet('試聴を開始できませんでした。'));a.onended=()=>URL.revokeObjectURL(u);});
$('resetCustomVoice').addEventListener('click',async()=>{await removeMedia('attackVoice');voiceBlob=null;msgSet('初期ボイスに戻しました。');});
// Attack voice playback is handled by the unified wrapper below.
window.__pauseGameAudioForRecording=()=>{try{document.querySelectorAll('audio,video').forEach(el=>{try{el.pause();el.currentTime=0;}catch(e){}});if(typeof bgmAudio!=='undefined'){bgmAudio.pause();bgmAudio.currentTime=0;}if(typeof attackAudioPool!=='undefined')attackAudioPool.forEach(a=>{a.pause();a.currentTime=0;});if(typeof gameoverAudio!=='undefined'){gameoverAudio.pause();gameoverAudio.currentTime=0;}if(typeof audioContext!=='undefined'&&audioContext&&audioContext.state==='running')audioContext.suspend().catch(()=>{});}catch(e){console.warn('audio pause:',e);}};
// 購入済み音声を専用Audioプールで再生する。IndexedDB読込は事前に済ませ、
 // 攻撃・敗北イベント内では同期的に audio.play() を呼ぶ（iOSのユーザー操作制限対策）。
function clearCustomAudio(){
 customAttackPool.forEach(a=>{try{a.pause();a.src='';}catch(e){}});
 customAttackPool=[];
 if(customAttackUrl){URL.revokeObjectURL(customAttackUrl);customAttackUrl=null;}
 if(customDefeatAudio){try{customDefeatAudio.pause();customDefeatAudio.src='';}catch(e){}customDefeatAudio=null;}
 if(customDefeatUrl){URL.revokeObjectURL(customDefeatUrl);customDefeatUrl=null;}
}
async function loadCustomAudio(){
 const [attackBlob,defeatBlob]=await Promise.all([getMedia('attackVoice'),getMedia('defeatVoice')]);
 const volume=()=>Math.max(0,Math.min(1,(typeof audioPrefs!=='undefined'&&audioPrefs?audioPrefs.voice:100)/100));
 if(attackBlob){
  if(customAttackUrl)URL.revokeObjectURL(customAttackUrl);
  customAttackUrl=URL.createObjectURL(attackBlob);
  customAttackPool=Array.from({length:6},()=>{const a=new Audio(customAttackUrl);a.preload='auto';a.playsInline=true;a.volume=volume();return a;});
 }else{customAttackPool=[];if(customAttackUrl)URL.revokeObjectURL(customAttackUrl);customAttackUrl=null;}
 if(defeatBlob){
  if(customDefeatUrl)URL.revokeObjectURL(customDefeatUrl);
  customDefeatUrl=URL.createObjectURL(defeatBlob);
  customDefeatAudio=new Audio(customDefeatUrl);customDefeatAudio.preload='auto';customDefeatAudio.volume=volume();
 }else{customDefeatAudio=null;if(customDefeatUrl)URL.revokeObjectURL(customDefeatUrl);customDefeatUrl=null;}
}
function playCustomAttack(){
 if(!customAttackPool.length)return false;
 const a=customAttackPool[customAttackIndex++%customAttackPool.length];
 try{a.volume=(typeof audioPrefs!=='undefined'&&audioPrefs?audioPrefs.voice:100)/100;a.pause();a.currentTime=0;const p=a.play();if(p&&p.catch)p.catch(()=>{});return true;}catch(e){return false;}
}
const originalPlayAttack=playAttack;
playAttack=function(){
 if(window.__escapeMasterMute)return;
 if(!playCustomAttack())originalPlayAttack();
};
const originalEndGame=endGame;
endGame=function(){
 if(gameOver)return;
 if(window.__escapeMasterMute){gameOver=true;bgmAudio.pause();bgmStarted=false;return;}
 if(customDefeatAudio){
  gameOver=true;bgmAudio.pause();bgmStarted=false;
  try{customDefeatAudio.volume=(typeof audioPrefs!=='undefined'&&audioPrefs?audioPrefs.voice:100)/100;customDefeatAudio.pause();customDefeatAudio.currentTime=0;const p=customDefeatAudio.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}
  return;
 }
 originalEndGame();
};
loadCustomAudio().catch(e=>console.warn('Custom audio preload failed:',e));
const MUTE_KEY='escapeGameMasterMuteV1';window.__escapeMasterMute=localStorage.getItem(MUTE_KEY)==='1';
const settings=$('#settingsScreen .ranking-panel');
const muteRow=document.createElement('div');muteRow.className='setting-row';muteRow.innerHTML='<span>🔇 マスターミュート</span><button type="button" id="masterMuteToggle">ミュート OFF</button>';settings.insertBefore(muteRow,settings.querySelector('.setting-row'));
const muteBtn=$('masterMuteToggle');
function applyMute(){muteBtn.textContent=window.__escapeMasterMute?'ミュート ON':'ミュート OFF';muteBtn.setAttribute('aria-pressed',String(window.__escapeMasterMute));if(window.__escapeMasterMute){bgmAudio.pause();bgmStarted=false;attackAudioPool.forEach(a=>{a.pause();a.currentTime=0;});gameoverAudio.pause();gameoverAudio.currentTime=0;if(audioContext&&audioContext.state==='running')audioContext.suspend().catch(()=>{});}else if(audioContext&&audioContext.state==='suspended')audioContext.resume().catch(()=>{});}
muteBtn.addEventListener('click',()=>{window.__escapeMasterMute=!window.__escapeMasterMute;localStorage.setItem(MUTE_KEY,window.__escapeMasterMute?'1':'0');applyMute();});
const originalStartBGM=startBGM;startBGM=function(){if(window.__escapeMasterMute||window.__customVoiceRecording)return;originalStartBGM();};
const originalPlay=play;play=function(a){if(window.__escapeMasterMute)return;originalPlay(a);};
// 音声再生は1か所で制御。購入済み音声がある場合は標準音声を鳴らさず、カスタム音声だけを再生する。
getMedia('playerImage').then(async blob=>{if(blob){previewImage(blob);let list=(await getMedia('playerImageLibrary'))||[];if(!list.length){list=[{id:'legacy'+Date.now(),blob,createdAt:Date.now()}];await putMedia('playerImageLibrary',list);await putMedia('playerImageActiveId',list[0].id);}await renderImageLibrary();}else await renderImageLibrary();}).catch(()=>{});
getMedia('attackVoice').then(blob=>{if(blob){voiceBlob=blob;if(previewBtn)previewBtn.disabled=false;if(saveVoiceBtn)saveVoiceBtn.disabled=false;msgSet('保存済みの攻撃ボイスがあります。');}}).catch(()=>{});
applyMute();
})();