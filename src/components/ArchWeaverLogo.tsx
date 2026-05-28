import React from "react";

interface ArchWeaverLogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

export default function ArchWeaverLogo({
  className = "",
  size = 40,
  animated = true,
}: ArchWeaverLogoProps) {
  // SVG for premium 3D stacked isometric squares representing ArchWeaver's compiling, layer-based, and forge-built ecosystem.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      id="archweaver-stacked-squares-logo"
    >
      <defs>
        {/* Glow Filters */}
        <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        <filter id="neon-glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Fills: Translucent Glass Gradients */}
        <linearGradient id="glassGradientTop" x1="20" y1="20" x2="100" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.32" />
          <stop offset="60%" stopColor="#0891b2" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#312e81" stopOpacity="0.45" />
        </linearGradient>

        <linearGradient id="glassGradientMid" x1="20" y1="45" x2="100" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.45" />
        </linearGradient>

        <linearGradient id="glassGradientBot" x1="20" y1="70" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4338ca" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#312e81" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#030712" stopOpacity="0.6" />
        </linearGradient>

        {/* Stoke: Sharp Metallic-Neon Edge Gradients */}
        <linearGradient id="strokeGradientTop" x1="20" y1="15" x2="100" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.7" />
          <stop offset="70%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>

        <linearGradient id="strokeGradientMid" x1="20" y1="40" x2="100" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#4338ca" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>

        <linearGradient id="strokeGradientBot" x1="20" y1="65" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="60%" stopColor="#1e1b4b" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Center Pillar laser guide */}
        <linearGradient id="laserBeam" x1="60" y1="15" x2="60" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="25%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.6" />
          <stop offset="75%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="particleGradient" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>

      {/* Embedded Animations */}
      {animated && (
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes float-top {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-4px) scale(1.02); }
          }
          @keyframes float-mid {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-2px); }
          }
          @keyframes float-bot {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(1px) scale(0.99); }
          }
          @keyframes laser-pulse {
            0%, 100% { opacity: 0.3; stroke-width: 1px; }
            50% { opacity: 0.65; stroke-width: 1.5px; }
          }
          @keyframes particle-drift {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
            50% { transform: translateY(-6px) translateX(3px); opacity: 0.8; }
          }
          @keyframes particle-drift-reverse {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.1; }
            50% { transform: translateY(-8px) translateX(-4px); opacity: 0.6; }
          }
          #layer-top { animation: float-top 4.2s ease-in-out infinite; transform-origin: 60px 32px; }
          #layer-mid { animation: float-mid 4.2s ease-in-out infinite; transform-origin: 60px 60px; }
          #layer-bot { animation: float-bot 4.2s ease-in-out infinite; transform-origin: 60px 88px; }
          #center-laser { animation: laser-pulse 2.8s ease-in-out infinite; }
          #small-node-1 { animation: particle-drift 3.5s ease-in-out infinite; }
          #small-node-2 { animation: particle-drift-reverse 4.8s ease-in-out infinite; }
        ` }} />
      )}

      {/* Center Laser/Energy Forge Beam - links the stacked squares */}
      <line id="center-laser" x1="60" y1="15" x2="60" y2="105" stroke="url(#laserBeam)" strokeWidth="1" strokeDasharray="3 3" />

      {/* ----------------- BOTTOM SQUARE LAYER ----------------- */}
      <g id="layer-bot">
        {/* Soft Indigo Underground Glow Shadow */}
        <polygon
          points="60,102 104,80 60,58 16,80"
          fill="#4338ca"
          opacity="0.12"
          filter="url(#neon-glow-indigo)"
        />
        {/* The Glass Plate */}
        <polygon
          points="60,101 103,79 60,57 17,79"
          fill="url(#glassGradientBot)"
        />
        {/* Glowing border outline */}
        <polygon
          points="60,101 103,79 60,57 17,79"
          stroke="url(#strokeGradientBot)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Subtle grid accent inside the layer */}
        <line x1="60" y1="57" x2="60" y2="101" stroke="#4338ca" strokeWidth="0.5" opacity="0.15" />
        <line x1="17" y1="79" x2="103" y2="79" stroke="#4338ca" strokeWidth="0.5" opacity="0.15" />
      </g>

      {/* ----------------- MIDDLE SQUARE LAYER ----------------- */}
      <g id="layer-mid">
        {/* Glass Plate */}
        <polygon
          points="60,73 103,51 60,29 17,51"
          fill="url(#glassGradientMid)"
        />
        {/* Glowing border outline */}
        <polygon
          points="60,73 103,51 60,29 17,51"
          stroke="url(#strokeGradientMid)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* Inward grid ticks */}
        <circle cx="60" cy="51" r="1.5" fill="#6366f1" opacity="0.4" />
      </g>

      {/* ----------------- TOP SQUARE LAYER ----------------- */}
      <g id="layer-top">
        {/* Strong cyan diffuse glow overlay */}
        <polygon
          points="60,45 103,23 60,1 17,23"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="1"
          opacity="0.25"
          filter="url(#neon-glow-cyan)"
        />
        {/* Glass Plate */}
        <polygon
          points="60,45 103,23 60,1 17,23"
          fill="url(#glassGradientTop)"
        />
        {/* Solid sharp high-intensity vector contour */}
        <polygon
          points="60,45 103,23 60,1 17,23"
          stroke="url(#strokeGradientTop)"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Modernist central square cutout/core indicator to reflect "forge" concept */}
        <polygon
          points="60,33 81,23 60,13 39,23"
          fill="#111827"
          fillOpacity="0.45"
          stroke="#22d3ee"
          strokeWidth="0.8"
          strokeDasharray="2 1"
          opacity="0.85"
        />
        {/* Blazing core node pointer right in the middle */}
        <circle cx="60" cy="23" r="1.5" fill="#e0f7fa" filter="url(#neon-glow-cyan)" />
      </g>

      {/* Ambient Floating Digital compiler nodes / sparkles */}
      <circle id="small-node-1" cx="30" cy="40" r="1.5" fill="url(#particleGradient)" opacity="0.65" />
      <circle id="small-node-2" cx="95" cy="42" r="1.2" fill="#818cf8" opacity="0.5" />
    </svg>
  );
}
