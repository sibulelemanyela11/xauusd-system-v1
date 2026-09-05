export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://biquote.io/api/XAUUSD/ohlc?interval=4h&limit=100"
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: "H4 market data unavailable"
      });
    }

    return res.status(200).json({
      ok: true,
      timeframe: "H4",
      symbol: "XAUUSD",
      data
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Could not retrieve XAUUSD H4 data"
    });
  }
}
