export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://biquote.io/api/calendar?countries=US&importance=high&limit=50"
    );

    if (!response.ok) {
      return res.status(200).json({
        ok: true,
        blocked: true,
        reason: "News feed unavailable — trading blocked"
      });
    }

    const events = await response.json();
    const now = Date.now();

    const blockedEvents = events.filter(event => {
      const eventTime = new Date(event.time || event.scheduledAt).getTime();

      if (!eventTime) return false;

      return Math.abs(eventTime - now) <= 30 * 60 * 1000;
    });

    return res.status(200).json({
      ok: true,
      blocked: blockedEvents.length > 0,
      reason:
        blockedEvents.length > 0
          ? "High-impact US economic news within ±30 minutes"
          : "No high-impact US news within ±30 minutes",
      events: blockedEvents
    });

  } catch (error) {
    return res.status(200).json({
      ok: true,
      blocked: true,
      reason: "News feed unavailable — trading blocked"
    });
  }
}
