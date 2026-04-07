/* ===========================
   MEGA STRIP SLOTS – JS
   5 Reels • 3 Rows • 20 Lines
=========================== */

// ── Shared balance via localStorage ──
const _BKEY = 'bellagio_balance';
function _getbal() { const v = localStorage.getItem(_BKEY); return v !== null ? parseFloat(v) : 5000; }
function _setbal(v) { localStorage.setItem(_BKEY, Math.max(0,v).toFixed(2)); }

let balance = _getbal();
let betPerLine = 5;
let lines = 20;
let isSpinning = false;
let autoSpin = false;
let freeSpins = 0;

// Symbols
const SYMBOLS = ["7", "💎", "🔔", "🍒", "BAR", "⭐", "🎰"];
const WILD = "⭐";
const SCATTER = "🎰";

// Simple payout table (per line, per bet unit)
const PAYTABLE = {
  "7":   [0, 0, 50, 150, 400],
  "💎":  [0, 0, 30, 100, 250],
  "🔔":  [0, 0, 20, 60, 150],
  "🍒":  [0, 0, 10, 30, 80],
  "BAR": [0, 0, 8, 20, 60]
};

// 20 paylines (each is [rowIndex per reel])
const PAYLINES = [
  [1,1,1,1,1],
  [0,0,0,0,0],
  [2,2,2,2,2],
  [0,1,2,1,0],
  [2,1,0,1,2],
  [0,0,1,2,2],
  [2,2,1,0,0],
  [1,0,0,0,1],
  [1,2,2,2,1],
  [0,1,1,1,0],
  [2,1,1,1,2],
  [0,1,2,2,2],
  [2,1,0,0,0],
  [1,1,0,1,2],
  [1,1,2,1,0],
  [0,2,0,2,0],
  [2,0,2,0,2],
  [0,2,1,2,0],
  [2,0,1,0,2],
  [1,0,2,0,1]
];

// DOM
const balanceEl = document.getElementById("balance");
const betPerLineEl = document.getElementById("betPerLine");
const linesCountEl = document.getElementById("linesCount");
const totalBetEl = document.getElementById("totalBet");
const statusText = document.getElementById("statusText");
const freeSpinsBox = document.getElementById("freeSpinsBox");
const freeSpinsCountEl = document.getElementById("freeSpinsCount");

const spinBtn = document.getElementById("spinBtn");
const autoBtn = document.getElementById("autoBtn");
const betUpBtn = document.getElementById("betUp");
const betDownBtn = document.getElementById("betDown");

const winLinesOverlay = document.getElementById("winLines");

// Sounds
const spinSound = document.getElementById("spinSound");
const reelStopSound = document.getElementById("reelStopSound");
const winSound = document.getElementById("winSound");
const bigWinSound = document.getElementById("bigWinSound");

// Big win overlay
let bigWinOverlay;
createBigWinOverlay();

/* ===========================
   REEL STRIPS
=========================== */

const REEL_COUNT = 5;
const ROWS = 3;
const STRIP_LENGTH = 30; // virtual strip length

let reelStrips = []; // each reel: array of symbols

function createReelStrips() {
  reelStrips = [];
  for (let r = 0; r < REEL_COUNT; r++) {
    const strip = [];
    for (let i = 0; i < STRIP_LENGTH; i++) {
      const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      strip.push(sym);
    }
    reelStrips.push(strip);
  }
}

function renderReelsInitial() {
  const reelDivs = document.querySelectorAll(".reel");

  reelDivs.forEach((reelDiv, index) => {
    reelDiv.innerHTML = "";

    const stripDiv = document.createElement("div");
    stripDiv.className = "reel-strip";

    // Build full strip (30 symbols) so no black gaps
    reelStrips[index].forEach(sym => {
      const cell = document.createElement("div");
      cell.className = "symbol-cell";
      cell.textContent = sym;
      stripDiv.appendChild(cell);
    });

    reelDiv.appendChild(stripDiv);
  });
}

/* ===========================
   UI HELPERS
=========================== */

function updateUI() {
  balanceEl.textContent = balance;
  betPerLineEl.textContent = betPerLine;
  linesCountEl.textContent = lines;
  totalBetEl.textContent = betPerLine * lines;
  if (freeSpins > 0) {
    freeSpinsBox.style.display = "block";
    freeSpinsCountEl.textContent = freeSpins;
  } else {
    freeSpinsBox.style.display = "none";
  }
}

function setStatus(msg, type = "info") {
  statusText.textContent = msg;
  statusText.style.color =
    type === "win" ? "#f5d28b" :
    type === "lose" ? "#ff8a8a" :
    "#b3a58a";
}

/* ===========================
   SPIN LOGIC
=========================== */

function getTotalBet() {
  return freeSpins > 0 ? 0 : betPerLine * lines;
}

function canSpin() {
  const bet = getTotalBet();
  if (bet > balance) {
    setStatus("Not enough credits", "lose");
    return false;
  }
  return true;
}

function spin() {
  if (isSpinning) return;
  if (!canSpin()) {
    autoSpin = false;
    autoBtn.classList.remove("active");
    return;
  }

  isSpinning = true;
  setStatus(freeSpins > 0 ? "Free Spin in progress..." : "Spinning...");

  const bet = getTotalBet();
  balance -= bet;
  _setbal(balance);
  updateUI();

  spinSound.currentTime = 0;
  spinSound.play().catch(() => {});

  clearWinLines();

  const reelDivs = document.querySelectorAll(".reel");
  const resultsMatrix = Array.from({ length: ROWS }, () => Array(REEL_COUNT).fill(null));

  const spinDurations = [700, 900, 1100, 1300, 1500];

  reelDivs.forEach((reelDiv, reelIndex) => {
    reelDiv.classList.add("spinning");

    const stripDiv = reelDiv.querySelector(".reel-strip");
    const strip = reelStrips[reelIndex];

    // choose a random stop index so that 3 symbols are visible
    const stopIndex = Math.floor(Math.random() * (STRIP_LENGTH - ROWS));
    const offset = stopIndex * 70; // 70px per symbol

    stripDiv.style.transition = "transform 0.7s cubic-bezier(0.25, 0.8, 0.25, 1)";
    stripDiv.style.transform = `translateY(-${offset}px)`;

    setTimeout(() => {
      reelDiv.classList.remove("spinning");
      reelStopSound.currentTime = 0;
      reelStopSound.play().catch(() => {});

      // capture visible symbols (3 rows)
      for (let row = 0; row < ROWS; row++) {
        resultsMatrix[row][reelIndex] = strip[stopIndex + row];
      }

      // last reel → evaluate
      if (reelIndex === REEL_COUNT - 1) {
        setTimeout(() => {
          handleSpinResult(resultsMatrix, bet);
        }, 300);
      }
    }, spinDurations[reelIndex]);
  });
}

function handleSpinResult(matrix, bet) {
  const { totalWin, lineWins, scatterCount } = evaluateWin(matrix, betPerLine);

  if (scatterCount >= 3) {
    const fsAward = 8;
    freeSpins += fsAward;
    setStatus(`Free Spins awarded: ${fsAward}`, "win");
  }

  if (totalWin > 0) {
    balance += totalWin;
    _setbal(balance);
    updateUI();
    showWinLines(lineWins);

    if (totalWin >= bet * 8) {
      triggerBigWin(totalWin);
    } else {
      winSound.currentTime = 0;
      winSound.play().catch(() => {});
      setStatus(`You won ${totalWin} credits`, "win");
    }
  } else if (scatterCount < 3) {
    setStatus(`No win`, "lose");
  }

  isSpinning = false;

  if (freeSpins > 0) {
    freeSpins--;
    updateUI();
    setTimeout(spin, 600);
  } else if (autoSpin) {
    setTimeout(spin, 600);
  }
}

/* ===========================
   EVALUATION
=========================== */

function evaluateWin(matrix, betPerLine) {
  let totalWin = 0;
  const lineWins = [];
  let scatterCount = 0;

  // count scatters anywhere
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < REEL_COUNT; c++) {
      if (matrix[r][c] === SCATTER) scatterCount++;
    }
  }

  PAYLINES.slice(0, lines).forEach((line, lineIndex) => {
    const symbolsOnLine = line.map((row, reel) => matrix[row][reel]);

    // find first non-wild symbol
    let baseSymbol = null;
    for (let i = 0; i < symbolsOnLine.length; i++) {
      const s = symbolsOnLine[i];
      if (s !== WILD && s !== SCATTER) {
        baseSymbol = s;
        break;
      }
    }
    if (!baseSymbol) return;

    let matchCount = 0;
    for (let i = 0; i < symbolsOnLine.length; i++) {
      const s = symbolsOnLine[i];
      if (s === baseSymbol || s === WILD) {
        matchCount++;
      } else {
        break;
      }
    }

    if (matchCount >= 3 && PAYTABLE[baseSymbol]) {
      const payout = PAYTABLE[baseSymbol][matchCount] * betPerLine;
      if (payout > 0) {
        totalWin += payout;
        lineWins.push({ lineIndex, matchCount, payout });
      }
    }
  });

  return { totalWin, lineWins, scatterCount };
}

/* ===========================
   WIN LINES VISUALS
=========================== */

function clearWinLines() {
  winLinesOverlay.innerHTML = "";
  document.querySelector(".reels-frame").classList.remove("big-win");
}

function showWinLines(lineWins) {
  if (!lineWins.length) return;

  const frameRect = winLinesOverlay.getBoundingClientRect();
  const cellWidth = frameRect.width / REEL_COUNT;
  const cellHeight = frameRect.height / ROWS;

  lineWins.forEach(win => {
    const line = PAYLINES[win.lineIndex];

    const path = document.createElement("div");
    path.style.position = "absolute";
    path.style.border = "2px solid rgba(245,210,139,0.9)";
    path.style.borderRadius = "999px";
    path.style.boxShadow = "0 0 12px rgba(245,210,139,0.9)";

    const firstRow = line[0];
    const lastRow = line[line.length - 1];

    const top = Math.min(firstRow, lastRow) * cellHeight + cellHeight / 2 - 10;
    const height = Math.abs(firstRow - lastRow) * cellHeight + 20;

    path.style.left = "0px";
    path.style.top = `${top}px`;
    path.style.width = `${frameRect.width}px`;
    path.style.height = `${height}px`;

    winLinesOverlay.appendChild(path);
  });
}

/* ===========================
   BIG WIN
=========================== */

function createBigWinOverlay() {
  bigWinOverlay = document.createElement("div");
  bigWinOverlay.className = "big-win-overlay";
  bigWinOverlay.innerHTML = `
    <div class="big-win-box">
      <h1>BIG WIN</h1>
      <p id="bigWinAmount"></p>
    </div>
  `;
  document.body.appendChild(bigWinOverlay);
}

function triggerBigWin(amount) {
  const frame = document.querySelector(".reels-frame");
  frame.classList.add("big-win");

  const amountEl = document.getElementById("bigWinAmount");
  amountEl.textContent = `${amount} credits`;

  bigWinOverlay.classList.add("active");
  bigWinSound.currentTime = 0;
  bigWinSound.play().catch(() => {});

  setTimeout(() => {
    bigWinOverlay.classList.remove("active");
    frame.classList.remove("big-win");
  }, 2500);
}

/* ===========================
   CONTROLS
=========================== */

spinBtn.addEventListener("click", () => {
  autoSpin = false;
  autoBtn.classList.remove("active");
  spin();
});

autoBtn.addEventListener("click", () => {
  autoSpin = !autoSpin;
  autoBtn.classList.toggle("active", autoSpin);
  if (autoSpin && !isSpinning) spin();
});

betUpBtn.addEventListener("click", () => {
  if (betPerLine < 50 && !isSpinning) {
    betPerLine += 1;
    updateUI();
  }
});

betDownBtn.addEventListener("click", () => {
  if (betPerLine > 1 && !isSpinning) {
    betPerLine -= 1;
    updateUI();
  }
});

/* ===========================
   PARTICLES
=========================== */

const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
let particles = [];
const count = 70;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function createParticles() {
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.4,
      dx: (Math.random() - 0.5) * 0.2,
      dy: (Math.random() - 0.5) * 0.2,
      a: Math.random() * 0.4 + 0.2
    });
  }
}

function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(245,210,139,${p.a})`;
    ctx.fill();

    p.x += p.dx;
    p.y += p.dy;

    if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
  });
  requestAnimationFrame(drawParticles);
}

createParticles();
drawParticles();

/* ===========================
   INIT
=========================== */

createReelStrips();
renderReelsInitial();
updateUI();
setStatus("Place your bet and spin");
