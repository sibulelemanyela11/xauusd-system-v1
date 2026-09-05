export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://biquote.io/api/XAUUSD/ohlc?interval=1h&limit=100"
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: "H1 market data unavailable"
      });
    }

    return res.status(200).json({
      ok: true,
      timeframe: "H1",
      symbol: "XAUUSD",
      data
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Could not retrieve XAUUSD H1 data"
    });
  }
}
