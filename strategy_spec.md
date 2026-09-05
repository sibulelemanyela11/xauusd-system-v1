# XAUUSD SYSTEM V1
Instrument: XAUUSDm only.
Timeframe hierarchy: H4 structure, H1 bias, M15 setup, M5 trigger.
Risk: 0.5% per trade. Maximum 2 trades/day. Minimum R:R 1:2.
Daily protection: 1.5% max daily loss. After 2 losses, stop.
Decision: BUY / SELL / WAIT.
Only closed candles are evaluated.
Critical failure at any layer = WAIT.
News, session, spread/volatility and rollover filters are required.
The current V1 has no live market-data adapter and does not place MT4 trades.
