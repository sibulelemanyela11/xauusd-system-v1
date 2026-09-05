export default async function handler(req, res) {
  const key = process.env.ALPHA_VANTAGE_API_KEY;

  if (!key) {
    return res.status(500).json({
      ok: false,
      error: "ALPHA_VANTAGE_API_KEY is missing"
    });
  }

  try {
    const url =
      `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=XAU&to_symbol=USD&interval=60min&outputsize=full&apikey=${key}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.Note || data.Information || data["Error Message"]) {
      return res.status(502).json({
        ok: false,
        error: data.Information || data.Note || data["Error Message"]
      });
    }

    const series = data["Time Series FX (60min)"];

    if (!series) {
      return res.status(502).json({
        ok: false,
        error: "No XAUUSD 60-minute data returned"
      });
    }

    const candles = Object.entries(series)
      .map(([time, candle]) => ({
        time,
        open: Number(candle["1. open"]),
        high: Number(candle["2. high"]),
        low: Number(candle["3. low"]),
        close: Number(candle["4. close"])
      }))
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    const h4 = [];

    for (let i = 0; i < candles.length; i += 4) {
      const group = candles.slice(i, i + 4);

      if (group.length < 4) continue;

      h4.push({
        time: group[0].time,
        open: group[0].open,
        high: Math.max(...group.map(c => c.high)),
        low: Math.min(...group.map(c => c.low)),
        close: group[group.length - 1].close
      });
    }

    return res.status(200).json({
      ok: true,
      timeframe: "H4",
      source: "Alpha Vantage XAUUSD 60min aggregated",
      data: h4
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Could not retrieve H4 market data"
    });
  }
}
