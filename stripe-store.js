(()=> {
'use strict';
const SUPABASE_URL='https://caittxvisaqpcrurqgag.supabase.co';
const CHECKOUT_URL=SUPABASE_URL+'/functions/v1/stripe-checkout';
const PUBLISHABLE_KEY='sb_publishable_VBhQe8t5WtKR39XluwRZJg_sKrbieI7';
const $=id=>document.getElementById(id);
function openMediaDB(){return new Promise((resolve,reject)=>{const q=indexedDB.open('escapeGameCustomMediaV1',3);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('media'))db.createObjectStore('media');};q.onsuccess=()=>{const db=q.result;if(!db.objectStoreNames.contains('media')){db.close();reject(new Error('画像保存領域を作成できませんでした'));}else resolve(db);};q.onerror=()=>reject(q.error);});}
const panel=document.createElement('section');
panel.className='shop-item stripe-store-panel';panel.style.gridColumn='1/-1';
panel.innerHTML='<strong>💎 金玉チャージ（Stripe）</strong><p>1円で金玉1個。50個から購入できます。購入した金玉はアカウントに保存され、別端末でも引き継げます。</p><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input id="stripeCoinQty" type="number" min="50" max="50000" step="1" value="500" inputmode="numeric" style="width:120px;padding:10px;border:1px solid #94a3b8;border-radius:8px"><span>個 ／ <b id="stripeCoinPrice">500円</b></span></div><button id="stripeBuyCoins" type="button">Stripeで金玉を購入</button><p id="stripeWalletStatus" class="tiny-note">購入残高を確認しています…</p><hr style="margin:14px 0;border-color:#ddd"><strong>🖼️ 敵画像変更権（永久）</strong><p>100円で敵キャラクターの画像変更機能を永久解放します。</p><button id="stripeBuyEnemy" type="button">100円で永久解放</button><div id="enemyImageTools" hidden style="margin-top:10px"><input id="enemyImageFile" type="file" accept="image/*"><button id="saveEnemyImage" type="button">敵画像を設定</button><button id="resetEnemyImage" type="button">初期画像に戻す</button></div>';
const grid=document.querySelector('#shopScreen .shop-grid');
if(!grid) return;
grid.appendChild(panel);
let paidCoins=0, enemyUnlocked=false;
window.getAvailableGameCoins=()=>Math.max(0,Number(wallet)||0)+Math.max(0,Number(paidCoins)||0);
const status=$('stripeWalletStatus');
function say(s){status.textContent=s;const shopStatus=$('shopStatus');if(shopStatus)shopStatus.textContent=s;}
async function session(){await ensureOnlineUser();const {data,error}=await sbClient.auth.getSession();if(error||!data.session)throw new Error('ログイン情報を取得できません。再読み込みしてください。');return data.session;}
async function refresh(){
 try{
  await ensureOnlineUser();
  const user=onlineUser;
  const [w,e]=await Promise.all([
   sbClient.from('player_wallets').select('paid_coins').eq('user_id',user.id).maybeSingle(),
   sbClient.from('player_entitlements').select('entitlement').eq('user_id',user.id).eq('entitlement','enemy_image_change').maybeSingle()
  ]);
  if(w.error)throw w.error;if(e.error)throw e.error;
  paidCoins=Number(w.data?.paid_coins||0);enemyUnlocked=!!e.data;
  say('有料残高：'+paidCoins.toLocaleString('ja-JP')+' 金玉');
  $('stripeBuyEnemy').disabled=enemyUnlocked;
  $('stripeBuyEnemy').textContent=enemyUnlocked?'敵画像変更権 解放済み ✓':'100円で永久解放';
  $('enemyImageTools').hidden=!enemyUnlocked;
  renderWallet();
 }catch(err){say('残高を取得できません：'+err.message);console.error(err);}
}
function renderWallet(){
 const old=wallet;wallet=old+paidCoins;
 try{updateShopUI();}finally{wallet=old;}
}
async function checkout(type,quantity=1){
 try{
  say('Stripe決済画面を準備しています…');
  const s=await session();
  const response=await fetch(CHECKOUT_URL,{method:'POST',headers:{Authorization:'Bearer '+s.access_token,apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({product_type:type,quantity})});
  const data=await response.json();
  if(!response.ok||!data.checkout_url)throw new Error(data.error||'Checkoutを作成できませんでした');
  location.href=data.checkout_url;
 }catch(err){say('決済を開始できません：'+err.message);console.error(err);}
}
$('stripeCoinQty').addEventListener('input',()=>{let n=Math.floor(Number($('stripeCoinQty').value)||0);n=Math.max(50,Math.min(50000,n));$('stripeCoinPrice').textContent=n.toLocaleString('ja-JP')+'円';});
$('stripeBuyCoins').addEventListener('click',()=>{const n=Number($('stripeCoinQty').value);if(!Number.isSafeInteger(n)||n<50||n>50000){say('購入数は50〜50,000個で入力してください。');return;}checkout('coins',n);});
$('stripeBuyEnemy').addEventListener('click',()=>checkout('enemy_image_change',1));
async function spendPaid(n){
 if(n<=0)return;
 const {data,error}=await sbClient.rpc('spend_paid_game_coins',{p_amount:n});
 if(error)throw error;
 paidCoins=Number(data?.[0]?.remaining_paid_coins??paidCoins-n);
}
window.chargeGameCoins=async function(cost,label,done){
 const local=wallet,fromLocal=Math.min(local,cost),fromPaid=cost-fromLocal;
 if(local+paidCoins<cost){say('金玉が足りません。'+label+'には'+cost+'金玉必要です。');return false;}
 try{
  if(fromPaid)await spendPaid(fromPaid);
  wallet=local+fromPaid;
  wallet-=cost;
  saveWallet();
  updateShopUI();
  say(label+'を設定しました。');
  await done();
  return true;
 }catch(err){wallet=local;await refresh();say('購入できませんでした：'+err.message);console.error(err);return false;}
};
const originalPurchase=purchaseUpgrade;
purchaseUpgrade=async function(key,cost,label){
 let actual=cost;
 if(key==='targets'){if(upgrades.targets>=5)return;actual=({1:500,2:750,3:1000,4:1250})[upgrades.targets];}
 else if(key==='magnet'){if(upgrades.magnetLevel>=5)return;actual=[500,500,750,1000,1250][upgrades.magnetLevel];}
 else if(upgrades[key])return;
 const local=wallet,fromLocal=Math.min(local,actual),fromPaid=actual-fromLocal;
 if(local+paidCoins<actual){say('金玉が足りません。必要数：'+actual);return;}
 try{
  if(fromPaid)await spendPaid(fromPaid);
  wallet=local+fromPaid;
  originalPurchase(key,actual,label);
  renderWallet();
  say(label+'を購入しました。');
 }catch(err){wallet=local;await refresh();say('購入できませんでした：'+err.message);console.error(err);}
};
$('enemyImageFile').addEventListener('change',()=>{const f=$('enemyImageFile').files?.[0];if(f&&(!f.type.startsWith('image/')||f.size>8*1024*1024)){say('画像は8MB以下の画像ファイルを選択してください。');$('enemyImageFile').value='';}});
$('saveEnemyImage').addEventListener('click',async()=>{if(!enemyUnlocked){say('先に敵画像変更権を解放してください。');return;}const f=$('enemyImageFile').files?.[0];if(!f){say('画像を選択してください。');return;}try{const db=await openMediaDB();await new Promise((resolve,reject)=>{const tx=db.transaction('media','readwrite');tx.objectStore('media').put(f,'enemyImage');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});const url=URL.createObjectURL(f);enemyImg.src=url;say('敵画像を設定しました。');}catch(err){say('画像を保存できませんでした：'+err.message);}});
$('resetEnemyImage').addEventListener('click',async()=>{try{const db=await openMediaDB();await new Promise((resolve,reject)=>{const tx=db.transaction('media','readwrite');tx.objectStore('media').delete('enemyImage');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});enemyImg.src=ASSETS.enemy;say('敵画像を初期状態に戻しました。');}catch(err){say('戻せませんでした：'+err.message);}});
async function restoreEnemy(){try{const db=await openMediaDB();const blob=await new Promise((resolve,reject)=>{const tx=db.transaction('media','readonly'),q=tx.objectStore('media').get('enemyImage');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});if(blob)enemyImg.src=URL.createObjectURL(blob);}catch(e){}}
const params=new URLSearchParams(location.search);
if(params.get('payment')==='success'){say('決済完了を確認しています…');let n=0;const poll=async()=>{await refresh();n++;if(n<10){say('決済通知を確認中… '+n+'/10');setTimeout(poll,2000);}else say('残高の更新を確認しました。');};poll();history.replaceState({},'',location.pathname);}
else if(params.get('payment')==='cancel'){say('決済はキャンセルされました。料金は発生していません。');history.replaceState({},'',location.pathname);}
document.querySelectorAll('[data-open="shopScreen"]').forEach(b=>b.addEventListener('click',refresh));
refresh();restoreEnemy();
})();