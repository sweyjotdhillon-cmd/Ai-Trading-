export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AgentResult {
  reasoning: string;
  confidence: number;
  occlusionResult?: string;
}

export interface JudgeVerdict {
  winner: 'BULL' | 'BEAR' | 'NO_TRADE';
  finalConfidence: number;
  ruling: string;
  bullArgumentQuality: number;
  bearArgumentQuality: number;
  symmetryScore?: number;
  physicsConsistencyScore?: number;
  nextCandleGating?: {
    confirmationCriteria: string;
    invalidationCriteria: string;
  };
  tradeDetails: Partial<TradeAnalysis>;
}

export interface Technique {
  id: string;
  name: string;
  description: string;
  code?: string;
}

export interface StockNoteEntry {
  id: string;
  analysis: string;
  createdAt: number;
}

export interface StockNote {
  uid: string;
  stock: string;
  notes: string;
  entries?: StockNoteEntry[];
  points?: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: number;
}

export interface SystemSettings {
  aiAccessMode: boolean;
  aiAccessModeEnabledAt: number | null;
}

export interface StructuredInsight {
  setupType: string;
  marketCondition: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'UNKNOWN';
  keyLevels: string[];
  whatWorked: string[];
  whatFailed: string[];
  finalLesson: string;
  qualityScore: number;
}

export interface SetupStats {
  setupName: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgProbability: number;
}

export interface BehaviorProfile {
  currentStreak: number;
  maxStreak: number;
  totalWins: number;
  totalLosses: number;
  lastResult: 'WIN' | 'LOSS' | null;
  commonMistakes: Record<string, number>;
}

export interface TradeAnalysis {
  id: string;
  uid: string;
  subUserId?: string;
  subUserName?: string;
  timestamp: string;
  stock: string;
  signal: 'CALL' | 'PUT' | 'NO TRADE';
  market: 'CLEAN' | 'DEAD' | 'CHAOTIC';
  strength?: 'WEAK' | 'MODERATE' | 'STRONG';
  entry: 'NOW' | 'WAIT';
  probability: number;
  graphTimeframe?: string;
  investmentDuration?: string;
  result?: 'WIN' | 'LOSS';
  followedRules?: boolean;
  mistakeType?: 'late entry' | 'bad market' | 'overtrade' | 'none';
  notes?: string;
  analysisText: string; // Compressed raw AI response
  structuredInsight?: StructuredInsight; // The "SIO"
  bigInsight?: string;
  techniquesUsed?: string;
  notesUsed?: string;
  investmentAmount?: number;
  profitAmount?: number;
  lossAmount?: number;
  accountType?: 'REAL' | 'DEMO';
  expiresAt?: number;
  embedding?: number[];
  reason?: string;
  suggestedTrades?: number;
  framingType?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}
