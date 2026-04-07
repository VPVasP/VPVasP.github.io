/* ===========================
   ROULETTE ROYALE – AMERICAN
   Table + Racetrack + Chips
=========================== */

// ── Shared balance via localStorage ──
const _BKEY = 'bellagio_balance';
function _getbal() { const v = localStorage.getItem(_BKEY); return v !== null ? parseFloat(v) : 5000; }
function _setbal(v) { localStorage.setItem(_BKEY, Math.max(0,v).toFixed(2)); }

let balance = _getbal();
const balanceEl = document.getElementById("balance");

const wheel = document.getElementById("wheel");
const ball = document.getElementById("ball");
const dealerText = document.getElementById("dealerText");
const resultBox = document.getElementById("resultBox");

const chipButtons = document.querySelectorAll(".chip");
const raceButtons = document.querySelectorAll(".race-btn");
const clearBetsBtn = document.getElementById("clearBetsBtn");
const spinBtn = document.getElementById("spinBtn");
const betsListEl = document.getElementById("betsList");

const spinSound = document.getElementById("spinSound");
const ballSound = document.getElementById("ballSound");
const winSound = document.getElementById("winSound");
const loseSound = document.getElementById("loseSound");
const dealerNoMore = document.getElementById("dealerNoMore");
const dealerPlace = document.getElementById("dealerPlace");
const dealerWin = document.getElementById("dealerWin");

let selectedChip = 25;
let isSpinning = false;
let bets = [];

/* ===========================
   AMERICAN WHEEL ORDER
=========================== */

const pockets = [
  "0","28","9","26","30","11","7","20","32","17","5","22","34","15","3","24","36","13",
  "1","00","27","10","25","29","12","8","19","31","18","6","21","33","16","4","23","35","14","2"
];

function getPocketColor(num) {
  if (num === "0" || num === "00") return "green";
  const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  const n = parseInt(num);
  return reds.includes(n) ? "red" : "black";
}

/* ===========================
   INIT TABLE NUMBERS
=========================== */

function createNumberCells() {
  const col1 = document.getElementById("col-1");
  const col2 = document.getElementById("col-2");
  const col3 = document.getElementById("col-3");

  for (let n = 1; n <= 36; n++) {
    const cell = document.createElement("div");
    cell.classList.add("cell", "number");
    const color = getPocketColor(String(n));
    cell.classList.add(color);
    cell.dataset.type = "straight";
    cell.dataset.value = String(n);
    cell.textContent = n;

    if (n % 3 === 1) col1.appendChild(cell);
    else if (n % 3 === 2) col2.appendChild(cell);
    else col3.appendChild(cell);
  }
}

/* ===========================
   CHIP SELECTION
=========================== */

chipButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    chipButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedChip = parseInt(btn.dataset.value);
  });
});
chipButtons[2].classList.add("active"); // default 25

/* ===========================
   BET PLACEMENT
=========================== */

function addBet(type, value, amount) {
  bets.push({ type, value, amount });
  renderBets();
}

function renderBets() {
  betsListEl.innerHTML = "";
  bets.forEach(b => {
    const li = document.createElement("li");
    li.textContent = `${b.type} ${b.value} – ${b.amount}`;
    betsListEl.appendChild(li);
  });
}

function clearBets() {
  bets = [];
  renderBets();
}

clearBetsBtn.addEventListener("click", () => {
  if (isSpinning) return;
  clearBets();
});

/* TABLE CELLS CLICK */
document.addEventListener("click", e => {
  if (isSpinning) return;
  const cell = e.target.closest(".cell, .outside-cell");
  if (!cell) return;

  const type = cell.dataset.type;
  const value = cell.dataset.value;
  if (!type || !value) return;

  if (selectedChip > balance) return;

  addBet(type, value, selectedChip);
});

/* RACETRACK GROUPS */
const racetrackGroups = {
  neighbors0: ["0","00","1","2","3"],
  five: ["0","00","1","2","3"],
  orphans: ["1","3","5","9","12","14","16","19","23","27","30","32","34","36"]
};

raceButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isSpinning) return;
    const group = btn.dataset.group;
    const nums = racetrackGroups[group];
    if (!nums) return;
    const totalNeeded = selectedChip * nums.length;
    if (totalNeeded > balance) return;
    nums.forEach(n => addBet("straight", n, selectedChip));
  });
});

/* ===========================
   SPIN LOGIC
=========================== */

function totalBetAmount() {
  return bets.reduce((sum, b) => sum + b.amount, 0);
}

spinBtn.addEventListener("click", () => {
  if (isSpinning) return;
  if (!bets.length) {
    dealerText.textContent = "Place a bet first";
    return;
  }

  const total = totalBetAmount();
  if (total > balance) {
    dealerText.textContent = "Not enough credits";
    return;
  }

  balance -= total;
  _setbal(balance);
  balanceEl.textContent = balance;

  isSpinning = true;
  dealerText.textContent = "No more bets";
  dealerNoMore.play().catch(() => {});

  spinSound.currentTime = 0;
  spinSound.play().catch(() => {});
  ballSound.currentTime = 0;
  ballSound.play().catch(() => {});

  wheel.classList.add("blur");

  const baseRot = 360 * 6;
  const randomOffset = Math.floor(Math.random() * 360);
  const finalRotation = baseRot + randomOffset;

  wheel.style.transition = "transform 4.5s cubic-bezier(0.1, 0.8, 0.2, 1)";
  wheel.style.transform = `rotate(${finalRotation}deg)`;

  const ballRot = 360 * 10 + (360 - randomOffset);
  ball.style.transition = "transform 4.5s ease-out";
  ball.style.transform = `rotate(${ballRot}deg)`;

  const pocketAngle = 360 / pockets.length;
  const index = Math.floor((randomOffset % 360) / pocketAngle);
  const winningIndex = (pockets.length - index) % pockets.length;
  const winningNumber = pockets[winningIndex];

  setTimeout(() => {
    wheel.classList.remove("blur");
    handleResult(winningNumber);
  }, 4700);
});

/* ===========================
   EVALUATION
=========================== */

function evaluateBet(bet, num, color) {
  const n = num === "00" ? 37 : parseInt(num);
  let win = 0;

  switch (bet.type) {
    case "straight":
      if (bet.value === num) win = bet.amount * 35;
      break;
    case "color":
      if (bet.value === color) win = bet.amount * 2;
      break;
    case "evenodd":
      if (num !== "0" && num !== "00") {
        if (bet.value === "even" && n % 2 === 0) win = bet.amount * 2;
        if (bet.value === "odd" && n % 2 === 1) win = bet.amount * 2;
      }
      break;
    case "lowhigh":
      if (num !== "0" && num !== "00") {
        if (bet.value === "low" && n >= 1 && n <= 18) win = bet.amount * 2;
        if (bet.value === "high" && n >= 19 && n <= 36) win = bet.amount * 2;
      }
      break;
    case "dozen":
      if (num !== "0" && num !== "00") {
        if (bet.value === "1" && n >= 1 && n <= 12) win = bet.amount * 3;
        if (bet.value === "2" && n >= 13 && n <= 24) win = bet.amount * 3;
        if (bet.value === "3" && n >= 25 && n <= 36) win = bet.amount * 3;
      }
      break;
    case "column":
      if (num !== "0" && num !== "00") {
        const col = ((n - 1) % 3) + 1;
        if (String(col) === bet.value) win = bet.amount * 3;
      }
      break;
  }

  return win;
}

function handleResult(num) {
  const color = getPocketColor(num);
  let totalWin = 0;

  bets.forEach(b => {
    totalWin += evaluateBet(b, num, color);
  });

  highlightWinningCell(num);

  if (totalWin > 0) {
    balance += totalWin;
    _setbal(balance);
    balanceEl.textContent = balance;
    winSound.play().catch(() => {});
    dealerWin.play().catch(() => {});
    dealerText.textContent = `Winner: ${num} (${color})`;
    resultBox.textContent = `You won ${totalWin} credits`;
  } else {
    loseSound.play().catch(() => {});
    dealerText.textContent = `No win – ${num} (${color})`;
    resultBox.textContent = `Lost. Number ${num} (${color})`;
  }

  bets = [];
  renderBets();
  isSpinning = false;

  setTimeout(() => {
    dealerPlace.play().catch(() => {});
    dealerText.textContent = "Place your bets";
  }, 2000);
}

/* ===========================
   HIGHLIGHT WINNING CELL
=========================== */

function highlightWinningCell(num) {
  document.querySelectorAll(".cell.number, .cell.zero").forEach(c => {
    c.classList.remove("win");
  });

  if (num === "0" || num === "00") {
    const zeroCell = document.querySelector(`.cell.zero[data-value="${num}"]`);
    if (zeroCell) zeroCell.classList.add("win");
  } else {
    const cell = document.querySelector(`.cell.number[data-value="${num}"]`);
    if (cell) cell.classList.add("win");
  }
}

/* ===========================
   PARTICLES (SIMPLE GOLD)
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

createNumberCells();
dealerPlace.play().catch(() => {});
dealerText.textContent = "Place your bets";
