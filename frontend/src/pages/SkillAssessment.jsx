import React, { useState, useEffect, useRef } from 'react';
import { assessmentAPI } from '../services/api';
import {
  Target,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  BrainCircuit,
  BookOpen,
  Clock,
  Layers,
  History,
  Info,
  TrendingUp,
  AlertTriangle,
  CheckSquare
} from 'lucide-react';

export const SkillAssessment = () => {
  // Setup Form State
  const [subject, setSubject] = useState('Data Science');
  const [learningGoal, setLearningGoal] = useState('Master core data science & analytics skills');
  const [topicsInput, setTopicsInput] = useState('Python, SQL, Statistics');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [numQuestions, setNumQuestions] = useState(10);

  // Assessment Execution State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assessmentData, setAssessmentData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);

  // Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  // History State
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await assessmentAPI.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load assessment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStartAssessment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setQuestions([]);
    setAssessmentData(null);
    setIsSubmitted(false);
    setUserAnswers({});
    setCurrentIdx(0);
    setAssessmentResult(null);
    setElapsedSeconds(0);

    const parsedTopics = topicsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const data = await assessmentAPI.generate(
        subject,
        learningGoal,
        parsedTopics,
        difficulty,
        numQuestions
      );

      if (data.questions && data.questions.length > 0) {
        setAssessmentData(data);
        setQuestions(data.questions);
        setIsTimerRunning(true);
      } else {
        setError('Failed to generate assessment questions. Please try again.');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Failed to initialize skill assessment. Please check your inputs and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId, optionKey) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: optionKey,
    }));
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmitAssessment = async () => {
    setIsTimerRunning(false);

    let totalScore = 0;
    const topicStats = {};

    questions.forEach((q) => {
      const topicName = q.topic || 'General';
      if (!topicStats[topicName]) {
        topicStats[topicName] = {
          total: 0,
          correct: 0,
          incorrect: 0,
        };
      }
      topicStats[topicName].total += 1;

      const userChoice = userAnswers[q.id];
      if (userChoice === q.correct_answer) {
        totalScore += 1;
        topicStats[topicName].correct += 1;
      } else {
        topicStats[topicName].incorrect += 1;
      }
    });

    const overallPercentage = Math.round((totalScore / questions.length) * 100);

    const strongTopics = [];
    const moderateTopics = [];
    const weakTopics = [];

    const topicBreakdown = Object.entries(topicStats).map(([topicName, stats]) => {
      const pct = Math.round((stats.correct / stats.total) * 100);
      let level = 'Weak';
      if (pct >= 80) {
        level = 'Strong';
        strongTopics.push(topicName);
      } else if (pct >= 60) {
        level = 'Moderate';
        moderateTopics.push(topicName);
      } else {
        weakTopics.push(topicName);
      }

      return {
        topic: topicName,
        total_questions: stats.total,
        correct_count: stats.correct,
        incorrect_count: stats.incorrect,
        percentage: pct,
        mastery_level: level,
      };
    });

    const submitPayload = {
      subject: assessmentData?.subject || subject,
      learning_goal: assessmentData?.learning_goal || learningGoal,
      topics: assessmentData?.topics || [],
      total_questions: questions.length,
      score: totalScore,
      percentage: overallPercentage,
      time_taken_seconds: elapsedSeconds,
      topic_breakdown: topicBreakdown,
      weak_topics: weakTopics,
      moderate_topics: moderateTopics,
      strong_topics: strongTopics,
      details: questions.map((q) => ({
        id: q.id,
        question: q.question,
        topic: q.topic,
        difficulty: q.difficulty,
        user_answer: userAnswers[q.id] || 'Unanswered',
        correct_answer: q.correct_answer,
        is_correct: userAnswers[q.id] === q.correct_answer,
        explanation: q.explanation,
      })),
    };

    try {
      const savedResult = await assessmentAPI.submit(submitPayload);
      setAssessmentResult(savedResult);
      setIsSubmitted(true);
      fetchHistory();
    } catch (err) {
      console.error('Failed to save assessment result:', err);
      // Fallback display result locally even if API error occurred
      setAssessmentResult({
        ...submitPayload,
        created_at: new Date().toISOString(),
        disclaimer:
          'This is an application-level skill assessment, not a scientifically validated psychometric evaluation.',
      });
      setIsSubmitted(true);
    }
  };

  const handleRetake = () => {
    setIsSubmitted(false);
    setUserAnswers({});
    setCurrentIdx(0);
    setAssessmentResult(null);
    setElapsedSeconds(0);
    setIsTimerRunning(true);
  };

  const handleResetToSetup = () => {
    setIsTimerRunning(false);
    setQuestions([]);
    setAssessmentData(null);
    setIsSubmitted(false);
    setUserAnswers({});
    setCurrentIdx(0);
    setAssessmentResult(null);
    setElapsedSeconds(0);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-600 shadow-xs">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Skill Gap Assessment
              <span className="text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-200">
                Evaluation
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Evaluate mastery across target sub-topics, identify competency gaps, and view personalized performance levels
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center space-x-2 self-start md:self-auto cursor-pointer"
        >
          <History className="w-4 h-4 text-indigo-600" />
          <span>{showHistory ? 'Hide Assessment Logs' : 'View Past Assessments'}</span>
        </button>
      </div>

      {/* History Drawer / Log View */}
      {showHistory && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-100 space-y-4 shadow-xs animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Assessment History Records</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">{history.length} logged</span>
          </div>

          {loadingHistory ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading past assessments...</p>
          ) : history.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2.5 hover:border-indigo-200 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.subject}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{item.learning_goal}</p>
                    </div>
                    <span
                      className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                        item.percentage >= 80
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.percentage >= 60
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {item.percentage}%
                    </span>
                  </div>

                  {/* Topic Mastery Summary */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.topic_breakdown?.map((tb, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          tb.mastery_level === 'Strong'
                            ? 'bg-emerald-100/70 text-emerald-800'
                            : tb.mastery_level === 'Moderate'
                            ? 'bg-amber-100/70 text-amber-800'
                            : 'bg-rose-100/70 text-rose-800'
                        }`}
                      >
                        {tb.topic}: {tb.mastery_level} ({tb.percentage}%)
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>{item.score} of {item.total_questions} correct</span>
                    <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400">
              No skill assessment logs recorded yet. Complete an assessment below to track your skill gaps!
            </div>
          )}
        </div>
      )}

      {/* ─── SECTION 1: ASSESSMENT SETUP FORM ─── */}
      {questions.length === 0 && !loading && (
        <form
          onSubmit={handleStartAssessment}
          className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-6 max-w-2xl mx-auto shadow-xs"
        >
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Configure Skill Gap Assessment</h2>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            {/* Subject */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Subject / Domain</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Data Science, Web Development, Cloud Computing"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 mr-1 self-center">Presets:</span>
                {['Data Science', 'Full Stack Web Dev', 'Python Mastery', 'Machine Learning'].map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setSubject(p)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Goal */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Target Learning Goal</label>
              <input
                type="text"
                required
                value={learningGoal}
                onChange={(e) => setLearningGoal(e.target.value)}
                placeholder="e.g. Pass Senior Engineering Interview, Master Analytics"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            {/* Sub-Topics */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Sub-Topics to Evaluate <span className="font-normal text-slate-400">(Comma-separated)</span>
              </label>
              <input
                type="text"
                required
                value={topicsInput}
                onChange={(e) => setTopicsInput(e.target.value)}
                placeholder="e.g. Python, SQL, Statistics, Data Pipelines"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Questions will be evenly partitioned across these topics to measure your individual mastery per topic.
              </p>
            </div>

            {/* Grid for Difficulty and Questions count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Question Count</label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                >
                  <option value={6}>6 Questions (Quick Diagnostic)</option>
                  <option value={10}>10 Questions (Standard Assessment)</option>
                  <option value={15}>15 Questions (Comprehensive Audit)</option>
                  <option value={20}>20 Questions (Deep Gap Analysis)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate & Start Assessment</span>
          </button>
        </form>
      )}

      {/* Loading State */}
      {loading && (
        <div className="glass-panel p-12 rounded-3xl border border-slate-100 text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto animate-bounce">
            <Target className="w-7 h-7 animate-spin" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Crafting Multi-Topic Assessment...</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Distributing balanced questions across target topics with validated options and keys.
          </p>
        </div>
      )}

      {/* ─── SECTION 2: LIVE QUESTION RUNNER ─── */}
      {questions.length > 0 && !isSubmitted && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-6 max-w-3xl mx-auto shadow-xs">
          {/* Header Stats Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-xs border border-indigo-100">
                {questions[currentIdx]?.topic || subject}
              </span>
              <span className="text-xs text-slate-400 uppercase font-semibold">
                {questions[currentIdx]?.difficulty || difficulty}
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs font-bold text-slate-600">
              <div className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>{formatTime(elapsedSeconds)}</span>
              </div>
              <span className="text-indigo-600 font-extrabold">
                {Math.round(((currentIdx + 1) / questions.length) * 100)}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Stepper bubbles */}
          <div className="flex flex-wrap gap-1.5 py-1">
            {questions.map((q, idx) => {
              const isAnswered = userAnswers[q.id] !== undefined;
              const isCurrent = currentIdx === idx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isAnswered
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Question Text */}
          <div className="space-y-3 pt-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              <span className="text-indigo-600 mr-2">Q{currentIdx + 1}.</span>
              {questions[currentIdx]?.question}
            </h2>
          </div>

          {/* Options List */}
          <div className="space-y-3 pt-2">
            {Object.entries(questions[currentIdx]?.options || {}).map(([key, text]) => {
              const qId = questions[currentIdx].id;
              const isSelected = userAnswers[qId] === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectOption(qId, key)}
                  className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center space-x-3.5 text-xs sm:text-sm cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {key}
                  </span>
                  <span className="flex-1">{text}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitAssessment}
                disabled={Object.keys(userAnswers).length < questions.length}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-40 cursor-pointer flex items-center space-x-2"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Submit Assessment</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── SECTION 3: ASSESSMENT RESULTS & SKILL GAP ANALYSIS ─── */}
      {isSubmitted && assessmentResult && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-8 max-w-4xl mx-auto shadow-xs">
          {/* Header Score Overview */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200">
              <Award className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Skill Gap Assessment Complete!</h2>
            <div className="text-4xl font-extrabold text-indigo-600">
              {assessmentResult.percentage}%
            </div>
            <p className="text-xs text-slate-500 font-medium">
              You correctly answered <span className="font-bold text-slate-900">{assessmentResult.score}</span> of{' '}
              <span className="font-bold text-slate-900">{assessmentResult.total_questions}</span> questions in{' '}
              <span className="font-bold text-slate-900">{formatTime(assessmentResult.time_taken_seconds || elapsedSeconds)}</span>.
            </p>
          </div>

          {/* Application-level Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-600 text-xs flex items-center space-x-2.5">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-bold text-slate-800">Note: </span>
              {assessmentResult.disclaimer ||
                'This is an application-level skill assessment, not a scientifically validated psychometric evaluation.'}
            </p>
          </div>

          {/* ─── TOPIC-WISE SKILL GAP ANALYSIS ─── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Topic-Wise Skill Gap & Mastery Levels</span>
              </h3>
              <div className="flex items-center space-x-2 text-[10px] font-bold">
                <span className="text-emerald-700">Strong (80-100%)</span>
                <span>•</span>
                <span className="text-amber-700">Moderate (60-79%)</span>
                <span>•</span>
                <span className="text-rose-700">Weak (0-59%)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assessmentResult.topic_breakdown?.map((item, idx) => {
                const isStrong = item.mastery_level === 'Strong';
                const isModerate = item.mastery_level === 'Moderate';
                const isWeak = item.mastery_level === 'Weak';

                const cardBg = isStrong
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : isModerate
                  ? 'bg-amber-50/60 border-amber-200'
                  : 'bg-rose-50/60 border-rose-200';

                const badgeBg = isStrong
                  ? 'bg-emerald-100 text-emerald-800'
                  : isModerate
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800';

                const progressColor = isStrong
                  ? 'bg-emerald-500'
                  : isModerate
                  ? 'bg-amber-500'
                  : 'bg-rose-500';

                return (
                  <div key={idx} className={`p-5 rounded-2xl border ${cardBg} space-y-3 shadow-2xs`}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.topic}</h4>
                      <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${badgeBg}`}>
                        {item.mastery_level} — {item.percentage}%
                      </span>
                    </div>

                    {/* Progress indicator */}
                    <div className="w-full h-2 bg-white/80 rounded-full overflow-hidden border border-slate-100">
                      <div
                        className={`h-full ${progressColor} rounded-full transition-all`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{item.correct_count} correct / {item.total_questions} total</span>
                      <span className="font-semibold text-slate-700">
                        {isStrong ? 'Proficient' : isModerate ? 'Needs Practice' : 'Critical Gap'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Identified Focus Areas / Recommendations */}
          {assessmentResult.weak_topics?.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Identified Priority Skill Gaps</span>
              </h4>
              <p className="text-xs text-amber-800">
                Consider focusing your upcoming study sessions or generating dedicated quizzes on:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {assessmentResult.weak_topics.map((wt, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300"
                  >
                    {wt} (Weak)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Detailed Question Analysis</span>
            </h3>

            {questions.map((q, idx) => {
              const userAns = userAnswers[q.id];
              const isCorrect = userAns === q.correct_answer;
              return (
                <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-start space-x-2">
                      <span className="font-extrabold text-indigo-600">{idx + 1}.</span>
                      <span>{q.question}</span>
                    </h4>
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                        {q.topic}
                      </span>
                      {isCorrect ? (
                        <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Incorrect</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div
                      className={`p-3 rounded-xl border ${
                        isCorrect
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <span className="font-bold">Your Choice:</span> {userAns ? `${userAns}: ${q.options[userAns]}` : 'Unanswered'}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-emerald-700 font-medium">
                      <span className="font-bold">Correct Answer:</span> {q.correct_answer}: {q.options[q.correct_answer]}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-indigo-700">Explanation:</span> {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <button
              onClick={handleRetake}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Assessment</span>
            </button>
            <button
              onClick={handleResetToSetup}
              className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Configure New Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
