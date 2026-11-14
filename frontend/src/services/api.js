import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('study_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Unauthorized (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('study_token');
      localStorage.removeItem('study_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (name, email, password, otp = null) => {
    const res = await api.post('/auth/register', { name, email, password, otp });
    return res.data;
  },
  sendRegistrationOtp: async (name, email) => {
    const res = await api.post('/auth/send-registration-otp', { name, email });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  sendVerificationOtp: async (email = null) => {
    const res = await api.post('/auth/send-verification-otp', { email });
    return res.data;
  },
  verifyEmailOtp: async (otp, email = null) => {
    const res = await api.post('/auth/verify-email-otp', { otp, email });
    return res.data;
  },
};

export const tutorAPI = {
  chat: async (message, conversationId, topic, knowledgeLevel, learningStyle) => {
    const res = await api.post('/tutor/chat', {
      message,
      conversation_id: conversationId,
      topic,
      knowledge_level: knowledgeLevel,
      learning_style: learningStyle,
    });
    return res.data;
  },
};

export const quizAPI = {
  generate: async (topic, difficultyLevel, focusAreas, numQuestions, adaptive = false, subject = null, topics = []) => {
    const res = await api.post('/quiz/generate', {
      topic,
      difficulty_level: difficultyLevel,
      focus_areas: focusAreas,
      num_questions: parseInt(numQuestions, 10),
      adaptive,
      subject,
      topics,
    });
    return res.data;
  },
  submitResults: async (resultData) => {
    const res = await api.post('/quiz/results', resultData);
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get('/quiz/history');
    return res.data;
  },
  getAdaptiveContext: async () => {
    const res = await api.get('/quiz/adaptive-context');
    return res.data;
  },
};

export const documentAPI = {
  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  query: async (question, history = [], docId = null, k = 6) => {
    const res = await api.post('/documents/query', {
      question,
      history,
      doc_id: docId || null,
      k,
    });
    return res.data;
  },
  list: async () => {
    const res = await api.get('/documents');
    return res.data;
  },
  delete: async (docId) => {
    const res = await api.delete(`/documents/${docId}`);
    return res.data;
  },
};

export const resourceAPI = {
  search: async (topic, skill, learningGoal, difficulty, learningPreference) => {
    const res = await api.post('/resources/search', {
      topic,
      skill,
      learning_goal: learningGoal,
      difficulty,
      learning_preference: learningPreference,
    });
    return res.data;
  },
};

export const roadmapAPI = {
  generate: async (goal, currentSkillLevel, targetSkill, availableStudyTime, preferredLearningStyle, useLatestAssessment = true) => {
    const res = await api.post('/roadmap/generate', {
      goal,
      current_skill_level: currentSkillLevel,
      target_skill: targetSkill,
      available_study_time: availableStudyTime,
      preferred_learning_style: preferredLearningStyle,
      use_latest_assessment: useLatestAssessment,
    });
    return res.data;
  },
  getLatestAssessment: async () => {
    const res = await api.get('/roadmap/latest-assessment');
    return res.data;
  },
};

export const progressAPI = {
  get: async () => {
    const res = await api.get('/progress');
    return res.data;
  },
};

export const assessmentAPI = {
  generate: async (subject, learningGoal, topics, difficultyLevel, numQuestions) => {
    const res = await api.post('/assessment/generate', {
      subject,
      learning_goal: learningGoal,
      topics,
      difficulty_level: difficultyLevel,
      num_questions: parseInt(numQuestions, 10),
    });
    return res.data;
  },
  submit: async (submitData) => {
    const res = await api.post('/assessment/submit', submitData);
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get('/assessment/history');
    return res.data;
  },
  getById: async (assessmentId) => {
    const res = await api.get(`/assessment/${assessmentId}`);
    return res.data;
  },
};

export const mistakeAPI = {
  getRecent: async (limit = 20) => {
    const res = await api.get(`/mistakes/recent?limit=${limit}`);
    return res.data;
  },
  getSummary: async () => {
    const res = await api.get('/mistakes/summary');
    return res.data;
  },
  getByTopic: async (topic) => {
    const res = await api.get(`/mistakes/topic/${encodeURIComponent(topic)}`);
    return res.data;
  },
};

export const learningTwinAPI = {
  get: async () => {
    const res = await api.get('/learning-twin');
    return res.data;
  },
};

export const revisionAPI = {
  getSchedule: async () => {
    const res = await api.get('/revision');
    return res.data;
  },
  markReviewed: async (topic, subject = 'General', easeRating = 'Good', notes = '') => {
    const res = await api.post('/revision/review', {
      topic,
      subject,
      ease_rating: easeRating,
      notes,
    });
    return res.data;
  },
};

export const projectAPI = {
  generate: async (projectData) => {
    const res = await api.post('/projects/generate', projectData);
    return res.data;
  },
  list: async () => {
    const res = await api.get('/projects');
    return res.data;
  },
  getById: async (projectId) => {
    const res = await api.get(`/projects/${projectId}`);
    return res.data;
  },
  updateTask: async (projectId, taskId, status) => {
    const res = await api.patch(`/projects/${projectId}/tasks/${taskId}`, { status });
    return res.data;
  },
  chat: async (projectId, message) => {
    const res = await api.post(`/projects/${projectId}/chat`, { message });
    return res.data;
  },
  delete: async (projectId) => {
    const res = await api.delete(`/projects/${projectId}`);
    return res.data;
  },
};

export const interviewAPI = {
  start: async (sessionData) => {
    const res = await api.post('/interview/start', sessionData);
    return res.data;
  },
  evaluateAnswer: async (sessionId, questionId, studentAnswer) => {
    const res = await api.post(`/interview/${sessionId}/evaluate`, {
      question_id: questionId,
      student_answer: studentAnswer,
    });
    return res.data;
  },
  complete: async (sessionId) => {
    const res = await api.post(`/interview/${sessionId}/complete`);
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get('/interview/history');
    return res.data;
  },
  getById: async (sessionId) => {
    const res = await api.get(`/interview/${sessionId}`);
    return res.data;
  },
};

export const notificationAPI = {
  getSettings: async () => {
    const res = await api.get('/notifications/settings');
    return res.data;
  },
  updateSettings: async (settingsData) => {
    const res = await api.put('/notifications/settings', settingsData);
    return res.data;
  },
  sendTestEmail: async (emailType = 'test', customRecipient = null) => {
    const res = await api.post('/notifications/send-test', {
      email_type: emailType,
      custom_recipient: customRecipient,
    });
    return res.data;
  },
  getLogs: async (limit = 20) => {
    const res = await api.get(`/notifications/logs?limit=${limit}`);
    return res.data;
  },
  triggerScheduler: async () => {
    const res = await api.post('/notifications/trigger-scheduler');
    return res.data;
  },
};

export default api;



