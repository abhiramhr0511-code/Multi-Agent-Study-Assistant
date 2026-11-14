import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { revisionAPI } from '../services/api';
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  RefreshCw,
  Target,
  ArrowRight,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ThumbsUp,
  Flame
} from 'lucide-react';

export const RevisionScheduler = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('due'); // 'due', 'upcoming', 'history'
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewingTopic, setReviewingTopic] = useState(null); // topic being marked as reviewed
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState(null);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const data = await revisionAPI.getSchedule();
      setSchedule(data);
    } catch (err) {
      console.error('Failed to load revision schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleMarkReviewed = async (topic, subject, easeRating = 'Good') => {
    setSubmittingReview(true);
    try {
      const record = await revisionAPI.markReviewed(topic, subject, easeRating);
      setReviewFeedback(`Marked "${topic}" as reviewed! Next review in ${record.interval_days} day(s) on ${record.next_due_date}.`);
      setTimeout(() => setReviewFeedback(null), 5000);
      setReviewingTopic(null);
      await fetchSchedule();
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filter items based on active tab, search query, and priority filter
  const displayedItems = useMemo(() => {
    if (!schedule) return [];
    let items = [];
    if (activeTab === 'due') {
      items = schedule.items_due_today || [];
    } else if (activeTab === 'upcoming') {
      items = schedule.items_upcoming || [];
    } else {
      items = schedule.recently_reviewed || [];
    }

    return items.filter((item) => {
      const matchesPriority = priorityFilter === 'ALL' || item.priority === priorityFilter;
      const matchesSearch = !searchQuery ||
        item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPriority && matchesSearch;
    });
  }, [schedule, activeTab, priorityFilter, searchQuery]);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>High Priority</span>
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
            <span>Medium Priority</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase">
            <span>Low Priority</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Overdue':
        return <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold">OVERDUE</span>;
      case 'Due Today':
        return <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold">DUE TODAY</span>;
      case 'Reviewed':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">REVIEWED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-extrabold">UPCOMING</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-100/80 bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <CalendarClock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">Personalized Revision Scheduler</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold uppercase tracking-wider">
                Spaced Repetition
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated review calendar prioritizing weak topics, recurring conceptual mistakes, and spaced intervals.
            </p>
          </div>
        </div>

        <button
          onClick={fetchSchedule}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-400'}`} />
          <span>Refresh Schedule</span>
        </button>
      </div>

      {/* Review Feedback Alert */}
      {reviewFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{reviewFeedback}</span>
          </div>
          <button onClick={() => setReviewFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Calculating personalized revision intervals...</p>
        </div>
      ) : !schedule?.has_data ? (
        /* Empty State */
        <div className="glass-panel p-10 rounded-3xl border border-slate-200/80 text-center space-y-6 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <CalendarClock className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-base font-bold text-slate-900">No revision schedule available yet</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Complete a Skill Assessment or Quiz to generate your personalized spaced-repetition revision calendar.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/skill-assessment')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center space-x-2 shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>Take Skill Assessment</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metric Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Due Today</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-3xl font-extrabold text-amber-600">{schedule.due_today_count}</p>
              <p className="text-[10px] text-slate-400 font-medium">Topics ready for active recall</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Overdue Topics</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-3xl font-extrabold text-rose-600">{schedule.overdue_count}</p>
              <p className="text-[10px] text-rose-600/90 font-medium">Critical focus needed</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Upcoming Scheduled</span>
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-3xl font-extrabold text-indigo-600">{schedule.upcoming_count}</p>
              <p className="text-[10px] text-slate-400 font-medium">In spaced retention cycle</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Total Retained</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-600">{schedule.total_reviewed_count}</p>
              <p className="text-[10px] text-slate-400 font-medium">Topics marked as reviewed</p>
            </div>
          </div>

          {/* Controls Bar: Tabs, Filters, and Search */}
          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            {/* Tabs */}
            <div className="flex bg-slate-100/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('due')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'due'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Due Today</span>
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                  {schedule.due_today_count}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Upcoming</span>
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">
                  {schedule.upcoming_count}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Review History</span>
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                  {schedule.total_reviewed_count}
                </span>
              </button>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Priority Filters */}
              <div className="flex items-center space-x-1">
                {['ALL', 'High', 'Medium', 'Low'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      priorityFilter === p
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {p === 'ALL' ? 'All Priorities' : p}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter topics..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Revision Items List */}
          <div className="space-y-4">
            {displayedItems.length === 0 ? (
              <div className="glass-panel p-10 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {activeTab === 'due'
                    ? 'All caught up! No topics are due for review right now.'
                    : 'No matching revision items found.'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {activeTab === 'due'
                    ? 'Check the Upcoming schedule or take an adaptive quiz to identify new areas for practice.'
                    : 'Try clearing your search query or selecting a different filter.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedItems.map((item) => {
                  const isReviewing = reviewingTopic === item.topic;

                  return (
                    <div
                      key={item.id}
                      className="glass-card p-5 sm:p-6 rounded-3xl border border-slate-200/80 space-y-4 shadow-2xs hover:border-indigo-200 transition-all"
                    >
                      {/* Card Header: Topic, Subject, and Status Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {item.subject}
                          </span>
                          <h3 className="text-base font-bold text-slate-900">{item.topic}</h3>
                        </div>

                        <div className="flex flex-col items-end space-y-1">
                          {getStatusBadge(item.status)}
                          {getPriorityBadge(item.priority)}
                        </div>
                      </div>

                      {/* Reason Box */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 space-y-1 leading-relaxed">
                        <span className="font-bold text-slate-900 block">Why this is scheduled:</span>
                        <p>{item.reason}</p>
                      </div>

                      {/* Diagnostic Baseline & Spaced Interval Info */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs">
                          <span className="text-[9px] uppercase text-slate-400 font-bold block">Competency</span>
                          <span className="font-extrabold text-slate-800">{item.competency_score}%</span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs">
                          <span className="text-[9px] uppercase text-slate-400 font-bold block">Target Due</span>
                          <span className="font-bold text-slate-800">{item.recommended_revision_date}</span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs">
                          <span className="text-[9px] uppercase text-slate-400 font-bold block">Interval</span>
                          <span className="font-bold text-indigo-600">{item.interval_days} Day(s)</span>
                        </div>
                      </div>

                      {/* Action Triggers */}
                      <div className="pt-1 space-y-2">
                        {isReviewing ? (
                          /* Interactive Ease Selector for Spaced Repetition */
                          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2.5 animate-fadeIn">
                            <span className="text-[11px] font-bold text-indigo-950 block text-center">
                              How well did you recall this concept?
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                disabled={submittingReview}
                                onClick={() => handleMarkReviewed(item.topic, item.subject, 'Hard')}
                                className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold cursor-pointer transition-colors"
                              >
                                Hard (1d)
                              </button>
                              <button
                                disabled={submittingReview}
                                onClick={() => handleMarkReviewed(item.topic, item.subject, 'Good')}
                                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors"
                              >
                                Good (3d)
                              </button>
                              <button
                                disabled={submittingReview}
                                onClick={() => handleMarkReviewed(item.topic, item.subject, 'Easy')}
                                className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold cursor-pointer transition-colors"
                              >
                                Easy (7d)
                              </button>
                            </div>
                            <button
                              onClick={() => setReviewingTopic(null)}
                              className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer pt-0.5"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => navigate('/quiz')}
                              className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-500/20 cursor-pointer transition-all"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Practice Now</span>
                            </button>

                            <button
                              onClick={() => setReviewingTopic(item.topic)}
                              className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs transition-all"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Mark Reviewed</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
