/* Nnyaata character integration for normal game and battle mode */
(() => {
  'use strict';
  if (window.__nnyaataCharacterSystemLoaded) return;
  window.__nnyaataCharacterSystemLoaded = true;
  const STORE='shamarupiWarV1';
  const IMAGE='./characters/nnyaata.jpg';
  const SENPAI_IMAGE='./characters/senpai.jpg';
  const DEFAULT_IMAGE='./characters/default-character.jpg';
  const VOICE='./audio/nnyaata.mp3';
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(_){return {}}};
  const audio=new Audio(VOICE);
  audio.preload='auto';
  const SENPAI_ATTACK='./audio/gayボイス.mp3';
  const senpaiAudio=new Audio(SENPAI_ATTACK);
  senpaiAudio.preload='auto';
  window.__senpaiVoiceAudio=senpaiAudio;
  function playSenpaiVoice(){
    if(!isSenpaiSelected())return;
    try{senpaiAudio.pause();senpaiAudio.currentTime=0;const p=senpaiAudio.play();if(p)p.catch(()=>{});}catch(e){}
  }
  window.playSenpaiVoice=playSenpaiVoice;
  // Block every other audio.play() invoked by the same attack input while Nnyaata is selected.
  // This also catches detached new Audio() instances that cannot be found in the DOM.
  if(!window.__nnyaataMediaPlayGuard){
    const nativeMediaPlay=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){
      if(window.__customCharacterAttackInput && this!==window.__nnyaataVoiceAudio && this!==audio && this!==window.__senpaiVoiceAudio){
        return Promise.resolve();
      }
      return nativeMediaPlay.apply(this,arguments);
    };
    window.__nnyaataMediaPlayGuard=true;
  }
  let lastVoiceAt=0;
  function isSelected(){const saved=read();return saved.selectedCharacter==='nnyaata' && (saved.characters||[]).includes('nnyaata');}
  function isSenpaiSelected(){const saved=read();return saved.selectedCharacter==='senpai' && (saved.characters||[]).includes('senpai');}
  function isCustomCharacterSelected(){return isSelected()||isSenpaiSelected();}
  function playVoice(){
    if(!isSelected())return;
    const now=performance.now();
    if(now-lastVoiceAt<90)return;
    lastVoiceAt=now;
    try{audio.pause();audio.currentTime=0;const p=audio.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}
  }
  const characterImages={
    nnyaata:new Image(),
    senpai:new Image(),
    default:new Image()
  };
  characterImages.nnyaata.src=IMAGE;
  characterImages.senpai.src=SENPAI_IMAGE;
  characterImages.default.src=DEFAULT_IMAGE;
  function selectedImage(){
    return isSelected()?characterImages.nnyaata:isSenpaiSelected()?characterImages.senpai:characterImages.default;
  }
  function applyCharacter(){
    window.__defaultCharacterImage=DEFAULT_IMAGE;
    const defaultCardImage=document.getElementById('sw-default-image');
    if(defaultCardImage && defaultCardImage.getAttribute('src')!==DEFAULT_IMAGE)defaultCardImage.src=DEFAULT_IMAGE;
    const chosen=isSelected()?IMAGE:isSenpaiSelected()?SENPAI_IMAGE:DEFAULT_IMAGE;
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
    window.__shamarupiSelectedCharacter=isSelected()?'nnyaata':isSenpaiSelected()?'senpai':'default';
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
  window.__nnyaataVoiceAudio=audio;
  // Attack input can trigger the original game's sound through a separate internal
  // function (not window.playAttack). Stop only audio elements newly started by
  // that same input, while leaving BGM and the Nnyaata voice untouched.
  function capturePlayingMedia(){
    return new Set(Array.from(document.querySelectorAll('audio,video')).filter(el=>!el.paused));
  }
  function silenceNewAttackMedia(before){
    if(!isCustomCharacterSelected())return;
    document.querySelectorAll('audio,video').forEach(el=>{
      if(el===audio || el===window.__nnyaataVoiceAudio || before.has(el))return;
      if(!el.paused){
        try{el.pause();el.currentTime=0;}catch(e){}
      }
    });
  }
  let clickMediaBefore=null, keyMediaBefore=null;
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#attackBtn')){window.__nnyaataAttackInput=isSelected();window.__customCharacterAttackInput=isCustomCharacterSelected();clickMediaBefore=capturePlayingMedia();}
  },true);
  document.addEventListener('click',e=>{
    if(!e.target?.closest?.('#attackBtn'))return;
    silenceNewAttackMedia(clickMediaBefore||new Set());
    clickMediaBefore=null;window.__nnyaataAttackInput=false;window.__customCharacterAttackInput=false;
  },false);
  document.addEventListener('keydown',e=>{
    const tag=(document.activeElement?.tagName||'').toLowerCase();
    if((e.code==='Space'||e.key===' ')&&!e.repeat&&tag!=='input'&&tag!=='textarea'&&tag!=='button'){window.__nnyaataAttackInput=isSelected();window.__customCharacterAttackInput=isCustomCharacterSelected();keyMediaBefore=capturePlayingMedia();}
  },true);
  document.addEventListener('keydown',e=>{
    if((e.code==='Space'||e.key===' ')&&!e.repeat){
      silenceNewAttackMedia(keyMediaBefore||new Set());
      keyMediaBefore=null;window.__nnyaataAttackInput=false;window.__customCharacterAttackInput=false;
    }
  },false);
  window.addEventListener('shamarupi-character-change',e=>{
    if(e.detail?.id==='nnyaata'||e.detail?.id==='senpai'||e.detail?.id==='default')applyCharacter();
  });
  document.addEventListener('DOMContentLoaded',applyCharacter);
  applyCharacter();
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#attackBtn');
    if(btn){if(isSelected())playVoice();else if(isSenpaiSelected())playSenpaiVoice();}
  },true);
  document.addEventListener('keydown',e=>{
    if((e.code==='Space'||e.key===' ')&&!e.repeat){
      const tag=(document.activeElement?.tagName||'').toLowerCase();
      if(tag!=='input'&&tag!=='textarea'&&tag!=='button'){if(isSelected())playVoice();else if(isSenpaiSelected())playSenpaiVoice();}
    }
  },true);
  const observer=new MutationObserver(()=>{applyCharacter();});
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();
