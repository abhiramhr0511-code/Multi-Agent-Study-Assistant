import React, { useState, useRef, useEffect } from 'react';
import { tutorAPI } from '../services/api';
import { Bot, Send, Trash2, Sparkles, User, RefreshCw, AlertCircle } from 'lucide-react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

export const AITutor = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your AI Tutor. What topic or concept would you like to explore today? Ask me any question!",
    },
  ]);
  const [input, setInput] = useState('');
  const [topic, setTopic] = useState('Computer Science');
  const [knowledgeLevel, setKnowledgeLevel] = useState('Intermediate');
  const [learningStyle, setLearningStyle] = useState('Visual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setError('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await tutorAPI.chat(userMsg, 'session_tutor', topic, knowledgeLevel, learningStyle);
      setMessages((prev) => [...prev, { sender: 'ai', text: res.response }]);
    } catch (err) {
      setError('Failed to reach AI Tutor. Please check backend connection.');
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Sorry, I encountered an issue generating a response. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        sender: 'ai',
        text: 'Conversation cleared. How else can I assist your study session?',
      },
    ]);
  };

  const samplePrompts = [
    'Explain how recursion works with a simple example.',
    'What is the difference between SQL and NoSQL databases?',
    'How do neural networks learn through backpropagation?',
    'Give me a memory trick to remember data structures.',
  ];

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col space-y-4 font-sans">
      {/* Header & Settings Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-slate-100 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-purple-100 text-purple-600">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              AI Tutor <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>
            </h1>
            <p className="text-xs text-slate-500">Interactive study assistance adapted to your level</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div>
            <label className="text-slate-500 mr-1.5 font-bold">Topic:</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 w-32 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-slate-500 mr-1.5 font-bold">Level:</label>
            <select
              value={knowledgeLevel}
              onChange={(e) => setKnowledgeLevel(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white font-medium"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <button
            onClick={handleClear}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 glass-panel rounded-3xl border border-slate-100 p-6 overflow-y-auto space-y-4 shadow-xs bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-brand-600 text-white'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-2xl sm:max-w-3xl p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-none shadow-sm whitespace-pre-wrap'
                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-xs overflow-x-auto'
              }`}
            >
              {msg.sender === 'user' ? (
                <span>{msg.text}</span>
              ) : (
                <MarkdownRenderer content={msg.text} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-3 text-slate-500 text-xs">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <span className="animate-pulse font-medium">AI Tutor is thinking...</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 font-bold flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Prompts:
        </span>
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => setInput(prompt)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 font-medium transition-all text-xs cursor-pointer shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Text Input Box */}
      <form onSubmit={handleSend} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI Tutor anything about your subject..."
          className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-14 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="absolute right-2.5 top-2.5 p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl disabled:opacity-40 transition-all shadow-sm cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
