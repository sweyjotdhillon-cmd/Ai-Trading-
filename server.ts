import express from "express";
import path from "path";
import cors from "cors";
import { Jimp } from "jimp";
import { 
  calculateCEF, 
  calculateTransferEntropy, 
  calculateVolatilityRegime, 
  calculatePredictability, 
  calculateRobustness,
  calculateWassersteinSimilarity,
  calculateRQA,
  calculatePersistentEntropy,
  calculateHamiltonianFlow,
  calculateZScoreSignificance,
  calculateBoundaryReversal
} from "./src/utils/mathEngine.ts";

import { BULL_PROMPT, BEAR_PROMPT, JUDGE_PROMPT, SKEPTIC_PROMPT } from "./src/constants/debatePrompts.ts";

async function callModel(params: {
  model: string,
  prompt: string,
  image?: string,
  userApiKey?: string,
  userEndpoint?: string,
  jsonMode?: boolean
}) {
  const apiKey = params.userApiKey || process.env.GITHUB_TOKEN;
  if (!apiKey) throw new Error("GitHub Token is missing. Please add it in Settings.");

  const baseUrl = params.userEndpoint || process.env.GITHUB_API_BASE_URL || "https://models.inference.ai.azure.com";
  // Trim trailing slash and ensure /chat/completions is present
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const endpoint = normalizedBase.includes("/chat/completions") ? normalizedBase : `${normalizedBase}/chat/completions`;

  const payload: any = {
    model: params.model,
    messages: [
      {
        role: "user",
        content: params.image 
          ? [
              { type: "text", text: params.prompt },
              { type: "image_url", image_url: { url: params.image.startsWith("data:") ? params.image : `data:image/jpeg;base64,${params.image}` } }
            ]
          : params.prompt
      }
    ],
    max_tokens: 3000,
  };

  if (params.jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  let retries = 6; // Increased retries for stability
  let delay = 2000; // Longer initial delay

  while (retries >= 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // Increased to 90s
    try {
      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      );

    if (response.status === 429) {
      if (retries === 0) {
        throw new Error(`GitHub Models API Rate Limit Exceeded (429) after multiple retries. Please wait 1-2 minutes before trying again.`);
      }
      // Add random jitter between 200 and 2000ms
      const jitter = 200 + Math.floor(Math.random() * 1800);
      const totalDelay = delay + jitter;
      console.warn(`Rate limited (429). Retrying in ${totalDelay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
      retries--;
      delay *= 2.2; // Aggressive backoff
      continue;
    }

    if (!response.ok) {
      const errText = await response.text();
      let errorJson;
      try { errorJson = JSON.parse(errText); } catch { /* ignore parse error */ }
      const msg = errorJson?.error?.message || errorJson?.error || errText || response.statusText;
      console.error(`GitHub API Error (${response.status}):`, msg);
      throw new Error(`GitHub Models API Error: ${msg}`);
    }

    const result = await response.json();
    return result.choices[0].message.content || "";
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error("GitHub Models API Request Timed Out (80s).");
      }
      if (retries === 0) {
        throw err;
      }
      console.warn(`Fetch error, retrying (${retries} left):`, err.message);
      // Wait longer for non-429 errors
      await new Promise(resolve => setTimeout(resolve, delay * 2));
      retries--;
      delay *= 1.5;
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  return "";
}

const VISION_EXTRACTION_PROMPT = `
You are an expert financial chart OCR and analysis tool. Analyze the provided candlestick chart.
Your primary task is to extract high-precision numerical data for mathematical analysis.

Respond ONLY with a valid JSON object matching this structure exactly:
{
  "recentOHLC": [
    {"index": 0, "open": numeric, "high": numeric, "low": numeric, "close": numeric}
  ],
  "candleBodies": [list_of_20_approx_body_sizes_in_pixels_or_relative_units],
  "currentPrice": numeric_value,
  "priceYPercent": numeric_percentage_0_to_100_of_vertical_chart_position_0_is_top_100_is_bottom,
  "keyLevels": [balance_of_at_least_3_supports_and_3_resistances],
  "avgBodyHeight": numeric_value,
  "volumeAnomalies": "string",
  "visibleTrend": "string",
  "priceActionContext": "string"
}

CRITICAL: You MUST identify both key levels BELOW (support) and ABOVE (resistance) the current price to ensure a balanced analysis.
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add process-level error handling to prevent mysterious crashes
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  app.use(cors({ origin: '*' })); // Keep wildcard cors for now to support AI studio iframes, but reduce limits
  
  // Apply a standard 2mb limit globally to prevent broad DoS
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));

  // Exception limit for high-bandwidth endpoints like image analysis
  app.use('/api/debate', express.json({ limit: '50mb' }));
  app.use('/api/debate', express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    res.json({ 
      hasFirebase: true, 
      serverStatus: "ok",
      githubEnabled: !!process.env.GITHUB_TOKEN
    });
  });

  app.post("/api/pre-analysis", async (req, res) => {
    const { priceHistory, correlatedAssets, liquidityMap } = req.body;
    
    try {
      // 1. Structural Priors (CEF & Transfer Entropy)
      let structuralPriors = "No structural data provided.";
      let geometricOracles = "No geometric data provided.";
      let judge3 = null;
      let marketGates = {
        volatility: { status: 'UNKNOWN', zScore: 0 },
        predictability: { isPredictable: false, type: 'UNKNOWN' },
        robustness: { robustness: 0, isStable: false }
      };

      if (priceHistory && priceHistory.length > 0) {
        const cef = calculateCEF(priceHistory, liquidityMap || { [priceHistory[priceHistory.length-1]]: 1 });
        
        // Prepare candles for Judge 3 and 4
        const candles = priceHistory.map((p: number, i: number) => ({
          open: priceHistory[i-1] || p,
          close: p
        }));

        // Judge 3: Z-Score
        judge3 = calculateZScoreSignificance(candles);
        
        // New Gates
        const volRegime = calculateVolatilityRegime(priceHistory.map((p: number, i: number) => {
          const prev = priceHistory[i-1] || p;
          const next = priceHistory[i+1] || p;
          // Simulate some range since we only have closes
          const high = Math.max(p, prev, next) * 1.001; 
          const low = Math.min(p, prev, next) * 0.999;
          return { high, low, close: p, prevClose: prev };
        }));
        const predictability = calculatePredictability(priceHistory);
        const robustness = calculateRobustness(priceHistory);

        marketGates = {
          volatility: volRegime,
          predictability,
          robustness
        };

        // Geometric & Physical Oracles
        const rqa = calculateRQA(priceHistory);
        const tda = calculatePersistentEntropy(priceHistory);
        const flow = calculateHamiltonianFlow(priceHistory[priceHistory.length-1], priceHistory[priceHistory.length-1] - (priceHistory[priceHistory.length-2] || priceHistory[priceHistory.length-1]));
        
        // Wasserstein similarity to a "perfect" trend prototype (linear sequence)
        const perfectTrend = Array.from({ length: priceHistory.length }, (_, i) => priceHistory[0] + (priceHistory[priceHistory.length-1] - priceHistory[0]) * (i / (priceHistory.length - 1)));
        const wasserstein = calculateWassersteinSimilarity(priceHistory, perfectTrend);

        geometricOracles = `
- Wasserstein Distance to Trend Prototype: ${wasserstein.toFixed(4)}
- RQA Determinism: ${(rqa.determinism * 100).toFixed(2)}%
- RQA Laminarity: ${(rqa.laminarity * 100).toFixed(2)}%
- Persistent Entropy (TDA): ${tda.entropy.toFixed(4)} (${tda.featureCount} features)
- Hamiltonian Flow (Next 3 steps): ${flow.slice(0, 3).map(f => f.toFixed(2)).join(', ')}
        `.trim();

        let teInfo = "";
        if (correlatedAssets) {
          const influence: Record<string, number> = {};
          for (const [name, prices] of Object.entries(correlatedAssets)) {
            influence[name] = calculateTransferEntropy(prices as number[], priceHistory);
          }
          const leader = Object.entries(influence).sort((a, b) => b[1] - a[1])[0];
          teInfo = leader ? `\n- Transfer Entropy Leader: ${leader[0]} (Influence: ${leader[1].toFixed(4)})` : "";
        }

        structuralPriors = `
- Causal Entropic Force Direction: ${cef.predictedDirection}
- CEF Confidence: ${(cef.confidence * 100).toFixed(2)}%${teInfo}
- Market Physics: Smart money is currently gravitating toward ${cef.predictedDirection === 'UP' ? 'higher' : 'lower'} liquidity zones to maintain future optionality.
- Volatility Regime: ${volRegime.status} (Z-Score: ${volRegime.zScore.toFixed(2)})
- Predictability: ${predictability.type} (Ratio: ${predictability.ratios.combined?.toFixed(2)})
- Signal Robustness: ${(robustness.robustness * 100).toFixed(0)}% Stable
        `.trim();
      }

      res.json({
        structuralPriors,
        geometricOracles,
        judge3,
        marketGates
      });

    } catch (error: any) {
      console.error("Pre-analysis error:", error);
      res.status(500).json({ error: error.message || "Pre-analysis failed" });
    }
  });

  app.post("/api/debate", async (req, res) => {
    console.log(`[API] Received debate request at ${new Date().toISOString()}`);
    const { image, symbol, timeframe, investment, structuralPriors, geometricOracles, githubToken, githubEndpoint, techniqueData, statsData } = req.body;
    
    if (!image) {
      console.error("[API] Missing image in request body");
      return res.status(400).json({ error: "Missing image data" });
    }

    // API Key & Endpoint
    const finalApiKey = githubToken || process.env.GITHUB_TOKEN;
    const finalEndpoint = githubEndpoint || process.env.GITHUB_API_BASE_URL || "https://models.inference.ai.azure.com";
    
    // Prompt Injection Protection: Sanitize user bounds
    const safeSymbol = (symbol || "Unknown").replace(/[\n\r]/g, ' ');
    const safeTimeframe = (timeframe || "").replace(/[\n\r]/g, ' ');
    const safeDuration = (investment?.duration || "").replace(/[\n\r]/g, ' ');
    const safeAmount = (investment?.amount || "").replace(/[\n\r]/g, ' ');

    // session context
    const binaryContext = `\nESSENTIAL BINARY CONTEXT:\nAsset Symbol: ${safeSymbol}\nGraph Timeframe: ${safeTimeframe}\nInvestment Duration: ${safeDuration}\nInvestment Amount: $${safeAmount}\n`;
    const techContext = techniqueData && Array.isArray(techniqueData) 
      ? `\nTECHNIQUES AVAILABLE:\n${techniqueData.map((t) => `- ${t}`).join('\n')}`
      : (techniqueData ? `\nTECHNIQUES AVAILABLE:\n${JSON.stringify(techniqueData, null, 2)}` : "None specific provided.");
    const statsContext = statsData ? `\nPREVIOUS TRADING STATS FOR CONTINUITY:\n${JSON.stringify(statsData, null, 2)}` : "";

    try {
      // Create primary optimized image for VISION
      let optimizedBase64: string;
      
      try {
        const buffer = Buffer.from(image, 'base64');
        const jimpImage = await Jimp.read(buffer);
        console.log(`[API] Jimp processing: ${jimpImage.width}x${jimpImage.height}`);
        
        // Resize if too large
        if (jimpImage.width > 1024 || jimpImage.height > 1024) {
          jimpImage.contain({ width: 1024, height: 1024 });
        }

        // Jimp v1: set quality directly in getBuffer options if possible, or use the v1 method if available
        const compressedImage = await jimpImage.getBuffer("image/jpeg", { quality: 85 });
        optimizedBase64 = compressedImage.toString('base64');
        console.log(`[API] Image optimization complete`);
      } catch (jimpErr: any) {
        console.error("[API] Jimp optimization failed, using original:", jimpErr.message);
        optimizedBase64 = image;
      }

      // Helper function for serial model calls with timeout and model fallback
      const safeCall = async (prompt: string, img?: string, json: boolean = true) => {
        // Fallback chain for vision vs reasoning
        const modelChain = ["gpt-4o-mini", "Llama-3.2-90B-Vision-Instruct", "gpt-4o"];

        let lastError = "";

        for (const modelName of modelChain) {
          try {
            const raw = await callModel({ 
              model: modelName, 
              prompt, 
              image: img, 
              userApiKey: finalApiKey, 
              userEndpoint: finalEndpoint, 
              jsonMode: json 
            });
            if (!raw) continue;
            
            // Enhanced cleanup
            const clean = raw.replace(/```json|```/g, '').trim();
            if (json) {
              const start = clean.indexOf('{');
              const end = clean.lastIndexOf('}');
              if (start !== -1 && end !== -1) {
                return clean.substring(start, end + 1);
              }
            }
            return clean;
          } catch (e: any) {
            lastError = e.message;
            console.warn(`[DEBATE] Call failed for model ${modelName}, trying next... :`, e.message);
            // Wait a bit before trying fallback model
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        console.error(`[DEBATE] All models in chain failed. Last error: ${lastError}`);
        return null;
      };

      // 1. Vision Extractions (Primary only)
      const visionResults = await Promise.allSettled([
        safeCall(VISION_EXTRACTION_PROMPT, optimizedBase64)
      ]);

      const visionExtractionRaw = visionResults[0].status === 'fulfilled' ? visionResults[0].value : null;

      if (!visionExtractionRaw) {
        console.error("[DEBATE] CRITICAL: Vision extraction returned null.");
        throw new Error("Vision extraction failed. The chart screenshot might be too blurry or the API is under heavy load. Please try a clearer screenshot.");
      }

      let extractedData: any = {};
      try {
        extractedData = JSON.parse(visionExtractionRaw);
      } catch {
        console.warn("Failed to parse chartData, using fallback defaults");
        extractedData = { recentOHLC: [], keyLevels: [], currentPrice: 0 };
      }

      // Calculate Math-Based Scores
      const ohlc = (extractedData.recentOHLC || []).map((c: any) => ({
        open: Number(c.open || 0),
        close: Number(c.close || 0),
        high: Number(c.high || 0),
        low: Number(c.low || 0)
      }));

      let bodies = extractedData.candleBodies || ohlc.map((c: any) => ({ open: c.open, close: c.close }));
      if (bodies.length > 0 && typeof bodies[0] === 'number') {
        bodies = bodies.map((b: number) => ({ open: 0, close: b }));
      }

      const j3Result = calculateZScoreSignificance(bodies);
      const boundaryResult = calculateBoundaryReversal(Number(extractedData.priceYPercent || 50));

      // --- NEW: Calculate Advanced Metrics from Vision Data ---
      let visionStructuralPriors = structuralPriors || "";
      let visionGeometricOracles = geometricOracles || "";
      
      const priceHistory = ohlc.map(c => c.close);
      if (priceHistory.length >= 10) {
        // BUILD A REAL LIQUIDITY MAP from keyLevels
        const liquidityMap: Record<number, number> = {};
        (extractedData.keyLevels || []).forEach((lvl: any) => {
          const l = Number(lvl);
          if (!isNaN(l)) {
            liquidityMap[l] = (liquidityMap[l] || 0) + 1;
          }
        });
        
        // Ensure there's at least some data if keyLevels is empty
        if (Object.keys(liquidityMap).length === 0) {
          liquidityMap[priceHistory[priceHistory.length - 1]] = 1;
          // Add a few points above and below to give the simulation room
          const range = Math.max(...priceHistory) - Math.min(...priceHistory) || priceHistory[0] * 0.01;
          liquidityMap[priceHistory[priceHistory.length - 1] + range * 0.02] = 0.5;
          liquidityMap[priceHistory[priceHistory.length - 1] - range * 0.02] = 0.5;
        }

        const cef = calculateCEF(priceHistory, liquidityMap);
        const cefDirSymbol = cef.predictedDirection === 'UP' ? '▲' : '▼';
        const cefConfidenceText = cef.confidence > 0.4 ? "Strongly Suggests" : (cef.confidence > 0.1 ? "Leans Toward" : "Neutral/Unclear (Ambiguous)");

        const volRegime = calculateVolatilityRegime(ohlc.map((c, i) => ({
          high: c.high, low: c.low, close: c.close, prevClose: ohlc[i-1]?.close || c.close
        })));
        const predictability = calculatePredictability(priceHistory);
        const robustness = calculateRobustness(priceHistory);
        
        const rqa = calculateRQA(priceHistory);
        const tda = calculatePersistentEntropy(priceHistory);
        const flow = calculateHamiltonianFlow(priceHistory[priceHistory.length-1], priceHistory[priceHistory.length-1] - (priceHistory[priceHistory.length-2] || priceHistory[priceHistory.length-1]));
        const perfectTrend = Array.from({ length: priceHistory.length }, (_, i) => priceHistory[0] + (priceHistory[priceHistory.length-1] - priceHistory[0]) * (i / (priceHistory.length - 1)));
        const wasserstein = calculateWassersteinSimilarity(priceHistory, perfectTrend);

        visionGeometricOracles = `
- Wasserstein Distance to Trend Prototype: ${wasserstein.toFixed(4)}
- RQA Determinism: ${(rqa.determinism * 100).toFixed(2)}%
- RQA Laminarity: ${(rqa.laminarity * 100).toFixed(2)}%
- Persistent Entropy (TDA): ${tda.entropy.toFixed(4)} (${tda.featureCount} features)
- Hamiltonian Flow (Next 3 steps): ${flow.slice(0, 3).map(f => f.toFixed(2)).join(', ')}
        `.trim();

        visionStructuralPriors = `
- Causal Entropic Force (CEF): ${cefDirSymbol} ${cef.predictedDirection} (${cefConfidenceText})
- CEF Confidence Score: ${(cef.confidence * 100).toFixed(2)}%
- Market Physics: Smart money ${cef.confidence > 0.1 ? `gravitating toward ${cef.predictedDirection === 'UP' ? 'higher' : 'lower'} liquidity` : 'is currently in a high-entropy state with no clear gravitational bias'}.
- Volatility Regime: ${volRegime.status} (Z-Score: ${volRegime.zScore.toFixed(2)})
- Predictability: ${predictability.type} (Ratio: ${predictability.ratios.combined?.toFixed(2)})
- Signal Robustness: ${(robustness.robustness * 100).toFixed(0)}% Stable
- Chart Boundary: ${boundaryResult.label} (Position: ${boundaryResult.yPercent.toFixed(1)}%)
        `.trim();
      }

      const statScoresContext = `
JUDGE 3 (Z-Score) Calculated: ${j3Result.zScore.toFixed(2)} -> Points: ${j3Result.points}/5.0
BOUNDARY REVERSAL BIAS: ${boundaryResult.label} -> Bull: +${boundaryResult.bullPoints.toFixed(1)}, Bear: +${boundaryResult.bearPoints.toFixed(1)}
`;

      // 2. Run Bull, Bear, and Skeptic in parallel
      const dataContext = `\nEXTRACTED CHART DATA (JSON):\n${visionExtractionRaw}${techContext}${binaryContext}`;

      const bullPrompt = BULL_PROMPT.replace('{{STRUCTURAL_PRIORS}}', visionStructuralPriors) + dataContext;
      const bearPrompt = BEAR_PROMPT.replace('{{STRUCTURAL_PRIORS}}', visionStructuralPriors) + dataContext;
      const skepticPrompt = SKEPTIC_PROMPT + `\nGEOMETRIC ORACLES: ${visionGeometricOracles}` + dataContext;

      // Parallelize core arguments (with allSettled for resilience)
      const agentResults = await Promise.allSettled([
        safeCall(bullPrompt),
        safeCall(bearPrompt),
        safeCall(skepticPrompt)
      ]);

      const bullRaw = agentResults[0].status === 'fulfilled' ? agentResults[0].value : null;
      const bearRaw = agentResults[1].status === 'fulfilled' ? agentResults[1].value : null;
      const skepticRaw = agentResults[2].status === 'fulfilled' ? agentResults[2].value : null;

      const parseResponse = (raw: string | null) => {
        if (!raw) return { reasoning: "Model call failed.", flippedSignal: "UNKNOWN", riskVerdict: "RISK UNKNOWN", riskProbability: 50 };
        try {
           // Advanced clean up: remove markdown then find the first { and last }
           const text = raw.replace(/```json|```/g, '').trim();
           const start = text.indexOf('{');
           const end = text.lastIndexOf('}');
           
           let jsonStr = text;
           if (start !== -1 && end !== -1) {
             jsonStr = text.substring(start, end + 1);
           }
           
           return JSON.parse(jsonStr);
        } catch {
           console.error("Parse failure on raw text:", (raw || "").substring(0, 100));
           // Try to find the winner manually as a last resort
           const winner = (raw || "").match(/winner["\s:]+["']?(BULL|BEAR|NO_TRADE)["']?/i)?.[1]?.toUpperCase();
           const signal = (raw || "").match(/signal["\s:]+["']?(CALL|PUT|NO TRADE)["']?/i)?.[1]?.toUpperCase();
           
           return { 
             reasoning: "Parsing failed, but extracted signal.", 
             winner: winner || "NO_TRADE", 
             tradeDetails: { signal: signal || "UNKNOWN" },
             flippedSignal: "UNKNOWN", 
             riskVerdict: "RISK UNKNOWN",
             riskProbability: 50
           };
        }
      };

      const bull = parseResponse(bullRaw);
      const bear = parseResponse(bearRaw);
      const skeptic = parseResponse(skepticRaw);

      // 3. Final Arbitrator Call
      const judgePrompt = JUDGE_PROMPT
        .replace('{{STRUCTURAL_PRIORS}}', visionStructuralPriors)
        .replace('{{TECHNIQUES}}', techContext)
        .replace('{{STAT_SCORES}}', statScoresContext)
        .replace('{{GEOMETRIC_ORACLES}}', visionGeometricOracles) + 
        `\n\nAGENT BULL ARGUMENT: ${bull.reasoning}\nBULL TECHNIQUES: ${bull.techniquesApplied?.join(', ') || 'None provided'}\n\nAGENT BEAR ARGUMENT: ${bear.reasoning}\nBEAR TECHNIQUES: ${bear.techniquesApplied?.join(', ') || 'None provided'}\n\nRISK ANALYST REPORT: ${skeptic.riskVerdict} (${skeptic.riskProbability}%)\n` + 
        dataContext + statsContext;

      const judgeRaw = await safeCall(judgePrompt);
      const judge = parseResponse(judgeRaw);

      // Count techniques explicitly listed by scanning the markdown list format
      const techUsed = judge.tradeDetails?.techniquesUsed || "";
      const techUsedCount = techUsed.split('\n').filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('*')).length;

      res.json({
        bull,
        bear,
        skeptic,
        mirror: { reasoning: "Mirror check disabled." },
        judge,
        techUsedCount,
        structuralPriors: visionStructuralPriors,
        geometricOracles: visionGeometricOracles
      });
    } catch (error: any) {
      console.error("Debate error:", error);
      res.status(500).json({ error: error.message || "Debate failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
  
  server.timeout = 180000;
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
