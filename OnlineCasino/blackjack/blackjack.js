/* =============================================
   BELLAGIO GOLD — BLACKJACK ENGINE
   Standard 6-Deck Blackjack Rules
   ============================================= */

const BALANCE_KEY = 'bellagio_balance';

// ── DECK ──
const SUITS  = ['♠','♥','♦','♣'];
const RANKS  = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RED_SUITS = new Set(['♥','♦']);

let shoe = [];
let currentBet  = 0;
let lastBet     = 0;
let selectedChipVal = 25;

let playerCards = [];
let dealerCards = [];
let gameState   = 'betting'; // 'betting' | 'player' | 'dealer' | 'done'

let stats = { wins:0, losses:0, pushes:0, blackjacks:0 };

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  buildShoe();
  renderBalance();
  selectChip(25);
  renderStats();
  initParticles();
});

// ── SHOE ──
function buildShoe() {
  shoe = [];
  for (let d = 0; d < 6; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ rank, suit });
      }
    }
  }
  shuffle(shoe);
  updateShoeDisplay();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function drawCard() {
  if (shoe.length < 20) buildShoe(); // Reshuffle near end
  updateShoeDisplay();
  return shoe.pop();
}

function updateShoeDisplay() {
  const el = document.getElementById('shoeCards');
  if (el) el.textContent = shoe.length + ' cards remaining';
}

// ── CHIP SELECTION ──
function selectChip(val) {
  selectedChipVal = val;
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', parseInt(c.dataset.val) === val);
  });
  if (gameState === 'betting') {
    addToBet(val);
  }
}

function addToBet(amount) {
  if (gameState !== 'betting') return;
  const balance = getBalance();
  if (currentBet + amount > balance) {
    showToast('Not enough balance!', 'error');
    return;
  }
  currentBet += amount;
  updateBetDisplay();
}

function clearBet() {
  currentBet = 0;
  updateBetDisplay();
}

function repeatBet() {
  if (lastBet === 0) return;
  const balance = getBalance();
  if (lastBet > balance) { showToast('Not enough balance!', 'error'); return; }
  currentBet = lastBet;
  updateBetDisplay();
}

function updateBetDisplay() {
  document.getElementById('currentBetDisplay').textContent = '$' + currentBet.toLocaleString();
  document.getElementById('dealBtn').disabled = currentBet <= 0;
}

// ── DEAL ──
function deal() {
  if (currentBet <= 0) return;
  const balance = getBalance();
  if (currentBet > balance) { showToast('Not enough balance!', 'error'); return; }

  // Deduct bet
  setBalance(balance - currentBet);
  lastBet = currentBet;

  gameState = 'player';

  playerCards = [drawCard(), drawCard()];
  dealerCards = [drawCard(), drawCard()];

  hideResultBanner();
  showBetControls(false);
  showGameActions(true);

  renderHands(true);

  // Check for blackjack immediately
  if (handValue(playerCards) === 21) {
    if (handValue(dealerCards) === 21) {
      // Both blackjack — push (reveal dealer first)
      setTimeout(() => finishGame(), 800);
    } else {
      setTimeout(() => finishGame(), 600);
    }
    return;
  }

  updateActionButtons();
}

// ── HIT ──
function hit() {
  if (gameState !== 'player') return;
  playerCards.push(drawCard());
  renderHands(true);
  const val = handValue(playerCards);

  if (val > 21) {
    // Bust
    setTimeout(() => finishGame(), 600);
  } else if (val === 21) {
    // Auto-stand on 21
    setTimeout(() => dealerPlay(), 600);
  } else {
    updateActionButtons();
  }
}

// ── STAND ──
function stand() {
  if (gameState !== 'player') return;
  dealerPlay();
}

// ── DOUBLE DOWN ──
function doubleDown() {
  if (gameState !== 'player' || playerCards.length > 2) return;
  const balance = getBalance();
  if (currentBet > balance) { showToast('Not enough balance to double!', 'error'); return; }
  setBalance(balance - currentBet);
  currentBet *= 2;
  playerCards.push(drawCard());
  renderHands(true);
  const val = handValue(playerCards);
  if (val > 21) {
    setTimeout(() => finishGame(), 700);
  } else {
    setTimeout(() => dealerPlay(), 700);
  }
}

// ── SPLIT ──
function split() {
  showToast('Split: take separate hands with equal bets', 'info');
}

// ── DEALER PLAY ──
function dealerPlay() {
  gameState = 'dealer';
  showGameActions(false);
  renderHands(false); // Reveal dealer hole card

  let delay = 600;

  function dealerTurn() {
    const val = handValue(dealerCards);
    // Dealer hits on hard ≤16 and soft 17
    if (val < 17 || (val === 17 && isSoft(dealerCards))) {
      setTimeout(() => {
        dealerCards.push(drawCard());
        renderHands(false);
        dealerTurn();
      }, delay);
    } else {
      setTimeout(() => finishGame(), delay);
    }
  }
  setTimeout(dealerTurn, 500);
}

function isSoft(cards) {
  const hasAce = cards.some(c => c.rank === 'A');
  if (!hasAce) return false;
  const base = cards.reduce((sum, c) => sum + (c.rank === 'A' ? 1 : cardValue(c)), 0);
  return base + 10 <= 21;
}

// ── FINISH GAME ──
function finishGame() {
  gameState = 'done';
  renderHands(false); // Reveal all
  showGameActions(false);

  const pv = handValue(playerCards);
  const dv = handValue(dealerCards);
  const pBJ = isBlackjack(playerCards);
  const dBJ = isBlackjack(dealerCards);

  let result, payout = 0;

  if (pv > 21) {
    result = 'lose';
    payout = 0;
  } else if (pBJ && dBJ) {
    result = 'push';
    payout = currentBet;
  } else if (pBJ) {
    result = 'blackjack';
    payout = currentBet + Math.floor(currentBet * 1.5);
    stats.blackjacks++;
  } else if (dv > 21) {
    result = 'win';
    payout = currentBet * 2;
  } else if (pv > dv) {
    result = 'win';
    payout = currentBet * 2;
  } else if (pv < dv) {
    result = 'lose';
    payout = 0;
  } else {
    result = 'push';
    payout = currentBet;
  }

  if (result === 'win' || result === 'blackjack') stats.wins++;
  else if (result === 'lose') stats.losses++;
  else if (result === 'push') stats.pushes++;

  setBalance(getBalance() + payout);
  renderStats();

  showResultBanner(result, payout);
  showNextRoundBtn();
}

function showResultBanner(result, payout) {
  const el = document.getElementById('resultBanner');
  const msgs = {
    win:       `🏆 You Win! +$${payout.toLocaleString()}`,
    blackjack: `🃏 BLACKJACK! +$${payout.toLocaleString()}`,
    lose:      `💸 Bust — Dealer Wins`,
    push:      `🤝 Push — Bet Returned`,
  };
  el.textContent = msgs[result] || '';
  el.className   = 'result-banner ' + (result === 'blackjack' ? 'bj' : result === 'push' ? 'push' : result === 'lose' ? 'lose' : 'win');
  el.style.display = 'block';
}

function hideResultBanner() {
  const el = document.getElementById('resultBanner');
  if (el) { el.style.display = 'none'; el.textContent = ''; }
}

function showNextRoundBtn() {
  const ga = document.getElementById('gameActions');
  ga.style.display = 'flex';
  ga.innerHTML = `
    <button class="action-btn btn-next" onclick="nextRound()">▶ Next Round</button>
  `;
}

function nextRound() {
  playerCards = [];
  dealerCards = [];
  currentBet  = 0;
  gameState   = 'betting';

  document.getElementById('dealerHand').innerHTML = '';
  document.getElementById('playerHand').innerHTML = '';
  document.getElementById('dealerValue').innerHTML = '';
  document.getElementById('playerValue').innerHTML = '';
  hideResultBanner();
  showBetControls(true);
  showGameActions(false);
  updateBetDisplay();
  document.getElementById('repeatBtn').disabled = (lastBet === 0);
}

// ── RENDER HANDS ──
function renderHands(hideDealer) {
  const dh = document.getElementById('dealerHand');
  const ph = document.getElementById('playerHand');
  const dv = document.getElementById('dealerValue');
  const pv = document.getElementById('playerValue');

  // Player
  ph.innerHTML = playerCards.map(c => cardHTML(c, false)).join('');
  const pVal = handValue(playerCards);
  pv.innerHTML = `<span class="hv-badge ${pVal > 21 ? 'bust' : pVal === 21 ? 'bj' : ''}">${pVal > 21 ? 'Bust' : pVal}</span>`;

  // Dealer
  if (hideDealer && dealerCards.length >= 2) {
    dh.innerHTML = cardHTML(dealerCards[0], false) + cardHTML(dealerCards[1], true)
                 + dealerCards.slice(2).map(c => cardHTML(c, false)).join('');
    const visVal = cardValue(dealerCards[0]);
    dv.innerHTML = `<span class="hv-badge">${visVal}</span>`;
  } else {
    dh.innerHTML = dealerCards.map(c => cardHTML(c, false)).join('');
    const dVal = handValue(dealerCards);
    dv.innerHTML = `<span class="hv-badge ${dVal > 21 ? 'bust' : ''}">${dVal > 21 ? 'Bust' : dVal}</span>`;
  }
}

function cardHTML(card, hidden) {
  if (hidden) {
    return `<div class="card hidden"><span class="card-hidden-pattern">🂠</span></div>`;
  }
  const isRed = RED_SUITS.has(card.suit);
  const cls   = isRed ? 'red' : 'black';
  return `
    <div class="card ${cls}">
      <div class="card-corner-tl"><div class="card-rank">${card.rank}</div><div class="card-suit">${card.suit}</div></div>
      <div class="card-suit" style="font-size:1.8rem">${card.suit}</div>
      <div class="card-corner-br"><div class="card-rank">${card.rank}</div><div class="card-suit">${card.suit}</div></div>
    </div>`;
}

// ── CARD VALUE ──
function cardValue(card) {
  if (card.rank === 'A') return 11;
  if (['J','Q','K'].includes(card.rank)) return 10;
  return parseInt(card.rank);
}

function handValue(cards) {
  let val = 0, aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { aces++; val += 11; }
    else val += (['J','Q','K'].includes(c.rank)) ? 10 : parseInt(c.rank);
  }
  while (val > 21 && aces > 0) { val -= 10; aces--; }
  return val;
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

// ── UI HELPERS ──
function showBetControls(show) {
  document.getElementById('betControls').style.display = show ? 'block' : 'none';
}

function showGameActions(show) {
  const el = document.getElementById('gameActions');
  el.style.display = show ? 'flex' : 'none';
  if (show) {
    el.innerHTML = `
      <button class="action-btn btn-hit"    id="hitBtn"    onclick="hit()">Hit</button>
      <button class="action-btn btn-stand"  id="standBtn"  onclick="stand()">Stand</button>
      <button class="action-btn btn-double" id="doubleBtn" onclick="doubleDown()">Double</button>
      <button class="action-btn btn-split"  id="splitBtn"  onclick="split()" ${canSplit() ? '' : 'disabled'}>Split</button>
    `;
  }
}

function canSplit() {
  return playerCards.length === 2 && cardValue(playerCards[0]) === cardValue(playerCards[1]);
}

function updateActionButtons() {
  const pv = handValue(playerCards);
  const dbl = document.getElementById('doubleBtn');
  const spl = document.getElementById('splitBtn');
  if (dbl) dbl.disabled = playerCards.length > 2 || getBalance() < currentBet;
  if (spl) spl.disabled = !canSplit();
}

// ── STATS ──
function renderStats() {
  document.getElementById('statWins').textContent    = stats.wins;
  document.getElementById('statLosses').textContent  = stats.losses;
  document.getElementById('statPushes').textContent  = stats.pushes;
  document.getElementById('statBJs').textContent     = stats.blackjacks;
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
  const el = document.getElementById('bjBalance');
  if (el) el.textContent = '$' + getBalance().toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// ── TOAST ──
function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', bottom:'20px', right:'20px',
    background: type === 'error' ? '#ff4455' : '#f0c040',
    color: type === 'error' ? '#fff' : '#0a0d1a',
    padding:'10px 18px', borderRadius:'8px',
    fontWeight:'700', fontSize:'0.85rem', zIndex:'9999',
    boxShadow:'0 6px 20px rgba(0,0,0,0.5)',
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ── PARTICLE BACKGROUND ──
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx    = bgCanvas ? bgCanvas.getContext('2d') : null;
let ptcls = [];

function initParticles() {
  if (!bgCanvas) return;
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    bgCanvas.width  = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  });
  ptcls = Array.from({length:50}, () => ({
    x: Math.random() * bgCanvas.width,
    y: Math.random() * bgCanvas.height,
    r: Math.random() * 1.4 + 0.3,
    dx: (Math.random()-0.5) * 0.25,
    dy: (Math.random()-0.5) * 0.25,
    a: Math.random() * 0.25 + 0.05,
  }));
  (function loop() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    ptcls.forEach(p => {
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      bgCtx.fillStyle = `rgba(240,192,64,${p.a})`;
      bgCtx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > bgCanvas.width)  p.dx *= -1;
      if (p.y < 0 || p.y > bgCanvas.height) p.dy *= -1;
    });
    requestAnimationFrame(loop);
  })();
}
