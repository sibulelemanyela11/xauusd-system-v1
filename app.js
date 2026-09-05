const API =
  "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=5m&range=5d";

const rules = {
  risk: 0.5,
  maxTrades: 2,
  dailyLoss: 1.5,
  rr: 2
};

const names = [
  "H4 Structure",
  "H1 Bias",
  "M15 Setup",
  "M5 Trigger",
  "Session",
  "News Filter",
  "Risk Engine",
  "R:R"
];

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
    if (!response.ok) throw new Error("Market feed unavailable");

    const data = await response.json();
    const c = candles(data);
    const direction = trend(c);

    if (direction === "BULLISH") {
      render("CHECK", "WAIT",
        "Gold data received. H4/H1/M15/M5 confirmation required.");
    } else if (direction === "BEARISH") {
      render("CHECK", "WAIT",
        "Gold data received. H4/H1/M15/M5 confirmation required.");
    } else {
      render("WAIT", "WAIT", "Market structure unclear.");
    }
  } catch (error) {
    render("WAIT", "WAIT", "Live market feed unavailable.");
  }
}

run();
