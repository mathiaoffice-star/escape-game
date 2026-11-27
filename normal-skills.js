/* シャマルピー戦争: normal mode skill integration */
(() => {
  'use strict';
  if (window.__shamarupiNormalSkillsLoaded) return;
  window.__shamarupiNormalSkillsLoaded = true;

  const WAR_KEY = 'shamarupiWarV1';
  const EQUIP_KEY = 'shamarupiNormalEquippedV1';
  const META = {
    condom: { name:'コンドム', icon:'🛡️', description:'攻撃を防ぐバリア', key:'1' },
    sage: { name:'賢者タイム', icon:'⏳', description:'敵の動きを遅くする', key:'2' },
    whiteBeam: { name:'白濁ビーム（4方向）', icon:'✨', description:'上下左右へビームを発射', key:'3' }
  };
  const readWar = () => {
    try { return JSON.parse(localStorage.getItem(WAR_KEY) || '{}'); }
    catch (_) { return {}; }
  };
  const readLevels = () => {
    const raw = readWar().skills || {};
    return {
      condom: Math.max(0, Math.min(5, Number(raw.condom) || 0)),
      sage: Math.max(0, Math.min(5, Number(raw.sage) || 0)),
      whiteBeam: Math.max(0, Math.min(5, Number(raw.whiteBeam) || 0))
    };
  };
  let levels = readLevels();
  let equipped;
  try {
    const saved = JSON.parse(localStorage.getItem(EQUIP_KEY) || 'null');
    equipped = saved && typeof saved === 'object' ? saved : {
      condom: levels.condom > 0, sage: levels.sage > 0, whiteBeam: levels.whiteBeam > 0
    };
  } catch (_) {
    equipped = { condom: levels.condom > 0, sage: levels.sage > 0, whiteBeam: levels.whiteBeam > 0 };
  }
  Object.keys(META).forEach(k => { equipped[k] = !!equipped[k] && levels[k] > 0; });

  let shieldUntil = 0, slowUntil = 0, beamUntil = 0;
  const readyAt = { condom:0, sage:0, whiteBeam:0 };
  let lastUsed = '';
  let panel, controls, buttons = {};

  const style = document.createElement('style');
  style.textContent = `
    #normalSkillSettings{margin-top:16px;padding:16px;border:1px solid #cbd5e1;border-radius:16px;background:#f8fafc;color:#172033}
    #normalSkillSettings h3{margin:0 0 6px;font-size:19px}
    #normalSkillSettings .skill-setting-note{font-size:12px;color:#64748b;margin:0 0 12px}
    #normalSkillSettings .normal-skill-card{display:flex;align-items:center;gap:10px;padding:11px;margin:8px 0;background:#fff;border:1px solid #dbe3ee;border-radius:12px}
    #normalSkillSettings .normal-skill-card .skill-info{flex:1;min-width:0}
    #normalSkillSettings .normal-skill-card b{display:block;font-size:14px}
    #normalSkillSettings .normal-skill-card small{display:block;color:#64748b;font-size:11px;margin-top:3px}
    #normalSkillSettings .normal-skill-card input{width:22px;height:22px;accent-color:#7c3aed}
    #normalSkillControls{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin:10px 0}
    #normalSkillControls{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;align-items:center;margin:10px auto;max-width:100%}
    #normalSkillControls button{flex:0 1 auto;width:clamp(116px,38vw,168px);max-width:46%;min-width:0;min-height:44px;height:auto;border:0;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-weight:900;font-size:12px;line-height:1.25;padding:8px 6px;white-space:normal;box-sizing:border-box}
    #normalSkillControls button:disabled{opacity:.42}
    #normalSkillControls button .skill-cd{display:block;font-size:10px;font-weight:700;margin-top:3px}
    #normalSkillStatus{min-height:20px;text-align:center;font-size:12px;font-weight:800;color:#7c3aed;margin:3px 0 8px}
    @media(max-width:600px){#gameScreen .controls #normalSkillControls{grid-column:1/-1!important;grid-row:3!important}#gameScreen .controls #normalSkillStatus{grid-column:1/-1!important;grid-row:4!important}#gameScreen .controls #restartBtn{grid-column:3!important;grid-row:2!important}}
    @media(max-width:420px){#normalSkillControls{gap:5px}#normalSkillControls button{min-width:0;font-size:11px;padding:6px 3px}}
  `;
  document.head.appendChild(style);

  function saveEquipped() {
    try { localStorage.setItem(EQUIP_KEY, JSON.stringify(equipped)); } catch (_) {}
    refreshSettings();
    refreshControls();
  }
  function refreshLevels() {
    levels = readLevels();
    Object.keys(META).forEach(k => { if (!levels[k]) equipped[k] = false; });
    saveEquipped();
  }
  function cooldownFor(level) { return Math.max(6000, 10000 - Math.max(0, level - 1) * 1000); }
  function durationFor(key, level) {
    return key === 'condom' ? 1000 + (level - 1) * 250 : 2000 + (level - 1) * 500;
  }
  function refreshSettings() {
    if (!panel) return;
    panel.innerHTML = '<h3>✨ 通常モード スキル設定</h3><p class="skill-setting-note">対戦モードのガチャで獲得したスキルを通常モードでも使用できます。チェックを入れるとゲーム中に装備されます。</p>';
    Object.keys(META).forEach(key => {
      const m = META[key], level = levels[key];
      const row = document.createElement('label');
      row.className = 'normal-skill-card';
      const info = document.createElement('span'); info.className = 'skill-info';
      const title = document.createElement('b'); title.textContent = m.icon + ' ' + m.name + '　Lv.' + level + '/5';
      const desc = document.createElement('small');
      desc.textContent = level ? m.description + ' ／ クールタイム ' + (cooldownFor(level)/1000) + '秒' : '未獲得：スキルガチャで入手できます';
      info.append(title, desc);
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = !!equipped[key]; check.disabled = !level;
      check.setAttribute('aria-label', m.name + 'を通常モードで装備');
      check.addEventListener('change', () => { equipped[key] = check.checked; saveEquipped(); });
      row.append(info, check); panel.appendChild(row);
    });
    const note = document.createElement('p'); note.className = 'skill-setting-note';
    note.textContent = '発動操作：画面下のスキルボタン、またはPCの 1・2・3 キー。レベルが高いほど効果時間・威力が上がります。';
    panel.appendChild(note);
  }
  function refreshControls(now = performance.now()) {
    if (!controls) return;
    Object.keys(META).forEach(key => {
      const button = buttons[key];
      if (!button) return;
      const active = levels[key] > 0 && !!equipped[key];
      button.hidden = !active;
      const remaining = Math.max(0, readyAt[key] - now);
      button.disabled = !active || !gameActive || gameOver || remaining > 0;
      const label = META[key].icon + ' ' + META[key].name;
      button.firstChild.textContent = label;
      const cd = button.querySelector('.skill-cd');
      if (cd) cd.textContent = remaining > 0 ? (remaining/1000).toFixed(1) + '秒' : '発動';
    });
    const activeCount = Object.keys(META).filter(k => levels[k] > 0 && equipped[k]).length;
    controls.hidden = activeCount === 0;
    const status = document.getElementById('normalSkillStatus'); if (status) status.hidden = activeCount === 0;
  }
  function setStatus(message) {
    const el = document.getElementById('normalSkillStatus');
    if (el) el.textContent = message;
  }
  function addButton(key) {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = '<span></span><span class="skill-cd">発動</span>';
    button.addEventListener('click', () => activate(key));
    controls.appendChild(button); buttons[key] = button;
  }
  function addDefeat(e) {
    if (!e) return;
    if (typeof spawnDefeatEffect === 'function') spawnDefeatEffect(e.x, e.y);
    if (typeof coinDrops !== 'undefined') coinDrops.push({
      x:e.x,y:e.y,vx:(Math.random()-.5)*2.4,vy:-1.5-Math.random()*1.5,
      life:9000,value:10,kind:'enemy'
    });
    if (typeof kills !== 'undefined') kills++;
  }
  function activate(key) {
    refreshLevels();
    const level = levels[key], now = performance.now();
    if (!level || !equipped[key] || !gameActive || gameOver) return;
    if (now < readyAt[key]) return;
    if (typeof startBGM === 'function') startBGM();
    if (typeof playAttack === 'function') playAttack();
    readyAt[key] = now + cooldownFor(level);
    lastUsed = key;
    if (key === 'condom') {
      shieldUntil = now + durationFor(key, level);
      // 発動時に近くの敵を押し返し、バリア終了直後の接触事故を防ぐ
      if (typeof enemies !== 'undefined') enemies.forEach(e => {
        const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy)||1;
        if (d < 115) { e.x=player.x+dx/d*125; e.y=player.y+dy/d*125; }
      });
      setStatus('🛡️ バリア発動！ ' + (durationFor(key,level)/1000).toFixed(2) + '秒間、敵の接触を防ぐ');
    } else if (key === 'sage') {
      slowUntil = now + durationFor(key, level);
      setStatus('⏳ 賢者タイム発動！ 敵の動きが遅くなった');
    } else if (key === 'whiteBeam') {
      beamUntil = now + 420;
      // ビームの当たり判定を見た目に合わせて広げ、上下左右の射線上の敵を確実に撃破
      const width = 28 + level * 10;
      let defeated = 0;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const hitHorizontal = Math.abs(e.y - player.y) <= width;
        const hitVertical = Math.abs(e.x - player.x) <= width;
        if (hitHorizontal || hitVertical) {
          enemies.splice(i, 1);
          addDefeat(e);
          defeated++;
        }
      }
      setStatus('✨ 4方向ビーム！ ' + defeated + '体を撃破！');
    }
    refreshControls();
  }

  const settingsScreen = document.getElementById('settingsScreen');
  if (settingsScreen) {
    const target = settingsScreen.querySelector('.ranking-panel');
    if (target) {
      panel = document.createElement('section'); panel.id = 'normalSkillSettings';
      target.appendChild(panel); refreshSettings();
    }
  }
  // 「もう一度」で新しいランを始めたら、スキルのクールタイムも初期化
  function resetSkillCooldowns() {
    const now = performance.now();
    Object.keys(META).forEach(key => { readyAt[key] = 0; });
    shieldUntil = 0; slowUntil = 0; beamUntil = 0;
    lastUsed = null;
    refreshControls(now);
    setStatus('スキルのクールタイムをリセットしました');
  }
  const restartButton = document.getElementById('restartBtn');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      // 元の再スタート処理が gameActive / gameOver を更新した後にUIを同期
      setTimeout(() => { resetSkillCooldowns(); refreshControls(); }, 0);
    });
  }

  const attackButton = document.getElementById('attackBtn');
  if (attackButton && attackButton.parentElement) {
    controls = document.createElement('div'); controls.id = 'normalSkillControls'; controls.hidden = true;
    attackButton.insertAdjacentElement('afterend', controls);
    Object.keys(META).forEach(addButton);
    const status = document.createElement('div'); status.id = 'normalSkillStatus';
    controls.insertAdjacentElement('afterend', status);
  }

  // バリア中は接触によるゲームオーバーを無効化し、敵を押し戻す
  const originalEndGame = endGame;
  endGame = function() {
    if (performance.now() < shieldUntil) {
      enemies.forEach(e => {
        const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy)||1;
        if (d < playerSize + enemySize + 24) { e.x=player.x+dx/d*(playerSize+enemySize+28); e.y=player.y+dy/d*(playerSize+enemySize+28); }
      });
      return;
    }
    originalEndGame();
  };

  // 敵の基礎速度だけを一時的に落とす（プレイヤーやゲーム時間は通常速度）
  const originalUpdate = update;
  update = function(dt, now) {
    const slow = performance.now() < slowUntil;
    if (slow) enemies.forEach(e => { e.speed *= 0.38; });
    try { originalUpdate(dt, now); }
    finally { if (slow) enemies.forEach(e => { e.speed /= 0.38; }); }
  };

  // 通常描画にスキルの残像・バリアを重ねる
  const originalRender = render;
  render = function(now) {
    originalRender(now);
    const t = performance.now();
    if (t < shieldUntil) {
      ctx.save(); ctx.strokeStyle='rgba(59,130,246,.9)'; ctx.fillStyle='rgba(59,130,246,.10)';
      ctx.lineWidth=7; ctx.shadowColor='#60a5fa'; ctx.shadowBlur=20;
      ctx.beginPath(); ctx.arc(player.x,player.y,playerSize*.95,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (t < beamUntil) {
      const level = levels.whiteBeam, alpha = Math.max(0,(beamUntil-t)/420);
      ctx.save(); ctx.globalAlpha=alpha; ctx.strokeStyle='#ffffff'; ctx.shadowColor='#fff'; ctx.shadowBlur=22;
      ctx.lineWidth=4+level*4; ctx.beginPath(); ctx.moveTo(0,player.y); ctx.lineTo(W,player.y); ctx.moveTo(player.x,0); ctx.lineTo(player.x,H); ctx.stroke();
      ctx.strokeStyle='#dbeafe'; ctx.lineWidth=1.5; ctx.stroke(); ctx.restore();
    }
    refreshControls(t);
  };

  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    const key = e.key;
    if (key === '1' || key === '2' || key === '3') {
      const skillKey = key === '1' ? 'condom' : key === '2' ? 'sage' : 'whiteBeam';
      if (levels[skillKey] > 0 && equipped[skillKey] && gameActive && !gameOver) {
        e.preventDefault(); activate(skillKey);
      }
    }
  });
  document.querySelectorAll('[data-open="settingsScreen"]').forEach(button => {
    button.addEventListener('click', () => { refreshLevels(); refreshSettings(); });
  });
  window.addEventListener('storage', e => {
    if (e.key === WAR_KEY) refreshLevels();
  });
  // 同一タブ内で対戦モードからガチャを引いた直後にも同期
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    if (key === WAR_KEY) refreshLevels();
  };
  refreshSettings(); refreshControls();
})();
