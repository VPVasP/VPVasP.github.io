/* =============================================
   BELLAGIO GOLD — SPORTS BETTING ENGINE
   Real Premier League odds via The Odds API
   ============================================= */

const API_KEY_STORAGE = 'bellagio_odds_api_key';
const BALANCE_KEY     = 'bellagio_balance';
const BETS_KEY        = 'bellagio_bets';
const ODDS_API_BASE   = 'https://api.the-odds-api.com/v4';
const EPL_SPORT       = 'soccer_epl';

// ── TEAM COLOURS & BADGES ──
const TEAM_COLOURS = {
  'Arsenal':            { bg:'#EF0107', emoji:'🔴' },
  'Chelsea':            { bg:'#034694', emoji:'🔵' },
  'Liverpool':          { bg:'#C8102E', emoji:'🔴' },
  'Manchester City':    { bg:'#6CABDD', emoji:'🩵' },
  'Manchester United':  { bg:'#DA291C', emoji:'🔴' },
  'Tottenham Hotspur':  { bg:'#132257', emoji:'⚪' },
  'Tottenham':          { bg:'#132257', emoji:'⚪' },
  'Aston Villa':        { bg:'#670E36', emoji:'🟣' },
  'Newcastle United':   { bg:'#241F20', emoji:'⚫' },
  'Newcastle':          { bg:'#241F20', emoji:'⚫' },
  'Brighton':           { bg:'#0057B8', emoji:'🔵' },
  'Brighton & Hove Albion': { bg:'#0057B8', emoji:'🔵' },
  'West Ham United':    { bg:'#7A263A', emoji:'🔴' },
  'West Ham':           { bg:'#7A263A', emoji:'🔴' },
  'Crystal Palace':     { bg:'#1B458F', emoji:'🔵' },
  'Brentford':          { bg:'#E30613', emoji:'🔴' },
  'Fulham':             { bg:'#CC0000', emoji:'⚪' },
  'Wolverhampton':      { bg:'#FDB913', emoji:'🟡' },
  'Wolves':             { bg:'#FDB913', emoji:'🟡' },
  'Everton':            { bg:'#003399', emoji:'🔵' },
  'Nottingham Forest':  { bg:'#DD0000', emoji:'🔴' },
  'Bournemouth':        { bg:'#DA291C', emoji:'🔴' },
  'Leicester City':     { bg:'#003090', emoji:'🔵' },
  'Leicester':          { bg:'#003090', emoji:'🔵' },
  'Ipswich Town':       { bg:'#0055A5', emoji:'🔵' },
  'Ipswich':            { bg:'#0055A5', emoji:'🔵' },
  'Southampton':        { bg:'#D71920', emoji:'🔴' },
};

function getTeamEmoji(name) {
  return (TEAM_COLOURS[name] || { emoji:'⚽' }).emoji;
}

// ── MOCK DATA (used when no API key) ──
const MOCK_MATCHES = [
  {
    id:'mock_01', home_team:'Arsenal',          away_team:'Chelsea',
    commence_time: addHours(2),
    bookmakers:[{ title:'Bet365', markets:[{ key:'h2h', outcomes:[
      {name:'Arsenal',price:1.90},{name:'Draw',price:3.50},{name:'Chelsea',price:4.20}
    ]}]}]
  },
  {
    id:'mock_02', home_team:'Manchester City',  away_team:'Liverpool',
    commence_time: addHours(4),
    bookmakers:[{ title:'Bet365', markets:[{ key:'h2h', outcomes:[
      {name:'Manchester City',price:2.10},{name:'Draw',price:3.40},{name:'Liverpool',price:3.60}
    ]}]}]
  },
  {
    id:'mock_03', home_team:'Tottenham Hotspur',away_team:'Manchester United',
    commence_time: addHours(24),
    bookmakers:[{ title:'William Hill', markets:[{ key:'h2h', outcomes:[
      {name:'Tottenham Hotspur',price:2.40},{name:'Draw',price:3.20},{name:'Manchester United',price:3.10}
    ]}]}]
  },
  {
    id:'mock_04', home_team:'Aston Villa',      away_team:'Newcastle United',
    commence_time: addHours(26),
    bookmakers:[{ title:'Bet365', markets:[{ key:'h2h', outcomes:[
      {name:'Aston Villa',price:2.00},{name:'Draw',price:3.30},{name:'Newcastle United',price:3.80}
    ]}]}]
  },
  {
    id:'mock_05', home_team:'Brighton',         away_team:'Brentford',
    commence_time: addHours(48),
    bookmakers:[{ title:'Betfair', markets:[{ key:'h2h', outcomes:[
      {name:'Brighton',price:1.80},{name:'Draw',price:3.60},{name:'Brentford',price:4.80}
    ]}]}]
  },
  {
    id:'mock_06', home_team:'West Ham United',  away_team:'Crystal Palace',
    commence_time: addHours(50),
    bookmakers:[{ title:'William Hill', markets:[{ key:'h2h', outcomes:[
      {name:'West Ham United',price:2.20},{name:'Draw',price:3.20},{name:'Crystal Palace',price:3.40}
    ]}]}]
  },
  {
    id:'mock_07', home_team:'Fulham',           away_team:'Everton',
    commence_time: addHours(72),
    bookmakers:[{ title:'Betfair', markets:[{ key:'h2h', outcomes:[
      {name:'Fulham',price:2.05},{name:'Draw',price:3.30},{name:'Everton',price:3.70}
    ]}]}]
  },
  {
    id:'mock_08', home_team:'Nottingham Forest',away_team:'Bournemouth',
    commence_time: addHours(74),
    bookmakers:[{ title:'Bet365', markets:[{ key:'h2h', outcomes:[
      {name:'Nottingham Forest',price:2.50},{name:'Draw',price:3.10},{name:'Bournemouth',price:2.90}
    ]}]}]
  },
];

function addHours(h) {
  return new Date(Date.now() + h * 3600000).toISOString();
}

// ── STATE ──
let matches      = [];
let selectedMatch = null;
let betSlip      = []; // [{ matchId, matchLabel, selection, odds, bookmaker }]
let recentBets   = JSON.parse(localStorage.getItem(BETS_KEY) || '[]');
let apiKey       = localStorage.getItem(API_KEY_STORAGE) || '';
let usingLiveApi = false;

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  renderBalance();
  renderRecentBets();
  loadMatches();
  if (!apiKey) {
    document.getElementById('apiBanner').style.display = 'block';
  } else {
    document.getElementById('apiBanner').style.display = 'none';
  }
});

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
  const el = document.getElementById('sbBalance');
  if (el) el.textContent = '$' + getBalance().toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// ── LOAD MATCHES ──
async function loadMatches() {
  const btn = document.getElementById('refreshBtn');
  const status = document.getElementById('refreshStatus');
  if (btn) { btn.textContent = '↻ Loading…'; btn.disabled = true; }

  if (apiKey) {
    await loadLiveMatches();
  } else {
    loadDemoMatches();
  }

  if (btn) { btn.textContent = '↻ Refresh'; btn.disabled = false; }
}

async function loadLiveMatches() {
  const status = document.getElementById('refreshStatus');
  try {
    const url = `${ODDS_API_BASE}/sports/${EPL_SPORT}/odds/?apiKey=${apiKey}&regions=uk&markets=h2h&oddsFormat=decimal&dateFormat=iso`;
    const res = await fetch(url);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) {
        showToast('Invalid API key. Check your key and try again.', 'error');
        loadDemoMatches();
        return;
      }
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    const data = await res.json();

    // Show remaining quota from headers
    const remaining = res.headers.get('x-requests-remaining');
    const used      = res.headers.get('x-requests-used');
    if (status) status.textContent = remaining ? `Live API · ${remaining} requests remaining` : 'Live data from The Odds API';
    usingLiveApi = true;

    matches = data.length > 0 ? data : MOCK_MATCHES;
    renderMatchList(matches);
    showToast(`Loaded ${matches.length} live Premier League fixtures`, 'info');
  } catch (err) {
    console.error('Odds API error:', err);
    showToast('Could not reach The Odds API. Using demo data.', 'error');
    loadDemoMatches();
  }
}

function loadDemoMatches() {
  const status = document.getElementById('refreshStatus');
  if (status) status.textContent = 'Using demo data (no API key)';
  usingLiveApi = false;
  matches = MOCK_MATCHES;
  renderMatchList(matches);
}

// ── RENDER MATCH LIST ──
function renderMatchList(list) {
  const el = document.getElementById('matchesList');
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:20px;">No upcoming fixtures found.</p>';
    return;
  }

  el.innerHTML = list.map(m => {
    const odds = getBestOdds(m);
    const kickoff = formatKickoff(m.commence_time);
    const sel = selectedMatch && selectedMatch.id === m.id;
    const slipIds = betSlip.map(b => b.matchId + b.selection);

    return `
      <div class="match-item ${sel ? 'selected' : ''}" onclick="selectMatch('${m.id}')">
        <div class="mi-league">PREMIER LEAGUE • ${kickoff}</div>
        <div class="mi-teams">
          ${getTeamEmoji(m.home_team)} <span>${m.home_team}</span>
          <span class="mi-vs">vs</span>
          <span>${m.away_team}</span> ${getTeamEmoji(m.away_team)}
        </div>
        <div class="mi-odds">
          <div class="mi-odd-btn ${slipIds.includes(m.id+m.home_team)?'in-slip':''}" onclick="event.stopPropagation();quickAddBet('${m.id}','${m.home_team}',${odds.home},'${m.home_team} v ${m.away_team}')">
            <span class="mi-odd-label">1</span>
            <span class="mi-odd-val">${odds.home}</span>
          </div>
          <div class="mi-odd-btn ${slipIds.includes(m.id+'Draw')?'in-slip':''}" onclick="event.stopPropagation();quickAddBet('${m.id}','Draw',${odds.draw},'${m.home_team} v ${m.away_team}')">
            <span class="mi-odd-label">X</span>
            <span class="mi-odd-val">${odds.draw}</span>
          </div>
          <div class="mi-odd-btn ${slipIds.includes(m.id+m.away_team)?'in-slip':''}" onclick="event.stopPropagation();quickAddBet('${m.id}','${m.away_team}',${odds.away},'${m.home_team} v ${m.away_team}')">
            <span class="mi-odd-label">2</span>
            <span class="mi-odd-val">${odds.away}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── SELECT MATCH → SHOW DETAIL ──
function selectMatch(matchId) {
  const m = matches.find(x => x.id === matchId);
  if (!m) return;
  selectedMatch = m;

  document.querySelectorAll('.match-item').forEach(el => {
    el.classList.toggle('selected', el.getAttribute('onclick') === `selectMatch('${matchId}')`);
  });

  renderMatchDetail(m);
}

function renderMatchDetail(m) {
  const odds   = getBestOdds(m);
  const bkm    = m.bookmakers && m.bookmakers[0] ? m.bookmakers[0].title : 'Best Available';
  const kickoff = formatKickoff(m.commence_time);

  document.getElementById('matchPlaceholder').style.display = 'none';
  const det = document.getElementById('matchDetail');
  det.style.display = 'block';

  const slipIds = betSlip.map(b => b.matchId + b.selection);

  det.innerHTML = `
    <div class="md-header">
      <div class="md-league-tag">⚽ PREMIER LEAGUE</div>
      <div class="md-teams-row">
        <div class="md-team">
          <div class="md-team-badge" style="background:${(TEAM_COLOURS[m.home_team]||{bg:'#333'}).bg}22;border-color:${(TEAM_COLOURS[m.home_team]||{bg:'#333'}).bg}44">
            ${getTeamEmoji(m.home_team)}
          </div>
          <div class="md-team-name">${m.home_team}</div>
        </div>
        <div class="md-vs">VS</div>
        <div class="md-team">
          <div class="md-team-badge" style="background:${(TEAM_COLOURS[m.away_team]||{bg:'#333'}).bg}22;border-color:${(TEAM_COLOURS[m.away_team]||{bg:'#333'}).bg}44">
            ${getTeamEmoji(m.away_team)}
          </div>
          <div class="md-team-name">${m.away_team}</div>
        </div>
      </div>
      <div class="md-kickoff">🕐 ${kickoff} · ${bkm}</div>
    </div>

    <div class="md-markets-section">
      <div class="md-market-title">MATCH RESULT (1X2)</div>
      <div class="md-odds-grid">
        <div class="md-odd-btn ${slipIds.includes(m.id+m.home_team)?'in-slip':''}"
             onclick="addToBetSlip('${m.id}','${m.home_team}',${odds.home},'${m.home_team} v ${m.away_team}')">
          <span class="md-odd-label">${m.home_team} Win</span>
          <span class="md-odd-val">${odds.home}</span>
          <span class="md-odd-trend">${oddsLabel(parseFloat(odds.home))}</span>
        </div>
        <div class="md-odd-btn ${slipIds.includes(m.id+'Draw')?'in-slip':''}"
             onclick="addToBetSlip('${m.id}','Draw',${odds.draw},'${m.home_team} v ${m.away_team}')">
          <span class="md-odd-label">Draw</span>
          <span class="md-odd-val">${odds.draw}</span>
          <span class="md-odd-trend">${oddsLabel(parseFloat(odds.draw))}</span>
        </div>
        <div class="md-odd-btn ${slipIds.includes(m.id+m.away_team)?'in-slip':''}"
             onclick="addToBetSlip('${m.id}','${m.away_team}',${odds.away},'${m.home_team} v ${m.away_team}')">
          <span class="md-odd-label">${m.away_team} Win</span>
          <span class="md-odd-val">${odds.away}</span>
          <span class="md-odd-trend">${oddsLabel(parseFloat(odds.away))}</span>
        </div>
      </div>
    </div>
  `;
}

function oddsLabel(odds) {
  if (odds < 1.5)  return 'Heavy Favourite';
  if (odds < 2.0)  return 'Favourite';
  if (odds < 3.0)  return 'Slight Favourite';
  if (odds < 4.0)  return 'Even Chance';
  return 'Underdog';
}

// ── BET SLIP ──
function quickAddBet(matchId, selection, odds, label) {
  addToBetSlip(matchId, selection, odds, label);
}

function addToBetSlip(matchId, selection, odds, label) {
  const key = matchId + selection;
  const exists = betSlip.find(b => b.matchId + b.selection === key);

  if (exists) {
    // Toggle off
    betSlip = betSlip.filter(b => b.matchId + b.selection !== key);
    showToast('Removed from bet slip', 'info');
  } else {
    // Remove any other selection from same match
    betSlip = betSlip.filter(b => b.matchId !== matchId);
    betSlip.push({ matchId, selection, odds: parseFloat(odds), matchLabel: label });
    showToast(`Added: ${selection} @ ${odds}`, 'info');
  }

  renderBetSlip();
  // Re-render match detail to update button states
  if (selectedMatch) renderMatchDetail(selectedMatch);
  renderMatchList(matches);
}

function renderBetSlip() {
  const itemsEl  = document.getElementById('betSlipItems');
  const footerEl = document.getElementById('betSlipFooter');

  if (betSlip.length === 0) {
    itemsEl.innerHTML = `<div class="bs-empty"><span>🎯</span><p>Select odds to add bets to your slip</p></div>`;
    footerEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = betSlip.map((b, i) => `
    <div class="bs-item">
      <div class="bs-item-teams">${b.matchLabel}</div>
      <div class="bs-item-selection">${b.selection}</div>
      <div class="bs-item-odds">${b.odds.toFixed(2)}</div>
      <button class="bs-item-remove" onclick="removeBetSlipItem(${i})">✕</button>
    </div>
  `).join('');

  footerEl.style.display = 'block';
  updatePotential();
}

function removeBetSlipItem(i) {
  betSlip.splice(i, 1);
  renderBetSlip();
  if (selectedMatch) renderMatchDetail(selectedMatch);
  renderMatchList(matches);
}

function clearBetSlip() {
  betSlip = [];
  renderBetSlip();
  if (selectedMatch) renderMatchDetail(selectedMatch);
  renderMatchList(matches);
}

function updatePotential() {
  const stake = parseFloat(document.getElementById('totalStake').value) || 0;
  const combined = betSlip.reduce((acc, b) => acc * b.odds, 1);
  const potential = stake * combined;

  document.getElementById('combinedOdds').textContent = combined.toFixed(2);
  document.getElementById('potentialWin').textContent = '$' + potential.toFixed(2);
}

function placeBet() {
  if (betSlip.length === 0) { showToast('Add selections to your bet slip first', 'error'); return; }
  const stake = parseFloat(document.getElementById('totalStake').value);
  if (!stake || stake <= 0) { showToast('Enter a valid stake amount', 'error'); return; }
  const balance = getBalance();
  if (stake > balance) { showToast(`Insufficient balance. You have $${balance.toFixed(2)}`, 'error'); return; }

  const combined = betSlip.reduce((acc, b) => acc * b.odds, 1);
  const potential = stake * combined;

  // Deduct stake
  setBalance(balance - stake);

  // Save bet record
  const bet = {
    id: Date.now(),
    selections: betSlip.map(b => ({ match: b.matchLabel, selection: b.selection, odds: b.odds })),
    stake,
    combinedOdds: combined,
    potentialReturn: potential,
    status: 'open',
    placedAt: new Date().toLocaleString(),
  };
  recentBets.unshift(bet);
  if (recentBets.length > 20) recentBets.pop();
  localStorage.setItem(BETS_KEY, JSON.stringify(recentBets));

  // Simulate result after 4s (demo only)
  setTimeout(() => simulateResult(bet.id), 4000);

  showToast(`✅ Bet placed! $${stake.toFixed(2)} on ${betSlip.length} selection${betSlip.length>1?'s':''}`, 'win');
  clearBetSlip();
  renderRecentBets();
}

function simulateResult(betId) {
  const bet = recentBets.find(b => b.id === betId);
  if (!bet) return;

  // 40% win chance for demo
  const won = Math.random() < 0.4;
  bet.status = won ? 'won' : 'lost';
  if (won) {
    setBalance(getBalance() + bet.potentialReturn);
    showToast(`🎉 You WON $${bet.potentialReturn.toFixed(2)}!`, 'win');
  } else {
    showToast(`Your bet lost. Better luck next time!`, 'error');
  }
  localStorage.setItem(BETS_KEY, JSON.stringify(recentBets));
  renderRecentBets();
}

function renderRecentBets() {
  const el = document.getElementById('recentBetsList');
  if (!el) return;
  if (recentBets.length === 0) {
    el.innerHTML = '<p class="no-bets">No bets placed yet. Start betting above!</p>';
    return;
  }
  el.innerHTML = recentBets.slice(0, 10).map(b => {
    const sel = b.selections.map(s => `${s.match}: <strong>${s.selection}</strong> @ ${s.odds}`).join('<br/>');
    const statusClass = b.status === 'won' ? 'won' : b.status === 'lost' ? 'lost' : 'open';
    const returnLabel = b.status === 'won'
      ? `+$${b.potentialReturn.toFixed(2)}`
      : b.status === 'lost'
        ? `-$${b.stake.toFixed(2)}`
        : `~$${b.potentialReturn.toFixed(2)}`;
    return `
      <div class="rbet-card">
        <div class="rbet-info">
          <div class="rbet-match">${b.selections.length > 1 ? 'Accumulator ('+b.selections.length+' bets)' : b.selections[0].match}</div>
          <div class="rbet-sel">${sel}</div>
          <div class="rbet-sel" style="color:var(--text-dim);font-size:0.75rem;margin-top:4px">${b.placedAt}</div>
        </div>
        <div class="rbet-meta">
          <div class="rbet-stake">Stake: $${b.stake.toFixed(2)}</div>
          <div class="rbet-return ${statusClass}">${returnLabel}</div>
          <div style="font-size:0.72rem;color:var(--text-dim);margin-top:3px">${b.status.toUpperCase()}</div>
        </div>
      </div>`;
  }).join('');
}

// ── API CONFIG ──
function openApiConfig() {
  const input = document.getElementById('apiKeyInput');
  if (input) input.value = apiKey || '';
  document.getElementById('apiModal').classList.add('open');
  updateApiKeyStatus();
}
function closeApiConfig() {
  document.getElementById('apiModal').classList.remove('open');
}
function handleApiOverlayClick(e) {
  if (e.target === document.getElementById('apiModal')) closeApiConfig();
}
function saveApiKey() {
  const val = document.getElementById('apiKeyInput').value.trim();
  if (!val) { showApiStatus('Enter an API key first', false); return; }
  apiKey = val;
  localStorage.setItem(API_KEY_STORAGE, apiKey);
  document.getElementById('apiBanner').style.display = 'none';
  showApiStatus('API key saved! Loading live data…', true);
  setTimeout(() => {
    closeApiConfig();
    loadMatches();
  }, 1200);
}
function clearApiKey() {
  apiKey = '';
  localStorage.removeItem(API_KEY_STORAGE);
  document.getElementById('apiBanner').style.display = 'block';
  closeApiConfig();
  loadDemoMatches();
  showToast('API key removed. Using demo data.', 'info');
}
function closeBanner() {
  document.getElementById('apiBanner').style.display = 'none';
}
function showApiStatus(msg, ok) {
  const el = document.getElementById('apiKeyStatus');
  if (el) { el.textContent = msg; el.className = 'api-key-status ' + (ok ? 'ok' : 'err'); }
}
function updateApiKeyStatus() {
  if (apiKey) {
    showApiStatus('✓ API key configured — using live data', true);
  } else {
    showApiStatus('No API key — using demo data', false);
  }
}

// ── HELPERS ──
function getBestOdds(match) {
  const def = { home:'N/A', draw:'N/A', away:'N/A' };
  if (!match.bookmakers || match.bookmakers.length === 0) return def;
  const bkm = match.bookmakers[0];
  const h2h = bkm.markets.find(m => m.key === 'h2h');
  if (!h2h) return def;
  const outcomes = h2h.outcomes;
  const find = (name) => {
    const o = outcomes.find(x => x.name === name);
    return o ? o.price.toFixed(2) : 'N/A';
  };
  return {
    home: find(match.home_team),
    draw: find('Draw'),
    away: find(match.away_team),
  };
}

function formatKickoff(iso) {
  if (!iso) return 'TBC';
  const d = new Date(iso);
  const now = new Date();
  const diff = d - now;
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (diff < 0) return 'Today';
  if (hours < 1) return 'Starting soon';
  if (hours < 24) return `Today ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
  if (days < 2)  return `Tomorrow ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
  return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}) + ' ' + d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}

// ── TOAST ──
function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(8px)'; t.style.transition='0.3s'; }, 2800);
  setTimeout(() => t.remove(), 3200);
}
