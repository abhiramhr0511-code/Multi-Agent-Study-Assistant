import React, { useState, useEffect } from 'react';
import { documentAPI } from '../services/api';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import {
  FileText,
  UploadCloud,
  Trash2,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Search,
  Layers,
  RotateCcw,
  BookOpen
} from 'lucide-react';

export const DocumentQA = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('all');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Q&A State
  const [question, setQuestion] = useState('');
  const [querying, setQuerying] = useState(false);
  const [qaHistory, setQaHistory] = useState([
    {
      question: 'What can I ask about my documents?',
      answer: 'You can upload your study notes in **PDF** or **TXT** format. I will analyze the contents, extract key concepts, and answer your conceptual or factual questions with high precision and citations.',
      sources: [],
    },
  ]);

  const loadDocuments = async () => {
    try {
      const docs = await documentAPI.list();
      setDocuments(docs || []);
    } catch (err) {
      console.error('Failed to load document list:', err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadMessage('');
    setUploadError('');

    try {
      const res = await documentAPI.upload(file);
      if (res.success) {
        setUploadMessage(res.message);
        setFile(null);
        await loadDocuments();
        // Auto-select the newly uploaded document so queries use its doc_id
        const newDocId = res.doc_id || res.document_id;
        if (newDocId) {
          setSelectedDocId(newDocId);
        }
      } else {
        setUploadError(res.message || 'Failed to upload document.');
      }
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Document processing error.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await documentAPI.delete(docId);
      if (selectedDocId === docId) {
        setSelectedDocId('all');
      }
      await loadDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleClearHistory = () => {
    setQaHistory([]);
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!question.trim() || querying) return;

    // Require a specific document to be selected before querying
    if (selectedDocId === 'all' && documents.length === 0) {
      setQaHistory((prev) => [
        ...prev,
        {
          question: question.trim(),
          answer: 'Please upload a study document first, then ask your question.',
          sources: [],
        },
      ]);
      return;
    }

    const currentQ = question.trim();
    setQuestion('');
    setQuerying(true);

    // Build recent conversation history payload
    const formattedHistory = qaHistory.slice(-4).flatMap((item) => [
      { role: 'user', content: item.question },
      { role: 'assistant', content: item.answer },
    ]);

    // If 'all' scope is selected with docs available, use the first doc's id as fallback
    const targetDocId = selectedDocId === 'all'
      ? (documents.length > 0 ? documents[0].id : null)
      : selectedDocId;

    try {
      const res = await documentAPI.query(currentQ, formattedHistory, targetDocId);
      setQaHistory((prev) => [
        ...prev,
        {
          question: currentQ,
          answer: res.answer,
          sources: res.sources || [],
        },
      ]);
    } catch (err) {
      setQaHistory((prev) => [
        ...prev,
        {
          question: currentQ,
          answer: 'Unable to query the document index. Please verify your document uploads and try again.',
          sources: [],
        },
      ]);
    } finally {
      setQuerying(false);
    }
  };

  const totalChunks = documents.reduce((acc, d) => acc + (d.num_chunks || 0), 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-sky-100 text-sky-600">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Document Q&A <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Local RAG Assistant</span>
            </h1>
            <p className="text-xs text-slate-500">Ask questions directly from your study materials with strict grounding and zero hallucinations</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & Document Library Panel */}
        <div className="space-y-6">
          {/* File Upload Box */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-100 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <UploadCloud className="w-4 h-4 text-sky-600" />
              <span>Upload Study Document</span>
            </h2>

            {uploadMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{uploadMessage}</span>
              </div>
            )}

            {uploadError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleFileUpload} className="space-y-3">
              <div className="border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-2xl p-5 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  id="doc-upload"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <label htmlFor="doc-upload" className="cursor-pointer space-y-2 block">
                  <FileCheck className="w-8 h-8 text-sky-600 mx-auto" />
                  <span className="text-xs text-slate-700 block font-bold">
                    {file ? file.name : 'Click to select PDF or TXT file'}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">PDF / TXT supported (Chunk size 650)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!file || uploading}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-sky-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-40 cursor-pointer"
              >
                {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>{uploading ? 'Processing Chunks...' : 'Upload & Index'}</span>
              </button>
            </form>
          </div>

          {/* Document Summary Stats & List */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-100 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Uploaded Library</h2>
              <div className="text-[11px] text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                Files: <span className="text-sky-600 font-extrabold">{documents.length}</span> | Chunks: <span className="text-purple-600 font-extrabold">{totalChunks}</span>
              </div>
            </div>

            {/* Document Selection Scope */}
            {documents.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-sky-600" />
                  <span>Search Scope:</span>
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 font-medium"
                >
                  <option value="all">All Uploaded Documents ({documents.length})</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename} ({doc.num_chunks} chunks)
                    </option>
                  ))}
                </select>
                {selectedDocId === 'all' && documents.length > 0 && (
                  <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>For best results, select a specific document above.</span>
                  </p>
                )}
              </div>
            )}

            {documents.length > 0 ? (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="truncate mr-2">
                      <p className="font-bold text-slate-800 truncate">{doc.filename}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {doc.num_pages} Pages • {doc.num_chunks} Chunks
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">No study documents indexed yet.</p>
            )}
          </div>
        </div>

        {/* Q&A Chat Section */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-2 text-xs text-slate-600 font-semibold">
              <BookOpen className="w-4 h-4 text-sky-600" />
              <span>
                {selectedDocId === 'all' ? 'Querying across all indexed materials' : 'Querying selected document'}
              </span>
            </div>
            {qaHistory.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          <div className="flex-1 glass-panel p-6 rounded-3xl border border-slate-100 overflow-y-auto space-y-4 min-h-[420px] max-h-[600px] shadow-xs bg-slate-50/50">
            {qaHistory.map((qa, i) => (
              <div key={i} className="space-y-3 pb-4 border-b border-slate-200/60 last:border-0">
                <div className="flex items-center space-x-2 text-xs font-bold text-sky-700">
                  <Search className="w-4 h-4 text-sky-600" />
                  <span>Q: {qa.question}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white text-xs sm:text-sm text-slate-800 border border-slate-200/80 leading-relaxed shadow-xs">
                  <MarkdownRenderer content={qa.answer} preserveLineBreaks />
                </div>
                {qa.sources && qa.sources.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[9px] block">Retrieved Document Sources:</span>
                    {qa.sources.map((src, idx) => (
                      <p key={idx} className="italic text-slate-500">"{src}"</p>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {querying && (
              <div className="flex items-center space-x-3 text-slate-500 text-xs p-3 bg-white/80 rounded-2xl border border-slate-200">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                <span className="animate-pulse font-medium">Retrieving vector chunks and synthesizing grounded answer...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleQuery} className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question from your uploaded PDF/TXT notes..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-14 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-sm"
            />
            <button
              type="submit"
              disabled={!question.trim() || querying}
              className="absolute right-2.5 top-2.5 p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl disabled:opacity-40 transition-all shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

