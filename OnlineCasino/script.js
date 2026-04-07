/* =============================================
   BELLAGIO GOLD — MAIN LOBBY SCRIPT
   ============================================= */

// ── BALANCE (persisted via localStorage) ──
const BALANCE_KEY = 'bellagio_balance';
const DEFAULT_BALANCE = 5000;

function getBalance() {
  const v = localStorage.getItem(BALANCE_KEY);
  return v !== null ? parseFloat(v) : DEFAULT_BALANCE;
}
function setBalance(val) {
  localStorage.setItem(BALANCE_KEY, val.toFixed(2));
  renderBalance();
}
function addBalance(amount) {
  setBalance(getBalance() + amount);
  showToast(`+$${amount.toLocaleString()} added to your balance!`, 'success');
  closeDeposit();
}
function addCustom() {
  const val = parseFloat(document.getElementById('customAmt').value);
  if (!val || val < 1) { showToast('Enter a valid amount', 'error'); return; }
  addBalance(val);
}
function renderBalance() {
  const el = document.getElementById('balanceDisplay');
  if (el) el.textContent = '$' + getBalance().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── NAVIGATION ──
function navigateTo(pageName) {
  // Sports page redirects to the standalone sports betting page
  if (pageName === 'sports') {
    window.location.href = 'sports-betting/sports-betting.html';
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const target = document.getElementById('page-' + pageName);
  if (target) target.classList.add('active');

  const link = document.querySelector(`.nav-link[data-page="${pageName}"]`);
  if (link) link.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function go(url) {
  window.location.href = url;
}

// Nav links
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

// ── DEPOSIT MODAL ──
function openDeposit() {
  document.getElementById('depositOverlay').classList.add('open');
}
function closeDeposit() {
  document.getElementById('depositOverlay').classList.remove('open');
  document.getElementById('customAmt').value = '';
}
function handleOverlayClick(e) {
  if (e.target === document.getElementById('depositOverlay')) closeDeposit();
}

// ── GAME FILTER ──
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.gcard').forEach(card => {
      const cat = card.dataset.cat;
      card.style.display = (filter === 'all' || cat === filter) ? '' : 'none';
    });
  });
});

// ── GAME CARD 3D TILT ──
document.querySelectorAll('.gcard').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const r  = card.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;
    const rx = ((e.clientY - cy) / (r.height / 2)) * -8;
    const ry = ((e.clientX - cx) / (r.width  / 2)) * 8;
    card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px) scale(1.01)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ── ONLINE COUNTER ──
function updateOnline() {
  const el = document.getElementById('onlineCount');
  if (el) el.textContent = (580 + Math.floor(Math.random() * 620)).toLocaleString();
}
setInterval(updateOnline, 4000);
updateOnline();

// ── LIVE WINS TICKER ──
const WIN_NAMES  = ['Alex M.','Sarah K.','John B.','Emma L.','Mike R.','Priya S.','Tom W.','Jessica H.','Carlos D.','Yuki T.'];
const WIN_GAMES  = ['Blackjack','Roulette Royale','Classic Slots','Crash Rocket','Mega Slots','Premier League Bet'];
const WIN_EMOJIS = ['💰','🎉','🏆','🎰','🚀','⚽','💎'];

function buildTicker() {
  const el = document.getElementById('tickerScroll');
  if (!el) return;
  const events = [];
  for (let i = 0; i < 14; i++) {
    const name  = WIN_NAMES[Math.floor(Math.random() * WIN_NAMES.length)];
    const game  = WIN_GAMES[Math.floor(Math.random() * WIN_GAMES.length)];
    const emoji = WIN_EMOJIS[Math.floor(Math.random() * WIN_EMOJIS.length)];
    const amt   = (Math.random() * 4800 + 120).toFixed(2);
    events.push(`${emoji} <strong style="color:#eef0f6">${name}</strong> won <strong style="color:#f0c040">$${parseFloat(amt).toLocaleString()}</strong> on ${game}`);
  }
  el.innerHTML = events.join('&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;');
}
buildTicker();
setInterval(buildTicker, 30000);

// ── CRASH LAST ROUND ──
function updateLastCrash() {
  const el = document.getElementById('lastCrash');
  if (el) {
    const v = (Math.random() * 9 + 1.01).toFixed(2);
    el.textContent = v + '×';
    el.style.color = parseFloat(v) >= 2 ? '#00d4aa' : '#ff4455';
  }
}
setInterval(updateLastCrash, 8000);

// ── JACKPOT COUNTER ──
let jackpotBase = 48320;
function tickJackpot() {
  jackpotBase += Math.random() * 12;
  const el = document.getElementById('slotsJackpot');
  if (el) el.textContent = '$' + Math.floor(jackpotBase).toLocaleString();
}
setInterval(tickJackpot, 1200);

// ── PREMIER LEAGUE FIXTURE PREVIEW ──
const MOCK_FIXTURES = [
  { home:'Arsenal', away:'Chelsea',   odds:{ home:'1.95', draw:'3.40', away:'4.20' } },
  { home:'Man City', away:'Liverpool', odds:{ home:'2.10', draw:'3.50', away:'3.60' } },
  { home:'Tottenham', away:'Man Utd',  odds:{ home:'2.30', draw:'3.30', away:'3.20' } },
  { home:'Newcastle', away:'Aston Villa', odds:{ home:'2.80', draw:'3.20', away:'2.70' } },
];
function renderFixturePreview() {
  const el = document.getElementById('plFixtures');
  if (!el) return;
  const show = MOCK_FIXTURES.slice(0, 3);
  el.innerHTML = show.map(f =>
    `<div class="fixture-chip">
      <div class="fc-teams">${f.home} v ${f.away}</div>
      <div class="fc-odds">${f.odds.home} · ${f.odds.draw} · ${f.odds.away}</div>
    </div>`
  ).join('');
}
renderFixturePreview();

// ── PARTICLE BACKGROUND ──
const canvas = document.getElementById('bgCanvas');
const ctx    = canvas ? canvas.getContext('2d') : null;
let particles = [];

function resizeCanvas() {
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function makeParticle() {
  return {
    x:     Math.random() * canvas.width,
    y:     Math.random() * canvas.height,
    r:     Math.random() * 1.6 + 0.3,
    dx:    (Math.random() - 0.5) * 0.3,
    dy:    (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.35 + 0.08,
  };
}

function initParticles() {
  if (!canvas) return;
  particles = Array.from({ length: 80 }, makeParticle);
}

function drawParticles() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(240,192,64,${p.alpha})`;
    ctx.fill();
    p.x += p.dx;
    p.y += p.dy;
    if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
  });
  requestAnimationFrame(drawParticles);
}
initParticles();
drawParticles();

// ── TOAST NOTIFICATIONS ──
function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = 'bg-toast bg-toast-' + type;
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom:'24px', right:'24px',
    background: type === 'success' ? '#00d4aa' : type === 'error' ? '#ff4455' : '#f0c040',
    color: '#0a0d1a', padding:'12px 20px', borderRadius:'10px',
    fontWeight:'700', fontSize:'0.88rem', zIndex:'9999',
    animation:'toastIn 0.3s ease', boxShadow:'0 8px 24px rgba(0,0,0,0.4)',
  });
  const style = document.createElement('style');
  style.textContent = '@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(style);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ── INIT ──
renderBalance();
