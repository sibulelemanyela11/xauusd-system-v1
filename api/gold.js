export default async function handler(req, res) {
  try {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD=X?interval=1h&range=30d";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Market data request failed");
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error("No Gold market data");
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0];

    if (!quote) {
      throw new Error("No Gold candles");
    }

    const hourly = timestamps
      .map((time, i) => ({
        time,
        open: quote.open?.[i],
        high: quote.high?.[i],
        low: quote.low?.[i],
        close: quote.close?.[i]
      }))
      .filter(c =>
        c.open != null &&
        c.high != null &&
        c.low != null &&
        c.close != null
      );

    // Build closed 4-hour candles
    const h4 = [];

    for (let i = 0; i + 3 < hourly.length; i += 4) {
      const group = hourly.slice(i, i + 4);

      h4.push({
        time: group[0].time,
        open: group[0].open,
        high: Math.max(...group.map(c => c.high)),
        low: Math.min(...group.map(c => c.low)),
        close: group[3].close
      });
    }

    const lastPrice =
      hourly[hourly.length - 1]?.close ?? null;

    return res.status(200).json({
      ok: true,
      price: lastPrice,
      h4
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Could not retrieve Gold market data"
    });
  }
}
