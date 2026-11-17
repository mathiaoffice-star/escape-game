/* シャマルピー戦争: isolated PvP/CPU mode. Does not modify the original game loop. */
(() => {
  'use strict';
  if (window.__shamarupiBattleLoaded) return;
  window.__shamarupiBattleLoaded = true;
  const SUPABASE_URL = 'https://caittxvisaqpcrurqgag.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_VBhQe8t5WtKR39XluwRZJg_sKrbieI7';
  const STORE = 'shamarupiWarV1';
  const state = { mode:'idle', user:null, lobby:null, room:null, opponent:null, started:0, hp:100, enemyHp:100, x:0.18, y:0.5, ex:0.82, ey:0.5, shots:[], enemyShots:[], keys:{}, lastShot:0, lastSync:0, raf:0, wins:0, weapon:'orb', ended:false, cpuAt:0 };
  const saved = (()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(e){return {}}})();
  state.wins = Number(saved.wins)||0;
  state.weapon = saved.weapon==='beam' && state.wins>=3 ? 'beam':'orb';
  function persist(){try{localStorage.setItem(STORE,JSON.stringify({wins:state.wins,weapon:state.weapon}))}catch(e){}}
  const style = document.createElement('style');
  style.textContent = `
  #shamarupi-entry{position:fixed;z-index:99990;right:14px;bottom:18px;border:0;border-radius:999px;padding:13px 18px;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-weight:900;font-size:15px;box-shadow:0 5px 18px #0005}
  #shamarupi-modal{position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 50% 0,#263c62,#080d19 72%);color:#fff;font-family:system-ui,sans-serif;display:none;overflow:auto;padding:16px;box-sizing:border-box}
  #shamarupi-modal *{box-sizing:border-box}#shamarupi-modal .sw-wrap{max-width:760px;margin:0 auto}
  #shamarupi-modal h2{text-align:center;font-size:clamp(26px,6vw,42px);margin:12px 0 4px;color:#f5eaff;text-shadow:0 3px 18px #c026d366}
  #shamarupi-modal .sw-sub{text-align:center;color:#cbd5e1;margin:0 0 18px}
  #shamarupi-modal button{border:0;border-radius:12px;padding:12px 16px;font-weight:800;color:#fff;background:#6d28d9}
  #shamarupi-modal button.secondary{background:#334155}#shamarupi-modal button:disabled{opacity:.45}
  #shamarupi-modal .sw-panel{background:#ffffff12;border:1px solid #ffffff24;border-radius:18px;padding:16px;margin:12px 0}
  #shamarupi-modal .sw-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
  #shamarupi-modal #sw-arena{width:100%;height:min(56vh,440px);min-height:260px;background:linear-gradient(#111827,#172554);border:2px solid #64748b;border-radius:16px;display:block;touch-action:none}
  #shamarupi-modal .sw-hud{display:flex;justify-content:space-between;gap:10px;font-weight:900;margin:10px 0}
  #shamarupi-modal .sw-controls{display:flex;justify-content:space-between;gap:10px;margin-top:10px}
  #shamarupi-modal .sw-controls button{min-width:44%;min-height:56px;background:#475569;touch-action:none}
  #shamarupi-modal .sw-small{font-size:12px;color:#cbd5e1;text-align:center}
  #shamarupi-modal .sw-shop{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  @media(min-width:700px){#shamarupi-modal .sw-controls{max-width:500px;margin:10px auto}}
  `;
  document.head.appendChild(style);
  const entry=document.createElement('button');entry.id='shamarupi-entry';entry.textContent='⚔ シャマルピー戦争';
  const modal=document.createElement('div');modal.id='shamarupi-modal';
  modal.innerHTML=`<div class="sw-wrap">
    <div class="sw-actions"><button class="secondary" id="sw-close">タイトルへ戻る</button></div>
    <h2>シャマルピー戦争</h2><p class="sw-sub">1対1オンラインバトル ／ 相手がいなければ15秒でCPU戦</p>
    <section id="sw-home" class="sw-panel">
      <p style="text-align:center">勝利数：<b id="sw-wins">0</b>　|　装備：<b id="sw-equipped">イエローボール</b></p>
      <div class="sw-shop">
        <div><b>攻撃ショップ</b><div class="sw-small">白濁したコミカルなエネルギー弾・ビーム</div></div>
        <button id="sw-beam-buy">ビーム解放（3勝）</button>
      </div>
      <div class="sw-actions" style="margin-top:14px">
        <button id="sw-equip-orb" class="secondary">イエローボールを装備</button>
        <button id="sw-equip-beam" class="secondary">イエロービームを装備</button>
      </div>
      <p class="sw-small">ビームは対戦で3勝すると解放。ゲーム本編のコインやショップには触れません。</p>
      <div class="sw-actions"><button id="sw-match">オンライン対戦を開始</button></div>
      <p id="sw-status" style="text-align:center;min-height:24px">準備完了</p>
    </section>
    <section id="sw-game" class="sw-panel" hidden>
      <div class="sw-hud"><span>YOU <b id="sw-myhp">100</b> HP</span><span><b id="sw-mode">CPU戦</b></span><span>相手 <b id="sw-enemyhp">100</b> HP</span></div>
      <canvas id="sw-arena" width="900" height="500"></canvas>
      <div class="sw-controls"><button id="sw-left">◀ 移動</button><button id="sw-fire">発射！</button><button id="sw-right">移動 ▶</button></div>
      <p class="sw-small">PC：A/Dまたは←/→で移動、Spaceで攻撃。スマホ：移動・発射ボタンを長押し。</p>
      <div class="sw-actions"><button id="sw-leave" class="secondary">対戦を終了</button></div>
    </section>
    <section id="sw-result" class="sw-panel" hidden><h2 id="sw-result-title">勝利！</h2><p id="sw-result-text" style="text-align:center"></p><div class="sw-actions"><button id="sw-again">もう一度対戦</button></div></section>
  </div>`;
  document.body.append(entry,modal);
  const $=id=>document.getElementById(id);
  function showHome(){ $('sw-home').hidden=false;$('sw-game').hidden=true;$('sw-result').hidden=true;$('sw-wins').textContent=state.wins;$('sw-equipped').textContent=state.weapon==='beam'?'イエロービーム':'イエローボール';$('sw-beam-buy').textContent=state.wins>=3?'ビーム解放済み':'ビーム解放（3勝）';$('sw-beam-buy').disabled=state.wins<3;}
  function open(){modal.style.display='block';showHome();}
  function close(){stopGame();modal.style.display='none';}
  entry.onclick=open;$('sw-close').onclick=close;
  function status(t){$('sw-status').textContent=t;}
  function setInput(key,on){state.keys[key]=on;}
  [['sw-left','left'],['sw-right','right'],['sw-fire','fire']].forEach(([id,k])=>{
    const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();setInput(k,true);b.setPointerCapture(e.pointerId)});
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>setInput(k,false)));
  });
  window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight',' ','a','d','A','D'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')setInput('left',true);if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')setInput('right',true);if(e.key===' ')setInput('fire',true)}});
  window.addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')setInput('left',false);if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')setInput('right',false);if(e.key===' ')setInput('fire',false)});
  $('sw-beam-buy').onclick=()=>{if(state.wins>=3){status('ビームは解放済み！')}};
  $('sw-equip-orb').onclick=()=>{state.weapon='orb';persist();showHome()};
  $('sw-equip-beam').onclick=()=>{if(state.wins>=3){state.weapon='beam';persist();showHome()}else status('ビームは3勝で解放！')};
  $('sw-match').onclick=startMatch;$('sw-again').onclick=()=>{$('sw-result').hidden=true;$('sw-home').hidden=false;startMatch()};
  $('sw-leave').onclick=()=>{stopGame();showHome()};
  $('sw-arena').addEventListener('pointerdown',e=>{if(e.pointerType==='touch')setInput('fire',true)});
  $('sw-arena').addEventListener('pointerup',()=>setInput('fire',false));
  async function getClient(){
    if(!window.supabase?.createClient)throw new Error('オンライン接続ライブラリがありません');
    if(!state.client)state.client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const {data,error}=await state.client.auth.getSession();if(error)throw error;
    if(!data.session){const r=await state.client.auth.signInAnonymously();if(r.error)throw r.error;state.user=r.data.user}else state.user=data.session.user;
    return state.client;
  }
  async function startMatch(){
    stopGame();state.ended=false;state.hp=100;state.enemyHp=100;state.x=.18;state.y=.5;state.ex=.82;state.ey=.5;state.shots=[];state.enemyShots=[];state.opponent=null;
    $('sw-home').hidden=true;$('sw-result').hidden=true;$('sw-game').hidden=false;$('sw-myhp').textContent='100';$('sw-enemyhp').textContent='100';
    status('対戦相手を検索中…');$('sw-mode').textContent='検索中';
    try{
      const client=await getClient();const uid=state.user.id;
      state.lobby=client.channel('shamarupi-war-lobby',{config:{presence:{key:uid}}});
      state.lobby.on('presence',{event:'sync'},()=>tryPair());
      await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('ロビー接続タイムアウト')),5000);state.lobby.subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(t);state.lobby.track({uid,joined:Date.now(),nick:'PLAYER'}).then(resolve)}if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){clearTimeout(t);reject(new Error('ロビーに接続できません'))}})});
      state.mode='searching';tryPair();state.cpuAt=Date.now()+15000;
      const poll=setInterval(()=>{if(state.mode!=='searching'){clearInterval(poll);return}tryPair();if(Date.now()>=state.cpuAt){clearInterval(poll);startCpu()}},250);
      state.searchPoll=poll;
    }catch(e){console.warn(e);status('オンライン接続に失敗。CPU戦を開始します');startCpu();}
  }
  function tryPair(){
    if(!state.lobby||state.mode==='playing'||state.mode==='cpu'||state.mode==='ended')return;
    const all=state.lobby.presenceState();const peers=Object.entries(all).flatMap(([key,arr])=>(arr||[]).map(v=>({uid:v.uid||key,joined:v.joined||0}))).filter(p=>p.uid);
    const unique=[...new Map(peers.map(p=>[p.uid,p])).values()].sort((a,b)=>a.joined-b.joined||a.uid.localeCompare(b.uid));
    if(unique.length>=2){const pair=unique.slice(0,2);if(pair.some(p=>p.uid===state.user.id)){const other=pair.find(p=>p.uid!==state.user.id);if(other)startOnline(other.uid)}}
  }
  async function startOnline(otherUid){
    if(state.mode==='playing'||state.mode==='cpu'||state.mode==='ended')return;
    state.mode='connecting';if(state.searchPoll)clearInterval(state.searchPoll);
    state.opponent=otherUid;status('相手が見つかった！対戦準備中…');
    const roomId=[state.user.id,otherUid].sort().join('_');
    state.room=state.client.channel('shamarupi-battle:'+roomId,{config:{broadcast:{self:false}}});
    state.room.on('broadcast',{event:'state'},({payload})=>{if(payload?.uid!==state.user.id){state.ex=clamp(payload.x,.04,.96);state.ey=clamp(payload.y,.08,.92);if(Number.isFinite(payload.hp))state.enemyHp=clamp(payload.hp,0,100);}});
    state.room.on('broadcast',{event:'shot'},({payload})=>{if(payload?.uid!==state.user.id)state.enemyShots.push({x:clamp(payload.x,0,1),y:clamp(payload.y,0,1),vx:-.018,life:100});});
    state.room.on('broadcast',{event:'hit'},({payload})=>{if(payload?.uid!==state.user.id){state.hp=Math.max(0,state.hp-(payload.damage||8));updateHud();if(state.hp<=0)finish(false)}});
    state.room.subscribe(s=>{if(s==='SUBSCRIBED'){state.mode='playing';$('sw-mode').textContent='オンライン対戦';status('対戦開始！');beginGame()}});
  }
  function startCpu(){if(state.mode==='playing'||state.mode==='ended')return;state.mode='cpu';state.opponent='CPU';$('sw-mode').textContent='CPU戦';status('相手が見つからなかったためCPU戦を開始！');beginGame()}
  function clamp(v,a,b){return Math.max(a,Math.min(b,Number(v)||0))}
  function updateHud(){$('sw-myhp').textContent=state.hp;$('sw-enemyhp').textContent=state.enemyHp}
  function beginGame(){state.started=Date.now();state.lastShot=0;state.lastSync=0;state.shots=[];state.enemyShots=[];state.raf=requestAnimationFrame(tick)}
  function shoot(){
    const now=Date.now(),delay=state.weapon==='beam'?650:380;if(now-state.lastShot<delay)return;state.lastShot=now;
    state.shots.push({x:state.x+.045,y:state.y,vx:.025,life:100,beam:state.weapon==='beam'});
    if(state.mode==='playing'&&state.room)state.room.send({type:'broadcast',event:'shot',payload:{uid:state.user.id,x:state.x+.045,y:state.y}});
  }
  function finish(win){
    if(state.ended)return;state.ended=true;state.mode='ended';cancelAnimationFrame(state.raf);
    if(win){state.wins++;persist()}
    $('sw-result-title').textContent=win?'勝利！':'敗北…';
    $('sw-result-text').textContent=(win?'相手を撃破した！':'今回は負けてしまった…')+'　通算勝利 '+state.wins+' 回';
    $('sw-game').hidden=true;$('sw-result').hidden=false;cleanupChannels();
  }
  function cleanupChannels(){if(state.client&&state.room){state.client.removeChannel(state.room);state.room=null}if(state.client&&state.lobby){state.client.removeChannel(state.lobby);state.lobby=null}}
  function stopGame(){if(state.raf)cancelAnimationFrame(state.raf);if(state.searchPoll)clearInterval(state.searchPoll);state.mode='idle';state.keys={};cleanupChannels()}
  function tick(){
    if(state.mode!=='playing'&&state.mode!=='cpu')return;
    const dt=1/60;if(state.keys.left)state.x-=.008;if(state.keys.right)state.x+=.008;state.x=clamp(state.x,.04,.88);
    if(state.keys.fire)shoot();
    if(state.mode==='cpu'&&Math.random()<.025){state.enemyShots.push({x:state.ex-.02,y:state.ey,vx:-.014,life:100})}
    state.shots.forEach(s=>{s.x+=s.vx;s.life--;if(s.x>=state.ex-.035&&Math.abs(s.y-state.ey)<.11&&s.life>0){s.life=0;state.enemyHp=Math.max(0,state.enemyHp-(s.beam?22:12));if(state.mode==='playing'&&state.room)state.room.send({type:'broadcast',event:'hit',payload:{uid:state.user.id,damage:s.beam?22:12}})}});
    state.enemyShots.forEach(s=>{s.x+=s.vx;s.life--;if(s.x<=state.x+.035&&Math.abs(s.y-state.y)<.11&&s.life>0){s.life=0;state.hp=Math.max(0,state.hp-8);/* incoming projectile damages only this client */}});
    state.shots=state.shots.filter(s=>s.life>0&&s.x<1);state.enemyShots=state.enemyShots.filter(s=>s.life>0&&s.x>0);
    if(state.mode==='cpu'){state.ey=.5+Math.sin(Date.now()/900)*.22;if(state.enemyHp<=0){finish(true);return}}
    if(state.hp<=0){finish(false);return}
    const now=Date.now();if(state.mode==='playing'&&state.room&&now-state.lastSync>90){state.lastSync=now;state.room.send({type:'broadcast',event:'state',payload:{uid:state.user.id,x:state.x,y:state.y,hp:state.hp}})}
    if(state.mode==='playing'&&state.enemyHp<=0){finish(true);return}
    draw();updateHud();state.raf=requestAnimationFrame(tick)
  }
  function draw(){
    const c=$('sw-arena'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#172554';ctx.fillRect(0,0,w,h);
    for(let i=0;i<55;i++){ctx.fillStyle='#ffffff22';ctx.fillRect((i*173)%w,(i*71)%h,2,2)}
    const px=state.x*w,py=state.y*h,ex=state.ex*w,ey=state.ey*h;
    function fighter(x,y,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y-12,17,0,Math.PI*2);ctx.fill();ctx.fillRect(x-13,y,26,30);ctx.fillStyle='#fff';ctx.fillRect(x-7,y-15,4,4);ctx.fillRect(x+4,y-15,4,4)}
    fighter(px,py,'#a78bfa');fighter(ex,ey,'#fb7185');
    function orb(x,y,beam){ctx.save();if(beam){ctx.shadowColor='#fff7d6';ctx.shadowBlur=18;ctx.fillStyle='#fff9df';ctx.fillRect(x-4,y-5,35,10);ctx.fillStyle='#f5e6a7';ctx.fillRect(x,y-2,35,4)}else{ctx.shadowColor='#fff8d9';ctx.shadowBlur=12;ctx.fillStyle='#fff5cf';ctx.beginPath();ctx.ellipse(x,y,12,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-3,y-3,3,0,Math.PI*2);ctx.fill()}ctx.restore()}
    state.shots.forEach(s=>orb(s.x*w,s.y*h,s.beam));state.enemyShots.forEach(s=>orb(s.x*w,s.y*h,false));
  }
  showHome();
  // Add a title label to the document shell without touching the original game logic.
  document.title='シャマルピー戦争';
})();
