import React, { useRef, useState, useEffect } from 'react';
import { StudySection, StudyGuide as StudyGuideType } from '../types';
import Markdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, Printer, Star, Zap, Sparkles, Rocket, X, Maximize2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { ThreeDCube } from './ThreeDCube';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface StudyGuideProps {
  guide: StudyGuideType;
}

export const StudyGuide: React.FC<StudyGuideProps> = ({ guide }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const [sectionImages, setSectionImages] = useState<Record<number, string>>({});
  const [expandedImage, setExpandedImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (!guide.id) return;

    const q = query(collection(db, 'studyGuides', guide.id, 'images'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const images: Record<number, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        images[data.sectionIndex] = data.imageUrl;
      });
      setSectionImages(images);
    });

    return () => unsubscribe();
  }, [guide.id]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Genius Insight - ${guide.topic}`,
    onAfterPrint: () => console.log('Print finished'),
    onPrintError: (error) => console.error('Print error:', error),
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-slate-900 shadow-[0_0_100px_rgba(99,102,241,0.3)] rounded-[2rem] md:rounded-[3rem] border border-slate-800 transition-all duration-500 relative overflow-hidden">
      {/* Expanded Image Modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-2xl"
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl w-full max-h-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full backdrop-blur-md"
              >
                <X size={24} />
              </button>
              <img
                src={expandedImage.url}
                alt={expandedImage.title}
                className="w-full h-auto max-h-[80vh] object-contain rounded-3xl shadow-2xl border border-white/10"
                referrerPolicy="no-referrer"
              />
              <div className="mt-6 text-center">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{expandedImage.title}</h3>
                <p className="text-indigo-400 font-bold text-xs tracking-widest mt-2 uppercase">AI-Generated Masterpiece</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dopamine Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, 20, -20],
              x: [-20, 20, -20],
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: i * 0.5,
            }}
            className="absolute w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-12 border-b border-slate-800 pb-6 md:pb-8 relative z-10">
        <div className="flex-1 w-full">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3"
          >
            <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 animate-pulse" />
            <span>VERIFIED INSIGHTS</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-white"
          >
            {guide.topic}
          </motion.h1>
        </div>
        
        <div className="flex flex-col items-center gap-4 w-full md:w-auto">
          <ThreeDCube />
        </div>
      </div>

      <div ref={componentRef} className="space-y-12 md:space-y-16 p-4 md:p-12 bg-slate-950/50 backdrop-blur-md rounded-[2rem] md:rounded-[2.5rem] border border-slate-900 print:bg-white print:text-slate-900 print:p-0 print:border-none relative z-10">
        {/* Header for PDF */}
        <div className="hidden print:block mb-12 border-b-4 border-indigo-600 pb-6">
          <h1 className="text-6xl font-black text-slate-900 uppercase tracking-tighter">{guide.topic}</h1>
          <p className="text-slate-500 mt-4 font-bold uppercase tracking-widest text-sm">Generated by OmniGenius AI • {new Date(guide.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</p>
        </div>

        {guide.sections.map((section, idx) => (
          <motion.section 
            key={idx} 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="space-y-8 break-inside-avoid relative group"
          >
            <div className="absolute -left-12 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
            
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600/20 text-indigo-400 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl border border-indigo-500/20">
                {idx + 1}
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-white print:text-indigo-700 uppercase tracking-tighter">
                {section.title}
              </h2>
            </div>
            
            <div className="prose prose-invert print:prose-slate max-w-none text-slate-400 print:text-slate-800 leading-relaxed text-lg md:text-xl font-medium">
              <Markdown>{section.content}</Markdown>
            </div>

            {sectionImages[idx] && (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => setExpandedImage({ url: sectionImages[idx], title: section.title })}
                className="my-6 md:my-8 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/20 border border-white/10 relative group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                <img 
                  src={sectionImages[idx]} 
                  alt={section.title} 
                  className="w-full h-auto object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                  <div className="p-3 md:p-4 bg-white/10 rounded-full border border-white/20 backdrop-blur-md">
                    <Maximize2 className="text-white w-6 h-6 md:w-8 md:h-8" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 backdrop-blur-md bg-white/5 border-t border-white/10">
                  <p className="text-[10px] md:text-xs text-indigo-300 font-black uppercase tracking-widest text-center">
                    ✨ AI-GENERATED VISUAL MASTERPIECE ✨
                  </p>
                </div>
              </motion.div>
            )}

            {section.chart && (
              <motion.div 
                whileHover={{ y: -5 }}
                className="my-8 md:my-12 p-4 md:p-8 bg-slate-900/50 backdrop-blur-xl print:bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl shadow-purple-500/10 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4">
                  <Sparkles className="text-purple-400 animate-pulse w-4 h-4 md:w-5 md:h-5" />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white print:text-slate-900 mb-6 md:mb-8 text-center uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                  {section.chart.title}
                </h3>
                <div className="h-64 md:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {section.chart.type === 'bar' ? (
                      <BarChart data={section.chart.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '1px solid #1e293b', 
                            borderRadius: '16px',
                            color: '#fff'
                          }} 
                        />
                        <Legend />
                        <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    ) : section.chart.type === 'line' ? (
                      <LineChart data={section.chart.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '1px solid #1e293b', 
                            borderRadius: '16px',
                            color: '#fff'
                          }} 
                        />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 0 }} />
                      </LineChart>
                    ) : (
                      <PieChart>
                        <Pie
                          data={section.chart.data}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {section.chart.data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '1px solid #1e293b', 
                            borderRadius: '16px',
                            color: '#fff'
                          }} 
                        />
                        <Legend />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </motion.section>
        ))}
      </div>
    </div>
  );
};
