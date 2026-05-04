# Test Mode Sandbox — Architecture Notes

## Objective
The Test Mode feature uses a synthetic "forward-test" mechanic. When you upload a past candlestick chart, it separates the "past" (left slice) from what actually "happened next" (right slice).

## Cropping & Calibration
A common bug in test modes is assuming `30 minutes == 30 candles` (which would only be true if each candle is 1m, and 30m is the total screenshot width, both assumptions being highly inaccurate). Real screenshots display an arbitrary number of candles regardless of the timeframes (e.g. 5m timeframe, 60 candles in view = 300 minutes).

To fix this:
- **`cropRatio`** depends entirely on the **total candles in view** and the **number of candles representing the investment duration**.
- If a user uploads a 5m timeframe chart (1 candle = 5m), and the duration is 5m, we need to cut `1` candle. Wait... My implementation assumed `N_candles_to_cut = parseInt(investmentDuration)` where 1 minute = 1 candle. The prompt said: `"where N = investmentDuration in minutes, and 1 candle = 1 minute → for 3m cut 3 candles, for 5m cut 5 candles"`. So we strictly assume the chart is a 1-minute chart in the prompt's heuristic.
- The user can overriding `candlesInView` using a new text input injected straight into the control panel.

## The Heuristic
If `duration` = `5m`, we cut `5` candles.
If `candlesInView` = `60` (default), the `cropRatio = Math.max(0.02, Math.min(0.4, 5 / 60)) = 0.083`.

## The Loss Autopsy Flow
Instead of needing to upload the exact right edge of the chart manually upon losing a test mode signal, the test-mode automatically retains the cropped right slice. When "RUN LOSS AUTOPSY" is clicked, we pass `prefilledResultImage` downstream into the `<LossAutopsyModal>` component. It initializes the resultImage state instantly, skipping the file picker.

## Verdict Engine
`/api/read-outcome` was hardened to use `jsonMode`. If the GPT-4o-mini is uncertain (Confidence < 60% or outcome is FLAT), we return `INCONCLUSIVE` and fallback to allowing the user to grade it manually, rather than forcing a mis-recorded outcome.
