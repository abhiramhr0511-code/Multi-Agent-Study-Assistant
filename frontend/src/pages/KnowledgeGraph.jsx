import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { learningTwinAPI } from '../services/api';
import {
  Network,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
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
  Map,
  Layers,
  Compass,
  FileText,
  X,
  Filter,
  Eye,
  ListTree
} from 'lucide-react';

export const KnowledgeGraph = () => {
  const navigate = useNavigate();
  const [twin, setTwin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [viewMode, setViewMode] = useState('graph'); // 'graph' or 'tree'

  // Graph Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const fetchTwinData = async () => {
    setLoading(true);
    try {
      const data = await learningTwinAPI.get();
      setTwin(data);
      if (data?.skills?.length > 0) {
        setSelectedTopic(data.skills[0]);
      }
    } catch (err) {
      console.error('Failed to load Knowledge Graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTwinData();
  }, []);

  // Group skills by subject
  const subjectsMap = useMemo(() => {
    if (!twin?.skills) return {};
    const map = {};
    twin.skills.forEach((skill) => {
      const subj = skill.subject || twin.primary_subject || 'General Studies';
      if (!map[subj]) map[subj] = [];
      map[subj].push(skill);
    });
    return map;
  }, [twin]);

  const subjectList = useMemo(() => {
    return Object.keys(subjectsMap);
  }, [subjectsMap]);

  // Filter skills based on subject filter and search query
  const filteredSkills = useMemo(() => {
    if (!twin?.skills) return [];
    return twin.skills.filter((skill) => {
      const subj = skill.subject || twin.primary_subject || 'General Studies';
      const matchesSubject = selectedSubject === 'ALL' || subj === selectedSubject;
      const matchesSearch = !searchQuery || 
        skill.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subj.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSubject && matchesSearch;
    });
  }, [twin, selectedSubject, searchQuery]);

  // Group filtered skills for tree rendering
  const filteredSubjectsMap = useMemo(() => {
    const map = {};
    filteredSkills.forEach((skill) => {
      const subj = skill.subject || twin.primary_subject || 'General Studies';
      if (!map[subj]) map[subj] = [];
      map[subj].push(skill);
    });
    return map;
  }, [filteredSkills, twin]);

  // Calculate layout coordinates for SVG Graph
  const graphLayout = useMemo(() => {
    const nodes = [];
    const links = [];
    const subjects = Object.keys(filteredSubjectsMap);

    if (subjects.length === 0) return { nodes: [], links: [] };

    const centerX = 450;
    const centerY = 320;

    subjects.forEach((subj, sIdx) => {
      const subjAngle = (sIdx / subjects.length) * 2 * Math.PI - Math.PI / 2;
      const subjRadius = subjects.length > 1 ? 160 : 0;
      const subjX = centerX + subjRadius * Math.cos(subjAngle);
      const subjY = centerY + subjRadius * Math.sin(subjAngle);

      const subjNodeId = `subj-${sIdx}`;
      nodes.push({
        id: subjNodeId,
        type: 'subject',
        label: subj,
        x: subjX,
        y: subjY,
        skillsCount: filteredSubjectsMap[subj].length
      });

      const topicList = filteredSubjectsMap[subj];
      const count = topicList.length;

      topicList.forEach((skill, tIdx) => {
        let topicX, topicY;
        if (subjects.length === 1) {
          const angle = (tIdx / count) * 2 * Math.PI - Math.PI / 2;
          const radius = 190 + (tIdx % 2) * 35;
          topicX = centerX + radius * Math.cos(angle);
          topicY = centerY + radius * Math.sin(angle);
        } else {
          const spreadAngle = Math.PI * 0.9;
          const startAngle = subjAngle - spreadAngle / 2;
          const angle = startAngle + (tIdx / Math.max(1, count - 1)) * spreadAngle;
          const radius = 130 + (tIdx % 2) * 25;
          topicX = subjX + radius * Math.cos(angle);
          topicY = subjY + radius * Math.sin(angle);
        }

        const topicNodeId = `topic-${skill.topic}`;
        nodes.push({
          id: topicNodeId,
          type: 'topic',
          label: skill.topic,
          skill: skill,
          x: topicX,
          y: topicY
        });

        links.push({
          id: `link-${subjNodeId}-${topicNodeId}`,
          source: { x: subjX, y: subjY },
          target: { x: topicX, y: topicY },
          mastery: skill.mastery
        });
      });
    });

    return { nodes, links };
  }, [filteredSubjectsMap]);

  // Pan & Zoom Event Handlers
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    // Only intercept and zoom if holding Ctrl or Meta key, otherwise allow normal vertical page scrolling
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((prev) => Math.min(2.5, Math.max(0.5, prev * zoomFactor)));
    }
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Helper Badge Renderers
  const getMasteryColor = (mastery) => {
    switch (mastery) {
      case 'Strong':
        return {
          bg: '#ecfdf5',
          border: '#10b981',
          text: '#065f46',
          dot: '#10b981',
          shadow: 'rgba(16, 185, 129, 0.25)'
        };
      case 'Moderate':
        return {
          bg: '#fffbeb',
          border: '#f59e0b',
          text: '#92400e',
          dot: '#f59e0b',
          shadow: 'rgba(245, 158, 11, 0.25)'
        };
      default:
        return {
          bg: '#fff1f2',
          border: '#f43f5e',
          text: '#9f1239',
          dot: '#f43f5e',
          shadow: 'rgba(244, 63, 94, 0.25)'
        };
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <Network className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">Interactive Knowledge Graph</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold uppercase tracking-wider">
                Twin Graph
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Explore subject-to-topic relationship hierarchies with live competency scores, mastery levels, and trends.
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Refresh */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                viewMode === 'graph' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Interactive Graph</span>
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                viewMode === 'tree' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>Tree Hierarchy</span>
            </button>
          </div>

          <button
            onClick={fetchTwinData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs cursor-pointer"
            title="Refresh Knowledge Graph"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Constructing Knowledge Graph from Learning Twin...</p>
        </div>
      ) : !twin?.has_data || twin?.skills?.length === 0 ? (
        /* Empty State */
        <div className="glass-panel p-10 rounded-3xl border border-slate-200/80 text-center space-y-6 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <Network className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-base font-bold text-slate-900">Knowledge Graph is not available yet</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Complete a Skill Assessment to build your Knowledge Graph and track topic mastery relationships.
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
        <div className="space-y-5">
          {/* Controls Bar: Subject Filters, Search, and Legend */}
          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics or subjects..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Subject Selector Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Subject:</span>
              <button
                onClick={() => setSelectedSubject('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedSubject === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                All Subjects ({twin.skills.length})
              </button>
              {subjectList.map((subj) => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedSubject === subj
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {subj} ({subjectsMap[subj].length})
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-3 text-xs font-semibold text-slate-600">
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Strong</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Moderate</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Needs Attention</span>
              </div>
            </div>
          </div>

          {/* Main Content Area: Graph/Tree Canvas on Left + Topic Inspection Card on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* View Area (8 Cols) */}
            <div className="lg:col-span-8 space-y-4">
              {viewMode === 'graph' ? (
                /* Interactive SVG Graph Canvas */
                <div
                  className="relative glass-panel rounded-3xl border border-slate-200/80 bg-slate-900/[0.02] overflow-hidden shadow-xs select-none"
                  style={{ height: '620px' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                >
                  {/* Floating Zoom & Pan Controls */}
                  <div className="absolute top-4 right-4 z-10 flex flex-col space-y-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-md">
                    <button
                      onClick={() => setZoom((prev) => Math.min(2.5, prev + 0.15))}
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.15))}
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleResetView}
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Reset View"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <div className="text-[10px] font-extrabold text-slate-400 text-center py-0.5">
                      {Math.round(zoom * 100)}%
                    </div>
                  </div>

                  {/* SVG Canvas */}
                  <svg
                    ref={svgRef}
                    className="w-full h-full cursor-grab active:cursor-grabbing"
                    viewBox="0 0 900 640"
                  >
                    <defs>
                      <pattern id="graph-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="0.75" />
                      </pattern>
                      <filter id="glow-strong" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(16, 185, 129, 0.35)" />
                      </filter>
                      <filter id="glow-moderate" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(245, 158, 11, 0.35)" />
                      </filter>
                      <filter id="glow-weak" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(244, 63, 94, 0.35)" />
                      </filter>
                    </defs>

                    <rect width="100%" height="100%" fill="url(#graph-grid)" />

                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                      {/* Connection Links */}
                      {graphLayout.links.map((link) => {
                        const midX = (link.source.x + link.target.x) / 2;
                        const pathD = `M ${link.source.x} ${link.source.y} Q ${midX} ${link.source.y} ${link.target.x} ${link.target.y}`;
                        const color = getMasteryColor(link.mastery);

                        return (
                          <path
                            key={link.id}
                            d={pathD}
                            fill="none"
                            stroke={color.border}
                            strokeWidth="2"
                            strokeDasharray={link.mastery === 'Weak' ? '4,4' : 'none'}
                            strokeOpacity="0.6"
                          />
                        );
                      })}

                      {/* Nodes */}
                      {graphLayout.nodes.map((node) => {
                        if (node.type === 'subject') {
                          return (
                            <g
                              key={node.id}
                              transform={`translate(${node.x}, ${node.y})`}
                              className="cursor-pointer"
                            >
                              <circle
                                r="46"
                                fill="#4f46e5"
                                stroke="#c7d2fe"
                                strokeWidth="4"
                                className="transition-transform hover:scale-105"
                                style={{ filter: 'drop-shadow(0 8px 16px rgba(79, 70, 229, 0.3))' }}
                              />
                              <text
                                textAnchor="middle"
                                dy="-6"
                                fill="#ffffff"
                                fontSize="12"
                                fontWeight="bold"
                              >
                                {node.label.length > 14 ? `${node.label.slice(0, 13)}...` : node.label}
                              </text>
                              <text
                                textAnchor="middle"
                                dy="14"
                                fill="#c7d2fe"
                                fontSize="10"
                                fontWeight="bold"
                              >
                                {node.skillsCount} Topics
                              </text>
                            </g>
                          );
                        }

                        // Topic Leaf Node
                        const isSelected = selectedTopic?.topic === node.skill.topic;
                        const colors = getMasteryColor(node.skill.mastery);
                        const filterId =
                          node.skill.mastery === 'Strong'
                            ? 'url(#glow-strong)'
                            : node.skill.mastery === 'Moderate'
                            ? 'url(#glow-moderate)'
                            : 'url(#glow-weak)';

                        return (
                          <g
                            key={node.id}
                            transform={`translate(${node.x}, ${node.y})`}
                            onClick={() => setSelectedTopic(node.skill)}
                            className="cursor-pointer"
                          >
                            {isSelected && (
                              <circle
                                r="36"
                                fill="none"
                                stroke="#4f46e5"
                                strokeWidth="2.5"
                                strokeDasharray="3,3"
                                className="animate-spin"
                                style={{ transformOrigin: '0 0', animationDuration: '8s' }}
                              />
                            )}

                            <circle
                              r="28"
                              fill={colors.bg}
                              stroke={colors.border}
                              strokeWidth={isSelected ? '3' : '2'}
                              filter={isSelected ? filterId : undefined}
                              className="transition-all hover:scale-110"
                            />

                            <text
                              textAnchor="middle"
                              dy="4"
                              fill={colors.text}
                              fontSize="12"
                              fontWeight="800"
                            >
                              {Math.round(node.skill.score)}%
                            </text>

                            <g transform="translate(0, 38)">
                              <rect
                                x={-Math.min(70, Math.max(35, node.label.length * 3.8))}
                                y="-10"
                                width={Math.min(140, Math.max(70, node.label.length * 7.6))}
                                height="20"
                                rx="10"
                                fill="#ffffff"
                                stroke={isSelected ? '#4f46e5' : '#e2e8f0'}
                                strokeWidth={isSelected ? '1.5' : '1'}
                                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.05))"
                              />
                              <text
                                textAnchor="middle"
                                dy="4"
                                fill="#1e293b"
                                fontSize="10"
                                fontWeight="bold"
                              >
                                {node.label.length > 18 ? `${node.label.slice(0, 16)}...` : node.label}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                </div>
              ) : (
                /* Structured Tree Hierarchy View */
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-6 shadow-xs min-h-[580px]">
                  <div className="flex items-center space-x-2">
                    <ListTree className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-base font-bold text-slate-900">Subject-to-Topic Hierarchy</h2>
                  </div>

                  <div className="space-y-6 font-mono text-xs">
                    {Object.keys(filteredSubjectsMap).map((subj) => (
                      <div key={subj} className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
                        <div className="flex items-center space-x-2 text-sm font-extrabold text-indigo-900 font-sans">
                          <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                            <Layers className="w-4 h-4" />
                          </span>
                          <span>{subj}</span>
                        </div>

                        <div className="pl-4 space-y-2 border-l-2 border-indigo-200 font-sans">
                          {filteredSubjectsMap[subj].map((skill, sIdx) => {
                            const isLast = sIdx === filteredSubjectsMap[subj].length - 1;
                            const isSelected = selectedTopic?.topic === skill.topic;
                            return (
                              <div
                                key={skill.topic}
                                onClick={() => setSelectedTopic(skill)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-50 border-indigo-300 shadow-xs'
                                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-slate-400 font-mono">{isLast ? '└──' : '├──'}</span>
                                  <span className="font-bold text-slate-900">{skill.topic}</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                      skill.mastery === 'Strong'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : skill.mastery === 'Moderate'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {skill.mastery === 'Strong' ? '🟢 Strong' : skill.mastery === 'Moderate' ? '🟡 Moderate' : '🔴 Needs Attention'}
                                  </span>
                                  <span className="text-xs font-extrabold text-slate-700">{skill.score}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Topic Details Inspection Drawer / Sidebar (4 Cols) */}
            <div className="lg:col-span-4">
              {selectedTopic ? (
                <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/40 via-white to-white space-y-5 shadow-xs sticky top-4">
                  {/* Topic Title & Mastery */}
                  <div className="space-y-1.5 border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                        {selectedTopic.subject || 'Topic Analysis'}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            selectedTopic.mastery === 'Strong'
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedTopic.mastery === 'Moderate'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {selectedTopic.mastery}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedTopic.topic}</h2>
                  </div>

                  {/* Competency Score & Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Competency Mastery</span>
                      <span className="text-lg font-extrabold text-slate-900">{selectedTopic.score}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          selectedTopic.score >= 80 ? 'bg-emerald-500' : selectedTopic.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(5, selectedTopic.score)}%` }}
                      />
                    </div>
                  </div>

                  {/* Performance Indicators: Trend & Priority */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Trend</span>
                      <div className="flex items-center justify-center space-x-1 font-bold text-slate-800">
                        {selectedTopic.trend === 'Improving' ? (
                          <>
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Improving</span>
                          </>
                        ) : selectedTopic.trend === 'Declining' ? (
                          <>
                            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                            <span className="text-rose-700">Declining</span>
                          </>
                        ) : selectedTopic.trend === 'Stable' ? (
                          <>
                            <Minus className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-blue-700">Stable</span>
                          </>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Insufficient Data</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Priority</span>
                      <span
                        className={`font-bold ${
                          selectedTopic.priority === 'High'
                            ? 'text-rose-600'
                            : selectedTopic.priority === 'Medium'
                            ? 'text-amber-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {selectedTopic.priority} Priority
                      </span>
                    </div>
                  </div>

                  {/* Evidence Metrics Breakdown */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2.5 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Learning Evidence</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[9px] uppercase text-slate-400 font-bold block">Assessment</span>
                        <span className="text-xs font-bold text-slate-800">
                          {selectedTopic.evidence?.assessment_score !== null ? `${selectedTopic.evidence.assessment_score}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[9px] uppercase text-slate-400 font-bold block">Quiz Acc.</span>
                        <span className="text-xs font-bold text-slate-800">
                          {selectedTopic.evidence?.recent_quiz_accuracy !== null ? `${selectedTopic.evidence.recent_quiz_accuracy}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[9px] uppercase text-slate-400 font-bold block">Mistakes</span>
                        <span className={`text-xs font-bold ${selectedTopic.evidence?.mistake_count > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                          {selectedTopic.evidence?.mistake_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic Reason */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 text-xs text-slate-700 leading-relaxed space-y-1">
                    <span className="font-bold text-indigo-950 block">Diagnostic Evidence:</span>
                    <p>{selectedTopic.reason}</p>
                  </div>

                  {/* Action Triggers */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => navigate('/quiz')}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-500/20 cursor-pointer transition-all"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Practice Topic in Quiz</span>
                    </button>

                    <button
                      onClick={() => navigate('/roadmap')}
                      className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-2xs transition-all"
                    >
                      <Map className="w-4 h-4 text-emerald-600" />
                      <span>View in Roadmap</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-8 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <Target className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Select a Topic Node</h3>
                  <p className="text-xs text-slate-400">
                    Click any node in the Knowledge Graph or Tree view to inspect its evidence and metrics.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
