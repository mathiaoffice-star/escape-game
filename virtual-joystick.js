(()=>{
function init(){
 const controls=document.querySelector('#gameScreen .controls');
 const pad=controls&&controls.querySelector('.pad');
 if(!controls||!pad||controls.querySelector('#virtualJoystick'))return;
 const stick=document.createElement('div');stick.id='virtualJoystick';stick.setAttribute('role','application');stick.setAttribute('aria-label','移動スティック');
 stick.innerHTML='<div class="vj-ring"><div class="vj-thumb"></div></div><span>移動</span>';
 controls.insertBefore(stick,pad);
 const ring=stick.querySelector('.vj-ring'),thumb=stick.querySelector('.vj-thumb');
 const dirs={up:pad.querySelector('[data-dir="up"]'),down:pad.querySelector('[data-dir="down"]'),left:pad.querySelector('[data-dir="left"]'),right:pad.querySelector('[data-dir="right"]')};
 let active=false,pid=null,held=[];
 function release(){held.forEach(b=>{if(b)b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:pid??1}));});held=[];thumb.style.transform='translate(0,0)';active=false;pid=null;}
 function update(e){
  const r=ring.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=e.clientX-cx,dy=e.clientY-cy;const max=r.width*.32,len=Math.hypot(dx,dy)||1,scale=Math.min(1,max/len);dx*=scale;dy*=scale;
  thumb.style.transform='translate('+dx+'px,'+dy+'px)';
  const nx=(e.clientX-cx)/Math.max(1,r.width/2),ny=(e.clientY-cy)/Math.max(1,r.height/2);
  const next=[];
  if(ny<-.28)next.push('up');if(ny>.28)next.push('down');if(nx<-.28)next.push('left');if(nx>.28)next.push('right');
  held.filter(k=>!next.includes(k)).forEach(k=>dirs[k]?.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:pid??1})));
  next.filter(k=>!held.includes(k)).forEach(k=>dirs[k]?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:pid??1})));
  held=next;
 }
 ring.addEventListener('pointerdown',e=>{e.preventDefault();if(active)return;active=true;pid=e.pointerId;ring.setPointerCapture(pid);update(e);});
 ring.addEventListener('pointermove',e=>{if(active&&e.pointerId===pid){e.preventDefault();update(e);}});
 ring.addEventListener('pointerup',e=>{if(active&&e.pointerId===pid){e.preventDefault();release();}});
 ring.addEventListener('pointercancel',release);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();