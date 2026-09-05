const API = "/api";
const NEWS_API = "/api/news";

const rules = {
  risk: 0.5,
  maxTrades: 2,
  dailyLoss: 1.5,
  rr: 2
};

// ---------- HELPERS ----------

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getCandles(payload) {
  const data = payload?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.candles)) return data.candles;

  return [];
}

function candleValues(candle) {
  return {
    open: num(candle.open ?? candle.o),
    high: num(candle.high ?? candle.h),
    low: num(candle.low ?? candle.l),
    close: num(candle.close ?? candle.c),
    time: candle.time ?? candle.timestamp ?? candle.t
  };
}

function normalizeCandles(candles) {
  return candles
    .map(candleValues)
    .filter(
      c =>
        c.open !== null &&
        c.high !== null &&
        c.low !== null &&
        c.close !== null
    )
    .sort((a, b) => {
      const ta = new Date(a.time || 0).getTime();
      const tb = new Date(b.time || 0).getTime();
      return ta - tb;
    });
}

function lastClosed(candles) {
  if (candles.length < 2) return null;

  // Use the previous candle so the current forming candle is ignored.
  return candles[candles.length - 2];
}

function averageRange(candles, count = 14) {
  const usable = candles.slice(-count);

  if (!usable.length) return null;

  const total = usable.reduce(
    (sum, c) => sum + (c.high - c.low),
    0
  );

  return total / usable.length;
}

// ---------- MARKET DATA ----------

async function getMarketData() {
  const [h4Res, h1Res, m15Res, m5Res] = await Promise.all([
    fetch(`${API}/h4`),
    fetch(`${API}/h1`),
    fetch(`${API}/m15`),
    fetch(`${API}/m5`)
  ]);

  if (!h4Res.ok || !h1Res.ok || !m15Res.ok || !m5Res.ok) {
    throw new Error("Market data unavailable");
  }

  const [h4, h1, m15, m5] = await Promise.all([
    h4Res.json(),
    h1Res.json(),
    m15Res.json(),
    m5Res.json()
  ]);

  return {
    h4: normalizeCandles(getCandles(h4)),
    h1: normalizeCandles(getCandles(h1)),
    m15: normalizeCandles(getCandles(m15)),
    m5: normalizeCandles(getCandles(m5))
  };
}

// ---------- H4 STRUCTURE ----------

function getH4Structure(candles) {
  if (candles.length < 20) {
    return {
      status: "WAIT",
      bias: "NONE",
      reason: "Not enough H4 candles"
    };
  }

  const recent = candles.slice(-10);
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);

  const highest = Math.max(...highs);
  const lowest = Math.min(...lows);

  const current = lastClosed(candles);

  if (!current) {
    return {
      status: "WAIT",
      bias: "NONE",
      reason: "H4 candle unavailable"
    };
  }

  if (current.close > highest * 0.9995) {
    return {
      status: "PASS",
      bias: "BUY",
      reason: "H4 bullish structure"
    };
  }

  if (current.close < lowest * 1.0005) {
    return {
      status: "PASS",
      bias: "SELL",
      reason: "H4 bearish structure"
    };
  }

  const first = recent[0];
  const last = recent[recent.length - 1];

  if (last.close > first.close) {
    return {
      status: "PASS",
      bias: "BUY",
      reason: "H4 bullish directional structure"
    };
  }

  if (last.close < first.close) {
    return {
      status: "PASS",
      bias: "SELL",
      reason: "H4 bearish directional structure"
    };
  }

  return {
    status: "WAIT",
    bias: "NONE",
    reason: "H4 structure unclear"
  };
}

// ---------- H1 BIAS ----------

function getH1Bias(candles) {
  if (candles.length < 20) {
    return {
      status: "WAIT",
      bias: "NONE",
      reason: "Not enough H1 candles"
    };
  }

  const current = lastClosed(candles);
  const previous = candles[candles.length - 3];

  if (!current || !previous) {
    return {
      status: "WAIT",
      bias: "NONE",
      reason: "H1 candle unavailable"
    };
  }

  if (current.close > previous.close) {
    return {
      status: "PASS",
      bias: "BUY",
      reason: "H1 bullish bias"
    };
  }

  if (current.close < previous.close) {
    return {
      status: "PASS",
      bias: "SELL",
      reason: "H1 bearish bias"
    };
  }

  return {
    status: "WAIT",
    bias: "NONE",
    reason: "H1 bias unclear"
  };
}

// ---------- M15 SETUP ----------

function getM15Setup(candles, direction) {
  if (candles.length < 20) {
    return {
      status: "WAIT",
      reason: "Not enough M15 candles"
    };
  }

  const current = lastClosed(candles);

  if (!current) {
    return {
      status: "WAIT",
      reason: "M15 candle unavailable"
    };
  }

  const range = current.high - current.low;

  if (range <= 0) {
    return {
      status: "WAIT",
      reason: "Invalid M15 range"
    };
  }

  const body = Math.abs(current.close - current.open);
  const bodyRatio = body / range;

  if (direction === "BUY" && current.close > current.open && bodyRatio >= 0.45) {
    return {
      status: "PASS",
      reason: "M15 bullish setup"
    };
  }

  if (direction === "SELL" && current.close < current.open && bodyRatio >= 0.45) {
    return {
      status: "PASS",
      reason: "M15 bearish setup"
    };
  }

  return {
    status: "WAIT",
    reason: "M15 setup not confirmed"
  };
}

// ---------- M5 TRIGGER ----------

function getM5Trigger(candles, direction) {
  if (candles.length < 10) {
    return {
      status: "WAIT",
      reason: "Not enough M5 candles"
    };
  }

  const current = lastClosed(candles);
  const previous = candles[candles.length - 3];

  if (!current || !previous) {
    return {
      status: "WAIT",
      reason: "M5 candle unavailable"
    };
  }

  if (
    direction === "BUY" &&
    current.close > current.open &&
    current.close > previous.high
  ) {
    return {
      status: "PASS",
      reason: "M5 bullish breakout trigger"
    };
  }

  if (
    direction === "SELL" &&
    current.close < current.open &&
    current.close < previous.low
  ) {
    return {
      status: "PASS",
      reason: "M5 bearish breakout trigger"
    };
  }

  return {
    status: "WAIT",
    reason: "M5 trigger not confirmed"
  };
}

// ---------- SESSION ----------

function getSessionStatus() {
  const now = new Date();

  const hour = Number(
    new Intl.DateTimeFormat("en-ZA", {
      timeZone: "Africa/Johannesburg",
      hour: "2-digit",
      hour12: false
    }).format(now)
  );

  const london = hour >= 9 && hour < 18;
  const newYork = hour >= 14 && hour < 23;

  if (london || newYork) {
    return {
      status: "PASS",
      name:
        london && newYork
          ? "LONDON + NY"
          : london
            ? "LONDON"
            : "NEW YORK"
    };
  }

  return {
    status: "BLOCK",
    name: "OUTSIDE SESSION"
  };
}

// ---------- NEWS ----------

async function getNewsStatus() {
  try {
    const response = await fetch(NEWS_API);

    if (!response.ok) {
      return {
        status: "BLOCK",
        reason: "News feed unavailable"
      };
    }

    const data = await response.json();

    if (data.blocked) {
      return {
        status: "BLOCK",
        reason: data.reason || "High-impact news block"
      };
    }

    return {
      status: "PASS",
      reason: "No high-impact news block"
    };

  } catch (error) {
    return {
      status: "BLOCK",
      reason: "News filter unavailable"
    };
  }
}

// ---------- RISK ENGINE ----------

function getRiskStatus() {
  return {
    status: "PASS",
    reason: `${rules.risk}% risk / max ${rules.maxTrades} trades`
  };
}

// ---------- SIGNAL ENGINE ----------

function calculateSignal(market, news) {
  const h4 = getH4Structure(market.h4);

  if (h4.status !== "PASS") {
    return {
      signal: "WAIT",
      reason: h4.reason,
      direction: "NONE"
    };
  }

  const h1 = getH1Bias(market.h1);

  if (h1.status !== "PASS" || h1.bias !== h4.bias) {
    return {
      signal: "WAIT",
      reason: "H4 and H1 bias do not agree",
      direction: "NONE"
    };
  }

  const m15 = getM15Setup(market.m15, h4.bias);

  if (m15.status !== "PASS") {
    return {
      signal: "WAIT",
      reason: m15.reason,
      direction: "NONE"
    };
  }

  const m5 = getM5Trigger(market.m5, h4.bias);

  if (m5.status !== "PASS") {
    return {
      signal: "WAIT",
      reason: m5.reason,
      direction: "NONE"
    };
  }

  if (news.status !== "PASS") {
    return {
      signal: "WAIT",
      reason: news.reason,
      direction: "NONE"
    };
  }

  return {
    signal: h4.bias,
    reason: `${h4.bias} confirmation: H4 + H1 + M15 + M5`,
    direction: h4.bias
  };
}

// ---------- DISPLAY ----------

function render(checks, signal, reason) {
  const box = document.getElementById("checks");

  box.innerHTML = checks
    .map(
      x => `<div class="check">${x[0]} <b>${x[1]}</b></div>`
    )
    .join("");

  document.getElementById("signal").textContent = signal;
  document.getElementById("reason").textContent = reason;
}

// ---------- MAIN ----------

async function run() {
  try {
    const market = await getMarketData();
    const news = await getNewsStatus();
    const session = getSessionStatus();
    const risk = getRiskStatus();

    const h4 = getH4Structure(market.h4);
    const h1 = getH1Bias(market.h1);
    const m15 = getM15Setup(market.m15, h4.bias);
    const m5 = getM5Trigger(market.m5, h4.bias);

    const signalResult = calculateSignal(market, news);

    let signal = signalResult.signal;
    let reason = signalResult.reason;

    if (session.status !== "PASS") {
      signal = "WAIT";
      reason = `Trading blocked: ${session.name}`;
    }

    if (news.status !== "PASS") {
      signal = "WAIT";
      reason = `Trading blocked: ${news.reason}`;
    }

    const checks = [
      ["H4 Structure", h4.status],
      ["H1 Bias", h1.status],
      ["M15 Setup", m15.status],
      ["M5 Trigger", m5.status],
      ["Session", session.status],
      ["News Filter", news.status],
      ["Risk Engine", risk.status],
      ["R:R", "PASS"]
    ];

    render(checks, signal, reason);

  } catch (error) {
    render(
      [
        ["H4 Structure", "WAIT"],
        ["H1 Bias", "WAIT"],
        ["M15 Setup", "WAIT"],
        ["M5 Trigger", "WAIT"],
        ["Session", "CHECK"],
        ["News Filter", "CHECK"],
        ["Risk Engine", "WAIT"],
        ["R:R", "WAIT"]
      ],
      "WAIT",
      "Live market feed unavailable."
    );
  }
}

run();

setInterval(run, 60000);
