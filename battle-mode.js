/* シャマルピー戦争: isolated PvP/CPU mode. Does not modify the original game loop. */
(() => {
  'use strict';
  if (window.__shamarupiBattleLoaded) return;
  window.__shamarupiBattleLoaded = true;
  const SUPABASE_URL = 'https://caittxvisaqpcrurqgag.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_VBhQe8t5WtKR39XluwRZJg_sKrbieI7';
  const STORE = 'shamarupiWarV1';
  const state = { mode:'idle', user:null, lobby:null, room:null, opponent:null, started:0, hp:150, enemyHp:150, maxHp:150, x:0.18, y:0.5, ex:0.82, ey:0.5, shots:[], enemyShots:[], keys:{}, lastShot:0, lastSync:0, raf:0, wins:0, rating:1000, weapon:'orb', orbLevel:0, beamUnlocked:false, beamLevel:0, ended:false, cpuAt:0, roomId:null };
  const saved = (()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(e){return {}}})();
  state.wins = Number(saved.wins)||0;
  state.orbLevel = Math.max(0,Math.min(5,Number(saved.orbLevel)||0));
  state.beamUnlocked = !!saved.beamUnlocked || saved.weapon==='beam';
  state.beamLevel = Math.max(0,Math.min(5,Number(saved.beamLevel)||0));
  state.weapon = saved.weapon==='beam' && state.beamUnlocked ? 'beam':'orb';
  function persist(){try{localStorage.setItem(STORE,JSON.stringify({wins:state.wins,weapon:state.weapon,orbLevel:state.orbLevel,beamUnlocked:state.beamUnlocked,beamLevel:state.beamLevel}))}catch(e){}}
  const style = document.createElement('style');
  style.textContent = `
  #shamarupi-entry{position:static;display:inline-flex;align-items:center;justify-content:center;margin:8px 6px;border:0;border-radius:999px;padding:13px 18px;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-weight:900;font-size:15px;box-shadow:0 5px 18px #0005;vertical-align:middle;cursor:pointer}
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
  #shamarupi-modal .sw-items{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 16px}
  #shamarupi-modal .sw-item-card{display:flex;gap:10px;align-items:center;min-width:0;padding:10px;border-radius:15px;background:#ffffff12;border:1px solid #ffffff25}
  #shamarupi-modal .sw-item-art{width:88px;height:88px;flex:0 0 88px;border-radius:15px;background:#f8fafc;display:grid;place-items:center;overflow:hidden;position:relative}
  #shamarupi-modal .sw-orb-art span{width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 32% 25%,#fff 0 10%,#f5f5f5 25%,#d6d6d6 67%,#a3a3a3 100%);box-shadow:inset -5px -7px 10px #5553,inset 3px 3px 8px #fff,0 3px 8px #0003}
  #shamarupi-modal .sw-beam-art{background:#171717}
  #shamarupi-modal .sw-beam-art:before{content:"";position:absolute;left:0;top:50%;width:100%;height:3px;background:linear-gradient(90deg,#fff,#e5e5e5,#fff);box-shadow:0 0 9px 3px #fff}
  #shamarupi-modal .sw-beam-art span{position:absolute;left:13px;top:calc(50% - 9px);width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 0 10px 6px #fff}
  #shamarupi-modal .sw-item-copy{min-width:0}
  #shamarupi-modal .sw-item-copy b{display:block;font-size:14px}
  #shamarupi-modal .sw-item-copy small{display:inline-block;margin:4px 0;padding:3px 7px;border-radius:99px;background:#e5e7eb;color:#334155;font-size:10px;font-weight:800}
  #shamarupi-modal .sw-item-copy p{margin:2px 0 8px;font-size:11px;line-height:1.5;color:#e2e8f0}
  #shamarupi-modal .sw-item-copy button{font-size:11px;padding:7px 10px;margin-top:4px;background:#475569}
  #shamarupi-modal .sw-item-copy button:disabled{opacity:.45}
  #shamarupi-modal .sw-orb-art span{transition:width .2s,height .2s}
  #shamarupi-modal .sw-beam-art span{height:calc(5px + var(--beam-level,0)*3px);box-shadow:0 0 10px 5px #fff}
  #shamarupi-modal .sw-balance{font-size:13px;color:#f8fafc;background:#ffffff16;border-radius:10px;padding:8px 12px}
  @media(max-width:560px){#shamarupi-modal .sw-items{grid-template-columns:1fr}#shamarupi-modal .sw-item-art{width:76px;height:76px;flex-basis:76px}}

  @media(min-width:700px){#shamarupi-modal .sw-controls{max-width:500px;margin:10px auto}}
  `;
  document.head.appendChild(style);
  const entry=document.createElement('button');entry.id='shamarupi-entry';entry.type='button';entry.textContent='⚔ 対戦モード';
  const modal=document.createElement('div');modal.id='shamarupi-modal';
  modal.innerHTML=`<div class="sw-wrap">
    <div class="sw-actions"><button class="secondary" id="sw-close">タイトルへ戻る</button></div>
    <h2>シャマルピー戦争</h2><p class="sw-sub">1対1オンラインバトル ／ 相手がいなければ15秒でCPU戦</p>
    <section id="sw-home" class="sw-panel">
      <p style="text-align:center">レート：<b id="sw-rating">1000</b> RP　|　勝利数：<b id="sw-wins">0</b>　|　装備：<b id="sw-equipped">白濁ボール</b></p>
      <div class="sw-items" aria-label="攻撃アイテム">
        <article class="sw-item-card">
          <div class="sw-item-art sw-orb-art"><span id="sw-orb-preview"></span></div>
          <div class="sw-item-copy"><b>① 白濁ボール</b><small id="sw-orb-level">サイズ Lv.1 / 6</small><p>金玉で5段階強化。大きくなるほど当たりやすく、威力も上昇。</p><button id="sw-orb-upgrade" type="button">強化する</button></div>
        </article>
        <article class="sw-item-card">
          <div class="sw-item-art sw-beam-art"><span id="sw-beam-preview"></span></div>
          <div class="sw-item-copy"><b>② 白濁ビーム</b><small id="sw-beam-level">未解放</small><p>300金玉で解放。さらに5段階、ビームを太くして威力を強化。</p><button id="sw-beam-upgrade" type="button">300金玉で解放</button></div>
        </article>
      </div>
      <div class="sw-shop">
        <div><b>攻撃ショップ</b><div class="sw-small">強化は各武器5段階。装備を切り替えて対戦しよう。</div></div>
        <div class="sw-balance">所持金玉：<b id="sw-coins">---</b></div>
      </div>
      <div class="sw-actions" style="margin-top:14px">
        <button id="sw-equip-orb" class="secondary">白濁ボールを装備</button>
        <button id="sw-equip-beam" class="secondary">白濁ビームを装備</button>
      </div>
      <p class="sw-small">プレイヤーHPは150。武器強化で攻撃力・当たり判定が少しずつ上昇します。</p>
      <div class="sw-actions"><button id="sw-match">ランダムオンライン対戦</button></div>
      <div style="margin-top:18px;border-top:1px solid #ffffff24;padding-top:14px">
        <b>友達と合言葉で対戦</b>
        <p class="sw-small">部屋を作る人が合言葉を決めて、友達に共有します</p>
        <input id="sw-friend-code" maxlength="20" autocomplete="off" placeholder="合言葉（2〜20文字）" style="width:100%;padding:13px;border-radius:10px;border:1px solid #64748b;background:#0f172a;color:white;font-size:16px;margin:8px 0">
        <div class="sw-actions">
          <button id="sw-friend-create">この合言葉で部屋を作る</button>
          <button id="sw-friend-join" class="secondary">合言葉で参加する</button>
        </div>
        <div class="sw-actions" style="margin-top:8px"><button id="sw-friend-copy" class="secondary" disabled>合言葉をコピー</button></div>
      </div>
      <p id="sw-status" style="text-align:center;min-height:24px">準備完了</p>
    </section>
    <section id="sw-game" class="sw-panel" hidden>
      <div class="sw-hud"><span>YOU <b id="sw-myhp">100</b> HP</span><span><b id="sw-mode">CPU戦</b></span><span>相手 <b id="sw-enemyhp">100</b> HP</span></div>
      <canvas id="sw-arena" width="900" height="500"></canvas>
      <div class="sw-controls"><button id="sw-left">◀ 移動</button><button id="sw-fire">発射！</button><button id="sw-right">移動 ▶</button></div>
      <p class="sw-small">PC：A/Dまたは←/→で移動、Spaceで攻撃。スマホ：移動・発射ボタンを長押し。</p>
      <div class="sw-actions"><button id="sw-friend-copy-wait" class="secondary" disabled>合言葉をコピー</button></div>
      <div class="sw-actions"><button id="sw-leave" class="secondary">対戦を終了</button></div>
    </section>
    <section id="sw-result" class="sw-panel" hidden><h2 id="sw-result-title">勝利！</h2><p id="sw-result-text" style="text-align:center"></p><p id="sw-rating-result" style="text-align:center">レートを確認中…</p><div class="sw-actions"><button id="sw-again">もう一度対戦</button></div></section>
  </div>`;
  document.body.append(modal);
  function placeBattleEntry(){
    if(entry.isConnected)return true;
    const candidates=[...document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]')];
    const start=candidates.find(el=>/ゲームスタート|ゲーム開始|スタート/.test((el.innerText||el.value||'').replace(/\\s/g,'')));
    if(start){start.insertAdjacentElement('afterend',entry);return true;}
    return false;
  }
  if(!placeBattleEntry()){
    const observer=new MutationObserver(()=>{if(placeBattleEntry())observer.disconnect();});
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),15000);
  }
  const $=id=>document.getElementById(id);
  function coinBalance(){try{return typeof wallet!=='undefined'?Math.max(0,Number(wallet)||0):0}catch(e){return 0}}
  const orbCosts=[100,180,280,420,600], beamCosts=[150,250,400,600,850];
  function refreshShop(){
    $('sw-coins').textContent=coinBalance().toLocaleString('ja-JP');
    $('sw-orb-level').textContent='サイズ Lv.'+(state.orbLevel+1)+' / 6';
    $('sw-orb-preview').style.width=(42+state.orbLevel*7)+'px';$('sw-orb-preview').style.height=(42+state.orbLevel*7)+'px';
    $('sw-orb-upgrade').textContent=state.orbLevel>=5?'最大サイズ！':(orbCosts[state.orbLevel]+'金玉でサイズUP');
    $('sw-orb-upgrade').disabled=state.orbLevel>=5;
    $('sw-beam-level').textContent=!state.beamUnlocked?'未解放':('太さ Lv.'+(state.beamLevel+1)+' / 6');
    $('sw-beam-preview').style.setProperty('--beam-level',state.beamLevel);
    $('sw-beam-upgrade').textContent=!state.beamUnlocked?'300金玉で解放':(state.beamLevel>=5?'最大強化！':(beamCosts[state.beamLevel]+'金玉で太さUP'));
    $('sw-beam-upgrade').disabled=state.beamUnlocked&&state.beamLevel>=5;
    $('sw-equip-beam').disabled=!state.beamUnlocked;
    $('sw-equip-orb').disabled=state.weapon==='orb';$('sw-equip-beam').disabled=!state.beamUnlocked||state.weapon==='beam';
  }
  function showHome(){ $('sw-home').hidden=false;$('sw-game').hidden=true;$('sw-result').hidden=true;$('sw-wins').textContent=state.wins;$('sw-rating').textContent=state.rating;$('sw-equipped').textContent=state.weapon==='beam'?'白濁ビーム':'白濁ボール';refreshShop();}
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
  function chargeBattleCoins(cost,label,done){
    if(typeof window.chargeGameCoins==='function'){window.chargeGameCoins(cost,label,()=>{done();refreshShop()});return;}
    if(typeof wallet==='undefined'||coinBalance()<cost){status('金玉が足りません。'+cost+'金玉必要です。');return;}
    wallet-=cost;if(typeof saveWallet==='function')saveWallet();if(typeof updateShopUI==='function')updateShopUI();done();refreshShop();
  }
  $('sw-orb-upgrade').onclick=()=>{if(state.orbLevel>=5)return;const cost=orbCosts[state.orbLevel];chargeBattleCoins(cost,'白濁ボール強化',()=>{state.orbLevel++;persist();status('白濁ボールが大きくなった！ Lv.'+(state.orbLevel+1));});};
  $('sw-beam-upgrade').onclick=()=>{if(!state.beamUnlocked){chargeBattleCoins(300,'白濁ビーム解放',()=>{state.beamUnlocked=true;persist();status('白濁ビームを解放した！');});return;}if(state.beamLevel>=5)return;const cost=beamCosts[state.beamLevel];chargeBattleCoins(cost,'白濁ビーム強化',()=>{state.beamLevel++;persist();status('白濁ビームが太くなった！ Lv.'+(state.beamLevel+1));});};
  $('sw-equip-orb').onclick=()=>{state.weapon='orb';persist();showHome()};
  $('sw-equip-beam').onclick=()=>{if(state.beamUnlocked){state.weapon='beam';persist();showHome()}};
  $('sw-match').onclick=startMatch;$('sw-friend-create').onclick=()=>joinFriendRoom('create');$('sw-friend-join').onclick=()=>joinFriendRoom('join');$('sw-friend-copy').onclick=copyFriendCode;$('sw-friend-copy-wait').onclick=copyFriendCode;$('sw-again').onclick=()=>{$('sw-result').hidden=true;$('sw-home').hidden=false;startMatch()};
  $('sw-leave').onclick=()=>{stopGame();showHome()};
  $('sw-arena').addEventListener('pointerdown',e=>{if(e.pointerType==='touch')setInput('fire',true)});
  $('sw-arena').addEventListener('pointerup',()=>setInput('fire',false));
  async function getClient(){
    if(!window.supabase?.createClient)throw new Error('オンライン接続ライブラリがありません');
    if(!state.client)state.client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const {data,error}=await state.client.auth.getSession();if(error)throw error;
    if(!data.session){const r=await state.client.auth.signInAnonymously();if(r.error)throw r.error;state.user=r.data.user}else state.user=data.session.user;
    const {data:ratingRow}=await state.client.from('battle_ratings').select('rating').eq('user_id',state.user.id).maybeSingle();state.rating=ratingRow?.rating??1000;return state.client;
  }
  async function startMatch(){
    stopGame();state.ended=false;state.hp=state.maxHp;state.enemyHp=state.maxHp;state.direction=1;state.x=.18;state.y=.5;state.ex=.82;state.ey=.5;state.shots=[];state.enemyShots=[];state.opponent=null;
    $('sw-home').hidden=true;$('sw-result').hidden=true;$('sw-game').hidden=false;$('sw-myhp').textContent=state.maxHp;$('sw-enemyhp').textContent=state.maxHp;
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
  function friendTopic(code){
    let h=2166136261;
    for(let i=0;i<code.length;i++){h^=code.charCodeAt(i);h=Math.imul(h,16777619)}
    return 'shamarupi-friend-'+(h>>>0).toString(36);
  }
  async function copyFriendCode(){
    const code=String(state.friendCode||$('sw-friend-code').value||'').trim().toUpperCase();
    if(!code)return;
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(code);
      else{
        const input=$('sw-friend-code');input.focus();input.select();
        if(!document.execCommand('copy'))throw new Error('copy failed');
      }
      status('合言葉「'+code+'」をコピーしました！友達に送ってね');
    }catch(e){status('コピーできませんでした。合言葉を長押ししてコピーしてね')}
  }
  async function joinFriendRoom(role){
    const code=String($('sw-friend-code').value||'').trim().toUpperCase();
    if(code.length<2||code.length>20){status('合言葉は2〜20文字で入力してください');return}
    $('sw-friend-code').value=code;state.friendCode=code;
    $('sw-friend-copy').disabled=role!=='create';$('sw-friend-copy-wait').disabled=role!=='create';
    stopGame();state.ended=false;state.hp=state.maxHp;state.enemyHp=state.maxHp;state.shots=[];state.enemyShots=[];
    $('sw-home').hidden=true;$('sw-result').hidden=true;$('sw-game').hidden=false;
    $('sw-mode').textContent='友達対戦';status(role==='create'?'合言葉の部屋を作成中…':'合言葉の部屋に参加中…');
    try{
      const client=await getClient();
      state.mode='friend-waiting';
      state.friendChannel=client.channel(friendTopic(code),{config:{presence:{key:state.user.id}}});
      state.friendChannel.on('presence',{event:'sync'},()=>{
        if(state.mode!=='friend-waiting')return;
        const members=Object.entries(state.friendChannel.presenceState()).flatMap(([key,arr])=>(arr||[]).map(v=>({uid:v.uid||key,joined:v.joined||0}))).filter(p=>p.uid);
        const others=[...new Map(members.map(p=>[p.uid,p])).values()].filter(p=>p.uid!==state.user.id).sort((a,b)=>a.joined-b.joined);
        if(others.length){status('友達が見つかった！対戦準備中…');startOnline(others[0].uid)}
      });
      state.friendChannel.subscribe(async s=>{
        if(s==='SUBSCRIBED'&&state.mode==='friend-waiting'){
          await state.friendChannel.track({uid:state.user.id,joined:Date.now(),role});
          if(role==='create'){
            $('sw-friend-copy').disabled=false;$('sw-friend-copy-wait').disabled=false;
            status('部屋を作成しました！合言葉「'+code+'」をコピーして友達に送ってね');
          }else{
            status('合言葉の部屋に参加しました。部屋を作った友達が待っているよ！');
          }
        }else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){
          status('部屋に接続できませんでした。もう一度お試しください');stopGame();showHome();
        }
      });
    }catch(e){console.warn(e);status('接続に失敗しました：'+(e.message||'通信エラー'));stopGame();showHome()}
  }
  function tryPair(){
    if(!state.lobby||state.mode==='playing'||state.mode==='cpu'||state.mode==='ended')return;
    const all=state.lobby.presenceState();const peers=Object.entries(all).flatMap(([key,arr])=>(arr||[]).map(v=>({uid:v.uid||key,joined:v.joined||0}))).filter(p=>p.uid);
    const unique=[...new Map(peers.map(p=>[p.uid,p])).values()].sort((a,b)=>a.joined-b.joined||a.uid.localeCompare(b.uid));
    if(unique.length>=2){const pair=unique.slice(0,2);if(pair.some(p=>p.uid===state.user.id)){const other=pair.find(p=>p.uid!==state.user.id);if(other)startOnline(other.uid)}}
  }
  async function startOnline(otherUid){
    if(state.mode==='connecting'||state.mode==='playing'||state.mode==='cpu'||state.mode==='ended')return;
    state.mode='connecting';if(state.searchPoll)clearInterval(state.searchPoll);
    state.opponent=otherUid;if(state.friendChannel){state.client.removeChannel(state.friendChannel);state.friendChannel=null}state.roomId=[state.user.id,otherUid].sort().join('_');state.direction=state.user.id.localeCompare(otherUid)<0?1:-1;state.x=state.direction===1?.18:.82;state.ex=state.direction===1?.82:.18;status('相手が見つかった！対戦準備中…');
    const roomId=state.roomId;
    state.room=state.client.channel('shamarupi-battle:'+roomId,{config:{broadcast:{self:false}}});
    state.room.on('broadcast',{event:'state'},({payload})=>{if(payload?.uid!==state.user.id){state.ex=clamp(payload.x,.04,.96);state.ey=clamp(payload.y,.08,.92);if(Number.isFinite(payload.hp))state.enemyHp=clamp(payload.hp,0,state.maxHp);}});
    state.room.on('broadcast',{event:'shot'},({payload})=>{if(payload?.uid!==state.user.id)state.enemyShots.push({x:clamp(payload.x,0,1),y:clamp(payload.y,0,1),vx:-state.direction*(payload.beam?.03:.025),life:100,beam:!!payload.beam,level:clamp(payload.level||0,0,5),damage:clamp(payload.damage||12,1,40)});});
    state.room.on('broadcast',{event:'hit'},({payload})=>{if(payload?.uid!==state.user.id){state.hp=Math.max(0,state.hp-(payload.damage||8));updateHud();if(state.hp<=0)finish(false)}});
    state.room.subscribe(s=>{if(s==='SUBSCRIBED'){state.mode='playing';$('sw-mode').textContent='オンライン対戦';status('対戦開始！');beginGame()}});
  }
  function startCpu(){if(state.mode==='playing'||state.mode==='ended')return;state.mode='cpu';state.opponent='CPU';$('sw-mode').textContent='CPU戦';status('相手が見つからなかったためCPU戦を開始！');beginGame()}
  function clamp(v,a,b){return Math.max(a,Math.min(b,Number(v)||0))}
  function updateHud(){$('sw-myhp').textContent=state.hp;$('sw-enemyhp').textContent=state.enemyHp}
  function beginGame(){state.started=Date.now();state.lastShot=0;state.lastSync=0;state.shots=[];state.enemyShots=[];state.raf=requestAnimationFrame(tick)}
  function shoot(){
    const now=Date.now(),beam=state.weapon==='beam',level=beam?state.beamLevel:state.orbLevel,delay=beam?720:420;if(now-state.lastShot<delay)return;state.lastShot=now;
    const damage=beam?16+level*2:12+level*2;
    state.shots.push({x:state.x+state.direction*.045,y:state.y,vx:state.direction*(beam?.03:.025),life:100,beam,level,damage});
    if(state.mode==='playing'&&state.room)state.room.send({type:'broadcast',event:'shot',payload:{uid:state.user.id,x:state.x+state.direction*.045,y:state.y,beam,level,damage}});
  }
  function finish(win){
    if(state.ended)return;state.ended=true;state.mode='ended';cancelAnimationFrame(state.raf);
    if(win){state.wins++;persist()}
    $('sw-result-title').textContent=win?'勝利！':'敗北…';
    $('sw-result-text').textContent=(win?'相手を撃破した！':'今回は負けてしまった…')+'　通算勝利 '+state.wins+' 回';
    $('sw-rating-result').textContent=state.opponent==='CPU'?'CPU戦のためレート変動なし':'オンライン対戦の結果を送信中…';
    $('sw-game').hidden=true;$('sw-result').hidden=false;
    if(state.opponent && state.opponent!=='CPU') submitBattleResult(win);
    cleanupChannels();
  }
  async function submitBattleResult(win){
    try{
      const {data:{session}}=await state.client.auth.getSession();
      if(!session?.access_token)throw new Error('ログイン情報がありません');
      const response=await fetch(SUPABASE_URL+'/functions/v1/battle-result',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':SUPABASE_KEY},
        body:JSON.stringify({match_id:state.roomId,opponent_id:state.opponent,winner_id:win?state.user.id:state.opponent})
      });
      const result=await response.json();if(!response.ok)throw new Error(result.error||'結果送信に失敗');
      if(result.result?.status==='rated')$('sw-rating-result').textContent='レート '+(win?'+30':'−30')+' RP！';
      else if(result.result?.status==='waiting_for_opponent')$('sw-rating-result').textContent='相手の結果報告を待っています。確認後にレートが反映されます。';
      else if(result.result?.status==='reports_disagree')$('sw-rating-result').textContent='勝敗報告が一致しません。レートは保留されました。';
      else $('sw-rating-result').textContent='この対戦のレートは反映済みです。';
      for(let i=0;i<8;i++){await new Promise(resolve=>setTimeout(resolve,1500));const {data:row}=await state.client.from('battle_ratings').select('rating').eq('user_id',state.user.id).maybeSingle();if(row?.rating!=null){state.rating=row.rating;$('sw-rating').textContent=state.rating;}}
      $('sw-rating-result').textContent+=' 現在 '+state.rating+' RP';
    }catch(e){console.warn('rating update:',e);$('sw-rating-result').textContent='レート更新に失敗しました。再ログイン後に確認してください。';}
  }
  function cleanupChannels(){if(state.client&&state.room){state.client.removeChannel(state.room);state.room=null}if(state.client&&state.lobby){state.client.removeChannel(state.lobby);state.lobby=null}if(state.client&&state.friendChannel){state.client.removeChannel(state.friendChannel);state.friendChannel=null}}
  function stopGame(){if(state.raf)cancelAnimationFrame(state.raf);if(state.searchPoll)clearInterval(state.searchPoll);state.mode='idle';state.keys={};cleanupChannels()}
  function tick(){
    if(state.mode!=='playing'&&state.mode!=='cpu')return;
    const dt=1/60;if(state.keys.left)state.x-=.008;if(state.keys.right)state.x+=.008;state.x=clamp(state.x,.04,.88);
    if(state.keys.fire)shoot();
    if(state.mode==='cpu'&&Math.random()<.025){state.enemyShots.push({x:state.ex-state.direction*.02,y:state.ey,vx:-state.direction*.014,life:100})}
    state.shots.forEach(s=>{s.x+=s.vx;s.life--;const reach=s.beam?.045+ s.level*.009:.035+s.level*.004;if((state.direction===1?s.x>=state.ex-reach:s.x<=state.ex+reach)&&Math.abs(s.y-state.ey)<(.11+s.level*.006)&&s.life>0){s.life=0;state.enemyHp=Math.max(0,state.enemyHp-s.damage);if(state.mode==='playing'&&state.room)state.room.send({type:'broadcast',event:'hit',payload:{uid:state.user.id,damage:s.damage}})}});
    state.enemyShots.forEach(s=>{s.x+=s.vx;s.life--;const reach=s.beam?.045+s.level*.009:.035+s.level*.004;if((state.direction===1?s.x<=state.x+reach:s.x>=state.x-reach)&&Math.abs(s.y-state.y)<(.11+s.level*.006)&&s.life>0){s.life=0;state.hp=Math.max(0,state.hp-(s.damage||8));/* incoming projectile damages only this client */}});
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
    function fighter(x,y,color,frame,label){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=14;ctx.strokeStyle=color;ctx.lineWidth=7;ctx.beginPath();ctx.roundRect(x-23,y-39,46,76,20);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y-12,17,0,Math.PI*2);ctx.fill();ctx.fillRect(x-13,y,26,30);ctx.fillStyle='#fff';ctx.fillRect(x-7,y-15,4,4);ctx.fillRect(x+4,y-15,4,4);ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#0f172a';ctx.strokeText(label,x,y-52);ctx.fillStyle='#fff';ctx.fillText(label,x,y-52);ctx.restore()}
    fighter(px,py,'#38bdf8',true,'YOU');fighter(ex,ey,'#fb7185',false,state.opponent==='CPU'?'CPU':'RIVAL');
    function orb(s){const x=s.x*w,y=s.y*h,level=s.level||0;ctx.save();if(s.beam){const thick=5+level*3;ctx.shadowColor='#fff';ctx.shadowBlur=12+level*3;ctx.fillStyle='#fff';ctx.fillRect(x-4,y-thick/2,42+level*5,thick);ctx.fillStyle='#e5e7eb';ctx.fillRect(x,y-thick/4,42+level*5,Math.max(2,thick/2));}else{const radius=8+level*2.2;ctx.shadowColor='#fff';ctx.shadowBlur=10+level*2;ctx.fillStyle='#f5f5f5';ctx.beginPath();ctx.ellipse(x,y,radius*1.35,radius,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-radius*.25,y-radius*.25,Math.max(2,radius*.25),0,Math.PI*2);ctx.fill()}ctx.restore()}
    state.shots.forEach(orb);state.enemyShots.forEach(orb);
  }
  showHome();
  // Add a title label to the document shell without touching the original game logic.
  document.title='シャマルピー戦争';
})();
