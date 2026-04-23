import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  ActivityIndicator, 
  TextInput,
  Image,
  Platform,
  Modal
} from 'react-native';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  Camera, 
  Upload, 
  Sparkles, 
  Brain,
  TrendingUp,
  AlertTriangle,
  FileText,
  Download,
  Terminal,
  XCircle,
  ChevronDown,
  Check,
  Zap
} from 'lucide-react';
import tw from 'twrnc';

type JudgeKey = 'system' | 'judge1' | 'judge2' | 'judge3' | 'judge4';
type JudgeStatus = 'idle' | 'queued' | 'active' | 'done';
type JudgeLog = { text: string; status: JudgeStatus; phase: string };

const JUDGE_ORDER: JudgeKey[] = ['system', 'judge1', 'judge2', 'judge3', 'judge4'];
const JUDGE_META: Record<JudgeKey, { label: string; color: string; bg: string; lane: string }> = {
  system: { label: 'System Context', color: '#00FFFF', bg: 'rgba(0, 255, 255, 0.05)', lane: 'Ingestion' },
  judge1: { label: 'Judge 1 · Bull Case', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.08)', lane: 'Debate Lane A' },
  judge2: { label: 'Judge 2 · Bear Case', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.08)', lane: 'Debate Lane B' },
  judge3: { label: 'Judge 3 · Risk Filter', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.08)', lane: 'Risk Gate' },
  judge4: { label: 'Judge 4 · Boundary Gate', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.08)', lane: 'Structure Gate' }
};

const JUDGE_TASKS = {
  judge1: ["Scanning support nodes...", "Evaluating volume nodes...", "Mapping price patterns...", "Analyzing breakouts...", "Finalizing Bullish Case..."],
  judge2: ["Locating resistance zones...", "Analyzing selling pressure...", "Checking candle patterns...", "Projecting crash vectors...", "Finalizing Bearish Case..."],
  judge3: ["Searching for local traps...", "Calculating failure risk...", "Checking volume leaks...", "Scanning wick rejections...", "Finalizing Risk Verdict..."],
  judge4: ["Locating chart boundaries...", "Detecting trend extremes...", "Scanning for exhaustion...", "Calculating reversal probability...", "Finalizing Boundary Verdict..."],
  system: ["Syncing live vision feed...", "Extracting OHLC data...", "Computing math oracles...", "Aligning market priors...", "Synthesizing full report..."]
};

const createInitialJudgeLogs = (): Record<JudgeKey, JudgeLog> => ({
  system: { text: 'Awaiting context...', status: 'idle', phase: 'Idle' },
  judge1: { text: 'Waiting to initiate...', status: 'idle', phase: 'Idle' },
  judge2: { text: 'Waiting to initiate...', status: 'idle', phase: 'Idle' },
  judge3: { text: 'Waiting to initiate...', status: 'idle', phase: 'Idle' },
  judge4: { text: 'Waiting to initiate...', status: 'idle', phase: 'Idle' }
});

// Utility to downscale images on the web before sending to server
const downscaleImage = (dataUrl: string, maxDim: number = 900): Promise<string> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black'; // Fill background
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      // Higher quality (0.88) to preserve chart fidelity
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => resolve(dataUrl); 
    img.src = dataUrl;
  });
};

export function LiveAnalysis() {
  const [stockName, setStockName] = useState('Bitcoin');
  const [graphTimeframe, setGraphTimeframe] = useState('30 minutes');
  const [loading, setLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Live Trading Loop States
  const [tradingPhase, setTradingPhase] = useState<'IDLE' | 'ANALYSING_DIRECTION' | 'WAITING_FOR_ENTRY' | 'ENTRY_CONFIRMED'>('IDLE');
  const [tradingDirection, setTradingDirection] = useState<'UP' | 'DOWN' | 'NO_TRADE' | null>(null);
  
  // Live Camera States
  const videoRef = useRef<any>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Real-Time Scout (10s Tick)
  const [scoutActive, setScoutActive] = useState(false);
  const [scoutData, setScoutData] = useState<{action: string, reason: string} | null>(null);

  // Parallel Judge Logs
  const [judgeLogs, setJudgeLogs] = useState<Record<JudgeKey, JudgeLog>>(createInitialJudgeLogs);
  const [flowProgress, setFlowProgress] = useState(0);
  
  // UX Error Handling
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Dropdown States
  const [showTfPicker, setShowTfPicker] = useState(false);
  const [showDurPicker, setShowDurPicker] = useState(false);
  
  // Investment Details
  const [investmentAmount, setInvestmentAmount] = useState('100');
  const [investmentDuration, setInvestmentDuration] = useState('5m');
  const [profitabilityPercent, setProfitabilityPercent] = useState('85');

  // Technique / Stats Files
  const [techniquesList, setTechniquesList] = useState<string[]>([]);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [sessionIndex, setSessionIndex] = useState(1);
  const [techFileName, setTechFileName] = useState<string | null>(null);
  const [statsFileName, setStatsFileName] = useState<string | null>(null);

  const [isStatsSaved, setIsStatsSaved] = useState(false);

  const fileInputRef = useRef<any>(null);
  const techInputRef = useRef<any>(null);
  const statsInputRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup camera on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const symbols = [
    { name: 'Bitcoin', icon: '₿' },
    { name: 'Apple', icon: 'A' },
    { name: 'Google', icon: 'G' },
  ];

  const timeframes = ['30 minutes', '15 minutes', '5 minutes', '3 minutes'];
  const durations = ['3m', '5m'];

  const handleReset = () => {
    setAnalysis(null);
    setAnalysisStep(null);
    setAnalysisError(null);
    setSelectedImage(null);
    setTradingPhase('IDLE');
    setTradingDirection(null);
    setIsStatsSaved(false);
    setMode('camera');
    setStockName('Bitcoin');
    setGraphTimeframe('30 minutes');
    setInvestmentDuration('5m');
    setScoutActive(false);
    setScoutData(null);
    
    setJudgeLogs(createInitialJudgeLogs());
    setFlowProgress(0);

    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);

    setTimeout(() => {
      alert("Analysis reset. Controls restored to defaults.");
    }, 300);
  };

  const startCamera = async () => {
    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
      } catch (err) {
        console.error("Camera access error:", err);
        setTimeout(() => {
          alert("Camera access denied or not available. Please ensure you have granted permission.");
        }, 300);
      }
    } else {
      setTimeout(() => {
        alert("Live camera is supported on web interface only via standard browser APIs.");
      }, 300);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: any) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    let intervalId: any;
    if (scoutActive && analysis && isCameraActive && videoRef.current) {
      intervalId = setInterval(async () => {
        try {
          const video = videoRef.current;
          const canvas = document.createElement('canvas');
          // Standard downscale for Scout: 500px to be fast
          canvas.width = 500;
          canvas.height = (video.videoHeight / video.videoWidth) * 500;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const scoutImg = canvas.toDataURL('image/jpeg', 0.6);
            
            // Build the Anchor Thesis string
            const anchorThesis = `Direction: ${analysis.judge.tradeDetails?.signal}, Insight: ${analysis.judge.tradeDetails?.bigInsight}, Verdict: ${analysis.judge.ruling}`;
            
            const res = await fetch(`http://localhost:3000/api/scout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: scoutImg, anchorThesis })
            });
            
            if (res.ok) {
              const scoutJSON = await res.json();
              setScoutData(scoutJSON);
            }
          }
        } catch (e) {
          console.error("Scout loop error", e);
        }
      }, 10000); // 10 second ticker
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [scoutActive, analysis, isCameraActive]);

  const closePickers = () => {
    setShowTfPicker(false);
    setShowDurPicker(false);
  };

  const handlePickImage = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    }
  };

  const handlePickTechnique = () => {
    if (Platform.OS === 'web') {
      techInputRef.current?.click();
    }
  };

  const handlePickStatsFile = () => {
    if (Platform.OS === 'web') {
      statsInputRef.current?.click();
    }
  };

  const onFileChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onTechniqueChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setTechFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          // Expecting either { techniques: [] } or a direct array
          const list = Array.isArray(json) ? json : (json.techniques || []);
          setTechniquesList(list);
          setTimeout(() => {
            alert(`Successfully loaded ${list.length} techniques from ${file.name}.`);
          }, 300);
        } catch (err) {
          console.error("Failed to parse technique file:", err);
          setTimeout(() => {
            alert("Invalid technique file format. Please upload a JSON file containing a list of techniques.");
          }, 300);
        }
      };
      reader.readAsText(file);
    }
  };

  const onStatsFileChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setStatsFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          const list = Array.isArray(json) ? json : (json.stats || []);
          setStatsData(list);
          
          // Detect latest session index
          const maxIdx = list.reduce((max: number, item: any) => Math.max(max, item.sessionIndex || 0), 0);
          setSessionIndex(maxIdx + 1);
          
          setTimeout(() => {
            alert(`Successfully loaded ${list.length} records from ${file.name}. This is analysis session #${maxIdx + 1}.`);
          }, 300);
        } catch (err) {
          console.error("Failed to parse stats file:", err);
          setTimeout(() => {
            alert("Invalid stats file format. Please upload a JSON file containing previous results.");
          }, 300);
        }
      };
      reader.readAsText(file);
    }
  };

  const saveToStats = (analysisData: any, outcome: 'WIN' | 'LOSS') => {
    try {
      const entryIdx = statsData.length + 1;
      const profitPct = Number(profitabilityPercent);
      const investAmt = Number(investmentAmount);
      const potentialProfit = (profitPct / 100) * investAmt;
      
      const now = new Date();
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString();

      const newEntry = {
        id: entryIdx,
        sessionName: `${stockName.replace('/', '_')}_${entryIdx}`,
        sessionIndex: sessionIndex,
        timestamp: now.toISOString(),
        date: dateStr,
        time: timeStr,
        stock: stockName,
        timeframe: graphTimeframe,
        duration: investmentDuration,
        investment: investAmt,
        profitPercentage: profitPct,
        profitPotential: potentialProfit,
        lossPotential: investAmt,
        signal: analysisData.judge.winner === 'BULL' ? 'CALL' : (analysisData.judge.winner === 'BEAR' ? 'PUT' : 'WAIT'),
        result: outcome,
        exactProfit: outcome === 'WIN' ? potentialProfit : -investAmt,
        profitAmount: outcome === 'WIN' ? potentialProfit : -investAmt,
        reasoning: analysisData.judge.ruling,
        confidence: analysisData.judge.finalConfidence,
        totalScore: analysisData.judge.totalScore,
        decision: analysisData.judge.decision,
        techniquesApplied: techniquesList
      };
      
      const updatedStats = [...statsData, newEntry];
      setStatsData(updatedStats);
      setIsStatsSaved(true);

      // Also persist to current session storage for the local view
      const existing = sessionStorage.getItem('stats_surface_data');
      let localStats = { stats: [] };
      if (existing) {
        localStats = JSON.parse(existing);
      }
      localStats.stats.push(newEntry as never);
      sessionStorage.setItem('stats_surface_data', JSON.stringify(localStats));
      
      setTimeout(() => {
        alert(`Trade result recorded as ${outcome}. Stat entry #${entryIdx} created.`);
      }, 300);
    } catch (err) {
      console.error("Failed to save stats:", err);
      setTimeout(() => {
        alert("Error saving trade result.");
      }, 300);
    }
  };

  const handleDownloadStats = () => {
    if (statsData.length === 0) return;
    
    const fileName = `${stockName.replace('/', '_')}_${sessionIndex}.json`;
    const blob = new Blob([JSON.stringify(statsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    
    setSessionIndex(prev => prev + 1);
    setTimeout(() => {
      alert(`File ${fileName} downloaded. Upload it for your next analysis session to continue the series!`);
    }, 300);
  };

  const updateFlowStage = (stage: number) => {
    setFlowProgress(Math.min(100, 12 + stage * 19));
    setJudgeLogs({
      system: {
        text: JUDGE_TASKS.system[stage],
        status: stage >= 4 ? 'done' : 'active',
        phase: stage <= 1 ? 'Data Sync' : stage === 2 ? 'Oracle Compute' : stage === 3 ? 'Context Merge' : 'Synthesis'
      },
      judge1: {
        text: JUDGE_TASKS.judge1[stage],
        status: stage === 0 ? 'queued' : stage >= 4 ? 'done' : 'active',
        phase: stage <= 1 ? 'Evidence Build' : stage <= 3 ? 'Hypothesis Stress' : 'Final Verdict'
      },
      judge2: {
        text: JUDGE_TASKS.judge2[stage],
        status: stage === 0 ? 'queued' : stage >= 4 ? 'done' : 'active',
        phase: stage <= 1 ? 'Evidence Build' : stage <= 3 ? 'Hypothesis Stress' : 'Final Verdict'
      },
      judge3: {
        text: JUDGE_TASKS.judge3[stage],
        status: stage <= 1 ? 'queued' : stage >= 4 ? 'done' : 'active',
        phase: stage <= 1 ? 'Pending Risk Inputs' : stage === 2 ? 'Risk Scoring' : stage === 3 ? 'Leak Scan' : 'Final Verdict'
      },
      judge4: {
        text: JUDGE_TASKS.judge4[stage],
        status: stage <= 1 ? 'queued' : stage >= 4 ? 'done' : 'active',
        phase: stage <= 1 ? 'Boundary Awaiting' : stage === 2 ? 'Range Model' : stage === 3 ? 'Reversal Probability' : 'Final Verdict'
      },
    });
  };

  const handleAnalyze = async () => {
    let finalImageToAnalyze = selectedImage;

    // Capture from live video feed if camera is active
    if (mode === 'camera' && isCameraActive && videoRef.current) {
      if (Platform.OS === 'web') {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        finalImageToAnalyze = canvas.toDataURL('image/jpeg');
      }
    }

    if (!finalImageToAnalyze) {
      setTimeout(() => {
        alert("Please start the camera or upload a chart image first.");
      }, 300);
      return;
    }

    // Small delay to allow the native touch event to complete on web
    setTimeout(async () => {
      setLoading(true);
      setAnalysisError(null);
      setAnalysis(null);
      setTradingPhase('ANALYSING_DIRECTION');
      setAnalysisStep(`SYNCHRONIZING ${techniquesList.length} TECHNIQUES...`);

    // Optimize image for transmission (web canvas resize)
    const optimizedImage = await downscaleImage(finalImageToAnalyze);
    const base64Data = optimizedImage.split(',')[1];
    
      setFlowProgress(8);
      setJudgeLogs({
        system: { text: "Injecting global context...", status: 'active', phase: 'Bootstrapping' },
        judge1: { text: "Queued for debate lane...", status: 'queued', phase: 'Queued' },
        judge2: { text: "Queued for debate lane...", status: 'queued', phase: 'Queued' },
        judge3: { text: "Queued for risk lane...", status: 'queued', phase: 'Queued' },
        judge4: { text: "Queued for structure lane...", status: 'queued', phase: 'Queued' }
      });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      try {
        controller.abort();
      } catch (e) {
        console.warn("Manual abort failed", e);
      }
    }, 180000); // Increased to 180s Safety Timeout

    try {
      const fetchWithRetry = async (url: string, options: any, retries: number = 2): Promise<Response> => {
        if (options.signal?.aborted) {
          throw new Error("Request aborted before retry");
        }
        try {
          const res = await fetch(url, options);
          if (!res.ok && retries > 0 && (res.status >= 500 || res.status === 429)) {
            await new Promise(r => setTimeout(r, 2000));
            return fetchWithRetry(url, options, retries - 1);
          }
          return res;
        } catch (err: any) {
          if (retries > 0 && err.name !== 'AbortError' && !options.signal?.aborted) {
            await new Promise(r => setTimeout(r, 2000));
            return fetchWithRetry(url, options, retries - 1);
          }
          throw err;
        }
      };

      // 1. START DATA FETCH
      const apiCall = fetchWithRetry('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          symbol: stockName,
          timeframe: graphTimeframe,
          investment: {
            amount: investmentAmount,
            duration: investmentDuration,
            profit: profitabilityPercent
          },
          structuralPriors: `Macro context for ${stockName} on ${graphTimeframe} timeframe.`,
          geometricOracles: "Standard geometric extraction.",
          githubToken: typeof window !== 'undefined' ? localStorage.getItem('app_user_github_token') : '',
          githubEndpoint: typeof window !== 'undefined' ? localStorage.getItem('app_user_github_endpoint') : '',
          techniqueData: techniquesList,
          statsData: statsData.slice(-3)
        }),
        signal: controller.signal
      });

      // 2. RUN SIMULATION (Progressively show what judges are doing)
      for (let i = 0; i <= 3; i++) {
        updateFlowStage(i);
        await new Promise(r => setTimeout(r, 2000));
      }

      setAnalysisStep(`FINALIZING VERDICT (${techniquesList.length} TECHNIQUES AUDITED)`);
      updateFlowStage(4);
      setFlowProgress(92);
      setJudgeLogs(prev => ({
        ...prev,
        system: { text: "Simultaneously synthesizing neural nodes...", status: 'active', phase: 'Final Arbitration' }
      }));

      const minTimer = new Promise(r => setTimeout(r, 7000));
      const [response] = await Promise.all([apiCall, minTimer]) as [Response, any];
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server Error: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.judge) {
        setLoading(false); // CLOSE LOADING IMMEDIATELY ON SUCCESS
        setJudgeLogs({
          system: { text: `${data.techUsedCount} Patterns Identified ✅`, status: 'done', phase: 'Synthesis Complete' },
          judge1: { text: `Bull: ${(data.bull?.reasoning || "Analyzing...").substring(0, 40)}...`, status: 'done', phase: 'Case Closed' },
          judge2: { text: `Bear: ${(data.bear?.reasoning || "Analyzing...").substring(0, 40)}...`, status: 'done', phase: 'Case Closed' },
          judge3: { text: `Risk: ${(data.skeptic?.riskVerdict || data.skeptic?.skepticVerdict || "Analyzing...").substring(0, 40)}...`, status: 'done', phase: 'Risk Finalized' },
          judge4: { text: `Boundary: ${data.judge?.ruling?.substring(0, 40) || "Detected"}...`, status: 'done', phase: 'Structure Finalized' }
        });
        setFlowProgress(100);
        
        setAnalysisStep(`Analysis Complete: ${data.techUsedCount}/${techniquesList.length} Techniques Found`);
        
        // Robust Direction Detection with Confidence Threshold
        const rawWinner = (data.judge.winner || '').toUpperCase();
        const rawSignal = (data.judge.tradeDetails?.signal || '').toUpperCase();
        const finalConfidence = Number(data.judge.finalConfidence) || 0;
        
        let direction: 'UP' | 'DOWN' | 'NO_TRADE' = 'NO_TRADE';
        
        if (finalConfidence >= 70) {
          if (rawWinner === 'BULL' || rawSignal === 'CALL' || rawSignal === 'UP') {
            direction = 'UP';
          } else if (rawWinner === 'BEAR' || rawSignal === 'PUT' || rawSignal === 'DOWN') {
            direction = 'DOWN';
          }
        } else {
          console.log(`Signal blocked: Confidence level (${finalConfidence}%) below threshold (70%)`);
        }

        setTradingDirection(direction);
        
        if (mode === 'camera') {
          // Live Analysis: Arrow phase then Entry phase
          setTradingPhase('WAITING_FOR_ENTRY');
          if (direction === 'NO_TRADE') {
            setAnalysisStep(finalConfidence < 70 ? `LOW CONFIDENCE (${finalConfidence}%) - NO TRADE` : 'CONFIRMING NO-TRADE SIGNAL...');
          } else {
            setAnalysisStep('HUNTING PERFECT ENTRY POINT...');
          }
          
          await new Promise(r => setTimeout(r, 4000)); // Show arrows for 4 seconds
          setTradingPhase('ENTRY_CONFIRMED');
          setAnalysisStep(direction === 'NO_TRADE' ? 'SIGNAL ABORTED' : 'EXECUTE NOW!');
          setScoutActive(true); // START THE FAST BACKGROUND TICKER
        } else {
          // Screenshot Analysis: Direct to Entry phase
          setTradingPhase('ENTRY_CONFIRMED');
          if (direction === 'NO_TRADE') {
             setAnalysisStep(finalConfidence < 70 ? `LOW CONFIDENCE (${finalConfidence}%) - ABORTED` : 'SIGNAL ABORTED');
          } else {
             setAnalysisStep('SIGNAL CONFIRMED - EXECUTE NOW!');
          }
        }
        
        setAnalysis(data);
        setIsStatsSaved(false); // Reset stats saved state for new analysis
        
        // Return phase back to idle after display, but keep scout running until reset 
        setTimeout(() => {
           setTradingPhase('IDLE');
           setAnalysisStep('LIVE TICK SCOUT ACTIVE');
           setTradingDirection(null);
        }, 6000);

      } else {
        throw new Error("Analysis failed. Arbitrator did not return a valid decision.");
      }

    } catch (error: any) {
      clearTimeout(timeoutId);
      let msg = error.message || "Unknown error";
      const lowerMsg = msg.toLowerCase();
      
      if (error.name === 'AbortError' || lowerMsg.includes('aborted') || lowerMsg.includes('abort')) {
        msg = "Analysis timed out (180s limit). The models are deep in thought. Please try again.";
      } else if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('fetch failed') || lowerMsg.includes('network error') || lowerMsg.includes('load failed')) {
        msg = "Network connection dropped (took too long or backend reset). Please try again or use a smaller chart timeframe.";
      }
      console.error("Analysis Debug Info:", msg);
      setAnalysisError(msg);
      setTradingPhase('IDLE');
      setLoading(false);
      setFlowProgress(0);
    }
    }, 10);
  };


  return (
    <View style={[tw`flex-1 bg-black relative`, { height: '100%' }]}>
      {/* Full Screen High-Intensity Overlays */}
      <Modal
        visible={tradingPhase === 'ENTRY_CONFIRMED' && !!tradingDirection}
        transparent={true}
        animationType="none"
      >
        <AnimatePresence>
          {(tradingPhase === 'ENTRY_CONFIRMED' && !!tradingDirection) && (
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className={`flex-1 justify-center items-center ${tradingDirection === 'UP' ? 'bg-green-600' : (tradingDirection === 'DOWN' ? 'bg-red-600' : 'bg-yellow-700')}`}
              style={{ display: 'flex', height: '100vh', width: '100vw' }}
            >
               {/* High-speed scanning tech background */}
               <motion.div 
                 animate={{ opacity: [0.1, 0.3, 0.1] }}
                 transition={{ duration: 0.5, repeat: Infinity }}
                 className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)]"
               />
               
               <div style={tw`items-center px-10 relative z-10`}>
                 <motion.div
                   animate={{ scale: [1, 1.05, 1] }}
                   transition={{ duration: 0.2, repeat: Infinity }}
                 >
                   <Text style={tw`text-white font-[Anton] text-[120px] leading-[0.85] uppercase text-center mb-6`}>
                      {tradingDirection === 'UP' ? 'PULL UP' : (tradingDirection === 'DOWN' ? 'PULL DOWN' : 'HOLD')}
                   </Text>
                 </motion.div>
                 
                 <View style={tw`h-1 w-48 bg-white/60 mb-6`} />
                 
                 <motion.div
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.2 }}
                 >
                   <Text style={tw`text-white font-black text-5xl tracking-tighter uppercase text-center`}>
                      {tradingDirection === 'UP' ? 'EXECUTE NOW' : (tradingDirection === 'DOWN' ? 'EXECUTE NOW' : 'SIGNAL ABORTED')}
                   </Text>
                 </motion.div>

                 <motion.div 
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={tw`mt-10 px-6 py-2 border-2 border-white rounded-full`}
                 >
                    <Text style={tw`text-white font-black text-xl tracking-[5px]`}>STRIKE READY</Text>
                 </motion.div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>

      {tradingPhase === 'WAITING_FOR_ENTRY' && tradingDirection && (
          <AnimatedArrows direction={tradingDirection} />
      )}

      <ScrollView 
        style={tw`flex-1 bg-black`}
        contentContainerStyle={[tw`pb-24`, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={true}
        alwaysBounceVertical={true}
      >
        {Platform.OS === 'web' && (
          <>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={onFileChange} />
            <input type="file" ref={techInputRef} style={{ display: 'none' }} accept=".json" onChange={onTechniqueChange} />
            <input type="file" ref={statsInputRef} style={{ display: 'none' }} accept=".json" onChange={onStatsFileChange} />
          </>
        )}
      
      <View style={tw`p-4`}>
        {/* Compact Terminal Header */}
        <View style={tw`flex-row justify-between items-end mb-4 px-1`}>
          <View>
            <Text style={tw`text-[#D9B382] text-[8px] font-black tracking-[3px] uppercase`}>Pro Terminal v2</Text>
            <Text style={tw`text-white text-2xl font-black`}>CONSOLE</Text>
          </View>
          <View style={tw`flex-row gap-2`}>
            <Pressable 
              onPress={handlePickTechnique}
              style={({ pressed }) => [tw`w-9 h-9 rounded-lg items-center justify-center`, techFileName ? tw`bg-[#D9B382]` : tw`bg-white/5 border border-white/10`, { opacity: pressed ? 0.7 : 1 }]}
            >
              <FileText size={16} color={techFileName ? "#1A1308" : "#8B95B0"} />
            </Pressable>
            <Pressable 
              onPress={handlePickStatsFile}
              style={({ pressed }) => [tw`w-9 h-9 rounded-lg items-center justify-center`, statsFileName ? tw`bg-[#D9B382]` : tw`bg-white/5 border border-white/10`, { opacity: pressed ? 0.7 : 1 }]}
            >
              <TrendingUp size={16} color={statsFileName ? "#1A1308" : "#8B95B0"} />
            </Pressable>
          </View>
        </View>

        {/* Compact Dashboard Grid */}
        <View style={[tw`bg-[#121419] rounded-2xl border border-white/10 p-4 shadow-2xl mb-4`, { zIndex: 100 }]}>
           <View style={tw`mb-4`}>
              <View style={tw`flex-row justify-between items-center mb-2`}>
                <Text style={tw`text-[8px] font-black text-[#4B5570] uppercase tracking-widest`}>Asset Selection</Text>
              </View>
              <View style={tw`flex-row gap-1.5`}>
                {symbols.map((s) => (
                  <Pressable
                    key={s.name}
                    onPress={() => setStockName(s.name)}
                    style={({ pressed }) => [
                      tw`flex-1 py-2.5 rounded-lg border items-center flex-row justify-center`,
                      stockName === s.name ? tw`bg-[#D9B382] border-[#D9B382]` : tw`bg-black/20 border-white/5`,
                      { opacity: pressed ? 0.7 : 1 }
                    ]}
                  >
                    <Text style={[tw`mr-1.5 text-xs`, stockName === s.name ? tw`text-black` : tw`text-[#D9B382]`]}>{s.icon}</Text>
                    <Text style={[tw`text-[10px] font-black`, stockName === s.name ? tw`text-black` : tw`text-white`]}>{s.name}</Text>
                  </Pressable>
                ))}
              </View>
           </View>

           <View style={tw`flex-row gap-3 mb-4 z-50`}>
              <View style={tw`flex-1`}>
                 <Text style={tw`text-[8px] font-black text-[#4B5570] uppercase tracking-wider mb-1.5`}>Graph TF</Text>
                 <View style={tw`relative`}>
                      <Pressable 
                      onPress={() => { setShowTfPicker(!showTfPicker); setShowDurPicker(false); }}
                      style={({ pressed }) => [tw`bg-black/60 border border-white/10 h-10 rounded-lg px-3 flex-row items-center justify-between`, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Text style={{ color: '#D9B382', fontWeight: '900', fontSize: 11 }}>{graphTimeframe}</Text>
                      <ChevronDown size={12} color="#D9B382" />
                    </Pressable>
                    {showTfPicker && (
                      <View style={[tw`absolute top-12 left-0 right-0 bg-[#2A2E39] border-2 border-[#D9B382] rounded-xl p-2 shadow-2xl`, { zIndex: 99999, elevation: 10 }]}>
                        {timeframes.map((tf) => (
                          <Pressable
                            key={tf}
                            onPress={() => { setGraphTimeframe(tf); setShowTfPicker(false); }}
                            style={({ pressed }) => [tw`py-4 px-3 rounded-lg border-b border-white/10`, graphTimeframe === tf && tw`bg-[#D9B382]/20`, { opacity: pressed ? 0.7 : 1 }]}
                          >
                            <Text style={[tw`text-sm font-black`, graphTimeframe === tf ? tw`text-[#D9B382]` : tw`text-white`]}>{tf}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                 </View>
              </View>
              <View style={tw`flex-1`}>
                 <Text style={tw`text-[8px] font-black text-[#4B5570] uppercase tracking-wider mb-1.5`}>Duration</Text>
                 <View style={tw`relative`}>
                    <Pressable 
                      onPress={() => { setShowDurPicker(!showDurPicker); setShowTfPicker(false); }}
                      style={({ pressed }) => [tw`bg-black/60 border border-white/10 h-10 rounded-lg px-3 flex-row items-center justify-between`, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Text style={{ color: '#D9B382', fontWeight: '900', fontSize: 11 }}>{investmentDuration}</Text>
                      <ChevronDown size={12} color="#D9B382" />
                    </Pressable>
                    {showDurPicker && (
                      <View style={[tw`absolute top-12 left-0 right-0 bg-[#2A2E39] border-2 border-[#D9B382] rounded-xl p-2 shadow-2xl`, { zIndex: 99999, elevation: 10 }]}>
                        {durations.map((d) => (
                          <Pressable
                            key={d}
                            onPress={() => { setInvestmentDuration(d); setShowDurPicker(false); }}
                            style={({ pressed }) => [tw`py-4 px-3 rounded-lg border-b border-white/10`, investmentDuration === d && tw`bg-[#D9B382]/20`, { opacity: pressed ? 0.7 : 1 }]}
                          >
                            <Text style={[tw`text-sm font-black`, investmentDuration === d ? tw`text-[#D9B382]` : tw`text-white`]}>{d}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                 </View>
              </View>
           </View>

           <View style={tw`flex-row gap-3`}>
              <View style={tw`flex-1`}>
                 <Text style={tw`text-[8px] font-black text-[#4B5570] uppercase tracking-wider mb-1.5`}>Capital</Text>
                 <TextInput
                   style={tw`bg-black/60 border border-white/10 h-10 rounded-lg px-3 text-white font-black text-xs`}
                   value={investmentAmount}
                   onChangeText={setInvestmentAmount}
                   keyboardType="numeric"
                   placeholderTextColor="#4B5570"
                 />
              </View>
              <View style={tw`flex-1`}>
                 <Text style={tw`text-[8px] font-black text-[#4B5570] uppercase tracking-wider mb-1.5`}>Payout (%)</Text>
                 <TextInput
                   style={tw`bg-black/60 border border-white/10 h-10 rounded-lg px-3 text-[#22C55E] font-black text-xs`}
                   value={profitabilityPercent}
                   onChangeText={setProfitabilityPercent}
                   keyboardType="numeric"
                 />
              </View>
           </View>
        </View>

        {/* Dense Evidence Row */}
        <View style={tw`bg-[#121419] rounded-2xl border border-white/10 p-4 mb-4`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
               <Text style={tw`text-[8px] font-black text-[#4B5570] uppercase tracking-widest`}>Chart Feed</Text>
               <View style={tw`flex-row bg-black/40 rounded-lg p-0.5 border border-white/5`}>
                  {(['camera', 'upload'] as const).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setMode(m)}
                      style={({ pressed }) => [tw`px-3 py-1 rounded-md flex-row items-center`, mode === m ? tw`bg-[#D9B382]` : tw`bg-transparent`, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      {m === 'camera' ? <Camera size={12} color={mode === m ? '#1A1308' : '#4B5570'} /> : <Upload size={12} color={mode === m ? '#1A1308' : '#4B5570'} />}
                      <Text style={[tw`ml-1.5 text-[8px] font-black uppercase`, mode === m ? tw`text-[#1A1308]` : tw`text-[#4B5570]`]}>{m}</Text>
                    </Pressable>
                  ))}
               </View>
            </View>

            {mode === 'camera' ? (
               <View style={tw`w-full bg-black/60 rounded-xl overflow-hidden border border-white/10 items-center justify-center`}>
                 {Platform.OS === 'web' && (
                   <video 
                     ref={videoRef} 
                     autoPlay 
                     playsInline 
                     muted 
                     style={{ width: '100%', height: 160, objectFit: 'cover' }} 
                   />
                 )}
                 {!isCameraActive && (
                   <View style={tw`absolute inset-0 bg-black/80 items-center justify-center`}>
                     <Pressable
                        onPress={startCamera}
                        style={({ pressed }) => [tw`bg-[#D9B382] px-6 py-3 rounded-lg flex-row items-center`, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <Camera size={18} color="#1A1308" />
                        <Text style={tw`text-[#1A1308] font-black ml-2`}>Start Camera</Text>
                     </Pressable>
                   </View>
                 )}
                 {isCameraActive && (
                   <Pressable 
                      onPress={stopCamera} 
                      style={({ pressed }) => [tw`absolute top-2 right-2 bg-red-500/80 p-1.5 rounded-md`, { opacity: pressed ? 0.7 : 1 }]}
                    >
                     <Text style={tw`text-white font-bold text-[8px]`}>STOP</Text>
                   </Pressable>
                 )}
                 {scoutActive && (
                   <View style={tw`absolute bottom-2 left-2 right-2 bg-black/90 p-2 rounded-lg border border-[#00FFFF]/30`}>
                      <View style={tw`flex-row justify-between items-center mb-1`}>
                         <View style={tw`flex-row items-center`}>
                           <View style={tw`w-2 h-2 rounded-full bg-[#00FFFF] mr-2`} />
                           <Text style={tw`text-[#00FFFF] font-black text-[9px] uppercase tracking-widest`}>Live Tick Scout</Text>
                         </View>
                         <Text style={tw`text-white font-black text-[10px]`}>{scoutData ? scoutData.action.replace('BAIL', 'EXIT') : 'ANALYZING...'}</Text>
                      </View>
                      {scoutData && (
                        <Text style={tw`text-white/80 text-[9px] leading-3 font-medium`}>{scoutData.reason}</Text>
                      )}
                   </View>
                 )}
               </View>
            ) : (
              <Pressable
                onPress={handlePickImage}
                style={({ pressed }) => [
                  tw`h-32 w-full rounded-xl bg-black/60 overflow-hidden border items-center justify-center`,
                  selectedImage ? tw`border-[#D9B382]/20` : tw`border-dashed border-white/10`,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={tw`w-full h-full`} resizeMode="contain" />
                ) : (
                  <View style={tw`items-center`}>
                    <Upload size={18} color="#D9B382" style={tw`mb-2`} />
                    <Text style={tw`text-[#4B5570] text-[9px] font-black uppercase tracking-wider`}>Sync Chart Image</Text>
                  </View>
                )}
              </Pressable>
            )}
        </View>

        {/* Action Bar / Live Debate UI Overlay */}
        {loading ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#14161C] rounded-2xl border border-[#D9B382]/30 p-4 mt-4 shadow-2xl relative overflow-hidden"
          >
            {/* Visual Scanning Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(#D9B382_1px,transparent_1px)] [background-size:16px_16px]" />
              <motion.div 
                animate={{ y: [0, 200, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 right-0 h-px bg-[#D9B382] shadow-[0_0_15px_#D9B382]"
              />
            </div>

            <div style={tw`flex-row items-center justify-between mb-3 relative z-10`}>
              <div style={tw`flex-row items-center gap-2`}>
                 <ActivityIndicator color="#D9B382" size="small" />
                 <Text style={[tw`font-black uppercase tracking-widest`, { fontSize: 10, color: '#D9B382' }]}>
                   {analysisStep || 'Structured arbitration pipeline active'}
                 </Text>
              </div>
              <Text style={[tw`tracking-widest uppercase`, { fontSize: 8, color: '#8B95B0' }]}>{flowProgress}%</Text>
            </div>

            <div style={tw`h-1.5 w-full bg-black/70 rounded-full overflow-hidden mb-4 relative z-10`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${flowProgress}%` }}
                transition={{ duration: 0.6 }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #00FFFF 0%, #D9B382 55%, #22C55E 100%)' }}
              />
            </div>

            <div style={tw`flex-row flex-wrap gap-2 relative z-10`}>
              {JUDGE_ORDER.map((key, idx) => {
                const item = JUDGE_META[key];
                const current = judgeLogs[key];
                return (
                <motion.div
                  key={key}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-black/80 p-3 rounded-lg border-l-4 w-[48.5%] min-w-[240px]"
                  style={{ borderColor: item.color, backgroundColor: item.bg, flexGrow: key === 'system' ? 1 : undefined }}
                >
                  <div style={tw`flex-1`}>
                    <div className="flex flex-row items-center justify-between gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <Text style={[tw`font-black uppercase tracking-widest flex-1`, { fontSize: 9, color: item.color }]}>{item.label}</Text>
                      <Text style={tw`text-[8px] text-[#8B95B0] font-black uppercase`}>{item.lane}</Text>
                    </div>
                    <Text style={tw`text-[8px] text-[#D1D5DB] uppercase tracking-widest mb-1`}>{current.phase}</Text>
                    <motion.p
                      key={current.text}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-white font-bold text-xs"
                    >
                      {current.text}
                    </motion.p>
                  </div>
                  {current.status === 'done' ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-2">
                      <Check size={16} color={item.color} />
                    </motion.div>
                  ) : (
                    <div className="flex flex-row items-end gap-0.5 h-3">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [2, 8, 2] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                          className="w-0.5 bg-white/30"
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <Pressable
            onPress={() => {
              closePickers();
              handleAnalyze();
            }}
            disabled={(mode === 'upload' && !selectedImage) || (mode === 'camera' && !isCameraActive)}
            style={({ pressed }) => [
              tw`h-14 rounded-xl items-center justify-center mt-4`,
              ((mode === 'upload' && !selectedImage) || (mode === 'camera' && !isCameraActive)) ? tw`bg-[#D9B382]/20` : tw`bg-[#D9B382]`,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <View style={tw`flex-row items-center`}>
              <Sparkles size={18} color="#1A1308" style={tw`mr-2`} />
              <Text style={tw`text-[#1A1308] font-black uppercase tracking-[2px] text-base`}>
                 {mode === 'camera' ? 'Start Camera Analysis' : 'Initiate Analysis'}
              </Text>
            </View>
          </Pressable>
        )}

        {analysisError && (
          <View style={tw`bg-red-500/10 border border-red-500/30 p-4 rounded-xl mt-4 flex-row items-center`}>
            <AlertTriangle size={20} color="#EF4444" style={tw`mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-red-400 font-bold mb-1`}>Analysis Error</Text>
              <Text style={tw`text-red-200 text-xs`}>{analysisError}</Text>
            </View>
          </View>
        )}

        {analysis && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#14161C] rounded-[24px] border border-white/10 p-6 shadow-2xl mb-8 overflow-hidden relative"
          >
            {/* Visual Polish: Glassmorphism/Tactical Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D9B382]/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
            
            <div style={tw`flex-row items-center justify-between mb-6 pb-4 border-b border-white/5 relative z-10`}>
              <div style={tw`flex-row items-center`}>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <Brain size={24} color="#D9B382" style={tw`mr-3`} />
                </motion.div>
                <View>
                   <Text style={tw`text-lg font-bold text-white`}>Final Arbitrator Report</Text>
                   <Text style={tw`text-[#8B95B0] text-[10px]`}>3-Judge Scoring Framework</Text>
                </View>
              </div>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className={`px-3 py-1 rounded-full flex flex-row items-center ${analysis.judge.decision === 'STRONG SIGNAL' ? 'bg-green-500/10' : (analysis.judge.decision === 'MODERATE' ? 'bg-yellow-500/10' : 'bg-red-500/10')}`}
              >
                {analysis.judge.decision === 'STRONG SIGNAL' ? <CheckCircle size={14} color="#22C55E" /> : (analysis.judge.decision === 'MODERATE' ? <AlertTriangle size={14} color="#EAB308" /> : <XCircle size={14} color="#EF4444" />)}
                <Text style={[
                  tw`ml-1 text-[10px] font-black`,
                  analysis.judge.decision === 'STRONG SIGNAL' ? tw`text-green-500` : (analysis.judge.decision === 'MODERATE' ? tw`text-yellow-500` : tw`text-red-500`)
                ]}>{analysis.judge.decision}</Text>
              </motion.div>
            </div>

            {/* ASCII Report Display - High Tech Monospace Card */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-black/60 rounded-2xl p-4 border border-[#D9B382]/20 mb-6 group hover:border-[#D9B382]/40 transition-colors"
            >
               <div className="absolute top-2 right-2 opacity-20"><Terminal size={12} color="#D9B382" /></div>
               <Text style={tw`text-[#D9B382] font-mono text-xs mb-2`}>{analysis.judge.formattedReport}</Text>
            </motion.div>

            {/* Dynamic Comparison Scorecards - Tactical Readouts */}
            {analysis.judge.cases ? (
              <div className="flex flex-row gap-3 mb-6">
                {['bull', 'bear'].map((side, idx) => {
                  const data = analysis.judge.cases[side];
                  const isWinner = side.toUpperCase() === analysis.judge.winner.toUpperCase();
                  const sideColor = side === 'bull' ? '#22C55E' : '#EF4444';
                  
                  return (
                    <motion.div 
                      key={side}
                      initial={{ opacity: 0, x: side === 'bull' ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + (idx * 0.1) }}
                      className={`flex-1 bg-black/40 rounded-2xl p-4 border relative overflow-hidden ${isWinner ? (side === 'bull' ? 'border-green-500/40' : 'border-red-500/40') : 'border-white/5'}`}
                    >
                      {isWinner && (
                        <div className="absolute top-0 right-0 p-1">
                          <Check size={8} color={sideColor} />
                        </div>
                      )}
                      
                      <div className="flex flex-row items-center justify-between mb-3">
                        <Text style={[tw`text-[10px] font-black uppercase tracking-widest`, side === 'bull' ? tw`text-green-400` : tw`text-red-400`]}>
                          {side === 'bull' ? 'Case 1: Bull' : 'Case 2: Bear'}
                        </Text>
                      </div>
                      
                      {[
                        { label: 'J1 reasoning', val: data.j1, max: 5 },
                        { label: 'J2 vehicle', val: data.j2, max: 5 },
                        { label: 'J3 z-score', val: data.j3, max: 5 },
                        { label: 'J4 reversal', val: data.j4, max: 2.5 },
                      ].map((j, i) => (
                        <div key={i} className="mb-2">
                          <div className="flex flex-row justify-between items-center mb-1">
                            <Text style={tw`text-[8px] text-[#8B95B0] uppercase font-bold`}>{j.label}</Text>
                            <Text style={tw`text-white text-[9px] font-mono`}>{j.val}/{j.max}</Text>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(j.val / j.max) * 100}%` }}
                              transition={{ duration: 1, delay: 0.8 + (idx * 0.2) + (i * 0.1) }}
                              className="h-full"
                              style={{ backgroundColor: sideColor }}
                            />
                          </div>
                        </div>
                      ))}
                      
                      <div className="mt-3 pt-3 border-t border-white/5 flex flex-row justify-between items-center">
                        <Text style={tw`text-[8px] font-black text-[#D9B382] uppercase`}>Total</Text>
                        <motion.p 
                          animate={isWinner ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`text-xs font-black ${isWinner ? (side === 'bull' ? 'text-green-400' : 'text-red-400') : 'text-white'}`}
                        >
                          {data.total}/17.5
                        </motion.p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <View style={tw`bg-black/40 rounded-2xl p-4 border border-white/5 mb-6`}>
                <View style={tw`flex-row items-center mb-4`}>
                    <Terminal size={14} color="#D9B382" style={tw`mr-2`} />
                    <Text style={tw`text-[#D9B382] text-[10px] font-black uppercase tracking-widest`}>Judge Deliberations</Text>
                </View>
                {[
                  { name: 'Judge 1 (Reasoning)', color: '#D9B382', text: `Score: ${analysis.judge.j1Score}/5. Analysis based on agent arguments and structural priors.` },
                  { name: 'Judge 2 (Vehicle)', color: '#D9B382', text: `Score: ${analysis.judge.j2Score}/5. Analysis of trend momentum and bullish/bearish vehicles.` },
                  { name: 'Judge 3 (Z-Score)', color: '#D9B382', text: `Score: ${analysis.judge.j3Score}/5. Statistical significance of recent candle movements.` }
                ].map((j, i) => (
                  <View key={i} style={tw`mb-4 last:mb-0`}>
                      <Text style={[tw`text-[9px] font-black uppercase mb-1`, { color: j.color }]}>{j.name}</Text>
                      <Text style={tw`text-white text-[11px] leading-4`}>{j.text}</Text>
                  </View>
                ))}
              </View>
            )}

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mb-8"
            >
               <Text style={tw`text-[10px] font-black text-[#8B95B0] uppercase tracking-widest mb-2`}>Arbitrator Ruling</Text>
               <Text style={tw`text-white text-sm leading-5 font-medium`}>{analysis.judge.ruling}</Text>
            </motion.div>

            {analysis.judge.tradeDetails?.latencyAdjustedForecast && (
               <motion.div 
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 1 }}
                 className="mb-8 bg-[#D9B382]/10 p-4 rounded-xl border border-[#D9B382]/30 border-l-4 border-l-[#D9B382]"
               >
                 <div style={tw`flex-row items-center mb-2`}>
                   <Zap size={14} color="#D9B382" style={tw`mr-2`} />
                   <Text style={tw`text-[#D9B382] text-[10px] font-black uppercase tracking-widest`}>+90s Latency Adjusted Forecast</Text>
                 </div>
                 <Text style={tw`text-white text-xs leading-5 font-medium italic`}>{analysis.judge.tradeDetails.latencyAdjustedForecast}</Text>
               </motion.div>
            )}

            {/* Market Physics & Geometric Oracles Section */}
            {(analysis.structuralPriors || analysis.geometricOracles) && (
              <View style={tw`bg-black/20 rounded-2xl p-4 border border-blue-500/10 mb-8`}>
                <View style={tw`flex-row items-center mb-3`}>
                  <Zap size={14} color="#60A5FA" style={tw`mr-2`} />
                  <Text style={tw`text-[#60A5FA] text-[10px] font-black uppercase tracking-widest`}>Market Physics & Geometric Oracles</Text>
                </View>
                {analysis.structuralPriors && (
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-[8px] font-black text-[#8B95B0] uppercase mb-1.5`}>Structural Priors (Market Gates)</Text>
                    <Text style={tw`text-[#60A5FA] text-[10px] leading-4 font-bold`}>{analysis.structuralPriors}</Text>
                  </View>
                )}
                {analysis.geometricOracles && (
                  <View>
                    <Text style={tw`text-[8px] font-black text-[#8B95B0] uppercase mb-1.5`}>Geometric Features (Deep Graph)</Text>
                    <Text style={tw`text-white text-[10px] leading-4 opacity-80`}>{analysis.geometricOracles}</Text>
                  </View>
                )}
              </View>
            )}

            {analysis.judge.tradeDetails?.techniquesUsed && (
              <View style={tw`mb-8`}>
                 <Text style={tw`text-[10px] font-black text-[#8B95B0] uppercase tracking-widest mb-2`}>Technique Recognition ({analysis.techUsedCount} Found)</Text>
                 <View style={tw`bg-black/30 p-4 rounded-xl border border-[#D9B382]/10`}>
                    <Text style={tw`text-white text-xs leading-5 font-bold italic text-[#D9B382]`}>{analysis.judge.tradeDetails.techniquesUsed}</Text>
                 </View>
              </View>
            )}

            <View style={tw`flex-row gap-4 mb-8`}>
              <View style={tw`flex-1 p-3 bg-black/20 rounded-xl border border-white/5`}>
                <Text style={tw`text-[8px] font-black text-[#8B95B0] uppercase mb-1`}>Confidence</Text>
                <Text style={tw`text-white font-black text-lg`}>{analysis.judge.finalConfidence}%</Text>
              </View>
              <View style={tw`flex-1 p-3 bg-black/20 rounded-xl border border-white/5`}>
                <Text style={tw`text-[8px] font-black text-[#8B95B0] uppercase mb-1`}>Potential Profit</Text>
                <Text style={tw`text-[#22C55E] font-black text-lg`}>+${((Number(profitabilityPercent)/100) * Number(investmentAmount)).toFixed(2)}</Text>
              </View>
            </View>

            {/* Manual Trade Result Declaration */}
            <View style={tw`mt-4 bg-black/40 rounded-2xl p-6 border border-[#D9B382]/30 shadow-lg`}>
                <Text style={tw`text-[#D9B382] font-black uppercase tracking-[2px] text-xs mb-4 text-center`}>
                    {isStatsSaved ? 'TRADE RESULT FINALIZED' : 'DECLARE TRADE OUTCOME'}
                </Text>
                
                {!isStatsSaved ? (
                  <View style={tw`flex-row gap-4`}>
                    <Pressable 
                      onPress={() => saveToStats(analysis, 'WIN')}
                      style={({ pressed }) => [tw`flex-1 bg-green-600 h-12 rounded-xl items-center justify-center flex-row shadow-xl`, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <CheckCircle size={18} color="white" style={tw`mr-2`} />
                      <Text style={tw`text-white font-black uppercase text-sm`}>WIN (PROFIT)</Text>
                    </Pressable>
                    
                    <Pressable 
                      onPress={() => saveToStats(analysis, 'LOSS')}
                      style={({ pressed }) => [tw`flex-1 bg-red-600 h-12 rounded-xl items-center justify-center flex-row shadow-xl`, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <XCircle size={18} color="white" style={tw`mr-2`} />
                      <Text style={tw`text-white font-black uppercase text-sm`}>LOSS</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={tw`items-center`}>
                    <View style={tw`bg-white/10 px-4 py-2 rounded-lg mb-4 flex-row items-center`}>
                      <Check size={16} color="#22C55E" style={tw`mr-2`} />
                      <Text style={tw`text-white text-xs font-bold`}>Entry added to statistics sequence.</Text>
                    </View>
                    
                    <Pressable 
                      onPress={handleDownloadStats}
                      style={({ pressed }) => [tw`bg-[#D9B382] h-12 px-8 rounded-xl items-center justify-center flex-row`, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Download size={18} color="#1A1308" style={tw`mr-2`} />
                      <Text style={tw`text-[#1A1308] font-black uppercase text-sm`}>Download Updated Stats</Text>
                    </Pressable>
                  </View>
                )}
            </View>

            <Pressable 
              onPress={handleReset}
              style={({ pressed }) => [tw`mt-6 bg-[#1A1308] border border-white/10 h-14 rounded-2xl items-center justify-center flex-row shadow-2xl`, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Sparkles size={20} color="#D9B382" style={tw`mr-3`} />
              <Text style={tw`text-white font-black uppercase tracking-[2px] text-sm`}>Start New Analysis</Text>
            </Pressable>
          </motion.div>
        )}
      </View>
    </ScrollView>
    </View>
  );
}

const AnimatedArrows = ({ direction }: { direction: 'UP' | 'DOWN' | 'NO_TRADE' }) => {
  const isUp = direction === 'UP';
  const isNeutral = direction === 'NO_TRADE';

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col justify-center items-center">
      {isNeutral ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center"
        >
          <div className="text-9xl mb-4">✋</div>
          <Text style={tw`text-yellow-500 font-black text-4xl uppercase tracking-[10px]`}>SIGNAL ADVISORY</Text>
        </motion.div>
      ) : (
        <div className="absolute inset-0 flex flex-row flex-wrap justify-around content-around opacity-20">
          {[...Array(24)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: isUp ? 1000 : -1000, opacity: 0 }}
              animate={{ 
                y: isUp ? -1000 : 1000, 
                opacity: [0, 0.8, 0] 
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: Math.random() * 2,
                ease: "linear"
              }}
              style={{ fontSize: 120 }}
              className={`font-black ${isUp ? 'text-green-500' : 'text-red-500'}`}
            >
              {isUp ? '▲' : '▼'}
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Dynamic Scan Line for Added Tech Feel */}
      {!isNeutral && (
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-y-0 w-1 ${isUp ? 'bg-green-500 shadow-[0_0_20px_#22C55E]' : 'bg-red-500 shadow-[0_0_20px_#EF4444]'} opacity-30`}
        />
      )}
    </div>
  );
};
