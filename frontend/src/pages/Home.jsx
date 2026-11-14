import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Bot,
  HelpCircle,
  Map,
  FileText,
  TrendingUp,
  Compass,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Zap,
  Shield,
  Star,
  Menu,
  X,
  Brain,
  Upload,
  BarChart2,
  Cpu,
} from 'lucide-react';
import { RobotIllustration } from '../components/RobotIllustration';

export const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Redirect authenticated users straight to dashboard
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Bot className="w-6 h-6" />,
      color: 'bg-purple-100 text-purple-600',
      title: 'AI Tutor Chat',
      desc: 'Ask complex questions, clarify concepts, and get instant AI-powered explanations tailored to your knowledge level.',
      badge: 'Powered by Groq',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      icon: <HelpCircle className="w-6 h-6" />,
      color: 'bg-pink-100 text-pink-600',
      title: 'AI Quiz Generator',
      desc: 'Generate batch-verified multiple-choice quizzes with A/B/C/D options, auto-scoring, and detailed answer explanations.',
      badge: 'Batch Verified',
      badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
    },
    {
      icon: <Map className="w-6 h-6" />,
      color: 'bg-emerald-100 text-emerald-600',
      title: 'Learning Roadmap',
      desc: 'Get a personalized step-by-step study roadmap with phases, milestones, estimated hours, and skills to master.',
      badge: 'Personalized AI',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-sky-100 text-sky-600',
      title: 'Document Q&A — Local RAG',
      desc: 'Upload PDF or TXT study notes and ask questions. Answers are generated 100% offline using ChromaDB, sentence-transformers/all-MiniLM-L6-v2, and google/flan-t5-small — no Groq/OpenAI API required.',
      badge: '100% Offline',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    {
      icon: <Compass className="w-6 h-6" />,
      color: 'bg-amber-100 text-amber-600',
      title: 'Learning Resources',
      desc: 'Discover curated documentation, video tutorials, and code guides filtered by topic, difficulty, and learning style.',
      badge: 'Web Search',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-fuchsia-100 text-fuchsia-600',
      title: 'Progress Analytics',
      desc: 'Track quiz scores, identify weak topics, monitor study sessions, and visualize your improvement over time.',
      badge: 'MongoDB Backed',
      badgeColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    },
  ];

  const steps = [
    { step: '01', icon: <BookOpen className="w-7 h-7" />, title: 'Create Your Account', desc: 'Sign up in seconds with your email. Your progress, documents, and quiz history are all saved to your account.' },
    { step: '02', icon: <Brain className="w-7 h-7" />, title: 'Choose Your Learning Tool', desc: 'Pick from AI Tutor Chat, Quiz Generator, Learning Roadmap, Document Q&A, or Resource Finder.' },
    { step: '03', icon: <Sparkles className="w-7 h-7" />, title: 'Learn and Practice with AI', desc: 'Interact with multi-agent AI systems to get explanations, take quizzes, and explore your uploaded documents.' },
    { step: '04', icon: <BarChart2 className="w-7 h-7" />, title: 'Track Your Progress', desc: 'Review quiz scores, identify weak areas, and watch your performance analytics grow over each session.' },
  ];

  const whyItems = [
    { icon: <Cpu className="w-5 h-5 text-brand-600" />, text: 'Local FLAN-T5 RAG Engine — No cloud API for document Q&A' },
    { icon: <Shield className="w-5 h-5 text-emerald-600" />, text: 'JWT-secured authentication with MongoDB persistence' },
    { icon: <Zap className="w-5 h-5 text-amber-600" />, text: 'Multi-agent AI system: Tutor, Quiz, Roadmap, Resources' },
    { icon: <Star className="w-5 h-5 text-pink-600" />, text: 'ChromaDB + sentence-transformers/all-MiniLM-L6-v2 vector search' },
    { icon: <CheckCircle2 className="w-5 h-5 text-sky-600" />, text: 'Personalized quiz scoring with weak area analysis' },
    { icon: <TrendingUp className="w-5 h-5 text-fuchsia-600" />, text: 'Persistent progress analytics across all learning sessions' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-x-hidden">
      {/* ─── NAVBAR ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/60' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-18 flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-brand-600 text-white shadow-md shadow-brand-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">StudyMate</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-extrabold border border-brand-200/60">AI</span>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-xs font-semibold text-slate-600 hover:text-brand-600 transition-colors">Features</a>
              <a href="#how-it-works" className="text-xs font-semibold text-slate-600 hover:text-brand-600 transition-colors">How It Works</a>
              <a href="#why" className="text-xs font-semibold text-slate-600 hover:text-brand-600 transition-colors">About</a>
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all flex items-center space-x-1.5"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white rounded-2xl border border-slate-200 shadow-lg p-4 mb-4 space-y-3">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-slate-700 py-2 hover:text-brand-600 transition-colors">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-slate-700 py-2 hover:text-brand-600 transition-colors">How It Works</a>
              <a href="#why" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-slate-700 py-2 hover:text-brand-600 transition-colors">About</a>
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <Link to="/login" className="block w-full text-center py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all">Login</Link>
                <Link to="/register" className="block w-full text-center py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all">Get Started</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Soft background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-indigo-200/25 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Hero Text */}
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/60 text-xs font-bold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multi-Agent AI Study Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                Your{' '}
                <span className="bg-gradient-to-r from-brand-600 to-indigo-500 bg-clip-text text-transparent">
                  AI-Powered
                </span>{' '}
                Study Companion
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                StudyMate helps students learn, practice, organize, and understand study materials using multi-agent AI — including a local offline Document Q&A engine powered by FLAN-T5-small with zero cloud API dependency.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="px-7 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm flex items-center space-x-2.5 shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center space-x-2.5 border border-slate-200 shadow-sm transition-all hover:-translate-y-0.5"
                >
                  <span>Login</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {[
                  { icon: <Shield className="w-3.5 h-3.5 text-emerald-500" />, text: 'JWT Secured' },
                  { icon: <Cpu className="w-3.5 h-3.5 text-sky-500" />, text: '100% Local RAG' },
                  { icon: <Zap className="w-3.5 h-3.5 text-amber-500" />, text: 'Multi-Agent AI' },
                ].map((badge) => (
                  <div key={badge.text} className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
                    {badge.icon}
                    <span>{badge.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Illustration */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                {/* Decorative card behind illustration */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-100/70 to-indigo-100/60 rounded-3xl transform rotate-3 scale-105 blur-xs" />
                <div className="relative bg-gradient-to-br from-[#f3e8ff] via-[#ede9fe] to-[#e0e7ff] rounded-3xl p-8 border border-purple-200/60 shadow-xl shadow-purple-200/30">
                  <RobotIllustration />
                  {/* Floating info chip */}
                  <div className="absolute -top-3 -right-3 bg-white rounded-2xl px-3.5 py-2 border border-slate-200 shadow-md flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>FLAN-T5 Ready</span>
                  </div>
                  <div className="absolute -bottom-3 -left-3 bg-white rounded-2xl px-3.5 py-2 border border-slate-200 shadow-md flex items-center space-x-2 text-xs font-bold text-slate-700">
                    <Bot className="w-3.5 h-3.5 text-brand-600" />
                    <span>6 AI Tools</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/60 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything you need to study smarter
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Six integrated AI-powered learning tools in one platform — built for students who want results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-7 rounded-3xl bg-[#f8fafc] border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 group space-y-4 cursor-default"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-3.5 rounded-2xl ${f.color} group-hover:scale-105 transition-transform`}>
                    {f.icon}
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${f.badgeColor}`}>
                    {f.badge}
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* RAG Tech Stack Callout */}
          <div className="rounded-3xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/60 p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="p-4 rounded-2xl bg-sky-100 text-sky-700 flex-shrink-0">
              <Cpu className="w-8 h-8" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-lg font-extrabold text-slate-900">Local RAG Engine — No Cloud APIs Required</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                The Document Q&A feature uses a fully offline AI pipeline. Your documents never leave your machine.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {['ChromaDB', 'all-MiniLM-L6-v2', 'google/flan-t5-small', 'No Groq/OpenAI for Q&A'].map((tech) => (
                  <span key={tech} className="text-[11px] font-bold px-3 py-1 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Simple Process</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">How It Works</h2>
            <p className="text-sm text-slate-500 leading-relaxed">Start learning in minutes with just four simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.step} className="relative p-7 rounded-3xl bg-white border border-slate-100 shadow-xs hover:shadow-md hover:border-slate-200 transition-all duration-300 space-y-5">
                {/* Connector line between cards */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-0.5 bg-slate-200" />
                )}
                <div className="flex items-center justify-between">
                  <div className="text-5xl font-extrabold text-brand-100 leading-none select-none">{s.step}</div>
                  <div className="p-3 rounded-2xl bg-brand-50 text-brand-600">
                    {s.icon}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY STUDYMATE ─── */}
      <section id="why" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/60 text-xs font-bold">
                  <Star className="w-3.5 h-3.5" />
                  <span>Why StudyMate</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Built different — for serious learners
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  StudyMate isn't just another flashcard app. It's a multi-agent AI system that adapts to how you learn, tests your knowledge, and organizes your study materials with real AI intelligence.
                </p>
              </div>

              <div className="space-y-4">
                {whyItems.map((item) => (
                  <div key={item.text} className="flex items-center space-x-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all">
                    <div className="flex-shrink-0 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      {item.icon}
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats column */}
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: 'AI Tools', value: '6', sub: 'Tutor, Quiz, Roadmap, Resources, DocQA, Progress', color: 'from-purple-50 to-indigo-50 border-purple-200' },
                { label: 'Local RAG Models', value: '2', sub: 'FLAN-T5-small + all-MiniLM-L6-v2', color: 'from-sky-50 to-cyan-50 border-sky-200' },
                { label: 'No Cloud API', value: '✓', sub: 'Document Q&A runs fully offline', color: 'from-emerald-50 to-teal-50 border-emerald-200' },
                { label: 'Authentication', value: 'JWT', sub: 'Secured sessions with MongoDB', color: 'from-amber-50 to-orange-50 border-amber-200' },
              ].map((stat) => (
                <div key={stat.label} className={`p-7 rounded-3xl bg-gradient-to-br ${stat.color} border hover:shadow-md transition-all duration-300 space-y-3`}>
                  <div className="text-4xl font-extrabold text-slate-900">{stat.value}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{stat.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{stat.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-r from-brand-600 to-indigo-600 p-10 sm:p-14 text-center overflow-hidden shadow-2xl shadow-brand-500/20">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ready to study smarter?</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Start Learning with AI Today
              </h2>
              <p className="text-sm text-white/80 leading-relaxed max-w-lg mx-auto">
                Join StudyMate and access all six AI-powered learning tools — AI Tutor, Quiz Generator, Learning Roadmap, Document Q&A, Resources, and Progress Analytics.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  to="/register"
                  className="px-7 py-3.5 rounded-2xl bg-white text-brand-700 font-bold text-sm flex items-center space-x-2 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="px-7 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/30 transition-all"
                >
                  Already have an account? Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-white border-t border-slate-100 py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-brand-600 text-white shadow-md shadow-brand-500/20">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-900">StudyMate</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 font-extrabold">AI</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                A production multi-agent AI study platform using local FLAN-T5-small RAG, ChromaDB, MongoDB, and Groq-powered AI agents.
              </p>
            </div>

            {/* Navigation Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Platform</h4>
              <div className="space-y-2">
                {[
                  { label: 'Login', to: '/login' },
                  { label: 'Create Account', to: '/register' },
                  { label: 'Dashboard', to: '/dashboard' },
                  { label: 'AI Tutor', to: '/tutor' },
                  { label: 'Quiz Generator', to: '/quiz' },
                  { label: 'Document Q&A', to: '/documents' },
                ].map((l) => (
                  <Link key={l.to} to={l.to} className="block text-xs text-slate-500 hover:text-brand-600 font-medium transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Tech Stack */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Tech Stack</h4>
              <div className="space-y-2">
                {[
                  'React 18 + Vite + Tailwind CSS',
                  'FastAPI + Python + Uvicorn',
                  'MongoDB + PyMongo',
                  'ChromaDB + sentence-transformers',
                  'google/flan-t5-small (local)',
                  'Groq API (AI Tutor, Quiz, Roadmap)',
                ].map((tech) => (
                  <p key={tech} className="text-xs text-slate-500 font-medium">{tech}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400 font-medium">
              © {new Date().getFullYear()} StudyMate AI. All rights reserved.
            </p>
            <p className="text-xs text-slate-400 font-medium">
              Built with FastAPI · React · MongoDB · ChromaDB · FLAN-T5
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
