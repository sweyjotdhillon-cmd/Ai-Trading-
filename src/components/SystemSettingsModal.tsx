import { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Pressable
} from 'react-native';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, CheckCircle, Copy, Share2 } from 'lucide-react';
import tw from 'twrnc';

interface Props {
  show: boolean;
  onClose: () => void;
}

export function SystemSettingsModal({ show, onClose }: Props) {
  const [githubToken, setGithubToken] = useState(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('app_user_github_token') || '' : '';
    } catch {
      return '';
    }
  });

  const [githubEndpoint, setGithubEndpoint] = useState(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('app_user_github_endpoint') || 'https://models.inference.ai.azure.com' : 'https://models.inference.ai.azure.com';
    } catch {
      return 'https://models.inference.ai.azure.com';
    }
  });
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_user_github_token', githubToken);
      localStorage.setItem('app_user_github_endpoint', githubEndpoint);
      // Explicitly make sure legacy keys are cleared
      localStorage.removeItem('app_user_hf_api_key');
      localStorage.removeItem('app_user_reasoning_engine');
      localStorage.removeItem('app_user_vision_model');
    }
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      // Use current origin as the link
      const link = window.location.href;
      navigator.clipboard.writeText(link).then(() => {
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
      });
    }
  };

  return (
    <Modal
      visible={show}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <AnimatePresence>
        {show && (
          <View style={tw`flex-1 justify-center items-center px-4`}>
              <Pressable 
                style={tw`absolute inset-0 bg-black/60`}
                onPress={() => setTimeout(onClose, 10)}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ flex: 1 }}
                />
              </Pressable>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#14161C] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative z-10"
            >
              <View style={tw`flex-row items-center justify-between p-4 border-b border-white/5`}>
                <View style={tw`flex-row items-center`}>
                  <ShieldAlert style={tw`mr-2 text-[#D9B382]`} size={20} />
                  <Text style={tw`text-lg font-bold text-white`}>System Settings</Text>
                </View>
                <TouchableOpacity onPress={() => setTimeout(onClose, 10)} style={tw`p-2 hover:bg-white/5 rounded-full`}>
                  <X size={20} color="#8B95B0" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={tw`p-6`} contentContainerStyle={tw`pb-20`}>
                <View style={tw`mb-8`}>
                  <Text style={tw`text-sm font-semibold text-[#8B95B0] uppercase tracking-wider mb-4`}>
                    Share Application
                  </Text>
                  <View style={tw`border border-white/5 p-4 rounded-xl bg-black/20 mb-4`}>
                    <View style={tw`flex-row items-center justify-between`}>
                      <View style={tw`flex-row items-center gap-3`}>
                        <View style={tw`w-10 h-10 rounded-lg bg-[#D9B382]/10 items-center justify-center`}>
                          <Share2 size={18} color="#D9B382" />
                        </View>
                        <View>
                          <Text style={tw`text-white font-bold text-sm`}>Public Share Link</Text>
                          <Text style={tw`text-[#8B95B0] text-[10px]`}>Share this AI terminal with others</Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        onPress={handleCopyLink}
                        style={[
                          tw`px-3 py-2 rounded-lg flex-row items-center gap-2`,
                          copyStatus === 'copied' ? tw`bg-green-500/10` : tw`bg-[#D9B382]/10`
                        ]}
                      >
                        {copyStatus === 'copied' ? (
                          <CheckCircle size={14} color="#22C55E" />
                        ) : (
                          <Copy size={14} color="#D9B382" />
                        )}
                        <Text style={[tw`text-[10px] font-black uppercase`, copyStatus === 'copied' ? tw`text-green-500` : tw`text-[#D9B382]`]}>
                          {copyStatus === 'copied' ? 'Copied' : 'Copy'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={tw`mb-6`}>
                  <Text style={tw`text-sm font-semibold text-[#8B95B0] uppercase tracking-wider mb-4`}>
                    AI Engine Configuration
                  </Text>
                  
                  <View style={tw`border border-white/5 p-4 rounded-xl bg-black/20 mb-4`}>
                    <View style={tw`relative`}>
                      <Text style={tw`text-xs text-[#8B95B0] mb-2`}>Active AI Model</Text>
                      <View style={tw`w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl`}>
                        <Text style={tw`text-sm text-[#8B95B0]`}>Llama 3.2 90B Vision Instruct</Text>
                      </View>
                      <Text style={tw`mt-2 text-[10px] text-[#D9B382]/80 font-medium`}>
                        Consolidated to GitHub Models API engine.
                      </Text>
                    </View>
                  </View>
    
                  <View style={tw`border border-white/5 p-4 rounded-xl bg-black/20 mt-2 gap-4`}>
                    <View style={tw`relative mb-4`}>
                      <Text style={tw`text-xs text-[#8B95B0] mb-2`}>GitHub Token (Required)</Text>
                      <TextInput
                        secureTextEntry={true}
                        placeholder="Enter GitHub Token"
                        placeholderTextColor="#4B5570"
                        value={githubToken}
                        onChangeText={setGithubToken}
                        style={tw`w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white`}
                      />
                    </View>

                    <View style={tw`relative`}>
                      <Text style={tw`text-xs text-[#8B95B0] mb-2`}>GitHub API Endpoint</Text>
                      <TextInput
                        placeholder="https://models.inference.ai.azure.com"
                        placeholderTextColor="#4B5570"
                        value={githubEndpoint}
                        onChangeText={setGithubEndpoint}
                        style={tw`w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white`}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleSave}
                    style={[
                      tw`mt-8 w-full py-4 rounded-xl flex-row items-center justify-center`,
                      saveStatus === 'saved' 
                        ? tw`bg-green-500/20 border border-green-500/30` 
                        : tw`bg-[#D9B382]`
                    ]}
                  >
                    {saveStatus === 'saved' && <CheckCircle style={tw`mr-2 text-green-400`} size={18} />}
                    <Text style={[
                      tw`text-sm font-bold`,
                      saveStatus === 'saved' ? tw`text-green-400` : tw`text-[#1A1308]`
                    ]}>
                      {saveStatus === 'saved' ? 'Settings Saved' : 'Save Settings'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={tw`bg-black/10 p-4 rounded-xl mb-4`}>
                  <Text style={tw`text-[10px] text-[#8B95B0] text-center italic`}>
                    AI analysis is powered by Google AI Studio. Models use an external API.
                  </Text>
                </View>
              </ScrollView>
            </motion.div>
          </View>
        )}
      </AnimatePresence>
    </Modal>
  );
}
