export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://biquote.io/api/XAUUSD"
    );

    const text = await response.text();

    console.log("BiQuote response:", text);

    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        blocked: true,
        reason: "BiQuote quote feed unavailable",
        status: response.status,
        raw: text
      });
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(200).json({
        ok: false,
        blocked: true,
        reason: "BiQuote returned invalid JSON",
        raw: text
      });
    }

    return res.status(200).json({
      ok: true,
      symbol: "XAUUSD",
      bid: data.bid ?? null,
      ask: data.ask ?? null,
      mid: data.mid ?? null,
      spread: data.spread ?? null,
      marketState: data.marketState ?? null,
      stale: data.stale ?? null,
      quoteAgeSeconds: data.quoteAgeSeconds ?? null,
      timestamp: data.timestamp ?? null
    });

  } catch (error) {
    return res.status(200).json({
      ok: false,
      blocked: true,
      reason: "Quote request failed",
      error: error.message
    });
  }
}
