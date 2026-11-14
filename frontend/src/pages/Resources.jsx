import React, { useState, useEffect } from 'react';
import { resourceAPI } from '../services/api';
import { Compass, Search, ExternalLink, BookOpen, Video, Code, FileText, AlertCircle, RefreshCw, CheckCircle2, Layers } from 'lucide-react';

export const Resources = () => {
  const [topic, setTopic] = useState('Python');
  const [skill, setSkill] = useState('Data Structures');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [learningPreference, setLearningPreference] = useState('Visual');

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchResources = async (searchTopic = topic, searchSkill = skill, searchDiff = difficulty, searchPref = learningPreference) => {
    setLoading(true);
    setError('');
    try {
      const data = await resourceAPI.search(searchTopic, searchSkill, '', searchDiff, searchPref);
      setResources(data.resources || []);
    } catch (err) {
      console.error("Resource fetch error:", err);
      setError('Unable to fetch live web search results. Displaying curated resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchResources(topic, skill, difficulty, learningPreference);
  };

  const getResourceIcon = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('video') || t.includes('youtube') || t.includes('course')) {
      return <Video className="w-4 h-4 text-purple-600" />;
    }
    if (t.includes('code') || t.includes('interactive') || t.includes('github') || t.includes('sandbox')) {
      return <Code className="w-4 h-4 text-emerald-600" />;
    }
    if (t.includes('tutorial') || t.includes('roadmap') || t.includes('guide')) {
      return <BookOpen className="w-4 h-4 text-amber-600" />;
    }
    if (t.includes('practice') || t.includes('platform')) {
      return <CheckCircle2 className="w-4 h-4 text-indigo-600" />;
    }
    return <FileText className="w-4 h-4 text-sky-600" />;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-sky-100 text-sky-600">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Curated Resource Finder</h1>
            <p className="text-xs text-slate-500">Discover comprehensive documentation, video courses, coding sandboxes, and guides</p>
          </div>
        </div>
      </div>

      {/* Search Bar & Controls */}
      <form onSubmit={handleSearch} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Topic</label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Python, React, Algorithms"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Sub-Skill / Focus (Optional)</label>
            <input
              type="text"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="e.g. Data Structures, State Management"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Difficulty Level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white font-medium"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-sky-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Find Resources</span>
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Results Header */}
      {!loading && resources.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Discovered {resources.length} Verified Resources for &quot;{topic}{skill ? ` - ${skill}` : ''}&quot;
            </h2>
          </div>
        </div>
      )}

      {/* Loading Grid */}
      {loading && (
        <div className="text-center py-16 space-y-3 glass-panel rounded-3xl border border-slate-100">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-semibold">Finding learning resources for {topic}...</p>
          <p className="text-[11px] text-slate-400">Curating documentation, video lectures, and code practice modules</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && resources.length === 0 && !error && (
        <div className="text-center py-16 space-y-3 glass-panel rounded-3xl border border-slate-100">
          <Compass className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-600 font-semibold">No resources found for &quot;{topic}&quot;</p>
          <p className="text-xs text-slate-400">Try searching for a broader programming language, framework, or concept.</p>
        </div>
      )}

      {/* Resource Cards Grid */}
      {!loading && resources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resources.map((res, i) => (
            <div key={i} className="glass-card p-6 rounded-3xl border border-slate-100 flex flex-col justify-between space-y-4 shadow-xs hover:border-sky-200 transition-all">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
                    {getResourceIcon(res.type)}
                    <span>{res.type}</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    {res.topic && (
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-semibold">
                        {res.topic}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{res.difficulty}</span>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{res.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{res.description}</p>
              </div>

              <a
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 transition-all text-xs font-bold"
              >
                <span>Access Resource</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
