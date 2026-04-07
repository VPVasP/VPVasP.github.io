/* =============================================
   BELLAGIO GOLD — CRASH GAME ENGINE
   Real-time multiplier with canvas graph
   ============================================= */

const BALANCE_KEY = 'bellagio_balance';

// ── STATE ──
let gameState   = 'waiting'; // 'waiting' | 'running' | 'crashed'
let multiplier  = 1.00;
let crashPoint  = 1.00;
let betPlaced   = false;
let betAmount   = 0;
let cashedOut   = false;
let autoCash    = false;
let autoCashVal = 2.00;
let animFrame   = null;
let startTime   = 0;
let countdownInt = null;

// Stats
let myStats = { totalBet:0, totalWon:0, bestCashout:0, rounds:0 };

// History
let roundHistory = [];

// Fake players
const FAKE_NAMES = ['Alex','Priya','Jake','Emma','Carlos','Yuki','Tom','Sarah','Mike','Aria'];

// Canvas
let canvas, ctx, graphPoints = [];

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('crashCanvas');
  ctx    = canvas ? canvas.getContext('2d') : null;
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  renderBalance();
  renderHistory();
  startCountdown(3);
});

function resizeCanvas() {
  if (!canvas) return;
  canvas.width  = canvas.offsetWidth  || canvas.parentElement.offsetWidth  || 600;
  canvas.height = canvas.offsetHeight || canvas.parentElement.offsetHeight || 400;
}

// ── COUNTDOWN → START ──
function startCountdown(seconds) {
  gameState = 'waiting';
  multiplier = 1.00;
  graphPoints = [];
  betPlaced  = false;
  cashedOut  = false;

  setMultiplierDisplay(1.00, 'waiting');
  document.getElementById('crashOverlay').style.display = 'none';
  document.getElementById('cashOutBtn').style.display   = 'none';
  document.getElementById('placeBetBtn').style.display  = 'block';
  document.getElementById('placeBetBtn').disabled       = false;

  drawGraph();
  buildFakePlayers();

  let s = seconds;
  clearInterval(countdownInt);

  const statusEl = document.getElementById('multStatus');
  if (statusEl) statusEl.textContent = `Starting in ${s}s…`;

  countdownInt = setInterval(() => {
    s--;
    if (statusEl) statusEl.textContent = s > 0 ? `Starting in ${s}s…` : 'Taking off!';
    if (s <= 0) {
      clearInterval(countdownInt);
      startRound();
    }
  }, 1000);
}

// ── START ROUND ──
function startRound() {
  gameState  = 'running';
  crashPoint = generateCrashPoint();
  startTime  = performance.now();
  graphPoints = [];
  document.getElementById('placeBetBtn').disabled = true;

  const statusEl = document.getElementById('multStatus');
  if (statusEl) statusEl.textContent = 'LIVE';

  (function tick(now) {
    if (gameState !== 'running') return;
    const elapsed = (now - startTime) / 1000;  // seconds
    multiplier = calcMultiplier(elapsed);

    if (multiplier >= crashPoint) {
      multiplier = crashPoint;
      setMultiplierDisplay(multiplier, 'crashed');
      drawGraphPoint(elapsed, multiplier);
      drawGraph();
      endRound();
      return;
    }

    setMultiplierDisplay(multiplier, 'running');
    drawGraphPoint(elapsed, multiplier);
    drawGraph();

    // Update cashout button
    if (betPlaced && !cashedOut) {
      const potential = (betAmount * multiplier).toFixed(2);
      document.getElementById('cashOutAmt').textContent = '$' + potential;
    }

    // Auto cashout
    if (autoCash && betPlaced && !cashedOut && multiplier >= autoCashVal) {
      cashOut();
    }

    animFrame = requestAnimationFrame(tick);
  })(startTime);
}

// ── MULTIPLIER CURVE ──
function calcMultiplier(t) {
  // Exponential-ish growth: starts slow, accelerates
  return Math.pow(Math.E, 0.08 * t * Math.sqrt(t + 1));
}

function generateCrashPoint() {
  // House edge ~3% — provably fair-style distribution
  const r = Math.random();
  if (r < 0.03) return 1.00; // 3% instant crash
  // Inverse of CDF: crash = 0.97 / (1 - r) but capped
  const raw = 0.97 / (1 - r);
  return Math.min(raw, 1000);
}

// ── END ROUND ──
function endRound() {
  gameState = 'crashed';
  cancelAnimationFrame(animFrame);

  myStats.rounds++;

  // If bet placed and NOT cashed out → loss
  if (betPlaced && !cashedOut) {
    myStats.totalBet += betAmount;
    showToast(`💥 Crashed @ ${crashPoint.toFixed(2)}× — Lost $${betAmount.toFixed(2)}`, 'error');
  }

  roundHistory.unshift(crashPoint);
  if (roundHistory.length > 30) roundHistory.pop();
  renderHistory();
  renderMyStats();

  // Show overlay
  const overlay = document.getElementById('crashOverlay');
  const valEl   = document.getElementById('crashAtVal');
  if (valEl) valEl.textContent = `CRASHED @ ${crashPoint.toFixed(2)}×`;
  overlay.style.display = 'flex';

  // Countdown
  let n = 5;
  const el = document.getElementById('countdown');
  if (el) el.textContent = n;
  const iv = setInterval(() => {
    n--;
    if (el) el.textContent = n;
    if (n <= 0) {
      clearInterval(iv);
      startCountdown(3);
    }
  }, 1000);
}

// ── PLACE BET ──
function placeBet() {
  if (gameState !== 'waiting' && gameState !== 'running') return;
  if (betPlaced) { showToast('Bet already placed!', 'info'); return; }

  const inputVal = parseFloat(document.getElementById('betAmount').value);
  if (!inputVal || inputVal <= 0) { showToast('Enter a valid bet amount', 'error'); return; }

  const balance = getBalance();
  if (inputVal > balance) { showToast('Insufficient balance!', 'error'); return; }

  betAmount = inputVal;
  betPlaced = true;
  cashedOut = false;
  setBalance(balance - betAmount);

  if (gameState === 'running') {
    // Mid-round bet
    document.getElementById('placeBetBtn').style.display = 'none';
    document.getElementById('cashOutBtn').style.display  = 'block';
    showToast(`✅ Bet placed: $${betAmount.toFixed(2)}`, 'info');
  } else {
    showToast(`✅ Bet placed: $${betAmount.toFixed(2)} — Round starting…`, 'info');
    document.getElementById('placeBetBtn').disabled = true;
  }
}

// ── CASH OUT ──
function cashOut() {
  if (!betPlaced || cashedOut || gameState !== 'running') return;
  cashedOut = true;

  const winAmt = betAmount * multiplier;
  setBalance(getBalance() + winAmt);

  myStats.totalBet += betAmount;
  myStats.totalWon += winAmt;
  if (multiplier > myStats.bestCashout) myStats.bestCashout = multiplier;
  renderMyStats();

  document.getElementById('cashOutBtn').style.display = 'none';
  showToast(`🎉 Cashed out @ ${multiplier.toFixed(2)}×! +$${winAmt.toFixed(2)}`, 'win');
}

// ── AUTO CASH TOGGLE ──
function toggleAutoCash() {
  autoCash = document.getElementById('autoCashToggle').checked;
  const wrap = document.getElementById('autoCashWrap');
  if (wrap) { wrap.style.opacity = autoCash ? '1' : '0.4'; wrap.style.pointerEvents = autoCash ? 'auto' : 'none'; }
  autoCashVal = parseFloat(document.getElementById('autoCashVal').value) || 2.00;
}

// ── BET QUICK SET ──
function setBetAmount(v) {
  document.getElementById('betAmount').value = v;
  updatePotential();
}
function halfBet() {
  const v = parseFloat(document.getElementById('betAmount').value) || 10;
  document.getElementById('betAmount').value = Math.max(1, v / 2).toFixed(2);
}
function doubleBet() {
  const v = parseFloat(document.getElementById('betAmount').value) || 10;
  document.getElementById('betAmount').value = (v * 2).toFixed(2);
}
function updatePotential() {
  autoCashVal = parseFloat(document.getElementById('autoCashVal').value) || 2.00;
}

// ── CANVAS GRAPH ──
function drawGraphPoint(t, m) {
  graphPoints.push({ t, m });
}

function drawGraph() {
  if (!ctx || !canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = H - (i / 5) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '11px Inter';
    ctx.fillText((1 + i).toFixed(0) + '×', 6, y - 4);
  }

  if (graphPoints.length < 2) return;

  const maxT = Math.max(graphPoints[graphPoints.length - 1].t, 10);
  const maxM = Math.max(graphPoints[graphPoints.length - 1].m, 5);

  const toX = t => (t / maxT) * (W - 40) + 20;
  const toY = m => H - ((m - 1) / (maxM - 1)) * (H - 40) - 20;

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (gameState === 'crashed') {
    grad.addColorStop(0, 'rgba(255,68,85,0.3)');
    grad.addColorStop(1, 'rgba(255,68,85,0.0)');
  } else {
    grad.addColorStop(0, 'rgba(0,212,170,0.25)');
    grad.addColorStop(1, 'rgba(0,212,170,0.0)');
  }

  ctx.beginPath();
  ctx.moveTo(toX(0), H);
  graphPoints.forEach(p => ctx.lineTo(toX(p.t), toY(p.m)));
  ctx.lineTo(toX(graphPoints[graphPoints.length-1].t), H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(graphPoints[0].t), toY(graphPoints[0].m));
  graphPoints.forEach(p => ctx.lineTo(toX(p.t), toY(p.m)));
  ctx.strokeStyle = gameState === 'crashed' ? '#ff4455' : '#00d4aa';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dot at tip
  if (graphPoints.length > 0) {
    const last = graphPoints[graphPoints.length - 1];
    ctx.beginPath();
    ctx.arc(toX(last.t), toY(last.m), 6, 0, Math.PI * 2);
    ctx.fillStyle = gameState === 'crashed' ? '#ff4455' : '#00d4aa';
    ctx.shadowColor = gameState === 'crashed' ? '#ff4455' : '#00d4aa';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ── MULTIPLIER DISPLAY ──
function setMultiplierDisplay(val, state) {
  const el     = document.getElementById('multValue');
  const status = document.getElementById('multStatus');
  if (!el) return;

  el.textContent = val.toFixed(2) + '×';
  el.className = state === 'crashed' ? 'crashed' : state === 'waiting' ? 'waiting' : '';

  if (status) {
    if (state === 'crashed') status.textContent = '💥 CRASHED';
    else if (state === 'waiting') status.textContent = 'Waiting for next round…';
    else status.textContent = 'LIVE';
  }
}

// ── HISTORY ──
function renderHistory() {
  const el = document.getElementById('historyGrid');
  if (!el) return;
  if (roundHistory.length === 0) {
    el.innerHTML = '<span style="font-size:0.78rem;color:var(--text-muted)">No rounds yet</span>';
    return;
  }
  el.innerHTML = roundHistory.slice(0, 20).map(v => {
    const cls = v < 1.5 ? 'low' : v < 3 ? 'mid' : v < 10 ? 'high' : 'moon';
    return `<div class="hist-chip ${cls}">${v.toFixed(2)}×</div>`;
  }).join('');
}

// ── FAKE PLAYERS SIDEBAR ──
function buildFakePlayers() {
  const el = document.getElementById('liveBetsList');
  if (!el) return;
  const players = FAKE_NAMES.map(name => ({
    name,
    bet: (Math.random() * 490 + 10).toFixed(2),
    status: 'bet',
  }));
  el.innerHTML = players.map(p =>
    `<div class="lb-row">
      <span class="lb-name">${p.name}</span>
      <span class="lb-bet">$${p.bet}</span>
      <span class="lb-mult bet">—</span>
    </div>`
  ).join('');

  // Simulate some cashing out during the round
  setTimeout(() => {
    if (gameState !== 'running') return;
    const rows = el.querySelectorAll('.lb-row');
    rows.forEach((row, i) => {
      if (Math.random() < 0.4) {
        setTimeout(() => {
          if (gameState !== 'running') return;
          const mult = (multiplier * (0.8 + Math.random() * 0.5)).toFixed(2);
          row.querySelector('.lb-mult').textContent = mult + '×';
          row.querySelector('.lb-mult').className = 'lb-mult won';
        }, Math.random() * 4000 + 500);
      }
    });
  }, 1500);
}

// ── MY STATS ──
function renderMyStats() {
  document.getElementById('msTotalBet').textContent = '$' + myStats.totalBet.toFixed(2);
  document.getElementById('msTotalWon').textContent = '$' + myStats.totalWon.toFixed(2);
  document.getElementById('msBest').textContent     = myStats.bestCashout.toFixed(2) + '×';
  document.getElementById('msRounds').textContent   = myStats.rounds;
}

// ── BALANCE ──
function getBalance() {
  const v = localStorage.getItem(BALANCE_KEY);
  return v !== null ? parseFloat(v) : 5000;
}
function setBalance(val) {
  localStorage.setItem(BALANCE_KEY, Math.max(0, val).toFixed(2));
  renderBalance();
}
function renderBalance() {
  const el = document.getElementById('crBalance');
  if (el) el.textContent = '$' + getBalance().toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// ── TOAST ──
function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', bottom:'20px', right:'20px',
    background: type === 'error' ? '#ff4455' : type === 'win' ? '#00d4aa' : '#f0c040',
    color: type === 'info' ? '#0a0d1a' : '#fff',
    padding:'11px 18px', borderRadius:'8px',
    fontWeight:'700', fontSize:'0.85rem', zIndex:'9999',
    boxShadow:'0 6px 20px rgba(0,0,0,0.5)',
    animation:'toastIn 0.3s ease',
  });
  const s = document.createElement('style');
  s.textContent = '@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(s);
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='0.3s'; }, 2600);
  setTimeout(() => t.remove(), 3000);
}
