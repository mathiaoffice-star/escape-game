(()=>{'use strict';
function bind(){
 const button=document.getElementById('openAdditionalVoices');
 const modal=document.getElementById('voiceLibraryModal');
 if(!button||!modal){console.error('[voice-open-hotfix] missing elements',{button:!!button,modal:!!modal});return;}
 const open=event=>{if(event){event.preventDefault();event.stopPropagation();}modal.style.setProperty('display','flex','important');modal.style.setProperty('z-index','2147483647','important');};
 button.addEventListener('click',open,true);
 button.onclick=open;
 document.addEventListener('click',event=>{const b=event.target&&event.target.closest?event.target.closest('#openAdditionalVoices'):null;if(b)open(event);},true);
 const close=()=>modal.style.setProperty('display','none','important');
 const closeButton=document.getElementById('closeVoiceModal');if(closeButton)closeButton.addEventListener('click',close,true);
 modal.addEventListener('click',event=>{if(event.target===modal)close();});
 console.info('[voice-open-hotfix] bound');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();