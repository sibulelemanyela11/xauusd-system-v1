export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://biquote.io/api/XAUUSD/ohlc?interval=15m&limit=100"
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: "M15 market data unavailable"
      });
    }

    return res.status(200).json({
      ok: true,
      timeframe: "M15",
      symbol: "XAUUSD",
      data
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Could not retrieve XAUUSD M15 data"
    });
  }
}
