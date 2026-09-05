export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://api.frankfurter.app/latest?from=XAU&to=USD"
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: "Market data source unavailable"
      });
    }

    return res.status(200).json({
      ok: true,
      timeframe: "H4",
      source: "XAUUSD",
      price: data.rates?.USD ?? null,
      data
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Could not retrieve XAUUSD market data"
    });
  }
}
