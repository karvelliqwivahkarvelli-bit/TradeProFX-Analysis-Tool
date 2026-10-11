const APP_ID = 63379;
const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const marketProfiles = {
  volatility10: { label: 'Volatility Index 10', weights: [0.17, 0.14, 0.12, 0.1, 0.11, 0.08, 0.08, 0.09, 0.06, 0.05] },
  volatility25: { label: 'Volatility Index 25', weights: [0.14, 0.15, 0.13, 0.11, 0.09, 0.09, 0.08, 0.08, 0.07, 0.06] },
  volatility50: { label: 'Volatility Index 50', weights: [0.12, 0.11, 0.14, 0.13, 0.12, 0.1, 0.09, 0.08, 0.06, 0.05] },
  volatility75: { label: 'Volatility Index 75', weights: [0.1, 0.12, 0.14, 0.12, 0.13, 0.1, 0.1, 0.09, 0.06, 0.04] },
  volatility100: { label: 'Volatility Index 100', weights: [0.09, 0.11, 0.13, 0.13, 0.14, 0.11, 0.1, 0.09, 0.06, 0.04] }
};

const state = {
  market: 'volatility10',
  tickCount: 30,
  history: [],
  liveDigit: 0,
  intervalId: null,
  lastRealtimeUpdate: null
};

const marketSelect = document.getElementById('marketSelect');
const tickCountSelect = document.getElementById('tickCountSelect');
const digitWheel = document.getElementById('digitWheel');
const currentDigitDisplay = document.getElementById('currentDigitDisplay');
const digitProbabilityGrid = document.getElementById('digitProbabilityGrid');
const tickHistoryList = document.getElementById('tickHistoryList');
const activeMarketLabel = document.getElementById('activeMarketLabel');
const mostFrequentDigit = document.getElementById('mostFrequentDigit');
const leastLikelyDigit = document.getElementById('leastLikelyDigit');
const probabilityRate = document.getElementById('probabilityRate');
const predictionSummary = document.getElementById('predictionSummary');
const fetchDataBtn = document.getElementById('fetchDataBtn');

function weightedRandomDigit(weights) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  let threshold = Math.random() * total;

  for (let i = 0; i < weights.length; i += 1) {
    threshold -= weights[i];
    if (threshold <= 0) return digits[i];
  }

  return digits[digits.length - 1];
}

function getMarketProfile() {
  return marketProfiles[state.market];
}

function seedHistory() {
  const count = state.tickCount;
  const weights = getMarketProfile().weights;
  state.history = Array.from({ length: count }, () => weightedRandomDigit(weights));
  state.liveDigit = state.history[state.history.length - 1];
}

function addNewTick() {
  const weights = getMarketProfile().weights;
  const nextDigit = weightedRandomDigit(weights);
  state.history.push(nextDigit);
  if (state.history.length > state.tickCount) {
    state.history.shift();
  }
  state.liveDigit = nextDigit;
  render();
}

function updateMarketLabel() {
  activeMarketLabel.textContent = getMarketProfile().label;
}

function renderDigitWheel() {
  const radius = 118;
  digitWheel.innerHTML = '';

  digits.forEach((digit, index) => {
    const angle = (index / digits.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const item = document.createElement('div');
    item.className = 'digit-item';
    item.style.transform = `translate(${x}px, ${y}px)`;
    item.textContent = digit;

    if (digit === state.liveDigit) {
      item.classList.add('active');
    }

    const mostTouched = getMostFrequentDigit();
    if (digit === mostTouched && digit !== state.liveDigit) {
      item.classList.add('high-frequency');
    }

    digitWheel.appendChild(item);
  });
}

function getDigitFrequencyMap() {
  const map = {};
  digits.forEach((digit) => {
    map[digit] = state.history.filter((value) => value === digit).length;
  });
  return map;
}

function getMostFrequentDigit() {
  const freqMap = getDigitFrequencyMap();
  const entries = Object.entries(freqMap);
  if (!entries.length) return 0;
  const [digit] = entries.reduce((best, current) => (current[1] > best[1] ? current : best), entries[0]);
  return Number(digit);
}

function getLeastLikelyDigit() {
  const freqMap = getDigitFrequencyMap();
  const entries = Object.entries(freqMap);
  if (!entries.length) return 0;
  const [digit] = entries.reduce((best, current) => (current[1] < best[1] ? current : best), entries[0]);
  return Number(digit);
}

function renderProbabilityGrid() {
  const counts = getDigitFrequencyMap();
  const total = state.history.length || 1;
  const most = getMostFrequentDigit();
  const least = getLeastLikelyDigit();

  const sortedDigits = digits.map((digit) => ({
    digit,
    count: counts[digit],
    percentage: (counts[digit] / total) * 100
  }));

  digitProbabilityGrid.innerHTML = '';

  sortedDigits.forEach(({ digit, count, percentage }) => {
    const card = document.createElement('div');
    card.className = 'digit-card';

    if (digit === state.liveDigit) {
      card.classList.add('active-red');
    }

    if (digit === most) {
      card.classList.add('green-hot');
    }

    const fillWidth = Math.max(7, percentage);

    card.innerHTML = `
      <div class="digit-header">
        <span class="digit-label">${digit}</span>
        <span class="digit-prob">${count}</span>
      </div>
      <div class="bar-shell">
        <div class="bar-fill" style="width: ${fillWidth}%"></div>
      </div>
      <div class="digit-prob">${percentage.toFixed(1)}% probability</div>
    `;

    digitProbabilityGrid.appendChild(card);
  });

  const topPercent = (counts[most] / total) * 100;
  mostFrequentDigit.textContent = `${most}`;
  leastLikelyDigit.textContent = `${least}`;
  probabilityRate.textContent = `${topPercent.toFixed(1)}%`;

  predictionSummary.innerHTML = `
    <div class="summary-badge">${least}</div>
    <div class="summary-text">
      The market digit signal suggests <strong>${least}</strong> is the least likely number to appear next in the <strong>${getMarketProfile().label}</strong> flow.
      Meanwhile, <strong>${most}</strong> is the dominant number, currently showing the strongest frequency in the live tick window.
    </div>
  `;
};

function renderHistory() {
  const freqMap = getDigitFrequencyMap();
  const most = getMostFrequentDigit();
  const current = state.liveDigit;

  tickHistoryList.innerHTML = '';

  state.history.forEach((digit, index) => {
    const item = document.createElement('div');
    item.className = 'tick-item';

    if (index === state.history.length - 1) {
      item.classList.add('current-red');
    }

    if (digit === most && digit !== current) {
      item.classList.add('most-green');
    }

    item.title = `Tick ${index + 1}: ${digit}`;
    item.textContent = digit;
    tickHistoryList.appendChild(item);
  });

  if (state.history.length === 0) {
    tickHistoryList.innerHTML = '<div class="tick-item">—</div>';
  }
}

function render() {
  updateMarketLabel();
  renderDigitWheel();
  renderProbabilityGrid();
  renderHistory();
  currentDigitDisplay.textContent = state.liveDigit;
}

async function fetchMarketData() {
  const profile = getMarketProfile();
  const endpoint = `https://api.marketdata.example.com/v1/last-digit?app_id=${APP_ID}&market=${state.market}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Real feed unavailable (${response.status})`);
    }

    const data = await response.json();
    const digitsFromFeed = Array.isArray(data?.digits) ? data.digits : [];

    if (digitsFromFeed.length === 0) {
      throw new Error('No real tick digits returned');
    }

    state.history = digitsFromFeed.slice(-state.tickCount);
    state.liveDigit = Number(digitsFromFeed[digitsFromFeed.length - 1]);

    render();
    fetchDataBtn.textContent = 'Real data connected';
  } catch (error) {
    const fallbackDigit = weightedRandomDigit(profile.weights);
    state.history = Array.from({ length: state.tickCount }, () => weightedRandomDigit(profile.weights));
    state.history[state.history.length - 1] = fallbackDigit;
    state.liveDigit = fallbackDigit;
    render();
    fetchDataBtn.textContent = 'Fallback mode active';
  }
}

function applyTickSelection() {
  state.tickCount = Number(tickCountSelect.value);
  seedHistory();
  render();
}

function applyMarketSelection() {
  state.market = marketSelect.value;
  seedHistory();
  render();
}

marketSelect.addEventListener('change', applyMarketSelection);
tickCountSelect.addEventListener('change', applyTickSelection);
fetchDataBtn.addEventListener('click', fetchMarketData);

function startMarketSimulation() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }

  state.intervalId = setInterval(() => {
    addNewTick();
  }, 1350);
}

seedHistory();
render();
startMarketSimulation();
