import React, { useState } from 'react';
import { motion, useMotionValue, useAnimationFrame, animate } from 'motion/react';

export const ThreeDCube: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const posX = useMotionValue(0);
  const posY = useMotionValue(0);

  // Slow auto-rotation when not interacting
  useAnimationFrame((_, delta) => {
    if (!isDragging && !rotX.isAnimating() && !rotY.isAnimating()) {
      rotX.set(rotX.get() + delta * 0.02);
      rotY.set(rotY.get() + delta * 0.025);
    }
  });

  return (
    <div className="flex items-center justify-center p-12 perspective-1000 cursor-grab active:cursor-grabbing">
      <motion.div
        onPanStart={() => {
          setIsDragging(true);
          rotX.stop();
          rotY.stop();
          posX.stop();
          posY.stop();
        }}
        onPan={(_, info) => {
          // Update rotation based on delta
          rotX.set(rotX.get() - info.delta.y * 0.5);
          rotY.set(rotY.get() + info.delta.x * 0.5);
          
          // Update position (displacement)
          // We apply a "resistance" to the displacement to make it feel like a rubber band
          const resistance = 0.5;
          posX.set(info.offset.x * resistance);
          posY.set(info.offset.y * resistance);
        }}
        onPanEnd={(_, info) => {
          setIsDragging(false);
          
          // Apply inertia based on release velocity for rotation
          const velocityScale = 0.1;
          
          animate(rotX, rotX.get(), {
            type: "inertia",
            velocity: -info.velocity.y * velocityScale,
            power: 0.2,
            timeConstant: 300,
          });
          
          animate(rotY, rotY.get(), {
            type: "inertia",
            velocity: info.velocity.x * velocityScale,
            power: 0.2,
            timeConstant: 300,
          });

          // Elastic snap back for position
          animate(posX, 0, {
            type: "spring",
            stiffness: 400,
            damping: 20,
            velocity: info.velocity.x
          });
          
          animate(posY, 0, {
            type: "spring",
            stiffness: 400,
            damping: 20,
            velocity: info.velocity.y
          });
        }}
        style={{ 
          rotateX: rotX,
          rotateY: rotY,
          x: posX,
          y: posY,
        }}
        className="relative w-32 h-32 transform-style-3d"
      >
        {/* Front */}
        <div className="absolute inset-0 bg-indigo-500/60 border-2 border-indigo-400 backdrop-blur-md translate-z-16 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_30px_rgba(99,102,241,0.5)] select-none">
          AI
        </div>
        {/* Back */}
        <div className="absolute inset-0 bg-purple-500/60 border-2 border-purple-400 backdrop-blur-md -translate-z-16 rotate-y-180 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_30px_rgba(168,85,247,0.5)] select-none">
          3D
        </div>
        {/* Right */}
        <div className="absolute inset-0 bg-emerald-500/60 border-2 border-emerald-400 backdrop-blur-md translate-x-16 rotate-y-90 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_30px_rgba(16,185,129,0.5)] select-none">
          DATA
        </div>
        {/* Left */}
        <div className="absolute inset-0 bg-amber-500/60 border-2 border-amber-400 backdrop-blur-md -translate-x-16 -rotate-y-90 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_30px_rgba(245,158,11,0.5)] select-none">
          GEN
        </div>
        {/* Top */}
        <div className="absolute inset-0 bg-pink-500/60 border-2 border-pink-400 backdrop-blur-md -translate-y-16 rotate-x-90 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_30px_rgba(236,72,153,0.5)] select-none">
          OMNI
        </div>
        {/* Bottom */}
        <div className="absolute inset-0 bg-cyan-500/60 border-2 border-cyan-400 backdrop-blur-md translate-y-16 -rotate-x-90 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_30px_rgba(6,182,212,0.5)] select-none">
          CORE
        </div>
      </motion.div>
    </div>
  );
};
