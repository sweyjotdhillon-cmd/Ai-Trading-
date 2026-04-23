<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Trading Assistant — Multi-Agent Market Intelligence Terminal

A full-stack, vision-first trading analysis system that ingests chart screenshots (camera/upload), extracts structured market state, computes quantitative market physics signals, and runs a multi-agent debate (Bull/Bear/Skeptic/Judge) to produce a final execution verdict.

---

## 1) System Overview

This application combines three decision layers into a single inference pipeline:

1. **Perception Layer (Vision/OCR+Context)**
   - Converts chart image input into structured JSON (`recentOHLC`, `keyLevels`, `priceYPercent`, `marketStage`, anomalies, trend metadata).
2. **Quant Layer (Math Engine)**
   - Generates deterministic priors and gate metrics (CEF, transfer entropy, volatility regime, predictability, robustness, RQA, TDA entropy, Wasserstein similarity, Hamiltonian flow, z-score significance, boundary reversal).
3. **Reasoning Layer (Multi-Agent Adversarial Debate)**
   - Bull and Bear construct opposite theses, Skeptic stress-tests risk, and a final Judge arbitrates into a single trade directive with rationale.

The result is a **hybrid symbolic + statistical + LLM reasoning engine** optimized for fast discretionary trading workflows.

---

## 2) High-Level Architecture

```text
[React Native Web UI]
   |  camera/upload + user context + optional techniques/stats
   v
[Express API Gateway]
   |- /api/pre-analysis  -> deterministic market priors from numeric history
   |- /api/debate        -> vision extraction + multi-agent debate + final verdict
   |- /api/scout         -> 10s live micro-revalidation loop
   v
[Model Router + Fallback Chain]
   |- gpt-4o-mini / gpt-4o / Llama-3.2-90B-Vision-Instruct
   v
[Math Engine]
   |- CEF, TE, Volatility, Predictability, Robustness
   |- Wasserstein, RQA, Persistent Entropy, Hamiltonian Flow
   |- Z-score and boundary reversal scoring
```

### Frontend
- Built with React + React Native primitives for web, animated with `motion`, styled via `twrnc`/Tailwind patterns.
- Stateful analysis console + historical journal dashboard.
- Local browser storage for API credentials and session-level analytics payloads.

### Backend
- Single Node/Express process (`server.ts`) that serves API routes and Vite middleware in dev.
- Request-size guardrails + timeout handling + retry/fallback model routing.
- Image preprocessing using Jimp before model submission.

---

## 3) Core Analysis Pipeline

### A. Pre-Analysis (`POST /api/pre-analysis`)
Consumes numeric `priceHistory`, optional `correlatedAssets`, and optional `liquidityMap`, then computes deterministic priors:

- **CEF Direction + Confidence**
- **Transfer Entropy leader detection** (cross-asset directional influence)
- **Volatility regime gate** (ATR-like z-scored energy state)
- **Predictability classification**
- **Signal robustness score**
- **Geometric oracles** (RQA, persistent entropy, Hamiltonian flow, Wasserstein distance)

### B. Debate (`POST /api/debate`)
Primary execution path used by the UI.

1. Compress/normalize incoming chart image.
2. Run vision extraction prompt → typed chart-state JSON.
3. Compute math scores from extracted OHLC-like series.
4. Launch **Bull/Bear/Skeptic** prompt set (staggered parallelization to reduce burst rate limits).
5. Execute Judge prompt with:
   - Structural priors
   - Geometric oracles
   - Hard-coded statistical scoring context
   - Agent arguments
   - Optional uploaded technique corpus and prior stats
6. Return consolidated decision payload.

### C. Scout Loop (`POST /api/scout`)
A lightweight live-monitor endpoint used during active camera mode.
Every ~10s, a new frame is compared against the anchor thesis and mapped to:
- `HOLD`
- `BUILD`
- `EXIT`

---

## 4) Quantitative Feature Set (Math Engine)

The math engine includes explicit implementations for:

- **Wasserstein-2 (Sinkhorn approximation)** for geometric similarity against trend prototypes.
- **RQA metrics** (recurrence rate, determinism, laminarity) for regime/memory diagnostics.
- **Persistent entropy (TDA-lite)** to estimate structural complexity in local extrema dynamics.
- **Symplectic Hamiltonian flow simulation** for physics-inspired path projection.
- **Z-score candle significance** to evaluate local move abnormality.
- **Boundary reversal biasing** via chart-relative Y-position extremes.
- **Volatility/Predictability/Robustness gating** for market quality filtering.

This provides an explicit non-LLM prior signal layer before final language-model arbitration.

---

## 5) Client Product Surfaces

### Live Analysis Console
- Camera capture + upload mode
- Asset/timeframe/investment metadata
- Multi-judge progress state machine
- Real-time scout feedback
- Final verdict synthesis and export paths

### Statistics View (Trading Journal)
- JSON import for historical trades
- Session persistence via `sessionStorage`
- Dashboard KPIs:
  - Win rate
  - P/L
  - ROI
  - Recent trade stream

### System Settings
- Runtime model credentials (`GitHub token` + endpoint)
- Share-link utility
- Client-side secure text input persistence

---

## 6) Data Contracts (Selected)

Representative response envelopes and type contracts live in:
- `src/types.ts`
- route handlers in `server.ts`

Notable payload classes include:
- `TradeAnalysis`
- `JudgeVerdict`
- typed OHLC and structured insight formats

---

## 7) Tech Stack

- **Frontend:** React 18, React Native Web, Motion, Lucide, Tailwind/twrnc
- **Backend:** Node.js, Express 5, TSX runtime, Vite middleware
- **Math/Signal Processing:** simple-statistics, mathjs, custom TS analytics
- **Image Path:** Jimp + browser canvas downsampling
- **Auth/Data:** Firebase Auth + Firestore initialization
- **Model Access:** GitHub Models compatible chat-completions endpoints

---

## 8) Local Development

### Prerequisites
- Node.js 20+
- npm
- A valid GitHub Models token

### Setup

```bash
npm install
cp .env.example .env.local
```

Set at minimum:

```bash
GITHUB_TOKEN=your_token_here
# optional:
# GITHUB_API_BASE_URL=https://models.inference.ai.azure.com
# VISION_MODEL=gpt-4o
```

### Run (dev)

```bash
npm run dev
```

Server defaults to `http://localhost:3000` and hosts both API + Vite middleware in development mode.

### Build + Start (prod-style)

```bash
npm run build
npm run start
```

---

## 9) Operational Characteristics

- Explicit request-size caps (global + debate-route override)
- Timeout control with abort semantics
- Retry + model fallback chain for degraded upstream conditions
- Guarded parsing and sanitation of user-provided context fields
- API catch-all for unknown routes with JSON error responses

---

## 10) Suggested Next Evolution

For production-grade deployment, consider:

1. Queue-backed inference orchestration (Bull/Bear/Skeptic as isolated workers).
2. Signed, encrypted credential handoff (remove persistent plaintext token storage in browser).
3. Full schema validation (zod/ajv) on all external route payloads.
4. Deterministic replay mode for backtesting and model-variant A/B evaluation.
5. Observability stack (OpenTelemetry traces + latency/rate-limit dashboards).

---

## 11) Disclaimer

This tool provides analytical assistance and simulation logic. It is **not financial advice** and should not be treated as an autonomous execution system without independent risk controls.
