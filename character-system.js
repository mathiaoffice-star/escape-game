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
  function applyCharacter(){
    window.__defaultCharacterImage=DEFAULT_IMAGE;
    const defaultCardImage=document.getElementById('sw-default-image');
    if(defaultCardImage && defaultCardImage.getAttribute('src')!==DEFAULT_IMAGE)defaultCardImage.src=DEFAULT_IMAGE;
    const chosen=isSelected()?'./characters/nnyaata.jpg':DEFAULT_IMAGE;
    // 通常ゲームの playerImg はメインスクリプト内のトップレベル const なので window.playerImg ではなく字句束縛を更新する
    try { if(typeof playerImg!=='undefined' && playerImg instanceof HTMLImageElement && playerImg.getAttribute('src')!==chosen) playerImg.src=chosen; }
    catch(error) { console.warn('[character] normal player image update failed',error); }
    const img=document.getElementById('playerImg')||document.querySelector('img[data-player-image]');
    if(img && img.getAttribute('src')!==chosen)img.src=chosen;
    window.__shamarupiCharacterImage=chosen;
  }
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
