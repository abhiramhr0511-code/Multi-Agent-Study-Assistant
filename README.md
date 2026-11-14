# 📚 StudyMate AI — Full-Stack Production AI Study Platform

A modern, full-stack SaaS web application for personalized learning, powered by multi-agent AI workflows, local document RAG (using offline `google/flan-t5-small`), interactive quiz generation, and progress tracking.

---

## 🚀 Technology Stack

### Frontend
- **React 18** + **Vite**
- **Tailwind CSS** + Custom Glassmorphism UI
- **React Router v6**
- **Axios** (with JWT Interceptors)
- **Lucide React Icons**

### Backend
- **Python 3.10+** + **FastAPI** + **Uvicorn**
- **Pydantic v2** data validation
- **MongoDB** (via PyMongo/Motor) with persistent local JSON fallback engine
- **JWT Authentication** + **bcrypt** password hashing

### AI & RAG Engine (Preserved Core)
- **Existing `agent_handler.py`**, **`study_agents.py`**, **`rag_helper.py`**
- **Local RAG Pipeline**:
  - `PyPDFLoader` & `TextLoader` (chunk size 700, overlap 100)
  - `sentence-transformers/all-MiniLM-L6-v2` local embeddings
  - **ChromaDB** vector storage
  - **Local `google/flan-t5-small`** for 100% offline document Q&A (No Groq/OpenAI used for Document Q&A)
- **Groq API** (Phi agents for Tutor, Quiz Generator, Resource Search, Roadmap)

---

## 📂 Project Structure

```
project-root/
│
├── frontend/                        # React SaaS Frontend
│   ├── src/
│   │   ├── components/              # Reusable UI elements
│   │   ├── context/                 # AuthContext (JWT session)
│   │   ├── layouts/                 # MainLayout (Sidebar + Header)
│   │   ├── pages/                   # SaaS Page Views
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AITutor.jsx
│   │   │   ├── QuizGenerator.jsx
│   │   │   ├── LearningRoadmap.jsx
│   │   │   ├── Resources.jsx
│   │   │   ├── DocumentQA.jsx
│   │   │   ├── Progress.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── services/                # Axios API endpoints
│   │   ├── App.jsx                  # React Router setup
│   │   ├── index.css                # Tailwind CSS tokens & glass styles
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                         # FastAPI REST Backend
│   ├── main.py                      # FastAPI entry point & CORS
│   ├── config.py                    # Environment settings
│   ├── database/                    # MongoDB connection & fallback
│   │   └── connection.py
│   ├── schemas/                     # Pydantic validation schemas
│   │   └── schemas.py
│   ├── utils/                       # JWT & bcrypt security
│   │   └── auth_utils.py
│   ├── services/                    # AI Bridge connecting existing AI core
│   │   └── ai_bridge.py
│   ├── api/                         # REST Controllers
│   │   ├── auth.py                  # POST /api/auth/register, login, GET /api/auth/me
│   │   ├── tutor.py                 # POST /api/tutor/chat
│   │   ├── quiz.py                  # POST /api/quiz/generate, results, history
│   │   ├── documents.py             # POST /api/documents/upload, query, list, delete
│   │   ├── resources.py             # POST /api/resources/search
│   │   ├── roadmap.py               # POST /api/roadmap/generate
│   │   └── progress.py              # GET /api/progress
│   └── requirements.txt
│
├── agent_handler.py                 # Core AI Orchestrator (Preserved)
├── study_agents.py                  # Phi Agents & DuckDuckGo (Preserved)
├── rag_helper.py                    # Local RAG & ChromaDB (Preserved)
├── app.py                           # Legacy Streamlit app (Preserved)
├── prompts.yaml                     # Prompt templates (Preserved)
├── chroma_db/                       # ChromaDB vector store
├── uploads/                         # User uploaded files
├── .env                             # Environment variables
└── README.md
```

---

## 💻 How to Run the Application

### 1. Start FastAPI Backend

```bash
# Install backend dependencies
pip install -r backend/requirements.txt

# Launch FastAPI backend with uvicorn
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

- **Backend API**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health`

### 2. Start React Frontend

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

- **Frontend Application**: `http://localhost:5173`

---

## 🔑 Environment Variables (`.env`)

```env
MONGODB_URI=mongodb://localhost:27017
JWT_SECRET=super-secret-jwt-key-for-study-assistant-2026
GROQ_API_KEY=gsk_your_groq_key_here
```

---

## 🛠️ Key Features Implemented

1. **Authentication**: JWT authentication with password hashing (`bcrypt`), login, register, and protected routes.
2. **AI Tutor**: Interactive chat with persona configuration (Topic, Skill Level, Learning Style).
3. **Batch Quiz Generator**: Generates questions in batches of 5 with auto-retries, options A/B/C/D, instant score breakdown, explanations, and weak area tracking.
4. **Document Q&A / RAG**: Upload PDF/TXT files, indexed into ChromaDB. Querying uses **100% local `google/flan-t5-small`** with source chunk citations.
5. **Resource Finder**: DuckDuckGo search integration with fallback protection against rate limits.
6. **Learning Roadmap**: Step-by-step milestone timeline generator.
7. **Progress Analytics**: Quiz history, average score trends, indexed documents count, and weak topic alerts stored in MongoDB.
