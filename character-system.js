/* Nnyaata character integration for normal game and battle mode */
(() => {
  'use strict';
  if (window.__nnyaataCharacterSystemLoaded) return;
  window.__nnyaataCharacterSystemLoaded = true;
  const STORE='shamarupiWarV1';
  const IMAGE='./characters/nnyaata.jpg';
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
    if(!isSelected())return;
    const img=document.getElementById('playerImg')||document.querySelector('img[data-player-image]');
    if(img instanceof HTMLImageElement && img.src!==new URL(IMAGE,document.baseURI).href) img.src=IMAGE;
    if(window.playerImg instanceof HTMLImageElement) window.playerImg.src=IMAGE;
    if(window.ASSETS && typeof window.ASSETS==='object'){
      const replacement=new Image();replacement.src=IMAGE;window.ASSETS.player=replacement;
    }
    window.__shamarupiCharacterImage=IMAGE;
  }
  window.playNnyaataVoice=playVoice;
  window.addEventListener('shamarupi-character-change',e=>{
    if(e.detail?.id==='nnyaata')applyCharacter();
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
  const observer=new MutationObserver(()=>{if(isSelected())applyCharacter();});
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();
