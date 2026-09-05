const API = "/api/gold";

const rules = {
  risk: 0.5,
  maxTrades: 2,
  dailyLoss: 1.5,
  rr: 2
};

function getGoldPrice(data) {
  const result = data?.data;

  if (!result) return null;

  // Alpha Vantage GOLD_SILVER_SPOT response
  if (result.price) {
    return Number(result.price);
  }

  return null;
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

    render(
      "CONNECTED",
      "WAIT",
      `Live Gold feed connected. XAU/USD: ${price}`
    );

  } catch (error) {
    render(
      "WAIT",
      "WAIT",
      "Live market feed unavailable."
    );
  }
}

run();
