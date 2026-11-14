import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  progressAPI,
  learningTwinAPI,
  revisionAPI,
  projectAPI,
  interviewAPI
} from '../services/api';
import { RobotIllustration } from '../components/RobotIllustration';
import {
  Sparkles,
  Bot,
  HelpCircle,
  FileText,
  Map,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRight,
  Zap,
  CheckCircle2,
  Target,
  Brain,
  Network,
  CalendarClock,
  FolderGit2,
  Mic,
  AlertTriangle,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Plus
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State for all unified dashboard modules
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);
  const [twinData, setTwinData] = useState(null);
  const [revisionData, setRevisionData] = useState(null);
  const [projectsData, setProjectsData] = useState([]);
  const [interviewHistory, setInterviewHistory] = useState([]);

  const fetchUnifiedData = async () => {
    setLoading(true);
    try {
      const [
        progRes,
        twinRes,
        revRes,
        projRes,
        interviewRes
      ] = await Promise.allSettled([
        progressAPI.get(),
        learningTwinAPI.get(),
        revisionAPI.getSchedule(),
        projectAPI.list(),
        interviewAPI.getHistory(),
      ]);

      if (progRes.status === 'fulfilled') setProgressData(progRes.value);
      if (twinRes.status === 'fulfilled') setTwinData(twinRes.value);
      if (revRes.status === 'fulfilled') setRevisionData(revRes.value);
      if (projRes.status === 'fulfilled') setProjectsData(projRes.value?.projects || []);
      if (interviewRes.status === 'fulfilled') setInterviewHistory(interviewRes.value?.history || []);
    } catch (err) {
      console.error('Failed to load unified dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnifiedData();
  }, []);

  // Compute smart "Recommended Next Action" based on live unified state
  const getRecommendedNextAction = () => {
    // 1. Spaced Revision Due Today / Overdue
    if (revisionData?.due_today_count > 0 || revisionData?.overdue_count > 0) {
      const nextDue = revisionData.items_due_today?.[0] || revisionData.items_upcoming?.[0];
      return {
        title: `Spaced Revision Due: ${nextDue?.topic || 'Key Topics'}`,
        description: `You have ${revisionData.due_today_count + revisionData.overdue_count} topic(s) due for spaced review to strengthen long-term memory.`,
        actionText: 'Review Now',
        actionPath: '/revision',
        icon: CalendarClock,
        color: 'from-purple-500 to-indigo-600',
        badge: 'Spaced Repetition',
      };
    }

    // 2. Repeated Misconception Remediation
    if (twinData?.repeated_difficulties?.length > 0) {
      const topMistake = twinData.repeated_difficulties[0];
      return {
        title: `Remediate Misconception: ${topMistake.topic}`,
        description: topMistake.latest_misconception || `Address ${topMistake.mistake_count} recurring mistake(s) with an adaptive practice quiz.`,
        actionText: 'Practice Quiz',
        actionPath: '/quiz',
        icon: AlertTriangle,
        color: 'from-amber-500 to-rose-600',
        badge: 'Mistake Diagnostic',
      };
    }

    // 4. Continue Active Project
    if (projectsData?.length > 0) {
      const activeProj = projectsData[0];
      return {
        title: `Continue Project Milestone: ${activeProj.title}`,
        description: `Project is ${activeProj.progress}% complete. Complete remaining phase tasks or defend with AI Viva.`,
        actionText: 'Open Project Mentor',
        actionPath: '/project-mentor',
        icon: FolderGit2,
        color: 'from-indigo-500 to-purple-600',
        badge: 'Project Sprint',
      };
    }

    // 5. Initial Assessment (New User)
    return {
      title: 'Calibrate Your AI Learning Twin',
      description: 'Complete a baseline Skill Gap Assessment to generate your personalized roadmap, adaptive quizzes, and readiness scores.',
      actionText: 'Start Skill Assessment',
      actionPath: '/skill-assessment',
      icon: Target,
      color: 'from-brand-600 to-indigo-600',
      badge: 'Getting Started',
    };
  };

  const nextAction = getRecommendedNextAction();
  const NextActionIcon = nextAction.icon;

  const isNewUser =
    !loading &&
    (!twinData || !twinData.has_data) &&
    (!progressData || progressData.quizzes_completed === 0) &&
    projectsData.length === 0;

  return (
    <div className="space-y-8 font-sans">
      {/* ─── 1. HERO WELCOME & RECOMMENDED NEXT ACTION BANNER ──────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#f3e8ff] via-[#ede9fe] to-[#e0e7ff] border border-purple-100/80 p-6 sm:p-8 md:p-10 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/90 text-brand-700 border border-purple-200/60 text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Unified Multi-Agent Learning Dashboard</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, <span className="text-brand-600">{user?.name || 'Student'}!</span> 👋
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              Your personalized multi-agent learning ecosystem is synchronized. Track your Learning Twin, revision schedules, exam readiness countdowns, software projects, and mock viva interviews.
            </p>

            {/* Smart Recommended Next Action Card */}
            <div className="p-4 rounded-2xl bg-white/95 border border-purple-200/80 shadow-xs space-y-2 max-w-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                  🎯 Recommended Next Action • {nextAction.badge}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">{nextAction.title}</h3>
              <p className="text-[11px] text-slate-600">{nextAction.description}</p>
              <div className="pt-1">
                <button
                  onClick={() => navigate(nextAction.actionPath)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 cursor-pointer transition-colors"
                >
                  <NextActionIcon className="w-3.5 h-3.5" />
                  <span>{nextAction.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Side AI Robot Illustration */}
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <RobotIllustration />
          </div>
        </div>
      </div>

      {/* ─── 2. LIVE UNIFIED METRICS STRIP (4 KEY STAT CARDS) ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Learning Twin Mastery */}
        <div
          onClick={() => navigate('/learning-twin')}
          className="glass-card p-5 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer space-y-2 group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Learning Twin
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? '...' : twinData?.has_data ? `${twinData.overall_mastery || 0}%` : 'Calibrating'}
          </div>
          <p className="text-[11px] text-indigo-600 font-semibold flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{twinData?.has_data ? `${twinData.skills?.length || 0} Competencies Tracked` : 'Take Skill Assessment'}</span>
          </p>
        </div>

        {/* Metric 2: Spaced Revisions Due */}
        <div
          onClick={() => navigate('/revision')}
          className="glass-card p-5 rounded-3xl border border-slate-100 hover:border-purple-200 transition-all cursor-pointer space-y-2 group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Revisions Due
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? '...' : revisionData?.due_today_count || 0}
          </div>
          <p className="text-[11px] text-purple-600 font-semibold flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{revisionData?.overdue_count || 0} overdue • {revisionData?.total_reviewed_count || 0} reviewed</span>
          </p>
        </div>

        {/* Metric 3: Active Projects Progress */}
        <div
          onClick={() => navigate('/project-mentor')}
          className="glass-card p-5 rounded-3xl border border-slate-100 hover:border-emerald-200 transition-all cursor-pointer space-y-2 group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Projects
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? '...' : projectsData.length}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold truncate">
            {projectsData.length > 0 ? `${projectsData[0].title} (${projectsData[0].progress}%)` : 'No active projects'}
          </p>
        </div>

        {/* Metric 4: Latest Interview Score */}
        <div
          onClick={() => navigate('/interview-coach')}
          className="glass-card p-5 rounded-3xl border border-slate-100 hover:border-pink-200 transition-all cursor-pointer space-y-2 group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Latest Mock Viva
            </span>
            <div className="p-2 rounded-xl bg-pink-50 text-pink-600 group-hover:scale-105 transition-transform">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? '...' : interviewHistory.length > 0 && interviewHistory[0].overall_score !== null ? `${interviewHistory[0].overall_score}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-pink-600 font-semibold truncate">
            {interviewHistory.length > 0 ? (interviewHistory[0].performance_tier || interviewHistory[0].interview_type) : 'Practice Viva Defense'}
          </p>
        </div>
      </div>

      {/* ─── 3. LEARNING TWIN & TOPIC COMPETENCY HIGHLIGHTS ───────────────────────── */}
      {twinData?.has_data && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-100/90 bg-gradient-to-r from-white via-indigo-50/20 to-purple-50/20 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Student Learning Twin Summary</h2>
                <p className="text-xs text-slate-500">
                  Domain: {twinData.primary_subject || 'General'} • Overall Progress: {twinData.overall_progress}%
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/learning-twin')}
              className="px-4 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-indigo-700 hover:bg-indigo-50 flex items-center space-x-1 cursor-pointer"
            >
              <span>Full Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Strong Mastered Topics */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
              <span className="text-[10px] uppercase font-extrabold text-emerald-800 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Strong Mastered Topics ({twinData.strong_topics?.length || 0})</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {twinData.strong_topics?.length > 0 ? (
                  twinData.strong_topics.slice(0, 4).map((t, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-[11px] font-bold text-emerald-800 shadow-2xs">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Keep practicing to build strong mastery.</span>
                )}
              </div>
            </div>

            {/* Topics Needing Attention */}
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-2">
              <span className="text-[10px] uppercase font-extrabold text-rose-800 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Needs Attention ({twinData.weak_topics?.length || 0})</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {twinData.weak_topics?.length > 0 ? (
                  twinData.weak_topics.slice(0, 4).map((t, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-[11px] font-bold text-rose-800 shadow-2xs">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No critical weak topics flagged!</span>
                )}
              </div>
            </div>

            {/* Repeated Difficulties / Diagnostic Alert */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
              <span className="text-[10px] uppercase font-extrabold text-amber-800 flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Recurring Errors ({twinData.repeated_difficulties?.length || 0})</span>
              </span>
              <div className="space-y-1">
                {twinData.repeated_difficulties?.length > 0 ? (
                  twinData.repeated_difficulties.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="text-xs text-slate-700 bg-white p-2 rounded-xl border border-amber-200">
                      <span className="font-bold text-amber-900">{item.topic}: </span>
                      <span className="text-[11px] text-slate-500">{item.mistake_count} mistake(s) logged</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No recurring mistake patterns detected.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. QUICK ACTIONS COMMAND CENTER (7 CORE MODULES) ────────────────────── */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            <span>Learning Command Center</span>
          </h2>
          <p className="text-xs text-slate-500">Fast access to all integrated multi-agent study capabilities</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[
            {
              name: 'Skill Gap Assessment',
              desc: 'Evaluate baseline topic competencies',
              path: '/skill-assessment',
              icon: Target,
              color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            },
            {
              name: 'Adaptive Quiz',
              desc: 'Targeted remediation on weak topics',
              path: '/quiz',
              icon: HelpCircle,
              color: 'text-pink-600 bg-pink-50 border-pink-100',
            },
            {
              name: 'Knowledge Graph',
              desc: 'Interactive visual topic dependency map',
              path: '/knowledge-graph',
              icon: Network,
              color: 'text-purple-600 bg-purple-50 border-purple-100',
            },
            {
              name: 'Revision Scheduler',
              desc: 'Spaced repetition to prevent memory decay',
              path: '/revision',
              icon: CalendarClock,
              color: 'text-amber-600 bg-amber-50 border-amber-100',
            },
            {
              name: 'AI Project Mentor',
              desc: 'Architect roadmaps, tasks, and code advice',
              path: '/project-mentor',
              icon: FolderGit2,
              color: 'text-sky-600 bg-sky-50 border-sky-100',
            },
            {
              name: 'AI Viva & Interview Coach',
              desc: 'Simulate viva defense & technical screening',
              path: '/interview-coach',
              icon: Mic,
              color: 'text-rose-600 bg-rose-50 border-rose-100',
            },
            {
              name: 'AI Tutor Chat',
              desc: 'Interactive conceptual conversational tutor',
              path: '/tutor',
              icon: Bot,
              color: 'text-brand-600 bg-brand-50 border-brand-100',
            },
          ].map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(mod.path)}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl border ${mod.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-transform">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {mod.name}
                </h3>
                <p className="text-[11px] text-slate-500 leading-snug">{mod.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 5. RECENT ACTIVITY & WORKSPACE HIGHLIGHTS (2 COLUMNS) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Quiz History */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Award className="w-5 h-5 text-brand-600" />
              <span>Recent Quiz Sessions</span>
            </h2>
            <button
              onClick={() => navigate('/progress')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              View Analytics →
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400">Loading recent history...</p>
          ) : progressData?.recent_quizzes?.length > 0 ? (
            <div className="space-y-3">
              {progressData.recent_quizzes.slice(0, 4).map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 truncate">{quiz.topic}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">
                      {quiz.difficulty} • {quiz.created_at ? new Date(quiz.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-extrabold ${
                        quiz.percentage >= 70 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {quiz.percentage}%
                    </span>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {quiz.score}/{quiz.total_questions}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No quizzes completed yet.</p>
              <button
                onClick={() => navigate('/quiz')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Take a Quiz
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Active Projects & Mock Interviews */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FolderGit2 className="w-5 h-5 text-indigo-600" />
              <span>Projects & Viva Defenses</span>
            </h2>
            <button
              onClick={() => navigate('/project-mentor')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Manage Projects →
            </button>
          </div>

          {projectsData.length > 0 ? (
            <div className="space-y-3">
              {projectsData.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate('/project-mentor')}
                  className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">{p.title}</h4>
                    <span className="text-[10px] font-extrabold text-indigo-600">{p.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${Math.max(4, p.progress)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <FolderGit2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No software projects created yet.</p>
              <button
                onClick={() => navigate('/project-mentor')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Create Project
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
