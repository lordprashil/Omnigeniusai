import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, Users, CreditCard, CheckCircle, XCircle, Loader2, LogOut, Search } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, setDoc, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { PaymentRequest, AdminConfig } from '../types';

interface AdminDashboardProps {
  adminEmail: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminEmail }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [userSearchEmail, setUserSearchEmail] = useState('');
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [togglingPremiumId, setTogglingPremiumId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      const q = query(collection(db, 'paymentRequests'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRequest));
        setRequests(reqs);
        setStats({
          total: reqs.length,
          pending: reqs.filter(r => r.status === 'pending').length,
          verified: reqs.filter(r => r.status === 'verified').length
        });
      });
      return () => unsubscribe();
    }
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      console.log("Attempting admin login for:", email);
      const adminRef = doc(db, 'config', 'admin');
      const adminDoc = await getDoc(adminRef);

      let targetEmail = adminEmail;
      let targetPassword = '123456789';

      if (!adminDoc.exists()) {
        console.log("Admin config not found, initializing with default...");
        // Initialize with default credentials
        await setDoc(adminRef, {
          email: adminEmail,
          passwordHash: '123456789'
        });
      } else {
        const data = adminDoc.data() as AdminConfig;
        targetEmail = data.email;
        targetPassword = data.passwordHash;
      }

      console.log("Comparing credentials:", { inputEmail: email, targetEmail, inputPass: password, targetPass: targetPassword });

      if (email.toLowerCase().trim() === targetEmail.toLowerCase().trim() && password === targetPassword) {
        setIsLoggedIn(true);
      } else {
        setError("Invalid admin credentials. Check email and password.");
      }
    } catch (err: any) {
      console.error("Admin login error details:", err);
      setError(`Login failed: ${err.message || "Unknown error"}. Check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    setResetMessage(`A password reset link has been sent to ${adminEmail}. Please check your inbox.`);
    setTimeout(() => setResetMessage(null), 5000);
  };

  const searchUsers = async () => {
    if (!userSearchEmail.trim()) return;
    setIsSearchingUsers(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '>=', userSearchEmail.toLowerCase()),
        where('email', '<=', userSearchEmail.toLowerCase() + '\uf8ff'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFoundUsers(users);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const togglePremium = async (userId: string, currentStatus: boolean) => {
    setTogglingPremiumId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        isPremium: !currentStatus,
        premiumSince: !currentStatus ? new Date().toISOString() : null
      });
      // Update local state
      setFoundUsers(prev => prev.map(u => u.id === userId ? { ...u, isPremium: !currentStatus } : u));
    } catch (err) {
      console.error("Error toggling premium:", err);
      alert("Failed to update premium status.");
    } finally {
      setTogglingPremiumId(userId);
      setTogglingPremiumId(null);
    }
  };

  const verifyPayment = async (requestId: string, uid: string) => {
    setVerifyingId(requestId);
    try {
      // 1. Update request status
      await updateDoc(doc(db, 'paymentRequests', requestId), {
        status: 'verified'
      });

      // 2. Enable premium for user
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isPremium: true,
        premiumSince: new Date().toISOString()
      });
    } catch (err) {
      console.error("Verification error:", err);
      alert("Failed to verify payment.");
    } finally {
      setVerifyingId(null);
    }
  };

  const rejectPayment = async (requestId: string) => {
    setVerifyingId(requestId);
    try {
      console.log("Rejecting payment request:", requestId);
      await updateDoc(doc(db, 'paymentRequests', requestId), {
        status: 'rejected'
      });
      console.log("Payment request rejected successfully");
    } catch (err) {
      console.error("Rejection error:", err);
      alert("Failed to reject payment: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setVerifyingId(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">Admin Access</h2>
            <p className="text-slate-400">Enter your secret key to unlock the vault.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 ml-1">ADMIN EMAIL</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 transition-all outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 ml-1">PASSWORD</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 transition-all outline-none"
                required
              />
            </div>
            
            {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
              {loading ? "Verifying..." : "Unlock Dashboard"}
            </button>

            <button 
              type="button"
              onClick={handleResetPassword}
              className="w-full text-slate-500 hover:text-indigo-400 text-xs font-bold transition-colors uppercase tracking-widest"
            >
              Forgot Password?
            </button>
          </form>

          <AnimatePresence>
            {resetMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 text-xs text-center font-bold"
              >
                {resetMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">ADMIN <span className="text-indigo-500">CONTROL.</span></h2>
          <p className="text-slate-400">Managing the future of education, one verify at a time.</p>
        </div>
        <button 
          onClick={() => setIsLoggedIn(false)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all text-sm font-bold"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Requests', value: stats.total, icon: CreditCard, color: 'indigo' },
          { label: 'Pending Verification', value: stats.pending, icon: Loader2, color: 'amber' },
          { label: 'Verified Users', value: stats.verified, icon: CheckCircle, color: 'emerald' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
            <div className={`w-10 h-10 bg-${stat.color}-500/10 text-${stat.color}-400 rounded-xl flex items-center justify-center`}>
              <stat.icon size={20} className={stat.label === 'Pending Verification' ? 'animate-spin' : ''} />
            </div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{stat.label}</p>
            <p className="text-3xl font-black text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* User Management Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-slate-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">User Management</h3>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="text" 
                placeholder="Search user by email..."
                value={userSearchEmail}
                onChange={(e) => setUserSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <button 
              onClick={searchUsers}
              disabled={isSearchingUsers}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSearchingUsers ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              Search
            </button>
          </div>
        </div>

        {foundUsers.length > 0 && (
          <div className="p-8 space-y-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Search Results</h4>
            <div className="grid gap-4">
              {foundUsers.map((u) => (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-950 border border-slate-800 rounded-3xl gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 overflow-hidden">
                      {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : <Users size={24} />}
                    </div>
                    <div>
                      <p className="font-black text-white">{u.displayName || 'No Name'}</p>
                      <p className="text-sm text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${u.isPremium ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                      {u.isPremium ? 'Premium Active' : 'Free User'}
                    </div>
                    <button
                      onClick={() => togglePremium(u.id, u.isPremium)}
                      disabled={togglingPremiumId === u.id}
                      className={`px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${
                        u.isPremium 
                          ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20'
                      }`}
                    >
                      {togglingPremiumId === u.id ? <Loader2 className="animate-spin" size={16} /> : null}
                      {u.isPremium ? 'Deactivate Premium' : 'Activate Premium'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <CreditCard className="text-indigo-500" />
            Payment Logs
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50">
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">User Email</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Plan</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Amount</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Status</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.filter(r => r.email.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 font-bold">No payment requests found.</td>
                </tr>
              ) : (
                requests
                  .filter(r => r.email.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((req) => (
                  <tr key={req.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                    <td className="p-4">
                      <div className="font-bold text-white">User {req.email.split('@')[0]} ({req.email}) paid the amount, please verify</div>
                      <div className="text-xs text-slate-500 font-mono mt-1">UID: {req.uid}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-bold">
                        {req.planName}
                      </span>
                    </td>
                    <td className="p-4 font-black text-white">₹{req.amount}</td>
                    <td className="p-4">
                      {req.status === 'pending' ? (
                        <span className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                          <Loader2 size={12} className="animate-spin" />
                          Pending
                        </span>
                      ) : req.status === 'verified' ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                          <CheckCircle size={12} />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-xs font-bold">
                          <XCircle size={12} />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => verifyPayment(req.id!, req.uid)}
                            disabled={verifyingId === req.id}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                          >
                            {verifyingId === req.id ? <Loader2 size={12} className="animate-spin" /> : null}
                            {verifyingId === req.id ? "Verifying..." : "Verify"}
                          </button>
                          <button 
                            onClick={() => rejectPayment(req.id!)}
                            disabled={verifyingId === req.id}
                            className="px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white text-xs font-black rounded-xl transition-all border border-red-500/20 flex items-center gap-2"
                          >
                            <XCircle size={12} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button disabled className="px-4 py-2 bg-slate-800 text-slate-500 text-xs font-black rounded-xl cursor-not-allowed ml-auto">
                          {req.status === 'verified' ? 'Completed' : 'Rejected'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
