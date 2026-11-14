import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { AITutor } from './pages/AITutor';
import { QuizGenerator } from './pages/QuizGenerator';
import { LearningRoadmap } from './pages/LearningRoadmap';
import { Resources } from './pages/Resources';
import { DocumentQA } from './pages/DocumentQA';
import { Progress } from './pages/Progress';
import { Profile } from './pages/Profile';
import { SkillAssessment } from './pages/SkillAssessment';
import { LearningTwin } from './pages/LearningTwin';
import { KnowledgeGraph } from './pages/KnowledgeGraph';
import { RevisionScheduler } from './pages/RevisionScheduler';
import { ProjectMentor } from './pages/ProjectMentor';
import { InterviewCoach } from './pages/InterviewCoach';

// ─── Protected Route Guard ────────────────────────────────────────────────────
// Shows loading spinner while session is verified, then either renders children
// or redirects unauthenticated users to /login.
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium animate-pulse">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ─── App Router ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ── Public Routes (no auth required) ── */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ── Protected App Routes (auth required) ── */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tutor" element={<AITutor />} />
            <Route path="learning-twin" element={<LearningTwin />} />
            <Route path="knowledge-graph" element={<KnowledgeGraph />} />
            <Route path="revision" element={<RevisionScheduler />} />
            <Route path="project-mentor" element={<ProjectMentor />} />
            <Route path="interview-coach" element={<InterviewCoach />} />
            <Route path="quiz" element={<QuizGenerator />} />
            <Route path="skill-assessment" element={<SkillAssessment />} />
            <Route path="roadmap" element={<LearningRoadmap />} />
            <Route path="resources" element={<Resources />} />
            <Route path="documents" element={<DocumentQA />} />
            <Route path="progress" element={<Progress />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* ── Catch-all: redirect unknown routes to home ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
