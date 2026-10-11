const APP_ID = 63379;
const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const marketProfiles = {
  volatility10: { label: 'Volatility Index 10', stream: 'R_10' },
  volatility25: { label: 'Volatility Index 25', stream: 'R_25' },
  volatility50: { label: 'Volatility Index 50', stream: 'R_50' },
  volatility75: { label: 'Volatility Index 75', stream: 'R_75' },
  volatility100: { label: 'Volatility Index 100', stream: 'R_100' }
};

const state = {
  market: 'volatility50',
  tickCount: 50,
  history: [],
  liveDigit: 0,
  wsConnection: null,
  isLiveConnected: false
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

function extractLastDigit(price) {
  if (price === null || price === undefined || price === '') return 0;
  const cleaned = String(price).replace(/[^0-9.]/g, '');
  const lastChar = cleaned[cleaned.length - 1];
  return Number(lastChar) || 0;
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

function updateMarketLabel() {
  activeMarketLabel.textContent = marketProfiles[state.market].label;
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
      The market digit signal suggests <strong>${least}</strong> is the least likely number to appear next in the <strong>${marketProfiles[state.market].label}</strong> live tick flow.
      Meanwhile, <strong>${most}</strong> is the dominant number, currently showing the strongest frequency in the live tick window.
    </div>
  `;
}

function renderHistory() {
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

function seedHistoryFromArray(values) {
  state.history = values.slice(-state.tickCount);
  if (state.history.length === 0) {
    state.history = Array.from({ length: state.tickCount }, () => 0);
  }
  state.liveDigit = Number(state.history[state.history.length - 1]) || 0;
  render();
}

async function fetchHistoricalTicks() {
  const payload = {
    ticks_history: marketProfiles[state.market].stream,
    adjust_start_time: 1,
    count: state.tickCount,
    end: 'latest',
    start: 1,
    style: 'ticks'
  };

  try {
    const response = await fetch('https://ws.derivws.com/websockets/v3?app_id=63379', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const history = Array.isArray(data?.ticks_history) ? data.ticks_history : [];

    if (history.length > 0) {
      const digitsList = history.map((tick) => {
        const quote = tick.quote ?? tick.close ?? tick.price ?? 0;
        return extractLastDigit(quote);
      });

      seedHistoryFromArray(digitsList);
      fetchDataBtn.textContent = 'Historical data loaded';
      return true;
    }
  } catch (error) {
    console.error('Historical tick fetch failed:', error);
    fetchDataBtn.textContent = 'Fallback mode';
  }

  return false;
}

function connectWebSocket() {
  if (state.wsConnection && state.wsConnection.readyState === WebSocket.OPEN) {
    return;
  }

  try {
    state.wsConnection = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=63379');

    state.wsConnection.onopen = () => {
      state.isLiveConnected = true;
      fetchDataBtn.textContent = 'Live stream active';
      state.wsConnection.send(JSON.stringify({
        ticks: marketProfiles[state.market].stream,
        subscribe: 1
      }));
    };

    state.wsConnection.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.tick) {
          const quote = payload.tick.quote ?? payload.tick.close ?? payload.tick.price ?? 0;
          const digit = extractLastDigit(quote);
          state.history.push(digit);
          if (state.history.length > state.tickCount) {
            state.history.shift();
          }
          state.liveDigit = digit;
          render();
        }
      } catch (error) {
        console.error('WS message parse error:', error);
      }
    };

    state.wsConnection.onerror = () => {
      fetchDataBtn.textContent = 'WebSocket error';
    };

    state.wsConnection.onclose = () => {
      state.isLiveConnected = false;
      fetchDataBtn.textContent = 'Stream closed';
    };
  } catch (error) {
    console.error('WebSocket connection failed:', error);
  }
}

function onMarketChange() {
  state.market = marketSelect.value;
  if (state.wsConnection) {
    state.wsConnection.close();
    state.wsConnection = null;
  }
  fetchHistoricalTicks().then(() => connectWebSocket());
}

function onTickCountChange() {
  state.tickCount = Number(tickCountSelect.value);
  if (state.history.length > state.tickCount) {
    state.history = state.history.slice(-state.tickCount);
  }
  render();
}

fetchDataBtn.addEventListener('click', async () => {
  fetchDataBtn.textContent = 'Loading...';
  const ok = await fetchHistoricalTicks();
  if (ok) {
    connectWebSocket();
  }
});

marketSelect.addEventListener('change', onMarketChange);
tickCountSelect.addEventListener('change', onTickCountChange);

window.addEventListener('load', async () => {
  render();
  await fetchHistoricalTicks();
  connectWebSocket();
});
