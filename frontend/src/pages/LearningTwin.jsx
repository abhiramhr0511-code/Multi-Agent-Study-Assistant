import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { learningTwinAPI } from '../services/api';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Target,
  ArrowRight,
  BookOpen,
  Award,
  Layers,
  Compass,
  FileText,
  Zap,
  Info
} from 'lucide-react';

export const LearningTwin = () => {
  const navigate = useNavigate();
  const [twin, setTwin] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTwinData = async () => {
    setLoading(true);
    try {
      const data = await learningTwinAPI.get();
      setTwin(data);
    } catch (err) {
      console.error('Failed to load Learning Twin profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTwinData();
  }, []);

  const getTrendBadge = (trend) => {
    switch (trend) {
      case 'Improving':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            <TrendingUp className="w-3 h-3" />
            <span>Improving</span>
          </span>
        );
      case 'Declining':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
            <TrendingDown className="w-3 h-3" />
            <span>Declining</span>
          </span>
        );
      case 'Stable':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
            <Minus className="w-3 h-3" />
            <span>Stable</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
            <span>Insufficient Data</span>
          </span>
        );
    }
  };

  const getMasteryBadge = (mastery) => {
    switch (mastery) {
      case 'Strong':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">Strong</span>;
      case 'Moderate':
        return <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">Moderate</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">Weak</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">Priority: High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">Priority: Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold">Priority: Low</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">Your Learning Twin</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold uppercase tracking-wider">
                Live State
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              An evidence-based snapshot synthesizing your Skill Assessments, Quiz Performance, Mistake Diagnostics, and Study Activity.
            </p>
          </div>
        </div>

        <button
          onClick={fetchTwinData}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-600' : 'text-slate-400'}`} />
          <span>Refresh State</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Synthesizing evidence-based Learning Twin profile...</p>
        </div>
      ) : !twin?.has_data ? (
        /* Empty State */
        <div className="glass-panel p-10 rounded-3xl border border-slate-200/80 text-center space-y-6 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <Layers className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-base font-bold text-slate-900">No learning data recorded yet</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your Learning Twin dynamically constructs a profile of your competencies as you complete evaluations and practice.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/skill-assessment')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-2 shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>Take Skill Assessment</span>
            </button>
            <button
              onClick={() => navigate('/quiz')}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs flex items-center space-x-2 cursor-pointer shadow-2xs"
            >
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Take a Quiz</span>
            </button>
            <button
              onClick={() => navigate('/roadmap')}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs flex items-center space-x-2 cursor-pointer shadow-2xs"
            >
              <Compass className="w-4 h-4 text-emerald-600" />
              <span>Start Roadmap</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Overall Mastery</span>
                <Award className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{twin.overall_progress}%</p>
              <p className="text-[10px] text-indigo-600 font-bold">Aggregated competency score</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Active Learning Goal</span>
                <Target className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-sm font-bold text-slate-800 line-clamp-2">{twin.learning_goal || 'General Mastery'}</p>
              <p className="text-[10px] text-slate-400 font-medium">{twin.primary_subject || 'All Subjects'}</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Tracked Topics</span>
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-600">{twin.skills?.length || 0}</p>
              <p className="text-[10px] text-slate-400 font-medium">Distinct conceptual areas</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Evidence Baseline</span>
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 pt-1">
                <span>{twin.total_assessments} Assessments</span>
                <span>•</span>
                <span>{twin.total_quizzes} Quizzes</span>
              </div>
              <p className="text-[10px] text-rose-600 font-bold">{twin.total_mistakes} analyzed mistake(s)</p>
            </div>
          </div>

          {/* Recommended Focus Topics Action Panel */}
          {twin.recommended_focus_topics?.length > 0 && (
            <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-rose-200/70 bg-rose-50/25 space-y-4 shadow-xs">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Recommended Priority Focus</h2>
                  <p className="text-xs text-slate-500">Targeted areas identified from performance deficits and recurring mistakes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {twin.recommended_focus_topics.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white border border-rose-100 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{idx + 1}. {item.topic}</span>
                      {getPriorityBadge(item.priority)}
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.reason}</p>
                    {item.recommended_action && (
                      <div className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-indigo-900 border border-slate-200/80 font-medium">
                        <span className="font-bold">Next Action: </span>
                        <span>{item.recommended_action}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categorized Mastery Distribution: Strong / Moderate / Needs Attention */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Strong Areas */}
            <div className="glass-panel p-5 rounded-3xl border border-emerald-100/90 bg-emerald-50/20 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Strong Areas</span>
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  {twin.strong_topics?.length || 0}
                </span>
              </div>
              <div className="space-y-1.5">
                {twin.strong_topics?.length > 0 ? (
                  twin.strong_topics.map((t, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-emerald-200/60 text-xs font-bold text-slate-800 shadow-2xs flex items-center justify-between">
                      <span>{t}</span>
                      <span className="text-[10px] text-emerald-600 font-extrabold">✓ Mastered</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No strong topics recorded yet.</p>
                )}
              </div>
            </div>

            {/* Moderate Areas */}
            <div className="glass-panel p-5 rounded-3xl border border-amber-100/90 bg-amber-50/20 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Minus className="w-4 h-4 text-amber-600" />
                  <span>Moderate Areas</span>
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                  {twin.moderate_topics?.length || 0}
                </span>
              </div>
              <div className="space-y-1.5">
                {twin.moderate_topics?.length > 0 ? (
                  twin.moderate_topics.map((t, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-amber-200/60 text-xs font-bold text-slate-800 shadow-2xs flex items-center justify-between">
                      <span>{t}</span>
                      <span className="text-[10px] text-amber-600 font-extrabold">• Needs Practice</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No moderate topics recorded.</p>
                )}
              </div>
            </div>

            {/* Needs Attention */}
            <div className="glass-panel p-5 rounded-3xl border border-rose-100/90 bg-rose-50/20 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Needs Attention</span>
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                  {twin.weak_topics?.length || 0}
                </span>
              </div>
              <div className="space-y-1.5">
                {twin.weak_topics?.length > 0 ? (
                  twin.weak_topics.map((t, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-rose-200/60 text-xs font-bold text-slate-800 shadow-2xs flex items-center justify-between">
                      <span>{t}</span>
                      <span className="text-[10px] text-rose-600 font-extrabold">⚠ High Priority</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No critical weak areas detected!</p>
                )}
              </div>
            </div>
          </div>

          {/* Repeated Conceptual Difficulties Box */}
          {twin.repeated_difficulties?.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl border border-amber-200 bg-amber-50/30 space-y-3 shadow-xs">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Repeated Conceptual Difficulties ({twin.repeated_difficulties.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {twin.repeated_difficulties.map((diff, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white border border-amber-200/80 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{diff.topic}</span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-extrabold">
                        {diff.mistake_count} mistakes
                      </span>
                    </div>
                    {diff.latest_misconception && (
                      <p className="text-[11px] text-slate-600">
                        <strong className="text-amber-900 font-semibold">Diagnosis: </strong>
                        {diff.latest_misconception}
                      </p>
                    )}
                    <p className="text-[11px] text-indigo-900 font-medium">
                      <strong className="font-semibold">Review: </strong>
                      {diff.recommended_action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Skill Evidence Cards Grid */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Topic-by-Topic Learning Evidence</h2>
                <p className="text-xs text-slate-500">Synthesized mastery, trends, and accuracy metrics for each topic</p>
              </div>
              <button
                onClick={() => navigate('/quiz')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1 cursor-pointer"
              >
                <span>Practice in Quiz Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {twin.skills?.map((skill, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{skill.topic}</h3>
                      <p className="text-[10px] text-slate-400 font-medium">{skill.subject || 'General'}</p>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {getMasteryBadge(skill.mastery)}
                      {getTrendBadge(skill.trend)}
                    </div>
                  </div>

                  {/* Progress Bar & Score */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Competency Score</span>
                      <span className="font-extrabold text-slate-900">{skill.score}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          skill.score >= 80 ? 'bg-emerald-500' : skill.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(5, skill.score)}%` }}
                      />
                    </div>
                  </div>

                  {/* Evidence Breakdown Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Assessment</span>
                      <span className="text-xs font-bold text-slate-800">
                        {skill.evidence?.assessment_score !== null ? `${skill.evidence.assessment_score}%` : 'N/A'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Quiz Accuracy</span>
                      <span className="text-xs font-bold text-slate-800">
                        {skill.evidence?.recent_quiz_accuracy !== null ? `${skill.evidence.recent_quiz_accuracy}%` : 'N/A'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Mistakes</span>
                      <span className={`text-xs font-bold ${skill.evidence?.mistake_count > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {skill.evidence?.mistake_count || 0}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                    {skill.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Learning Activity Timeline */}
          {twin.recent_activity?.length > 0 && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-4 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-brand-600" />
                <span>Recent Learning Activity Log</span>
              </h2>

              <div className="space-y-2.5">
                {twin.recent_activity.map((act, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-100 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-xl ${
                          act.type === 'assessment'
                            ? 'bg-indigo-100 text-indigo-700'
                            : act.type === 'quiz'
                            ? 'bg-purple-100 text-purple-700'
                            : act.type === 'mistake'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {act.type === 'assessment' ? (
                          <Target className="w-4 h-4" />
                        ) : act.type === 'quiz' ? (
                          <BookOpen className="w-4 h-4" />
                        ) : act.type === 'mistake' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{act.title}</p>
                        <p className="text-[11px] text-slate-500">{act.subtitle}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {act.score_or_status && (
                        <span className="text-xs font-extrabold text-slate-900">{act.score_or_status}</span>
                      )}
                      <p className="text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer footer */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 flex items-center space-x-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{twin.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
};
