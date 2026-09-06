export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://biquote.io/api/XAUUSD?allowStale=false"
    );

    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        blocked: true,
        reason: "Quote feed unavailable"
      });
    }

    const data = await response.json();

    return res.status(200).json({
      ok: true,
      symbol: "XAUUSD",
      bid: data.bid,
      ask: data.ask,
      mid: data.mid,
      spread: data.spread,
      marketState: data.marketState,
      stale: data.stale,
      quoteAgeSeconds: data.quoteAgeSeconds,
      timestamp: data.timestamp
    });

  } catch (error) {
    return res.status(200).json({
      ok: false,
      blocked: true,
      reason: "Quote feed unavailable"
    });
  }
}
