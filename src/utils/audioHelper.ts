/**
 * Web Audio API synthesizer helper to generate clean, professional, and subtle sound effects
 * for compilation completion and indexer sync success.
 */

// Play a subtle, premium dual-frequency chime upon successful package compilation
export const playCompilationSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const now = ctx.currentTime;
    
    // Low pass filter to make the sound warmer & less harsh
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, now);
    filter.connect(ctx.destination);
    
    // Chime Part 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    
    // Smooth fade in & exponential decay
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.08, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    
    osc1.connect(gain1);
    gain1.connect(filter);
    
    // Chime Part 2: A5 (880.00 Hz) - shortly after
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    
    osc2.connect(gain2);
    gain2.connect(filter);
    
    osc1.start(now);
    osc1.stop(now + 0.5);
    
    osc2.start(now + 0.1);
    osc2.stop(now + 0.7);
  } catch (e) {
    console.debug("Web Audio API compilation sound bypassed:", e);
  }
};

// Play a high-tech rapid ascending arpeggio sweep when database indexing completes
export const playIndexerCompleteSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const now = ctx.currentTime;
    
    // Create a high-cut filter for safety comfort
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, now);
    filter.connect(ctx.destination);
    
    // Notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    const chord = [523.25, 659.25, 783.99, 1046.50];
    
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "triangle"; // Softer, vintage triangle oscillator
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      
      // Delay before volume envelope kicks in
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.04, now + idx * 0.05 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
      
      osc.connect(gain);
      gain.connect(filter);
      
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.3);
    });
  } catch (e) {
    console.debug("Web Audio API indexing sound bypassed:", e);
  }
};
