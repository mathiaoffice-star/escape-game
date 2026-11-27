/* Nnyaata character integration for normal game and battle mode */
(() => {
  'use strict';
  if (window.__nnyaataCharacterSystemLoaded) return;
  window.__nnyaataCharacterSystemLoaded = true;
  const STORE='shamarupiWarV1';
  const IMAGE='data:image/webp;base64,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';
  const DEFAULT_IMAGE=IMAGE;
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
    const img=document.getElementById('playerImg')||document.querySelector('img[data-player-image]');
    if(!img)return;
    if(!img.dataset.nnyaataOriginalSrc)img.dataset.nnyaataOriginalSrc=img.currentSrc||img.src;
    const chosen=isSelected()?'./characters/nnyaata.jpg':DEFAULT_IMAGE;
    if(img.src!==new URL(chosen,document.baseURI).href)img.src=chosen;
    if(window.playerImg instanceof HTMLImageElement)window.playerImg.src=chosen;
    window.__shamarupiCharacterImage=chosen;
    window.__defaultCharacterImage=DEFAULT_IMAGE;
  }
  window.__defaultCharacterImage=DEFAULT_IMAGE;
  window.dispatchEvent(new CustomEvent('shamarupi-character-change',{detail:{id:'default',image:DEFAULT_IMAGE}}));
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
