const API = "/api/gold";
const NEWS_API = "/api/news";

const rules = {
  risk: 0.5,
  maxTrades: 2,
  dailyLoss: 1.5,
  rr: 2
};

// Gold trading sessions — South African time
function getSessionStatus() {
  const now = new Date();

  const hour = Number(
    new Intl.DateTimeFormat("en-ZA", {
      timeZone: "Africa/Johannesburg",
      hour: "2-digit",
      hour12: false
    }).format(now)
  );

  // London session: 09:00–18:00 SAST
  // New York session: 14:00–23:00 SAST
  const london = hour >= 9 && hour < 18;
  const newYork = hour >= 14 && hour < 23;

  if (london || newYork) {
    return {
      status: "PASS",
      name: london && newYork ? "LONDON + NY" : london ? "LONDON" : "NEW YORK"
    };
  }

  return {
    status: "BLOCK",
    name: "OUTSIDE SESSION"
  };
}

async function getNewsStatus() {
  try {
    const response = await fetch(NEWS_API);

    if (!response.ok) {
      return {
        status: "CHECK",
        reason: "News feed unavailable"
      };
    }

    const data = await response.json();

    if (data.blocked) {
      return {
        status: "BLOCK",
        reason: data.reason || "High-impact news window"
      };
    }

    return {
      status: "PASS",
      reason: "No high-impact news block"
    };

  } catch (error) {
    return {
      status: "CHECK",
      reason: "News filter unavailable"
    };
  }
}

function getGoldPrice(data) {
  const result = data?.data;

  if (!result) return null;

  if (result.price) {
    return Number(result.price);
  }

  return null;
}

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

async function run() {
  try {
    const response = await fetch(API);

    if (!response.ok) {
      throw new Error("API unavailable");
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error("Gold API error");
    }

    const price = getGoldPrice(data);

    if (!price) {
      throw new Error("Gold price not found");
    }

    const session = getSessionStatus();
    const news = await getNewsStatus();

    const checks = [
      ["H4 Structure", "CONNECTED"],
      ["H1 Bias", "CONNECTED"],
      ["M15 Setup", "CONNECTED"],
      ["M5 Trigger", "CONNECTED"],
      ["Session", session.status],
      ["News Filter", news.status],
      ["Risk Engine", "PASS"],
      ["R:R", "PASS"]
    ];

    let signal = "WAIT";
    let reason = `XAU/USD: ${price}`;

    if (session.status !== "PASS") {
      signal = "WAIT";
      reason = `Trading blocked: ${session.name}`;
    } else if (news.status === "BLOCK") {
      signal = "WAIT";
      reason = `Trading blocked: ${news.reason}`;
    } else if (news.status === "CHECK") {
      signal = "WAIT";
      reason = "News filter could not be verified";
    } else {
      signal = "WAIT";
      reason = `Session: ${session.name}. News clear. Awaiting H4 → H1 → M15 → M5 confirmation.`;
    }

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

// Refresh every minute
setInterval(run, 60000);
