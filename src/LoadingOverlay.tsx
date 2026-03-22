import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Brain, Book, Lightbulb, Rocket, Atom } from 'lucide-react';

const FACTS = [
  "Did you know? The human brain can process images in as little as 13 milliseconds.",
  "Fun fact: A single bolt of lightning contains enough energy to toast 100,000 slices of bread.",
  "Learning tip: Teaching someone else is one of the best ways to master a topic.",
  "Did you know? Honey never spoils. Archaeologists have found edible honey in ancient Egyptian tombs.",
  "Fun fact: Octopuses have three hearts and blue blood.",
  "Learning tip: Taking short breaks during study sessions can significantly improve focus.",
  "Did you know? The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion.",
  "Fun fact: Bananas are berries, but strawberries aren't!",
  "Did you know? A day on Venus is longer than a year on Venus.",
  "Fun fact: Wombat poop is cube-shaped.",
  "Learning tip: Spaced repetition is the most effective way to memorize information.",
  "Did you know? There are more trees on Earth than stars in the Milky Way.",
  "Fun fact: The first computer was invented in the 1940s and was the size of a room.",
  "Learning tip: Drinking water can improve your cognitive performance.",
  "Did you know? The Great Wall of China is not visible from space with the naked eye.",
  "Fun fact: A group of flamingos is called a 'flamboyance'.",
  "Learning tip: Sleeping after learning something new helps consolidate the memory.",
  "Did you know? The heart of a shrimp is located in its head.",
  "Fun fact: Sloths can hold their breath longer than dolphins.",
  "Learning tip: Listening to instrumental music can help some people focus better."
];

const ICONS = [Brain, Book, Lightbulb, Rocket, Atom, Sparkles];

export const LoadingOverlay: React.FC<{ isGenerating: boolean; onAbort?: () => void }> = ({ isGenerating, onAbort }) => {
  const [factIndex, setFactIndex] = useState(0);
  const [iconIndex, setIconIndex] = useState(0);
  const [showGame, setShowGame] = useState(false);
  const [targetColor, setTargetColor] = useState('');
  const [gameScore, setGameScore] = useState(0);
  const [gameMessage, setGameMessage] = useState('Click the correct color!');

  const [gameBoxes, setGameBoxes] = useState<{ id: number; name: string; hex: string }[]>([]);

  const NEON_COLORS = [
    { name: 'Red', hex: '#ff0000' },
    { name: 'Blue', hex: '#0000ff' },
    { name: 'Green', hex: '#00ff00' },
    { name: 'Yellow', hex: '#ffff00' },
    { name: 'Orange', hex: '#ffa500' },
    { name: 'Purple', hex: '#800080' },
    { name: 'Cyan', hex: '#00ffff' },
    { name: 'Magenta', hex: '#ff00ff' },
    { name: 'White', hex: '#ffffff' }
  ];

  const pickNewColor = () => {
    // Shuffle NEON_COLORS and pick first 9 to ensure uniqueness
    const shuffled = [...NEON_COLORS].sort(() => Math.random() - 0.5);
    const selectedColors = shuffled.slice(0, 9);
    
    const newBoxes = selectedColors.map((color, i) => ({
      id: i,
      ...color
    }));
    
    setGameBoxes(newBoxes);
    
    // Ensure the target color is one of the selected boxes
    const randomBox = newBoxes[Math.floor(Math.random() * newBoxes.length)];
    setTargetColor(randomBox.name);
  };

  useEffect(() => {
    if (!isGenerating) {
      setShowGame(false);
      return;
    }
    
    const factInterval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FACTS.length);
    }, 4000);

    const iconInterval = setInterval(() => {
      setIconIndex((prev) => (prev + 1) % ICONS.length);
    }, 1000);

    return () => {
      clearInterval(factInterval);
      clearInterval(iconInterval);
    };
  }, [isGenerating]);

  useEffect(() => {
    if (showGame) {
      pickNewColor();
    }
  }, [showGame]);

  const handleColorClick = (colorName: string) => {
    if (colorName === targetColor) {
      setGameScore(prev => prev + 1);
      setGameMessage('Correct! +1');
      pickNewColor();
      setTimeout(() => setGameMessage('Click the correct color!'), 1000);
    } else {
      setGameMessage('Wrong! Try again.');
      setTimeout(() => setGameMessage('Click the correct color!'), 1000);
    }
  };

  const CurrentIcon = ICONS[iconIndex];

  return (
    <AnimatePresence>
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl text-white p-6"
        >
          <div className="max-w-md w-full text-center space-y-12">
            {!showGame ? (
              <>
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/40"
                >
                  <CurrentIcon size={48} />
                </motion.div>

                <div className="space-y-4">
                  <h2 className="text-3xl font-bold tracking-tight text-indigo-100">
                    OmniGenius is Thinking...
                  </h2>
                  <div className="flex justify-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                        className="w-2 h-2 bg-indigo-400 rounded-full"
                      />
                    ))}
                  </div>
                </div>

                <motion.div
                  key={factIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/10 border border-white/20 p-6 rounded-2xl backdrop-blur-sm"
                >
                  <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest mb-2">Pro Tip / Fun Fact</p>
                  <p className="text-lg text-slate-100 leading-relaxed italic">
                    "{FACTS[factIndex]}"
                  </p>
                </motion.div>

                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 15, ease: "linear" }}
                    className="h-full bg-indigo-500"
                  />
                </div>
                
                <div className="space-y-6">
                  <p className="text-slate-400 text-sm animate-pulse">
                    Generating 3D visuals and deep insights...
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setShowGame(true)}
                      className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-black text-lg shadow-xl shadow-indigo-600/30 transition-all transform hover:scale-105 active:scale-95"
                    >
                      PLAY WHILE YOU WAIT 🎮
                    </button>

                    {onAbort && (
                      <button
                        onClick={onAbort}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 text-sm font-bold transition-all"
                      >
                        ABORT GENERATION
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-indigo-400 uppercase tracking-tighter">Color Match</h3>
                  <p className="text-slate-400 font-bold">Score: {gameScore}</p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-[2.5rem] border border-white/10 space-y-6">
                  <p className="text-lg font-black">
                    CLICK THE <span className="text-2xl block mt-1 animate-bounce" style={{ color: NEON_COLORS.find(c => c.name === targetColor)?.hex }}>{targetColor.toUpperCase()}</span> BOX!
                  </p>

                  <div className="grid grid-cols-3 gap-4 max-w-[320px] mx-auto">
                    {gameBoxes.map((box) => (
                      <motion.button
                        key={box.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleColorClick(box.name)}
                        className="aspect-square rounded-2xl shadow-lg transition-all"
                        style={{ 
                          backgroundColor: box.hex,
                          boxShadow: `0 0 20px ${box.hex}44`
                        }}
                      />
                    ))}
                  </div>

                  <p className={`text-xs font-bold ${gameMessage.includes('Correct') ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {gameMessage}
                  </p>
                </div>

                <button
                  onClick={() => setShowGame(false)}
                  className="text-slate-500 hover:text-white text-sm font-bold uppercase tracking-widest transition-colors"
                >
                  Back to Facts
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
