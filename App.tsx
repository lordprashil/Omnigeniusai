/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { UserProfile, StudyGuide as StudyGuideType, OperationType } from './types';
import { handleFirestoreError } from './utils/errorHandlers';
import { generateStudyGuideContent } from './services/gemini';
import { StudyGuide } from './components/StudyGuide';
import { ChatBot } from './components/ChatBot';
import { LoadingOverlay } from './components/LoadingOverlay';
import { compressBase64Image } from './utils/imageUtils';
import { 
  BookOpen, 
  Sparkles, 
  History, 
  LogOut, 
  Search, 
  Loader2, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  ArrowRight,
  GraduationCap,
  Zap,
  Moon,
  Sun,
  Menu,
  X,
  Gamepad2,
  Home as HomeIcon,
  Rocket,
  Star,
  Globe,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GameSection } from './components/GameSection';
import { PricingSection } from './components/PricingSection';
import { AdminDashboard } from './components/AdminDashboard';

const ADMIN_EMAIL = 'lordprashil@gmail.com';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [currentGuide, setCurrentGuide] = useState<StudyGuideType | null>(null);
  const [history, setHistory] = useState<StudyGuideType[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState<'home' | 'app' | 'games' | 'pricing' | 'admin'>('home');
  const [isDarkMode, setIsDarkMode] = useState(true); // Force dark mode by default

  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let unsubscribeHistory: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        unsubscribeProfile = fetchProfile(firebaseUser.uid, firebaseUser.email || '', firebaseUser.displayName || 'Learner');
        unsubscribeHistory = fetchHistory(firebaseUser.uid);
      } else {
        setProfile(null);
        setHistory([]);
        if (unsubscribeProfile) unsubscribeProfile();
        if (unsubscribeHistory) unsubscribeHistory();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, []);

  const fetchProfile = (uid: string, email: string, displayName: string) => {
    const userRef = doc(db, 'users', uid);
    return onSnapshot(userRef, async (userSnap) => {
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        
        // 2-week reset logic
        const now = Date.now();
        const lastReset = data.lastResetAt ? (data.lastResetAt as any).toMillis() : data.createdAt ? (data.createdAt as any).toMillis() : now;
        const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
        
        if (now - lastReset > twoWeeksMs && data.generationCount > 0) {
          await updateDoc(userRef, {
            generationCount: 0,
            lastResetAt: serverTimestamp()
          });
        }
        
        setProfile(data);
      } else {
        const newProfile: any = {
          uid,
          email,
          displayName,
          generationCount: 0,
          isPremium: false,
          createdAt: serverTimestamp(),
          lastResetAt: serverTimestamp()
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    });
  };

  const fetchHistory = (uid: string) => {
    const q = query(
      collection(db, 'studyGuides'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const guides = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          sections: data.content ? JSON.parse(data.content) : []
        } as StudyGuideType;
      });
      setHistory(guides);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'studyGuides');
    });
  };

  const handleLogin = async () => {
    if (loading) return;
    const provider = new GoogleAuthProvider();
    try {
      // Use a flag or state to prevent multiple concurrent login attempts
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        console.warn("Login popup was closed or cancelled.");
      } else {
        console.error("Login error:", err);
        setError("Failed to sign in. Please try again.");
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleGenerate = async () => {
    if (!topic.trim() || !profile || !user) return;

    if (!profile.isPremium && profile.generationCount >= 3) {
      setError("You've reached your free limit of 3 guides. Please upgrade to Premium for unlimited access!");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const sections = await generateStudyGuideContent(topic);
      
      // Extract and compress images to save separately to avoid 1MB limit
      const imagesToSave: { index: number, url: string }[] = [];
      const sectionsWithoutImages = [];
      
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        if (s.imageUrl) {
          try {
            const compressed = await compressBase64Image(s.imageUrl, 800000); // 800KB safe limit
            imagesToSave.push({ index: i, url: compressed });
          } catch (compressErr) {
            console.warn("Failed to compress image, skipping persistence:", compressErr);
          }
        }
        const { imageUrl, ...rest } = s;
        sectionsWithoutImages.push(rest);
      }

      const newGuideData = {
        uid: user.uid,
        topic,
        content: JSON.stringify(sectionsWithoutImages),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'studyGuides'), newGuideData);
      
      // Save images to subcollection
      for (const img of imagesToSave) {
        await addDoc(collection(db, 'studyGuides', docRef.id, 'images'), {
          sectionIndex: img.index,
          imageUrl: img.url,
          createdAt: serverTimestamp()
        });
      }

      // Update generation count
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        generationCount: profile.generationCount + 1
      });

      // Update local profile state
      setProfile(prev => prev ? { ...prev, generationCount: prev.generationCount + 1 } : null);
      
      setCurrentGuide({ 
        id: docRef.id, 
        uid: user.uid, 
        topic, 
        sections: sectionsWithoutImages, 
        createdAt: serverTimestamp() 
      });
      setTopic('');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899']
      });
    } catch (err) {
      console.error("Generation error:", err);
      setError("Failed to generate study guide. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const simulatePremium = async () => {
    if (!user || !profile) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { isPremium: true });
      setProfile(prev => prev ? { ...prev, isPremium: true } : null);
      setError(null);
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#d97706']
      });
    } catch (err) {
      console.error("Premium simulation error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 overflow-x-hidden">
        {/* Animated Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#1e1b4b,transparent_70%)] opacity-40"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
        </div>

        {/* Hero Section */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-bold mb-8 uppercase tracking-widest">
              <Rocket size={16} className="animate-bounce" />
              <span>The Future of Learning is Here</span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tighter mb-8 leading-none bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
              OMNIGENIUS <br />
              <span className="text-indigo-500 italic">AESTHETIC.</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
              Information about <span className="text-white underline decoration-indigo-500 decoration-4 underline-offset-4">everything</span>. 
              AI-powered deep dives that actually make sense.
            </p>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <button
                onClick={handleLogin}
                className="group relative px-12 py-6 bg-indigo-600 text-white rounded-3xl font-black text-2xl hover:bg-indigo-700 transition-all shadow-[0_0_40px_rgba(79,70,229,0.4)] hover:shadow-[0_0_60px_rgba(79,70,229,0.6)] flex items-center gap-4"
              >
                <span>ENTER THE VOID</span>
                <ArrowRight className="group-hover:translate-x-2 transition-transform" size={28} />
              </button>
              
              <button
                onClick={() => { setView('pricing'); handleLogin(); }}
                className="px-8 py-4 bg-slate-900/50 border border-slate-800 text-slate-400 rounded-2xl font-bold text-lg hover:text-white hover:bg-slate-800 transition-all"
              >
                PRICING (LIT)
              </button>
            </div>
          </motion.div>

          {/* Floating Space Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth, 
                  y: Math.random() * window.innerHeight,
                  opacity: Math.random() * 0.5 + 0.2
                }}
                animate={{ 
                  y: [null, Math.random() * -100 - 50],
                  opacity: [null, 0]
                }}
                transition={{ 
                  duration: Math.random() * 10 + 5, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="absolute w-1 h-1 bg-white rounded-full"
              />
            ))}
          </div>

          <div className="absolute bottom-12 flex gap-8 text-slate-500 font-bold uppercase tracking-widest text-xs">
            <div className="flex items-center gap-2"><Globe size={14} /> Global Access</div>
            <div className="flex items-center gap-2"><Star size={14} /> 5-Star Vibes</div>
            <div className="flex items-center gap-2"><Zap size={14} /> Instant Gen</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex transition-colors duration-300 overflow-x-hidden">
      <LoadingOverlay isGenerating={generating} onAbort={() => setGenerating(false)} />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <GraduationCap size={20} />
          </div>
          <h2 className="text-lg font-bold tracking-tight">OmniGenius</h2>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-slate-800 rounded-xl text-slate-400"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[80] w-80 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">
              <Sparkles size={24} />
            </div>
            <h2 className="text-xl font-bold tracking-tight">OmniGenius AI</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Navigation */}
          <div className="space-y-1">
            <button
              onClick={() => { setView('home'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${view === 'home' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <HomeIcon size={20} />
              <span>Home</span>
            </button>
            <button
              onClick={() => { setView('app'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${view === 'app' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Search size={20} />
              <span>Explore</span>
            </button>
            <button
              onClick={() => { setView('games'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${view === 'games' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Gamepad2 size={20} />
              <span>Games</span>
            </button>
            <button
              onClick={() => { setView('pricing'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${view === 'pricing' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Zap size={20} />
              <span>Pricing</span>
            </button>
            {user?.email === ADMIN_EMAIL && (
              <button
                onClick={() => { setView('admin'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${view === 'admin' ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-900/20' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Lock size={20} />
                <span>Admin Panel</span>
              </button>
            )}
          </div>

          {/* Usage Stats */}
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Usage</span>
              {profile?.isPremium ? (
                <span className="px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-tighter">Premium</span>
              ) : (
                <span className="text-xs font-bold text-indigo-400">{profile?.generationCount}/3 Free</span>
              )}
            </div>
            {!profile?.isPremium && (
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${(profile?.generationCount || 0) * 33.3}%` }}
                />
              </div>
            )}
            {!profile?.isPremium && profile?.generationCount === 3 && (
              <button
                onClick={simulatePremium}
                className="w-full mt-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={14} />
                Upgrade to Unlimited
              </button>
            )}
          </div>

          {/* History */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
              <History size={14} />
              Recent Deep Dives
            </h3>
            <div className="space-y-1">
              {history.map((guide) => (
                <button
                  key={guide.id}
                  onClick={() => {
                    setCurrentGuide(guide);
                    setView('app');
                    setShowChat(false);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${
                    currentGuide?.id === guide.id 
                      ? 'bg-indigo-900/30 text-indigo-300 font-medium' 
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <BookOpen size={16} className={currentGuide?.id === guide.id ? 'text-indigo-400' : 'text-slate-500'} />
                  <span className="truncate">{guide.topic}</span>
                </button>
              ))}
              {history.length === 0 && (
                <p className="text-xs text-slate-500 px-2 italic">No guides generated yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 bg-slate-700 rounded-full overflow-hidden">
              <img src={user.photoURL || ''} alt="" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-200">{user.displayName}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-xl transition-all text-sm"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative transition-colors duration-300 pt-20 lg:pt-0">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {view === 'home' && (
            <div className="space-y-12">
              <div className="relative p-6 md:p-12 bg-indigo-600 rounded-[2rem] md:rounded-[3rem] overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10">
                  <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">Welcome back, <br />{user.displayName.split(' ')[0]}! 🚀</h2>
                  <p className="text-lg md:text-xl text-indigo-100 mb-8 max-w-xl">Ready to dive deep today? We've got the space-age insights waiting for you.</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => setView('app')}
                      className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-3"
                    >
                      <span>START EXPLORING</span>
                      <ArrowRight size={20} />
                    </button>
                    <button 
                      onClick={() => setView('pricing')}
                      className="px-8 py-4 bg-indigo-500/20 border border-white/20 text-white rounded-2xl font-black text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                    >
                      <Zap size={20} />
                      <span>PRICING</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-400 mb-6">
                    <Zap size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Instant Insights</h3>
                  <p className="text-slate-400">Gen Z speed. No more waiting for slow research.</p>
                </div>
                <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
                  <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6">
                    <Globe size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Any Topic</h3>
                  <p className="text-slate-400">From memes to math, we cover it all.</p>
                </div>
                <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
                  <div className="w-12 h-12 bg-amber-600/20 rounded-2xl flex items-center justify-center text-amber-400 mb-6">
                    <Trophy size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Quiz Mode</h3>
                  <p className="text-slate-400">Test your skills and earn your lit rank.</p>
                </div>
              </div>
            </div>
          )}

          {view === 'app' && (
            <div className="space-y-12">
              {/* Header / Search */}
              <div className="mb-12">
                <h2 className="text-3xl md:text-4xl font-black mb-8 text-white tracking-tight">What's the vibe today?</h2>
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                      <Search className="text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={24} />
                    </div>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                      placeholder="Ask about anything..."
                      className="w-full pl-14 md:pl-16 pr-6 py-5 md:py-6 bg-slate-900 border-2 border-slate-800 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg md:text-xl text-white placeholder-slate-600"
                    />
                  </div>
                  
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !topic.trim()}
                    className="w-full py-5 md:py-6 bg-indigo-600 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-lg md:text-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        <span>COOKING...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={24} />
                        <span>GENERATE DEEP DIVE</span>
                      </>
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-6 p-4 bg-red-900/20 border border-red-900/30 rounded-2xl flex items-center gap-3 text-red-400"
                    >
                      <AlertCircle size={20} />
                      <p className="text-sm font-bold">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Content Area */}
              <div className="space-y-8">
                {currentGuide ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={currentGuide.id}
                  >
                    <StudyGuide guide={currentGuide} />
                  </motion.div>
                ) : (
                  <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-8 md:p-16 text-center border border-slate-800 shadow-2xl">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-400 mx-auto mb-8">
                      <Search size={32} />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black mb-4 text-white">No Insight Selected</h3>
                    <p className="text-slate-400 max-w-md mx-auto text-base md:text-lg">
                      Enter a topic above to generate a new deep dive or select a previous one from the sidebar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'games' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GameSection user={user} profile={profile} />
            </motion.div>
          )}

          {view === 'pricing' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PricingSection 
                user={user}
                profile={profile}
                onUpgrade={() => setView('app')} 
                isPremium={profile?.isPremium || false} 
                onLogin={handleLogin}
              />
            </motion.div>
          )}

          {view === 'admin' && user?.email === ADMIN_EMAIL && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AdminDashboard adminEmail={ADMIN_EMAIL} />
            </motion.div>
          )}
        </div>

        {/* Floating Chat Toggle */}
        {currentGuide && (
          <div className="fixed bottom-8 right-8 z-50">
            <AnimatePresence>
              {showChat && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="mb-4 w-[90vw] md:w-[400px]"
                >
                  <ChatBot topic={currentGuide.topic} />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                showChat ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {showChat ? <Zap size={28} /> : <MessageSquare size={28} />}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
