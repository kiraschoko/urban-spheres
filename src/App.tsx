/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, animate } from 'motion/react';
import { Activity } from 'lucide-react';

// --- Constants & Types ---

const BG_COLOR = '#0b0b0c';

const TOKYO_CONFIG = {
  name: 'Tokyo',
  label: 'Structured Field',
  timezone: 'Asia/Tokyo',
};

const SAO_PAULO_CONFIG = {
  name: 'São Paulo',
  label: 'Organic Field',
  timezone: 'America/Sao_Paulo',
};

const BERLIN_CONFIG = {
  name: 'Berlin',
  label: 'Fragmented Network',
  timezone: 'Europe/Berlin',
};

// --- Utilities ---

const getLocalTime = (utcHours: number, timeZone: string): number => {
  const now = new Date();
  // Use a stable base date (UTC midnight of current day) to calculate the offset
  const baseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const targetDate = new Date(baseDate.getTime() + utcHours * 3600000);
  
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(targetDate);
  const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const s = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
  
  return (h + m / 60 + s / 3600) % 24;
};

const getActivityIntensity = (hour: number): number => {
  const h = hour % 24;
  if (h >= 0 && h < 5) return 0.1 + (h / 5) * 0.05;
  if (h >= 5 && h < 9) return 0.15 + ((h - 5) / 4) * 0.55;
  if (h >= 9 && h < 14) return 0.7 + Math.sin(((h - 9) / 5) * Math.PI) * 0.3;
  if (h >= 14 && h < 17) return 1.0 - ((h - 14) / 3) * 0.2;
  if (h >= 17 && h < 21) return 0.8 + Math.sin(((h - 17) / 4) * Math.PI) * 0.2;
  if (h >= 21) return 0.8 - ((h - 21) / 3) * 0.7;
  return 0.1;
};

const formatTime = (hour: number) => {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const getTokyoFlow = (hour: number): number => {
  const h = hour % 24;
  
  // 00:00–03:00: Concentrated near center
  if (h < 3) return -0.2;
  
  // 03:00–06:00: Slow outward drift
  if (h < 6) {
    const t = (h - 3) / 3;
    return -0.2 + t * 0.5; // -0.2 to 0.3
  }
  
  // 06:00–10:00: Inward rush (commuting increases)
  if (h < 10) {
    const t = (h - 6) / 4;
    return 0.3 - Math.sin(t * Math.PI / 2) * 0.9; // 0.3 to -0.6
  }
  
  // 10:00–12:00: Highest concentration at center
  if (h < 12) return -0.6;
  
  // 12:00–14:00: Stable Midday (softened inward pull)
  if (h < 14) return -0.2;

  // 14:00–16:00: Stillness (high density, almost stationary)
  if (h < 16) return -0.05;
  
  // 16:00–20:00: Instant wave-like shift away from center
  if (h < 20) {
    const t = (h - 16) / 4;
    // Instant jump to strong outward flow, with a slight decay over time
    return 0.6 - t * 0.2; // 0.6 to 0.4
  }
  
  // 20:00–24:00: Outer regions active, center softens
  const t = (h - 20) / 4;
  return 0.4 - Math.sin(t * Math.PI / 2) * 0.6; // 0.4 to -0.2
};

// --- 3D Projection Utility ---

const project = (x: number, y: number, z: number, sphereR: number, width: number, height: number, cy: number, focalLength: number = 400) => {
  const scale = focalLength / (focalLength + z);
  return {
    x: width / 2 + x * scale * sphereR,
    y: cy + y * scale * sphereR,
    scale,
    alpha: Math.max(0, (focalLength - z) / (focalLength * 1.5)) // Simple depth alpha
  };
};

// --- Tokyo System (Structured Commuting System) ---

interface TokyoParticle {
  phi: number;
  theta: number;
  r: number;
  speed: number;
  size: number;
  offset: number;
}

const TokyoSystem = ({ intensity, localTime }: { intensity: number, localTime: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<TokyoParticle[]>([]);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    const count = 4000;
    const p: TokyoParticle[] = [];
    
    for (let i = 0; i < count; i++) {
      // Radial paths: fixed phi and theta
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      p.push({
        phi,
        theta,
        r: 0.1 + Math.random() * 0.9,
        speed: 0.002 + Math.random() * 0.005,
        size: 0.4 + Math.random() * 0.8,
        offset: Math.random() * Math.PI * 2
      });
    }
    particlesRef.current = p;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      const cx = canvas.width / 2;
      const cy = isMobile ? canvas.height * 0.46 : (isTablet ? canvas.height * 0.45 : canvas.height * 0.44);
      const sphereR = Math.min(cx, cy) * (isMobile ? 0.85 : (isTablet ? 0.65 : 0.7));
      const t = time * 0.001;

      // Commuting Flow Logic
      const flow = getTokyoFlow(localTime); 
      
      const h = localTime % 24;
      const isStillnessPeriod = h >= 14 && h < 16;
      const stillnessModifier = isStillnessPeriod ? 0.2 : 1.0;
      
      const particles = particlesRef.current;
      
      // Update and Project
      const projected = particles.map(p => {
        // "Waves" of movement: particles respond to flow with slight phase shifts
        // This is more pronounced during outward phases (flow > 0)
        const waveOffset = Math.sin(p.offset + t * 2) * 0.15 * stillnessModifier;
        const effectiveFlow = flow + (flow > 0 ? waveOffset : waveOffset * 0.2);
        
        const movement = p.speed * effectiveFlow * (0.2 + intensity * 2) * stillnessModifier;
        p.r += movement;

        // Wrap particles within the sphere bounds
        if (p.r > 1.0) p.r = 0.1;
        if (p.r < 0.1) p.r = 1.0;

        // Spherical to Cartesian
        const x = p.r * Math.sin(p.phi) * Math.cos(p.theta);
        const y = p.r * Math.cos(p.phi);
        const z = p.r * Math.sin(p.phi) * Math.sin(p.theta);

        // Global rotation for depth
        const globalRot = t * 0.1;
        const rx = x * Math.cos(globalRot) - z * Math.sin(globalRot);
        const rz = x * Math.sin(globalRot) + z * Math.cos(globalRot);

        const proj = project(rx, y, rz, sphereR, canvas.width, canvas.height, cy);
        
        return {
          ...proj,
          size: p.size,
          pz: rz,
          r: p.r
        };
      }).sort((a, b) => b.pz - a.pz);

      // Draw
      for (const p of projected) {
        // Density visualization: center is brighter during inward phase, outer during outward
        const isCenter = p.r < 0.4;
        const isInward = flow < 0;
        
        let alpha = p.alpha * (0.2 + intensity * 0.8);
        
        // Highlight the flow
        if (isInward && isCenter) alpha *= 1.5;
        if (!isInward && !isCenter) alpha *= 1.2;

        const size = p.size * p.scale;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stable Core
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + intensity * 0.2})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 4 * (1 + intensity), 0, Math.PI * 2);
      ctx.fill();

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [intensity, localTime]);

  return (
    <div className="relative w-full min-h-[80vh] md:h-full flex flex-col items-center justify-center md:justify-center lg:justify-end py-20 md:py-0 md:pb-0 lg:pb-40">
      <div className="relative w-full aspect-square max-w-[400px] md:max-w-[300px] lg:max-w-none md:relative lg:absolute lg:inset-0 lg:aspect-auto">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3 md:gap-1 lg:gap-3 text-center pointer-events-none -mt-10 md:mt-0 lg:mt-0">
        <h2 className="text-[9px] tracking-[0.5em] uppercase text-white/50">Commuting System</h2>
        <div className="text-xl font-light tracking-widest text-white/80">{TOKYO_CONFIG.name}</div>
        <div className="text-[10px] font-mono text-white/90">{formatTime(localTime)}</div>
      </div>
    </div>
  );
};

// --- São Paulo System (Organic Volumetric Field) ---

interface SPParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  noiseOffset: number;
  phaseX: number;
  phaseY: number;
  phaseZ: number;
  freqX: number;
  freqY: number;
  freqZ: number;
}

const SaoPauloSystem = ({ intensity, localTime, isLive }: { intensity: number, localTime: number, isLive: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<SPParticle[]>([]);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const internalTimeRef = useRef<number>(Math.random() * 1000);
  
  // Decouple slider state from render loop lifecycle
  const paramsRef = useRef({ intensity, localTime });
  useEffect(() => {
    paramsRef.current = { intensity, localTime };
  }, [intensity, localTime]);

  useEffect(() => {
    const count = 2500;
    const p: SPParticle[] = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 1/3);
      
      p.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.cos(phi),
        z: r * Math.sin(phi) * Math.sin(theta),
        vx: 0, vy: 0, vz: 0,
        size: 0.6 + Math.random() * 1.0,
        noiseOffset: Math.random() * 1000,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        phaseZ: Math.random() * Math.PI * 2,
        freqX: 0.8 + Math.random() * 0.6,
        freqY: 0.8 + Math.random() * 0.6,
        freqZ: 0.8 + Math.random() * 0.6,
      });
    }
    particlesRef.current = p;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = Math.min(time - lastTimeRef.current, 100);
      lastTimeRef.current = time;

      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      const cx = canvas.width / 2;
      const cy = isMobile ? canvas.height * 0.46 : (isTablet ? canvas.height * 0.45 : canvas.height * 0.44);
      const sphereR = Math.min(cx, cy) * (isMobile ? 0.9 : (isTablet ? 0.7 : 0.75));

      // Use refs to avoid re-triggering the effect on slider move
      const { intensity: curIntensity, localTime: curLocalTime } = paramsRef.current;

      const hour = curLocalTime % 24;
      
      // Activity Schedule Mapping with Smooth Interpolation
      // 07:00–09:00: medium (0.6)
      // 09:00–15:00: highest (1.0)
      // 15:00–18:00: medium (0.6)
      // 18:00–22:00: low (0.35)
      // 22:00–07:00: very low (0.15)
      
      const pts = [
        { h: 0, v: 0.25 }, 
        { h: 6, v: 0.25 }, 
        { h: 8, v: 0.6 }, 
        { h: 10, v: 1.0 }, 
        { h: 14, v: 1.0 }, 
        { h: 16.5, v: 0.6 }, 
        { h: 19, v: 0.4 }, 
        { h: 22, v: 0.25 }, 
        { h: 24, v: 0.25 }
      ];

      let intensityFactor = 0.15;
      for (let i = 0; i < pts.length - 1; i++) {
        if (hour >= pts[i].h && hour <= pts[i+1].h) {
          const t = (hour - pts[i].h) / (pts[i+1].h - pts[i].h);
          const st = t * t * (3 - 2 * t); // Smoothstep easing
          intensityFactor = pts[i].v + (pts[i+1].v - pts[i].v) * st;
          break;
        }
      }

      // Rescale intensity: Use 15:20 level (~0.78) as the new peak baseline
      // This reduces the speed during 09:00-15:00 to match the 15:20 intensity
      const scale = 0.78;
      intensityFactor *= scale;

      // Exaggerated parameter mapping for high contrast between states
      const speedBase = 0.15 + intensityFactor * 2.35; // Range: 0.15 to ~2.0
      const brightness = 0.2 + intensityFactor * 0.8; 
      const densityStrength = 0.2 + intensityFactor * 0.8; 
      const turbulenceBase = 0.3 + intensityFactor * 1.7; // Range: 0.3 to ~1.63

      // Continuous internal time
      internalTimeRef.current += deltaTime * 0.001 * speedBase;
      const t = internalTimeRef.current;
      
      const particles = particlesRef.current;

      const projected = particles.map(p => {
        // Independent chaotic wandering
        // Amplitude responds instantly to slider/intensity
        const amp = 0.07 * turbulenceBase * (0.5 + curIntensity * 0.5);
        
        const ox = Math.sin(t * p.freqX + p.phaseX) * amp;
        const oy = Math.cos(t * p.freqY + p.phaseY) * amp;
        const oz = Math.sin(t * p.freqZ + p.phaseZ) * amp;

        const curX = p.x + ox;
        const curY = p.y + oy;
        const curZ = p.z + oz;

        // Density field shifts with slider for immediate "redistribution" feedback
        // This moves the "clouds" without moving the particles themselves
        const dShift = curLocalTime * 0.8; 
        const d1 = Math.sin(p.x * 2.4 + dShift + p.noiseOffset * 0.01) * Math.cos(p.y * 1.8);
        const d2 = Math.sin(p.z * 2.6 - dShift) * Math.cos(p.x * 1.6 + p.noiseOffset * 0.02);
        const density = (d1 + d2 + 2) / 4; 

        const proj = project(curX, curY, curZ, sphereR, canvas.width, canvas.height, cy);
        
        const flicker = 0.85 + Math.sin(t * 8 + p.noiseOffset) * 0.15;
        const alpha = proj.alpha * brightness * flicker * ( (1 - densityStrength) + density * densityStrength ) * (0.6 + curIntensity * 0.4);
        
        return {
          ...proj,
          size: p.size,
          pz: curZ,
          alpha
        };
      }).sort((a, b) => b.pz - a.pz);

      for (const p of projected) {
        const size = p.size * p.scale;
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); // Empty dependency array: render loop runs independently of React state updates

  return (
    <div className="relative w-full min-h-[80vh] md:h-full flex flex-col items-center justify-center md:justify-center lg:justify-end py-20 md:py-0 md:pb-0 lg:pb-40">
      <div className="relative w-full aspect-square max-w-[400px] md:max-w-[300px] lg:max-w-none md:relative lg:absolute lg:inset-0 lg:aspect-auto">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3 md:gap-1 lg:gap-3 text-center pointer-events-none -mt-10 md:mt-0 lg:mt-0">
        <h2 className="text-[9px] tracking-[0.5em] uppercase text-white/50">{SAO_PAULO_CONFIG.label}</h2>
        <div className="text-xl font-light tracking-widest text-white/80">{SAO_PAULO_CONFIG.name}</div>
        <div className="text-[10px] font-mono text-white/90">{formatTime(localTime)}</div>
      </div>
    </div>
  );
};

// --- Berlin System (Decentralized Nightlife Simulation) ---

interface BerlinParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  noiseOffset: number;
}

interface BerlinHotspot {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  startTime: number;
  peakTime: number;
  endTime: number;
  maxIntensity: number;
}

const BerlinSystem = ({ intensity: globalIntensity, localTime }: { intensity: number, localTime: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<BerlinParticle[]>([]);
  const hotspotsRef = useRef<BerlinHotspot[]>([]);
  const requestRef = useRef<number>(null);
  const prevLocalTimeRef = useRef(-1);

  // Initialize particles and hotspots
  useEffect(() => {
    // 1. Particles: Low-density background across the sphere
    const p: BerlinParticle[] = [];
    const count = 2000;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.8) * 0.95; 
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);

      p.push({
        x, y, z, baseX: x, baseY: y, baseZ: z,
        vx: (Math.random() - 0.5) * 0.0003,
        vy: (Math.random() - 0.5) * 0.0003,
        vz: (Math.random() - 0.5) * 0.0003,
        size: 0.5 + Math.random() * 0.8,
        noiseOffset: Math.random() * 1000
      });
    }
    particlesRef.current = p;

    // 2. Hotspots: Decentralized and asynchronous
    const hs: BerlinHotspot[] = [];
    const hotspotCount = 20;
    
    for (let i = 0; i < hotspotCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.3 + Math.random() * 0.55; 
      
      // Lifecycles concentrated between 17:00 and 01:00
      const start = 17 + Math.random() * 3; // 17:00 - 20:00
      const peak = start + 1 + Math.random() * 2; // 18:00 - 22:00
      const end = 24.5 + Math.random() * 0.5; // Dissolve around 00:30 - 01:00
      
      hs.push({
        id: `hs-${i}`,
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.cos(phi),
        z: r * Math.sin(phi) * Math.sin(theta),
        radius: 0.08 + Math.random() * 0.12,
        startTime: start,
        peakTime: peak,
        endTime: end,
        maxIntensity: 0.6 + Math.random() * 0.4
      });
    }
    hotspotsRef.current = hs;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      const cx = canvas.width / 2;
      const cy = isMobile ? canvas.height * 0.46 : (isTablet ? canvas.height * 0.45 : canvas.height * 0.44);
      const sphereR = Math.min(cx, cy) * (isMobile ? 0.95 : (isTablet ? 0.75 : 0.8));
      const t = time * 0.001;
      
      let hour = localTime % 24;
      // Handle wrap-around for logic (01:00 is the end of the "night")
      if (hour < 1) hour += 24;

      // Calculate active hotspots
      // Strict rule: Before 17:00, no hotspots.
      const activeHotspots = (hour < 17) ? [] : hotspotsRef.current.map(h => {
        let intensity = 0;
        if (hour >= h.startTime && hour <= h.endTime) {
          if (hour <= h.peakTime) {
            // Forming
            intensity = (hour - h.startTime) / (h.peakTime - h.startTime);
          } else {
            // Dissolving
            intensity = 1 - (hour - h.peakTime) / (h.endTime - h.peakTime);
          }
          intensity *= h.maxIntensity;
        }
        return { ...h, currentIntensity: intensity };
      }).filter(h => h.currentIntensity > 0);

      const particles = particlesRef.current;

      // Detect "jump" in time (manual slider drag or first load)
      const timeDiff = Math.abs(localTime - prevLocalTimeRef.current);
      const isJump = prevLocalTimeRef.current === -1 || (timeDiff > 0.02 && timeDiff < 23.0); 
      prevLocalTimeRef.current = localTime;

      const simulationSteps = isJump ? 60 : 1;

      for (let step = 0; step < simulationSteps; step++) {
        // Update Particles
        particles.forEach(p => {
          // 1. Subtle background motion
          p.vx += (Math.random() - 0.5) * 0.0003;
          p.vy += (Math.random() - 0.5) * 0.0003;
          p.vz += (Math.random() - 0.5) * 0.0003;

          // 2. Attraction to active hotspots
          activeHotspots.forEach(h => {
            const dx = h.x - p.x;
            const dy = h.y - p.y;
            const dz = h.z - p.z;
            const distSq = dx*dx + dy*dy + dz*dz;
            const dist = Math.sqrt(distSq);
            
            if (dist < h.radius * 2.5) {
              const force = Math.pow(1 - dist / (h.radius * 2.5), 2) * h.currentIntensity * 0.003;
              p.vx += dx * force;
              p.vy += dy * force;
              p.vz += dz * force;
            }
          });

          // 3. Sphere constraint & Return force
          const distFromCenter = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z);
          if (distFromCenter > 1) {
            const pull = (distFromCenter - 1) * 0.05;
            p.vx -= (p.x / distFromCenter) * pull;
            p.vy -= (p.y / distFromCenter) * pull;
            p.vz -= (p.z / distFromCenter) * pull;
          }
          
          p.vx += (p.baseX - p.x) * 0.0001;
          p.vy += (p.baseY - p.y) * 0.0001;
          p.vz += (p.baseZ - p.z) * 0.0001;

          // Friction
          const friction = 0.96;
          p.vx *= friction; p.vy *= friction; p.vz *= friction;

          p.x += p.vx; p.y += p.vy; p.z += p.vz;
        });
      }

      // Project and Render
      const projected = particles.map(p => {
        // Rotation
        const rot = t * 0.025;
        const rx = p.x * Math.cos(rot) - p.z * Math.sin(rot);
        const rz = p.x * Math.sin(rot) + p.z * Math.cos(rot);

        const proj = project(rx, p.y, rz, sphereR, canvas.width, canvas.height, cy);
        
        // Flicker and depth-based alpha
        const flicker = 0.9 + Math.sin(t * 4 + p.noiseOffset) * 0.1;
        const alpha = proj.alpha * flicker * (0.25 + globalIntensity * 0.75);

        return {
          ...proj,
          size: p.size,
          pz: rz,
          alpha
        };
      }).sort((a, b) => b.pz - a.pz);

      // Render
      for (const p of projected) {
        const s = p.size * p.scale;
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [globalIntensity, localTime]);

  return (
    <div className="relative w-full min-h-[80vh] md:h-full flex flex-col items-center justify-center md:justify-center lg:justify-end py-20 md:py-0 md:pb-0 lg:pb-40">
      <div className="relative w-full aspect-square max-w-[400px] md:max-w-[300px] lg:max-w-none md:relative lg:absolute lg:inset-0 lg:aspect-auto">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3 md:gap-1 lg:gap-3 text-center pointer-events-none -mt-10 md:mt-0 lg:mt-0">
        <h2 className="text-[9px] tracking-[0.5em] uppercase text-white/50">{BERLIN_CONFIG.label}</h2>
        <div className="text-xl font-light tracking-widest text-white/80">{BERLIN_CONFIG.name}</div>
        <div className="text-[10px] font-mono text-white/90">{formatTime(localTime)}</div>
      </div>
    </div>
  );
};

// --- Slider Handle with Internal Particles ---

const SliderHandle = ({ 
  progress, 
  isHovered, 
  isDragging, 
  isLive, 
  isTransitioning, 
  isArrived 
}: { 
  progress: number, 
  isHovered: boolean, 
  isDragging: boolean, 
  isLive: boolean,
  isTransitioning: boolean,
  isArrived: boolean
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<{x: number, y: number, vx: number, vy: number, alpha: number, targetAlpha: number}[]>([]);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (particles.current.length === 0) {
      for (let i = 0; i < 12; i++) {
        particles.current.push({
          x: Math.random() * 40,
          y: Math.random() * 40,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          alpha: Math.random(),
          targetAlpha: Math.random()
        });
      }
    }

    const animateParticles = () => {
      ctx.clearRect(0, 0, 40, 40);
      
      const activity = isDragging || isTransitioning ? 2.4 : (isHovered ? 1.7 : 1.0);
      const baseAlpha = isHovered || isDragging || isLive || isTransitioning || isArrived ? 0.9 : 0.6;

      for (const p of particles.current) {
        p.x += p.vx * activity;
        p.y += p.vy * activity;

        if (p.x < 0) p.x = 40;
        if (p.x > 40) p.x = 0;
        if (p.y < 0) p.y = 40;
        if (p.y > 40) p.y = 0;

        if (Math.abs(p.alpha - p.targetAlpha) < 0.01) {
          p.targetAlpha = Math.random();
        }
        p.alpha += (p.targetAlpha - p.alpha) * 0.015;

        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * baseAlpha * 0.65})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      requestRef.current = requestAnimationFrame(animateParticles);
    };

    requestRef.current = requestAnimationFrame(animateParticles);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isHovered, isDragging, isLive, isTransitioning, isArrived]);

  return (
    <motion.div 
      className="absolute w-6 h-6 rounded-full border border-white/20 bg-black/60 backdrop-blur-md pointer-events-none flex items-center justify-center overflow-hidden"
      style={{ left: `${progress * 100}%`, x: '-50%' }}
      animate={{
        scale: isDragging ? 1.15 : (isArrived ? [1, 1.15, 1] : (isHovered ? 1.08 : (isLive || isTransitioning ? [1, 1.03, 1] : 1))),
        borderColor: isHovered || isDragging || isLive || isTransitioning || isArrived ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)',
        boxShadow: isArrived 
          ? ['0 0 20px rgba(255,255,255,0.1)', '0 0 40px rgba(255,255,255,0.4)', '0 0 20px rgba(255,255,255,0.1)']
          : (isTransitioning 
              ? '0 0 30px rgba(255,255,255,0.25)' 
              : (isLive 
                  ? ['0 0 15px rgba(255,255,255,0.05)', '0 0 25px rgba(255,255,255,0.15)', '0 0 15px rgba(255,255,255,0.05)']
                  : '0 0 20px rgba(255,255,255,0.03)'))
      }}
      transition={{ 
        scale: (!isDragging && (isArrived || (!isHovered && (isLive || isTransitioning))))
          ? { duration: isArrived ? 0.6 : (isTransitioning ? 0.4 : 4), repeat: isArrived ? 0 : Infinity, ease: "easeInOut" }
          : { type: 'spring', stiffness: 300, damping: 25 },
        boxShadow: (isLive || isArrived) ? { duration: isArrived ? 0.6 : 4, repeat: isArrived ? 0 : Infinity, ease: "easeInOut" } : { duration: 0.3 },
        borderColor: { duration: 0.3 }
      }}
    >
      {isTransitioning && (
        <motion.div 
          className="absolute inset-0 bg-white/10 blur-sm"
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
      <canvas ref={canvasRef} width={40} height={40} className="w-full h-full opacity-90" />
      <div className="absolute inset-0 rounded-full shadow-[inset_0_0_10px_rgba(255,255,255,0.1)] pointer-events-none" />
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [globalTime, setGlobalTime] = useState(() => {
    const now = new Date();
    return now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  });
  const [isLive, setIsLive] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isArrived, setIsArrived] = useState(false);
  
  const animationRef = useRef<any>(null);
  const syncRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = () => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    if (syncRef.current) {
      cancelAnimationFrame(syncRef.current);
      syncRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLive(false);
    setIsTransitioning(false);
    setIsArrived(false);
  };

  const startLiveSync = () => {
    cleanup();
    setIsLive(true);
    const update = () => {
      const now = new Date();
      setGlobalTime(now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600 + now.getUTCMilliseconds() / 3600000);
      syncRef.current = requestAnimationFrame(update);
    };
    syncRef.current = requestAnimationFrame(update);
  };

  const handleLiveNow = () => {
    cleanup();
    
    const now = new Date();
    const targetTime = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600 + now.getUTCMilliseconds() / 3600000;
    
    const diff = Math.abs(targetTime - globalTime);
    const duration = Math.min(0.8, Math.max(0.6, diff / 12));
    
    setIsTransitioning(true);
    animationRef.current = animate(globalTime, targetTime, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setGlobalTime(latest),
      onComplete: () => {
        animationRef.current = null;
        setIsTransitioning(false);
        setIsArrived(true);
        timeoutRef.current = setTimeout(() => {
          setIsArrived(false);
          startLiveSync();
        }, 600);
      }
    });
  };

  // Initial live sync
  useEffect(() => {
    startLiveSync();
    return () => cleanup();
  }, []);

  const tokyoLocalTime = getLocalTime(globalTime, TOKYO_CONFIG.timezone);
  const saoPauloLocalTime = getLocalTime(globalTime, SAO_PAULO_CONFIG.timezone);
  const berlinLocalTime = getLocalTime(globalTime, BERLIN_CONFIG.timezone);

  const tokyoIntensity = getActivityIntensity(tokyoLocalTime);
  const saoPauloIntensity = getActivityIntensity(saoPauloLocalTime);
  const berlinIntensity = getActivityIntensity(berlinLocalTime);

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white flex flex-col font-sans overflow-x-hidden overflow-y-auto lg:overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-30 mix-blend-difference">
        <div className="flex flex-col">
          <h1 className="text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.6em] font-light uppercase text-white/70 whitespace-nowrap">
            URBAN SPHERES <span className="text-white/30 lowercase tracking-normal ml-1 whitespace-nowrap">by <a href="https://kirachao.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors cursor-pointer pointer-events-auto">Kira Chao</a></span>
          </h1>
          <div className="hidden md:flex items-center gap-2 mt-1">
            <Activity size={10} className="text-white/50" />
            <span className="text-[8px] tracking-widest text-white/40 uppercase">A study of urban behavior through time and motion</span>
          </div>
          <span className="hidden md:inline text-[7px] tracking-[0.3em] text-white/30 uppercase mt-0.5 ml-[18px]">v1.4</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <button 
              onClick={handleLiveNow}
              className={`group px-3 py-1.5 -mr-3 rounded-md transition-all duration-300 flex items-center gap-2 mb-0.5 cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.08] ${isLive ? 'text-white' : 'text-white/30 hover:text-white/70'}`}
            >
              <motion.div 
                className={`w-1 h-1 rounded-full transition-all duration-700 ${isLive ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,1)]' : 'bg-white/10 group-hover:bg-white/30'}`} 
                animate={isLive ? {
                  scale: [1, 1.4, 1],
                  opacity: [0.7, 1, 0.7],
                } : {}}
                transition={isLive ? {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                } : {}}
              />
              <span className="text-[9px] tracking-[0.2em] uppercase font-medium">LIVE TIME</span>
            </button>
            <span className="text-xs font-mono text-white/50 pr-0.5">{formatTime(globalTime)} UTC</span>
          </div>
        </div>
      </header>

      {/* Split Screen */}
      <main className="flex-none md:flex-1 flex flex-col md:flex-row relative md:px-6 lg:px-0 md:gap-6 lg:gap-0">
        <div className="flex-none md:flex-1 relative border-b md:border-b-0 lg:border-r border-white/5">
          <TokyoSystem intensity={tokyoIntensity} localTime={tokyoLocalTime} />
        </div>
        <div className="flex-none md:flex-1 relative border-b md:border-b-0 lg:border-r border-white/5">
          <BerlinSystem intensity={berlinIntensity} localTime={berlinLocalTime} />
        </div>
        <div className="flex-none md:flex-1 relative pb-32 md:pb-0">
          <SaoPauloSystem intensity={saoPauloIntensity} localTime={saoPauloLocalTime} isLive={isLive} />
        </div>
        
        {/* Center Divider Lines */}
        <div className="hidden lg:block absolute left-1/3 top-0 bottom-0 w-[1px] bg-white/5 z-20" />
        <div className="hidden lg:block absolute left-2/3 top-0 bottom-0 w-[1px] bg-white/5 z-20" />
      </main>

      {/* Controls */}
      <footer className="fixed bottom-0 left-0 w-full p-12 flex flex-col items-center z-30">
        <div className="w-full max-w-xl flex flex-col gap-4">
          <div className="relative h-8 flex items-center group">
            <div className="absolute w-full h-[1px] bg-white/5 group-hover:bg-white/10 transition-colors" />
            <input
              type="range"
              min="0"
              max="23.99"
              step="0.01"
              value={globalTime}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onMouseDown={() => {
                setIsDragging(true);
                cleanup();
              }}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => {
                setIsDragging(true);
                cleanup();
              }}
              onTouchEnd={() => setIsDragging(false)}
              onChange={(e) => {
                setGlobalTime(parseFloat(e.target.value));
              }}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />
            <SliderHandle 
              progress={globalTime / 24} 
              isHovered={isHovered} 
              isDragging={isDragging} 
              isLive={isLive}
              isTransitioning={isTransitioning}
              isArrived={isArrived}
            />
          </div>
        </div>
      </footer>

      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
}
