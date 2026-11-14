import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { progressAPI, mistakeAPI } from '../services/api';
import {
  TrendingUp,
  Award,
  FileText,
  Zap,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  Target,
  ArrowRight,
  Brain,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const Progress = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [mistakeSummary, setMistakeSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMistakeDetails, setShowMistakeDetails] = useState(false);
  const [expandedMistakeIdx, setExpandedMistakeIdx] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [progressData, mistakesData] = await Promise.all([
          progressAPI.get().catch(() => null),
          mistakeAPI.getSummary().catch(() => null),
        ]);
        setProgress(progressData);
        setMistakeSummary(mistakesData);
      } catch (err) {
        console.error('Failed to load progress analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-purple-100 text-purple-600">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Learning Progress Analytics</h1>
            <p className="text-xs text-slate-500">Track quiz performance, score trends, uploaded notes, and conceptual mistakes</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading progress metrics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Quizzes Completed</span>
                <Award className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{progress?.quizzes_completed || 0}</p>
              <p className="text-[10px] text-purple-600 font-bold">{progress?.adaptive_quizzes_completed || 0} adaptive sessions</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Average Quiz Score</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-600">{progress?.average_score || 0}%</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Skill Assessments</span>
                <Target className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-3xl font-extrabold text-indigo-600">{progress?.assessments_completed || 0}</p>
              <p className="text-[10px] text-slate-400 font-medium">Gap evaluations completed</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Indexed Documents</span>
                <FileText className="w-4 h-4 text-sky-600" />
              </div>
              <p className="text-3xl font-extrabold text-sky-600">{progress?.documents_uploaded || 0}</p>
              <p className="text-[10px] text-slate-400 font-medium">{progress?.text_chunks || 0} chunks</p>
            </div>
          </div>

          {/* Section: Your Learning Mistakes & Conceptual Difficulties */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-100/80 bg-rose-50/20 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Your Learning Mistakes</h2>
                  <p className="text-xs text-slate-500">AI conceptual diagnosis and recurring difficulty patterns</p>
                </div>
              </div>
              {mistakeSummary?.total_mistakes > 0 && (
                <button
                  onClick={() => setShowMistakeDetails(!showMistakeDetails)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer shadow-2xs transition-colors"
                >
                  <span>{showMistakeDetails ? 'Hide Details' : 'View Details'}</span>
                  {showMistakeDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Mistake Summary Metrics & Alerts */}
            {(!mistakeSummary || mistakeSummary.total_mistakes === 0) ? (
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1">
                <p className="text-xs font-bold text-slate-700">
                  {progress?.quizzes_completed === 0 ? 'No quiz mistakes yet.' : 'Great! No incorrect answers have been recorded yet.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  As you complete quizzes, AI mistake analyzer will diagnose conceptual misunderstandings here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/70 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Mistakes</span>
                    <p className="text-2xl font-extrabold text-rose-600">{mistakeSummary.total_mistakes}</p>
                    <p className="text-[10px] text-slate-400">Across all completed quizzes</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/70 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Repeated Difficulties</span>
                    <p className="text-2xl font-extrabold text-amber-600">{mistakeSummary.repeated_topics?.length || 0}</p>
                    <p className="text-[10px] text-amber-600/90 font-medium">Topics with multiple recurring errors</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/70 space-y-1 shadow-2xs sm:col-span-2 lg:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Problem Topics</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {mistakeSummary.top_problem_topics?.slice(0, 3).map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-700"
                        >
                          <span>{item.topic}</span>
                          <span className="bg-rose-200 text-rose-800 px-1 rounded-sm text-[9px]">{item.mistake_count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Repeated Mistake Alert Box */}
                {mistakeSummary.repeated_topics?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 space-y-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <h3 className="text-xs font-bold">Repeated Conceptual Difficulties Detected</h3>
                    </div>
                    <div className="space-y-1.5">
                      {mistakeSummary.repeated_topics.map((t, idx) => (
                        <div key={idx} className="text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-white/70 p-2.5 rounded-xl border border-amber-200/80">
                          <div>
                            <span className="font-bold text-slate-900">{t.topic}</span>
                            <span className="text-slate-600 ml-1.5">
                              has appeared in <strong className="text-rose-600 font-extrabold">{t.mistake_count}</strong> incorrect answers recently.
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-amber-800 italic">
                            Recommended: Review {t.topic} concepts and take a targeted practice quiz.
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Recent Mistake Analyses Drawer */}
                {showMistakeDetails && mistakeSummary.recent_misconceptions?.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recent Analyzed Mistakes</h3>
                    <div className="space-y-2.5">
                      {mistakeSummary.recent_misconceptions.map((m, idx) => {
                        const isExpanded = expandedMistakeIdx === idx;
                        return (
                          <div key={m.id || idx} className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                            <div
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedMistakeIdx(isExpanded ? null : idx)}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-slate-900">{m.topic || m.subject || 'Concept'}</span>
                                  {m.difficulty && (
                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                                      {m.difficulty}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400">
                                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-1 font-medium">{m.question}</p>
                              </div>
                              <button className="p-1 text-slate-400 hover:text-slate-600">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-xs">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                                  <p className="font-semibold text-slate-900">{m.question}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                                    <div className="p-2 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                                      <span className="font-bold">Your Answer: </span>
                                      <span>{m.student_answer || 'No answer'}</span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <span className="font-bold">Correct Answer: </span>
                                      <span>{m.correct_answer}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2 text-slate-800">
                                  <div>
                                    <span className="font-bold text-slate-900">Why: </span>
                                    <span className="text-slate-700">{m.explanation}</span>
                                  </div>
                                  {m.possible_misconception && (
                                    <div className="text-amber-900">
                                      <span className="font-bold">Possible Misconception: </span>
                                      <span>{m.possible_misconception}</span>
                                    </div>
                                  )}
                                  {m.correct_concept && (
                                    <div className="text-emerald-900">
                                      <span className="font-bold">Correct Principle: </span>
                                      <span>{m.correct_concept}</span>
                                    </div>
                                  )}
                                  {m.recommended_action && (
                                    <div className="text-indigo-900">
                                      <span className="font-bold">Recommended: </span>
                                      <span>{m.recommended_action}</span>
                                    </div>
                                  )}
                                  {m.practice_recommendation && (
                                    <div className="text-sky-900">
                                      <span className="font-bold">Practice Target: </span>
                                      <span>{m.practice_recommendation}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Latest Skill Assessment Card */}
          {progress?.latest_assessment && (
            <div className="glass-panel p-6 rounded-3xl border border-indigo-100/80 bg-indigo-50/30 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Latest Skill Gap Assessment ({progress.latest_assessment.subject})
                  </h2>
                </div>
                <button
                  onClick={() => navigate('/skill-assessment')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 cursor-pointer"
                >
                  <span>Open Assessment Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {progress.latest_assessment.topic_breakdown?.map((tb, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{tb.topic}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          tb.mastery_level === 'Strong'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tb.mastery_level === 'Moderate'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {tb.mastery_level} — {tb.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Identified Weak Topics */}
          {progress?.weak_topics?.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 space-y-3 shadow-xs">
              <h2 className="text-sm font-bold text-amber-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Identified Priority Focus Concepts</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {progress.weak_topics.map((topic, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Quiz Logs Table */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-brand-600" />
              <span>Recent Quiz Log History</span>
            </h2>

            {progress?.recent_quizzes?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Topic</th>
                      <th className="py-3.5 px-4">Difficulty</th>
                      <th className="py-3.5 px-4">Score</th>
                      <th className="py-3.5 px-4">Percentage</th>
                      <th className="py-3.5 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {progress.recent_quizzes.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <span>{q.topic}</span>
                            {q.is_adaptive && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-extrabold">
                                Adaptive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 uppercase text-slate-500 font-medium">{q.difficulty}</td>
                        <td className="py-3.5 px-4 text-slate-700">{q.score} / {q.total_questions}</td>
                        <td className="py-3.5 px-4 font-extrabold">
                          <span className={q.percentage >= 70 ? 'text-emerald-600' : 'text-amber-600'}>
                            {q.percentage}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{q.created_at ? new Date(q.created_at).toLocaleDateString() : 'Recent'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center font-medium">No quiz activity logged yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
