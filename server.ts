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
  calculatePLR
} from "./src/utils/mathEngine.ts";

import { BULL_PROMPT, BEAR_PROMPT, JUDGE_PROMPT, MIRROR_PROMPT, SKEPTIC_PROMPT } from "./src/constants/debatePrompts.ts";

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

  let retries = 10;
  let delay = 2500;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  while (retries >= 0) {
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
      clearTimeout(timeoutId);

    if (response.status === 429) {
      if (retries === 0) {
        throw new Error("GitHub Models API Rate Limit Exceeded after 10 retries.");
      }
      // Add random jitter between 0 and 1000ms to prevent synchronized retries
      const jitter = Math.floor(Math.random() * 1500);
      const totalDelay = delay + jitter;
      console.warn(`Rate limited (429). Retrying in ${totalDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
      retries--;
      delay *= 1.8; // Exponential backoff
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
  "keyLevels": [list_of_numeric_values],
  "avgBodyHeight": numeric_value,
  "volumeAnomalies": "string",
  "visibleTrend": "string",
  "priceActionContext": "string"
}
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
      let judge4 = null;
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
        
        // Judge 4: PLR
        const levels = liquidityMap ? Object.keys(liquidityMap).map(Number) : [];
        judge4 = calculatePLR(priceHistory[priceHistory.length-1], levels, candles);

        // New Gates
        const volRegime = calculateVolatilityRegime(priceHistory.map((p: number, i: number) => ({
          high: p, low: p, close: p, prevClose: priceHistory[i-1] || p
        })));
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
        judge4,
        marketGates
      });

    } catch (error: any) {
      console.error("Pre-analysis error:", error);
      res.status(500).json({ error: error.message || "Pre-analysis failed" });
    }
  });

  app.post("/api/debate", async (req, res) => {
    const { image, timeframe, investment, structuralPriors, geometricOracles, githubToken, githubEndpoint, techniqueData, statsData } = req.body;
    
    const selectedVisionModel = "Llama-3.2-90B-Vision-Instruct"; 
    const selectedReasoningModel = "Llama-3.2-90B-Vision-Instruct";
    
    const finalApiKey = githubToken || process.env.GITHUB_TOKEN;
    const finalEndpoint = githubEndpoint || process.env.GITHUB_API_BASE_URL;

    // session context
    const binaryContext = `\nESSENTIAL BINARY CONTEXT:\nGraph Timeframe: ${timeframe}\nInvestment Duration: ${investment?.duration}\nInvestment Amount: $${investment?.amount}\n`;
    const techContext = techniqueData && Array.isArray(techniqueData) 
      ? `\nMANDATED TECHNIQUES TO USE:\n${techniqueData.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : (techniqueData ? `\nMANDATED TECHNIQUES TO USE:\n${JSON.stringify(techniqueData, null, 2)}` : "None specific provided.");
    const statsContext = statsData ? `\nPREVIOUS TRADING STATS FOR CONTINUITY:\n${JSON.stringify(statsData, null, 2)}` : "";

    try {
      // Create flipped image on the fly and optimize both images for VISION
      const buffer = Buffer.from(image, 'base64');
      const jimpImage = await Jimp.read(buffer);
      
      // Resize to a max dimension to speed up vision processing (most models prefer ~1024)
      if (jimpImage.width > 1200 || jimpImage.height > 1200) {
        jimpImage.contain({ w: 1024, h: 1024 });
      }

      const compressedImage = await jimpImage.getBuffer("image/jpeg", { quality: 50 });
      const optimizedBase64 = compressedImage.toString('base64');

      const flippedBuffer = await jimpImage.flip({ horizontal: true, vertical: false }).getBuffer("image/jpeg", { quality: 50 });
      const flippedImage = flippedBuffer.toString('base64');

      // Helper function for serial model calls with timeout
      const safeCall = async (prompt: string, img?: string, json: boolean = true) => {
        try {
          const raw = await callModel({ 
            model: selectedReasoningModel, 
            prompt, 
            image: img, 
            userApiKey: finalApiKey, 
            userEndpoint: finalEndpoint, 
            jsonMode: json 
          });
          return raw.replace(/```json|```/g, '').trim();
        } catch (e: any) {
          console.error("Internal model call failed:", e.message);
          return null;
        }
      };

      // 1. Vision Extractions
      const visionExtractionRaw = await safeCall(VISION_EXTRACTION_PROMPT, optimizedBase64);
      await new Promise(r => setTimeout(r, 600));
      const mirrorExtractionRaw = await safeCall(VISION_EXTRACTION_PROMPT, flippedImage);

      const chartData = visionExtractionRaw || "{}";
      const mirrorChartData = mirrorExtractionRaw || "{}";

      if (!visionExtractionRaw) throw new Error("Chart perception failed. The image might be too complex or the API is unresponsive.");

      let extractedData: any = {};
      try {
        extractedData = JSON.parse(chartData);
      } catch (e) {
        console.error("Failed to parse chartData for math:", e);
      }

      // Calculate Math-Based Scores for Judges 3 and 4
      const ohlc = (extractedData.recentOHLC || []).map((c: any) => ({
        open: Number(c.open || 0),
        close: Number(c.close || 0),
        high: Number(c.high || 0),
        low: Number(c.low || 0)
      }));

      // Use candleBodies if available, otherwise fallback to OHLC bodies
      let bodies = extractedData.candleBodies || ohlc.map((c: any) => ({ open: c.open, close: c.close }));
      if (typeof bodies[0] === 'number') {
        bodies = bodies.map((b: number) => ({ open: 0, close: b }));
      }

      const j3Result = calculateZScoreSignificance(bodies);
      const j4Result = calculatePLR(Number(extractedData.currentPrice || 0), (extractedData.keyLevels || []).map(Number), ohlc);

      const statScoresContext = `
JUDGE 3 (Z-Score) Calculated: ${j3Result.zScore.toFixed(2)} -> Points: ${j3Result.points}/2.5
JUDGE 4 (PLR) Calculated: ${j4Result.plr.toFixed(2)} -> Points: ${j4Result.points}/2.5
`;

      // 2. Run Bull, Bear, Skeptic and Mirror in serial to avoid 429 concurrency blocks from free endpoints
      const dataContext = `\nEXTRACTED CHART DATA (JSON):\n${chartData}${techContext}${binaryContext}`;
      const mirrorDataContext = `\nEXTRACTED FLIPPED CHART DATA (JSON):\n${mirrorChartData}${techContext}${binaryContext}`;

      const bullPrompt = BULL_PROMPT.replace('{{STRUCTURAL_PRIORS}}', structuralPriors) + dataContext;
      const bearPrompt = BEAR_PROMPT.replace('{{STRUCTURAL_PRIORS}}', structuralPriors) + dataContext;
      const skepticPrompt = SKEPTIC_PROMPT + `\nGEOMETRIC ORACLES: ${geometricOracles}` + dataContext;
      const mirrorPrompt = MIRROR_PROMPT + mirrorDataContext + `\n\nAnalyze the data extracted from the horizontally flipped version of the chart. Output the signal as if interpreting a standard chart, returning ONLY valid JSON.`;

      // Run sequentially with minimal fixed gap, letting callModel retry logic handle 429 overlap
      const bullRaw = await safeCall(bullPrompt);
      await new Promise(r => setTimeout(r, 500));
      const bearRaw = await safeCall(bearPrompt);
      await new Promise(r => setTimeout(r, 500));
      const skepticRaw = await safeCall(skepticPrompt);
      await new Promise(r => setTimeout(r, 500));
      const mirrorRaw = await safeCall(mirrorPrompt);

      const parseResponse = (raw: string | null) => {
        if (!raw) return { reasoning: "Model call failed.", flippedSignal: "UNKNOWN", skepticVerdict: "RISK UNKNOWN" };
        try {
           return JSON.parse(raw);
        } catch {
           console.error("Failed to parse JSON response:", raw);
           return { reasoning: "Parsing failed.", flippedSignal: "UNKNOWN", skepticVerdict: "RISK UNKNOWN" };
        }
      };

      const bull = parseResponse(bullRaw);
      const bear = parseResponse(bearRaw);
      const skeptic = parseResponse(skepticRaw);
      const mirror = parseResponse(mirrorRaw);

      // 3. Run Judge
      await new Promise(r => setTimeout(r, 800));
      const judgePrompt = JUDGE_PROMPT
        .replace('{{STRUCTURAL_PRIORS}}', structuralPriors)
        .replace('{{TECHNIQUES}}', techContext)
        .replace('{{STAT_SCORES}}', statScoresContext)
        .replace('{{GEOMETRIC_ORACLES}}', geometricOracles) + 
        `\n\nAGENT BULL ARGUMENT: ${bull.reasoning}\n\nAGENT BEAR ARGUMENT: ${bear.reasoning}\n\nMIRROR TEST RESULT: ${mirror.flippedSignal} (${mirror.reasoning})\n\nSKEPTIC FAILURE ANALYSIS: ${skeptic.skepticVerdict} (${skeptic.failureProbability}%)\n` + 
        dataContext + statsContext;

      const judgeRaw = await safeCall(judgePrompt);
      const judge = parseResponse(judgeRaw);

      // Count techniques identified (looking for #X pattern)
      const techUsed = judge.tradeDetails?.techniquesUsed || "";
      const techUsedMatch = techUsed.match(/#\d+/g);
      const techUsedCount = techUsedMatch ? [...new Set(techUsedMatch)].length : 0;

      res.json({
        bull,
        bear,
        skeptic,
        mirror,
        judge,
        techUsedCount
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
