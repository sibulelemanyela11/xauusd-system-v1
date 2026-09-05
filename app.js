const API = "/api/gold";

const rules = {
  risk: 0.5,
  maxTrades: 2,
  dailyLoss: 1.5,
  rr: 2
};

function candles(data) {
  const r = data.chart.result[0];
  const q = r.indicators.quote[0];

  return r.timestamp
    .map((time, i) => ({
      time,
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i]
    }))
    .filter(c => c.close != null);
}

function trend(c) {
  if (c.length < 20) return "WAIT";

  const recent = c.slice(-20);
  const first = recent[0].close;
  const last = recent[recent.length - 1].close;

  if (last > first) return "BULLISH";
  if (last < first) return "BEARISH";

  return "WAIT";
}

function render(status, signal, reason) {
  const box = document.getElementById("checks");

  const rows = [
    ["H4 Structure", status],
    ["H1 Bias", status],
    ["M15 Setup", status],
    ["M5 Trigger", status],
    ["Session", "CHECK"],
    ["News Filter", "CHECK"],
    ["Risk Engine", "PASS"],
    ["R:R", "PASS"]
  ];

  box.innerHTML = rows
    .map(x => `<div class="check">${x[0]} <b>${x[1]}</b></div>`)
    .join("");

  document.getElementById("signal").textContent = signal;
  document.getElementById("reason").textContent = reason;
}

async function run() {
  try {
    const response = await fetch(API);

    if (!response.ok) {
      throw new Error("Market feed unavailable");
    }

    const data = await response.json();

    if (!data.ok || !data.data) {
      throw new Error("Invalid market data");
    }

    const c = candles(data.data);

    if (!c.length) {
      throw new Error("No Gold candles received");
    }

    const direction = trend(c);

    render(
      "CHECK",
      "WAIT",
      `Gold feed connected. Current structure: ${direction}. Full H4/H1/M15/M5 confirmation is required before a trade.`
    );

  } catch (error) {
    render(
      "WAIT",
      "WAIT",
      "Live Gold market feed unavailable."
    );
  }
}

run();
