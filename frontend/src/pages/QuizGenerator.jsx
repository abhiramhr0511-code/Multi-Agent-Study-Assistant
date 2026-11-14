import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import {
  HelpCircle,
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
  Target,
  Sliders,
  TrendingUp,
  AlertTriangle,
  Zap,
  CheckSquare
} from 'lucide-react';

export const QuizGenerator = () => {
  const navigate = useNavigate();

  // Mode Selection: 'standard' | 'adaptive'
  const [quizMode, setQuizMode] = useState('adaptive');

  // Standard Quiz Form State
  const [topic, setTopic] = useState('Python Programming');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [focusAreas, setFocusAreas] = useState('data structures, loops, functions');
  const [numQuestions, setNumQuestions] = useState(10);

  // Adaptive Context State
  const [adaptiveContext, setAdaptiveContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);

  // Active Quiz State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [isAdaptiveSession, setIsAdaptiveSession] = useState(false);
  const [adaptiveMeta, setAdaptiveMeta] = useState(null);

  // Live dynamic difficulty adaptation during quiz
  const [liveDifficulty, setLiveDifficulty] = useState('medium');

  useEffect(() => {
    fetchAdaptiveContext();
  }, []);

  const fetchAdaptiveContext = async () => {
    try {
      setLoadingContext(true);
      const data = await quizAPI.getAdaptiveContext();
      if (data && data.has_assessment) {
        setAdaptiveContext(data);
        if (data.subject) {
          setTopic(data.subject);
        }
      }
    } catch (err) {
      console.warn('Failed to load adaptive context:', err);
    } finally {
      setLoadingContext(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setQuestions([]);
    setIsSubmitted(false);
    setUserAnswers({});
    setCurrentIdx(0);
    setQuizScore(null);

    const isAdaptive = quizMode === 'adaptive';
    setIsAdaptiveSession(isAdaptive);

    try {
      const data = await quizAPI.generate(
        topic,
        difficulty,
        focusAreas,
        numQuestions,
        isAdaptive,
        adaptiveContext?.subject || topic,
        adaptiveContext ? (adaptiveContext.weak_topics || []).concat(adaptiveContext.moderate_topics || []) : []
      );

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setAdaptiveMeta(data.adaptive_meta || null);
        setLiveDifficulty(data.questions[0]?.difficulty || difficulty);
      } else {
        setError('Failed to generate questions. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Quiz generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionIndex, optionKey) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionKey,
    }));

    // In adaptive mode, dynamically adjust the live difficulty for subsequent questions
    if (isAdaptiveSession) {
      const q = questions[questionIndex];
      const isCorrect = optionKey === q.correct_answer;
      if (isCorrect) {
        setLiveDifficulty((prev) => (prev === 'easy' ? 'medium' : 'hard'));
      } else {
        setLiveDifficulty((prev) => (prev === 'hard' ? 'medium' : 'easy'));
      }
    }
  };

  const handleSubmitQuiz = async () => {
    let correctCount = 0;
    const weakAreas = [];
    const topicStats = {};

    questions.forEach((q, idx) => {
      const topicName = q.topic || q.key_concept || topic;
      if (!topicStats[topicName]) {
        topicStats[topicName] = { total: 0, correct: 0 };
      }
      topicStats[topicName].total += 1;

      const selected = userAnswers[idx];
      if (selected === q.correct_answer) {
        correctCount += 1;
        topicStats[topicName].correct += 1;
      } else {
        const concept = q.key_concept || topicName;
        if (concept && !weakAreas.includes(concept)) {
          weakAreas.push(concept);
        }
      }
    });

    const percentage = Math.round((correctCount / questions.length) * 100);

    const topicBreakdown = Object.entries(topicStats).map(([tName, stats]) => ({
      topic: tName,
      total_questions: stats.total,
      correct_count: stats.correct,
      percentage: Math.round((stats.correct / stats.total) * 100),
    }));

    // Formulate recommended next steps
    let recStep = 'Great job! Continue your structured learning path.';
    const weakTopicsInQuiz = topicBreakdown.filter((tb) => tb.percentage < 70).map((tb) => tb.topic);
    if (weakTopicsInQuiz.length > 0) {
      recStep = `Continue practicing ${weakTopicsInQuiz.slice(0, 2).join(' and ')} to reinforce weak areas.`;
    } else if (percentage >= 85) {
      recStep = 'Mastery demonstrated across all tested topics! Ready to tackle higher difficulty levels.';
    }

    const scoreData = {
      topic: adaptiveContext?.subject || topic,
      difficulty,
      score: correctCount,
      total_questions: questions.length,
      percentage,
      weak_areas: weakAreas,
      is_adaptive: isAdaptiveSession,
      topic_breakdown: topicBreakdown,
      recommended_next_step: recStep,
      details: questions.map((q, idx) => ({
        question: q.question,
        topic: q.topic || topic,
        difficulty: q.difficulty || difficulty,
        user_answer: userAnswers[idx] || 'Unanswered',
        correct_answer: q.correct_answer,
        is_correct: userAnswers[idx] === q.correct_answer,
        explanation: q.explanation,
      })),
    };

    setQuizScore(scoreData);
    setIsSubmitted(true);

    try {
      const savedResult = await quizAPI.submitResults(scoreData);
      if (savedResult && savedResult.details) {
        setQuizScore(savedResult);
      }
      // Refresh adaptive context after submitting adaptive quiz
      if (isAdaptiveSession) {
        fetchAdaptiveContext();
      }
    } catch (err) {
      console.error('Error saving quiz results:', err);
    }
  };

  const handleRetake = () => {
    setIsSubmitted(false);
    setUserAnswers({});
    setCurrentIdx(0);
    setQuizScore(null);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-pink-100 text-pink-600 shadow-xs">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Interactive Quiz Generator
              <span className="text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 font-extrabold border border-pink-200">
                AI Powered
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Practice concepts with standard quizzes or adaptive tests tailored to your skill gaps
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/skill-assessment')}
          className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 text-xs font-bold transition-all flex items-center space-x-2 self-start md:self-auto cursor-pointer shadow-2xs"
        >
          <Target className="w-4 h-4 text-indigo-600" />
          <span>Skill Assessment Hub</span>
        </button>
      </div>

      {/* ─── QUIZ CONFIGURATION FORM ─── */}
      {questions.length === 0 && !loading && (
        <form onSubmit={handleGenerate} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-6 max-w-2xl mx-auto shadow-xs">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Select Quiz Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Adaptive Quiz Mode */}
              <button
                type="button"
                onClick={() => setQuizMode('adaptive')}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                  quizMode === 'adaptive'
                    ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 shadow-xs ring-1 ring-indigo-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <div className={`p-1.5 rounded-lg ${quizMode === 'adaptive' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold">Adaptive Quiz</h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Personalized to test your weakest skills (~60% weak, ~30% moderate, ~10% strong) with dynamic difficulty.
                </p>
              </button>

              {/* Standard Quiz Mode */}
              <button
                type="button"
                onClick={() => setQuizMode('standard')}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                  quizMode === 'standard'
                    ? 'bg-pink-50/70 border-pink-300 text-pink-950 shadow-xs ring-1 ring-pink-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-1.5">
                  <div className={`p-1.5 rounded-lg ${quizMode === 'standard' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Sliders className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold">Standard Quiz</h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Traditional quiz covering custom topics and focus areas at your chosen difficulty level.
                </p>
              </button>
            </div>
          </div>

          {/* Adaptive Context Summary if Adaptive Mode is chosen */}
          {quizMode === 'adaptive' && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/90 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Personalized using your latest Skill Assessment</span>
                </h4>
                {adaptiveContext?.has_assessment && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-extrabold">
                    {adaptiveContext.subject}
                  </span>
                )}
              </div>

              {adaptiveContext?.has_assessment ? (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    {/* Needs Attention */}
                    <div className="p-2.5 rounded-xl bg-white border border-rose-100 space-y-1">
                      <span className="text-rose-800 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Needs Attention
                      </span>
                      {adaptiveContext.weak_topics?.length > 0 ? (
                        <div className="space-y-0.5 text-rose-900 font-medium truncate">
                          {adaptiveContext.weak_topics.map((t, i) => (
                            <p key={i}>• {t}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">None</p>
                      )}
                    </div>

                    {/* Moderate */}
                    <div className="p-2.5 rounded-xl bg-white border border-amber-100 space-y-1">
                      <span className="text-amber-800 font-bold flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-amber-600" /> Moderate
                      </span>
                      {adaptiveContext.moderate_topics?.length > 0 ? (
                        <div className="space-y-0.5 text-amber-900 font-medium truncate">
                          {adaptiveContext.moderate_topics.map((t, i) => (
                            <p key={i}>• {t}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">None</p>
                      )}
                    </div>

                    {/* Strong */}
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-100 space-y-1">
                      <span className="text-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Strong
                      </span>
                      {adaptiveContext.strong_topics?.length > 0 ? (
                        <div className="space-y-0.5 text-emerald-900 font-medium truncate">
                          {adaptiveContext.strong_topics.map((t, i) => (
                            <p key={i}>• {t}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">None</p>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-indigo-900/80 font-medium pt-1">
                    🎯 Questions will focus heavily on your weaker topics to accelerate learning.
                  </p>
                </div>
              ) : (
                /* No assessment case */
                <div className="text-[11px] text-slate-600 space-y-2">
                  <p>
                    Complete a Skill Assessment to unlock deep personalized quiz recommendations. We will generate an adaptive diagnostic based on your topic.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/skill-assessment')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                  >
                    <span>Take Skill Assessment now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Study Domain / Subject</label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Python Programming, SQL Database, Statistics"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {quizMode === 'adaptive' ? 'Baseline Difficulty' : 'Difficulty Level'}
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white font-medium"
                >
                  <option value="beginner">Beginner (Easy Start)</option>
                  <option value="intermediate">Intermediate (Standard)</option>
                  <option value="advanced">Advanced (Challenging)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Question Count</label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white font-medium"
                >
                  <option value={5}>5 Questions (Quick Test)</option>
                  <option value={10}>10 Questions (Recommended)</option>
                  <option value={15}>15 Questions (Deep Drill)</option>
                  <option value={20}>20 Questions (Mastery Audit)</option>
                </select>
              </div>
            </div>

            {quizMode === 'standard' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Specific Focus Areas (Optional)</label>
                <input
                  type="text"
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  placeholder="e.g. loops, recursion, error handling"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{quizMode === 'adaptive' ? 'Generate Adaptive Personalized Quiz' : 'Generate Standard Quiz'}</span>
          </button>
        </form>
      )}

      {/* Loading State */}
      {loading && (
        <div className="glass-panel p-12 rounded-3xl border border-slate-100 text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto animate-bounce">
            <BrainCircuit className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {isAdaptiveSession ? 'Crafting Adaptive Personalized Quiz...' : 'Batch-Generating Quiz Questions...'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isAdaptiveSession
              ? 'Weighting weak topics (~60%) and assigning dynamic difficulty baselines.'
              : 'Questions are generated in verified batches to ensure complete answer options.'}
          </p>
        </div>
      )}

      {/* ─── ACTIVE QUESTION RUNNER ─── */}
      {questions.length > 0 && !isSubmitted && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-6 max-w-3xl mx-auto shadow-xs">
          {/* Header Progress & Adaptive Difficulty Indicators */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-purple-700 px-2.5 py-1 rounded-md bg-purple-100 border border-purple-200">
                {questions[currentIdx]?.topic || topic}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 rounded-md bg-slate-100">
                Diff: {questions[currentIdx]?.difficulty || liveDifficulty}
              </span>
            </div>

            {isAdaptiveSession && (
              <span className="text-[10px] font-bold text-indigo-700 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 flex items-center space-x-1">
                <Zap className="w-3 h-3 text-indigo-600" />
                <span>Adaptive Level: {liveDifficulty.toUpperCase()}</span>
              </span>
            )}

            <div className="text-xs font-bold text-brand-600">
              Question {currentIdx + 1} of {questions.length} ({Math.round(((currentIdx + 1) / questions.length) * 100)}%)
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 transition-all duration-300 rounded-full"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Stepper Bubbles */}
          <div className="flex flex-wrap gap-1.5 py-1">
            {questions.map((q, idx) => {
              const isAnswered = userAnswers[idx] !== undefined;
              const isCurrent = currentIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-brand-600 text-white shadow-xs'
                      : isAnswered
                      ? 'bg-purple-100 text-purple-800'
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
              <span className="text-brand-600 mr-2">Q{currentIdx + 1}.</span>
              {questions[currentIdx].question}
            </h2>
          </div>

          {/* Options List */}
          <div className="space-y-3 pt-2">
            {Object.entries(questions[currentIdx].options).map(([key, text]) => {
              const isSelected = userAnswers[currentIdx] === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectOption(currentIdx, key)}
                  className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center space-x-3.5 text-xs sm:text-sm cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
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
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={Object.keys(userAnswers).length < questions.length}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-40 cursor-pointer flex items-center space-x-2"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Submit & Calculate Score</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── QUIZ RESULTS & TOPIC PERFORMANCE SUMMARY ─── */}
      {isSubmitted && quizScore && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-8 max-w-4xl mx-auto shadow-xs">
          {/* Score Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">
              <Award className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {isAdaptiveSession ? 'Adaptive Quiz Completed!' : 'Quiz Completed!'}
            </h2>
            <div className="text-4xl font-extrabold text-emerald-600">
              {quizScore.percentage}%
            </div>
            <p className="text-xs text-slate-500 font-medium">
              You scored <span className="font-bold text-slate-900">{quizScore.score}</span> out of{' '}
              <span className="font-bold text-slate-900">{quizScore.total_questions}</span> correct questions.
            </p>
          </div>

          {/* Topics Practiced Breakdown (Adaptive Results) */}
          {quizScore.topic_breakdown?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <span>Topics Practiced & Accuracy</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {quizScore.topic_breakdown.map((tb, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate">{tb.topic}</span>
                      <span
                        className={`font-extrabold px-2 py-0.5 rounded-md text-[11px] ${
                          tb.percentage >= 70
                            ? 'bg-emerald-100 text-emerald-800'
                            : tb.percentage >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {tb.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          tb.percentage >= 70 ? 'bg-emerald-500' : tb.percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${tb.percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {tb.correct_count} of {tb.total_questions} correct
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Next Step Box */}
          {quizScore.recommended_next_step && (
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-1.5">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Recommended Next Step</span>
              </h4>
              <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                {quizScore.recommended_next_step}
              </p>
            </div>
          )}

          {/* Detailed Question Review List with AI Mistake Analyzer Panel */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-brand-600" />
              <span>Detailed Question Review & AI Mistake Diagnosis</span>
            </h3>

            {questions.map((q, idx) => {
              const userAns = userAnswers[idx];
              const isCorrect = userAns === q.correct_answer;
              const detailRecord = quizScore.details ? quizScore.details[idx] : null;
              const mistakeAnalysis = detailRecord?.mistake_analysis;
              const isRepeatedTopic = detailRecord?.is_repeated_topic;

              return (
                <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3.5 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-start space-x-2">
                      <span className="font-extrabold text-brand-600">{idx + 1}.</span>
                      <span>{q.question}</span>
                    </h4>
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                        {q.topic || topic}
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
                    <div className={`p-3 rounded-xl border ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                      <span className="font-bold">Your Choice:</span> {userAns ? `${userAns}: ${q.options[userAns]}` : 'None'}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-emerald-700 font-medium">
                      <span className="font-bold">Correct Answer:</span> {q.correct_answer}: {q.options[q.correct_answer]}
                    </div>
                  </div>

                  {/* Standard Explanation */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-brand-700">Explanation:</span> {q.explanation}
                  </div>

                  {/* ─── AI MISTAKE ANALYZER CARD (FOR INCORRECT ANSWERS) ─── */}
                  {!isCorrect && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50/70 via-indigo-50/40 to-white border border-rose-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BrainCircuit className="w-4 h-4 text-indigo-600" />
                          <h5 className="text-xs font-bold text-slate-900">AI Mistake & Misconception Analysis</h5>
                        </div>
                        {isRepeatedTopic && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold border border-amber-300 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            <span>Repeated Conceptual Difficulty</span>
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                        <p>
                          <strong className="text-rose-900">Possible Misconception: </strong>
                          {mistakeAnalysis?.possible_misconception || `The answer suggests a confusion regarding the correct application of ${q.topic || topic}.`}
                        </p>
                        <p>
                          <strong className="text-emerald-900">Correct Principle: </strong>
                          {mistakeAnalysis?.correct_concept || `Always verify standard rules and definitions for ${q.topic || topic}.`}
                        </p>
                        <div className="pt-1 flex flex-wrap gap-2 text-[11px]">
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-900 font-medium">
                            💡 <strong>Recommended:</strong> {mistakeAnalysis?.recommended_action || `Review ${q.topic || topic} reference guide.`}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-900 font-medium">
                            📝 <strong>Practice:</strong> {mistakeAnalysis?.practice_recommendation || `Complete 3 questions on ${q.topic || topic}.`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center space-x-4 pt-4">
            <button
              onClick={handleRetake}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Quiz</span>
            </button>
            <button
              onClick={() => setQuestions([])}
              className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Configure New Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
