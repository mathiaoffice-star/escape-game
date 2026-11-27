/* Nnyaata character integration for normal game and battle mode */
(() => {
  'use strict';
  if (window.__nnyaataCharacterSystemLoaded) return;
  window.__nnyaataCharacterSystemLoaded = true;
  const STORE='shamarupiWarV1';
  const IMAGE='./characters/nnyaata.jpg';
  const DEFAULT_IMAGE='./characters/default-character.jpg';
  const VOICE='./audio/nnyaata.mp3';
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(_){return {}}};
  const audio=new Audio(VOICE);
  audio.preload='auto';
  let lastVoiceAt=0;
  function isSelected(){return read().selectedCharacter==='nnyaata' && (read().characters||[]).includes('nnyaata');}
  function playVoice(){
    if(!isSelected())return;
    const now=performance.now();
    if(now-lastVoiceAt<90)return;
    lastVoiceAt=now;
    try{audio.pause();audio.currentTime=0;const p=audio.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}
  }
  const characterImages={
    nnyaata:new Image(),
    default:new Image()
  };
  characterImages.nnyaata.src=IMAGE;
  characterImages.default.src=DEFAULT_IMAGE;
  function selectedImage(){
    return isSelected()?characterImages.nnyaata:characterImages.default;
  }
  function applyCharacter(){
    window.__defaultCharacterImage=DEFAULT_IMAGE;
    const defaultCardImage=document.getElementById('sw-default-image');
    if(defaultCardImage && defaultCardImage.getAttribute('src')!==DEFAULT_IMAGE)defaultCardImage.src=DEFAULT_IMAGE;
    const chosen=isSelected()?IMAGE:DEFAULT_IMAGE;
    // 通常モードが実際に描画で使う playerImg を直接更新する。
    // さらに描画関数側でも選択画像を差し替え、reset等で画像が戻されても反映を維持する。
    try {
      if(typeof playerImg!=='undefined' && playerImg instanceof HTMLImageElement && playerImg.getAttribute('src')!==chosen){
        playerImg.src=chosen;
      }
    } catch(error) { console.warn('[character] playerImg update failed',error); }
    const img=document.getElementById('playerImg')||document.querySelector('img[data-player-image]');
    if(img && img.getAttribute('src')!==chosen)img.src=chosen;
    window.__shamarupiCharacterImage=chosen;
    window.__shamarupiSelectedCharacter=isSelected()?'nnyaata':'default';
  }
  // 通常ゲームの描画処理に選択キャラを直接渡す保険。
  // playerImg の初期化順や reset 時の src 再設定に左右されず、プレイヤー描画だけを切り替える。
  try {
    if(typeof drawImageOrFallback==='function' && !window.__nnyaataDrawWrapped){
      const originalDrawImageOrFallback=drawImageOrFallback;
      window.drawImageOrFallback=function(img,x,y,size,isPlayer){
        if(isPlayer){
          const selected=selectedImage();
          if(selected.complete && selected.naturalWidth) img=selected;
        }
        return originalDrawImageOrFallback(img,x,y,size,isPlayer);
      };
      window.__nnyaataDrawWrapped=true;
    }
  } catch(error) { console.warn('[character] draw wrapper unavailable',error); }
  window.__defaultCharacterImage=DEFAULT_IMAGE;
  window.dispatchEvent(new CustomEvent('shamarupi-character-change',{detail:{id:'default',image:DEFAULT_IMAGE}}));
  window.playNnyaataVoice=playVoice;
  window.addEventListener('shamarupi-character-change',e=>{
    if(e.detail?.id==='nnyaata'||e.detail?.id==='default')applyCharacter();
  });
  document.addEventListener('DOMContentLoaded',applyCharacter);
  applyCharacter();
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#attackBtn');
    if(btn)playVoice();
  },true);
  document.addEventListener('keydown',e=>{
    if((e.code==='Space'||e.key===' ')&&!e.repeat){
      const tag=(document.activeElement?.tagName||'').toLowerCase();
      if(tag!=='input'&&tag!=='textarea'&&tag!=='button')playVoice();
    }
  },true);
  const observer=new MutationObserver(()=>{applyCharacter();});
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();
