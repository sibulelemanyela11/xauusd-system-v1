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
  if (Array.isArray(data?.bars)) return data.bars;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.candles)) return data.candles;

  return [];
}

function normalizeCandles(candles) {
  return candles
    .map(c => ({
      open: num(c.open ?? c.o),
      high: num(c.high ?? c.h),
      low: num(c.low ?? c.l),
      close: num(c.close ?? c.c),
      time: c.openTime ?? c.time ?? c.timestamp ?? c.t,
      isOpen: c.isOpen
    }))
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

function getClosedCandles(candles) {
  return candles.filter(c => c.isOpen !== true);
}

function lastClosed(candles) {
  const closed = getClosedCandles(candles);

  if (closed.length) {
    return closed[closed.length - 1];
  }

  if (candles.length > 1) {
    return candles[candles.length - 2];
  }

  return candles[0] || null;
}

function previousClosed(candles) {
  const closed = getClosedCandles(candles);

  if (closed.length >= 2) {
    return closed[closed.length - 2];
  }

  return null;
}

// ---------- DAILY RISK STATE ----------

function getTodayKey() {
  const now = new Date();

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg"
  }).format(now);
}

function getRiskState() {
  const today = getTodayKey();

  try {
    const saved = JSON.parse(
      localStorage.getItem("xauusdRiskState") || "null"
    );

    if (!saved || saved.date !== today) {
      return {
        date: today,
        trades: 0,
        losses: 0,
        dailyLossPercent: 0
      };
    }

    return saved;
  } catch {
    return {
      date: today,
      trades: 0,
      losses: 0,
      dailyLossPercent: 0
    };
  }
}

function saveRiskState(state) {
  localStorage.setItem(
    "xauusdRiskState",
    JSON.stringify(state)
  );
}

function getRiskStatus(quoteStatus) {
  if (!quoteStatus || quoteStatus.status !== "PASS") {
    return {
      status: "BLOCK",
      reason:
        quoteStatus?.reason ||
        "Quote filter blocked"
    };
  }

  const state = getRiskState();

  if (state.trades >= rules.maxTrades) {
    return {
      status: "BLOCK",
      reason: "Maximum 2 trades reached today"
    };
  }

  if (state.dailyLossPercent >= rules.dailyLoss) {
    return {
      status: "BLOCK",
      reason: "Daily loss limit reached"
    };
  }

  if (state.losses >= 2) {
    return {
      status: "BLOCK",
      reason: "Two losses reached — trading stopped"
    };
  }

  return {
    status: "PASS",
    reason:
      `${rules.risk}% risk / ${state.trades}/${rules.maxTrades} trades`
  };
}

// ---------- MARKET DATA ----------

async function getMarketData() {
  const responses = await Promise.all([
    fetch(`${API}/h4`),
    fetch(`${API}/h1`),
    fetch(`${API}/m15`),
    fetch(`${API}/m5`)
  ]);

  if (responses.some(response => !response.ok)) {
    throw new Error("Market data unavailable");
  }

  const data = await Promise.all(
    responses.map(response => response.json())
  );

  return {
    h4: normalizeCandles(getCandles(data[0])),
    h1: normalizeCandles(getCandles(data[1])),
    m15: normalizeCandles(getCandles(data[2])),
    m5: normalizeCandles(getCandles(data[3]))
  };
}

// ---------- H4 STRUCTURE ----------

function getH4Structure(candles) {
  if (candles.length < 3) {
    return {
      status: "WAIT",
      bias: "NONE",
      reason: "H4 data insufficient"
    };
  }

  const current = lastClosed(candles);
  const previous = previousClosed(candles);

  if (!current || !previous) {
    return {
      status: "WAIT",
      bias: "NONE",
      reason: "H4 candle unavailable"
    };
  }

  if (
    current.close > previous.close &&
    current.high >= previous.high
  ) {
    return {
      status: "PASS",
      bias: "BUY",
      reason: "H4 bullish structure"
    };
  }

  if (
    current.close < previous.close &&
    current.low <= previous.low
  ) {
    return {
      status: "PASS",
      bias: "SELL",
      reason: "H4 bearish structure"
    };
  }

  if (current.close > previous.close) {
    return {
      status: "PASS",
      bias: "BUY",
      reason: "H4 bullish direction"
    };
  }

  if (current.close < previous.close) {
    return {
      status: "PASS",
      bias: "SELL",
      reason: "H4 bearish direction"
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
  if (candles.length < 3) {
    return {
      status: "WAIT",
      bias: "NONE",
      reason: "H1 data insufficient"
    };
  }

  const current = lastClosed(candles);
  const previous = previousClosed(candles);

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
  if (candles.length < 3) {
    return {
      status: "WAIT",
      reason: "M15 data insufficient"
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
      reason: "Invalid M15 candle"
    };
  }

  const body = Math.abs(
    current.close - current.open
  );

  const bodyRatio = body / range;

  if (
    direction === "BUY" &&
    current.close > current.open &&
    bodyRatio >= 0.4
  ) {
    return {
      status: "PASS",
      reason: "M15 bullish setup"
    };
  }

  if (
    direction === "SELL" &&
    current.close < current.open &&
    bodyRatio >= 0.4
  ) {
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
  if (candles.length < 3) {
    return {
      status: "WAIT",
      reason: "M5 data insufficient"
    };
  }

  const current = lastClosed(candles);
  const previous = previousClosed(candles);

  if (!current || !previous) {
    return {
      status: "WAIT",
      reason: "M5 candle unavailable"
    };
  }

  if (
    direction === "BUY" &&
    current.close > current.open &&
    current.close >= previous.high
  ) {
    return {
      status: "PASS",
      reason: "M5 bullish trigger"
    };
  }

  if (
    direction === "SELL" &&
    current.close < current.open &&
    current.close <= previous.low
  ) {
    return {
      status: "PASS",
      reason: "M5 bearish trigger"
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
        reason:
          data.reason ||
          "High-impact news block"
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

// ---------- QUOTE ----------

async function getQuoteStatus() {
  try {
    const response = await fetch(`${API}/quote`);

    if (!response.ok) {
      return {
        status: "BLOCK",
        reason: "Quote feed unavailable"
      };
    }

    const quote = await response.json();

    if (!quote.ok) {
      return {
        status: "BLOCK",
        reason:
          quote.reason ||
          "Quote feed unavailable"
      };
    }

    if (quote.stale === true) {
      return {
        status: "BLOCK",
        reason: "Market quote is stale"
      };
    }

    if (quote.marketState !== "open") {
      return {
        status: "BLOCK",
        reason:
          `Market is ${quote.marketState}`
      };
    }

    if (
      !Number.isFinite(Number(quote.bid)) ||
      !Number.isFinite(Number(quote.ask)) ||
      !Number.isFinite(Number(quote.spread))
    ) {
      return {
        status: "BLOCK",
        reason: "Invalid market quote"
      };
    }

    return {
      status: "PASS",
      reason:
        `Spread ${quote.spread}`
    };

  } catch (error) {
    return {
      status: "BLOCK",
      reason: "Quote filter unavailable"
    };
  }
}

// ---------- RISK CALCULATION ----------

function calculateRisk(balance) {
  const accountBalance = Number(balance);

  if (
    !Number.isFinite(accountBalance) ||
    accountBalance <= 0
  ) {
    return {
      status: "WAIT",
      reason: "Account balance unavailable"
    };
  }

  const riskAmount =
    accountBalance *
    (rules.risk / 100);

  return {
    status: "PASS",
    balance: accountBalance,
    riskAmount
  };
}

// ---------- SIGNAL ENGINE ----------

function calculateSignal(
  market,
  news,
  session,
  risk
) {
  if (session.status !== "PASS") {
    return {
      signal: "WAIT",
      reason: session.name
    };
  }

  if (news.status !== "PASS") {
    return {
      signal: "WAIT",
      reason: news.reason
    };
  }

  if (risk.status !== "PASS") {
    return {
      signal: "WAIT",
      reason: risk.reason
    };
  }

  const h4 =
    getH4Structure(market.h4);

  if (h4.status !== "PASS") {
    return {
      signal: "WAIT",
      reason: h4.reason
    };
  }

  const h1 =
    getH1Bias(market.h1);

  if (
    h1.status !== "PASS" ||
    h1.bias !== h4.bias
  ) {
    return {
      signal: "WAIT",
      reason:
        `H4 ${h4.bias} / H1 ${h1.bias} — bias not aligned`
    };
  }

  const m15 =
    getM15Setup(
      market.m15,
      h4.bias
    );

  if (m15.status !== "PASS") {
    return {
      signal: "WAIT",
      reason: m15.reason
    };
  }

  const m5 =
    getM5Trigger(
      market.m5,
      h4.bias
    );

  if (m5.status !== "PASS") {
    return {
      signal: "WAIT",
      reason: m5.reason
    };
  }

  return {
    signal: h4.bias,
    reason:
      `${h4.bias} confirmed: H4 → H1 → M15 → M5`
  };
}

// ---------- DISPLAY ----------

function render(
  checks,
  signal,
  reason
) {
  const box =
    document.getElementById("checks");

  box.innerHTML = checks
    .map(
      x =>
        `<div class="check">${x[0]} <b>${x[1]}</b></div>`
    )
    .join("");

  document.getElementById(
    "signal"
  ).textContent = signal;

  document.getElementById(
    "reason"
  ).textContent = reason;
}

// ---------- MAIN ----------

async function run() {
  try {
    const market =
      await getMarketData();

    const news =
      await getNewsStatus();

    const session =
      getSessionStatus();

    const quote =
      await getQuoteStatus();

    const risk =
      getRiskStatus(quote);

    const h4 =
      getH4Structure(market.h4);

    const h1 =
      getH1Bias(market.h1);

    const m15 =
      getM15Setup(
        market.m15,
        h4.bias
      );

    const m5 =
      getM5Trigger(
        market.m5,
        h4.bias
      );

    const result =
      calculateSignal(
        market,
        news,
        session,
        risk
      );

    const checks = [
      ["H4 Structure", h4.status],
      ["H1 Bias", h1.status],
      ["M15 Setup", m15.status],
      ["M5 Trigger", m5.status],
      ["Session", session.status],
      ["News Filter", news.status],
      ["Risk Engine", risk.status],
      ["R:R", `1:${rules.rr}`]
    ];

    render(
      checks,
      result.signal,
      result.reason
    );

  } catch (error) {
    console.error(error);

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
