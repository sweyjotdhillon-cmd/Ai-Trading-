import express from "express";
import path from "path";
import cors from "cors";
import { Jimp } from "jimp";
import crypto from "crypto";
import admin from "firebase-admin";

// --- Firebase Admin init (verifies real ID tokens server-side) ---
if (!admin.apps.length) {
  // Using default credential, might need service account depending on env
  admin.initializeApp();
}

const ADMIN_EMAILS = new Set(['kveerpal681@gmail.com', 'aitradinggemini@gmail.com']);

/**
 * Verify a Firebase ID token from the Authorization header.
 * Returns the decoded token if valid and the email is an admin, otherwise throws.
 */
async function verifyAdminToken(authHeader: string | undefined): Promise<admin.auth.DecodedIdToken> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }
  const idToken = authHeader.slice(7);
  const decoded = await admin.auth().verifyIdToken(idToken);
  if (!ADMIN_EMAILS.has(decoded.email ?? '')) {
    throw new Error('Not an admin account');
  }
  return decoded;
}

const MASTER_KEY = crypto.scryptSync(process.env.BACKEND_ENCRYPTION_KEY || 'ai_trading_assistant_secret_salt_2026', 'salt', 32);

function encryptTokens(tokens: string[]): string {
  const text = JSON.stringify(tokens);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', MASTER_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptTokens(encryptedText: string): string[] {
  if (!encryptedText) return [];
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encrypted = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', MASTER_KEY, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString());
  } catch (e) {
    console.error("Token decryption failed", e);
    return [];
  }
}

// Token cycle manager per request
class TokenManager {
  private tokens: string[] = [];
  private currentIndex: number = 0;
  
  constructor(encryptedString?: string) {
    if (encryptedString) {
      this.tokens = decryptTokens(encryptedString);
    }
  }
  
  getNext(): string | undefined {
    if (this.tokens.length === 0) return process.env.GITHUB_TOKEN;
    const token = this.tokens[this.currentIndex % this.tokens.length];
    this.currentIndex++;
    return token;
  }
  
  hasTokens(): boolean {
    return this.tokens.length > 0;
  }
}


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
  calculateBoundaryReversal
} from "./src/utils/mathEngine.ts";

import { BULL_PROMPT, BEAR_PROMPT, JUDGE_PROMPT, SKEPTIC_PROMPT } from "./src/constants/debatePrompts.ts";

async function callModel(params: {
  model: string,
  prompt: string,
  image?: string,
  userApiKey?: string,
  userEndpoint?: string,
  jsonMode?: boolean,
  tokenManager: TokenManager
}) {
  let currentApiKey = params.userApiKey || params.tokenManager.getNext();
  if (!currentApiKey) throw new Error("GitHub Token is missing. Please add it in Settings.");

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

  let networkRetries = 2; // General fetch errors
  let rateLimitRetries = 6; // Increased specifically for GitHub burst limits
  let delay = 3000;

  while (networkRetries >= 0 && rateLimitRetries >= 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s per individual call limit
    try {
      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
             "Authorization": `Bearer ${currentApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      );

    if (response.status === 429) {
      if (rateLimitRetries === 0) {
        throw new Error(`GitHub Models API Rate Limit Exceeded (429) after all retries. Please wait 30+ seconds.`);
      }
      
      // If we don't have a user API key and there are multiple system tokens, cycle the token
      if (!params.userApiKey && params.tokenManager.hasTokens()) {
         console.warn(`Rate limited (429). Switching to next system API token...`);
         currentApiKey = params.tokenManager.getNext();
         if (!currentApiKey) throw new Error("No available GitHub tokens to rotate to.");
         // When rotating, try immediately with minimal jitter
         const jitter = 500 + Math.floor(Math.random() * 500);
         await new Promise(resolve => setTimeout(resolve, jitter));
      } else {
         const jitter = 1000 + Math.floor(Math.random() * 3000);
         const totalDelay = Math.min(delay + jitter, 30000); // Cap retry delay at 30 seconds
         console.warn(`Rate limited (429). Retrying in ${totalDelay}ms... (${rateLimitRetries} retries left)`);
         await new Promise(resolve => setTimeout(resolve, totalDelay));
         delay *= 1.5; 
      }
      rateLimitRetries--;
      continue;
    }

    if (!response.ok) {
      const errText = await response.text();
      let errorJson;
      try { errorJson = JSON.parse(errText); } catch { /* ignore parse error */ }
      const msg = errorJson?.error?.message || errorJson?.error || errText || response.statusText;
      console.error(`GitHub API Error (${response.status}):`, msg);
      
      // If it's a 4xx error (other than 429), don't retry as it's likely a permanent error (e.g. bad prompt/image)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`GitHub Models API Error: ${msg}`);
      }
      
      // For 5xx errors, allow falling through to catch block for network retry
      throw new Error(`GitHub Models API Temporary Error (${response.status}): ${msg}`);
    }

    const result = await response.json();
    return result.choices[0].message.content || "";
    } catch (err: any) {
      const msg = err?.message || "";
      
      // If the error was explicitly thrown as a persistent 429 or 4xx, rethrow it without using networkRetries
      if (msg.includes("Rate Limit Exceeded") || msg.includes("API Error:")) {
        throw err;
      }

      if (err.name === 'AbortError' || msg.includes('aborted') || msg.includes('abort')) {
        throw new Error("GitHub Models API Request Timed Out (60s call limit reached).");
      }

      if (networkRetries === 0) {
        throw err;
      }
      console.warn(`System noise/Fetch error, retrying (${networkRetries} left):`, err.message);
      // Wait longer for non-429 errors
      await new Promise(resolve => setTimeout(resolve, delay * 2));
      networkRetries--;
      delay *= 1.5;
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  return "";
}

const VISION_EXTRACTION_PROMPT = `
You are an expert financial chart OCR and analysis tool. Analyze the provided candlestick chart with extreme scrutiny. 
Your primary task is to extract high-precision numerical data AND qualitative context for mathematical behavior analysis.

Respond ONLY with a valid JSON object matching this structure exactly:
{
  "recentOHLC": [
    {"index": 0, "open": numeric, "high": numeric, "low": numeric, "close": numeric, "volume_relative": "low|medium|high"}
  ],
  "candleBodies": [list_of_20_approx_body_sizes_in_pixels],
  "currentPrice": numeric_value,
  "priceYPercent": "numeric_percentage_0_to_100 (0 means price is at the very bottom of the chart image, 100 means price is at the very top of the chart image)",
  "keyLevels": [balance_of_supports_and_resistances],
  "marketStage": "ACCUMULATION|TRENDING_UP|DISTRIBUTION|TRENDING_DOWN|VOLATILE_RANGE",
  "anomalyDetected": "string_describing_any_weird_wicks_or_gaps",
  "trendStrength": number_0_to_100,
  "dominantColor": "GREEN|RED|MIXED",
  "priceActionContext": "Detailed description of the LAST 5 candles and their relation to the previous 15"
}

CRITICAL: Do not generalize. If the chart is messy, say it is messy in 'marketStage'. If one candle is 5x bigger than others, note it in 'anomalyDetected'.
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
  
  // Exception limit for high-bandwidth endpoints like image analysis
  app.use('/api/debate', express.json({ limit: '50mb' }));
  app.use('/api/debate', express.urlencoded({ limit: '50mb', extended: true }));

  // Apply a standard 2mb limit globally to prevent broad DoS
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    res.json({ 
      hasFirebase: true, 
      serverStatus: "ok"
    });
  });

  app.post("/api/admin/secrets/encrypt", async (req, res) => {
    try {
      await verifyAdminToken(req.headers['authorization'] as string | undefined);
    } catch (e: any) {
      return res.status(403).json({ error: "Unauthorized: " + e.message });
    }
    const { tokens } = req.body;
    if (Array.isArray(tokens)) {
      res.json({ success: true, encryptedTokens: encryptTokens(tokens) });
    } else {
      res.status(400).json({ error: "Invalid tokens payload" });
    }
  });

  app.post("/api/admin/secrets/decrypt", async (req, res) => {
    try {
      await verifyAdminToken(req.headers['authorization'] as string | undefined);
    } catch (e: any) {
      return res.status(403).json({ error: "Unauthorized: " + e.message });
    }
    const { encryptedTokens } = req.body;
    res.json({ tokens: decryptTokens(encryptedTokens) });
  });

  app.post("/api/pre-analysis", async (req, res) => {
    const { priceHistory, correlatedAssets, liquidityMap } = req.body;
    
    try {
      // 1. Structural Priors (CEF & Transfer Entropy)
      let structuralPriors = "No structural data provided.";
      let geometricOracles = "No geometric data provided.";
      let marketGates = {
        volatility: { status: 'UNKNOWN', zScore: 0 },
        predictability: { isPredictable: false, type: 'UNKNOWN' },
        robustness: { robustness: 0, isStable: false }
      };

      if (priceHistory && priceHistory.length > 0) {
        const cef = calculateCEF(priceHistory, liquidityMap || { [priceHistory[priceHistory.length-1]]: 1 });
        
        // Judge 1 & 2 structural analysis

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
        marketGates
      });

    } catch (error: any) {
      console.error("Pre-analysis error:", error);
      res.status(500).json({ error: error.message || "Pre-analysis failed" });
    }
  });

  app.post("/api/debate", async (req, res) => {
    const bodySize = JSON.stringify(req.body).length;
    console.log(`[API] Received debate request at ${new Date().toISOString()} - Approx Size: ${(bodySize / 1024 / 1024).toFixed(2)}MB`);
    const { image, symbol, timeframe, investment, structuralPriors, geometricOracles, techniqueData, statsData, encryptedSystemTokens } = req.body;
    const tokenManager = new TokenManager(encryptedSystemTokens);
    
    if (!image) {
      console.error("[API] Missing image in request body");
      return res.status(400).json({ error: "Missing image data" });
    }
    
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
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const jimpImage = await Jimp.read(buffer);
        console.log(`[API] Jimp processing: ${jimpImage.bitmap.width}x${jimpImage.bitmap.height}`);
        
        // Resize if too large
        if (jimpImage.bitmap.width > 1024 || jimpImage.bitmap.height > 1024) {
          jimpImage.scaleToFit(1024, 1024);
        }

        // Jimp v0.x / 1.x compatibility
        const compressedImage = await jimpImage.getBufferAsync("image/jpeg");
        optimizedBase64 = compressedImage.toString('base64');
        console.log(`[API] Image optimization complete`);
      } catch (jimpErr: any) {
        console.error("[API] Jimp optimization failed, using original:", jimpErr.message);
        optimizedBase64 = image.replace(/^data:image\/\w+;base64,/, "");
      }

      // Helper function for serial model calls with timeout and model fallback
      const safeCall = async (prompt: string, img?: string, json: boolean = true, highReasoning: boolean = false) => {
        // Fallback chain for vision vs reasoning
        const modelChain = highReasoning 
          ? ["gpt-4o", "gpt-4o-mini", "Llama-3.2-90B-Vision-Instruct"] 
          : ["gpt-4o-mini", "Llama-3.2-90B-Vision-Instruct", "gpt-4o"];

        let lastError = "";

        for (const modelName of modelChain) {
          try {
            const raw = await callModel({ 
              model: modelName, 
              prompt, 
              image: img, 
              jsonMode: json,
              tokenManager
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
            // Immediately try fallback model without long artificial wait
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

      let bodies = extractedData.candleBodies || [];
      if (bodies.length > 0 && typeof bodies[0] === 'number') {
        bodies = bodies.map((b: number) => ({ open: 0, close: b, high: b, low: 0 }));
      }
      
      const boundaryResult = calculateBoundaryReversal(Number(extractedData.priceYPercent || 50), ohlc);

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
JUDGE 4 (Boundary Reversal) Bias: ${boundaryResult.label} -> ALREADY CALCULATED POINTS: Bull Gets +${boundaryResult.bullPoints.toFixed(1)}, Bear Gets +${boundaryResult.bearPoints.toFixed(1)}
`;

      // 2. Run Bull, Bear, and Skeptic in parallel
      const dataContext = `\nEXTRACTED CHART DATA (JSON):\n${visionExtractionRaw}${techContext}${binaryContext}`;
      const isHighReq = true;

      const bullPrompt = BULL_PROMPT.replace('{{STRUCTURAL_PRIORS}}', visionStructuralPriors) + dataContext;
      const bearPrompt = BEAR_PROMPT.replace('{{STRUCTURAL_PRIORS}}', visionStructuralPriors) + dataContext;
      const skepticPrompt = SKEPTIC_PROMPT + `\nGEOMETRIC ORACLES: ${visionGeometricOracles}` + dataContext;

      // Parallelize core arguments with INCREASED STAGGERED starts to avoid burst rate limits
      const agentResults = await Promise.allSettled([
        (async () => {
          try {
            return await safeCall(bullPrompt, undefined, true, isHighReq);
          } catch (e) {
            console.error("[DEBATE] Bull Agent failed permanently:", e);
            return null;
          }
        })(),
        (async () => {
          try {
            await new Promise(r => setTimeout(r, 6000)); // 6s stagger
            return await safeCall(bearPrompt, undefined, true, isHighReq);
          } catch (e) {
            console.error("[DEBATE] Bear Agent failed permanently:", e);
            return null;
          }
        })(),
        (async () => {
          try {
            await new Promise(r => setTimeout(r, 12000)); // 12s stagger
            return await safeCall(skepticPrompt, undefined, true, isHighReq);
          } catch (e) {
            console.error("[DEBATE] Skeptic Agent failed permanently:", e);
            return null;
          }
        })()
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

      const judgeRaw = await safeCall(judgePrompt, undefined, true, true);
      const judge = parseResponse(judgeRaw);

      // ENFORCE MATHEMATICAL CONSISTENCY
      // If the LLM declared a winner that actually has a lower score, we correct it to match the math.
      if (judge && judge.cases && (judge.winner === 'BULL' || judge.winner === 'BEAR')) {
        const calculateTotal = (data: any) => {
          return Number(data.j1 || 0) + Number(data.j2 || 0) + Number(data.j4 || 0);
        };

        const bullComputed = calculateTotal(judge.cases.bull);
        const bearComputed = calculateTotal(judge.cases.bear);
        
        // Update totals to be accurate
        if (judge.cases.bull) judge.cases.bull.total = bullComputed;
        if (judge.cases.bear) judge.cases.bear.total = bearComputed;

        if (judge.winner === 'BULL' && bearComputed > bullComputed) {
           console.warn(`[ARBITRATOR] Inconsistency corrected: BEAR (${bearComputed}) > BULL (${bullComputed}) but LLM chose BULL. Swapping winner to BEAR.`);
           judge.winner = 'BEAR';
           if (judge.tradeDetails) judge.tradeDetails.signal = 'PUT';
        } else if (judge.winner === 'BEAR' && bullComputed > bearComputed) {
           console.warn(`[ARBITRATOR] Inconsistency corrected: BULL (${bullComputed}) > BEAR (${bearComputed}) but LLM chose BEAR. Swapping winner to BULL.`);
           judge.winner = 'BULL';
           if (judge.tradeDetails) judge.tradeDetails.signal = 'CALL';
        }
      }

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

  app.post("/api/scout", async (req, res) => {
    try {
      const { image, anchorThesis, encryptedSystemTokens } = req.body;
      const tokenManager = new TokenManager(encryptedSystemTokens);
      if (!image || !anchorThesis) return res.status(400).json({ error: "Missing image or thesis" });
      
      const prompt = `
      Perform a precision analysis of the micro-movements on the right edge of this chart.
      
      ANCHOR THESIS:
      ${anchorThesis}
      
      CRITICAL FOCUS:
      - Detect "Micro-Noise": Is the price wiggling indecisively? 
      - Detect "Late Candle Weakness": Are wicks forming against the thesis?
      - Detect "Opposite Spikes": Is there a sudden counter-move?
      
      ACTIONS:
      - "ABORT": Thesis is invalidated by a strong opposite move or spike.
      - "WAIT": Conditions are noisy/volatile; wait for the current candle to settle before entry.
      - "BUILD": Price action perfectly confirms thesis with strong momentum.
      - "HOLD": Neutral but still valid.
      - "EXIT": Trend is slowing down, prepare to wrap up.

      Respond ONLY with a valid JSON object:
      {
        "action": "ABORT" | "WAIT" | "BUILD" | "HOLD" | "EXIT",
        "reason": "1 short sentence explaining why (e.g., 'Late wick forming', 'Indecisive noise')"
      }
      `;

      // We use the faster mini model for scouting to reduce latency
      const rawResponse = await callModel({
        model: "gpt-4o-mini",
        prompt,
        image,
        jsonMode: true,
        tokenManager
      });

      if (!rawResponse) {
        throw new Error("Scout model returned empty response");
      }

      let cleanRaw = rawResponse.replace(/```json|```/g, '').trim();
      const start = cleanRaw.indexOf('{');
      const end = cleanRaw.lastIndexOf('}');
      if (start !== -1 && end !== -1) cleanRaw = cleanRaw.substring(start, end + 1);

      try {
        res.json(JSON.parse(cleanRaw));
      } catch {
        console.error("Scout JSON parse failed:", cleanRaw);
        res.json({ action: "HOLD", reason: "Analysis temporarily unavailable (Syncing...)" });
      }
    } catch (error: any) {
      console.error("Scout error:", error);
      res.status(500).json({ error: "Scout processing failed", details: error.message });
    }
  });

  app.post("/api/autopsy", async (req, res) => {
    try {
      const { image, debateData, tradeSignal, encryptedSystemTokens } = req.body;
      const tokenManager = new TokenManager(encryptedSystemTokens);
      if (!image || !debateData) return res.status(400).json({ error: "Missing inputs" });
      
      const prompt = `
You are a forensic trading analyst. A binary options signal was given but the actual market moved in the OPPOSITE direction — this is a confirmed LOSS. Your job is to identify EXACTLY what caused this failure.

You will receive:
1. The original signal data (JSON below).
2. A screenshot of the real chart showing what actually happened after the signal.

ANALYZE the result image carefully. Then cross-examine every layer of the signal pipeline.

YOUR TASK: Diagnose the failure across these 7 categories. For each, output a severity score (0 = not a factor, 1 = minor, 2 = moderate, 3 = critical) and a specific explanation.

CATEGORY 1 — VISION EXTRACTION ERROR
Did the LLM misread the chart? Check if the extracted OHLC data or key levels look inconsistent with what you see in the result image. Signs: candle directions wrong, price levels implausible, key levels missing obvious support/resistance.
Severity: 0-3. Explanation: [specific evidence]

CATEGORY 2 — CEF / MATH ORACLE MISFIRE
Was the Causal Entropic Force (CEF) direction wrong? Did the Hamiltonian Flow predict the wrong momentum? Was Wasserstein Distance misleadingly low? Was RQA Determinism high but the market broke structure anyway?
Severity: 0-3. Explanation: [specific evidence]

CATEGORY 3 — J4 BOUNDARY REVERSAL ERROR
Was the J4 boundary score misleading? If J4 gave points to the wrong side based on price Y-position, and the price actually reversed in that direction, J4 was working against the signal.
Severity: 0-3. Explanation: [specific evidence]

CATEGORY 4 — JUDGE SCORING BIAS (J1/J2)
Did the Judge over-score J1 or J2 for the winning side? Were the argument quality or context alignment scores inflated despite the bear/bull case being weak? Did the Arbitrator have to correct the LLM (indicating score inconsistency)?
Severity: 0-3. Explanation: [specific evidence]

CATEGORY 5 — AGENT ARGUMENT WEAKNESS
Did the winning agent (Bull or Bear) use generic reasoning? Did it fail to cite specific candle evidence? Did the Skeptic assign a low riskProbability when the real risk was clearly there? Did both agents use overlapping techniques (lazy analysis)?
Severity: 0-3. Explanation: [specific evidence]

CATEGORY 6 — MARKET CONDITION MISMATCH
Was the market actually FLAT/CHOPPY and a NO_TRADE should have been called? Did the judge report market as CLEAN when volatility was low? Was confidence just barely above 70% (borderline trade that shouldn't have been taken)?
Severity: 0-3. Explanation: [specific evidence]

CATEGORY 7 — LATENCY / TIMING MISMATCH
Did the 90-second latency-adjusted forecast correctly identify direction but the actual result window was different? Was the entry timing (NOW vs WAIT) wrong relative to what the real chart shows?
Severity: 0-3. Explanation: [specific evidence]

---

PRIMARY ROOT CAUSE: Identify the 1–2 categories with the highest severity as the PRIMARY cause of this loss.

SYSTEM RECOMMENDATION: Based on the primary cause, give ONE specific, actionable recommendation for improving the pipeline. Be concrete — name the exact function, prompt section, or agent that needs to change.

OUTPUT FORMAT — Respond ONLY with this JSON, no preamble:
{
  "tradeSignal": "${tradeSignal}",
  "actualOutcome": "Brief description of what price actually did",
  "categories": {
    "visionExtraction": { "severity": 0, "label": "Vision Extraction", "explanation": "..." },
    "mathOracleMisfire": { "severity": 0, "label": "Math Oracle Misfire", "explanation": "..." },
    "j4BoundaryError": { "severity": 0, "label": "J4 Boundary Error", "explanation": "..." },
    "judgeScoringBias": { "severity": 0, "label": "Judge Scoring Bias", "explanation": "..." },
    "agentArgumentWeakness": { "severity": 0, "label": "Agent Argument Weakness", "explanation": "..." },
    "marketConditionMismatch": { "severity": 0, "label": "Market Condition Mismatch", "explanation": "..." },
    "latencyTimingMismatch": { "severity": 0, "label": "Latency Timing Mismatch", "explanation": "..." }
  },
  "primaryRootCause": ["visionExtraction"],
  "systemRecommendation": "One specific actionable fix naming the exact component/function/prompt section",
  "autopsyVerdict": "2–3 sentence plain English summary of what went wrong and why"
}

---
ORIGINAL DEBATE DATA:
${JSON.stringify(debateData, null, 2)}

JUDGE DECISION STEPS (context for judging reasoning):
1. Receives: Bull reasoning + techniques, Bear reasoning + techniques, Skeptic risk report, J4 fixed points (pre-calculated from boundary math), Structural Priors, Geometric Oracles.
2. Scores J1 (Argument Quality, max 4): Awards points based on specificity of candle evidence, technique diversity, and absence of generic reasoning.
3. Scores J2 (Context Alignment, max 4): Awards points based on how well the winning argument aligns with the structural priors.
4. Uses J4 as given (pre-calculated fixed points).
5. Adds totals: J1 + J2 + J4 = total (max 11).
6. Checks: if BOTH sides < 6.5 -> NO_TRADE. If finalConfidence < 70% -> NO_TRADE.
7. Picks the higher total as winner -> CALL (Bull) or PUT (Bear).
8. Arbitrator post-check: if LLM winner has lower score, override to match math.
`;

      const rawResponse = await callModel({
        model: "gpt-4o",
        prompt,
        image,
        jsonMode: true,
        tokenManager
      });

      if (!rawResponse) throw new Error("Empty response from AI");
      
      let cleanRaw = rawResponse.replace(/```json|```/g, '').trim();
      const start = cleanRaw.indexOf('{');
      const end = cleanRaw.lastIndexOf('}');
      if (start !== -1 && end !== -1) cleanRaw = cleanRaw.substring(start, end + 1);

      res.json(JSON.parse(cleanRaw));
    } catch (error: any) {
      console.error("Autopsy error:", error);
      res.status(500).json({ error: "Autopsy failed", details: error.message });
    }
  });

  app.post("/api/log-autopsy", async (req, res) => {
    try {
      console.log("[Sheety Log Mock] Received autopsy log:", req.body);
      // Mocking sheety response
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Catch-all for unhandled API routes to prevent fallback to HTML index
  app.all("/api/*all", (req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found on this server.` });
  });

  // Global Error Handler (Keep at bottom of API routes, before Vite/Static)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Server Error:", err);
    if (err instanceof SyntaxError && 'status' in err && 'body' in err) {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }
    res.status(err.status || 500).json({ 
      error: err.message || "Internal Server Error",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath);
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
  
  // Dramatically increase Node timeouts to prevent "Failed to fetch" socket hangups.
  // The frontend will gracefully abort at 300s, so the backend should comfortably outlast that.
  server.timeout = 360000;
  server.keepAliveTimeout = 360000;
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
