import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { getChatResponse } from '../services/gemini';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatBotProps {
  topic: string;
}

export const ChatBot: React.FC<ChatBotProps> = ({ topic }) => {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        role: doc.data().role,
        text: doc.data().text
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [topic]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !auth.currentUser) return;

    const userMsg = input;
    setInput('');
    setLoading(true);

    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'messages'), {
        uid: auth.currentUser.uid,
        role: 'user',
        text: userMsg,
        createdAt: serverTimestamp()
      });

      const response = await getChatResponse(topic, messages, userMsg);

      await addDoc(collection(db, 'users', auth.currentUser.uid, 'messages'), {
        uid: auth.currentUser.uid,
        role: 'model',
        text: response,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] md:h-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden transition-colors duration-300">
      <div className="bg-indigo-600 p-3 md:p-4 flex items-center gap-3 text-white">
        <Bot className="w-5 h-5 md:w-6 md:h-6" />
        <div>
          <h3 className="font-semibold text-sm md:text-base">OmniGenius Assistant</h3>
          <p className="text-[10px] md:text-xs text-indigo-100">Expert on: {topic}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 dark:text-slate-500 mt-10 px-4">
            <p className="text-sm md:text-base">Ask me anything about {topic}!</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] md:max-w-[80%] p-2.5 md:p-3 rounded-2xl flex gap-2 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/20' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'
              }`}>
                {msg.role === 'model' && <Bot className="w-4 h-4 md:w-[18px] md:h-[18px] shrink-0 mt-1 text-indigo-500" />}
                <p className="text-xs md:text-sm leading-relaxed">{msg.text}</p>
                {msg.role === 'user' && <User className="w-4 h-4 md:w-[18px] md:h-[18px] shrink-0 mt-1 opacity-70" />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 p-2.5 md:p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 md:w-[18px] md:h-[18px] animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs md:text-sm text-slate-400 dark:text-slate-500 italic">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-3 md:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question..."
          className="flex-1 px-3 md:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white text-sm md:text-base"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="p-2 md:p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-[18px] h-[18px] md:w-5 md:h-5" />
        </button>
      </div>
    </div>
  );
};
