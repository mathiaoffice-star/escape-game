(()=>{'use strict';
const $=id=>document.getElementById(id);
function dbOpen(){return new Promise((ok,no)=>{const r=indexedDB.open('escapeGameCustomMediaV1',3);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('media'))r.result.createObjectStore('media');};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function dbGet(k){const d=await dbOpen();return new Promise((ok,no)=>{const r=d.transaction('media','readonly').objectStore('media').get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function dbPut(k,v){const d=await dbOpen();return new Promise((ok,no)=>{const t=d.transaction('media','readwrite');t.objectStore('media').put(v,k);t.oncomplete=ok;t.onerror=()=>no(t.error);});}
async function presetBlob(path){const r=await fetch(path+'?v=3');if(!r.ok)throw Error('音声データを取得できません');const b=atob((await r.text()).trim()),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return new Blob([a],{type:'audio/mpeg'});}
function status(t){const el=$('voiceModalStatus');if(el)el.textContent=t;}
async function charge(cost,label,done){
 if(typeof window.chargeGameCoins==='function'){window.chargeGameCoins(cost,label,done);return;}
 if(typeof window.wallet==='number'&&window.wallet>=cost&&typeof window.saveWallet==='function'){window.wallet-=cost;window.saveWallet();if(typeof window.updateShopUI==='function')window.updateShopUI();await done();return;}
 status('金の玉が足りないか、決済機能を読み込めません。'); 
}
function buildView(slot){
 const id=slot+'VoiceCategoryView';let view=$(id);if(view)return view;
 const isAttack=slot==='attack',name=isAttack?'シャマルピー（関西ver）':'ンニイイイ（全員ver）',path=isAttack?'./audio/shamarupi-kansai.mp3.b64':'./audio/nni-all.mp3.b64',key=isAttack?'attackVoice':'defeatVoice';
 view=document.createElement('div');view.id=id;view.style.cssText='display:none;width:100%;max-height:65vh;overflow:auto';
 const preset=document.createElement('section');preset.style.cssText='padding:14px;border:1px solid #dbe1ea;border-radius:14px;margin:10px 0;background:#fff;color:#111827';
 preset.innerHTML='<b style="font-size:17px">'+(isAttack?'⚔️ ':'💥 ')+name+'</b><p style="font-size:13px;color:#64748b">プリセットボイス</p>';
 const actions=document.createElement('div');actions.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px';
 const preview=document.createElement('button');preview.type='button';preview.textContent='▶ 試聴';
 preview.onclick=async()=>{try{const u=URL.createObjectURL(await presetBlob(path)),a=new Audio(u);a.play().catch(()=>status('試聴を開始できませんでした'));a.onended=()=>URL.revokeObjectURL(u);}catch(e){status('試聴失敗：'+e.message);}};
 const set=document.createElement('button');set.type='button';set.textContent='200金の玉で購入・設定';
 set.onclick=()=>charge(200,name,async()=>{try{await dbPut(key,await presetBlob(path));await dbPut(key+'Purchased',true);status(name+'を設定しました。');set.textContent='設定済み ✓';}catch(e){status('設定失敗：'+e.message);}});
 actions.append(preview,set);preset.appendChild(actions);
 const reset=document.createElement('button');reset.type='button';reset.textContent='初期ボイスに戻す';reset.style.cssText='width:100%;margin-top:9px;background:#64748b';
 reset.onclick=async()=>{try{const d=await dbOpen();await new Promise((ok,no)=>{const tx=d.transaction('media','readwrite'),st=tx.objectStore('media');st.delete(key);st.delete(key+'Purchased');tx.oncomplete=ok;tx.onerror=()=>no(tx.error);});status((isAttack?'攻撃':'敗北')+'ボイスを初期設定に戻しました。');set.textContent='200金の玉で購入・設定';}catch(e){status('初期化に失敗しました：'+e.message);}};
 preset.appendChild(reset);view.appendChild(preset);
 const custom=document.createElement('section');custom.style.cssText='padding:14px;border:1px solid #dbe1ea;border-radius:14px;margin:10px 0;background:#fff;color:#111827';
 custom.innerHTML='<b style="font-size:17px">🎙️ 自分のボイス</b><p style="font-size:13px;color:#64748b">音声ファイルを登録してライブラリに保存</p>';
 const input=document.createElement('input');input.type='file';input.accept='audio/*';input.style.cssText='width:100%;margin:8px 0';
 const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:8px 0';
 const record=document.createElement('button');record.type='button';record.textContent='🎙️ 録音開始';
 const stop=document.createElement('button');stop.type='button';stop.textContent='■ 録音停止';stop.disabled=true;
 const previewCustom=document.createElement('button');previewCustom.type='button';previewCustom.textContent='▶ 試聴';previewCustom.disabled=true;
 const save=document.createElement('button');save.type='button';save.textContent='100金の玉で追加';save.disabled=true;
 let blob=null,recorder=null,stream=null,previewUrl=null;
 const setBlob=b=>{blob=b;save.disabled=!b;previewCustom.disabled=!b;};
 input.onchange=()=>{const file=input.files&&input.files[0];if(file){setBlob(file);status('音声ファイルを選択しました。保存前に試聴できます。');}};
 record.onclick=async()=>{try{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('このブラウザは録音に対応していません。音声ファイルを選択してください。');
  stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const chunks=[];recorder=new MediaRecorder(stream);
  recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  recorder.onstop=()=>{const type=recorder.mimeType||'audio/webm';setBlob(new Blob(chunks,{type}));stream?.getTracks().forEach(t=>t.stop());stream=null;record.disabled=false;stop.disabled=true;status('録音しました。保存前に試聴できます。');};
  recorder.start();record.disabled=true;stop.disabled=false;status('録音中です…');
 }catch(e){stream?.getTracks().forEach(t=>t.stop());stream=null;record.disabled=false;stop.disabled=true;status('録音できません：'+e.message);}};
 stop.onclick=()=>{if(recorder&&recorder.state!=='inactive')recorder.stop();};
 previewCustom.onclick=()=>{if(!blob)return;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);const audio=new Audio(previewUrl);audio.play().catch(e=>status('試聴できません：'+e.message));audio.onended=()=>{URL.revokeObjectURL(previewUrl);previewUrl=null;};};
 save.onclick=()=>{if(!blob)return;charge(100,'自分のボイス',async()=>{try{const list=(await dbGet(slot+'VoiceLibrary'))||[];list.push({id:'voice'+Date.now(),name:input.files?.[0]?.name||'録音ボイス',blob,active:true});await dbPut(slot+'VoiceLibrary',list);await dbPut(key,blob);status('ライブラリに追加しました。');save.textContent='追加済み ✓';}catch(e){status('保存失敗：'+e.message);}});};
 controls.append(record,stop,previewCustom,save);custom.append(input,controls);view.appendChild(custom);
 const modalBody=$('voiceModalBody');if(modalBody)modalBody.appendChild(view);
 return view;
}
function showCategory(slot){
 const modal=$('voiceLibraryModal');if(!modal)return;
 const home=$('voiceCategoryHome');if(home)home.style.setProperty('display','none','important');
 const view=buildView(slot);
 const other=$( (slot==='attack'?'defeat':'attack')+'VoiceCategoryView');if(other)other.style.display='none';
 const back=$('backVoiceCategories');if(back)back.style.setProperty('display','inline-flex','important');
 view.hidden=false;view.style.setProperty('display','block','important');view.style.visibility='visible';
 const body=$('voiceModalBody');if(body)body.scrollTop=0;
}
function backHome(){
 const home=$('voiceCategoryHome');if(home)home.style.setProperty('display','grid','important');
 ['attack','defeat'].forEach(s=>{const v=$(s+'VoiceCategoryView');if(v)v.style.display='none';});
 const back=$('backVoiceCategories');if(back)back.style.display='none';
}
function bind(){
 const trigger=$('openAdditionalVoices');if(!trigger)return;
 let modal=$('voiceLibraryModal');
 if(!modal){modal=document.createElement('div');modal.id='voiceLibraryModal';modal.innerHTML='<section><b>🎙️ 追加ボイス</b><button id="closeVoiceModal">閉じる</button><div id="voiceModalBody"><div id="voiceCategoryHome"><button id="openAttackVoiceCategory">⚔️ 攻撃ボイス</button><button id="openDefeatVoiceCategory">💥 敗北ボイス</button></div></div></section>';document.body.appendChild(modal);}
 if(!trigger.dataset.voiceOpenBound){trigger.dataset.voiceOpenBound='1';trigger.addEventListener('click',e=>{e.preventDefault();modal.style.setProperty('display','flex','important');},true);}
}
function delegated(e){
 const t=e.target&&e.target.closest?e.target.closest('#openAttackVoiceCategory,#openDefeatVoiceCategory,#backVoiceCategories,#closeVoiceModal'):null;if(!t)return;
 if(t.id==='openAttackVoiceCategory'||t.id==='openDefeatVoiceCategory'){e.preventDefault();e.stopPropagation();showCategory(t.id==='openAttackVoiceCategory'?'attack':'defeat');}
 else if(t.id==='backVoiceCategories'){e.preventDefault();e.stopPropagation();backHome();}
 else if(t.id==='closeVoiceModal'){e.preventDefault();e.stopPropagation();const m=$('voiceLibraryModal');if(m)m.style.display='none';document.body.style.overflow='';}
}
function start(){bind();['click','pointerup','touchend'].forEach(type=>document.addEventListener(type,delegated,{capture:true,passive:false}));const mo=new MutationObserver(bind);mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),30000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();