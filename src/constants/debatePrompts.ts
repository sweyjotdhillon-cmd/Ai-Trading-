export const BULL_PROMPT = `
Analyze this chart from a purely bullish perspective for an educational simulation. Your task is to build a logical LONG (CALL) case for this theoretical setup.
CRITICAL: AVOID GENERIC REASONING. If you provide a template-like answer that could apply to any chart, you have failed. 

BEHAVIORAL DIRECTIVE:
Every chart has a unique technical signature of volatility, wick behavior, and level respects. You MUST identify the specific behavioral pattern in this image (e.g., "The price consistently respects the EMA with pronounced lower wicks every 3 candles").

LATENCY COMPENSATION:
Account for a 90-second processing latency. Project momentum 1.5 minutes into the future analytically.

STRUCTURAL PRIORS:
{{STRUCTURAL_PRIORS}}

Segmental Context Check:
Temporarily ignore the last 3 candles. Does the macro structure still support a long? Now look at only the last 3 candles. Is momentum increasing?

Focus on:
- Specific candle evidence: Cite EXACT wick-to-body ratios and positions (e.g. "Candle #18 has a 70% lower wick").
- MANDATED TECHNIQUES: Scan the ENTIRE provided TECHNIQUES list. Select a MINIMUM of 5 techniques that are EXCEPTIONAL matches for the visual patterns seen. Cite each technique by its exact NAME.
- DIVERSITY REQUIREMENT: If you previously used a technique, only use it again if it is the MOST dominant feature. Prioritize discovering less-common patterns in the list if they are present.

Your response MUST be a JSON object:
{
  "reasoning": "Detailed bullish argument citing specific chart evidence",
  "techniquesApplied": ["Exact Name of Technique 1", "Exact Name of Technique 2", "Exact Name of Technique 3", "Exact Name of Technique 4", "Exact Name of Technique 5", "Exact Name of Technique 6 (Optional)", "Exact Name of Technique 7 (Optional)"],
  "confidence": number (0-100),
  "analysisResult": "How the signal holds up when analyzing parts of the chart separately"
}
`;

export const BEAR_PROMPT = `
Analyze this chart from a purely bearish perspective for an educational simulation. Your task is to build a logical SHORT (PUT) case for this theoretical setup.
CRITICAL: AVOID GENERIC REASONING. If you provide a template-like answer that could apply to any chart, you have failed. 

BEHAVIORAL DIRECTIVE:
Every chart has a unique technical signature of volatility, wick behavior, and level respects. You MUST identify the specific behavioral pattern in this image (e.g., "Resistance is being tested with increasing volume but decreasing candle size, suggesting exhaustion").

LATENCY COMPENSATION:
Account for a 90-second processing latency. Project momentum 1.5 minutes into the future analytically.

STRUCTURAL PRIORS:
{{STRUCTURAL_PRIORS}}

Segmental Context Check:
Temporarily ignore the last 3 candles. Does the macro structure still support a short? Now look at only the last 3 candles. Is momentum increasing?

Focus on:
- Specific candle evidence: Cite EXACT wick-to-body ratios and positions (e.g. "Candle #19 shows a heavy upper rejection at the 0.618 level").
- MANDATED TECHNIQUES: Scan the ENTIRE provided TECHNIQUES list. Select a MINIMUM of 5 techniques that are EXCEPTIONAL matches for the visual patterns seen. Cite each technique by its exact NAME.
- DIVERSITY REQUIREMENT: If you previously used a technique, only use it again if it is the MOST dominant feature. Prioritize discovering less-common patterns in the list if they are present.

Your response MUST be a JSON object:
{
  "reasoning": "Detailed bearish argument citing specific chart evidence",
  "techniquesApplied": ["Exact Name of Technique 1", "Exact Name of Technique 2", "Exact Name of Technique 3", "Exact Name of Technique 4", "Exact Name of Technique 5", "Exact Name of Technique 6 (Optional)", "Exact Name of Technique 7 (Optional)"],
  "confidence": number (0-100),
  "analysisResult": "How the signal holds up when analyzing parts of the chart separately"
}
`;

export const JUDGE_PROMPT = `
You are tasked with providing an objective evaluation of theoretical trade setups for an educational simulation. Your job is to determine the highest probability direction (UP or DOWN) based on the provided Comparative Scoring System.

─────────────────────────────────────
THE 4-METRIC SCORING CRITERIA
─────────────────────────────────────
JUDGE 1 — Argument Quality (Max: 5 pts)
JUDGE 2 — Context Alignment (Max: 5 pts)
JUDGE 3 — Statistical Z-Score (Max: 5 pts) - DATA PROVIDED
JUDGE 4 — Trend Reversal Boundary (Max: 2.5 pts) - DATA PROVIDED

CRITICAL: You MUST use the EXACT points provided in the "SCORING DATA PROVIDED" section for J3 and J4. 
Do not hallucinate or modify J3 or J4 points. If the data provides 0.0 for J4, you MUST use 0.0. 
For J1 and J2, do not award exactly 0.0 points.

─────────────────────────────────────
SCORING DATA PROVIDED:
─────────────────────────────────────
{{STAT_SCORES}}

STRUCTURAL PRIORS:
{{STRUCTURAL_PRIORS}}

MANDATED TECHNIQUES:
{{TECHNIQUES}}

GEOMETRIC & PHYSICAL ORACLES:
{{GEOMETRIC_ORACLES}}

─────────────────────────────────────
INHALATION & CONFLICT RESOLUTION (MANDATORY BALANCE)
─────────────────────────────────────
1. Calculate the hypothetical TOTAL SCORE for the BULL setup and BEAR setup individually (Max: 17.5 points).
2. Adjust for the Risk Assessment. If risk is high (>60%), you MUST remain extremely cautious.
3. The WINNER is the side with the HIGHER score after risk adjustments.
4. If BOTH scores (after risk adjustment) are below 9.0, the winner is "NO_TRADE".
5. If the winner is BULL, the signal MUST be "CALL". 
6. If the winner is BEAR, the signal MUST be "PUT".
7. BALANCE DIRECTIVE: Avoid favoring CALL signals solely based on macro trend. If there is no clear breakdown or breakthrough, prefer NO TRADE.
8. CONFIDENCE DIRECTIVE: If your 'finalConfidence' is less than 70%, you MUST return winner as 'NO_TRADE' and signal as 'NO TRADE'. High-quality signals require rigorous evidence.

─────────────────────────────────────
TECHNIQUE TRACKING (MANDATORY)
─────────────────────────────────────
You MUST aggregate the techniques generated by the Bull and Bear agents (specifically utilizing the BULL TECHNIQUES and BEAR TECHNIQUES lists passed in below). 
Overall, a MINIMUM of 10 combined techniques MUST be applied to truly validate this setup.
In your "techniquesUsed" field, you MUST create a comprehensive Markdown bulleted list grouping ALL techniques by the agent they support (e.g., BULL AGENT and BEAR AGENT). You MUST include a MINIMUM of 5 techniques for the Bull Agent and 5 techniques for the Bear Agent (Total 10 minimum).
You MUST use the exact technique NAMES and explicitly state which technique supports which agent. Do NOT use index numbers. If no techniques were provided in the context, output "No techniques provided."

ANTI-REPETITION MANDATE: 
Review the current analysis for any "Lazy Analysis" (using generalities like 'bullish momentum' without citing specific wick data). If the Bull and Bear agents used identical techniques, you MUST penalize their Argument Quality score (J1).

Your response MUST be a JSON object with this structure:
{
  "winner": "BULL" | "BEAR" | "NO_TRADE",
  "finalConfidence": number (0-100),
  "ruling": "Detailed explanation of why Case 1 scored higher than Case 2 (or vice versa), including how you integrated the Skeptic and Mirror results",
  "cases": {
    "bull": {
      "j1": number, "j2": number, "j3": number, "j4": number, "total": number
    },
    "bear": {
      "j1": number, "j2": number, "j3": number, "j4": number, "total": number
    }
  },
  "decision": "STRONG SIGNAL" | "MODERATE" | "NO TRADE",
  "reason": "Identify the critical cross-validation factor (Risk Analyst, Mirror, or Structural)",
  "formattedReport": "ASCII report showing CASE 1: BULL vs CASE 2: BEAR comparison",
  "tradeDetails": {
    "signal": "CALL" | "PUT" | "NO TRADE",
    "market": "CLEAN" | "FLAT" | "CHOPPY",
    "strength": "WEAK" | "MODERATE" | "STRONG",
    "entry": "NOW" | "WAIT",
    "probability": number,
    "suggestedTrades": number,
    "bigInsight": "One key takeaway from the winning case",
    "latencyAdjustedForecast": "Strict 1-sentence forecast projecting momentum exactly 90-seconds into the future from the frozen chart state to compensate for processing lag.",
    "techniquesUsed": "Markdown list string categorizing techniques by supporting agent (e.g., '\\n🐂 BULL SUPPORTING:\\n- Technique 1\\n- Technique 2\\n\\n🐻 BEAR SUPPORTING:\\n- Technique A\\n- Technique B'). Total MUST be minimum 10 techniques.",
    "entryPrice": "string",
    "takeProfit": "string",
    "stopLoss": "string"
  }
}

The "formattedReport" MUST look like this:
CASE 1: BULL        CASE 2: BEAR
J1: X/5             J1: X/5
J2: X/5             J2: X/5
J3: X/5             J3: X/5
J4: X/2.5           J4: X/2.5
─────────────       ─────────────
Adj. Total: T1/17.5 Adj. Total: T2/17.5

Decision: [Winner] ([Signal Type])
`;

export const SKEPTIC_PROMPT = `
Conduct a risk analysis on this chart for an educational simulation. Focus on identifying potential risks, resistance, and vulnerabilities in the trend.
Instead of evaluating the reward, ask "Why might this setup encounter resistance or change direction?".

Look for:
- Price-Action Rejections: Wicks at key levels.
- Momentum Fade: Declining volume on a trend.
- Geometric Deviation: High Wasserstein distance to the claimed technique prototype.
- Instability: High RQA entropy or low determinism.

Your response MUST be a JSON object:
{
  "riskProbability": number (0-100),
  "riskFactors": ["List of specific reasons why this trade might face challenges"],
  "riskVerdict": "Detailed reasoning focusing on risk and potential reversals"
}
`;

export const MIRROR_PROMPT = `
Analyze a HORIZONTALLY FLIPPED version of this theoretical trading chart.
Analyze the pattern and trend. 
Note: Because the chart is flipped, a "Bullish" pattern in reality will look "Bearish" here, and vice versa.
Provide your simulation prediction for this flipped chart.

Your response MUST be a JSON object:
{
  "flippedSignal": "CALL" | "PUT" | "NO_TRADE",
  "reasoning": "Brief technical reason"
}
`;

export const FAST_DEBATE_PROMPT = `
Perform a multi-perspective technical analysis of this chart in a single pass for an educational simulation.

STRUCTURAL PRIORS:
{{STRUCTURAL_PRIORS}}

GEOMETRIC & PHYSICAL ORACLES:
{{GEOMETRIC_ORACLES}}

You must analyze the chart from three perspectives:
1. BULL: Find the strongest case for a LONG (CALL). If techniques are provided in the context, you MUST use at least 5 of them as evidence, citing their exact NAMES without numbers.
2. BEAR: Find the strongest case for a SHORT (PUT). If techniques are provided in the context, you MUST use at least 5 of them as evidence, citing their exact NAMES without numbers.
3. RISK ANALYST: Identify the most likely risk scenarios and price-action anomalies.

Then, act as the JUDGE to provide a final verdict. Include the techniques used as a Markdown list in the "techniquesUsed" field without index numbers.
IMPORTANT: If your 'finalConfidence' is less than 70%, you MUST return winner as 'NO_TRADE' and signal as 'NO TRADE'.

Your response MUST be a JSON object:
{
  "bull": { "reasoning": "string", "techniquesApplied": ["string", "string", "string", "string", "string"], "confidence": number },
  "bear": { "reasoning": "string", "techniquesApplied": ["string", "string", "string", "string", "string"], "confidence": number },
  "riskAnalyst": { "riskVerdict": "string", "riskProbability": number },
  "judge": {
    "winner": "BULL" | "BEAR" | "NO_TRADE",
    "finalConfidence": number,
    "ruling": "string",
    "tradeDetails": {
      "signal": "CALL" | "PUT" | "NO TRADE",
      "market": "CLEAN" | "FLAT" | "CHOPPY",
      "strength": "WEAK" | "MODERATE" | "STRONG",
      "entry": "NOW" | "WAIT",
      "probability": number,
      "reason": "string",
      "suggestedTrades": number,
      "bigInsight": "string",
      "techniquesUsed": "string",
      "entryPrice": "string",
      "takeProfit": "string",
      "stopLoss": "string"
    }
  }
}
`;
