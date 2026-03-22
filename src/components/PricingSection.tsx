import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Zap, Star, Rocket, Sparkles, GraduationCap, User, IndianRupee, Loader2, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface PricingSectionProps {
  user: any;
  profile: any;
  onUpgrade: () => void;
  isPremium: boolean;
  onLogin?: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ user, profile, onUpgrade, isPremium, onLogin }) => {
  const [isStudent, setIsStudent] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<'none' | 'loading' | 'instructions'>('none');

  const plans = [
    {
      id: '1month',
      name: "1 Month",
      studentPrice: 50,
      nonStudentPrice: 75,
      description: "Quick boost for exam season",
      features: ["Unlimited Deep Dives", "Priority AI Generation", "Advanced 3D Visuals", "24/7 AI Expert Access"]
    },
    {
      id: '1year',
      name: "1 Year",
      studentPrice: 400,
      nonStudentPrice: 550,
      description: "Full year of unlimited knowledge",
      features: ["Everything in 1 Month", "Exclusive Genius Ranks", "Personalized Insights", "Beta Feature Access"],
      highlight: true
    },
    {
      id: 'lifetime',
      name: "Lifetime",
      studentPrice: 2499,
      nonStudentPrice: 2999,
      description: "Forever genius status",
      features: ["Everything in 1 Year", "Lifetime Updates", "VIP Support", "No Ads Forever"]
    }
  ];

  const handleRequestPayment = async (plan: any) => {
    if (!user) {
      if (onLogin) onLogin();
      return;
    }
    
    if (isStudent) {
      console.log("Triggering student verification flow...");
      setVerificationStep('loading');
      setTimeout(() => {
        setVerificationStep('instructions');
      }, 2000); 
      return;
    }

    setRequesting(plan.id);
    setMessage(null);
    try {
      const amount = isStudent ? plan.studentPrice : plan.nonStudentPrice;
      await addDoc(collection(db, 'paymentRequests'), {
        uid: user.uid,
        email: user.email,
        planName: `${plan.name} (${isStudent ? 'Student' : 'Non-Student'})`,
        amount: amount,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setMessage(`Payment request for ₹${amount} sent! Admin will verify soon.`);
    } catch (err) {
      console.error("Error sending payment request:", err);
      setMessage("Failed to send request. Please try again.");
    } finally {
      setRequesting(null);
    }
  };

  if (verificationStep === 'loading') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20"
        >
          <GraduationCap size={48} className="animate-bounce" />
        </motion.div>
        <h2 className="text-4xl font-black text-white text-center tracking-tighter">
          VERIFY YOURSELF AS A <span className="text-indigo-500 italic">STUDENT</span>
        </h2>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-3 h-3 bg-indigo-500 rounded-full"
            />
          ))}
        </div>
      </div>
    );
  }

  if (verificationStep === 'instructions') {
    return (
      <div className="py-12 max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 space-y-12 shadow-2xl"
        >
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-white tracking-tighter">GENIUS <span className="text-indigo-500">VERIFICATION.</span></h2>
            <p className="text-slate-400">Complete these steps to unlock exclusive pricing.</p>
          </div>

          <div className="grid gap-6">
            {[
              { step: "STEP 1", title: "UPLOAD YOUR ID", desc: "Take a clear photo of your valid identification (Student ID or any valid ID)." },
              { step: "STEP 2", title: "RELAX AND WAIT", desc: "Our team will verify your status. It takes less than a minute to verify!" },
              { step: "STEP 3", title: "START EXPLORING", desc: "Select your plan and start exploring in the most efficient way possible." }
            ].map((s, i) => (
              <div key={i} className="flex gap-6 p-6 bg-slate-950 border border-slate-800 rounded-3xl group hover:border-indigo-500/50 transition-all">
                <div className="shrink-0 w-12 h-12 bg-indigo-600/10 text-indigo-500 rounded-2xl flex items-center justify-center font-black text-lg">
                  {i + 1}
                </div>
                <div>
                  <h4 className="text-indigo-500 font-black text-sm tracking-widest mb-1">{s.step}</h4>
                  <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-6 pt-6">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Send your ID to</p>
            <a 
              href="mailto:lordprashil@gmail.com"
              className="group flex items-center gap-4 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-600/20"
            >
              <Mail size={24} className="group-hover:scale-110 transition-transform" />
              <span>lordprashil@gmail.com</span>
            </a>
            <button 
              onClick={() => setVerificationStep(null)}
              className="text-slate-500 hover:text-white transition-colors font-bold flex items-center gap-2"
            >
              Back to Pricing
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-12 space-y-12">
      <div className="text-center space-y-6">
        <h2 className="text-5xl font-black text-white tracking-tighter">PRICING THAT <span className="text-indigo-500 italic">SLAYS.</span></h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">No hidden fees. Just pure knowledge gains. Choose your path to greatness.</p>
        
        {/* Student Toggle */}
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => setIsStudent(true)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${isStudent ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
          >
            <GraduationCap size={20} />
            <span>Student</span>
          </button>
          <button 
            onClick={() => setIsStudent(false)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${!isStudent ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
          >
            <User size={20} />
            <span>Non-Student</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md mx-auto p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-2xl text-emerald-400 text-center font-bold"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan, i) => {
          const price = isStudent ? plan.studentPrice : plan.nonStudentPrice;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-[3rem] border transition-all flex flex-col ${
                plan.highlight 
                  ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_50px_rgba(79,70,229,0.3)] scale-105 z-10' 
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                  Best Value
                </div>
              )}
              
              <div className="mb-8">
                <h3 className={`text-2xl font-black mb-2 ${plan.highlight ? 'text-white' : 'text-slate-200'}`}>{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <IndianRupee size={24} className={plan.highlight ? 'text-white' : 'text-indigo-400'} />
                  <span className={`text-5xl font-black ${plan.highlight ? 'text-white' : 'text-white'}`}>{price}</span>
                </div>
                <p className={`mt-2 ${plan.highlight ? 'text-indigo-100' : 'text-slate-400'}`}>{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3">
                    <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${plan.highlight ? 'bg-white text-indigo-600' : 'bg-indigo-600/20 text-indigo-400'}`}>
                      <Check size={12} strokeWidth={4} />
                    </div>
                    <span className={plan.highlight ? 'text-indigo-50' : 'text-slate-300'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => isPremium ? onUpgrade() : handleRequestPayment(plan)}
                disabled={requesting === plan.id}
                className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                  plan.highlight 
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-xl' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {requesting === plan.id ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : isPremium ? (
                  <>
                    <CheckCircle2 size={20} />
                    <span>Active (Go to App)</span>
                  </>
                ) : (
                  "Request Access"
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-6 p-6 bg-slate-900/50 border border-slate-800 rounded-3xl">
          <div className="flex items-center gap-2 text-slate-400">
            <Rocket size={20} />
            <span className="font-bold">Instant Activation</span>
          </div>
          <div className="hidden md:block w-px h-8 bg-slate-800"></div>
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles size={20} />
            <span className="font-bold">Cancel Anytime</span>
          </div>
          <div className="hidden md:block w-px h-8 bg-slate-800"></div>
          <div className="flex items-center gap-2 text-slate-400">
            <Star size={20} />
            <span className="font-bold">Student Discount</span>
          </div>
        </div>
      </div>
    </div>
  );
};
