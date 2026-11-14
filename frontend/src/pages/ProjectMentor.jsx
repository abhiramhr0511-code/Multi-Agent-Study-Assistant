import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import {
  FolderGit2,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Code2,
  Server,
  Database,
  Layers,
  Sparkles,
  Send,
  Trash2,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Rocket,
  ShieldCheck,
  CheckSquare,
  Terminal,
  ExternalLink,
  BookOpen,
  MessageSquare,
  X,
  Zap,
  LayoutGrid,
  Cpu
} from 'lucide-react';

export const ProjectMentor = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('phases'); // 'phases', 'architecture', 'checklists', 'chat'
  
  // New Project Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('Intermediate');
  const [timeline, setTimeline] = useState('4 Weeks');

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatBottomRef = useRef(null);

  // Phase collapse/expand state
  const [expandedPhases, setExpandedPhases] = useState({});

  const fetchProjects = async (selectId = null) => {
    setLoading(true);
    try {
      const res = await projectAPI.list();
      const list = res.projects || [];
      setProjects(list);
      if (list.length > 0) {
        if (selectId && list.some((p) => p.id === selectId)) {
          setSelectedProjectId(selectId);
        } else if (!selectedProjectId || !list.some((p) => p.id === selectedProjectId)) {
          setSelectedProjectId(list[0].id);
        }
      } else {
        setSelectedProjectId(null);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || null;

  // Auto-scroll chat to bottom when chat messages change
  useEffect(() => {
    if (activeTab === 'chat' || activeProject?.chat_messages) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeProject?.chat_messages, activeTab]);

  // Expand all phases by default when active project changes
  useEffect(() => {
    if (activeProject?.phases) {
      const initial = {};
      activeProject.phases.forEach((ph) => {
        initial[ph.id] = true;
      });
      setExpandedPhases(initial);
    }
  }, [activeProject?.id]);

  const togglePhase = (phaseId) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectTitle.trim() || !projectDesc.trim()) return;

    setGenerating(true);
    try {
      const techStack = techStackInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const newProj = await projectAPI.generate({
        title: projectTitle.trim(),
        description: projectDesc.trim(),
        tech_stack: techStack,
        goal: projectGoal.trim() || null,
        difficulty_level: difficultyLevel,
        timeline: timeline.trim() || null,
      });

      setShowNewModal(false);
      // Reset form
      setProjectTitle('');
      setProjectDesc('');
      setTechStackInput('');
      setProjectGoal('');
      setDifficultyLevel('Intermediate');
      setTimeline('4 Weeks');

      // Refresh and select new project
      await fetchProjects(newProj.id);
    } catch (err) {
      console.error('Failed to create project plan:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    if (!activeProject) return;

    // Optimistic update
    const updatedPhases = activeProject.phases.map((ph) => ({
      ...ph,
      tasks: ph.tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    }));

    // Calculate optimistic progress
    let total = 0;
    let done = 0;
    updatedPhases.forEach((p) => {
      p.tasks.forEach((t) => {
        total++;
        if (t.status === 'Completed') done++;
      });
    });
    const optimisticProgress = total > 0 ? Math.round((done / total) * 1000) / 10 : 0.0;

    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id
        ? { ...p, phases: updatedPhases, progress: optimisticProgress }
        : p
    );
    setProjects(updatedProjects);

    try {
      const savedProj = await projectAPI.updateTask(activeProject.id, taskId, newStatus);
      setProjects((prev) => prev.map((p) => (p.id === savedProj.id ? savedProj : p)));
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Revert by re-fetching
      fetchProjects(activeProject.id);
    }
  };

  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !activeProject || sendingChat) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setSendingChat(true);

    try {
      const updatedProj = await projectAPI.chat(activeProject.id, userMsg);
      setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)));
    } catch (err) {
      console.error('Failed to send message to AI mentor:', err);
    } finally {
      setSendingChat(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    try {
      await projectAPI.delete(projectId);
      await fetchProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleTemplateClick = (template) => {
    setProjectTitle(template.title);
    setProjectDesc(template.description);
    setTechStackInput(template.techStack);
    setProjectGoal(template.goal);
    setDifficultyLevel(template.difficulty);
    setTimeline(template.timeline);
    setShowNewModal(true);
  };

  const projectTemplates = [
    {
      title: 'Full-Stack E-Commerce Platform',
      description: 'Production-ready e-commerce store with product catalog, cart, checkout with Stripe, user authentication, and admin analytics dashboard.',
      techStack: 'React, FastAPI, PostgreSQL, Docker, Stripe',
      goal: 'Build comprehensive full-stack capstone project',
      difficulty: 'Intermediate',
      timeline: '4 Weeks',
    },
    {
      title: 'AI Document Search & Q&A Engine (RAG)',
      description: 'Intelligent document indexing and retrieval application using vector embeddings, local LLM bridge, semantic search, and citation verification.',
      techStack: 'Python, LangChain, ChromaDB, FastAPI, React',
      goal: 'Master vector databases and LLM orchestration',
      difficulty: 'Advanced',
      timeline: '3-4 Weeks',
    },
    {
      title: 'Real-Time Collaborative Kanban Board',
      description: 'Interactive project management tool with drag-and-drop task boards, live WebSocket multi-user sync, role-based access, and activity logs.',
      techStack: 'React, Node.js, WebSockets, MongoDB, TailwindCSS',
      goal: 'Learn real-time state synchronization and reactive UI',
      difficulty: 'Intermediate',
      timeline: '3 Weeks',
    },
    {
      title: 'Microservices URL Shortener & Analytics',
      description: 'Scalable link shortening service featuring high-throughput Redis caching, click analytics dashboard, QR code generator, and rate-limiting.',
      techStack: 'FastAPI, Redis, PostgreSQL, Chart.js, Docker',
      goal: 'Understand microservice caching and analytics pipeline',
      difficulty: 'Beginner',
      timeline: '2 Weeks',
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-100/80 bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <FolderGit2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">AI Project Mentor</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold uppercase tracking-wider">
                Project AI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Build production-grade software projects with AI-crafted roadmaps, phased task tracking, and an interactive engineering mentor.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>

          <button
            onClick={() => fetchProjects(selectedProjectId)}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs cursor-pointer"
            title="Refresh Projects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading your software projects...</p>
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-slate-200/80 text-center space-y-8 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <Rocket className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-slate-900">Start Your First Software Project</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Describe the project you want to build or pick a starter template below. The AI Mentor will architect the roadmap, break down phases, specify tasks, and provide ongoing code mentorship.
            </p>
          </div>

          {/* Quick Starter Templates */}
          <div className="max-w-4xl mx-auto space-y-3 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Popular Project Blueprints
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projectTemplates.map((tpl, idx) => (
                <div
                  key={idx}
                  onClick={() => handleTemplateClick(tpl)}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {tpl.title}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                      {tpl.difficulty}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{tpl.description}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-medium">
                    <span>{tpl.techStack}</span>
                    <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
                      Use Blueprint →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowNewModal(true)}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center space-x-2 shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Project Plan</span>
            </button>
          </div>
        </div>
      ) : (
        /* Main Project Workspace */
        <div className="space-y-6">
          {/* Project Switcher Bar */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {projects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => setSelectedProjectId(proj.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  proj.id === selectedProjectId
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>{proj.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    proj.id === selectedProjectId
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {proj.progress}%
                </span>
              </button>
            ))}
          </div>

          {activeProject && (
            <div className="space-y-6">
              {/* Project Hero / Overview Card */}
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-100 bg-gradient-to-r from-white via-indigo-50/20 to-purple-50/30 shadow-xs space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                        {activeProject.difficulty_level}
                      </span>
                      {activeProject.timeline && (
                        <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{activeProject.timeline}</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{activeProject.title}</h2>
                    <p className="text-xs text-slate-600 leading-relaxed">{activeProject.description}</p>
                  </div>

                  {/* Progress Ring / Gauge Box */}
                  <div className="flex items-center space-x-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs shrink-0">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Project Progress
                      </span>
                      <div className="text-2xl font-black text-slate-900 tracking-tight">
                        {activeProject.progress}%
                      </div>
                      <span className="text-[10px] text-indigo-600 font-semibold">
                        {activeProject.phases.reduce(
                          (acc, ph) => acc + ph.tasks.filter((t) => t.status === 'Completed').length,
                          0
                        )}{' '}
                        of {activeProject.phases.reduce((acc, ph) => acc + ph.tasks.length, 0)} tasks completed
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteProject(activeProject.id)}
                      className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stated Tech Stack Tags */}
                {activeProject.tech_stack?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Stack:</span>
                    {activeProject.tech_stack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${Math.max(3, activeProject.progress)}%` }}
                  />
                </div>
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('phases')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'phases'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Roadmap & Tasks ({activeProject.phases.length} Phases)</span>
                </button>

                <button
                  onClick={() => setActiveTab('architecture')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'architecture'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Architecture & Stack</span>
                </button>

                <button
                  onClick={() => setActiveTab('checklists')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'checklists'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Testing & Deployment</span>
                </button>

                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'chat'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>AI Mentor Chat ({activeProject.chat_messages?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: Roadmap & Development Phases */}
              {activeTab === 'phases' && (
                <div className="space-y-4">
                  {activeProject.phases.map((phase) => {
                    const isExpanded = expandedPhases[phase.id] ?? true;
                    const phaseCompletedTasks = phase.tasks.filter((t) => t.status === 'Completed').length;
                    const phaseTotalTasks = phase.tasks.length;
                    const isPhaseDone = phaseTotalTasks > 0 && phaseCompletedTasks === phaseTotalTasks;

                    return (
                      <div
                        key={phase.id}
                        className="glass-panel rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs transition-all"
                      >
                        {/* Phase Header */}
                        <div
                          onClick={() => togglePhase(phase.id)}
                          className="p-5 bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-2 rounded-xl ${
                                isPhaseDone
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-indigo-50 text-indigo-600'
                              }`}
                            >
                              {isPhaseDone ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Layers className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-bold text-slate-900">{phase.name}</h3>
                                {phase.duration && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                                    {phase.duration}
                                  </span>
                                )}
                              </div>
                              {phase.description && (
                                <p className="text-xs text-slate-500 mt-0.5">{phase.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className="text-xs font-bold text-slate-600">
                              {phaseCompletedTasks}/{phaseTotalTasks} Tasks
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Phase Tasks List */}
                        {isExpanded && (
                          <div className="p-5 pt-0 space-y-3 bg-white border-t border-slate-100">
                            <div className="divide-y divide-slate-100">
                              {phase.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="py-3.5 first:pt-2 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                  <div className="space-y-1 max-w-xl">
                                    <div className="flex items-center space-x-2">
                                      <span
                                        className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-md ${
                                          task.priority === 'High'
                                            ? 'bg-rose-100 text-rose-800'
                                            : task.priority === 'Medium'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {task.priority} Priority
                                      </span>
                                      {task.estimated_hours && (
                                        <span className="text-[10px] text-slate-400 font-medium">
                                          ⏱ {task.estimated_hours}
                                        </span>
                                      )}
                                    </div>
                                    <h4
                                      className={`text-xs font-bold ${
                                        task.status === 'Completed'
                                          ? 'text-slate-400 line-through'
                                          : 'text-slate-800'
                                      }`}
                                    >
                                      {task.title}
                                    </h4>
                                    {task.description && (
                                      <p className="text-[11px] text-slate-500">{task.description}</p>
                                    )}
                                  </div>

                                  {/* Task Status Selector */}
                                  <div className="flex items-center space-x-1 shrink-0">
                                    {['Not Started', 'In Progress', 'Completed'].map((st) => (
                                      <button
                                        key={st}
                                        onClick={() => handleTaskStatusChange(task.id, st)}
                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                          task.status === st
                                            ? st === 'Completed'
                                              ? 'bg-emerald-600 text-white shadow-2xs'
                                              : st === 'In Progress'
                                              ? 'bg-amber-500 text-white shadow-2xs'
                                              : 'bg-slate-700 text-white shadow-2xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                                        }`}
                                      >
                                        {st === 'Completed' && '✓ '}
                                        {st}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Architecture & Recommended Tech Stack */}
              {activeTab === 'architecture' && (
                <div className="space-y-6">
                  {/* Architecture Overview */}
                  <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white space-y-3 shadow-xs">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">System Architecture Overview</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activeProject.architecture_overview ||
                        'Modular architecture featuring isolated client presentation, asynchronous REST API service layer, and resilient database persistence.'}
                    </p>
                  </div>

                  {/* Suggested Technologies Grid */}
                  <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-900">
                      Recommended Tech Stack & Framework Justifications
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(activeProject.suggested_technologies || []).map((tech, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                        >
                          <span className="text-[10px] uppercase font-bold text-indigo-700">
                            {tech.category}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{tech.name}</h4>
                          {tech.reason && <p className="text-[11px] text-slate-500">{tech.reason}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Testing & Deployment Checklists */}
              {activeTab === 'checklists' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Testing Checklist */}
                  <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs">
                    <div className="flex items-center space-x-2 text-indigo-600">
                      <ShieldCheck className="w-5 h-5" />
                      <h3 className="text-sm font-bold text-slate-900">Testing & Verification Checklist</h3>
                    </div>
                    <ul className="space-y-3">
                      {(activeProject.testing_checklist || []).map((item, idx) => (
                        <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Deployment Checklist */}
                  <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs">
                    <div className="flex items-center space-x-2 text-purple-600">
                      <Rocket className="w-5 h-5" />
                      <h3 className="text-sm font-bold text-slate-900">Production Deployment Checklist</h3>
                    </div>
                    <ul className="space-y-3">
                      {(activeProject.deployment_checklist || []).map((item, idx) => (
                        <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 4: AI Project Mentor Chat */}
              {activeTab === 'chat' && (
                <div className="glass-panel rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-xs flex flex-col h-[580px]">
                  {/* Chat Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-indigo-600 text-white">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">
                          Senior Engineering Mentor ({activeProject.title})
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Ask for architecture advice, code snippets, library recommendations, or debugging
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Question Chips */}
                  <div className="p-3 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Prompts:</span>
                    {[
                      'How should I structure database models?',
                      'Give me a starter REST endpoint boilerplate',
                      'What unit tests should I write first?',
                      'Suggest production folder structure'
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setChatInput(prompt);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-[10px] font-medium text-slate-600 shrink-0 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {/* Chat Messages Log */}
                  <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40">
                    {(activeProject.chat_messages || []).map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            msg.sender === 'user'
                              ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-500/10'
                              : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-none shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5 mb-1 text-[10px] opacity-75 font-semibold">
                            <span>{msg.sender === 'user' ? 'You' : 'AI Mentor'}</span>
                            <span>•</span>
                            <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
                          </div>
                          <div>
                            {msg.sender === 'user' ? (
                              <span>{msg.message}</span>
                            ) : (
                              <MarkdownRenderer content={msg.message} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {sendingChat && (
                      <div className="flex justify-start">
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 flex items-center space-x-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <span>AI Mentor is typing technical guidance...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Chat Input Bar */}
                  <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Ask AI Mentor about ${activeProject.title}...`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || sendingChat}
                      className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-500/20 cursor-pointer transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* New Project Plan Creation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Create New AI Project Plan</h2>
                  <p className="text-[11px] text-slate-400">AI will architect phases, tasks, and tech stack</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Project Name *</label>
                <input
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Distributed Task Queue & Dashboard"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description & Features *</label>
                <textarea
                  rows="3"
                  required
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Describe the problem, key features, user flows, and goals of this project..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tech Stack (comma separated)</label>
                  <input
                    type="text"
                    value={techStackInput}
                    onChange={(e) => setTechStackInput(e.target.value)}
                    placeholder="e.g. React, FastAPI, Docker"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target Timeline</label>
                  <input
                    type="text"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    placeholder="e.g. 4 Weeks"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target Goal / Outcome</label>
                  <input
                    type="text"
                    value={projectGoal}
                    onChange={(e) => setProjectGoal(e.target.value)}
                    placeholder="e.g. Portfolio showcase"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Difficulty Level</label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="Beginner">Beginner (Foundations)</option>
                    <option value="Intermediate">Intermediate (Full-Stack Standard)</option>
                    <option value="Advanced">Advanced (Production / Distributed)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Architecting Roadmap...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Project Plan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
