import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Trophy, Star, ArrowRight, CheckCircle2, XCircle, Loader2, User as UserIcon, ChevronLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  where
} from 'firebase/firestore';
import { LeaderboardEntry } from '../types';

const QUIZZES = [
  {
    id: 1,
    title: "Cosmic Mysteries",
    description: "Test your knowledge of the universe!",
    questions: [
      { q: "Which planet is known as the Red Planet?", a: ["Mars", "Venus", "Jupiter", "Saturn"], correct: 0, explanation: "Mars is called the Red Planet because of iron oxide (rust) on its surface." },
      { q: "What is the largest planet in our solar system?", a: ["Earth", "Jupiter", "Saturn", "Neptune"], correct: 1, explanation: "Jupiter is a gas giant and the largest planet in our solar system." },
      { q: "Who was the first human to walk on the moon?", a: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"], correct: 1, explanation: "Neil Armstrong was the first person to walk on the moon during the Apollo 11 mission in 1969." },
      { q: "Which planet has the most visible rings?", a: ["Jupiter", "Saturn", "Uranus", "Neptune"], correct: 1, explanation: "Saturn is famous for its extensive and bright ring system." },
      { q: "What is the name of our galaxy?", a: ["Andromeda", "Milky Way", "Sombrero", "Triangulum"], correct: 1, explanation: "We live in the Milky Way galaxy, a barred spiral galaxy." },
      { q: "Which planet is closest to the Sun?", a: ["Venus", "Mercury", "Earth", "Mars"], correct: 1, explanation: "Mercury is the smallest and closest planet to the Sun." }
    ]
  },
  {
    id: 2,
    title: "Global History",
    description: "Major events that shaped our world.",
    questions: [
      { q: "Where were the first Olympic Games held?", a: ["Rome", "Athens", "Sparta", "Olympia"], correct: 3, explanation: "The ancient Olympic Games were held in Olympia, Greece, in 776 BC." },
      { q: "Who was the first President of the United States?", a: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"], correct: 2, explanation: "George Washington served as the first U.S. President from 1789 to 1797." },
      { q: "In which year did World War II end?", a: ["1943", "1944", "1945", "1946"], correct: 2, explanation: "World War II ended in 1945 with the surrender of Germany and Japan." },
      { q: "Who painted the Mona Lisa?", a: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Donatello"], correct: 2, explanation: "Leonardo da Vinci painted the Mona Lisa in the early 16th century." },
      { q: "Which empire built the Colosseum in Rome?", a: ["Greek", "Roman", "Persian", "Egyptian"], correct: 1, explanation: "The Roman Empire built the Colosseum, an iconic amphitheater." }
    ]
  },
  {
    id: 3,
    title: "Logic & Math",
    description: "Sharpen your brain with logic puzzles!",
    questions: [
      { q: "5 + 3 * 2 = ?", a: ["16", "11", "13", "10"], correct: 1, explanation: "Using BODMAS, multiply first: 3 * 2 = 6. Then add: 5 + 6 = 11." },
      { q: "(10 - 4) / 2 = ?", a: ["3", "8", "7", "4"], correct: 0, explanation: "Using BODMAS, solve brackets first: 10 - 4 = 6. Then divide: 6 / 2 = 3." },
      { q: "12 / 3 + 4 * 2 = ?", a: ["16", "12", "10", "14"], correct: 1, explanation: "Using BODMAS, divide and multiply first: 12 / 3 = 4 and 4 * 2 = 8. Then add: 4 + 8 = 12." },
      { q: "5 * (2 + 3) - 10 = ?", a: ["15", "5", "25", "10"], correct: 0, explanation: "Using BODMAS, brackets first: 2 + 3 = 5. Then multiply: 5 * 5 = 25. Then subtract: 25 - 10 = 15." },
      { q: "20 / (2 * 2) + 5 = ?", a: ["15", "10", "5", "20"], correct: 1, explanation: "Using BODMAS, brackets first: 2 * 2 = 4. Then divide: 20 / 4 = 5. Then add: 5 + 5 = 10." },
      { q: "(15 - 5) * (2 + 1) = ?", a: ["20", "25", "30", "35"], correct: 2, explanation: "Using BODMAS, brackets first: 15 - 5 = 10 and 2 + 1 = 3. Then multiply: 10 * 3 = 30." },
      { q: "50 / 5 + 2 * 3 - 4 = ?", a: ["12", "16", "10", "14"], correct: 0, explanation: "Using BODMAS, divide and multiply: 50 / 5 = 10 and 2 * 3 = 6. Then add and subtract: 10 + 6 - 4 = 12." },
      { q: "100 / (10 + 10) * 5 = ?", a: ["20", "25", "30", "15"], correct: 1, explanation: "Using BODMAS, brackets first: 10 + 10 = 20. Then divide: 100 / 20 = 5. Then multiply: 5 * 5 = 25." },
      { q: "(24 / 2) + (18 / 3) - 5 = ?", a: ["10", "15", "13", "12"], correct: 2, explanation: "Using BODMAS, brackets first: 24 / 2 = 12 and 18 / 3 = 6. Then add and subtract: 12 + 6 - 5 = 13." },
      { q: "2 * (5 + 3 * 2) - 4 = ?", a: ["18", "22", "14", "20"], correct: 0, explanation: "Using BODMAS, inside brackets multiply first: 3 * 2 = 6. Then add: 5 + 6 = 11. Then multiply outside: 2 * 11 = 22. Finally subtract: 22 - 4 = 18." },
      { q: "(40 - 10) / 5 * 2 + 8 = ?", a: ["12", "20", "18", "15"], correct: 1, explanation: "Using BODMAS, brackets first: 40 - 10 = 30. Then divide: 30 / 5 = 6. Then multiply: 6 * 2 = 12. Finally add: 12 + 8 = 20." },
      { q: "5 * 5 + (10 / 2) * 3 = ?", a: ["35", "45", "40", "50"], correct: 2, explanation: "Using BODMAS, brackets first: 10 / 2 = 5. Then multiply: 5 * 5 = 25 and 5 * 3 = 15. Finally add: 25 + 15 = 40." }
    ]
  }
];

interface GameSectionProps {
  user: any;
  profile: any;
}

export const GameSection: React.FC<GameSectionProps> = ({ user, profile }) => {
  const [activeGame, setActiveGame] = useState<'quiz' | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<typeof QUIZZES[0] | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [userTotalScore, setUserTotalScore] = useState(0);

  const RANKS = [
    { name: "NOVICE", min: 0, color: "text-slate-400", bg: "bg-slate-400/10" },
    { name: "APPRENTICE", min: 20, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { name: "STRATEGIST", min: 50, color: "text-blue-400", bg: "bg-blue-400/10" },
    { name: "TACTICIAN", min: 100, color: "text-indigo-400", bg: "bg-indigo-400/10" },
    { name: "MASTER", min: 250, color: "text-purple-400", bg: "bg-purple-400/10" },
    { name: "GRANDMASTER", min: 500, color: "text-amber-400", bg: "bg-amber-400/10" },
    { name: "LEGEND", min: 1000, color: "text-rose-400", bg: "bg-rose-400/10" },
    { name: "MYTHIC", min: 2500, color: "text-cyan-400", bg: "bg-cyan-400/10" },
    { name: "ETERNAL", min: 5000, color: "text-fuchsia-400", bg: "bg-fuchsia-400/10" },
    { name: "DIVINE", min: 10000, color: "text-yellow-200", bg: "bg-yellow-500/20" },
    { name: "TRANSCENDENT", min: 25000, color: "text-lime-400", bg: "bg-lime-400/10" },
    { name: "OMNISCIENT", min: 50000, color: "text-white", bg: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" }
  ];

  const getCurrentRank = (score: number) => {
    return [...RANKS].reverse().find(r => score >= r.min) || RANKS[0];
  };

  useEffect(() => {
    if (!user) return;
    
    // Fetch user's total score from all their leaderboard entries
    const q = query(
      collection(db, 'leaderboard'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const total = snapshot.docs.reduce((acc, doc) => acc + (doc.data().score || 0), 0);
      setUserTotalScore(total);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
      setLeaderboard(entries);
      setLoadingLeaderboard(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAnswer = (index: number) => {
    if (!activeQuiz || showExplanation) return;
    
    const isCorrect = index === activeQuiz.questions[currentQuestion].correct;
    setSelectedAnswer(index);
    setLastAnswerCorrect(isCorrect);
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      // For correct answers, we can either proceed immediately or show a brief success state
      // User requested: "if answer is true then to the next question"
      // But for consistency and to show the "correct" feedback, let's show it briefly or use the explanation system
      // Actually, user said: "if answer is true then to the next question if answer is wrong then mark incorrect and give explanation"
      // So let's proceed immediately if correct, or show explanation if wrong.
      setTimeout(() => {
        proceedToNext();
      }, 600);
    } else {
      setShowExplanation(true);
    }
  };

  const proceedToNext = async () => {
    if (!activeQuiz) return;

    if (currentQuestion + 1 < activeQuiz.questions.length) {
      setCurrentQuestion(prev => prev + 1);
      setShowExplanation(false);
      setSelectedAnswer(null);
    } else {
      setShowResult(true);
      
      // Save score to leaderboard
      try {
        await addDoc(collection(db, 'leaderboard'), {
          uid: user.uid,
          displayName: user.displayName || 'Anonymous',
          photoURL: user.photoURL,
          score: score, // Note: score might be updated in state, but let's be careful
          quizTitle: activeQuiz.title,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Error saving score:", err);
      }

      if (score === activeQuiz.questions.length) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#a855f7', '#ec4899']
        });
      }
    }
  };

  const resetQuiz = () => {
    setActiveGame(null);
    setActiveQuiz(null);
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setShowExplanation(false);
    setSelectedAnswer(null);
  };

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">KNOWLEDGE HUB <span className="text-indigo-500 italic">LIT.</span></h2>
          <p className="text-slate-400 text-base md:text-lg">Level up your brain with quick challenges!</p>
        </div>
        <div className={`flex flex-col gap-2 ${getCurrentRank(userTotalScore).bg} border border-white/5 px-4 md:px-6 py-2 md:py-3 rounded-2xl w-fit min-w-[160px]`}>
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-400 w-5 h-5 md:w-6 md:h-6" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Rank</p>
              <p className={`font-black text-lg md:text-xl ${getCurrentRank(userTotalScore).color}`}>{getCurrentRank(userTotalScore).name}</p>
            </div>
          </div>
          
          {/* Rank Progress */}
          {(() => {
            const currentRank = getCurrentRank(userTotalScore);
            const nextRankIndex = RANKS.findIndex(r => r.name === currentRank.name) + 1;
            if (nextRankIndex < RANKS.length) {
              const nextRank = RANKS[nextRankIndex];
              const progress = ((userTotalScore - currentRank.min) / (nextRank.min - currentRank.min)) * 100;
              return (
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Next: {nextRank.name}</span>
                    <span className="text-[8px] text-slate-500 font-bold">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className={`h-full bg-gradient-to-r from-emerald-500 to-blue-500`}
                    />
                  </div>
                </div>
              );
            }
            return (
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Max Rank Achieved!</p>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quiz List / Active Quiz / Chess */}
        <div className="lg:col-span-2 space-y-8">
          {!activeGame ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {QUIZZES.map((quiz) => (
                <motion.div
                  key={quiz.id}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] hover:border-indigo-500/50 transition-all cursor-pointer group relative overflow-hidden"
                  onClick={() => {
                    setActiveGame('quiz');
                    setActiveQuiz(quiz);
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-600/10 transition-all"></div>
                  <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg">
                    <Brain size={28} />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3">{quiz.title}</h3>
                  <p className="text-slate-400 mb-8 leading-relaxed">{quiz.description}</p>
                  <div className="flex items-center text-indigo-400 font-black gap-2 group-hover:gap-4 transition-all uppercase tracking-widest text-sm">
                    <span>Start Quiz</span>
                    <ArrowRight size={18} />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : activeGame === 'quiz' && activeQuiz ? (
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800">
                <motion.div 
                  className="h-full bg-indigo-500" 
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestion + 1) / activeQuiz.questions.length) * 100}%` }}
                />
              </div>

              {!showResult ? (
                <div className="space-y-8 md:space-y-10">
                  <div className="flex justify-between items-center">
                    <span className="px-3 md:px-4 py-1 md:py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest border border-indigo-500/20">
                      Question {currentQuestion + 1} / {activeQuiz.questions.length}
                    </span>
                    <button onClick={resetQuiz} className="text-slate-500 hover:text-white text-xs md:text-sm font-bold transition-colors">CANCEL</button>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
                    {activeQuiz.questions[currentQuestion].q}
                  </h3>
                  
                  <div className="grid gap-3 md:gap-4">
                    {activeQuiz.questions[currentQuestion].a.map((answer, i) => {
                      const isCorrect = i === activeQuiz.questions[currentQuestion].correct;
                      const isSelected = selectedAnswer === i;
                      
                      let buttonClass = "bg-slate-800/50 border-2 border-slate-800";
                      if (showExplanation) {
                        if (isCorrect) buttonClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400";
                        else if (isSelected) buttonClass = "bg-red-500/20 border-red-500 text-red-400";
                        else buttonClass = "bg-slate-800/20 border-slate-800 opacity-50";
                      } else if (isSelected) {
                        buttonClass = isCorrect ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-red-500/20 border-red-500 text-red-400";
                      } else {
                        buttonClass = "hover:border-indigo-500 hover:bg-slate-800";
                      }

                      return (
                        <button
                          key={i}
                          disabled={showExplanation || selectedAnswer !== null}
                          onClick={() => handleAnswer(i)}
                          className={`w-full text-left p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 transition-all font-bold text-base md:text-lg group ${buttonClass}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{answer}</span>
                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 transition-all flex items-center justify-center text-[10px] md:text-xs font-black ${
                              showExplanation && isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 
                              showExplanation && isSelected && !isCorrect ? 'border-red-500 bg-red-500 text-white' :
                              'border-slate-700 group-hover:border-indigo-500'
                            }`}>
                              {showExplanation && isCorrect ? <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : 
                               showExplanation && isSelected && !isCorrect ? <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /> : 
                               String.fromCharCode(65 + i)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {showExplanation && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 bg-slate-800/50 border-2 border-slate-700 rounded-[2rem] space-y-6"
                      >
                        <div className="flex items-center gap-3 text-red-400 font-black uppercase tracking-widest">
                          <XCircle size={24} />
                          <span>Incorrect Vibe</span>
                        </div>
                        <div className="space-y-4">
                          <p className="text-slate-200 text-lg leading-relaxed">
                            <span className="text-indigo-400 font-black">Explanation:</span> {activeQuiz.questions[currentQuestion].explanation}
                          </p>
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                            <p className="text-emerald-400 font-bold">Correct Answer: {activeQuiz.questions[currentQuestion].a[activeQuiz.questions[currentQuestion].correct]}</p>
                          </div>
                        </div>
                        <button
                          onClick={proceedToNext}
                          className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                        >
                          <span>PROCEED TO NEXT</span>
                          <ArrowRight size={24} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center space-y-8 py-10">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-400 mx-auto mb-6 shadow-[0_0_40px_rgba(79,70,229,0.2)]"
                  >
                    <Trophy size={48} />
                  </motion.div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-black text-white">QUIZ DONE!</h3>
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-slate-400 text-xl font-medium">
                        You scored <span className="text-indigo-400 font-black">{score}</span> / <span className="text-white font-black">{activeQuiz.questions.length}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className={`px-4 py-2 rounded-2xl ${getCurrentRank(userTotalScore).bg} border border-white/5 flex items-center gap-2`}>
                          <Star className={`w-5 h-5 ${getCurrentRank(userTotalScore).color} fill-current`} />
                          <span className={`text-sm font-black tracking-widest ${getCurrentRank(userTotalScore).color}`}>{getCurrentRank(userTotalScore).name}</span>
                        </div>
                        <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-amber-400" />
                          <span className="text-sm font-black tracking-widest text-white">{userTotalScore} TOTAL PTS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={resetQuiz}
                    className="px-12 py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20"
                  >
                    BACK TO GAMES
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Leaderboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 space-y-8 h-fit">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500">
              <Trophy size={20} />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Leaderboard</h3>
          </div>

          <div className="space-y-4">
            {loadingLeaderboard ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-slate-600" size={32} />
              </div>
            ) : (
              leaderboard.map((entry, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    entry.uid === user.uid ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-slate-800/30 border-slate-800'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                    i === 0 ? 'bg-amber-500 text-white' : 
                    i === 1 ? 'bg-slate-400 text-white' : 
                    i === 2 ? 'bg-amber-700 text-white' : 
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 shrink-0">
                    {entry.photoURL ? (
                      <img src={entry.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <UserIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-white truncate">{entry.displayName}</p>
                      <div className={`px-2 py-0.5 rounded-full ${getCurrentRank(entry.score).bg} border border-white/5`}>
                        <span className={`text-[8px] font-black tracking-widest ${getCurrentRank(entry.score).color}`}>{getCurrentRank(entry.score).name}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{entry.quizTitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-indigo-400">{entry.score}</p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">PTS</p>
                  </div>
                </div>
              ))
            )}
            {!loadingLeaderboard && leaderboard.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500 font-bold italic">No scores yet. Be the first!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
