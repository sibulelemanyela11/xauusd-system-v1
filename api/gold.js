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
      `https://www.alphavantage.co/query?function=GOLD_SILVER_SPOT&symbol=XAU&apikey=${key}`;

    const response = await fetch(url);
    const data = await response.json();

    return res.status(200).json({
      ok: true,
      data
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Could not reach Alpha Vantage"
    });
  }
}
