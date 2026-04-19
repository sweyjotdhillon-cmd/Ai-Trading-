export const INDICATORS = [
  {
    id: 'sma',
    name: 'Simple Moving Average (SMA)',
    shortName: 'SMA',
    description: 'Calculates the average price over a specific number of periods. Used to identify trend direction and potential support/resistance levels.'
  },
  {
    id: 'ema',
    name: 'Exponential Moving Average (EMA)',
    shortName: 'EMA',
    description: 'Similar to SMA but places greater weight on recent data points, making it react faster to recent price changes.'
  },
  {
    id: 'rsi',
    name: 'Relative Strength Index (RSI)',
    shortName: 'RSI',
    description: 'A momentum oscillator (0-100) that measures the speed and change of price movements. Often used to identify overbought (>70) or oversold (<30) conditions.'
  },
  {
    id: 'macd',
    name: 'Moving Average Convergence Divergence (MACD)',
    shortName: 'MACD',
    description: 'A trend-following momentum indicator that shows the relationship between two moving averages. Crossovers and divergences signal potential trend reversals.'
  }
];
