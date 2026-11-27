/* Normal-game FEVER mode. Loaded after the main game script. */
(()=>{
  if(typeof performAttackHit!=='function'||typeof update!=='function'||typeof render!=='function') {
    console.error('[fever] main-game hooks unavailable'); return;
  }
  let feverUntil=0, feverActive=false, feverVoice=null, voiceReady=false;
  // センパイ選択時だけFEVER中のBGMを専用曲へ切り替える。
  const senpaiFeverBgm=new Audio('./audio/myinstants.mp3');
  senpaiFeverBgm.preload='auto';senpaiFeverBgm.loop=true;senpaiFeverBgm.playsInline=true;
  let senpaiBgmActive=false;
  function isSenpaiSelected(){try{const s=JSON.parse(localStorage.getItem('shamarupiWarV1')||'{}');return s.selectedCharacter==='senpai'&&(s.characters||[]).includes('senpai');}catch(e){return false;}}
  function startSenpaiFeverBgm(){
    if(!isSenpaiSelected()||senpaiBgmActive)return;
    senpaiBgmActive=true;
    try{if(typeof bgmAudio!=='undefined'){bgmAudio.pause();bgmAudio.currentTime=0;bgmStarted=false;}}catch(e){}
    try{const v=document.getElementById('bgmVolume');if(v)senpaiFeverBgm.volume=Math.max(0,Math.min(1,Number(v.value)/100));const p=senpaiFeverBgm.play();if(p)p.catch(()=>{senpaiBgmActive=false;});}catch(e){senpaiBgmActive=false;}
  }
  function stopSenpaiFeverBgm(){
    if(!senpaiBgmActive)return;
    senpaiBgmActive=false;
    try{senpaiFeverBgm.pause();senpaiFeverBgm.currentTime=0;}catch(e){}
    try{if(typeof bgmAudio!=='undefined'){bgmStarted=false;if(typeof startBGM==='function')startBGM();}}catch(e){}
  }
  const FEVER_MS=5000, FEVER_STEP=10;
  let nextFeverAt=FEVER_STEP;
  let lastKills=0;
  function checkFeverTrigger(){
    const currentKills=Math.max(0,Number(kills)||0);
    // A new run resets kills to zero. Reset the milestone tracker too,
    // otherwise later runs can miss the 10th/20th/30th-kill FEVER trigger.
    if(currentKills<lastKills){
      nextFeverAt=(Math.floor(currentKills/FEVER_STEP)+1)*FEVER_STEP;
    }
    // Process every crossed milestone, including milestones reached during FEVER.
    // startFever extends the active timer by five seconds for each milestone.
    while(currentKills>=nextFeverAt){
      startFever();
      nextFeverAt+=FEVER_STEP;
    }
    lastKills=currentKills;
  }
  const voiceUrl='./audio/fever-voice.mp3.b64';
  fetch(voiceUrl).then(r=>{if(!r.ok)throw Error('voice asset missing');return r.text();})
    .then(b64=>{
      const raw=atob(b64.trim()), bytes=new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      feverVoice=new Audio(URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'})));
      feverVoice.preload='auto'; feverVoice.playsInline=true; voiceReady=true;
    }).catch(e=>console.warn('[fever] voice could not load',e));
  function startFever(){
    const wasActive=feverActive;
    feverActive=true; feverUntil=performance.now()+FEVER_MS;
    if(!wasActive)startSenpaiFeverBgm();
    if(voiceReady&&feverVoice){try{const volume=document.getElementById('voiceVolume');feverVoice.volume=Math.max(0,Math.min(1,Number(volume?.value??100)/100));feverVoice.pause();feverVoice.currentTime=0;const p=feverVoice.play();if(p)p.catch(()=>{});}catch(e){}}
  }
  const originalAttack=performAttackHit;
  performAttackHit=function(){
    const before=kills;
    originalAttack.apply(this,arguments);
    checkFeverTrigger();
  };
  const originalEndGame=endGame;
  endGame=function(){
    if(feverActive && performance.now()<feverUntil) return;
    originalEndGame.apply(this,arguments);
  };
  const originalUpdate=update;
  update=function(dt,now){
    // Fallback trigger: monitor the actual kill counter every frame as well as attack events.
    checkFeverTrigger();
    originalUpdate.apply(this,arguments);
    if(!feverActive)return;
    if(now>=feverUntil){feverActive=false;stopSenpaiFeverBgm();return;}
    // During FEVER, touching an enemy defeats it instead of ending the run.
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      if(Math.hypot(player.x-e.x,player.y-e.y)<(playerSize+enemySize)*.43){
        enemies.splice(i,1);
        // FEVER bonus defeats do not contribute to the normal kill counter.
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
    if(gameOver)return;
    ctx.save();
    // Progress toward the next normal-game FEVER milestone.
    const currentKills=Math.max(0,Number(kills)||0);
    const progress=Math.max(0,Math.min(1,(currentKills-(nextFeverAt-FEVER_STEP))/FEVER_STEP));
    const barW=Math.min(230,W*.58), barH=13, barX=(W-barW)/2, barY=H-34;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='bold 14px system-ui';ctx.lineWidth=3;
    ctx.strokeStyle='rgba(0,0,0,.8)';ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=4;
    const progressLabel='次のFEVERまで '+Math.max(0,Math.min(FEVER_STEP,currentKills-(nextFeverAt-FEVER_STEP)))+'/'+FEVER_STEP;
    ctx.strokeText(progressLabel,W/2,barY-13);ctx.fillText(progressLabel,W/2,barY-13);
    ctx.shadowBlur=0;ctx.fillStyle='rgba(15,23,42,.82)';ctx.fillRect(barX,barY,barW,barH);
    const fillW=barW*progress;
    if(fillW>0){
      const grad=ctx.createLinearGradient(barX,barY,barX+barW,barY);
      grad.addColorStop(0,'#22d3ee');grad.addColorStop(.55,'#a3e635');grad.addColorStop(1,'#facc15');
      ctx.fillStyle=grad;ctx.fillRect(barX,barY,fillW,barH);
    }
    ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=2;ctx.strokeRect(barX,barY,barW,barH);
    if(feverActive&&now<feverUntil){
      const left=Math.max(0,(feverUntil-now)/1000);
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='900 42px system-ui';ctx.lineWidth=7;ctx.strokeStyle='rgba(255,255,255,.95)';
      ctx.fillStyle='#ff4fd8';ctx.shadowColor='#ffdf00';ctx.shadowBlur=20;
      ctx.strokeText('FEVER TIME!!',W/2,145);ctx.fillText('FEVER TIME!!',W/2,145);
      ctx.font='bold 24px system-ui';ctx.fillStyle='#fff';ctx.shadowBlur=10;
      ctx.strokeText(left.toFixed(1)+'s',W/2,184);ctx.fillText(left.toFixed(1)+'s',W/2,184);
    }
    ctx.restore();
  };
  console.info('[fever] normal-game FEVER mode ready');
})();