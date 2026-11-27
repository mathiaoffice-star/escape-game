/* シャマルピー戦争: isolated PvP/CPU mode. Does not modify the original game loop. */
(() => {
  'use strict';
  if (window.__shamarupiBattleLoaded) return;
  window.__shamarupiBattleLoaded = true;
  const SUPABASE_URL = 'https://caittxvisaqpcrurqgag.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_VBhQe8t5WtKR39XluwRZJg_sKrbieI7';
  const STORE = 'shamarupiWarV1';
  const state = { mode:'idle', user:null, lobby:null, room:null, opponent:null, started:0, hp:150, enemyHp:150, maxHp:150, x:0.18, y:0.5, ex:0.82, ey:0.5, shots:[], enemyShots:[], keys:{}, lastShot:0, lastSync:0, raf:0, wins:0, rating:1000, weapon:'orb', orbLevel:0, beamUnlocked:false, beamLevel:0, ended:false, cpuAt:0, roomId:null, skills:{condom:0,sage:0,whiteBeam:0}, goldBalls:0, cooldowns:{condom:0,sage:0,whiteBeam:0}, shieldUntil:0, slowUntil:0, enemySlowUntil:0 };
  const saved = (()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(e){return {}}})();
  state.wins = Number(saved.wins)||0;
  state.orbLevel = Math.max(0,Math.min(5,Number(saved.orbLevel)||0));
  state.beamUnlocked = !!saved.beamUnlocked || saved.weapon==='beam';
  state.beamLevel = Math.max(0,Math.min(5,Number(saved.beamLevel)||0));
  state.weapon = saved.weapon==='beam' && state.beamUnlocked ? 'beam':'orb';
  state.skills={condom:Math.max(0,Math.min(5,Number(saved.skills?.condom)||0)),sage:Math.max(0,Math.min(5,Number(saved.skills?.sage)||0)),whiteBeam:Math.max(0,Math.min(5,Number(saved.skills?.whiteBeam)||0))};
  state.goldBalls=Math.max(0,Number(saved.goldBalls)||0);
  function persist(){try{localStorage.setItem(STORE,JSON.stringify({wins:state.wins,weapon:state.weapon,orbLevel:state.orbLevel,beamUnlocked:state.beamUnlocked,beamLevel:state.beamLevel,skills:state.skills,goldBalls:state.goldBalls}))}catch(e){}}
  const style = document.createElement('style');
  style.textContent = `
  #shamarupi-entry,#shamarupi-gacha-entry{position:static;display:inline-flex;align-items:center;justify-content:center;margin:8px 6px;border:0;border-radius:999px;padding:13px 18px;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-weight:900;font-size:15px;box-shadow:0 5px 18px #0005;vertical-align:middle;cursor:pointer}
  #shamarupi-gacha-entry{background:linear-gradient(135deg,#f59e0b,#ea580c);box-shadow:0 5px 18px #f59e0b55}
  #shamarupi-skill-entry{position:static;display:inline-flex;align-items:center;justify-content:center;margin:8px 6px;border:0;border-radius:999px;padding:13px 18px;background:linear-gradient(135deg,#0f766e,#0891b2);color:#fff;font-weight:900;font-size:15px;box-shadow:0 5px 18px #0f766e55;vertical-align:middle;cursor:pointer}
  #shamarupi-launcher{position:fixed!important;z-index:99990!important;left:50%!important;bottom:max(14px,env(safe-area-inset-bottom))!important;transform:translateX(-50%)!important;display:flex!important;flex-wrap:wrap!important;justify-content:center!important;align-items:center!important;gap:7px!important;width:min(96vw,560px)!important;padding:8px!important;border-radius:18px!important;background:#0f172add!important;border:1px solid #ffffff33!important;box-shadow:0 8px 28px #0008!important;backdrop-filter:blur(10px)!important}
  #shamarupi-launcher button{flex:1 1 28%!important;min-width:0!important;margin:0!important;padding:12px 8px!important;font-size:clamp(12px,3.2vw,15px)!important;white-space:nowrap!important}
  #shamarupi-launcher.is-game-hidden{display:none!important}

  #shamarupi-modal{position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 50% 0,#263c62,#080d19 72%);color:#fff;font-family:system-ui,sans-serif;display:none;overflow:auto;padding:16px;box-sizing:border-box}
  #shamarupi-modal *{box-sizing:border-box}#shamarupi-modal .sw-wrap{max-width:760px;margin:0 auto}
  #shamarupi-modal h2{text-align:center;font-size:clamp(26px,6vw,42px);margin:12px 0 4px;color:#f5eaff;text-shadow:0 3px 18px #c026d366}
  #shamarupi-modal .sw-sub{text-align:center;color:#cbd5e1;margin:0 0 18px}
  #shamarupi-modal button{border:0;border-radius:12px;padding:12px 16px;font-weight:800;color:#fff;background:#6d28d9}
  #shamarupi-modal button.secondary{background:#334155}#shamarupi-modal button:disabled{opacity:.45}
  #shamarupi-modal .sw-panel{background:#ffffff12;border:1px solid #ffffff24;border-radius:18px;padding:16px;margin:12px 0}
  #shamarupi-modal .sw-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
  #shamarupi-modal #sw-arena{width:100%;height:min(56vh,440px);min-height:260px;background:linear-gradient(#111827,#172554);border:2px solid #64748b;border-radius:16px;display:block;touch-action:none}
  #shamarupi-modal .sw-hud{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin:10px 0}
  #shamarupi-modal .sw-hp{height:34px;position:relative;border:2px solid #94a3b8;border-radius:9px;overflow:hidden;background:#111827;min-width:0}
  #shamarupi-modal .sw-hp-fill{height:100%;width:100%;transition:width .12s linear}
  #shamarupi-modal .sw-hp.you .sw-hp-fill{background:linear-gradient(90deg,#2563eb,#38bdf8)}
  #shamarupi-modal .sw-hp.enemy .sw-hp-fill{background:linear-gradient(90deg,#ef4444,#fb7185)}
  #shamarupi-modal .sw-hp-number{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:14px;font-weight:1000;text-shadow:0 1px 3px #000,0 0 4px #000}
  #shamarupi-modal .sw-hud-label{font-size:11px;text-align:center;font-weight:900;margin-bottom:3px}
  #shamarupi-modal .sw-hud-center{font-size:13px;font-weight:900;text-align:center;white-space:nowrap}
  #shamarupi-modal .sw-controls{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:14px;padding:4px 8px}
  #shamarupi-modal .sw-joystick{width:142px;height:142px;flex:0 0 142px;border-radius:50%;position:relative;touch-action:none;user-select:none;background:radial-gradient(circle,#475569 0 48%,#334155 50% 68%,#1e293b 70%);border:2px solid #94a3b8;box-shadow:inset 0 4px 14px #0006,0 5px 14px #0004}
  #shamarupi-modal .sw-joystick:before{content:"";position:absolute;left:50%;top:50%;width:8px;height:8px;border-radius:50%;background:#cbd5e1;transform:translate(-50%,-50%)}
  #shamarupi-modal .sw-joystick-knob{position:absolute;left:50%;top:50%;width:62px;height:62px;border-radius:50%;transform:translate(-50%,-50%);background:linear-gradient(145deg,#e2e8f0,#64748b);border:2px solid #f8fafc;box-shadow:0 4px 12px #0008;pointer-events:none}
  @media(max-width:390px){#shamarupi-modal .sw-joystick{width:116px;height:116px;flex-basis:116px}#shamarupi-modal .sw-joystick-knob{width:50px;height:50px}}
  #shamarupi-modal #sw-fire{min-width:112px;min-height:78px;flex:0 0 112px;border-radius:22px;background:linear-gradient(145deg,#7c3aed,#5b21b6);font-size:18px;touch-action:none;user-select:none}
  @media(max-width:390px){#shamarupi-modal .sw-joystick{width:122px;height:122px;flex-basis:122px}#shamarupi-modal .sw-joystick-knob{width:54px;height:54px}#shamarupi-modal #sw-fire{min-width:96px;flex-basis:96px}}
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
  #shamarupi-modal .sw-gacha-lever{display:flex;align-items:center;justify-content:center;gap:10px;margin:14px auto 8px;max-width:290px;padding:14px 12px;border-radius:18px;background:linear-gradient(180deg,#1e293b,#0f172a);border:2px solid #fbbf24;box-shadow:inset 0 2px 10px #0008,0 5px 16px #0005;touch-action:none;user-select:none}
  #shamarupi-modal .sw-gacha-orb{font-size:38px;line-height:1;color:#fbbf24;text-shadow:0 2px 8px #f59e0b88}
  #shamarupi-modal .sw-gacha-handle{width:78px;height:68px;border:2px solid #fde68a;border-radius:14px;background:linear-gradient(180deg,#fef3c7,#f59e0b)!important;color:#7c2d12!important;font-size:40px!important;font-weight:1000;line-height:1;box-shadow:0 5px 0 #92400e,0 8px 12px #0007;touch-action:none;transition:transform .12s ease,box-shadow .12s ease}
  #shamarupi-modal .sw-gacha-handle.pulling{transform:translateY(34px);box-shadow:0 1px 0 #92400e,0 3px 8px #0007}
  #shamarupi-modal .sw-gacha-lever.spinning .sw-gacha-orb{animation:swGachaSpin .55s ease-in-out 3}
  #shamarupi-modal .sw-gacha-lever.spinning .sw-gacha-handle{animation:swGachaKick .55s ease-in-out 3}
  @keyframes swGachaSpin{0%{transform:rotate(0) scale(1)}50%{transform:rotate(180deg) scale(1.2);filter:brightness(1.7)}100%{transform:rotate(360deg) scale(1)}}
  @keyframes swGachaKick{0%,100%{transform:translateY(0)}35%,65%{transform:translateY(22px)}}
  #shamarupi-modal .sw-gacha{border:1px solid #fbbf2466;background:linear-gradient(135deg,#7c2d12aa,#581c87aa);border-radius:16px;padding:14px;margin:14px 0;text-align:center}
  #shamarupi-modal .sw-gacha button{background:linear-gradient(135deg,#f59e0b,#ea580c);font-size:16px;min-width:190px}
  #shamarupi-modal .sw-gacha-result{min-height:25px;margin:10px 0 0;font-weight:900;color:#fde68a}
  #shamarupi-modal .sw-skill-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;margin-top:10px}
  #shamarupi-modal .sw-skill-card{background:#ffffff12;border:1px solid #ffffff25;border-radius:10px;padding:9px;font-size:12px}
  #shamarupi-modal .sw-skill-card b{display:block;font-size:14px}
  #shamarupi-modal .sw-skill-btn{background:linear-gradient(135deg,#0e7490,#1d4ed8)!important;min-width:0!important;flex:1;min-height:58px;font-size:13px!important;padding:8px!important}
  #shamarupi-modal .sw-skill-btn:disabled{opacity:.55}
  @media(max-width:480px){#shamarupi-modal .sw-skill-list{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
  const entry=document.createElement('button');entry.id='shamarupi-entry';entry.type='button';entry.textContent='⚔ 対戦モード';
  const gachaEntry=document.createElement('button');gachaEntry.id='shamarupi-gacha-entry';gachaEntry.type='button';gachaEntry.textContent='🎰 ガチャ';
  const skillEntry=document.createElement('button');skillEntry.id='shamarupi-skill-entry';skillEntry.type='button';skillEntry.textContent='⚡ スキル設定';skillEntry.title='ガチャで獲得したスキルの装備を変更';
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
      <div class="sw-actions"><button id="sw-open-gacha" type="button">🎰 スキルガチャ</button></div>
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
    <section id="sw-gacha-screen" class="sw-panel" hidden>
      <div class="sw-actions"><button id="sw-gacha-back" class="secondary" type="button">← ホームに戻る</button></div>
      <h3 style="text-align:center;font-size:25px;margin:12px 0">🎰 スキルガチャ</h3>
      <p class="sw-small" style="text-align:center">1回 3,000コイン ／ 重複するとスキルLvアップ（最大Lv.5）</p>
            <div class="sw-gacha">
        <b>🎰 スキルガチャ</b>
        <p class="sw-small">1回 3,000コイン ／ 重複するとスキルLvアップ（最大Lv.5）</p>
        <div class="sw-gacha-lever" id="sw-gacha-lever" aria-label="レバーを下に引いてガチャを回す"><span class="sw-gacha-orb">◯</span><button id="sw-gacha-handle" class="sw-gacha-handle" type="button" aria-label="レバーを引く">U</button><span class="sw-gacha-orb">◯</span></div>
        <button id="sw-gacha-pull" type="button">ガチャを1回引く（3,000）</button>
        <div id="sw-gacha-result" class="sw-gacha-result" aria-live="polite">スキルを集めて対戦を有利にしよう！</div>
        <div class="sw-skill-list">
          <div class="sw-skill-card"><b>🛡️ コンドム Lv.<span id="sw-condom-level">0</span>/5</b><span>発動中は攻撃を防ぐ。初期持続1秒。</span></div>
          <div class="sw-skill-card"><b>⏳ 賢者タイム Lv.<span id="sw-sage-level">0</span>/5</b><span>相手の動きを遅くする。初期持続2秒。</span></div>
          <div class="sw-skill-card"><b>✨ 白濁ビーム（4方向） Lv.<span id="sw-whitebeam-level">0</span>/5</b><span>上下左右へ同時発射。Lvが上がるほどビームが太くなる。</span></div>
        </div>
        <p class="sw-small">Lv.5のスキルが重複した場合は金の玉100個に変換されます。</p>
        <p class="sw-small">所持金の玉：<b id="sw-gold-balls">0</b></p>
      </div>
    </section>ion>
    <section id="sw-game" class="sw-panel" hidden>
      <div class="sw-hud">
        <div><div class="sw-hud-label">YOU</div><div class="sw-hp you"><div id="sw-myhp-fill" class="sw-hp-fill"></div><span id="sw-myhp" class="sw-hp-number">150 / 150</span></div></div>
        <div id="sw-mode" class="sw-hud-center">CPU戦</div>
        <div><div class="sw-hud-label">相手</div><div class="sw-hp enemy"><div id="sw-enemyhp-fill" class="sw-hp-fill"></div><span id="sw-enemyhp" class="sw-hp-number">150 / 150</span></div></div>
      </div>
      <canvas id="sw-arena" width="900" height="500"></canvas>
      <div class="sw-controls">
        <div id="sw-stick-base" class="sw-joystick" role="application" aria-label="移動スティック"><div id="sw-stick-knob" class="sw-joystick-knob"></div></div>
        <button id="sw-fire" type="button">発射！</button>
      </div>
      <div class="sw-actions" style="margin-top:8px">
        <button id="sw-use-condom" class="sw-skill-btn" type="button">🛡️ コンドム</button>
        <button id="sw-use-sage" class="sw-skill-btn" type="button">⏳ 賢者タイム</button>
        <button id="sw-use-whiteBeam" class="sw-skill-btn" type="button">✨ 白濁ビーム（4方向）</button>
      </div>
      <p class="sw-small">スマホ：左スティックで上下左右に移動、発射ボタンを長押し。PC：A/D・←/→で左右、W/S・↑/↓で上下、Spaceで攻撃。</p>
      <div class="sw-actions"><button id="sw-friend-copy-wait" class="secondary" disabled>合言葉をコピー</button></div>
      <div class="sw-actions"><button id="sw-leave" class="secondary">対戦を終了</button></div>
    </section>
    <section id="sw-result" class="sw-panel" hidden><h2 id="sw-result-title">勝利！</h2><p id="sw-result-text" style="text-align:center"></p><p id="sw-rating-result" style="text-align:center">レートを確認中…</p><div class="sw-actions"><button id="sw-again">もう一度対戦</button></div></section>
  </div>`;
  document.body.append(modal);
  // メニューの文言やDOM構造に依存せず、常に表示されるランチャーへ配置
  function placeBattleEntry(){
    let launcher=document.getElementById('shamarupi-launcher');
    if(!launcher){
      launcher=document.createElement('div');
      launcher.id='shamarupi-launcher';
      launcher.setAttribute('aria-label','シャマルピー戦争メニュー');
      document.body.appendChild(launcher);
    }
    [entry,gachaEntry,skillEntry].forEach(button=>launcher.appendChild(button));
    return true;
  }
  placeBattleEntry();
  // Safariでは hidden 属性ではなく親画面の display で画面を切り替えるため、
  // :has(#gameScreen:not([hidden])) では常時非表示になってしまう。
  // 実際にゲーム画面がレイアウト上表示されている場合だけランチャーを隠す。
  function syncBattleLauncher(){
    const gameScreen=document.getElementById('gameScreen');
    const visible=!!(gameScreen && gameScreen.getClientRects().length &&
      getComputedStyle(gameScreen).display!=='none' &&
      getComputedStyle(gameScreen).visibility!=='hidden');
    launcher.classList.toggle('is-game-hidden',visible);
  }
  syncBattleLauncher();
  const launcherObserver=new MutationObserver(syncBattleLauncher);
  launcherObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden']});
  window.addEventListener('resize',syncBattleLauncher);
  const $=id=>document.getElementById(id);
  function coinBalance(){try{return typeof window.getAvailableGameCoins==='function'?window.getAvailableGameCoins():(typeof wallet!=='undefined'?Math.max(0,Number(wallet)||0):0)}catch(e){return 0}}
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
    $('sw-gacha-pull').disabled=coinBalance()<3000;
    $('sw-gacha-handle').disabled=coinBalance()<3000;
    $('sw-gacha-pull').textContent=coinBalance()<3000?'コイン不足（3,000必要）':'ガチャを1回引く（3,000）';
    $('sw-condom-level').textContent=state.skills.condom;
    $('sw-sage-level').textContent=state.skills.sage;
    $('sw-whitebeam-level').textContent=state.skills.whiteBeam;
    $('sw-gold-balls').textContent=state.goldBalls.toLocaleString('ja-JP');
  }
  const gachaPool=[{key:'condom',name:'コンドム'},{key:'sage',name:'賢者タイム'},{key:'whiteBeam',name:'白濁ビーム（4方向）'}];
  function pullGacha(){
    if(coinBalance()<3000){$('sw-gacha-result').textContent='コインが足りません。3,000コイン必要です。';return;}
    chargeBattleCoins(3000,'スキルガチャ',()=>{
      const item=gachaPool[Math.floor(Math.random()*gachaPool.length)];
      const old=state.skills[item.key];
      if(old<5){state.skills[item.key]=old+1;persist();$('sw-gacha-result').textContent='✨ '+item.name+' を獲得！ Lv.'+old+' → Lv.'+(old+1);}
      else{state.goldBalls+=100;persist();$('sw-gacha-result').textContent='🎉 '+item.name+' は最大Lv.5！重複分を金の玉100個に変換しました。';}
      refreshShop();
    });
  }
  const gachaLever=$('sw-gacha-lever'),gachaHandle=$('sw-gacha-handle');
  let leverPointer=null,leverStartY=0,leverDelta=0,leverTriggered=false;
  function animateGachaPull(){if(leverTriggered||$('sw-gacha-pull').disabled)return;leverTriggered=true;gachaHandle.classList.add('pulling');gachaLever.classList.add('spinning');setTimeout(()=>{gachaHandle.classList.remove('pulling');gachaHandle.style.transform='';pullGacha();setTimeout(()=>{gachaLever.classList.remove('spinning');leverTriggered=false;},1250);},240);}
  gachaHandle.addEventListener('pointerdown',e=>{if($('sw-gacha-pull').disabled||leverTriggered)return;e.preventDefault();leverPointer=e.pointerId;leverStartY=e.clientY;leverDelta=0;gachaHandle.setPointerCapture(e.pointerId);});
  gachaHandle.addEventListener('pointermove',e=>{if(leverPointer!==e.pointerId)return;leverDelta=Math.max(0,Math.min(48,e.clientY-leverStartY));gachaHandle.style.transform='translateY('+leverDelta+'px)';});
  gachaHandle.addEventListener('pointerup',e=>{if(leverPointer!==e.pointerId)return;leverPointer=null;gachaHandle.style.transform='';if(leverDelta>=18)animateGachaPull();});
  gachaHandle.addEventListener('pointercancel',()=>{leverPointer=null;leverDelta=0;gachaHandle.style.transform='';});
  gachaHandle.addEventListener('click',e=>{e.preventDefault();animateGachaPull();});
  function showHome(){ $('sw-home').hidden=false;$('sw-gacha-screen').hidden=true;$('sw-game').hidden=true;$('sw-result').hidden=true;$('sw-wins').textContent=state.wins;$('sw-rating').textContent=state.rating;$('sw-equipped').textContent=state.weapon==='beam'?'白濁ビーム':'白濁ボール';refreshShop();}
  function open(){modal.style.display='block';showHome();}
  function openGacha(){modal.style.display='block';$('sw-home').hidden=true;$('sw-gacha-screen').hidden=false;$('sw-game').hidden=true;$('sw-result').hidden=true;refreshShop();modal.scrollTop=0;}
  $('sw-open-gacha').addEventListener('click',openGacha);
  $('sw-gacha-back').addEventListener('click',showHome);
  gachaEntry.addEventListener('click',openGacha);
  skillEntry.addEventListener('click',()=>{
    // スキル取得後の装備チェックは通常モードと共通の設定画面で管理する
    close();
    const settingsButton=document.querySelector('[data-open="settingsScreen"]');
    if(settingsButton){settingsButton.click();}
    else if(typeof showScreen==='function'){showScreen('settingsScreen');}
    setTimeout(()=>{
      const panel=document.getElementById('normalSkillSettings');
      if(panel){panel.scrollIntoView({behavior:'smooth',block:'start'});}
      else{
        const status=document.getElementById('shopStatus');
        if(status)status.textContent='スキル設定を読み込み中です。画面を再読み込みしてください。';
      }
    },120);
  });
  function close(){stopGame();modal.style.display='none';}
  entry.onclick=open;$('sw-close').onclick=close;
  function status(t){$('sw-status').textContent=t;}
  function skillDuration(key){const lv=state.skills[key];return key==='condom'?1+(lv-1)*0.25:key==='sage'?2+(lv-1)*0.5:0.25;}
  function skillCooldown(key){return Math.max(6,10-(state.skills[key]-1)*1)*1000;}
  function refreshSkillButtons(){
    const now=Date.now();
    for(const key of ['condom','sage','whiteBeam']){
      const button=$('sw-use-'+key),level=state.skills[key],remaining=Math.max(0,state.cooldowns[key]-now);
      button.disabled=level<1||remaining>0||!['playing','cpu'].includes(state.mode);
      button.textContent=(key==='condom'?'🛡️ コンドム':key==='sage'?'⏳ 賢者タイム':'✨ 白濁ビーム（4方向）')+(level<1?'（未所持）':remaining>0?'（'+(remaining/1000).toFixed(1)+'秒）':' 発動');
    }
  }
  function activateSkill(key){
    if(state.skills[key]<1||state.cooldowns[key]>Date.now()||!['playing','cpu'].includes(state.mode))return;
    const duration=skillDuration(key);state.cooldowns[key]=Date.now()+skillCooldown(key);
    if(key==='condom'){state.shieldUntil=Date.now()+duration*1000;status('コンドム発動！ '+duration.toFixed(1)+'秒間バリア！');}
    else if(key==='sage'){state.enemySlowUntil=Date.now()+duration*1000;status('賢者タイム発動！ 相手を'+duration.toFixed(1)+'秒間スロー！');}
    else{const level=state.skills.whiteBeam-1,damage=18+level*6;state.shots.push({x:state.x,y:state.y,life:18,crossBeam:true,level,damage,hit:false});if(state.mode==='playing'&&state.room)state.room.send({type:'broadcast',event:'shot',payload:{uid:state.user.id,x:state.x,y:state.y,crossBeam:true,level,damage}});status('白濁ビーム発射！ 4方向に照射！');}
    if(state.mode==='playing'&&state.room)state.room.send({type:'broadcast',event:'skill',payload:{uid:state.user.id,key,duration}});
    refreshSkillButtons();
  }
  $('sw-use-condom').addEventListener('click',()=>activateSkill('condom'));
  $('sw-use-sage').addEventListener('click',()=>activateSkill('sage'));
  $('sw-use-whiteBeam').addEventListener('click',()=>activateSkill('whiteBeam'));
  function setInput(key,on){state.keys[key]=on;}
  const stick=$('sw-stick-base'),knob=$('sw-stick-knob');
  function moveStick(e){
    const rect=stick.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const max=rect.width*.29,dx=e.clientX-cx,dy=e.clientY-cy,dist=Math.hypot(dx,dy),scale=dist>max?max/dist:1;
    const x=dx*scale,y=dy*scale;
    knob.style.left='calc(50% + '+x+'px)';knob.style.top='calc(50% + '+y+'px)';
    setInput('left',x < -10);setInput('right',x > 10);setInput('up',y < -10);setInput('down',y > 10);
  }
  function resetStick(){knob.style.left='50%';knob.style.top='50%';setInput('left',false);setInput('right',false);setInput('up',false);setInput('down',false);}
  let activeStickPointer=null;
  stick.addEventListener('pointerdown',e=>{e.preventDefault();activeStickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e)});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===activeStickPointer)moveStick(e)});
  function releaseStick(e){if(activeStickPointer!==null&&e.pointerId!==undefined&&e.pointerId!==activeStickPointer)return;activeStickPointer=null;resetStick();}
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>stick.addEventListener(ev,releaseStick));
  const fireButton=$('sw-fire');
  fireButton.addEventListener('pointerdown',e=>{e.preventDefault();fireButton.setPointerCapture(e.pointerId);setInput('fire',true)});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>fireButton.addEventListener(ev,()=>setInput('fire',false)));
  window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','a','d','A','D','w','s','W','S'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')setInput('left',true);if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')setInput('right',true);if(e.key==='ArrowUp'||e.key.toLowerCase()==='w')setInput('up',true);if(e.key==='ArrowDown'||e.key.toLowerCase()==='s')setInput('down',true);if(e.key===' ')setInput('fire',true)}});
  window.addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')setInput('left',false);if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')setInput('right',false);if(e.key==='ArrowUp'||e.key.toLowerCase()==='w')setInput('up',false);if(e.key==='ArrowDown'||e.key.toLowerCase()==='s')setInput('down',false);if(e.key===' ')setInput('fire',false)});
  function chargeBattleCoins(cost,label,done){
    if(typeof window.chargeGameCoins==='function'){window.chargeGameCoins(cost,label,()=>{done();refreshShop()});return;}
    if(typeof wallet==='undefined'||coinBalance()<cost){status('金玉が足りません。'+cost+'金玉必要です。');return;}
    wallet-=cost;if(typeof saveWallet==='function')saveWallet();if(typeof updateShopUI==='function')updateShopUI();done();refreshShop();
  }
  $('sw-orb-upgrade').onclick=()=>{if(state.orbLevel>=5)return;const cost=orbCosts[state.orbLevel];chargeBattleCoins(cost,'白濁ボール強化',()=>{state.orbLevel++;persist();status('白濁ボールが大きくなった！ Lv.'+(state.orbLevel+1));});};
  $('sw-beam-upgrade').onclick=()=>{if(!state.beamUnlocked){chargeBattleCoins(300,'白濁ビーム解放',()=>{state.beamUnlocked=true;persist();status('白濁ビームを解放した！');});return;}if(state.beamLevel>=5)return;const cost=beamCosts[state.beamLevel];chargeBattleCoins(cost,'白濁ビーム強化',()=>{state.beamLevel++;persist();status('白濁ビームが太くなった！ Lv.'+(state.beamLevel+1));});};
  $('sw-equip-orb').onclick=()=>{state.weapon='orb';persist();showHome()};
  $('sw-equip-beam').onclick=()=>{if(state.beamUnlocked){state.weapon='beam';persist();showHome()}};
  $('sw-match').onclick=startMatch;$('sw-friend-create').onclick=()=>joinFriendRoom('create');$('sw-friend-join').onclick=()=>joinFriendRoom('join');$('sw-friend-copy').onclick=copyFriendCode;$('sw-friend-copy-wait').onclick=copyFriendCode;$('sw-again').onclick=()=>{if(state.restartPending)return;state.restartPending=true;$('sw-again').disabled=true;stopGame();state.ended=false;state.mode='idle';$('sw-result').hidden=true;$('sw-home').hidden=false;startMatch().finally(()=>{state.restartPending=false;$('sw-again').disabled=false})};
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
    startBattleAudio();prepareBattleVoices();stopGame();const token=state.matchToken=(state.matchToken||0)+1;
    state.ended=false;state.mode='connecting';state.hp=state.maxHp;state.enemyHp=state.maxHp;state.direction=1;state.x=.18;state.y=.5;state.ex=.82;state.ey=.5;state.shots=[];state.enemyShots=[];state.opponent=null;
    $('sw-home').hidden=true;$('sw-result').hidden=true;$('sw-game').hidden=false;updateHud();
    status('対戦相手を検索中…');$('sw-mode').textContent='検索中';
    const timeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+'タイムアウト')),ms))]);
    try{
      const client=await timeout(getClient(),8000,'ログイン');
      if(token!==state.matchToken)return;
      const uid=state.user.id;
      state.lobby=client.channel('shamarupi-war-lobby-'+token,{config:{presence:{key:uid}}});
      state.lobby.on('presence',{event:'sync'},()=>{if(token===state.matchToken)tryPair()});
      await timeout(new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('ロビー接続タイムアウト')),8000);state.lobby.subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(t);state.lobby.track({uid,joined:Date.now(),nick:'PLAYER'}).then(resolve,reject)}if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){clearTimeout(t);reject(new Error('ロビーに接続できません'))}})}),9000,'ロビー接続');
      if(token!==state.matchToken)return;
      state.mode='searching';tryPair();state.cpuAt=Date.now()+5000;
      const poll=setInterval(()=>{if(token!==state.matchToken||state.mode!=='searching'){clearInterval(poll);return}tryPair();if(Date.now()>=state.cpuAt){clearInterval(poll);startCpu()}},250);
      state.searchPoll=poll;
    }catch(e){if(token!==state.matchToken)return;console.warn(e);status('オンライン接続に失敗。CPU戦を開始します');startCpu();}
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
    startBattleAudio();prepareBattleVoices();const code=String($('sw-friend-code').value||'').trim().toUpperCase();
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
    state.room.on('broadcast',{event:'shot'},({payload})=>{if(payload?.uid!==state.user.id)state.enemyShots.push({x:clamp(payload.x,0,1),y:clamp(payload.y,0,1),vx:-state.direction*(payload.beam?.03:.025),life:payload.crossBeam?18:100,beam:!!payload.beam,crossBeam:!!payload.crossBeam,followEnemy:!!payload.beam||!!payload.crossBeam,level:clamp(payload.level||0,0,5),damage:clamp(payload.damage||12,1,60),hit:false});});
    state.room.on('broadcast',{event:'skill'},({payload})=>{if(payload?.uid!==state.opponent)return;if(payload.key==='sage')state.slowUntil=Date.now()+Math.max(0,Math.min(10,Number(payload.duration)||2))*1000;});
    state.room.on('broadcast',{event:'damage'},({payload})=>{if(payload?.uid===state.opponent){if(Date.now()<state.shieldUntil){status('バリアで攻撃を防いだ！');return;}const damage=clamp(payload.damage||12,1,40);state.hp=Math.max(0,state.hp-damage);updateHud();status('被弾！ −'+damage+' HP');if(state.hp<=0)finish(false);}});
    // Opponent damage is delivered through the dedicated damage broadcast.
    state.room.subscribe(s=>{if(s==='SUBSCRIBED'){state.mode='playing';$('sw-mode').textContent='オンライン対戦';status('対戦開始！');beginGame()}});
  }
  function startCpu(){if(state.mode==='playing'||state.mode==='cpu'||state.mode==='ended')return;startBattleAudio();if(state.searchPoll){clearInterval(state.searchPoll);state.searchPoll=null}state.mode='cpu';state.opponent='CPU';state.direction=1;state.x=.18;state.y=.5;state.ex=.82;state.ey=.5;state.hp=state.maxHp;state.enemyHp=state.maxHp;state.shots=[];state.enemyShots=[];$('sw-mode').textContent='CPU戦';updateHud();status('CPU戦開始！');beginGame()}
  function clamp(v,a,b){return Math.max(a,Math.min(b,Number(v)||0))}
  function updateHud(){
    $('sw-myhp').textContent=state.hp+' / '+state.maxHp;$('sw-enemyhp').textContent=state.enemyHp+' / '+state.maxHp;
    $('sw-myhp-fill').style.width=(state.hp/state.maxHp*100)+'%';$('sw-enemyhp-fill').style.width=(state.enemyHp/state.maxHp*100)+'%';
  }
  let battleAudio=null,bgmOscillators=[],bgmTimer=null,bgmStep=0;
  let attackVoiceBuffer=null,defeatVoiceBuffer=null;
  async function loadVoiceBuffer(path,key){
    try{
      // 通常ゲームと同じユーザー設定音声を優先する
      if(key){
        const db=await new Promise((resolve,reject)=>{
          const req=indexedDB.open('escapeGameCustomMediaV1',3);
          req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('media'))req.result.createObjectStore('media');};
          req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
        });
        const saved=await new Promise((resolve,reject)=>{
          const req=db.transaction('media','readonly').objectStore('media').get(key);
          req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
        });
        if(saved)return await battleAudio.decodeAudioData(await saved.arrayBuffer());
      }
      const response=await fetch(path+'?v=4',{cache:'no-store'});if(!response.ok)throw new Error('voice asset fetch failed');
      const encoded=(await response.text()).trim(),raw=atob(encoded),bytes=new Uint8Array(raw.length);
      for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      return await battleAudio.decodeAudioData(bytes.buffer);
    }catch(e){console.warn('voice load failed:',path,e);return null}
  }
  async function prepareBattleVoices(){
    startBattleAudio();if(!battleAudio)return;
    if(!attackVoiceBuffer)attackVoiceBuffer=await loadVoiceBuffer('./audio/shamarupi-kansai.mp3.b64','attackVoice');
    if(!defeatVoiceBuffer)defeatVoiceBuffer=await loadVoiceBuffer('./audio/nni-all.mp3.b64','defeatVoice');
  }
  window.addEventListener('customvoicechange',()=>{attackVoiceBuffer=null;defeatVoiceBuffer=null;});
  function playVoiceBuffer(buffer){if(!buffer||!battleAudio)return;try{if(battleAudio.state==='suspended')battleAudio.resume();const source=battleAudio.createBufferSource();source.buffer=buffer;source.connect(battleAudio.destination);source.start()}catch(e){console.warn('voice playback failed',e)}}
  function startBattleAudio(){
    try{
      // 対戦中も通常ゲームと同じBGMを使用する
      if(typeof startBGM==='function')startBGM();
    }catch(e){console.warn('battle audio unavailable',e)}
  }
  function playAttackAudio(){startBattleAudio();playVoiceBuffer(attackVoiceBuffer)}
  function segmentHitsPoint(x1,y1,x2,y2,px,py,r){
    const dx=x2-x1,dy=y2-y1,len=dx*dx+dy*dy;
    const t=len?clamp(((px-x1)*dx+(py-y1)*dy)/len,0,1):0;
    const ex=x1+t*dx-px,ey=y1+t*dy-py;return ex*ex+ey*ey<=r*r;
  }
  function beginGame(){if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;state.started=Date.now();state.lastShot=0;state.lastSync=0;state.cpuLastShot=Date.now();state.shots=[];state.enemyShots=[];state.shieldUntil=0;state.slowUntil=0;state.enemySlowUntil=0;state.cooldowns={condom:0,sage:0};updateHud();refreshSkillButtons();state.raf=requestAnimationFrame(tick)}
  function shoot(){
    const now=Date.now(),beam=state.weapon==='beam',level=beam?state.beamLevel:state.orbLevel,delay=beam?720:420;if(now-state.lastShot<delay)return;state.lastShot=now;
    const damage=beam?6+level:12+level*2;
    playAttackAudio();
    state.shots.push({x:state.x+state.direction*.045,y:state.y,vx:state.direction*(beam?.03:.025),life:100,beam,followPlayer:beam,level,damage});
    if(state.mode==='playing'&&state.room)state.room.send({type:'broadcast',event:'shot',payload:{uid:state.user.id,x:state.x+state.direction*.045,y:state.y,beam,level,damage}});
  }
  function finish(win){
    if(state.ended)return;state.ended=true;state.mode='ended';cancelAnimationFrame(state.raf);if(!win)playVoiceBuffer(defeatVoiceBuffer);
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
  function stopGame(){state.matchToken=(state.matchToken||0)+1;if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;if(state.searchPoll)clearInterval(state.searchPoll);state.searchPoll=null;state.mode='idle';state.keys={};state.shieldUntil=0;state.slowUntil=0;state.enemySlowUntil=0;resetStick();setInput('fire',false);cleanupChannels()}
  function tick(){
    if(state.mode!=='playing'&&state.mode!=='cpu')return;
    const playerSpeed=Date.now()<state.slowUntil?.004:.008;
    if(state.keys.left)state.x-=playerSpeed;if(state.keys.right)state.x+=playerSpeed;if(state.keys.up)state.y-=playerSpeed;if(state.keys.down)state.y+=playerSpeed;
    state.x=clamp(state.x,.04,.96);state.y=clamp(state.y,.08,.92);
    if(state.keys.fire)shoot();
    if(state.mode==='cpu'&&Date.now()-state.cpuLastShot>(Date.now()<state.enemySlowUntil?1800:900)){
      state.cpuLastShot=Date.now();
      const dx=state.x-state.ex,dy=state.y-state.ey,len=Math.hypot(dx,dy)||1,speed=.024;
      state.enemyShots.push({x:state.ex,y:state.ey,vx:dx/len*speed,vy:dy/len*speed,life:100,damage:18,targeted:true});
    }
    for(let i=state.shots.length-1;i>=0;i--){
      const s=state.shots[i],x0=s.x,y0=s.y;if(s.crossBeam){s.x=state.x;s.y=state.y;s.life--;const width=.008+s.level*.004;const hit=Math.abs(state.ex-s.x)<=width||Math.abs(state.ey-s.y)<=width;if(hit&&!s.hit){s.hit=true;const damage=clamp(s.damage||18,1,60);state.enemyHp=Math.max(0,state.enemyHp-damage);updateHud();if(state.mode==='playing'&&state.room)state.room.send({type:'broadcast',event:'damage',payload:{uid:state.user.id,target:state.opponent,damage}});status('白濁ビーム命中！ −'+damage+' HP');}if(s.life<=0)state.shots.splice(i,1);continue;}if(s.followPlayer){s.x=state.x+state.direction*.045;s.y=state.y;}else{s.x+=s.vx;s.y+=(s.vy||0);}s.life--;
      const radius=s.beam?.032:.065;
      const hit=s.beam?Math.abs(state.ey-s.y)<=radius:segmentHitsPoint(x0,y0,s.x,s.y,state.ex,state.ey,radius);
      if(hit&&s.life>0){
        state.shots.splice(i,1);
        const damage=clamp(s.damage||12,1,40);state.enemyHp=Math.max(0,state.enemyHp-damage);updateHud();
        if(state.mode==='playing'&&state.room)state.room.send({type:'broadcast',event:'damage',payload:{uid:state.user.id,target:state.opponent,damage}});
        status('命中！ −'+damage+' HP');
        continue;
      }
      if(s.life<=0||s.x<0||s.x>1||s.y<0||s.y>1)state.shots.splice(i,1);
    }
    for(let i=state.enemyShots.length-1;i>=0;i--){
      const s=state.enemyShots[i],x0=s.x,y0=s.y;if(s.crossBeam){s.x=state.ex;s.y=state.ey;s.life--;const width=.008+s.level*.004;const hit=Math.abs(state.x-s.x)<=width||Math.abs(state.y-s.y)<=width;if(hit&&s.life>0){state.enemyShots.splice(i,1);if(state.mode==='cpu'){if(Date.now()<state.shieldUntil){status('バリアで攻撃を防いだ！');continue;}const damage=clamp(s.damage||18,1,60);state.hp=Math.max(0,state.hp-damage);updateHud();status('4方向ビーム被弾！ −'+damage+' HP');if(state.hp<=0){finish(false);return}}continue;}if(s.life<=0)state.enemyShots.splice(i,1);continue;}if(s.followEnemy){s.x=state.ex-state.direction*.045;s.y=state.ey;}else{s.x+=s.vx;s.y+=(s.vy||0);}s.life--;
      const enemyHit=s.beam?Math.abs(state.y-s.y)<=.032:segmentHitsPoint(x0,y0,s.x,s.y,state.x,state.y,.075);
      if(enemyHit&&s.life>0){
        state.enemyShots.splice(i,1);
        if(state.mode==='cpu'){
          if(Date.now()<state.shieldUntil){status('バリアで攻撃を防いだ！');continue;}
          const damage=clamp(s.damage||18,1,40);state.hp=Math.max(0,state.hp-damage);updateHud();status('被弾！ −'+damage+' HP');
          if(state.hp<=0){finish(false);return}
        }
        continue;
      }
      if(s.life<=0||s.x<0||s.x>1||s.y<0||s.y>1)state.enemyShots.splice(i,1);
    }
    if(state.mode==='cpu'){state.ey=.5+Math.sin(Date.now()/1100)*.12;if(state.enemyHp<=0){finish(true);return}}
    if(state.hp<=0){finish(false);return}
    const now=Date.now();if(state.mode==='playing'&&state.room&&now-state.lastSync>90){state.lastSync=now;state.room.send({type:'broadcast',event:'state',payload:{uid:state.user.id,x:state.x,y:state.y,hp:state.hp}})}
    if(state.mode==='playing'&&state.enemyHp<=0){finish(true);return}
    draw();updateHud();refreshSkillButtons();state.raf=requestAnimationFrame(tick)
  }
  const fighterImage=(()=>{
    const domImage=document.getElementById('playerImg');
    const source=(domImage&&(domImage.currentSrc||domImage.src))||(typeof playerImg!=='undefined'&&playerImg&&(playerImg.currentSrc||playerImg.src||playerImg))||(typeof ASSETS!=='undefined'&&ASSETS.player)||'';
    if(source instanceof HTMLImageElement)return source;
    const image=new Image();if(typeof source==='string'&&source)image.src=source;return image;
  })();
  function draw(){
    const c=$('sw-arena'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#172554';ctx.fillRect(0,0,w,h);
    for(let i=0;i<55;i++){ctx.fillStyle='#ffffff22';ctx.fillRect((i*173)%w,(i*71)%h,2,2)}
    const px=state.x*w,py=state.y*h,ex=state.ex*w,ey=state.ey*h;
    function fighter(x,y,color,label){
      ctx.save();ctx.shadowColor=color;ctx.shadowBlur=16;ctx.fillStyle='#0f172a';ctx.beginPath();ctx.arc(x,y,31,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;ctx.save();ctx.beginPath();ctx.arc(x,y,26,0,Math.PI*2);ctx.clip();
      if(fighterImage&&fighterImage.naturalWidth>0){ctx.drawImage(fighterImage,x-25,y-25,50,50)}else{ctx.fillStyle='#64748b';ctx.fillRect(x-25,y-25,50,50);ctx.fillStyle='#fff';ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.fillText('?',x,y+6)}
      ctx.restore();ctx.lineWidth=7;ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.beginPath();ctx.arc(x,y,29,0,Math.PI*2);ctx.stroke();
      ctx.shadowBlur=0;ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#0f172a';ctx.strokeText(label,x,y-42);ctx.fillStyle='#fff';ctx.fillText(label,x,y-42);ctx.restore();
    }
    fighter(px,py,'#2563eb','YOU');fighter(ex,ey,'#ef4444',state.opponent==='CPU'?'CPU':'RIVAL');
    function orb(s){const x=s.x*w,y=(s.followPlayer?state.y:s.followEnemy?state.ey:s.y)*h,level=s.level||0;ctx.save();if(s.crossBeam){const thick=3+level*3,cy=s.y*h,cx=s.x*w;ctx.shadowColor='#fff';ctx.shadowBlur=8+level*2;ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=thick;ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(w,cy);ctx.moveTo(cx,0);ctx.lineTo(cx,h);ctx.stroke();ctx.lineWidth=Math.max(1,thick*.35);ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(w,cy);ctx.moveTo(cx,0);ctx.lineTo(cx,h);ctx.stroke();}else if(s.beam){const thick=1.1+level*.35,grad=ctx.createLinearGradient(0,y,w,y);grad.addColorStop(0,'rgba(255,255,255,.08)');grad.addColorStop(.1,'rgba(255,255,255,.9)');grad.addColorStop(.9,'rgba(255,255,255,.9)');grad.addColorStop(1,'rgba(255,255,255,.08)');ctx.shadowColor='#fff';ctx.shadowBlur=3+level*.7;ctx.fillStyle=grad;ctx.fillRect(0,y-thick/2,w,thick);ctx.shadowBlur=1.5;ctx.fillStyle='rgba(255,255,255,.95)';ctx.fillRect(0,y-.45,w,.9);ctx.shadowBlur=3;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,1.5+level*.25,0,Math.PI*2);ctx.fill();}else{const radius=8+level*2.2;ctx.shadowColor='#fff';ctx.shadowBlur=10+level*2;ctx.fillStyle='#f5f5f5';ctx.beginPath();ctx.ellipse(x,y,radius*1.35,radius,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-radius*.25,y-radius*.25,Math.max(2,radius*.25),0,Math.PI*2);ctx.fill()}ctx.restore()}
    state.shots.forEach(orb);state.enemyShots.forEach(orb);
  }
  showHome();
  // Add a title label to the document shell without touching the original game logic.
  document.title='シャマルピー戦争';
})();
