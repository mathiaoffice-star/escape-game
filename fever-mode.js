/* Normal-game FEVER mode. Loaded after the main game script. */
(()=>{
  if(typeof performAttackHit!=='function'||typeof update!=='function'||typeof render!=='function') {
    console.error('[fever] main-game hooks unavailable'); return;
  }
  let feverUntil=0, feverActive=false, feverVoice=null, voiceReady=false;
  const FEVER_MS=5000, FEVER_STEP=10;
  const voiceUrl='./audio/fever-voice.mp3.b64';
  fetch(voiceUrl).then(r=>{if(!r.ok)throw Error('voice asset missing');return r.text();})
    .then(b64=>{
      const raw=atob(b64.trim()), bytes=new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      feverVoice=new Audio(URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'})));
      feverVoice.preload='auto'; feverVoice.playsInline=true; voiceReady=true;
    }).catch(e=>console.warn('[fever] voice could not load',e));
  function startFever(){
    feverActive=true; feverUntil=performance.now()+FEVER_MS;
    if(voiceReady&&feverVoice){try{const volume=document.getElementById('voiceVolume');feverVoice.volume=Math.max(0,Math.min(1,Number(volume?.value??100)/100));feverVoice.pause();feverVoice.currentTime=0;const p=feverVoice.play();if(p)p.catch(()=>{});}catch(e){}}
  }
  const originalAttack=performAttackHit;
  performAttackHit=function(){
    const before=kills;
    originalAttack.apply(this,arguments);
    if(!feverActive && Math.floor(kills/FEVER_STEP)>Math.floor(before/FEVER_STEP)) startFever();
  };
  const originalEndGame=endGame;
  endGame=function(){
    if(feverActive && performance.now()<feverUntil) return;
    originalEndGame.apply(this,arguments);
  };
  const originalUpdate=update;
  update=function(dt,now){
    originalUpdate.apply(this,arguments);
    if(!feverActive)return;
    if(now>=feverUntil){feverActive=false;return;}
    // During FEVER, touching an enemy defeats it instead of ending the run.
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      if(Math.hypot(player.x-e.x,player.y-e.y)<(playerSize+enemySize)*.43){
        enemies.splice(i,1);kills++;
        spawnDefeatEffect(e.x,e.y);
        coinDrops.push({x:e.x,y:e.y,vx:0,vy:0,life:6000,value:10,kind:'enemy'});
      }
    }
  };
  const originalDrawPlayer=drawImageOrFallback;
  drawImageOrFallback=function(img,x,y,size,isPlayer){
    if(!isPlayer||!feverActive||performance.now()>=feverUntil){
      originalDrawPlayer.apply(this,arguments);return;
    }
    ctx.save();
    const hue=(performance.now()/7)%360;
    ctx.filter='hue-rotate('+hue+'deg) saturate(2.8) brightness(1.18)';
    originalDrawPlayer.apply(this,arguments);
    ctx.filter='none';
    const pulse=.5+.5*Math.sin(performance.now()/75);
    const grad=ctx.createConicGradient((performance.now()/500)%6.283,x,y);
    ['#ff1744','#ff9100','#ffee00','#00e676','#00b0ff','#651fff','#ff1744'].forEach((c,i)=>grad.addColorStop(i/6,c));
    ctx.strokeStyle=grad;ctx.lineWidth=5+pulse*3;ctx.shadowColor='#fff';ctx.shadowBlur=14;
    ctx.beginPath();ctx.arc(x,y,size*.58+pulse*4,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  };
  const originalRender=render;
  render=function(now){
    originalRender.apply(this,arguments);
    if(!feverActive||gameOver)return;
    const left=Math.max(0,(feverUntil-now)/1000);
    ctx.save();
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='900 42px system-ui';ctx.lineWidth=7;ctx.strokeStyle='rgba(255,255,255,.95)';
    ctx.fillStyle='#ff4fd8';ctx.shadowColor='#ffdf00';ctx.shadowBlur=20;
    ctx.strokeText('FEVER TIME!!',W/2,145);ctx.fillText('FEVER TIME!!',W/2,145);
    ctx.font='bold 24px system-ui';ctx.fillStyle='#fff';ctx.shadowBlur=10;
    ctx.strokeText(left.toFixed(1)+'s',W/2,184);ctx.fillText(left.toFixed(1)+'s',W/2,184);
    ctx.restore();
  };
  console.info('[fever] normal-game FEVER mode ready');
})();