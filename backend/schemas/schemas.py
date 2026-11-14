from pydantic import BaseModel, EmailStr, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# ==========================================
# AUTH SCHEMAS
# ==========================================

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    otp: Optional[str] = None

class SendRegistrationOtpRequest(BaseModel):
    name: Optional[str] = "Student"
    email: EmailStr

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    email_verified: bool = False
    created_at: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class SendOtpRequest(BaseModel):
    email: Optional[EmailStr] = None

class VerifyOtpRequest(BaseModel):
    email: Optional[EmailStr] = None
    otp: str = Field(..., min_length=4, max_length=10)

class VerifyOtpResponse(BaseModel):
    success: bool
    message: str
    email_verified: bool

# ==========================================
# TUTOR CHAT SCHEMAS
# ==========================================

class TutorChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = "default_session"
    topic: Optional[str] = "General Study"
    subject_category: Optional[str] = "General"
    knowledge_level: Optional[str] = "Intermediate"
    learning_style: Optional[str] = "Visual"

class TutorChatResponse(BaseModel):
    response: str
    conversation_id: str

# ==========================================
# QUIZ SCHEMAS
# ==========================================

class QuizGenerateRequest(BaseModel):
    topic: Optional[str] = "General Programming"
    subject_category: Optional[str] = "Computer Science"
    knowledge_level: Optional[str] = "Intermediate"
    difficulty_level: str = "intermediate"
    focus_areas: Optional[str] = "general concepts"
    num_questions: int = Field(default=10, ge=3, le=30)
    adaptive: Optional[bool] = False
    subject: Optional[str] = None
    topics: Optional[List[str]] = []

class QuizQuestionOptions(BaseModel):
    A: str
    B: str
    C: str
    D: str

class QuizQuestion(BaseModel):
    id: Optional[int] = 1
    question: str
    options: Dict[str, str]
    correct_answer: str
    explanation: str
    key_concept: Optional[str] = "General"
    topic: Optional[str] = "General"
    difficulty: Optional[str] = "medium"

class QuizGenerateResponse(BaseModel):
    questions: List[QuizQuestion]
    adaptive: Optional[bool] = False
    adaptive_meta: Optional[Dict[str, Any]] = None

class QuizResultSubmit(BaseModel):
    topic: str
    difficulty: str
    score: int
    total_questions: int
    percentage: float
    weak_areas: List[str] = []
    details: List[Dict[str, Any]] = []
    is_adaptive: Optional[bool] = False
    topic_breakdown: Optional[List[Dict[str, Any]]] = []
    recommended_next_step: Optional[str] = None

class QuizResultResponse(BaseModel):
    id: str
    user_id: str
    topic: str
    difficulty: str
    score: int
    total_questions: int
    percentage: float
    weak_areas: List[str]
    created_at: str
    is_adaptive: Optional[bool] = False
    topic_breakdown: Optional[List[Dict[str, Any]]] = []
    recommended_next_step: Optional[str] = None

# ==========================================
# DOCUMENT Q&A SCHEMAS
# ==========================================

class DocumentQueryRequest(BaseModel):
    question: str
    doc_id: Optional[str] = None
    document_id: Optional[str] = None
    k: Optional[int] = 6
    history: Optional[List[Dict[str, str]]] = []

class DocumentQueryResponse(BaseModel):
    answer: str
    sources: List[str] = []

class DocumentInfoResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    num_pages: int
    num_chunks: int
    uploaded_at: str

class DocumentUploadResponse(BaseModel):
    filename: str
    doc_id: Optional[str] = None
    document_id: Optional[str] = None
    num_pages: int
    num_chunks: int
    success: bool
    message: str

# ==========================================
# RESOURCE SCHEMAS
# ==========================================

class ResourceSearchRequest(BaseModel):
    topic: str
    skill: Optional[str] = ""
    learning_goal: Optional[str] = ""
    difficulty: Optional[str] = "Intermediate"
    learning_preference: Optional[str] = "Visual"

class ResourceItem(BaseModel):
    title: str
    description: str
    url: str
    type: str
    difficulty: str
    topic: Optional[str] = None

class ResourceSearchResponse(BaseModel):
    resources: List[ResourceItem]

# ==========================================
# ROADMAP SCHEMAS
# ==========================================

class RoadmapGenerateRequest(BaseModel):
    goal: str
    current_skill_level: str = "Beginner"
    target_skill: str = "Advanced"
    available_study_time: str = "5 hours/week"
    preferred_learning_style: str = "Visual"
    use_latest_assessment: Optional[bool] = True

class RoadmapPersonalizationMeta(BaseModel):
    personalized: bool = False
    based_on_assessment: bool = False
    assessment_subject: Optional[str] = None
    priority_topics: List[str] = []
    moderate_topics: List[str] = []
    strong_topics: List[str] = []
    topic_scores: Dict[str, float] = {}
    explanation: Optional[str] = None

class RoadmapGenerateResponse(BaseModel):
    roadmap_markdown: str
    topic: str
    personalization: Optional[RoadmapPersonalizationMeta] = None

# ==========================================
# SKILL GAP ASSESSMENT SCHEMAS
# ==========================================

class SkillAssessmentGenerateRequest(BaseModel):
    subject: str = Field(..., min_length=2, max_length=100)
    learning_goal: Optional[str] = "Master core concepts"
    topics: Optional[List[str]] = []
    difficulty_level: Optional[str] = "intermediate"
    num_questions: int = Field(default=10, ge=3, le=30)

class SkillAssessmentQuestion(BaseModel):
    id: int
    question: str
    options: Dict[str, str]
    correct_answer: str
    topic: str
    difficulty: str
    explanation: str

class SkillAssessmentGenerateResponse(BaseModel):
    subject: str
    learning_goal: str
    topics: List[str]
    questions: List[SkillAssessmentQuestion]

class TopicPerformance(BaseModel):
    topic: str
    total_questions: int
    correct_count: int
    incorrect_count: int
    percentage: float
    mastery_level: str  # "Strong" (80-100), "Moderate" (60-79), "Weak" (0-59)

class SkillAssessmentSubmit(BaseModel):
    subject: str
    learning_goal: str
    topics: List[str] = []
    total_questions: int
    score: int
    percentage: float
    time_taken_seconds: Optional[int] = 0
    topic_breakdown: List[TopicPerformance]
    weak_topics: List[str] = []
    moderate_topics: List[str] = []
    strong_topics: List[str] = []
    details: List[Dict[str, Any]] = []

class SkillAssessmentResultResponse(BaseModel):
    id: str
    user_id: str
    subject: str
    learning_goal: str
    topics: List[str]
    total_questions: int
    score: int
    percentage: float
    time_taken_seconds: Optional[int] = 0
    topic_breakdown: List[TopicPerformance]
    weak_topics: List[str]
    moderate_topics: List[str]
    strong_topics: List[str]
    created_at: str
    disclaimer: str = "This is an application-level skill assessment, not a scientifically validated psychometric evaluation."

# ==========================================
# MISTAKE ANALYSIS SCHEMAS
# ==========================================

class MistakeAnalysisRecord(BaseModel):
    id: str
    user_id: str
    quiz_id: str
    subject: str
    topic: str
    difficulty: str
    question: str
    student_answer: str
    correct_answer: str
    is_correct: bool = False
    explanation: str
    possible_misconception: str
    correct_concept: str
    recommended_action: str
    practice_recommendation: str
    is_repeated_topic: bool = False
    mistake_count_for_topic: Optional[int] = 1
    created_at: str

class MistakeTopicSummary(BaseModel):
    topic: str
    mistake_count: int
    is_repeated: bool
    status: str  # "Needs Attention" or "Monitored"
    latest_misconception: Optional[str] = None
    recommended_action: Optional[str] = None

class MistakesSummaryResponse(BaseModel):
    total_mistakes: int
    repeated_topics_count: int
    repeated_topics: List[MistakeTopicSummary]
    top_problem_topics: List[Dict[str, Any]]
    topic_grouping: Dict[str, Dict[str, int]] = {}
    recent_mistakes: List[MistakeAnalysisRecord]

# ==========================================
# PROGRESS SCHEMAS
# ==========================================

class ProgressResponse(BaseModel):
    quizzes_completed: int
    average_score: float
    best_score: float
    weak_topics: List[str]
    documents_uploaded: int
    text_chunks: int
    study_sessions_count: int
    recent_quizzes: List[QuizResultResponse]
    assessments_completed: Optional[int] = 0
    adaptive_quizzes_completed: Optional[int] = 0
    total_mistakes: Optional[int] = 0
    repeated_mistake_topics: Optional[List[str]] = []
    latest_assessment: Optional[Dict[str, Any]] = None

# ==========================================
# LEARNING TWIN SCHEMAS
# ==========================================

class TopicEvidence(BaseModel):
    assessment_score: Optional[float] = None
    recent_quiz_accuracy: Optional[float] = None
    quiz_attempts_count: int = 0
    mistake_count: int = 0
    is_repeated_difficulty: bool = False

class SkillTwinItem(BaseModel):
    topic: str
    subject: Optional[str] = None
    score: float
    mastery: str  # "Strong", "Moderate", "Weak", "Needs Practice"
    trend: str    # "Improving", "Stable", "Declining", "Insufficient Data"
    priority: str # "High", "Medium", "Low"
    evidence: TopicEvidence
    reason: str

class RepeatedDifficultyItem(BaseModel):
    topic: str
    mistake_count: int
    latest_misconception: Optional[str] = None
    recommended_action: Optional[str] = None

class RecommendedFocusItem(BaseModel):
    topic: str
    priority: str # "High", "Medium", "Low"
    reason: str
    recommended_action: Optional[str] = None

class LearningActivityItem(BaseModel):
    type: str  # "quiz", "assessment", "mistake", "document"
    title: str
    subtitle: str
    score_or_status: Optional[str] = None
    timestamp: str

class LearningTwinResponse(BaseModel):
    user_id: str
    learning_goal: str
    primary_subject: Optional[str] = None
    overall_progress: float
    skills: List[SkillTwinItem]
    strong_topics: List[str]
    moderate_topics: List[str]
    weak_topics: List[str]
    repeated_difficulties: List[RepeatedDifficultyItem]
    recommended_focus_topics: List[RecommendedFocusItem]
    recent_activity: List[LearningActivityItem]
    total_assessments: int = 0
    total_quizzes: int = 0
    total_mistakes: int = 0
    has_data: bool = True
    last_updated: str
    disclaimer: str = "This is an application-level learning profile based strictly on observed assessments and quiz performance."

# ==========================================
# REVISION SCHEDULER SCHEMAS
# ==========================================

class RevisionItem(BaseModel):
    id: str
    topic: str
    subject: str
    priority: str  # "High", "Medium", "Low"
    reason: str
    last_practiced: Optional[str] = None
    recommended_revision_date: str
    status: str    # "Due Today", "Overdue", "Upcoming", "Reviewed"
    interval_days: int = 1
    review_count: int = 0
    competency_score: float
    mastery: str
    trend: str
    mistake_count: int = 0
    is_repeated_difficulty: bool = False

class RevisionReviewRequest(BaseModel):
    topic: str
    subject: Optional[str] = "General"
    notes: Optional[str] = None
    ease_rating: Optional[str] = "Good"  # "Hard", "Good", "Easy"

class RevisionReviewRecord(BaseModel):
    id: str
    user_id: str
    topic: str
    subject: str
    reviewed_at: str
    next_due_date: str
    interval_days: int
    review_count: int
    ease_rating: str

class RevisionScheduleResponse(BaseModel):
    user_id: str
    due_today_count: int
    overdue_count: int
    upcoming_count: int
    total_reviewed_count: int
    items_due_today: List[RevisionItem]
    items_upcoming: List[RevisionItem]
    recently_reviewed: List[RevisionItem]
    has_data: bool = True
    last_generated: str

# ==========================================
# Phase 9: AI Project Mentor Schemas
# ==========================================

class ProjectTask(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    priority: Optional[str] = "Medium"  # High, Medium, Low
    status: str = "Not Started"  # Not Started, In Progress, Completed
    estimated_hours: Optional[str] = None
    resources: Optional[List[str]] = []

class ProjectPhase(BaseModel):
    id: str
    phase_number: int
    name: str
    duration: Optional[str] = "1-2 Weeks"
    description: Optional[str] = ""
    tasks: List[ProjectTask] = []

class ProjectGenerateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=5, max_length=2000)
    tech_stack: Optional[List[str]] = []
    goal: Optional[str] = None
    difficulty_level: Optional[str] = "Intermediate"  # Beginner, Intermediate, Advanced
    timeline: Optional[str] = None

class ProjectTaskUpdateRequest(BaseModel):
    status: str = Field(..., description="Not Started, In Progress, or Completed")

class ProjectChatMessage(BaseModel):
    id: str
    sender: str  # "user" | "assistant"
    message: str
    timestamp: str

class ProjectChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class SuggestedTechItem(BaseModel):
    category: str
    name: str
    reason: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    tech_stack: List[str] = []
    goal: Optional[str] = None
    difficulty_level: str = "Intermediate"
    timeline: Optional[str] = None
    summary: Optional[str] = ""
    architecture_overview: Optional[str] = ""
    suggested_technologies: Optional[List[SuggestedTechItem]] = []
    phases: List[ProjectPhase] = []
    testing_checklist: List[str] = []
    deployment_checklist: List[str] = []
    progress: float = 0.0
    chat_messages: List[ProjectChatMessage] = []
    created_at: str
    updated_at: str

class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]

# ==========================================
# Phase 10: AI Viva & Interview Coach Schemas
# ==========================================

class InterviewQuestion(BaseModel):
    id: int
    question: str
    category: str = "Technical"
    expected_key_points: List[str] = []
    difficulty: str = "Intermediate"

class InterviewStartRequest(BaseModel):
    interview_type: str = Field(..., description="Project Viva, Technical Interview, or HR Interview")
    subject: Optional[str] = "Computer Science"
    project_id: Optional[str] = None
    project_title: Optional[str] = None
    project_description: Optional[str] = None
    difficulty: Optional[str] = "Intermediate"
    num_questions: Optional[int] = 5
    include_learning_context: Optional[bool] = True

class InterviewAnswerEvaluateRequest(BaseModel):
    question_id: int
    student_answer: str = Field(..., min_length=2, max_length=5000)

class InterviewAnswerEvaluation(BaseModel):
    question_id: int
    student_answer: str
    score: float  # 0 to 100
    rating: str  # Excellent, Good, Needs Improvement, Inadequate
    feedback: str
    key_strengths: List[str] = []
    missing_concepts: List[str] = []
    suggested_model_answer: str
    follow_up_question: Optional[str] = None

class InterviewTopicBreakdown(BaseModel):
    topic: str
    score: float
    rating: str
    questions_count: int

class InterviewSession(BaseModel):
    id: str
    user_id: str
    interview_type: str
    subject: str
    difficulty: str
    project_title: Optional[str] = None
    total_questions: int
    questions: List[InterviewQuestion] = []
    evaluations: List[InterviewAnswerEvaluation] = []
    overall_score: Optional[float] = None
    performance_tier: Optional[str] = None
    topic_breakdown: Optional[List[InterviewTopicBreakdown]] = []
    weak_areas: Optional[List[str]] = []
    improvement_suggestions: Optional[List[str]] = []
    status: str = "in_progress"  # in_progress, completed
    created_at: str
    completed_at: Optional[str] = None

class InterviewHistoryResponse(BaseModel):
    history: List[InterviewSession]


# ============================================================
# 15. EMAIL NOTIFICATION & ROUTINE SCHEMAS (PHASE 15)
# ============================================================

class RoutineConfig(BaseModel):
    id: str
    user_id: str
    routine_name: str
    activity: str
    scheduled_time: str  # Format: "HH:MM" e.g. "09:00"
    days_of_week: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    is_active: bool = True
    created_at: str
    updated_at: Optional[str] = None

class RoutineCreateRequest(BaseModel):
    routine_name: str = "Morning Study Session"
    activity: str = "Review daily roadmap tasks and practice 5 flashcards"
    scheduled_time: str = "09:00"
    days_of_week: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    is_active: bool = True

class NotificationSettings(BaseModel):
    user_id: str
    email: str
    daily_routine_emails: bool = True
    weekly_exam_emails: bool = True
    revision_emails: bool = True
    exam_reminder_emails: bool = True
    streak_emails: bool = True
    routine_time: str = "09:00"
    routine_name: str = "Daily Study Sprint"
    routine_activity: str = "Review roadmap milestones, complete 1 quiz, and practice weak topics"
    timezone_offset_minutes: int = 0
    updated_at: str

class NotificationSettingsUpdate(BaseModel):
    daily_routine_emails: Optional[bool] = None
    weekly_exam_emails: Optional[bool] = None
    revision_emails: Optional[bool] = None
    exam_reminder_emails: Optional[bool] = None
    streak_emails: Optional[bool] = None
    routine_time: Optional[str] = None
    routine_name: Optional[str] = None
    routine_activity: Optional[str] = None
    timezone_offset_minutes: Optional[int] = None

class TestEmailRequest(BaseModel):
    email_type: str = "test"  # routine, exam, revision, streak, upcoming_exam, test
    custom_recipient: Optional[str] = None

class EmailLogItem(BaseModel):
    id: str
    user_id: str
    recipient_email: str
    event_type: str  # daily_routine, weekly_exam, revision_due, exam_reminder, streak_reminder, test_email
    subject: str
    status: str      # sent, failed, simulated
    reference_id: Optional[str] = None
    sent_at: str
    error_message: Optional[str] = None

class EmailLogsResponse(BaseModel):
    logs: List[EmailLogItem]
    total: int




