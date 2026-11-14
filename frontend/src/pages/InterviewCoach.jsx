import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewAPI, projectAPI } from '../services/api';
import {
  Mic,
  MessageSquare,
  Award,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Send,
  HelpCircle,
  FolderGit2,
  Code2,
  Users,
  Brain,
  Layers,
  ChevronRight,
  Clock,
  RefreshCw,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Target,
  FileCheck,
  ShieldCheck,
  History,
  X,
  Lightbulb,
  Check
} from 'lucide-react';

export const InterviewCoach = () => {
  const navigate = useNavigate();

  // Screen modes: 'setup', 'session', 'result', 'history'
  const [viewMode, setViewMode] = useState('setup');

  // Setup Form State
  const [interviewType, setInterviewType] = useState('Technical Interview'); // 'Project Viva', 'Technical Interview', 'HR Interview'
  const [subject, setSubject] = useState('Full-Stack Web Development');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [numQuestions, setNumQuestions] = useState(5);
  const [includeContext, setIncludeContext] = useState(true);

  // User projects (for Project Viva)
  const [userProjects, setUserProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Active Session State
  const [session, setSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [currentEvaluation, setCurrentEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [completingSession, setCompletingSession] = useState(false);

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch user projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const res = await projectAPI.list();
        setUserProjects(res.projects || []);
        if (res.projects && res.projects.length > 0) {
          setSelectedProjectId(res.projects[0].id);
        }
      } catch (err) {
        console.error('Failed to load user projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await interviewAPI.getHistory();
      setHistoryList(res.history || []);
    } catch (err) {
      console.error('Failed to fetch interview history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStartSession = async (e) => {
    if (e) e.preventDefault();
    setStartingSession(true);

    let chosenProjTitle = null;
    let chosenProjDesc = null;

    if (interviewType === 'Project Viva' && selectedProjectId) {
      const found = userProjects.find((p) => p.id === selectedProjectId);
      if (found) {
        chosenProjTitle = found.title;
        chosenProjDesc = found.description;
      }
    }

    try {
      const newSession = await interviewAPI.start({
        interview_type: interviewType,
        subject: interviewType === 'Project Viva' ? (chosenProjTitle || 'Software Project') : subject,
        project_id: selectedProjectId || null,
        project_title: chosenProjTitle,
        project_description: chosenProjDesc,
        difficulty: difficulty,
        num_questions: parseInt(numQuestions, 10),
        include_learning_context: includeContext,
      });

      setSession(newSession);
      setCurrentQuestionIndex(0);
      setStudentAnswer('');
      setCurrentEvaluation(null);
      setViewMode('session');
    } catch (err) {
      console.error('Failed to start interview session:', err);
    } finally {
      setStartingSession(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!studentAnswer.trim() || !session || evaluating) return;

    const currentQ = session.questions[currentQuestionIndex];
    if (!currentQ) return;

    setEvaluating(true);
    try {
      const evaluation = await interviewAPI.evaluateAnswer(
        session.id,
        currentQ.id,
        studentAnswer.trim()
      );
      setCurrentEvaluation(evaluation);
    } catch (err) {
      console.error('Failed to evaluate answer:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < session.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setStudentAnswer('');
      setCurrentEvaluation(null);
    } else {
      handleCompleteInterview();
    }
  };

  const handleCompleteInterview = async () => {
    if (!session) return;
    setCompletingSession(true);
    try {
      const finalSession = await interviewAPI.complete(session.id);
      setSession(finalSession);
      setViewMode('result');
    } catch (err) {
      console.error('Failed to finalize interview session:', err);
    } finally {
      setCompletingSession(false);
    }
  };

  const handlePracticeAgain = () => {
    handleStartSession();
  };

  const handleViewHistoricalSession = (histSession) => {
    setSession(histSession);
    setViewMode('result');
  };

  const currentQ = session?.questions?.[currentQuestionIndex];

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-100/80 bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <Mic className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">AI Viva & Interview Coach</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold uppercase tracking-wider">
                Coach AI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate high-stakes Project Viva defenses, Technical screenings, and HR behavioral interviews with real-time feedback.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              setViewMode('setup');
              setCurrentEvaluation(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'setup'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            New Interview
          </button>

          <button
            onClick={() => {
              setViewMode('history');
              fetchHistory();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              viewMode === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Past Sessions</span>
          </button>
        </div>
      </div>

      {/* ─── 1. SETUP MODE ────────────────────────────────────────────────────────── */}
      {viewMode === 'setup' && (
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-200/80 bg-white space-y-8 shadow-xs max-w-4xl mx-auto animate-fadeIn">
          <div>
            <h2 className="text-base font-bold text-slate-900">Configure Your Mock Interview</h2>
            <p className="text-xs text-slate-500">
              Select the interview track, target domain, and difficulty to generate tailored questions.
            </p>
          </div>

          <form onSubmit={handleStartSession} className="space-y-6">
            {/* Interview Track Selection Cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Select Interview Track
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {[
                  {
                    id: 'Project Viva',
                    title: 'Project Viva Defense',
                    desc: 'Defend architecture, trade-offs, schemas, bottlenecks, and security.',
                    icon: FolderGit2,
                    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
                  },
                  {
                    id: 'Technical Interview',
                    title: 'Technical Screening',
                    desc: 'Algorithmic concepts, concurrency, API design, and system architecture.',
                    icon: Code2,
                    color: 'text-purple-600 bg-purple-50 border-purple-200',
                  },
                  {
                    id: 'HR Interview',
                    title: 'HR & Behavioral',
                    desc: 'STAR method questions on leadership, conflict, deadlines, and ownership.',
                    icon: Users,
                    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                  },
                ].map((track) => {
                  const Icon = track.icon;
                  const isSelected = interviewType === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => setInterviewType(track.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                          : 'border-slate-200/80 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-xl border ${track.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                            Selected
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">{track.title}</h3>
                      <p className="text-[11px] text-slate-500 leading-snug">{track.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Subject / Project Selector */}
            {interviewType === 'Project Viva' ? (
              <div className="space-y-2 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Project to Defend:
                </label>
                {userProjects.length > 0 ? (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    {userProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.tech_stack?.join(', ') || 'Custom Stack'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-slate-500 space-y-2">
                    <p>No saved projects found from Project Mentor.</p>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Distributed Task Queue System"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800"
                    />
                  </div>
                )}
              </div>
            ) : interviewType === 'Technical Interview' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Technology / Subject Domain:
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. React & State Management, Python FastAPI, PostgreSQL, System Design"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Target Role / Context:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Junior/Mid Full-Stack Software Engineer"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            )}

            {/* Difficulty & Number of Questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Difficulty Tier:</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="Beginner">Beginner (Foundational)</option>
                  <option value="Intermediate">Intermediate (Standard Industry)</option>
                  <option value="Advanced">Advanced (Senior / High Depth)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Number of Questions:</label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="3">3 Questions (Quick Warmup)</option>
                  <option value="5">5 Questions (Standard Session)</option>
                  <option value="8">8 Questions (Comprehensive)</option>
                </select>
              </div>
            </div>

            {/* Context Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-bold text-slate-900 block">
                  Adaptive Candidate Memory Probe
                </span>
                <p className="text-[11px] text-slate-500">
                  Allow AI Examiner to probe weak topics identified in your Learning Twin and quiz mistakes.
                </p>
              </div>
              <input
                type="checkbox"
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={startingSession}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-500/20 cursor-pointer transition-colors"
              >
                {startingSession ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Architecting Interview Session...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Start Mock Interview</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── 2. LIVE INTERACTIVE INTERVIEW SESSION ─────────────────────────────────── */}
      {viewMode === 'session' && currentQ && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
          {/* Progress Header */}
          <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-slate-200/80 bg-white flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {session.interview_type}
              </span>
              <span className="text-xs font-bold text-slate-900">
                Question {currentQuestionIndex + 1} of {session.questions.length}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + 1) / session.questions.length) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-slate-500">
                {Math.round(((currentQuestionIndex + 1) / session.questions.length) * 100)}%
              </span>
            </div>
          </div>

          {/* Active Question Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-100 bg-gradient-to-r from-white via-indigo-50/20 to-purple-50/20 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                Category: {currentQ.category}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {currentQ.difficulty}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
              {currentQ.question}
            </h2>
          </div>

          {/* Student Answer Box (when not evaluated yet) */}
          {!currentEvaluation ? (
            <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Your Verbal / Technical Response:</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {studentAnswer.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>

              <textarea
                rows="6"
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Structure your answer clearly. Explain core principles, trade-offs, practical steps, or situational actions..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStudentAnswer('')}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear
                </button>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={!studentAnswer.trim() || evaluating}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {evaluating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Evaluating Response...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Answer for Review</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Instant Answer Evaluation Card */
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white space-y-6 shadow-xs animate-fadeIn">
              {/* Score & Rating Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2.5 rounded-xl font-black text-sm text-white ${
                      currentEvaluation.score >= 85
                        ? 'bg-emerald-600'
                        : currentEvaluation.score >= 70
                        ? 'bg-indigo-600'
                        : currentEvaluation.score >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-600'
                    }`}
                  >
                    {currentEvaluation.score}%
                  </div>
                  <div>
                    <span
                      className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md ${
                        currentEvaluation.rating === 'Excellent'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentEvaluation.rating === 'Good'
                          ? 'bg-indigo-100 text-indigo-800'
                          : currentEvaluation.rating === 'Needs Improvement'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {currentEvaluation.rating}
                    </span>
                    <p className="text-xs text-slate-600 mt-1">{currentEvaluation.feedback}</p>
                  </div>
                </div>
              </div>

              {/* Strengths & Missing Concepts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                  <div className="flex items-center space-x-1.5 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Key Strengths Articulated:</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                    {currentEvaluation.key_strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                {/* Missing Concepts */}
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-2">
                  <div className="flex items-center space-x-1.5 text-rose-800 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Missing Blindspots / Gaps:</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                    {currentEvaluation.missing_concepts.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggested Model Answer */}
              <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <div className="flex items-center space-x-2 text-indigo-900 text-xs font-bold">
                  <Lightbulb className="w-4 h-4 text-indigo-600" />
                  <span>Suggested Senior-Level Answer:</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {currentEvaluation.suggested_model_answer}
                </p>
              </div>

              {/* Follow-up Question */}
              {currentEvaluation.follow_up_question && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <span className="font-bold text-slate-900 block">💡 Follow-up Probing Question:</span>
                  <p>{currentEvaluation.follow_up_question}</p>
                </div>
              )}

              {/* Next Question or View Report Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  disabled={completingSession}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-indigo-500/20 cursor-pointer transition-colors"
                >
                  {completingSession ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Compiling Performance Report...</span>
                    </>
                  ) : currentQuestionIndex < session.questions.length - 1 ? (
                    <>
                      <span>Next Question</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Complete & View Final Report</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 3. FINAL COMPREHENSIVE PERFORMANCE REPORT ───────────────────────────── */}
      {viewMode === 'result' && session && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
          {/* Hero Score Gauge */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-100 bg-gradient-to-r from-white via-indigo-50/30 to-purple-50/40 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center space-x-5">
                <div className="w-20 h-20 rounded-3xl bg-white border border-indigo-100 flex flex-col items-center justify-center shadow-2xs">
                  <span className="text-2xl font-black text-slate-900">
                    {session.overall_score ?? 0}%
                  </span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Score</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-slate-900">Interview Evaluation Report</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold uppercase">
                      {session.interview_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {session.subject} • {session.difficulty} Difficulty • {session.total_questions} Questions Answered
                  </p>
                  <span
                    className={`inline-block px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide mt-1 ${
                      session.performance_tier === 'Outstanding'
                        ? 'bg-emerald-100 text-emerald-800'
                        : session.performance_tier === 'Strong Candidate'
                        ? 'bg-indigo-100 text-indigo-800'
                        : session.performance_tier === 'Needs Preparation'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {session.performance_tier || 'Completed'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePracticeAgain}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Practice Again</span>
                </button>
                <button
                  onClick={() => setViewMode('setup')}
                  className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  New Setup
                </button>
              </div>
            </div>
          </div>

          {/* Topic & Dimension Breakdown Matrix */}
          {session.topic_breakdown?.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Dimension-by-Dimension Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {session.topic_breakdown.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{t.topic}</h4>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          t.rating === 'Strong'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.rating === 'Moderate'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.rating} ({t.score}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          t.score >= 80 ? 'bg-emerald-500' : t.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(5, t.score)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weak Areas & Actionable Suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weak Areas */}
            {session.weak_areas?.length > 0 && (
              <div className="glass-panel p-5 rounded-3xl border border-rose-200 bg-rose-50/25 space-y-3 shadow-xs">
                <div className="flex items-center space-x-2 text-rose-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Identified Knowledge Gaps ({session.weak_areas.length}):</span>
                </div>
                <ul className="space-y-1.5 text-xs text-rose-800 list-disc list-inside">
                  {session.weak_areas.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvement Suggestions */}
            {session.improvement_suggestions?.length > 0 && (
              <div className="glass-panel p-5 rounded-3xl border border-indigo-200 bg-indigo-50/30 space-y-3 shadow-xs">
                <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs">
                  <Lightbulb className="w-4 h-4 text-indigo-600" />
                  <span>Examiner Coaching Advice:</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                  {session.improvement_suggestions.map((sug, idx) => (
                    <li key={idx}>{sug}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Question-by-Question Audit Review */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Question-by-Question Audit & Model Answers
            </h3>
            <div className="space-y-4">
              {session.questions.map((q, idx) => {
                const evalItem = session.evaluations?.find((e) => e.question_id === q.id);
                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-indigo-700">
                          Q{idx + 1} • {q.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{q.question}</h4>
                      </div>
                      {evalItem && (
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                            evalItem.score >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : evalItem.score >= 60
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {evalItem.score}%
                        </span>
                      )}
                    </div>

                    {evalItem && (
                      <div className="space-y-2 pt-1 text-xs">
                        <div className="p-3 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            Your Response:
                          </span>
                          <p className="text-slate-700 italic mt-0.5">{evalItem.student_answer}</p>
                        </div>

                        <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
                          <span className="text-[10px] font-bold uppercase text-indigo-900 block">
                            Suggested Model Answer:
                          </span>
                          <p className="text-slate-700 mt-0.5">{evalItem.suggested_model_answer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. INTERVIEW HISTORY VIEW ────────────────────────────────────────────── */}
      {viewMode === 'history' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white space-y-6 shadow-xs max-w-4xl mx-auto animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Past Interview Sessions</h2>
              <p className="text-xs text-slate-500">Track your interview defense scores and progress over time</p>
            </div>
            <button
              onClick={fetchHistory}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>

          {loadingHistory ? (
            <div className="text-center py-12 space-y-2">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading past sessions...</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No interview sessions recorded yet.</p>
              <button
                onClick={() => setViewMode('setup')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Start Your First Session
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleViewHistoricalSession(item)}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-200 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {item.interview_type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {item.subject}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {item.difficulty} • {item.total_questions} Questions
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 block">
                        {item.overall_score !== null ? `${item.overall_score}%` : 'In Progress'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {item.performance_tier || item.status}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
