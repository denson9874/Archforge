import React from "react";
import { motion } from "motion/react";

interface FlowingBackgroundProps {
  orbs: string[];
  accentColor: string;
}

export default function FlowingBackground({ orbs, accentColor }: FlowingBackgroundProps) {
  // Extract RGB for the accent color to use in radial gradient
  // Assuming accentColor is a hex string (e.g. "#22d3ee")
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : "6, 182, 212";
  };

  const accentRgb = hexToRgb(accentColor);

  return (
    <>
      <motion.div 
        className={`absolute w-[600px] h-[600px] ${orbs[0]} rounded-full blur-[120px] pointer-events-none -z-10`}
        animate={{
          x: [-50, 50, -30, -50],
          y: [-50, 20, -50, -50],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ top: "-200px", left: "-200px" }}
      />
      
      <motion.div 
        className={`absolute w-[500px] h-[500px] ${orbs[1]} rounded-full blur-[100px] pointer-events-none -z-10`}
        animate={{
          x: [50, -30, 40, 50],
          y: [30, -40, 10, 30],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ top: "30%", right: "-200px" }}
      />

      <motion.div 
        className={`absolute w-[500px] h-[500px] ${orbs[2]} rounded-full blur-[120px] pointer-events-none -z-10`}
        animate={{
          x: [-30, 60, -20, -30],
          y: [20, -50, 40, 20],
          scale: [0.9, 1.1, 1, 0.9],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ bottom: "-200px", left: "20%" }}
      />
      
      <div 
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background: `radial-gradient(circle at center, rgba(${accentRgb}, 0.08), transparent)`
        }}
      />
    </>
  );
}
