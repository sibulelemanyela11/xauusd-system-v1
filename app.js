const system = {
  instrument: "XAUUSDm",
  riskPerTrade: 0.5,
  maxTradesPerDay: 2,
  maxDailyLoss: 1.5,
  minRR: 2
};

const checks = [
  ["H4 Structure", "WAIT"],
  ["H1 Bias", "WAIT"],
  ["M15 Setup", "WAIT"],
  ["M5 Trigger", "WAIT"],
  ["Session", "CHECK"],
  ["News Filter", "CHECK"],
  ["Risk Engine", "PASS"],
  ["R:R", "PASS"]
];

function renderChecks() {
  const container = document.getElementById("checks");

  if (!container) return;

  container.innerHTML = checks
    .map(([name, status]) =>
      `<div class="check">
        ${name} <b>${status}</b>
      </div>`
    )
    .join("");
}

function decision() {
  const criticalFailure = checks.some(
    ([name, status]) =>
      ["H4 Structure", "H1 Bias", "M15 Setup", "M5 Trigger"].includes(name) &&
      status === "FAIL"
  );

  if (criticalFailure) return "WAIT";

  return "WAIT";
}

function renderDecision() {
  const result = decision();

  const existing = document.getElementById("decision");

  if (existing) {
    existing.textContent = result;
  }
}

renderChecks();
renderDecision();
