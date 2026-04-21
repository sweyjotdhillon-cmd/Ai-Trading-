import { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  Platform 
} from 'react-native';
import { Upload, Trash2, List, LayoutGrid, Layout, History as HistoryIcon, Target, TrendingUp } from 'lucide-react';
import tw from 'twrnc';
import { useSessionStorage } from '../utils/useSessionStorage';

export function StatisticsView() {
  const [jsonData, setJsonData] = useSessionStorage<any>('stats_surface_data', null);
  const [viewMode, setViewMode] = useState<'grid' | 'dashboard'>('dashboard');

  const handleFileUpload = async () => {
    // In a real native app we would use DocumentPicker
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = JSON.parse(event.target?.result as string);
            setJsonData(json);
          } catch (err) {
            console.error('Error parsing JSON:', err);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }
  };

  const clearData = () => {
    setJsonData(null);
  };

  const statsSummary = useMemo(() => {
    if (!jsonData) return null;
    let statsArray = [];
    if (jsonData.stats && Array.isArray(jsonData.stats)) {
      statsArray = jsonData.stats;
    } else if (Array.isArray(jsonData)) {
      statsArray = jsonData;
    } else {
      return null;
    }
    if (statsArray.length === 0) return null;

    const totalTrades = statsArray.length;
    const wins = statsArray.filter((s: any) => s.result === 'WIN').length;
    const losses = statsArray.filter((s: any) => s.result === 'LOSS').length;
    const winRate = (wins / totalTrades) * 100;
    const totalInvestment = statsArray.reduce((acc: number, s: any) => acc + (Number(s.investmentAmount) || 0), 0);
    const totalProfit = statsArray.reduce((acc: number, s: any) => acc + (Number(s.profitAmount) || 0), 0);
    const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
    const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;

    return { totalTrades, wins, losses, winRate, totalInvestment, totalProfit, roi, avgProfit, statsArray };
  }, [jsonData]);

  const renderDashboard = () => {
    if (!statsSummary) return null;
    const { wins, losses, winRate, roi, totalProfit, statsArray } = statsSummary;

    return (
      <View style={tw`gap-3`}>
        <View style={tw`flex-row flex-wrap gap-3`}>
          <View style={tw`flex-1 min-w-[140px] p-4 bg-[#14161C] border border-white/5 rounded-2xl`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-[9px] font-black text-[#8B95B0] uppercase tracking-widest`}>Win Rate</Text>
              <Target size={12} color="#D9B382" />
            </View>
            <Text style={tw`text-xl font-black text-white`}>{winRate.toFixed(1)}%</Text>
            <Text style={tw`mt-1 text-[9px] text-[#4B5570]`}>{wins}W / {losses}L</Text>
          </View>

          <View style={tw`flex-1 min-w-[140px] p-4 bg-[#14161C] border border-white/5 rounded-2xl`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-[9px] font-black text-[#8B95B0] uppercase tracking-widest`}>Profit</Text>
              <TrendingUp size={12} color={totalProfit >= 0 ? '#22C55E' : '#EF4444'} />
            </View>
            <Text style={[tw`text-xl font-black`, {color: totalProfit >= 0 ? '#22C55E' : '#EF4444'}]}>${totalProfit.toFixed(2)}</Text>
            <Text style={tw`mt-1 text-[9px] text-[#4B5570]`}>ROI: {roi.toFixed(1)}%</Text>
          </View>
        </View>

        <View style={tw`p-4 bg-[#14161C] border border-white/5 rounded-2xl`}>
          <Text style={tw`text-[10px] font-black text-[#D9B382] uppercase tracking-[0.2em] mb-3`}>Recent History</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={tw`min-w-full`}>
               {statsArray.slice(-10).reverse().map((trade: any, idx: number) => (
                <View key={idx} style={tw`flex-row justify-between items-center py-2.5 border-b border-white/5 w-full min-w-[320px]`}>
                  <Text style={tw`text-xs text-[#8B95B0] w-20`}>
                    {trade.timestamp ? new Date(trade.timestamp).toLocaleDateString() : 'N/A'}
                  </Text>
                  <View style={[tw`px-2 py-0.5 rounded w-16 items-center`, trade.signal === 'CALL' ? tw`bg-green-500/10` : tw`bg-red-500/10`]}>
                    <Text style={[tw`text-[10px] font-bold`, trade.signal === 'CALL' ? tw`text-green-500` : tw`text-red-500`]}>{trade.signal}</Text>
                  </View>
                  <Text style={[tw`text-[10px] font-bold w-12`, trade.result === 'WIN' ? tw`text-green-500` : tw`text-red-500`]}>{trade.result}</Text>
                  <Text style={[tw`text-xs font-bold w-16 text-right`, {color: trade.profitAmount >= 0 ? '#22C55E' : '#EF4444'}]}>${Number(trade.profitAmount).toFixed(1)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderDataContent = () => {
    if (!jsonData) return null;
    if (statsSummary && viewMode === 'dashboard') return renderDashboard();
    const dataToRender = statsSummary ? statsSummary.statsArray : (Array.isArray(jsonData) ? jsonData : [jsonData]);

    return (
      <View style={tw`flex-row flex-wrap gap-3 mt-2`}>
        {dataToRender.slice(0, 24).map((item: any, idx: number) => (
          <View key={idx} style={tw`w-[100%] p-4 bg-[#14161C] border border-white/5 rounded-2xl shadow-lg`}>
             <View style={tw`flex-row justify-between items-center mb-2`}>
              <Text style={tw`text-[9px] font-black text-[#D9B382] uppercase tracking-widest`}>Trade Entry #{idx + 1}</Text>
              <Layout size={10} color="#4B5570" />
            </View>
            <View style={tw`gap-1.5`}>
              <View style={tw`flex-row justify-between items-center`}>
                <Text style={tw`text-[10px] text-[#8B95B0]`}>Session:</Text>
                <Text style={tw`text-[10px] text-[#D9B382] font-black`}>#{item.sessionIndex || '1'}</Text>
              </View>
              {Object.entries(item).slice(0, 5).map(([k, v]) => (
                <View key={k} style={tw`flex-row justify-between items-center`}>
                  <Text style={tw`text-[10px] text-[#8B95B0]`}>{k}:</Text>
                  <Text style={tw`text-[10px] text-white font-bold`}>{typeof v === 'object' ? '...' : String(v)}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView 
      style={[tw`flex-1 bg-black`, { height: '100%' }]} 
      contentContainerStyle={[tw`pb-24 p-6`, { flexGrow: 1 }]}
      showsVerticalScrollIndicator={true}
    >
      <View style={tw`mb-6`}>
        <Text style={tw`text-[#D9B382] text-[10px] font-black tracking-widest uppercase mb-1`}>Performance Tracking</Text>
        <View style={tw`flex-row justify-between items-center`}>
          <Text style={tw`text-white text-2xl font-black tracking-tight`}>TRADING JOURNAL</Text>
          <View style={tw`flex-row gap-2`}>
            {jsonData && (
              <Pressable 
                onPress={clearData} 
                style={({ pressed }) => [tw`w-10 h-10 border border-red-500/20 bg-red-500/5 rounded-xl items-center justify-center`, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Trash2 size={18} color="#EF4444" />
              </Pressable>
            )}
            <Pressable 
              onPress={handleFileUpload} 
              style={({ pressed }) => [tw`w-10 h-10 bg-[#D9B382] rounded-xl items-center justify-center shadow-lg`, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Upload size={18} color="#1A1308" />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={tw`flex-1`}>
        {!jsonData ? (
          <View style={tw`items-center justify-center py-20 px-4`}>
            <View style={tw`w-24 h-24 rounded-[32px] bg-[#14161C] items-center justify-center mb-6 border border-white/5`}>
              <HistoryIcon size={40} color="#4B5570" />
            </View>
            <Text style={tw`text-2xl font-bold text-white mb-2 text-center`}>Empty Journal</Text>
            <Text style={tw`text-sm text-[#8B95B0] max-w-[280px] mb-8 text-center`}>
              Your trading history is currently empty. Upload your session data to visualize performance.
            </Text>
            <Pressable 
              onPress={handleFileUpload} 
              style={({ pressed }) => [tw`px-8 py-4 bg-[#D9B382] rounded-[24px]`, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={tw`text-[#1A1308] font-bold`}>Initialize Import</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={tw`flex-row justify-between items-center mb-4`}>
                <Text style={tw`text-[#8B95B0] text-[10px] font-black tracking-widest uppercase`}>
                    {jsonData?.stock ? `Analysis for ${jsonData.stock}` : 'Loaded Data'}
                </Text>
                <View style={tw`flex-row bg-[#14161C] rounded-xl p-1`}>
                    <Pressable 
                      onPress={() => setViewMode('dashboard')} 
                      style={({ pressed }) => [tw`p-2 rounded-lg`, viewMode === 'dashboard' && tw`bg-[#D9B382]`, { opacity: pressed ? 0.7 : 1 }]}
                    >
                        <LayoutGrid size={16} color={viewMode === 'dashboard' ? '#1A1308' : '#8B95B0'} />
                    </Pressable>
                    <Pressable 
                      onPress={() => setViewMode('grid')} 
                      style={({ pressed }) => [tw`p-2 rounded-lg`, viewMode === 'grid' && tw`bg-[#D9B382]`, { opacity: pressed ? 0.7 : 1 }]}
                    >
                        <List size={16} color={viewMode === 'grid' ? '#1A1308' : '#8B95B0'} />
                    </Pressable>
                </View>
            </View>
            {renderDataContent()}
          </>
        )}
      </View>
    </ScrollView>
  );
}
