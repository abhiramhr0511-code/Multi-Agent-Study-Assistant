import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roadmapAPI } from '../services/api';
import {
  Map,
  Sparkles,
  Target,
  Compass,
  BookOpen,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Info,
  Sliders
} from 'lucide-react';

export const LearningRoadmap = () => {
  const navigate = useNavigate();
  const [goal, setGoal] = useState('Machine Learning & AI');
  const [currentSkill, setCurrentSkill] = useState('Beginner');
  const [targetSkill, setTargetSkill] = useState('Advanced Practitioner');
  const [availableTime, setAvailableTime] = useState('5 hours/week');
  const [learningStyle, setLearningStyle] = useState('Visual & Hands-on');
  const [useAssessment, setUseAssessment] = useState(true);

  // Latest Assessment State
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [loadingAssessment, setLoadingAssessment] = useState(true);

  // Roadmap State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roadmapData, setRoadmapData] = useState(null);

  useEffect(() => {
    fetchLatestAssessment();
  }, []);

  const fetchLatestAssessment = async () => {
    try {
      setLoadingAssessment(true);
      const data = await roadmapAPI.getLatestAssessment();
      if (data && data.has_assessment) {
        setLatestAssessment(data);
        // Pre-fill goal if empty
        if (!goal && data.subject) {
          setGoal(data.subject);
        }
      }
    } catch (err) {
      console.warn('Could not retrieve assessment summary for roadmap:', err);
    } finally {
      setLoadingAssessment(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await roadmapAPI.generate(
        goal,
        currentSkill,
        targetSkill,
        availableTime,
        learningStyle,
        useAssessment
      );
      setRoadmapData(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Roadmap generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to render styled markdown text with priority badges
  const renderFormattedMarkdown = (markdownText) => {
    if (!markdownText) return null;

    const lines = markdownText.split('\n');
    return lines.map((line, idx) => {
      // Highlight headings
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-xl sm:text-2xl font-black text-slate-900 pt-2 pb-1 border-b border-slate-200/80">
            {line.replace('# ', '')}
          </h1>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg sm:text-xl font-extrabold text-slate-900 pt-4 pb-1 flex items-center gap-2">
            {line.replace('## ', '')}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        const text = line.replace('### ', '');
        const hasHigh = text.includes('[HIGH PRIORITY]') || text.includes('HIGH PRIORITY');
        const hasMed = text.includes('[MEDIUM PRIORITY]') || text.includes('MEDIUM PRIORITY');
        const hasMaint = text.includes('[MAINTENANCE]') || text.includes('MAINTENANCE');

        return (
          <div key={idx} className="pt-4 pb-1">
            <h3 className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-2">
              <span>{text.replace(/`?\[(HIGH PRIORITY|MEDIUM PRIORITY|MAINTENANCE)\]`?/g, '').trim()}</span>
              {hasHigh && (
                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                  High Priority (Skill Gap)
                </span>
              )}
              {hasMed && (
                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                  Medium Priority (Reinforce)
                </span>
              )}
              {hasMaint && (
                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Maintenance (Review)
                </span>
              )}
            </h3>
          </div>
        );
      }

      // Format bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().substring(2);
        return (
          <div key={idx} className="flex items-start space-x-2 pl-2 text-xs sm:text-sm text-slate-700">
            <span className="text-emerald-600 font-bold mt-0.5">•</span>
            <div className="flex-1 leading-relaxed">
              {bulletText.split('**').map((part, pIdx) =>
                pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-slate-900">{part}</strong> : part
              )}
            </div>
          </div>
        );
      }

      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      // Standard paragraph
      return (
        <p key={idx} className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          {line.split('**').map((part, pIdx) =>
            pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-slate-900">{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs">
            <Map className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Personalized Learning Roadmap
              <span className="text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200">
                Adaptive
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Custom milestone timeline prioritizing your weak skills and accelerating strong competencies
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

      {/* ─── SECTION: SKILL ASSESSMENT PERSONALIZATION BANNER ─── */}
      {!loadingAssessment && (
        <>
          {latestAssessment?.has_assessment ? (
            /* Student HAS a completed assessment */
            <div className="glass-panel p-6 rounded-3xl border border-indigo-100/90 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/40 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      Personalized from your Skill Assessment
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-extrabold">
                        {latestAssessment.subject}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Evaluated on {latestAssessment.created_at ? new Date(latestAssessment.created_at).toLocaleDateString() : 'Recent'} — Overall Score: {latestAssessment.percentage}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAssessment}
                      onChange={(e) => setUseAssessment(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Apply Skill Insights</span>
                  </label>
                  <button
                    onClick={() => navigate('/skill-assessment')}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    Retake
                  </button>
                </div>
              </div>

              {/* Assessment Breakdown Chips */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Needs Attention (Weak) */}
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-rose-800 font-bold uppercase text-[10px] tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Needs Attention (High Priority)</span>
                  </div>
                  {latestAssessment.weak_topics?.length > 0 ? (
                    <div className="space-y-1">
                      {latestAssessment.weak_topics.map((t, idx) => {
                        const score = latestAssessment.topic_breakdown?.find((tb) => tb.topic === t)?.percentage;
                        return (
                          <div key={idx} className="font-bold text-rose-900 text-xs flex items-center justify-between">
                            <span>⚠ {t}</span>
                            <span className="text-[11px] font-extrabold">{score !== undefined ? `${score}%` : 'Weak'}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No critical gaps identified.</p>
                  )}
                </div>

                {/* Moderate */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-amber-800 font-bold uppercase text-[10px] tracking-wider">
                    <Sliders className="w-3.5 h-3.5 text-amber-600" />
                    <span>Moderate (Reinforcement)</span>
                  </div>
                  {latestAssessment.moderate_topics?.length > 0 ? (
                    <div className="space-y-1">
                      {latestAssessment.moderate_topics.map((t, idx) => {
                        const score = latestAssessment.topic_breakdown?.find((tb) => tb.topic === t)?.percentage;
                        return (
                          <div key={idx} className="font-bold text-amber-900 text-xs flex items-center justify-between">
                            <span>• {t}</span>
                            <span className="text-[11px] font-extrabold">{score !== undefined ? `${score}%` : 'Moderate'}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No moderate topics.</p>
                  )}
                </div>

                {/* Strong */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-emerald-800 font-bold uppercase text-[10px] tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Strong (Maintenance)</span>
                  </div>
                  {latestAssessment.strong_topics?.length > 0 ? (
                    <div className="space-y-1">
                      {latestAssessment.strong_topics.map((t, idx) => {
                        const score = latestAssessment.topic_breakdown?.find((tb) => tb.topic === t)?.percentage;
                        return (
                          <div key={idx} className="font-bold text-emerald-900 text-xs flex items-center justify-between">
                            <span>✓ {t}</span>
                            <span className="text-[11px] font-extrabold">{score !== undefined ? `${score}%` : 'Strong'}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No strong topics recorded.</p>
                  )}
                </div>
              </div>

              {/* Personalization Explanation */}
              <div className="p-3 rounded-xl bg-white border border-indigo-100 text-xs text-slate-600 flex items-start space-x-2">
                <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong className="text-slate-800">Why this roadmap is personalized: </strong>
                  {latestAssessment.weak_topics?.length > 0
                    ? `Your roadmap prioritizes ${latestAssessment.weak_topics.join(' and ')} because these are currently your weakest assessed areas.`
                    : 'Your roadmap builds directly on your demonstrated strong foundational proficiencies.'}
                </p>
              </div>
            </div>
          ) : (
            /* Student has NOT taken any assessment yet (NO ASSESSMENT CASE) */
            <div className="p-5 rounded-3xl bg-slate-50/90 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 flex-shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Personalize Your Roadmap with Skill Gaps</h3>
                  <p className="text-[11px] text-slate-500">
                    Complete a Skill Gap Assessment to make your roadmap more personalized to your specific strengths and weaknesses.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/skill-assessment')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>Take Skill Assessment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Input Form */}
      <form onSubmit={handleGenerate} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-4 shadow-xs">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Learning Goal / Subject</label>
            <input
              type="text"
              required
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Data Science, Web Development, Machine Learning"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Current Skill Level</label>
            <select
              value={currentSkill}
              onChange={(e) => setCurrentSkill(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white font-medium"
            >
              <option value="Complete Beginner">Complete Beginner</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Target Mastery Skill</label>
            <select
              value={targetSkill}
              onChange={(e) => setTargetSkill(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white font-medium"
            >
              <option value="Intermediate">Intermediate Competency</option>
              <option value="Advanced Practitioner">Advanced Practitioner</option>
              <option value="Mastery / Job Ready">Mastery / Job Ready</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Available Study Time</label>
            <input
              type="text"
              value={availableTime}
              onChange={(e) => setAvailableTime(e.target.value)}
              placeholder="e.g. 5 hours/week"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Preferred Learning Style</label>
            <select
              value={learningStyle}
              onChange={(e) => setLearningStyle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white font-medium"
            >
              <option value="Visual & Hands-on">Visual & Hands-on</option>
              <option value="Reading & Theoretical">Reading & Theoretical</option>
              <option value="Project-based">Project-based</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{loading ? 'Building Path...' : 'Generate Roadmap'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Loading Skeleton */}
      {loading && (
        <div className="glass-panel p-12 rounded-3xl border border-slate-100 text-center space-y-4 max-w-md mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
            <Map className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Designing Personal Learning Path...</h3>
          <p className="text-xs text-slate-500">
            {useAssessment && latestAssessment?.has_assessment
              ? 'Analyzing assessed skill gaps and weighting milestone priorities.'
              : 'Structuring phase milestones based on your targets.'}
          </p>
        </div>
      )}

      {/* Roadmap Output */}
      {roadmapData && !loading && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-6 shadow-xs animate-fadeIn">
          {/* Output Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Learning Roadmap for {roadmapData.topic}</h2>
              <p className="text-xs text-slate-500 font-medium">Customized timeline based on {availableTime} commit level</p>
            </div>
            
            <div className="flex items-center space-x-2">
              {roadmapData.personalization?.personalized ? (
                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Skill-Gap Personalized</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-extrabold">
                  Standard Track
                </span>
              )}
            </div>
          </div>

          {/* Priority Legend if Personalized */}
          {roadmapData.personalization?.personalized && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Roadmap Priority Legend</span>
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold border border-rose-200">
                  HIGH PRIORITY: Weak Skills (Early & Deep Milestones)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  MEDIUM PRIORITY: Moderate Skills (Reinforcement)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  MAINTENANCE: Strong Skills (Accelerated Review)
                </span>
              </div>
              {roadmapData.personalization?.explanation && (
                <p className="text-[11px] text-slate-500 pt-1">
                  {roadmapData.personalization.explanation}
                </p>
              )}
            </div>
          )}

          {/* Formatted Content */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-4 shadow-2xs">
            {renderFormattedMarkdown(roadmapData.roadmap_markdown)}
          </div>
        </div>
      )}
    </div>
  );
};
