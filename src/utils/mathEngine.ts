import * as ss from 'simple-statistics';
import pako from 'pako';

/**
 * Wasserstein-2 Distance (Sinkhorn Algorithm)
 * Measures geometric similarity between current chart and a prototype.
 */
export function calculateWassersteinSimilarity(source: number[], target: number[], iterations = 20, reg = 0.1) {
  const n = source.length;
  const m = target.length;
  
  // Cost matrix (Euclidean distance squared)
  const cost = Array.from({ length: n }, (_, i) => 
    Array.from({ length: m }, (_, j) => Math.pow(source[i] - target[j], 2))
  );

  // Uniform distributions
  let u = Array(n).fill(1 / n);
  const v = Array(m).fill(1 / m);
  const K = cost.map(row => row.map(c => Math.exp(-c / reg)));

  // Sinkhorn iterations
  for (let iter = 0; iter < iterations; iter++) {
    const Kv = K.map(row => row.reduce((acc, val, j) => acc + val * v[j], 0));
    u = u.map((_, i) => (1 / n) / (Kv[i] || 1e-9));
    
    const Ktu = Array(m).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        Ktu[j] += K[i][j] * u[i];
      }
    }
    for (let j = 0; j < m; j++) v[j] = (1 / m) / (Ktu[j] || 1e-9);
  }

  // Compute distance
  let dist = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      dist += u[i] * K[i][j] * v[j] * cost[i][j];
    }
  }
  
  return Math.sqrt(dist);
}

/**
 * Recurrence Quantification Analysis (RQA)
 * Quantifies market memory and deterministic chaos.
 */
export function calculateRQA(series: number[], epsilon = 0.1) {
  const n = series.length;
  const rp = Array.from({ length: n }, () => Array(n).fill(0));
  const range = Math.max(...series) - Math.min(...series);
  const threshold = epsilon * range;

  let recurrenceRate = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (Math.abs(series[i] - series[j]) < threshold) {
        rp[i][j] = 1;
        recurrenceRate++;
      }
    }
  }
  recurrenceRate /= (n * n);

  // Determinism (DET): Percentage of recurrence points forming diagonal lines
  let diagPoints = 0;
  for (let i = 1; i < n - 1; i++) {
    for (let j = 1; j < n - 1; j++) {
      if (rp[i][j] === 1 && rp[i-1][j-1] === 1 && rp[i+1][j+1] === 1) {
        diagPoints++;
      }
    }
  }
  const determinism = diagPoints / (recurrenceRate * n * n || 1);

  // Laminarity (LAM): Percentage of recurrence points forming vertical lines
  let vertPoints = 0;
  for (let i = 1; i < n - 1; i++) {
    for (let j = 0; j < n; j++) {
      if (rp[i][j] === 1 && rp[i-1][j] === 1 && rp[i+1][j] === 1) {
        vertPoints++;
      }
    }
  }
  const laminarity = vertPoints / (recurrenceRate * n * n || 1);

  return { recurrenceRate, determinism, laminarity };
}

/**
 * Persistent Entropy (TDA-Lite)
 * Captures "shape" invariants using simplified persistence of price peaks.
 */
export function calculatePersistentEntropy(series: number[]) {
  const n = series.length;
  const persistence = [];
  
  // Find local extrema (birth/death of features)
  for (let i = 1; i < n - 1; i++) {
    if ((series[i] > series[i-1] && series[i] > series[i+1]) || 
        (series[i] < series[i-1] && series[i] < series[i+1])) {
      persistence.push(Math.abs(series[i] - series[i-1]));
    }
  }

  const sum = persistence.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  
  const normalized = persistence.map(p => p / sum);
  const entropy = -normalized.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0);
  
  return { entropy, featureCount: persistence.length };
}

/**
 * Symplectic Hamiltonian Flow
 * Simulates physics-constrained future paths (conserving energy).
 */
export function calculateHamiltonianFlow(price: number, momentum: number, steps = 10, dt = 0.1) {
  let q = price; // Position
  let p = momentum; // Momentum
  const k = 0.5; // "Spring constant" (mean reversion strength)
  const paths = [];

  for (let i = 0; i < steps; i++) {
    // Leapfrog integrator (Symplectic)
    p = p - k * q * (dt / 2);
    q = q + p * dt;
    p = p - k * q * (dt / 2);
    paths.push(q);
  }

  return paths;
}

/**
 * Judge 3: Z-Score Candle Significance
 * Measures if the current move is statistically significant.
 */
export function calculateZScoreSignificance(candles: { open: number, close: number }[]) {
  if (candles.length < 3) return { zScore: 0, points: -1.0 }; // Cannot evaluate short data, return negative penalty

  const lookback = Math.min(candles.length, 21);
  const bodies = candles.slice(-lookback, -1).map(c => Math.abs(c.close - c.open));
  
  // If we only had 3 candles, bodies.length might be 2. Let's make sure it doesn't divide by zero
  if (bodies.length === 0) return { zScore: 0, points: -1.0 };

  const currentBody = Math.abs(candles[candles.length - 1].close - candles[candles.length - 1].open);
  
  const mean = bodies.reduce((a, b) => a + b, 0) / bodies.length;
  const stdDev = Math.sqrt(bodies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / bodies.length);
  
  const zScore = stdDev === 0 ? 0 : (currentBody - mean) / stdDev;
  
  let points = -1.0; // Default non-zero value
  if (zScore >= 2.0) points = 2.5;
  else if (zScore >= 1.5) points = 2.0;
  else if (zScore >= 1.0) points = 1.5;
  else if (zScore >= 0.5) points = 0.5;
  else if (zScore > 0.0) points = -0.5;
  else if (zScore > -1.0) points = -1.5;
  else points = -2.5;

  return { zScore, points };
}

/**
 * Judge 4: Price-to-Level Proximity Ratio (PLR)
 * Measures precision of reaction to S/R levels.
 */
export function calculatePLR(currentPrice: number, levels: number[], candles: { open: number, close: number }[]) {
  if (levels.length === 0 || candles.length === 0) return { plr: 0, points: -1.0, nearestLevel: null };

  const avgBody = candles.slice(-20).reduce((acc, c) => acc + Math.abs(c.close - c.open), 0) / Math.min(candles.length, 20);
  const nearestLevel = levels.reduce((prev, curr) => 
    Math.abs(curr - currentPrice) < Math.abs(prev - currentPrice) ? curr : prev
  );

  const distance = Math.abs(currentPrice - nearestLevel);
  const plr = 1 - (distance / (avgBody || 1e-9));
  
  let points = -1.0; // Default non-zero value
  if (plr >= 0.85) points = 2.5;
  else if (plr >= 0.65) points = 1.5;
  else if (plr >= 0.45) points = 0.5;
  else if (plr >= 0.25) points = -0.5;
  else if (plr >= 0.0) points = -1.5;
  else points = -2.5;

  return { plr: Math.max(0, plr), points, nearestLevel };
}

/**
 * Volatility Regime Gate
 * Measures market energy to filter out dead or explosive markets.
 */
export function calculateVolatilityRegime(candles: { high: number; low: number; close: number; prevClose: number }[], lookback = 20) {
  if (candles.length < lookback) return { status: 'INSUFFICIENT_DATA', zScore: 0 };

  const trueRanges = candles.slice(-lookback).map(c => 
    Math.max(c.high - c.low, Math.abs(c.high - c.prevClose), Math.abs(c.low - c.prevClose))
  );

  const atr = ss.mean(trueRanges);
  const atrStd = ss.standardDeviation(trueRanges);
  const currentTr = trueRanges[trueRanges.length - 1];

  const volZ = (currentTr - atr) / (atrStd || 0.0001);

  if (volZ >= -0.5 && volZ <= 1.2) return { status: 'TRADEABLE', zScore: volZ };
  if (volZ > 2.0) return { status: 'EXPLOSIVE_SKIP', zScore: volZ };
  return { status: 'DEAD_SKIP', zScore: volZ };
}

/**
 * Kolmogorov Predictability Certificate
 * Measures algorithmic structure using compression ratios.
 */
export function calculatePredictability(priceSeries: number[], threshold = 0.55) {
  if (priceSeries.length < 10) return { isPredictable: false, type: 'RANDOM', ratios: {} };

  const returns = [];
  for (let i = 1; i < priceSeries.length; i++) {
    returns.push(priceSeries[i] - priceSeries[i - 1]);
  }

  const directionSeq = returns.map(r => r > 0 ? 'U' : 'D').join('');
  
  const std = ss.standardDeviation(returns);
  const magnitudeSeq = returns.map(r => {
    const absR = Math.abs(r);
    if (absR < 0.5 * std) return 'L';
    if (absR < 1.5 * std) return 'M';
    return 'H';
  }).join('');

  const combinedSeq = returns.map((_, i) => directionSeq[i] + magnitudeSeq[i]).join('');

  const compressionRatio = (s: string) => {
    const encoded = new TextEncoder().encode(s);
    const compressed = pako.deflate(encoded);
    return compressed.length / encoded.length;
  };

  const ratios = {
    direction: compressionRatio(directionSeq),
    magnitude: compressionRatio(magnitudeSeq),
    combined: compressionRatio(combinedSeq)
  };

  const isPredictable = ratios.combined < threshold;
  let structureType = 'RANDOM';

  if (ratios.direction < 0.4 && ratios.magnitude > 0.6) structureType = 'TRENDING';
  else if (ratios.direction > 0.6 && ratios.magnitude < 0.4) structureType = 'MEAN_REVERTING';
  else if (ratios.direction < 0.4 && ratios.magnitude < 0.4) structureType = 'PATTERNED';

  return { isPredictable, structureType, ratios };
}

/**
 * Adversarial Robustness Pre-Filter
 * Tests signal stability by perturbing inputs.
 */
export function calculateRobustness(priceSeries: number[], nPerturbations = 20) {
  const classify = (series: number[]) => {
    const returns = [];
    for (let i = 1; i < series.length; i++) returns.push(series[i] - series[i-1]);
    const upCount = returns.filter(r => r > 0).length;
    return upCount > returns.length / 2 ? 'BULL' : 'BEAR';
  };

  const originalRegime = classify(priceSeries);
  const range = Math.max(...priceSeries) - Math.min(...priceSeries);
  const noiseScale = 0.001 * range;

  let flipCount = 0;
  for (let i = 0; i < nPerturbations; i++) {
    const perturbed = priceSeries.map(p => p + (Math.random() * 2 - 1) * noiseScale);
    if (classify(perturbed) !== originalRegime) flipCount++;
  }

  const robustness = 1 - (flipCount / nPerturbations);
  return { robustness, isStable: robustness >= 0.85 };
}

/**
 * Causal Entropic Force (CEF)
 * Predicts direction based on maximizing future path entropy (liquidity access).
 */
export function calculateCEF(priceSeries: number[], liquidityMap: Record<number, number>, nFutures = 500, timeHorizon = 10) {
  const currentPrice = priceSeries[priceSeries.length - 1];
  const returns = [];
  for (let i = 1; i < priceSeries.length; i++) {
    returns.push(priceSeries[i] - priceSeries[i - 1]);
  }
  const vol = ss.standardDeviation(returns);

  const directions = { UP: 1, DOWN: -1 };
  const futureEntropy: Record<string, number> = {};

  for (const [dir, sign] of Object.entries(directions)) {
    const pathEntropies = [];

    for (let i = 0; i < nFutures; i++) {
      const futurePrices = [currentPrice + sign * vol];
      for (let t = 0; t < timeHorizon; t++) {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const nextPrice = futurePrices[futurePrices.length - 1] + z0 * vol;
        futurePrices.push(nextPrice);
      }

      const zonesVisited = new Set<number>();
      for (const p of futurePrices) {
        // Find nearest liquidity zone
        const keys = Object.keys(liquidityMap).map(Number);
        if (keys.length === 0) continue; // Skip if no liquidity zones exist
        
        const nearestZone = keys.reduce((prev, curr) => Math.abs(curr - p) < Math.abs(prev - p) ? curr : prev);
        zonesVisited.add(nearestZone);
      }

      const weights = Array.from(zonesVisited).map(z => liquidityMap[z]);
      const sum = weights.reduce((a, b) => a + b, 0);
      const normalizedWeights = weights.map(w => w / sum);
      
      // Shannon Entropy
      const ent = -normalizedWeights.reduce((acc, w) => acc + (w > 0 ? w * Math.log2(w) : 0), 0);
      pathEntropies.push(ent);
    }

    futureEntropy[dir] = ss.mean(pathEntropies);
  }

  const predictedDirection = futureEntropy.UP > futureEntropy.DOWN ? 'UP' : 'DOWN';
  const confidence = Math.abs(futureEntropy.UP - futureEntropy.DOWN) / Math.max(futureEntropy.UP, futureEntropy.DOWN, 0.0001);

  return { predictedDirection, confidence, futureEntropy };
}

/**
 * Transfer Entropy (TE)
 * Measures causal information flow from source to target.
 */
export function calculateTransferEntropy(source: number[], target: number[], k = 3, l = 1) {
  // Simplified implementation using symbolic dynamics (direction of change)
  // as full KSG estimator is computationally heavy for JS without specialized libs.
  const n = target.length - Math.max(k, l);
  if (n <= 0) return 0;

  const getSymbol = (series: number[], i: number) => series[i] > series[i - 1] ? 1 : 0;

  // This is a simplified discrete TE implementation
  // T(S->T) = H(T_next | T_past) - H(T_next | T_past, S_past)
  // For brevity and performance in this environment, we use a 1-step lag symbolic approach
  
  const jointMap = new Map<string, number>();
  const targetPastMap = new Map<string, number>();
  const fullMap = new Map<string, number>();

  for (let i = Math.max(k, l); i < target.length; i++) {
    const tNext = getSymbol(target, i);
    const tPast = getSymbol(target, i - 1);
    const sPast = getSymbol(source, i - 1);

    const jointKey = `${tNext}|${tPast}`;
    const targetPastKey = `${tPast}`;
    const fullKey = `${tNext}|${tPast}|${sPast}`;

    jointMap.set(jointKey, (jointMap.get(jointKey) || 0) + 1);
    targetPastMap.set(targetPastKey, (targetPastMap.get(targetPastKey) || 0) + 1);
    fullMap.set(fullKey, (fullMap.get(fullKey) || 0) + 1);
  }

  // Calculate Shannon Entropies and TE
  // T = sum P(next, past, source) * log ( P(next | past, source) / P(next | past) )
  let te = 0;
  const total = target.length - Math.max(k, l);

  for (const [fullKey, fullCount] of fullMap.entries()) {
    const [tNext, tPast, sPast] = fullKey.split('|');
    const pFull = fullCount / total;
    
    const jointCount = jointMap.get(`${tNext}|${tPast}`) || 0;
    const targetPastCount = targetPastMap.get(`${tPast}`) || 0;
    
    // P(next | past, source) = count(next, past, source) / count(past, source)
    // We need count(past, source)
    let pastSourceCount = 0;
    for (const [fk, fc] of fullMap.entries()) {
      if (fk.endsWith(`|${tPast}|${sPast}`)) pastSourceCount += fc;
    }

    const pNextCondFull = fullCount / (pastSourceCount || 1);
    const pNextCondTarget = jointCount / (targetPastCount || 1);

    if (pNextCondFull > 0 && pNextCondTarget > 0) {
      te += pFull * Math.log2(pNextCondFull / pNextCondTarget);
    }
  }

  return Math.max(0, te);
}

/**
 * Optimal Stopping Entry
 * Calibrates entry timing based on historical decay.
 */
export class OptimalStoppingEntry {
  private delayMetrics: Record<number, { winRate: number; avgSlippage: number; ev: number }> = {};

  constructor(historicalEntries: any[]) {
    this.calibrate(historicalEntries);
  }

  private calibrate(entries: any[]) {
    const delays = [0, 1, 2, 3, 4, 5, 6, 7];
    delays.forEach(d => {
      const group = entries.filter(e => e.entryDelayCandles === d);
      if (group.length < 5) {
        // Default fallback if not enough data
        this.delayMetrics[d] = { winRate: 0.5, avgSlippage: 0, ev: 0.5 * 0.85 };
        return;
      }

      const winRate = ss.mean(group.map(e => e.outcome === 'WIN' ? 1 : 0));
      const avgSlippage = ss.mean(group.map(e => Math.abs(e.entryPrice - e.signalPrice)));
      this.delayMetrics[d] = {
        winRate,
        avgSlippage,
        ev: winRate * 0.85 - avgSlippage
      };
    });
  }

  getDecision(candlesElapsed: number): { action: 'ENTER' | 'WAIT' | 'EXPIRED'; ev: number } {
    if (candlesElapsed > 7) return { action: 'EXPIRED', ev: 0 };
    
    const currentEv = this.delayMetrics[candlesElapsed]?.ev || 0;
    
    // Look ahead
    let bestFutureEv = -Infinity;
    for (let d = candlesElapsed + 1; d <= 7; d++) {
      if (this.delayMetrics[d]) {
        bestFutureEv = Math.max(bestFutureEv, this.delayMetrics[d].ev);
      }
    }

    const signalSurvivalProb = Math.exp(-0.15 * candlesElapsed);
    const discountedFutureEv = bestFutureEv * signalSurvivalProb;

    if (currentEv >= discountedFutureEv || candlesElapsed === 7) {
      return { action: 'ENTER', ev: currentEv };
    }

    return { action: 'WAIT', ev: currentEv };
  }
}
