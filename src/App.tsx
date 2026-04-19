import { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Image,
  StatusBar,
  Platform
} from 'react-native';
import { Settings, LogIn, Activity, LayoutGrid, History as HistoryIcon } from 'lucide-react';

import { LiveAnalysis } from './components/LiveAnalysis';
import { StatisticsView } from './components/StatisticsView';
import { SystemSettingsModal } from './components/SystemSettingsModal';
import { auth, signIn, logOut as firebaseLogOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'live' | 'stats'>('live');
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  
  useEffect(() => {
    const handleError = (e: any) => {
      console.error("Global error caught:", e);
      setError(String(e.message || e));
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    // Basic connectivity check
    const fetchConfig = async () => {
      try {
        await fetch('/api/config');
      } catch (e: any) {
        console.warn("API config fetch failed", e);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
        setUser(currentUser);
        setIsAuthReady(true);
      }, (err) => {
        console.error("Auth change error:", err);
        setError("Auth initialization failed: " + err.message);
        setIsAuthReady(true); // Don't hang forever
      });
      return unsubscribe;
    } catch (e: any) {
      console.error("Auth subscription failed", e);
      setError("Auth system failed: " + e.message);
      setIsAuthReady(true);
    }
  }, []);

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError("Sign-in failed: " + err.message);
    }
  };

  const handleLogOut = async () => {
    try {
      await firebaseLogOut();
    } catch (err: any) {
      console.error("Logout failed:", err);
      setError("Logout failed: " + err.message);
    }
  };

  if (error) {
    return (
      <View style={[styles.loadingContainer, { padding: 40 }]}>
        <ActivityIndicator size="large" color="#EF4444" style={{ marginBottom: 20 }} />
        <Text style={[styles.loadingText, { color: '#EF4444', textAlign: 'center' }]}>CRITICAL ERROR</Text>
        <Text style={{ color: '#8E9299', textAlign: 'center', marginTop: 10 }}>{error}</Text>
        <TouchableOpacity 
          style={[styles.signInButton, { marginTop: 30, backgroundColor: '#14161C', borderColor: '#4B5570', borderWidth: 1 }]}
          onPress={() => window.location.reload()}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Reload Application</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAuthReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D9B382" />
        <Text style={styles.loadingText}>Initializing Trading Engine...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authWrapper}>
          <View style={styles.authCard}>
            <View style={styles.logoContainer}>
              <Activity color="#D9B382" size={48} />
            </View>
            <Text style={styles.authTitle}>AI Trading Assistant</Text>
            <Text style={styles.authSubtitle}>
              Professional-grade market analysis on the go.
            </Text>
            <TouchableOpacity 
              style={styles.signInButton} 
              onPress={handleSignIn}
            >
              <LogIn color="white" size={20} style={{marginRight: 10}} />
              <Text style={styles.signInButtonText}>Sign in with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Refined Android Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Activity color="#1A1308" size={18} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI TRADING</Text>
            <Text style={styles.headerSubtitle}>PRO TERMINAL</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={() => setShowSystemSettings(true)}
          >
            <Settings color="#8E9299" size={20} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleLogOut}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <LogIn color="#1A1308" size={16} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.main}>
        {activeTab === 'live' ? (
          <LiveAnalysis />
        ) : (
          <StatisticsView />
        )}
      </View>

      {/* Modern Android Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.bottomBarItem} 
          onPress={() => setActiveTab('live')}
        >
          <View style={[styles.bottomBarIcon, activeTab === 'live' && styles.bottomBarIconActive]}>
            <LayoutGrid color={activeTab === 'live' ? '#1A1308' : '#8E9299'} size={22} />
          </View>
          <Text style={[styles.bottomBarText, activeTab === 'live' && styles.bottomBarTextActive]}>Console</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottomBarItem} 
          onPress={() => setActiveTab('stats')}
        >
          <View style={[styles.bottomBarIcon, activeTab === 'stats' && styles.bottomBarIconActive]}>
            <HistoryIcon color={activeTab === 'stats' ? '#1A1308' : '#8E9299'} size={22} />
          </View>
          <Text style={[styles.bottomBarText, activeTab === 'stats' && styles.bottomBarTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      <SystemSettingsModal 
        show={showSystemSettings} 
        onClose={() => setShowSystemSettings(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B0E',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0B0E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    color: '#D9B382',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
  },
  authCard: {
    backgroundColor: '#14161C',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(217,179,130,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D9B382',
    marginBottom: 10,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#8E9299',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  signInButton: {
    backgroundColor: '#D9B382',
    width: '100%',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#1A1308',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#0A0B0F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginTop: Platform.OS === 'ios' ? 44 : 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    backgroundColor: '#D9B382',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: '#D9B382',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profilePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D9B382',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    height: 72,
    backgroundColor: '#111318',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
  },
  bottomBarIcon: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bottomBarIconActive: {
    backgroundColor: '#D9B382',
  },
  bottomBarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8E9299',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomBarTextActive: {
    color: 'white',
  },
  main: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#8E9299',
    fontSize: 12,
    marginTop: 10,
  }
});

export default App;
