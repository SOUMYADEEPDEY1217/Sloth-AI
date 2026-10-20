import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Cpu,
  FileText,
  FolderKanban,
  Layers,
  ListTodo,
  Menu,
  Newspaper,
  Shield,
  Terminal,
  X,
} from 'lucide-react';
import { ConnectionCheckResult, NavSection } from '../types';
import { User } from '../services/firebaseService';
import {
  HeroRoboticSculpture,
  LocalComputeMonolithVisual,
  NeuralProcessorVisual,
  OpenArchitectureVisual,
} from '../components/CinematicVisuals';

interface CinematicLandingPageProps {
  connection: ConnectionCheckResult;
  currentUser: User | null;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onSignOut: () => void;
  onLaunchAssistant: (targetSection?: NavSection) => void;
}

export const CinematicLandingPage: React.FC<CinematicLandingPageProps> = ({
  connection,
  currentUser,
  onOpenAuth,
  onSignOut,
  onLaunchAssistant,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = Boolean(prefersReducedMotion);

  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [pointerOffset, setPointerOffset] = useState({ x: 0, y: 0 });
  const [copiedCmd, setCopiedCmd] = useState(false);

  const configuredRepoUrl = (
    import.meta.env.VITE_GITHUB_REPO_URL || ''
  ).trim();

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollProgress(Math.min(1, Math.max(0, y / docHeight)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePointerMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setPointerOffset({
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny)),
    });
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

  const handleExploreSource = () => {
    if (configuredRepoUrl) {
      window.location.assign(configuredRepoUrl);
    } else {
      setSourceModalOpen(true);
    }
  };

  const handleCopyCloneSnippet = () => {
    navigator.clipboard.writeText(
      'ollama pull qwen3:4b && .\\run_backend.bat'
    );
    setCopiedCmd(true);
    window.setTimeout(() => setCopiedCmd(false), 2000);
  };

  const currentYear = new Date().getFullYear();

  const assistantFeatures: Array<{
    id: NavSection;
    code: string;
    title: string;
    description: string;
    endpoint: string;
    Icon: React.FC<{ className?: string }>;
  }> = [
    {
      id: 'summarizer',
      code: 'A',
      title: 'Smart Summaries',
      description: 'Turn lengthy text into concise, useful summaries.',
      endpoint: 'POST /api/summarize',
      Icon: FileText,
    },
    {
      id: 'tasks',
      code: 'B',
      title: 'Task Extraction',
      description:
        'Convert source material into actionable to-dos and explicit deadlines.',
      endpoint: 'POST /api/extract-tasks',
      Icon: ListTodo,
    },
    {
      id: 'organizer',
      code: 'C',
      title: 'File Organization',
      description:
        'Suggest meaningful filenames and destinations with user approval before making changes.',
      endpoint: 'POST /api/organize/suggestions',
      Icon: FolderKanban,
    },
    {
      id: 'briefing',
      code: 'D',
      title: 'Daily Briefings',
      description:
        'Bring important points and action items together in one compact view.',
      endpoint: 'POST /api/briefing',
      Icon: Newspaper,
    },
  ];

  return (
    <div
      id="top"
      className="min-h-screen bg-[#050505] text-[#F5F5F5] selection:bg-[#FF9A35]/30 selection:text-[#F5F5F5] overflow-x-hidden font-sans"
    >
      {/* Subtle Top Scroll Progress Hairline */}
      <div
        className="fixed top-0 left-0 right-0 h-[1px] z-50 pointer-events-none bg-white/[0.04]"
        aria-hidden="true"
      >
        <div
          className="h-full bg-gradient-to-r from-[#FF6A24] to-[#FF9A35] transition-transform duration-150 origin-left"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>

      {/* 4. MINIMAL TOP NAVIGATION */}
      <motion.header
        initial={reducedMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${
          scrolled
            ? 'bg-[#050505]/90 backdrop-blur-md border-b border-white/[0.12]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Left: SlothAI wordmark + abstract sloth-inspired geometric icon */}
          <button
            type="button"
            onClick={() => scrollToSection('top')}
            aria-label="SlothAI Home — Return to top"
            className="inline-flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
          >
            <span className="w-8 h-8 rounded-lg border border-white/[0.16] bg-[#0A0A0A] flex items-center justify-center group-hover:border-[#FF9A35]/60 transition-colors">
              {/* Abstract geometric sloth claw/visor mark */}
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-[#F5F5F5]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M4 9.5C6.5 6.5 10 5.5 12 5.5C14 5.5 17.5 6.5 20 9.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M6.5 14C8.5 15.8 10.2 16.5 12 16.5C13.8 16.5 15.5 15.8 17.5 14"
                  stroke="#FF9A35"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="9" cy="11.5" r="1.2" fill="currentColor" />
                <circle cx="15" cy="11.5" r="1.2" fill="currentColor" />
              </svg>
            </span>
            <span className="text-sm sm:text-base font-medium tracking-[0.14em] uppercase text-[#F5F5F5]">
              SlothAI
            </span>
          </button>

          {/* Center Navigation Links (Desktop) */}
          <nav
            aria-label="Primary site navigation"
            className="hidden md:flex items-center gap-8 text-xs tracking-[0.14em] uppercase text-[#858585]"
          >
            <button
              type="button"
              onClick={() => scrollToSection('top')}
              className="hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('open-source')}
              className="hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              Open Source
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              About
            </button>
          </nav>

          {/* Far Right: Auth + Launch Assistant CTA + Mobile Menu Trigger */}
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/12 bg-[#101012] text-[11px] font-mono text-[#F5F5F5]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]" />
                  <span className="max-w-[140px] truncate">
                    {currentUser.displayName || currentUser.email}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider border border-white/12 text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-white/30 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signin')}
                  className="px-3.5 py-2 rounded-full text-[11px] font-medium tracking-[0.14em] uppercase border border-white/15 text-[#F5F5F5] hover:border-[#FF9A35]/60 hover:text-[#FF9A35] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="px-3.5 py-2 rounded-full text-[11px] font-medium tracking-[0.14em] uppercase border border-[#FF6B1A]/45 bg-[#FF6B1A]/15 text-[#FF9A35] hover:bg-[#FF6B1A]/25 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Sign Up
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onLaunchAssistant('overview')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-medium tracking-[0.14em] uppercase bg-[#F5F5F5] text-[#050505] hover:bg-[#FF9A35] hover:text-[#050505] transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Launch Assistant</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg border border-white/[0.12] text-[#F5F5F5] hover:border-white/30 cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Accessible Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/[0.12] bg-[#0A0A0A] px-5 py-5 space-y-3">
            <div className="flex flex-col space-y-2.5 text-xs tracking-[0.16em] uppercase text-[#858585]">
              <button
                type="button"
                onClick={() => scrollToSection('top')}
                className="py-2 text-left hover:text-[#F5F5F5]"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="py-2 text-left hover:text-[#F5F5F5]"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="py-2 text-left hover:text-[#F5F5F5]"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('open-source')}
                className="py-2 text-left hover:text-[#F5F5F5]"
              >
                Open Source
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('about')}
                className="py-2 text-left hover:text-[#F5F5F5]"
              >
                About
              </button>
              <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSignOut();
                    }}
                    className="px-3.5 py-2 rounded-full text-[11px] font-mono uppercase border border-white/15 text-[#F5F5F5]"
                  >
                    Sign Out ({currentUser.displayName || currentUser.email})
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAuth('signin');
                      }}
                      className="px-3.5 py-2 rounded-full text-[11px] font-mono uppercase border border-white/15 text-[#F5F5F5]"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAuth('signup');
                      }}
                      className="px-3.5 py-2 rounded-full text-[11px] font-mono uppercase border border-[#FF6B1A]/45 bg-[#FF6B1A]/15 text-[#FF9A35]"
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.header>

      {/* 5. HERO SECTION — THE SIGNATURE VISUAL */}
      <section
        onMouseMove={handlePointerMove}
        aria-label="SlothAI Hero"
        className="relative min-h-[92svh] lg:min-h-[100svh] pt-24 sm:pt-28 pb-12 flex flex-col justify-between overflow-hidden bg-[#050505]"
      >
        {/* Pure black studio atmosphere + subtle radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 44%, rgba(255, 106, 36, 0.08) 0%, rgba(16, 16, 16, 0.35) 45%, rgba(5, 5, 5, 0.98) 80%)',
          }}
          aria-hidden="true"
        />

        {/* Subtle vertical architectural grid hairlines */}
        <div
          className="max-w-[1280px] w-full mx-auto px-5 sm:px-8 relative z-10 flex-1 flex flex-col justify-between"
        >
          {/* Top Eyebrow */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-center pt-2 sm:pt-4"
          >
            <span className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-mono tracking-[0.26em] uppercase text-[#858585]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9A35]" />
              <span>OPEN-WEIGHT AI / LOCAL-FIRST AUTOMATION</span>
            </span>
          </motion.div>

          {/* Layered Center Composition: Giant Typography + Overlapping 3D Subject */}
          <div className="relative my-auto py-4 sm:py-6">
            {/* Giant Oversized Headline Stack */}
            <div className="relative text-center select-none pointer-events-none">
              {/* First Line: Bright White */}
              <motion.h1
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.75,
                  delay: 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  fontSize: 'clamp(2.4rem, 8.6vw, 7.6rem)',
                  lineHeight: 0.96,
                }}
                className="relative z-20 font-light tracking-[-0.04em] uppercase text-[#F5F5F5]"
              >
                — WORK LESS —
              </motion.h1>

              {/* Second Line: Partially Muted & Positioned BEHIND the Central 3D Subject */}
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.85,
                  delay: 0.22,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  fontSize: 'clamp(2.5rem, 9.2vw, 8.2rem)',
                  lineHeight: 0.96,
                }}
                aria-hidden="true"
                className="relative z-0 mt-1 sm:mt-2 font-light tracking-[-0.04em] uppercase text-[#858585]/35"
              >
                THINK MORE
              </motion.div>
            </div>

            {/* Central 3D Robotic / AI Entity Overlapping the Typography */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.9,
                delay: 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative z-10 -mt-12 sm:-mt-24 md:-mt-32 lg:-mt-40"
            >
              <HeroRoboticSculpture
                pointerOffset={pointerOffset}
                reducedMotion={reducedMotion}
              />
            </motion.div>

            {/* Desktop Overlay Grid: Left Descriptor/CTAs & Lower Side Attribute Cards */}
            <div className="relative z-20 mt-4 lg:mt-0 lg:absolute lg:inset-x-0 lg:bottom-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              {/* Left Descriptor & Primary/Secondary CTAs */}
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.38 }}
                className="lg:col-span-5 space-y-5 text-left"
              >
                <p className="text-sm sm:text-base text-[#F5F5F5]/90 max-w-sm leading-relaxed font-normal">
                  Your repetitive work, handled by AI that runs on your terms.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onLaunchAssistant('overview')}
                    className="px-5 py-2.5 rounded-full text-[11px] font-medium tracking-[0.16em] uppercase bg-[#F5F5F5] text-[#050505] hover:bg-[#FF9A35] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Explore SlothAI
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('how-it-works')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-medium tracking-[0.16em] uppercase border border-white/[0.18] bg-[#0A0A0A]/80 text-[#F5F5F5] hover:border-[#FF9A35] hover:text-[#FF9A35] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>See How It Works</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>

              {/* Center Spacer for 3D Subject on Desktop */}
              <div className="hidden lg:block lg:col-span-2" />

              {/* Lower Side Descriptive Attribute Cards */}
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4"
              >
                {/* Card 1 */}
                <div className="p-4 rounded-xl bg-[#0A0A0A]/90 border border-white/[0.12] backdrop-blur-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-[0.2em] uppercase text-[#FF9A35]">
                    <span>LOCAL AI</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF9A35]" />
                  </div>
                  <p className="mt-2 text-xs sm:text-sm font-medium text-[#F5F5F5]">
                    Your machine, your model
                  </p>
                </div>

                {/* Card 2 */}
                <div className="p-4 rounded-xl bg-[#0A0A0A]/90 border border-white/[0.12] backdrop-blur-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-[0.2em] uppercase text-[#858585]">
                    <span>OPEN SOURCE</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#87A88C]" />
                  </div>
                  <p className="mt-2 text-xs sm:text-sm font-medium text-[#F5F5F5]">
                    Built to be adapted
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Hero Bottom Bar: Tiny Category Pills & Scroll Indicator */}
          <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {['OPEN WEIGHTS', 'LOCAL INFERENCE', 'SMART AUTOMATION'].map(
                (pill) => (
                  <span
                    key={pill}
                    className="px-3 py-1 rounded-full text-[10px] font-mono tracking-[0.18em] uppercase border border-white/[0.12] text-[#858585]"
                  >
                    {pill}
                  </span>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => scrollToSection('tech-strip')}
              aria-label="Scroll down to explore SlothAI"
              className="inline-flex items-center gap-3 text-[10px] font-mono tracking-[0.22em] uppercase text-[#858585] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              <span>SCROLL</span>
              <span className="w-12 h-[1px] bg-white/[0.16] relative overflow-hidden">
                <span className="absolute inset-y-0 left-0 w-1/2 bg-[#FF9A35]" />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 7. TRUST AND TECHNOLOGY STRIP */}
      <section
        id="tech-strip"
        aria-label="Built on Open Technology"
        className="py-10 bg-[#0A0A0A] border-y border-white/[0.12]"
      >
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-[10px] font-mono tracking-[0.24em] uppercase text-[#858585] shrink-0">
            BUILT ON OPEN TECHNOLOGY
          </div>

          <div className="w-full md:w-auto grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-8 items-center">
            {[
              { name: 'Ollama', detail: 'Local Runtime', Icon: Terminal },
              { name: 'Open-Weight Models', detail: 'qwen3:4b Ready', Icon: Cpu },
              { name: 'Python', detail: '3.11+ Core', Icon: Code2 },
              { name: 'FastAPI', detail: 'Local Bridge', Icon: Layers },
              { name: 'React', detail: 'TypeScript UI', Icon: Shield },
            ].map(({ name, detail, Icon }) => (
              <div
                key={name}
                className="flex items-center gap-2.5 text-[#858585] hover:text-[#F5F5F5] transition-colors"
              >
                <Icon className="w-4 h-4 text-[#858585] shrink-0" />
                <div>
                  <div className="text-xs font-medium tracking-tight text-[#F5F5F5]">
                    {name}
                  </div>
                  <div className="text-[10px] font-mono text-[#555555]">
                    {detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. EDITORIAL STATEMENT SECTION */}
      <section
        id="about"
        aria-label="Editorial Statement"
        className="py-28 sm:py-36 lg:py-44 bg-[#050505] px-5 sm:px-8"
      >
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <p className="text-[10px] font-mono tracking-[0.26em] uppercase text-[#FF9A35]">
            SLOW AND STEADY PRODUCTIVITY
          </p>

          <h2
            style={{ fontSize: 'clamp(2rem, 5.2vw, 4.5rem)', lineHeight: 1.06 }}
            className="font-light tracking-[-0.03em] uppercase"
          >
            <span className="text-[#F5F5F5]">WE MAKE EVERYDAY WORK</span>{' '}
            <span className="lg:block text-[#858585]">FEEL LIGHTER.</span>
          </h2>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#858585] leading-relaxed font-normal">
            From scattered notes to actionable tasks, SlothAI helps remove the
            repetitive work standing between you and what matters.
          </p>
        </motion.div>
      </section>

      {/* 9. FEATURE SECTION — AI × HUMANITY (01 / INTELLIGENT AUTOMATION) */}
      <section
        id="features"
        aria-label="Intelligent Automation"
        className="py-24 sm:py-32 bg-[#0A0A0A] border-t border-white/[0.12] px-5 sm:px-8"
      >
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Side Editorial Copy (42% width -> 5 cols) */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="text-[11px] font-mono tracking-[0.22em] uppercase text-[#FF9A35]">
              01 / INTELLIGENT AUTOMATION
            </div>

            <h2
              style={{ fontSize: 'clamp(1.85rem, 3.6vw, 3.1rem)', lineHeight: 1.08 }}
              className="font-light tracking-[-0.03em] uppercase text-[#F5F5F5]"
            >
              AI × HUMANITY:
              <span className="block text-[#858585]">LESS BUSYWORK,</span>
              <span className="block text-[#F5F5F5]">MORE POSSIBILITY.</span>
            </h2>

            <p className="text-sm sm:text-base text-[#858585] leading-relaxed">
              Summarize long documents, uncover action items, and organize
              information without spending your day doing repetitive digital
              work.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => scrollToSection('assistant-capabilities')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-mono tracking-[0.18em] uppercase border border-white/[0.16] text-[#F5F5F5] hover:border-[#FF9A35] hover:text-[#FF9A35] transition-colors cursor-pointer"
              >
                <span>EXPLORE FEATURES</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>

          {/* Right Side Visual (58% width -> 7 cols) */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="lg:col-span-7"
          >
            <NeuralProcessorVisual />
          </motion.div>
        </div>
      </section>

      {/* 10. FEATURE SECTION — YOUR DATA, YOUR RULES (02 / PRIVATE BY DESIGN) */}
      <section
        aria-label="Private by Design"
        className="py-24 sm:py-32 bg-[#050505] border-t border-white/[0.12] px-5 sm:px-8"
      >
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Side Visual (58% width -> 7 cols on desktop, stacked naturally on mobile) */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 order-2 lg:order-1"
          >
            <LocalComputeMonolithVisual connection={connection} />
          </motion.div>

          {/* Right Side Copy (42% width -> 5 cols) */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="lg:col-span-5 order-1 lg:order-2 space-y-6"
          >
            <div className="text-[11px] font-mono tracking-[0.22em] uppercase text-[#FF9A35]">
              02 / PRIVATE BY DESIGN
            </div>

            <h2
              style={{ fontSize: 'clamp(1.85rem, 3.6vw, 3.1rem)', lineHeight: 1.08 }}
              className="font-light tracking-[-0.03em] uppercase text-[#F5F5F5]"
            >
              YOUR DATA.
              <span className="block text-[#858585]">YOUR MACHINE.</span>
              <span className="block text-[#F5F5F5]">YOUR RULES.</span>
            </h2>

            <p className="text-sm sm:text-base text-[#858585] leading-relaxed">
              Run compatible open-weight models locally through Ollama. When the
              full workflow stays on your machine, your documents do not need to
              be sent to a third-party AI inference service.
            </p>

            <ul className="space-y-3 pt-1 text-xs sm:text-sm text-[#F5F5F5]/90">
              {[
                'Local-first inference.',
                'No per-request hosted inference fees for local model execution.',
                'Freedom to change compatible models and customize your workflow.',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF9A35] mt-2 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onLaunchAssistant('settings')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-mono tracking-[0.18em] uppercase border border-white/[0.16] text-[#F5F5F5] hover:border-[#FF9A35] hover:text-[#FF9A35] transition-colors cursor-pointer"
              >
                <span>DISCOVER LOCAL AI</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 11. FEATURE SECTION — YOUR DIGITAL ASSISTANT (03 / LESS REPETITION) */}
      <section
        id="assistant-capabilities"
        aria-label="Your Digital Assistant Capabilities"
        className="py-24 sm:py-32 bg-[#0A0A0A] border-t border-white/[0.12] px-5 sm:px-8"
      >
        <div className="max-w-[1280px] mx-auto space-y-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="text-[11px] font-mono tracking-[0.22em] uppercase text-[#FF9A35]">
                03 / LESS REPETITION
              </div>
              <h2
                style={{ fontSize: 'clamp(1.85rem, 3.8vw, 3.25rem)', lineHeight: 1.06 }}
                className="font-light tracking-[-0.03em] uppercase text-[#F5F5F5]"
              >
                LET THE BORING
                <span className="block text-[#858585]">THINGS HANDLE</span>
                <span className="block text-[#F5F5F5]">THEMSELVES.</span>
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-[#858585] max-w-sm">
              Select any capability below to open the corresponding working tool
              directly inside the SlothAI local workspace.
            </p>
          </div>

          {/* 4-Item Editorial Grid Connected to Real Application Routes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assistantFeatures.map(
              ({ id, code, title, description, endpoint, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onLaunchAssistant(id)}
                  className="group text-left p-6 sm:p-8 rounded-2xl bg-[#101010] border border-white/[0.12] hover:border-[#FF9A35]/60 transition-all duration-300 flex flex-col justify-between gap-8 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="inline-flex items-center gap-2.5 text-[11px] font-mono tracking-[0.2em] uppercase text-[#858585] group-hover:text-[#FF9A35] transition-colors">
                      <span>{code}</span>
                      <span>//</span>
                      <span>{endpoint}</span>
                    </span>
                    <div className="w-9 h-9 rounded-full border border-white/[0.12] bg-[#050505] flex items-center justify-center group-hover:border-[#FF9A35] group-hover:bg-[#FF9A35] group-hover:text-[#050505] transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-xl sm:text-2xl font-normal tracking-tight text-[#F5F5F5]">
                        {title}
                      </h3>
                      <ArrowUpRight className="w-4 h-4 text-[#858585] group-hover:text-[#FF9A35] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                    </div>
                    <p className="text-sm text-[#858585] leading-relaxed">
                      {description}
                    </p>
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* 12. HOW IT WORKS SECTION */}
      <section
        id="how-it-works"
        aria-label="How SlothAI Works"
        className="py-24 sm:py-32 bg-[#050505] border-t border-white/[0.12] px-5 sm:px-8"
      >
        <div className="max-w-[1280px] mx-auto space-y-16">
          <div className="max-w-2xl space-y-4">
            <div className="text-[11px] font-mono tracking-[0.22em] uppercase text-[#FF9A35]">
              WORKFLOW ARCHITECTURE
            </div>
            <h2
              style={{ fontSize: 'clamp(1.85rem, 3.6vw, 3rem)', lineHeight: 1.08 }}
              className="font-light tracking-[-0.03em] uppercase text-[#F5F5F5]"
            >
              THREE DELIBERATE STEPS.
              <span className="block text-[#858585]">ZERO SILENT OVERWRITES.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 pt-4 border-t border-white/[0.12]">
            {[
              {
                step: '01',
                title: 'CONNECT YOUR MODEL',
                body: 'Install Ollama and choose a compatible open-weight model.',
                meta: 'ollama pull qwen3:4b',
              },
              {
                step: '02',
                title: 'GIVE SLOTHAI A TASK',
                body: 'Provide text or a supported document and select the operation you need.',
                meta: '.txt · .md · .docx · .pdf',
              },
              {
                step: '03',
                title: 'REVIEW AND MOVE ON',
                body: 'Get a summary, task list, or organization suggestion. Approve file changes before applying them.',
                meta: 'Human-in-the-loop verification',
              },
            ].map(({ step, title, body, meta }) => (
              <div key={step} className="space-y-4 relative">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono tracking-[0.2em] text-[#FF9A35]">
                    {step}
                  </span>
                  <span className="h-[1px] flex-1 bg-white/[0.12]" />
                </div>

                <h3 className="text-base sm:text-lg font-medium tracking-[0.08em] uppercase text-[#F5F5F5]">
                  {title}
                </h3>

                <p className="text-sm text-[#858585] leading-relaxed">{body}</p>

                <div className="pt-2 text-[11px] font-mono text-[#555555]">
                  {meta}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 13. OPEN-SOURCE SECTION (04 / OPEN BY DESIGN) */}
      <section
        id="open-source"
        aria-label="Open Source by Design"
        className="py-24 sm:py-32 bg-[#0A0A0A] border-t border-white/[0.12] px-5 sm:px-8"
      >
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Open-Source Philosophy */}
          <div className="lg:col-span-5 space-y-6">
            <div className="text-[11px] font-mono tracking-[0.22em] uppercase text-[#FF9A35]">
              04 / OPEN BY DESIGN
            </div>

            <h2
              style={{ fontSize: 'clamp(1.85rem, 3.6vw, 3.1rem)', lineHeight: 1.08 }}
              className="font-light tracking-[-0.03em] uppercase text-[#F5F5F5]"
            >
              NOT A BLACK BOX.
              <span className="block text-[#858585]">
                A TOOL YOU CAN MAKE YOUR OWN.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-[#858585] leading-relaxed">
              Open-weight AI gives developers the freedom to choose models,
              experiment with behavior, and build tools around their own needs.
              SlothAI brings that freedom into everyday productivity.
            </p>

            <ul className="space-y-2.5 text-xs sm:text-sm text-[#F5F5F5]/90">
              {[
                'Replaceable compatible models.',
                'Local inference.',
                'Customizable prompts and workflows.',
                'Inspectable application code.',
                'Reduced dependence on hosted AI APIs.',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#87A88C] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Explicit Licensing Distinction Notice */}
            <div className="p-4 rounded-xl bg-[#101010] border border-white/[0.1] text-xs text-[#858585] leading-relaxed">
              <strong className="text-[#F5F5F5] font-medium">
                License Distinction:
              </strong>{' '}
              The SlothAI application source code is released under the{' '}
              <span className="text-[#F5F5F5]">MIT License</span>. Individual
              open-weight language models executed via Ollama (such as{' '}
              <code className="font-mono text-[#FF9A35]">qwen3:4b</code> or{' '}
              <code className="font-mono">llama3.2</code>) are governed by their
              respective upstream model licenses.
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleExploreSource}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-mono tracking-[0.18em] uppercase border border-white/[0.16] text-[#F5F5F5] hover:border-[#FF9A35] hover:text-[#FF9A35] transition-colors cursor-pointer"
              >
                <span>EXPLORE THE SOURCE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Inspectable Code & Architecture Visual */}
          <div className="lg:col-span-7">
            <OpenArchitectureVisual />
          </div>
        </div>
      </section>

      {/* 14. FINAL CTA SECTION */}
      <section
        aria-label="Launch SlothAI Call to Action"
        className="relative py-28 sm:py-36 lg:py-44 bg-[#050505] border-t border-white/[0.12] px-5 sm:px-8 overflow-hidden"
      >
        {/* Restrained amber glow behind visual core */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(255, 106, 36, 0.14) 0%, rgba(255, 154, 53, 0.03) 38%, rgba(5, 5, 5, 0) 70%)',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
          {/* Restrained geometric core ornament */}
          <div className="w-12 h-12 mx-auto rounded-full border border-[#FF9A35]/40 bg-[#0A0A0A] flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9A35]" />
          </div>

          <h2
            style={{ fontSize: 'clamp(2.2rem, 5.8vw, 5rem)', lineHeight: 1.02 }}
            className="font-light tracking-[-0.035em] uppercase text-[#F5F5F5]"
          >
            DO LESS.
            <span className="block text-[#858585]">MAKE ROOM</span>
            <span className="block text-[#F5F5F5]">FOR MORE.</span>
          </h2>

          <p className="text-base sm:text-lg text-[#858585] max-w-xl mx-auto leading-relaxed">
            Your time is valuable. Let SlothAI take care of the repetitive
            parts.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onLaunchAssistant('overview')}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-xs font-medium tracking-[0.18em] uppercase bg-[#F5F5F5] text-[#050505] hover:bg-[#FF9A35] transition-colors cursor-pointer"
            >
              <span>LAUNCH SLOTHAI</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleExploreSource}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-xs font-medium tracking-[0.18em] uppercase border border-white/[0.18] bg-[#0A0A0A] text-[#F5F5F5] hover:border-[#FF9A35] hover:text-[#FF9A35] transition-colors cursor-pointer"
            >
              <span>VIEW THE PROJECT</span>
            </button>
          </div>
        </div>
      </section>

      {/* 15. MINIMAL FOOTER */}
      <footer className="bg-[#050505] border-t border-white/[0.12] py-14 px-5 sm:px-8 text-xs text-[#858585]">
        <div className="max-w-[1280px] mx-auto space-y-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm font-medium tracking-[0.14em] uppercase text-[#F5F5F5]">
                <span className="w-2 h-2 rounded-full bg-[#FF9A35]" />
                <span>SlothAI</span>
              </div>
              <p className="text-xs text-[#858585]">
                Work less. Automate more. Stay slow.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-[11px] font-mono tracking-[0.16em] uppercase">
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="hover:text-[#F5F5F5] transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-[#F5F5F5] transition-colors cursor-pointer"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('open-source')}
                className="hover:text-[#F5F5F5] transition-colors cursor-pointer"
              >
                Open Source
              </button>
              <button
                type="button"
                onClick={handleExploreSource}
                className="hover:text-[#F5F5F5] transition-colors cursor-pointer"
              >
                {configuredRepoUrl ? 'GitHub Repository' : 'Source Architecture'}
              </button>
              <button
                type="button"
                onClick={() => onLaunchAssistant('overview')}
                className="text-[#FF9A35] hover:underline cursor-pointer"
              >
                Launch Workspace →
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-[#555555]">
            <div>
              © {currentYear} SlothAI. Application released under the MIT
              License (model weights carry separate upstream licenses).
            </div>
            <div>
              Privacy: Local-first FastAPI + Ollama architecture. Zero cloud AI
              telemetry.
            </div>
          </div>
        </div>
      </footer>

      {/* Honest Repository & Source Architecture Inspector Modal (when external GitHub URL is not set) */}
      {sourceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="source-modal-title"
        >
          <div className="w-full max-w-xl rounded-2xl bg-[#101010] border border-white/[0.16] p-6 sm:p-8 text-[#F5F5F5] space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.1] pb-4">
              <div>
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#FF9A35]">
                  LOCAL REPOSITORY &amp; SOURCE ARCHIVE
                </span>
                <h3
                  id="source-modal-title"
                  className="mt-1 text-lg font-medium tracking-tight text-[#F5F5F5]"
                >
                  Inspectable Open-Source Workspace
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSourceModalOpen(false)}
                aria-label="Close source modal"
                className="p-1.5 rounded-lg border border-white/[0.12] text-[#858585] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#858585] leading-relaxed">
              This instance is running from your local source workspace (no
              external <code className="font-mono">VITE_GITHUB_REPO_URL</code>{' '}
              is configured). All frontend React components, FastAPI routes, and
              security tests are directly inspectable in your project directory:
            </p>

            <div className="p-4 rounded-xl bg-[#050505] border border-white/[0.1] font-mono text-xs text-[#F5F5F5] space-y-1.5">
              <div className="text-[#858585]"># Repository Structure</div>
              <div>├── src/ (React 19 + TypeScript + Tailwind UI)</div>
              <div>├── backend/app/main.py (FastAPI Controller &amp; 10 Routes)</div>
              <div>├── backend/app/services/ (Ollama, Document &amp; File Safety)</div>
              <div>├── backend/tests/test_backend.py (11 Automated Flow Tests)</div>
              <div>└── LICENSE (MIT Open-Source Application License)</div>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-white/[0.1] font-mono text-xs">
              <span className="truncate text-[#FF9A35]">
                ollama pull qwen3:4b &amp;&amp; .\run_backend.bat
              </span>
              <button
                type="button"
                onClick={handleCopyCloneSnippet}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/[0.08] hover:bg-white/[0.14] text-[#F5F5F5] text-[11px] shrink-0 cursor-pointer"
              >
                {copiedCmd ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#87A88C]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <span>Copy Startup Command</span>
                )}
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSourceModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-mono tracking-[0.14em] uppercase border border-white/[0.14] text-[#858585] hover:text-[#F5F5F5] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceModalOpen(false);
                  onLaunchAssistant('overview');
                }}
                className="px-5 py-2 rounded-full text-xs font-mono tracking-[0.14em] uppercase bg-[#FF9A35] text-[#050505] font-medium cursor-pointer"
              >
                Open Live Assistant →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
