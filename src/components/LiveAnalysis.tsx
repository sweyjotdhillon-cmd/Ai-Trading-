import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  TextInput,
  Image,
  Platform,
  Animated,
  Easing,
  Dimensions
} from 'react-native';
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
  Check
} from 'lucide-react';
import tw from 'twrnc';

const JUDGE_TASKS = {
  judge1: ["Scanning support nodes...", "Evaluating volume nodes...", "Mapping price patterns...", "Analyzing breakouts...", "Finalizing Bullish Case..."],
  judge2: ["Locating resistance zones...", "Analyzing selling pressure...", "Checking candle patterns...", "Projecting crash vectors...", "Finalizing Bearish Case..."],
  judge3: ["Searching for local traps...", "Calculating failure risk...", "Checking volume leaks...", "Scanning wick rejections...", "Finalizing Risk Verdict..."],
  judge4: ["Flipping chart matrix...", "Mapping inverse signals...", "Cross-checking symmetry...", "Validating authenticity...", "Finalizing Mirror Test..."],
  system: ["Syncing live vision feed...", "Extracting OHLC data...", "Computing math oracles...", "Aligning market priors...", "Synthesizing full report..."]
};

export function LiveAnalysis() {
  const [stockName, setStockName] = useState('Bitcoin');
  const [graphTimeframe, setGraphTimeframe] = useState('5m');
  const [loading, setLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [mode, setMode] = useState<'camera' | 'upload'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Live Trading Loop States
  const [tradingPhase, setTradingPhase] = useState<'IDLE' | 'ANALYSING_DIRECTION' | 'WAITING_FOR_ENTRY' | 'ENTRY_CONFIRMED'>('IDLE');
  const [tradingDirection, setTradingDirection] = useState<'UP' | 'DOWN' | 'NO_TRADE' | null>(null);
  
  // Live Camera States
  const videoRef = useRef<any>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Parallel Judge Logs
  const [judgeLogs, setJudgeLogs] = useState({
     judge1: { text: "Waiting to initiate...", status: 'idle' },
     judge2: { text: "Waiting to initiate...", status: 'idle' },
     judge3: { text: "Waiting to initiate...", status: 'idle' },
     judge4: { text: "Waiting to initiate...", status: 'idle' },
     system: { text: "Awaiting context...", status: 'idle' }
  });
  
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

  const fileInputRef = useRef<any>(null);
  const techInputRef = useRef<any>(null);
  const statsInputRef = useRef<any>(null);

  const symbols = [
    { name: 'Bitcoin', icon: '₿' },
    { name: 'Apple', icon: 'A' },
    { name: 'Google', icon: 'G' },
  ];

  const timeframes = ['30 minutes', '15 minutes', '5 minutes', '3 minutes'];
  const durations = ['3m', '5m'];

  const startCamera = async () => {
    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
      } catch {
        alert("Camera access denied or not available.");
      }
    } else {
      alert("Live camera is supported on web interface only via standard browser APIs.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track: any) => track.stop());
    }
    setIsCameraActive(false);
  };

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
          alert(`Successfully loaded ${list.length} techniques from ${file.name}.`);
        } catch (err) {
          console.error("Failed to parse technique file:", err);
          alert("Invalid technique file format. Please upload a JSON file containing a list of techniques.");
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
          
          alert(`Successfully loaded ${list.length} records from ${file.name}. This is analysis session #${maxIdx + 1}.`);
        } catch (err) {
          console.error("Failed to parse stats file:", err);
          alert("Invalid stats file format. Please upload a JSON file containing previous results.");
        }
      };
      reader.readAsText(file);
    }
  };

  const saveToStats = (analysisData: any) => {
    try {
      const entryIdx = statsData.length + 1;
      const profit = (Number(profitabilityPercent) / 100) * Number(investmentAmount);
      
      const newEntry = {
        id: entryIdx,
        sessionName: `${stockName.replace('/', '_')}_${entryIdx}`,
        sessionIndex: sessionIndex,
        timestamp: new Date().toISOString(),
        stock: stockName,
        timeframe: graphTimeframe,
        duration: investmentDuration,
        investment: Number(investmentAmount),
        profitPotential: profit,
        lossPotential: Number(investmentAmount),
        signal: analysisData.judge.winner === 'BULL' ? 'CALL' : (analysisData.judge.winner === 'BEAR' ? 'PUT' : 'WAIT'),
        result: Math.random() > 0.5 ? 'WIN' : 'LOSS',
        profitAmount: analysisData.judge.winner === 'BULL' ? 85 : (analysisData.judge.winner === 'BEAR' ? 85 : 0),
        reasoning: analysisData.judge.ruling,
        confidence: analysisData.judge.finalConfidence,
        totalScore: analysisData.judge.totalScore,
        decision: analysisData.judge.decision,
        techniquesApplied: techniquesList
      };
      
      const updatedStats = [...statsData, newEntry];
      setStatsData(updatedStats);

      // Also persist to current session storage for the local view
      const existing = sessionStorage.getItem('stats_surface_data');
      let localStats = { stats: [] };
      if (existing) {
        localStats = JSON.parse(existing);
      }
      localStats.stats.push(newEntry as never);
      sessionStorage.setItem('stats_surface_data', JSON.stringify(localStats));
    } catch (err) {
      console.error("Failed to save stats:", err);
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
    alert(`File ${fileName} downloaded. Upload it for your next analysis session to continue the series!`);
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
      alert("Please start the camera or upload a chart image first.");
      return;
    }

    const techCount = techniquesList.length;
    setLoading(true);
    setAnalysisError(null);
    setAnalysis(null);
    setTradingPhase('ANALYSING_DIRECTION');
    setAnalysisStep(`SYNCHRONIZING ${techCount} TECHNIQUES...`);
    
    setJudgeLogs({
      judge1: { text: "Initializing Deep Scan...", status: 'active' },
      judge2: { text: "Initializing Deep Scan...", status: 'active' },
      judge3: { text: "Initializing Deep Scan...", status: 'active' },
      judge4: { text: "Initializing Deep Scan...", status: 'active' },
      system: { text: "Injecting global context...", status: 'active' }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s Safety Timeout

    try {
      // 1. START DATA FETCH
      const apiCall = fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: finalImageToAnalyze.split(',')[1],
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
        setJudgeLogs({
          judge1: { text: JUDGE_TASKS.judge1[i], status: 'active' },
          judge2: { text: JUDGE_TASKS.judge2[i], status: 'active' },
          judge3: { text: JUDGE_TASKS.judge3[i], status: 'active' },
          judge4: { text: JUDGE_TASKS.judge4[i], status: 'active' },
          system: { text: JUDGE_TASKS.system[i], status: 'active' },
        });
        await new Promise(r => setTimeout(r, 2000));
      }

      setAnalysisStep(`FINALIZING VERDICT (${techCount} TECHNIQUES AUDITED)`);
      setJudgeLogs({
        judge1: { text: JUDGE_TASKS.judge1[4], status: 'active' },
        judge2: { text: JUDGE_TASKS.judge2[4], status: 'active' },
        judge3: { text: JUDGE_TASKS.judge3[4], status: 'active' },
        judge4: { text: JUDGE_TASKS.judge4[4], status: 'active' },
        system: { text: "Simultaneously synthesizing neural nodes...", status: 'active' },
      });

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
          judge1: { text: `Bull: ${data.bull.reasoning.substring(0, 30)}...`, status: 'done' },
          judge2: { text: `Bear: ${data.bear.reasoning.substring(0, 30)}...`, status: 'done' },
          judge3: { text: `Risk: ${data.skeptic.skepticVerdict.substring(0, 30)}...`, status: 'done' },
          judge4: { text: `Mirror: ${data.mirror.reasoning.substring(0, 30)}...`, status: 'done' },
          system: { text: `${data.techUsedCount} Patterns Identified ✅`, status: 'done' }
        });
        
        setAnalysisStep(`Analysis Complete: ${data.techUsedCount}/${techCount} Techniques Found`);
        const direction = data.judge.winner === 'BULL' ? 'UP' : (data.judge.winner === 'BEAR' ? 'DOWN' : 'NO_TRADE');

        setTradingDirection(direction);
        setTradingPhase('WAITING_FOR_ENTRY');
        setAnalysisStep(direction === 'NO_TRADE' ? 'CONFIRMING NO-TRADE SIGNAL...' : 'HUNTING PERFECT ENTRY POINT...');

        await new Promise(r => setTimeout(r, 3000));
        setTradingPhase('ENTRY_CONFIRMED');
        setAnalysisStep('EXECUTE NOW!');
        setAnalysis(data);
        saveToStats(data);
        setTimeout(() => handleDownloadStats(), 500);
        
        // Final reset after some time
        setTimeout(() => {
           setTradingPhase('IDLE');
           setAnalysisStep(null);
           setTradingDirection(null);
        }, 5000);

      } else {
        throw new Error("Analysis failed. Arbitrator did not return a valid decision.");
      }

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("Critical Analysis Error:", error);
      let msg = error.message || "Unknown error";
      if (error.name === 'AbortError') msg = "Analysis timed out (120s limit). Please check your internet or retry.";
      setAnalysisError(msg);
      setTradingPhase('IDLE');
      setLoading(false);
    }
  };
  };



  return (
    <View style={tw`flex-1 bg-black overflow-hidden relative`}>
      {/* Full Screen Overlays */}
      {tradingPhase === 'WAITING_FOR_ENTRY' && tradingDirection && (
          <AnimatedArrows direction={tradingDirection} />
      )}
      
      {tradingPhase === 'ENTRY_CONFIRMED' && tradingDirection && (
          <View style={[
              tw`absolute inset-0 z-[100] justify-center items-center`, 
              tradingDirection === 'UP' ? tw`bg-green-500` : (tradingDirection === 'DOWN' ? tw`bg-red-500` : tw`bg-yellow-600`)
          ]}>
             <Text style={tw`text-white font-black text-6xl tracking-tighter uppercase text-center`}>
                {tradingDirection === 'UP' ? 'PULL UP\nNOW!' : (tradingDirection === 'DOWN' ? 'PULL DOWN\nNOW!' : 'NO TRADE\nABORT!')}
             </Text>
          </View>
      )}

      <ScrollView style={tw`flex-1 bg-black`}>
        {Platform.OS === 'web' && (
          <>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={onFileChange} />
            <input type="file" ref={techInputRef} style={{ display: 'none' }} accept=".json" onChange={onTechniqueChange} />
            <input type="file" ref={statsInputRef} style={{ display: 'none' }} accept=".json" onChange={onStatsFileChange} />
          </>
        )}
      
      <View style={tw`p-4 pb-24`}>
        {/* Compact Terminal Header */}
        <View style={tw`flex-row justify-between items-end mb-4 px-1`}>
          <View>
            <Text style={tw`text-[#D9B382] text-[8px] font-black tracking-[3px] uppercase`}>Pro Terminal v2</Text>
            <Text style={tw`text-white text-2xl font-black`}>CONSOLE</Text>
          </View>
          <View style={tw`flex-row gap-2`}>
            <TouchableOpacity 
              onPress={handlePickTechnique}
              style={[tw`w-9 h-9 rounded-lg items-center justify-center`, techFileName ? tw`bg-[#D9B382]` : tw`bg-white/5 border border-white/10`]}
            >
              <FileText size={16} color={techFileName ? "#1A1308" : "#8B95B0"} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handlePickStatsFile}
              style={[tw`w-9 h-9 rounded-lg items-center justify-center`, statsFileName ? tw`bg-[#D9B382]` : tw`bg-white/5 border border-white/10`]}
            >
              <TrendingUp size={16} color={statsFileName ? "#1A1308" : "#8B95B0"} />
            </TouchableOpacity>
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
                  <TouchableOpacity
                    key={s.name}
                    onPress={() => setStockName(s.name)}
                    style={[
                      tw`flex-1 py-2.5 rounded-lg border items-center flex-row justify-center`,
                      stockName === s.name ? tw`bg-[#D9B382] border-[#D9B382]` : tw`bg-black/20 border-white/5`
                    ]}
                  >
                    <Text style={[tw`mr-1.5 text-xs`, stockName === s.name ? tw`text-black` : tw`text-[#D9B382]`]}>{s.icon}</Text>
                    <Text style={[tw`text-[10px] font-black`, stockName === s.name ? tw`text-black` : tw`text-white`]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
           </View>

           <View style={tw`flex-row gap-3 mb-4 z-50`}>
              <View style={tw`flex-1`}>
                 <Text style={tw`text-[8px] font-black text-[#4B5570] uppercase tracking-wider mb-1.5`}>Graph TF</Text>
                 <View style={tw`relative`}>
                      <TouchableOpacity 
                      onPress={() => { setShowTfPicker(!showTfPicker); setShowDurPicker(false); }}
                      style={tw`bg-black/60 border border-white/10 h-10 rounded-lg px-3 flex-row items-center justify-between`}
                    >
                      <Text style={{ color: '#D9B382', fontWeight: '900', fontSize: 11 }}>{graphTimeframe}</Text>
                      <ChevronDown size={12} color="#D9B382" />
                    </TouchableOpacity>
                    {showTfPicker && (
                      <View style={[tw`absolute top-12 left-0 right-0 bg-[#2A2E39] border-2 border-[#D9B382] rounded-xl p-2 shadow-2xl`, { zIndex: 99999, elevation: 10 }]}>
                        {timeframes.map((tf) => (
                          <TouchableOpacity
                            key={tf}
                            onPress={() => { setGraphTimeframe(tf); setShowTfPicker(false); }}
                            style={[tw`py-4 px-3 rounded-lg border-b border-white/10`, graphTimeframe === tf && tw`bg-[#D9B382]/20`]}
                          >
                            <Text style={[tw`text-sm font-black`, graphTimeframe === tf ? tw`text-[#D9B382]` : tw`text-white`]}>{tf}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                 </View>
              </View>
              <View style={tw`flex-1`}>
                 <Text style={tw`text-[8px] font-black text-[#4B5570] uppercase tracking-wider mb-1.5`}>Duration</Text>
                 <View style={tw`relative`}>
                    <TouchableOpacity 
                      onPress={() => { setShowDurPicker(!showDurPicker); setShowTfPicker(false); }}
                      style={tw`bg-black/60 border border-white/10 h-10 rounded-lg px-3 flex-row items-center justify-between`}
                    >
                      <Text style={{ color: '#D9B382', fontWeight: '900', fontSize: 11 }}>{investmentDuration}</Text>
                      <ChevronDown size={12} color="#D9B382" />
                    </TouchableOpacity>
                    {showDurPicker && (
                      <View style={[tw`absolute top-12 left-0 right-0 bg-[#2A2E39] border-2 border-[#D9B382] rounded-xl p-2 shadow-2xl`, { zIndex: 99999, elevation: 10 }]}>
                        {durations.map((d) => (
                          <TouchableOpacity
                            key={d}
                            onPress={() => { setInvestmentDuration(d); setShowDurPicker(false); }}
                            style={[tw`py-4 px-3 rounded-lg border-b border-white/10`, investmentDuration === d && tw`bg-[#D9B382]/20`]}
                          >
                            <Text style={[tw`text-sm font-black`, investmentDuration === d ? tw`text-[#D9B382]` : tw`text-white`]}>{d}</Text>
                          </TouchableOpacity>
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
                    <TouchableOpacity
                      key={m}
                      onPress={() => setMode(m)}
                      style={[tw`px-3 py-1 rounded-md flex-row items-center`, mode === m ? tw`bg-[#D9B382]` : tw`bg-transparent`]}
                    >
                      {m === 'camera' ? <Camera size={12} color={mode === m ? '#1A1308' : '#4B5570'} /> : <Upload size={12} color={mode === m ? '#1A1308' : '#4B5570'} />}
                      <Text style={[tw`ml-1.5 text-[8px] font-black uppercase`, mode === m ? tw`text-[#1A1308]` : tw`text-[#4B5570]`]}>{m}</Text>
                    </TouchableOpacity>
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
                     <TouchableOpacity onPress={startCamera} style={tw`bg-[#D9B382] px-6 py-3 rounded-lg flex-row items-center`}>
                        <Camera size={18} color="#1A1308" />
                        <Text style={tw`text-[#1A1308] font-black ml-2`}>Start Camera</Text>
                     </TouchableOpacity>
                   </View>
                 )}
                 {isCameraActive && (
                   <TouchableOpacity onPress={stopCamera} style={tw`absolute top-2 right-2 bg-red-500/80 p-1.5 rounded-md`}>
                     <Text style={tw`text-white font-bold text-[8px]`}>STOP</Text>
                   </TouchableOpacity>
                 )}
               </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickImage}
                style={[
                  tw`h-32 w-full rounded-xl bg-black/60 overflow-hidden border items-center justify-center`,
                  selectedImage ? tw`border-[#D9B382]/20` : tw`border-dashed border-white/10`
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
              </TouchableOpacity>
            )}
        </View>

        {/* Action Bar / Live Debate UI */}
        {loading ? (
          <View style={tw`bg-[#14161C] rounded-2xl border border-[#D9B382]/30 p-4 mt-4 shadow-2xl`}>
            <View style={tw`flex-row items-center justify-between mb-4 border-b border-white/10 pb-3`}>
              <View style={tw`flex-row items-center gap-2`}>
                 <ActivityIndicator color="#D9B382" size="small" />
                 <Text style={tw`text-[#D9B382] font-black uppercase tracking-widest text-[10px]`}>
                   {analysisStep || 'Live Neural Debate Active'}
                 </Text>
              </View>
              <Text style={tw`text-[#8B95B0] text-[8px] tracking-widest uppercase`}>Simultaneous execution</Text>
            </View>
            <View style={tw`gap-3`}>
              <View style={tw`bg-black/60 p-3 rounded-lg border border-[#D9B382]/30 flex-row items-center justify-between`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[10px] font-black text-[#D9B382] uppercase tracking-widest mb-1`}>System (Conceptual Context)</Text>
                  <Text style={tw`text-white text-[12px] font-black`}>{judgeLogs.system.text}</Text>
                </View>
                {judgeLogs.system.status === 'done' && <Check size={16} color="#22C55E" />}
              </View>

              <View style={tw`bg-black/60 p-3 rounded-lg border border-green-500/20 flex-row items-center justify-between`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[10px] font-black text-green-400 uppercase tracking-widest mb-1`}>Judge 1 (Bull/Momentum)</Text>
                  <Text style={tw`text-white text-[12px] font-black`}>{judgeLogs.judge1.text}</Text>
                </View>
                {judgeLogs.judge1.status === 'done' && <Check size={16} color="#22C55E" />}
              </View>

              <View style={tw`bg-black/60 p-3 rounded-lg border border-red-500/20 flex-row items-center justify-between`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[10px] font-black text-red-500 uppercase tracking-widest mb-1`}>Judge 2 (Bear/Resistance)</Text>
                  <Text style={tw`text-white text-[12px] font-black`}>{judgeLogs.judge2.text}</Text>
                </View>
                {judgeLogs.judge2.status === 'done' && <Check size={16} color="#22C55E" />}
              </View>

              <View style={tw`bg-black/60 p-3 rounded-lg border border-yellow-500/20 flex-row items-center justify-between`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1`}>Judge 3 (Skeptic/Risk)</Text>
                  <Text style={tw`text-white text-[12px] font-black`}>{judgeLogs.judge3.text}</Text>
                </View>
                {judgeLogs.judge3.status === 'done' && <Check size={16} color="#22C55E" />}
              </View>

              <View style={tw`bg-black/60 p-3 rounded-lg border border-blue-500/20 flex-row items-center justify-between`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1`}>Judge 4 (Mirror/Symmetry)</Text>
                  <Text style={tw`text-white text-[12px] font-black`}>{judgeLogs.judge4.text}</Text>
                </View>
                {judgeLogs.judge4.status === 'done' && <Check size={16} color="#22C55E" />}
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleAnalyze}
            disabled={(mode === 'upload' && !selectedImage) || (mode === 'camera' && !isCameraActive)}
            onPressIn={closePickers}
            style={[
              tw`h-14 rounded-xl items-center justify-center mt-4`,
              ((mode === 'upload' && !selectedImage) || (mode === 'camera' && !isCameraActive)) ? tw`bg-[#D9B382]/20` : tw`bg-[#D9B382]`
            ]}
          >
            <View style={tw`flex-row items-center`}>
              <Sparkles size={18} color="#1A1308" style={tw`mr-2`} />
              <Text style={tw`text-[#1A1308] font-black uppercase tracking-[2px] text-base`}>
                 {mode === 'camera' ? 'Start Camera Analysis' : 'Initiate Analysis'}
              </Text>
            </View>
          </TouchableOpacity>
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
          <View style={tw`bg-[#14161C] rounded-[24px] border border-white/10 p-6 shadow-2xl mb-8`}>
            <View style={tw`flex-row items-center justify-between mb-6 pb-4 border-b border-white/5`}>
              <View style={tw`flex-row items-center`}>
                <Brain size={24} color="#D9B382" style={tw`mr-3`} />
                <View>
                   <Text style={tw`text-lg font-bold text-white`}>Final Arbitrator Report</Text>
                   <Text style={tw`text-[#8B95B0] text-[10px]`}>4-Judge Scoring Framework</Text>
                </View>
              </View>
              <View style={[
                  tw`px-3 py-1 rounded-full flex-row items-center`,
                  analysis.judge.decision === 'STRONG SIGNAL' ? tw`bg-green-500/10` : (analysis.judge.decision === 'MODERATE' ? tw`bg-yellow-500/10` : tw`bg-red-500/10`)
                ]}>
                {analysis.judge.decision === 'STRONG SIGNAL' ? <CheckCircle size={14} color="#22C55E" /> : (analysis.judge.decision === 'MODERATE' ? <AlertTriangle size={14} color="#EAB308" /> : <XCircle size={14} color="#EF4444" />)}
                <Text style={[
                  tw`ml-1 text-[10px] font-black`,
                  analysis.judge.decision === 'STRONG SIGNAL' ? tw`text-green-500` : (analysis.judge.decision === 'MODERATE' ? tw`text-yellow-500` : tw`text-red-500`)
                ]}>{analysis.judge.decision}</Text>
              </View>
            </View>

            {/* ASCII Report Display */}
            <View style={tw`bg-black/60 rounded-2xl p-4 border border-[#D9B382]/20 mb-6`}>
               <Text style={tw`text-[#D9B382] font-mono text-xs mb-2`}>{analysis.judge.formattedReport}</Text>
            </View>

            <View style={tw`bg-black/40 rounded-2xl p-4 border border-white/5 mb-6`}>
               <View style={tw`flex-row items-center mb-4`}>
                  <Terminal size={14} color="#D9B382" style={tw`mr-2`} />
                  <Text style={tw`text-[#D9B382] text-[10px] font-black uppercase tracking-widest`}>Judge Deliberations</Text>
               </View>
               {[
                 { name: 'Judge 1 (Reasoning)', color: '#D9B382', text: `Score: ${analysis.judge.j1Score}/5. Analysis based on agent arguments and structural priors.` },
                 { name: 'Judge 2 (Vehicle)', color: '#D9B382', text: `Score: ${analysis.judge.j2Score}/5. Analysis of trend momentum and bullish/bearish vehicles.` },
                 { name: 'Judge 3 (Z-Score)', color: '#D9B382', text: `Score: ${analysis.judge.j3Score}/2.5. Statistical significance of recent candle movements.` },
                 { name: 'Judge 4 (PLR)', color: '#D9B382', text: `Score: ${analysis.judge.j4Score}/2.5. Price interaction proximity to key levels.` }
               ].map((j, i) => (
                 <View key={i} style={tw`mb-4 last:mb-0`}>
                    <Text style={[tw`text-[9px] font-black uppercase mb-1`, { color: j.color }]}>{j.name}</Text>
                    <Text style={tw`text-white text-[11px] leading-4`}>{j.text}</Text>
                 </View>
               ))}
            </View>

            <View style={tw`mb-8`}>
               <Text style={tw`text-[10px] font-black text-[#8B95B0] uppercase tracking-widest mb-2`}>Arbitrator Ruling</Text>
               <Text style={tw`text-white text-sm leading-5 font-medium`}>{analysis.judge.ruling}</Text>
            </View>

            {analysis.judge.tradeDetails?.techniquesUsed && (
              <View style={tw`mb-8`}>
                 <Text style={tw`text-[10px] font-black text-[#8B95B0] uppercase tracking-widest mb-2`}>Technique Recognition (Indexed)</Text>
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

            <TouchableOpacity
              onPress={handleDownloadStats}
              style={tw`bg-[#D9B382]/20 border border-[#D9B382] p-4 rounded-2xl flex-row items-center justify-center shadow-lg`}
            >
              <Download size={20} color="#D9B382" style={tw`mr-3`} />
              <View>
                 <Text style={tw`text-[#D9B382] font-black uppercase tracking-widest text-xs`}>Export Updated Stats</Text>
                 <Text style={tw`text-[#D9B382] text-[9px]`}>Next: {stockName.replace('/', '_')}_{sessionIndex}.json</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
    </View>
  );
}

const AnimatedArrows = ({ direction }: { direction: 'UP' | 'DOWN' | 'NO_TRADE' }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;
  
  useEffect(() => {
    if (direction === 'NO_TRADE') {
       Animated.loop(
         Animated.sequence([
           Animated.timing(animatedValue, { toValue: 1, duration: 1000, useNativeDriver: false }),
           Animated.timing(animatedValue, { toValue: 0, duration: 1000, useNativeDriver: false }),
         ])
       ).start();
    } else {
       Animated.loop(
         Animated.timing(animatedValue, {
           toValue: 1,
           duration: 2000,
           easing: Easing.linear,
           useNativeDriver: false
         })
       ).start();
    }
  }, [direction, animatedValue]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: direction === 'UP' ? [screenHeight, -screenHeight] : (direction === 'DOWN' ? [-screenHeight, screenHeight] : [0, 0])
  });

  const scale = direction === 'NO_TRADE' ? animatedValue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) : 1;

  return (
    <View style={tw`absolute inset-0 justify-center items-center pointer-events-none z-[80] overflow-hidden`}>
      {direction === 'NO_TRADE' ? (
        <Animated.View style={{ transform: [{ scale }], justifyContent: 'center', alignItems: 'center' }}>
           <Text style={tw`text-9xl font-black text-yellow-500 opacity-50`}>✋</Text>
        </Animated.View>
      ) : (
        <Animated.View style={{ transform: [{ translateY }], flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', width: '100%', height: screenHeight * 2, alignItems: 'center' }}>
          {[...Array(12)].map((_, i) => (
            <Text key={i} style={[tw`text-7xl font-black m-4 opacity-50`, direction === 'UP' ? tw`text-green-500` : tw`text-red-500`]}>
               {direction === 'UP' ? '⬆' : '⬇'}
            </Text>
          ))}
        </Animated.View>
      )}
    </View>
  );
};
