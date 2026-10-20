import React, { useEffect, useRef, useState } from 'react';
import { ConnectionCheckResult } from '../types';

interface HeroSculptureProps {
  pointerOffset: { x: number; y: number };
  reducedMotion: boolean;
}

/**
 * Dramatic studio-lit 3D robotic/AI entity with restrained biomorphic sloth-inspired
 * curved visor & calm posture, obsidian graphite surfaces, specular rim lighting,
 * and warm amber-orange (#FF9A35 / #FF6A24) optical light strips.
 */
export const HeroRoboticSculpture: React.FC<HeroSculptureProps> = ({
  pointerOffset,
  reducedMotion,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Pause canvas rendering when hero is not visible in viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Subtle studio rim-light dust / optical field on canvas (paused when offscreen or reduced motion)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const width = (canvas.width = 520);
    const height = (canvas.height = 620);

    const nodes = Array.from({ length: 18 }, (_, i) => ({
      x: 110 + ((i * 73) % 300),
      y: 90 + ((i * 59) % 420),
      r: (i % 3) * 0.6 + 0.8,
      phase: i * 0.45,
      speed: 0.008 + (i % 4) * 0.003,
    }));

    let tick = 0;
    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);

      // Soft warm amber volumetric core glow
      const coreGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.42,
        12,
        width * 0.5,
        height * 0.42,
        220
      );
      coreGrad.addColorStop(0, 'rgba(255, 106, 36, 0.16)');
      coreGrad.addColorStop(0.45, 'rgba(255, 154, 53, 0.05)');
      coreGrad.addColorStop(1, 'rgba(5, 5, 5, 0)');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle floating studio light motes
      for (const n of nodes) {
        const alpha = 0.15 + 0.25 * Math.sin(tick * n.speed * 60 + n.phase);
        const yPos = n.y + (reducedMotion ? 0 : Math.sin(tick * n.speed * 40 + n.phase) * 6);
        ctx.beginPath();
        ctx.arc(n.x, yPos, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 154, 53, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      if (!reducedMotion) {
        tick += 1;
        animId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    return () => {
      if (animId) window.cancelAnimationFrame(animId);
    };
  }, [isVisible, reducedMotion]);

  const translateX = reducedMotion ? 0 : pointerOffset.x * 10;
  const translateY = reducedMotion ? 0 : pointerOffset.y * 8;

  return (
    <div
      ref={containerRef}
      className="relative w-[290px] sm:w-[370px] md:w-[430px] lg:w-[470px] aspect-[3/4] mx-auto select-none pointer-events-none"
      style={{
        transform: `translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0)`,
        transition: reducedMotion ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      aria-hidden="true"
    >
      {/* Ambient studio rim light canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain opacity-90"
      />

      {/* Studio 3D Robotic Sculpture SVG with PBR-inspired metallic gradients & specular highlights */}
      <svg
        viewBox="0 0 520 680"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_32px_64px_rgba(0,0,0,0.95)]"
      >
        <defs>
          {/* Obsidian & Dark Graphite PBR Gradients */}
          <linearGradient id="obsidianShell" x1="120" y1="60" x2="400" y2="580" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2A2B2E" />
            <stop offset="22%" stopColor="#141517" />
            <stop offset="58%" stopColor="#09090B" />
            <stop offset="100%" stopColor="#040405" />
          </linearGradient>

          <linearGradient id="graphiteArmor" x1="260" y1="80" x2="260" y2="560" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#232528" />
            <stop offset="40%" stopColor="#101113" />
            <stop offset="100%" stopColor="#060607" />
          </linearGradient>

          <linearGradient id="visorGlass" x1="160" y1="120" x2="360" y2="260" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1F2124" />
            <stop offset="35%" stopColor="#0B0C0E" />
            <stop offset="80%" stopColor="#050506" />
            <stop offset="100%" stopColor="#181310" />
          </linearGradient>

          {/* Specular Studio Rim Highlights */}
          <linearGradient id="rimLightLeft" x1="120" y1="70" x2="220" y2="450" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
          </linearGradient>

          <linearGradient id="rimLightAmber" x1="395" y1="95" x2="290" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF9A35" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#FF6A24" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FF6A24" stopOpacity="0" />
          </linearGradient>

          {/* Glowing Amber-Orange Optical Strip */}
          <linearGradient id="amberLaser" x1="175" y1="195" x2="345" y2="195" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF6A24" stopOpacity="0.2" />
            <stop offset="20%" stopColor="#FF9A35" />
            <stop offset="50%" stopColor="#FFD29D" />
            <stop offset="80%" stopColor="#FF9A35" />
            <stop offset="100%" stopColor="#FF6A24" stopOpacity="0.2" />
          </linearGradient>

          <radialGradient id="floorReflection" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 122, 45, 0.22)" />
            <stop offset="45%" stopColor="rgba(20, 20, 22, 0.85)" />
            <stop offset="100%" stopColor="rgba(5, 5, 5, 0)" />
          </radialGradient>

          <filter id="amberGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Reflective Studio Pedestal / Obsidian Floor */}
        <ellipse cx="260" cy="610" rx="210" ry="36" fill="url(#floorReflection)" />
        <path
          d="M90 610 H430"
          stroke="url(#amberLaser)"
          strokeWidth="1"
          strokeOpacity="0.45"
        />

        {/* Rear Mechanical Halo / Neural Ring */}
        <circle
          cx="260"
          cy="235"
          r="152"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1"
          strokeDasharray="3 6"
        />
        <circle
          cx="260"
          cy="235"
          r="128"
          stroke="url(#rimLightAmber)"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />

        {/* Outer Articulated Shoulders & Calm Draped Chassis (Sloth-inspired poised silhouette) */}
        <path
          d="M104 590 C108 465, 126 365, 168 320 C192 294, 222 284, 260 284 C298 284, 328 294, 352 320 C394 365, 412 465, 416 590 Z"
          fill="url(#obsidianShell)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.2"
        />

        {/* Left Shoulder Specular Rim Highlight */}
        <path
          d="M106 582 C110 462, 128 366, 170 322 C192 299, 218 287, 252 285"
          stroke="url(#rimLightLeft)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Right Shoulder Warm Amber Rim Highlight */}
        <path
          d="M414 582 C410 462, 392 366, 350 322 C328 299, 302 287, 268 285"
          stroke="url(#rimLightAmber)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Inner Segmented Carbon Torso Plates */}
        <path
          d="M154 590 C158 485, 172 392, 202 346 C218 322, 238 312, 260 312 C282 312, 302 322, 318 346 C348 392, 362 485, 366 590 Z"
          fill="url(#graphiteArmor)"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="1"
        />

        {/* Hydraulic / Tendon Neck Columns */}
        <path
          d="M222 268 L212 326 M298 268 L308 326 M244 274 L240 332 M276 274 L280 332"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect
          x="234"
          y="265"
          width="52"
          height="54"
          rx="10"
          fill="#0B0C0E"
          stroke="rgba(255,255,255,0.12)"
        />

        {/* Central Chest Neural Core & Amber Telemetry Seam */}
        <path
          d="M260 322 V568"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
        />
        <path
          d="M260 356 V468"
          stroke="url(#amberLaser)"
          strokeWidth="2.5"
          filter="url(#amberGlow)"
        />
        {/* Chest Optical Node */}
        <rect
          x="242"
          y="366"
          width="36"
          height="72"
          rx="18"
          fill="#070708"
          stroke="rgba(255,154,53,0.45)"
          strokeWidth="1.2"
        />
        <circle
          cx="260"
          cy="402"
          r="7"
          fill="#FF9A35"
          filter="url(#amberGlow)"
        />
        <circle cx="260" cy="402" r="3" fill="#FFF3E0" />

        {/* Rib & Armor Seam Lines */}
        <path
          d="M174 415 C202 432, 228 438, 242 438 M346 415 C318 432, 292 438, 278 438"
          stroke="rgba(255,255,255,0.11)"
          strokeWidth="1.2"
        />
        <path
          d="M164 475 C196 494, 226 500, 250 500 M356 475 C324 494, 294 500, 270 500"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.2"
        />

        {/* Sculpted Biomorphic Robotic Head (Curved Sloth-Inspired Cranium & Visor) */}
        <path
          d="M168 184 C168 118, 206 78, 260 78 C314 78, 352 118, 352 184 C352 238, 318 278, 260 278 C202 278, 168 238, 168 184 Z"
          fill="url(#obsidianShell)"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="1.4"
        />

        {/* Head Top Specular Studio Sheen */}
        <path
          d="M174 172 C176 116, 210 82, 260 82 C292 82, 318 96, 334 122"
          stroke="url(#rimLightLeft)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Subtle Sloth-Inspired Curved Brow & Temporal Acoustic Pods */}
        <rect
          x="155"
          y="162"
          width="14"
          height="48"
          rx="7"
          fill="#121316"
          stroke="rgba(255,255,255,0.18)"
        />
        <rect
          x="351"
          y="162"
          width="14"
          height="48"
          rx="7"
          fill="#121316"
          stroke="rgba(255,154,53,0.35)"
        />

        {/* Glossy Curved Obsidian Visor Shield */}
        <path
          d="M180 182 C180 144, 212 122, 260 122 C308 122, 340 144, 340 182 C340 218, 312 242, 260 242 C208 242, 180 218, 180 182 Z"
          fill="url(#visorGlass)"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1.2"
        />

        {/* Characteristic Sloth-Inspired Dual Curved Optical Brow Arches Inside Visor */}
        <path
          d="M192 176 C206 160, 228 158, 246 168 M328 176 C314 160, 292 158, 274 168"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Signature Amber-Orange Glowing Horizon Visor Strip */}
        <path
          d="M188 192 Q260 206 332 192"
          stroke="url(#amberLaser)"
          strokeWidth="3.2"
          strokeLinecap="round"
          filter="url(#amberGlow)"
        />
        <path
          d="M204 193 Q260 205 316 193"
          stroke="#FFE6C2"
          strokeWidth="1.1"
          strokeLinecap="round"
        />

        {/* Subtle Dual Optical Sensor Nodes */}
        <circle cx="222" cy="194" r="3.5" fill="#FF9A35" filter="url(#amberGlow)" />
        <circle cx="298" cy="194" r="3.5" fill="#FF9A35" filter="url(#amberGlow)" />

        {/* Lower Chin Precision Bevel */}
        <path
          d="M226 254 H294"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Bottom Fade Mask into #050505 Canvas */}
        <rect
          x="60"
          y="530"
          width="400"
          height="90"
          fill="url(#bottomFadeMask)"
        />
        <defs>
          <linearGradient id="bottomFadeMask" x1="260" y1="530" x2="260" y2="620" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#050505" stopOpacity="0" />
            <stop offset="100%" stopColor="#050505" stopOpacity="0.95" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

/**
 * Section 01 Visual: Dark futuristic neural-processing hardware & local inference unit
 * with metallic cooling fins and warm amber telemetry pathways.
 */
export const NeuralProcessorVisual: React.FC = () => {
  return (
    <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.12] p-6 sm:p-8 flex flex-col justify-between select-none">
      {/* Subtle radial amber backlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 68% 42%, rgba(255, 106, 36, 0.14) 0%, rgba(255, 154, 53, 0.04) 42%, rgba(5, 5, 5, 0) 75%)',
        }}
      />

      {/* Top Hardware Specification Bar */}
      <div className="relative z-10 flex items-center justify-between text-[10px] tracking-[0.2em] uppercase font-mono text-[#858585] border-b border-white/[0.08] pb-3">
        <span>SLOTH-NPU // LOCAL DOCUMENT ENGINE</span>
        <span className="inline-flex items-center gap-1.5 text-[#FF9A35]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF9A35]" />
          <span>ZERO CLOUD EGRESS</span>
        </span>
      </div>

      {/* Central 3D Isometric Hardware Unit SVG */}
      <div className="relative z-10 my-auto py-4">
        <svg
          viewBox="0 0 680 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          role="img"
          aria-label="Dark anodized neural processing unit with amber telemetry pathways"
        >
          <defs>
            <linearGradient id="npuChassis" x1="120" y1="30" x2="560" y2="290" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#222428" />
              <stop offset="50%" stopColor="#101114" />
              <stop offset="100%" stopColor="#070709" />
            </linearGradient>
            <linearGradient id="amberTrace" x1="140" y1="160" x2="540" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF6A24" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#FF9A35" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#FF6A24" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Outer Anodized Aluminum Frame */}
          <rect
            x="90"
            y="28"
            width="500"
            height="264"
            rx="18"
            fill="url(#npuChassis)"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1.2"
          />

          {/* Precision Cooling Fins (Left & Right Banks) */}
          {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
            <React.Fragment key={idx}>
              <line
                x1="114"
                y1={64 + idx * 32}
                x2="210"
                y2={64 + idx * 32}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <line
                x1="470"
                y1={64 + idx * 32}
                x2="566"
                y2={64 + idx * 32}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </React.Fragment>
          ))}

          {/* Smoked Glass Inner Neural Die */}
          <rect
            x="230"
            y="52"
            width="220"
            height="216"
            rx="12"
            fill="#07080A"
            stroke="rgba(255,154,53,0.35)"
            strokeWidth="1.2"
          />

          {/* Glowing Amber Circuit Traces */}
          <path
            d="M150 128 H230 M150 160 H230 M150 192 H230 M450 128 H530 M450 160 H530 M450 192 H530"
            stroke="url(#amberTrace)"
            strokeWidth="1.8"
          />
          <path
            d="M265 95 H415 M265 225 H415 M285 160 H395"
            stroke="url(#amberTrace)"
            strokeWidth="2"
          />

          {/* Central Tensor Core Die */}
          <rect
            x="292"
            y="112"
            width="96"
            height="96"
            rx="10"
            fill="#111215"
            stroke="#FF9A35"
            strokeWidth="1.5"
          />
          <circle cx="340" cy="160" r="18" fill="rgba(255,154,53,0.18)" stroke="#FF9A35" strokeWidth="1.5" />
          <circle cx="340" cy="160" r="5" fill="#FF9A35" />

          {/* Corner Precision Fasteners */}
          <circle cx="112" cy="48" r="3" fill="#555555" />
          <circle cx="568" cy="48" r="3" fill="#555555" />
          <circle cx="112" cy="272" r="3" fill="#555555" />
          <circle cx="568" cy="272" r="3" fill="#555555" />
        </svg>
      </div>

      {/* Bottom Pipeline Strip */}
      <div className="relative z-10 grid grid-cols-3 gap-3 pt-3 border-t border-white/[0.08] text-[11px] font-mono">
        <div>
          <span className="block text-[#555555] text-[10px]">INPUT PARSER</span>
          <span className="text-[#F5F5F5]">.PDF / .DOCX / .MD</span>
        </div>
        <div>
          <span className="block text-[#555555] text-[10px]">INFERENCE BUS</span>
          <span className="text-[#FF9A35]">LOCALHOST : 11434</span>
        </div>
        <div>
          <span className="block text-[#555555] text-[10px]">OUTPUT GUARD</span>
          <span className="text-[#F5F5F5]">GROUNDED JSON</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Section 02 Visual: Dark minimalist local computing monolith & private data boundary.
 */
export const LocalComputeMonolithVisual: React.FC<{
  connection: ConnectionCheckResult;
}> = ({ connection }) => {
  return (
    <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.12] p-6 sm:p-8 flex flex-col justify-between select-none">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 32% 55%, rgba(255, 154, 53, 0.12) 0%, rgba(135, 168, 140, 0.05) 45%, rgba(5, 5, 5, 0) 75%)',
        }}
      />

      <div className="relative z-10 flex items-center justify-between text-[10px] tracking-[0.2em] uppercase font-mono text-[#858585] border-b border-white/[0.08] pb-3">
        <span>LOCAL EXECUTION SANDBOX // 127.0.0.1</span>
        <span className="text-[#F5F5F5]">
          MODEL: {connection.modelName || 'qwen3:4b'}
        </span>
      </div>

      {/* Monolith & Isolation Architecture Diagram */}
      <div className="relative z-10 my-auto py-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Monolith Tower SVG */}
        <div className="sm:col-span-5 flex justify-center">
          <svg
            viewBox="0 0 220 260"
            className="w-36 sm:w-44 h-auto"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Matte black local AI compute tower with amber light bar"
          >
            <path
              d="M50 30 L110 12 L170 30 V226 L110 246 L50 226 Z"
              fill="#111215"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="1.2"
            />
            <path
              d="M110 12 V246"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1.2"
            />
            {/* Glowing Amber Vertical Light Bar */}
            <line
              x1="110"
              y1="42"
              x2="110"
              y2="168"
              stroke="#FF9A35"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Vent Matrix */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1="124"
                y1={60 + i * 16}
                x2="156"
                y2={68 + i * 16}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </svg>
        </div>

        {/* Local Loopback Data Nodes */}
        <div className="sm:col-span-7 space-y-2.5 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#101010] border border-white/[0.1] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#858585] block">01 / CLIENT INTERFACE</span>
              <span className="text-[#F5F5F5]">React + TypeScript UI</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded border border-white/[0.12] text-[#858585]">
              localhost:3000
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#101010] border border-[#FF9A35]/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#FF9A35] block">02 / SECURITY &amp; SCHEMA BRIDGE</span>
              <span className="text-[#F5F5F5]">Python FastAPI Controller</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#FF9A35]/10 border border-[#FF9A35]/40 text-[#FF9A35]">
              127.0.0.1:8000
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#101010] border border-white/[0.1] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#858585] block">03 / OPEN-WEIGHT INFERENCE</span>
              <span className="text-[#F5F5F5]">Ollama Runtime ({connection.modelName})</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded border border-white/[0.12] text-[#858585]">
              127.0.0.1:11434
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/[0.08] text-[11px] font-mono text-[#858585]">
        <span>EXTERNAL API KEYS REQUIRED: NONE</span>
        <span className="text-[#87A88C]">CONFINED FILE SANDBOX</span>
      </div>
    </div>
  );
};

/**
 * Section 04 Visual: Open-Source Inspectable Code & Modular Architecture Core
 */
export const OpenArchitectureVisual: React.FC = () => {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.12] p-6 sm:p-8 font-mono text-xs select-none">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 80% 20%, rgba(255, 154, 53, 0.12) 0%, rgba(5, 5, 5, 0) 65%)',
        }}
      />

      <div className="relative z-10 flex items-center justify-between pb-4 mb-5 border-b border-white/[0.1] text-[11px] text-[#858585]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FF6A24]" />
          <span>backend/app/main.py — Inspectable Local Pipeline</span>
        </div>
        <span className="text-[#FF9A35]">MIT LICENSE</span>
      </div>

      <pre className="relative z-10 text-[11px] sm:text-xs leading-relaxed text-[#F5F5F5] overflow-x-auto">
        <code>{`# SlothAI Open-Weight Local Controller (FastAPI + Ollama)
@app.post("/api/summarize")
async def summarize(req: SummarizeRequest):
    # 1. Isolate untrusted document text against prompt injection
    prompt = build_summarize_prompt(req.text, req.summary_length)
    
    # 2. Execute inference locally via Ollama (default: qwen3:4b)
    parsed, used_model = ollama.generate_json(
        prompt=prompt,
        model_override=req.model,
    )
    return {"success": True, "model": used_model, "summary": parsed}`}</code>
      </pre>

      <div className="relative z-10 mt-6 pt-4 border-t border-white/[0.1] grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
        <div className="p-2.5 rounded border border-white/[0.08] bg-[#050505]">
          <span className="block text-[#555555]">RUNTIME</span>
          <span className="text-[#F5F5F5]">Ollama Local API</span>
        </div>
        <div className="p-2.5 rounded border border-white/[0.08] bg-[#050505]">
          <span className="block text-[#555555]">BACKEND</span>
          <span className="text-[#F5F5F5]">Python FastAPI</span>
        </div>
        <div className="p-2.5 rounded border border-white/[0.08] bg-[#050505]">
          <span className="block text-[#555555]">FRONTEND</span>
          <span className="text-[#F5F5F5]">React 19 + TS</span>
        </div>
        <div className="p-2.5 rounded border border-white/[0.08] bg-[#050505]">
          <span className="block text-[#555555]">FILE SAFETY</span>
          <span className="text-[#FF9A35]">Approval Required</span>
        </div>
      </div>
    </div>
  );
};
