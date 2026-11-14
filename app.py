import streamlit as st
from dotenv import load_dotenv
from agent_handler import StudyAssistantHandler
from config import ConfigManager
import os

# Load environment variables
load_dotenv()

# Page configuration
st.set_page_config(page_title="StudyMate AI", layout="wide", page_icon="📚")

# Custom Card Button CSS for Step 1
st.markdown("""
<style>
.stButton > button,
div[data-testid="stHorizontalBlock"] .stButton > button {
    width: 100% !important;
    min-height: 48px !important;
    background: #FFFFFF !important;
    border: 1px solid #DDE1EA !important;
    border-radius: 10px !important;
    color: #1F2937 !important;
    font-size: 1.15rem !important;
    font-weight: 700 !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
    transition: all 0.2s ease !important;
}

div[data-testid="stHorizontalBlock"] .stButton > button:hover {
    border-color: #4F46E5 !important;
    background: #F8FAFC !important;
    color: #4F46E5 !important;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.12) !important;
}
</style>
""", unsafe_allow_html=True)
st.title("📚 StudyMate AI")
st.markdown('<p style="text-align: justify; color: #4B5563; font-size: 0.95rem; line-height: 1.5; margin-bottom: 12px;">Your Personalized AI-Powered Learning Companion | Learn Smarter. Study Better. Achieve More</p>', unsafe_allow_html=True)

# Initialize config manager
config_manager = ConfigManager()

# Sidebar configuration
with st.sidebar:
    st.title("📚 StudyMate AI")
    st.markdown('<p style="text-align: justify; color: #4B5563; font-size: 0.95rem; line-height: 1.5; margin-bottom: 12px;">Your Personalized AI-Powered Learning Companion | Learn Smarter. Study Better. Achieve More</p>', unsafe_allow_html=True)

    st.divider()

    st.subheader("📖 About")
    st.markdown("""
    <p style="text-align: justify; color: #374151; font-size: 0.95rem; line-height: 1.6; margin-bottom: 14px;">
        StudyMate AI is an AI-powered personalized learning platform built to make studying more organized, interactive, and effective.
    </p>

    <p style="font-weight: 700; color: #111827; font-size: 1rem; margin-top: 14px; margin-bottom: 10px;">
        What StudyMate AI Offers
    </p>

    <div style="display: flex; gap: 8px; margin-bottom: 10px; align-items: flex-start;">
        <span style="font-size: 1.1rem; flex-shrink: 0;">🎯</span>
        <div style="text-align: justify; color: #374151; font-size: 0.92rem; line-height: 1.5;">
            <strong>Learning Analysis</strong> — Understand your strengths, interests, and learning needs.
        </div>
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 10px; align-items: flex-start;">
        <span style="font-size: 1.1rem; flex-shrink: 0;">🗺️</span>
        <div style="text-align: justify; color: #374151; font-size: 0.92rem; line-height: 1.5;">
            <strong>Personalized Roadmaps</strong>: Get a structured path for what to learn next.
        </div>
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 10px; align-items: flex-start;">
        <span style="font-size: 1.1rem; flex-shrink: 0;">📚</span>
        <div style="text-align: justify; color: #374151; font-size: 0.92rem; line-height: 1.5;">
            <strong>Learning Resources</strong> — Discover resources suited to your goals.
        </div>
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 10px; align-items: flex-start;">
        <span style="font-size: 1.1rem; flex-shrink: 0;">📝</span>
        <div style="text-align: justify; color: #374151; font-size: 0.92rem; line-height: 1.5;">
            <strong>AI Quiz Generator</strong> — Create quizzes to test your knowledge.
        </div>
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 10px; align-items: flex-start;">
        <span style="font-size: 1.1rem; flex-shrink: 0;">🤖</span>
        <div style="text-align: justify; color: #374151; font-size: 0.92rem; line-height: 1.5;">
            <strong>AI Tutor</strong> — Interact with an AI-powered tutor to ask questions, clarify concepts, and receive learning assistance.
        </div>
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 10px; align-items: flex-start;">
        <span style="font-size: 1.1rem; flex-shrink: 0;">📄</span>
        <div style="text-align: justify; color: #374151; font-size: 0.92rem; line-height: 1.5;">
            <strong>Document Q&A</strong> — Ask questions from your study materials.
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.divider()

    st.header("⚙️ Configuration")

    # Provider selection
    provider = st.selectbox(
        "AI Provider",
        ["groq", "openai"],
        index=0,
        help="Groq is free and fast. OpenAI requires paid API key."
    )

    # Model selection based on provider
    if provider == "groq":
        model_options = [
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
        "qwen/qwen3.6-27b"
    ]
        selected_model = st.selectbox("Select Model", model_options, index=0)
    else:
        model_options = ["gpt-4o", "gpt-4-turbo", "gpt-4o-mini", "gpt-3.5-turbo"]
        selected_model = st.selectbox("Select Model", model_options, index=0)

# Initialize session state
if "step" not in st.session_state:
    st.session_state.step = 1
if "subject_category" not in st.session_state:
    st.session_state.subject_category = None
if "topic" not in st.session_state:
    st.session_state.topic = None
if "knowledge_level" not in st.session_state:
    st.session_state.knowledge_level = None
if "learning_goal" not in st.session_state:
    st.session_state.learning_goal = None
if "time_available" not in st.session_state:
    st.session_state.time_available = None
if "learning_style" not in st.session_state:
    st.session_state.learning_style = None
if "student_analysis" not in st.session_state:
    st.session_state.student_analysis = None
if "learning_roadmap" not in st.session_state:
    st.session_state.learning_roadmap = None
if "learning_resources" not in st.session_state:
    st.session_state.learning_resources = None
if "handler" not in st.session_state:
    st.session_state.handler = None
if "uploaded_files_count" not in st.session_state:
    st.session_state.uploaded_files_count = 0
if "current_quiz" not in st.session_state:
    st.session_state.current_quiz = None
if "quiz_answers" not in st.session_state:
    st.session_state.quiz_answers = {}
if "quiz_submitted" not in st.session_state:
    st.session_state.quiz_submitted = False
if "quiz_score" not in st.session_state:
    st.session_state.quiz_score = None
if "quiz_percentage" not in st.session_state:
    st.session_state.quiz_percentage = None
if "quiz_weak_areas" not in st.session_state:
    st.session_state.quiz_weak_areas = None
if "processed_files" not in st.session_state:
    st.session_state.processed_files = set()
if "uploaded_files_count" not in st.session_state:
    st.session_state.uploaded_files_count = 0

# Step 1: Choose Subject Category
if st.session_state.step == 1:
    st.header("Step 1: Choose Your Subject Category")
    
    categories = config_manager.get_all_subject_categories()
    cat_meta = {
        "programming":      ("💻", "Programming",      "Master coding, algorithms, software development, and data science.", "#EEF2FF", "#4F46E5"),
        "mathematics":      ("🔢", "Mathematics",      "Strengthen your skills in algebra, calculus, statistics, and logical reasoning.",   "#F5F3FF", "#7C3AED"),
        "science":          ("🔬", "Science",          "Understand key concepts in physics, chemistry, biology, and earth sciences.",      "#EEF2FF", "#4F46E5"),
        "languages":        ("🌍", "Languages",        "Enhance grammar, vocabulary, communication, speaking, and writing skills.",  "#F5F3FF", "#7C3AED"),
        "business":         ("💼", "Business",         "Build knowledge in finance, management, marketing, and business strategy.",          "#EEF2FF", "#4F46E5"),
        "test_preparation": ("📝", "Test Preparation", "Prepare smarter for academic, competitive, and professional examinations.",     "#F5F3FF", "#7C3AED"),
    }
    
    cols = st.columns(3)
    for i, category in enumerate(categories):
        icon, name, desc, bg, color = cat_meta.get(category, ("📖", category.title(), "", "#EEF2FF", "#4F46E5"))
        with cols[i % 3]:
            with st.container(border=True):
                st.markdown(f"""
                <div style="padding:6px 0 10px;">
                    <div style="width:48px;height:48px;border-radius:12px;background:{bg};
                                display:flex;align-items:center;justify-content:center;
                                font-size:1.5rem;margin-bottom:14px;">{icon}</div>
                    <div style="font-weight:800;color:#111827;font-size:1.2rem;margin-bottom:6px;">{name}</div>
                    <div style="color:#374151;font-size:0.95rem;line-height:1.55;margin-bottom:14px;min-height:44px;">{desc}</div>
                </div>
                """, unsafe_allow_html=True)
                if st.button(f"Select {name} →", use_container_width=True, key=f"cat_{category}", type="primary"):
                    st.session_state.subject_category = category
                    st.session_state.step = 2
                    st.rerun()

# Step 2: Enter Topic and Learning Details
elif st.session_state.step == 2:
    st.header("Step 2: Tell Us About Your Learning Goals")
    st.subheader(f"Category: {st.session_state.subject_category.title()}")
    
    # Show category info
    category_info = config_manager.get_subject_category_info(st.session_state.subject_category)
    if category_info:
        with st.expander("ℹ️ About this category"):
            st.write(f"**Topics include:** {', '.join(category_info.get('topics', []))}")
            st.write(f"**Typical Duration:** {category_info.get('typical_duration', 'Varies')}")
    
    col1, col2 = st.columns(2)
    
    with col1:
        topic = st.text_input(
            "What specific topic do you want to learn?",
            placeholder="e.g., Python for Data Science, Calculus, Spanish Grammar"
        )
        
        knowledge_levels = config_manager.get_all_knowledge_levels()
        knowledge_level = st.selectbox(
            "What's your current knowledge level?",
            knowledge_levels,
            format_func=lambda x: x.title()
        )
        
        # Show knowledge level info
        level_info = config_manager.get_knowledge_level_info(knowledge_level)
        if level_info:
            st.info(f"**{knowledge_level.title()}:** {level_info.get('description', '')}")
    
    with col2:
        learning_goal = st.text_area(
            "What do you want to achieve?",
            placeholder="e.g., Build a portfolio project, Pass an exam, Get job-ready",
            height=100
        )
        
        time_available = st.selectbox(
            "How much time can you dedicate?",
            ["1-2 hours per week", "3-5 hours per week", "6-10 hours per week", 
             "10+ hours per week", "Full-time (30+ hours per week)"]
        )
        
        learning_styles = config_manager.get_all_learning_styles()
        learning_style = st.selectbox(
            "What's your preferred learning style?",
            learning_styles,
            format_func=lambda x: x.replace('_', ' ').title()
        )
        
        # Show learning style info
        style_info = config_manager.get_learning_style_info(learning_style)
        if style_info:
            st.info(f"**{learning_style.replace('_', ' ').title()}:** {style_info.get('description', '')}")
    
    col_back, col_next = st.columns([1, 5])
    with col_back:
        if st.button("← Back", type="secondary"):
            st.session_state.step = 1
            st.rerun()
    with col_next:
        if st.button("Create My Learning Plan", type="primary", 
                    disabled=not (topic and learning_goal)):
            st.session_state.topic = topic
            st.session_state.knowledge_level = knowledge_level
            st.session_state.learning_goal = learning_goal
            st.session_state.time_available = time_available
            st.session_state.learning_style = learning_style
            st.session_state.step = 3
            st.rerun()

# Step 3: Generate Analysis and Roadmap
elif st.session_state.step == 3:
    st.header("Creating Your Personalized Learning Plan")
    st.subheader(f"Topic: {st.session_state.topic}")
    
    # Initialize handler
    if not st.session_state.handler:
        st.session_state.handler = StudyAssistantHandler(
            topic=st.session_state.topic,
            subject_category=st.session_state.subject_category,
            knowledge_level=st.session_state.knowledge_level,
            learning_goal=st.session_state.learning_goal,
            time_available=st.session_state.time_available,
            learning_style=st.session_state.learning_style,
            model_name=selected_model,
            provider=provider
        )
    
    # Analyze student
    if not st.session_state.student_analysis:
        analysis_results = st.session_state.handler.analyze_student()
    
    # Create roadmap
    if st.session_state.student_analysis and not st.session_state.learning_roadmap:
        roadmap_results = st.session_state.handler.create_roadmap(
            st.session_state.student_analysis
        )
    
    # Find resources
    if st.session_state.learning_roadmap and not st.session_state.learning_resources:
        resource_results = st.session_state.handler.find_resources()
    
    # Move to dashboard when complete
    if (st.session_state.student_analysis and 
        st.session_state.learning_roadmap and 
        st.session_state.learning_resources):
        st.session_state.step = 4
        st.rerun()

# Step 4: Learning Dashboard
elif st.session_state.step == 4:
    st.header("🎯 Your Learning Dashboard")
    
    # Create tabs for different features
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📋 Learning Roadmap", 
        "📚 Resources", 
        "❓ Quiz Generator",
        "🤖 AI Tutor",
        "📄 Document Q&A (RAG)"
    ])
    
    # Tab 1: Learning Roadmap
    with tab1:
        st.subheader("Your Personalized Learning Roadmap")
        
        col1, col2 = st.columns([3, 1])
        with col1:
            st.info(f"**Topic:** {st.session_state.topic} | **Level:** {st.session_state.knowledge_level.title()}")
        with col2:
            if st.button("🔄 Regenerate Roadmap"):
                st.session_state.learning_roadmap = None
                roadmap_results = st.session_state.handler.create_roadmap(
                    st.session_state.student_analysis
                )
                st.rerun()
        
        roadmap_display = st.session_state.learning_roadmap.replace("<br>", "\n")
        st.markdown(roadmap_display)
        
        with st.expander("📊 View Student Analysis"):
            st.markdown(st.session_state.student_analysis)
        
        st.download_button(
            label="📥 Download Roadmap",
            data=f"# Learning Roadmap: {st.session_state.topic}\n\n{st.session_state.learning_roadmap}",
            file_name=f"roadmap_{st.session_state.topic.replace(' ', '_')}.md",
            mime="text/markdown"
        )
    
    # Tab 2: Resources
    with tab2:
        st.subheader("Recommended Learning Resources")
        
        if st.button("🔄 Find New Resources"):
            st.session_state.learning_resources = None
            resource_results = st.session_state.handler.find_resources()
            st.rerun()
        
        st.markdown(st.session_state.learning_resources)
        
        st.download_button(
            label="📥 Download Resources",
            data=f"# Learning Resources: {st.session_state.topic}\n\n{st.session_state.learning_resources}",
            file_name=f"resources_{st.session_state.topic.replace(' ', '_')}.md",
            mime="text/markdown"
        )
    
    # =========================================================
    # Tab 3: Quiz Generator
    # =========================================================
    with tab3:
        st.subheader("🎯 Practice Quiz")

        col1, col2, col3 = st.columns(3)

        with col1:
            difficulty = st.selectbox(
                "Difficulty Level",
                ["beginner", "intermediate", "advanced"],
                index=1,
                key="quiz_difficulty"
            )

        with col2:
            num_questions = st.slider(
                "Number of Questions",
                5,
                20,
                10,
                key="quiz_num_questions"
            )

        with col3:
            focus_areas = st.text_input(
                "Focus Areas (optional)",
                placeholder="e.g., loops, functions",
                key="quiz_focus_areas"
            )

        # =====================================================
        # Generate Quiz
        # =====================================================

        if st.button(
            "🎲 Generate Quiz",
            type="primary",
            use_container_width=True
        ):

            # Reset previous quiz
            st.session_state.current_quiz = None
            st.session_state.quiz_submitted = False
            st.session_state.quiz_answers = {}
            st.session_state.quiz_score = None
            st.session_state.quiz_percentage = None
            st.session_state.quiz_weak_areas = None

            with st.spinner("🤖 AI is preparing your quiz..."):

                quiz_results = st.session_state.handler.generate_quiz(
                    difficulty_level=difficulty,
                    focus_areas=focus_areas if focus_areas else "general",
                    num_questions=num_questions
                )

            if quiz_results.get("quiz"):

                st.session_state.current_quiz = quiz_results["quiz"]

                st.success(
                    "✅ Quiz generated! Select your answers and submit when you're ready."
                )

            else:

                st.error(
                    "❌ Unable to generate the quiz. Please try again."
                )

        # =====================================================
        # Interactive Quiz
        # =====================================================

        if st.session_state.get("current_quiz"):

            quiz = st.session_state.current_quiz
            questions = quiz.get("questions", [])

            if not questions:

                st.error("No questions were generated.")
                st.stop()

            # -------------------------------------------------
            # Taking Quiz
            # -------------------------------------------------

            if not st.session_state.get("quiz_submitted", False):

                st.markdown("---")

                st.subheader("📝 Answer the Questions")

                st.caption(
                    f"{len(questions)} questions • "
                    f"Difficulty: {difficulty}"
                )

                for i, q in enumerate(questions):

                    st.markdown(
                        f"### Question {i + 1} of {len(questions)}"
                    )

                    st.markdown(
                        f"**{q.get('question', 'Question unavailable')}**"
                    )

                    options = q.get("options", {})

                    if not options:
                        st.warning(
                            f"Options are missing for Question {i + 1}."
                        )
                        continue

                    option_keys = list(options.keys())

                    selected = st.radio(
                        "Choose your answer:",
                        option_keys,
                        format_func=lambda x, opts=options:
                            f"{x}) {opts[x]}",
                        key=f"quiz_answer_{i}",
                        index=None
                    )

                    # Store answer
                    st.session_state.quiz_answers[i] = selected

                    st.markdown("---")

                # -------------------------------------------------
                # Submit Quiz
                # -------------------------------------------------

                if st.button(
                    "✅ Submit Quiz",
                    type="primary",
                    use_container_width=True
                ):

                    unanswered = [
                        i + 1
                        for i in range(len(questions))
                        if st.session_state.quiz_answers.get(i) is None
                    ]

                    if unanswered:

                        st.warning(
                            "⚠️ Please answer all questions before submitting."
                        )

                        st.info(
                            "Unanswered questions: "
                            + ", ".join(map(str, unanswered))
                        )

                    else:

                        correct = 0
                        weak_area_stats = {}

                        # -----------------------------------------
                        # Calculate score
                        # -----------------------------------------

                        for i, q in enumerate(questions):

                            user_answer = st.session_state.quiz_answers.get(i)

                            correct_answer = str(
                                q.get("correct_answer", "")
                            ).strip().upper()

                            concept = q.get(
                                "key_concept",
                                "General"
                            )

                            if concept not in weak_area_stats:

                                weak_area_stats[concept] = {
                                    "correct": 0,
                                    "total": 0
                                }

                            weak_area_stats[concept]["total"] += 1

                            if (
                                user_answer
                                and str(user_answer).strip().upper()
                                == correct_answer
                            ):

                                correct += 1

                                weak_area_stats[concept]["correct"] += 1

                        total = len(questions)

                        percentage = (
                            (correct / total) * 100
                            if total > 0
                            else 0
                        )

                        # -----------------------------------------
                        # Store results
                        # -----------------------------------------

                        st.session_state.quiz_score = correct
                        st.session_state.quiz_percentage = percentage
                        st.session_state.quiz_weak_areas = weak_area_stats
                        st.session_state.quiz_submitted = True

                        st.rerun()

            # =====================================================
            # RESULTS
            # =====================================================

            else:

                score = st.session_state.quiz_score
                percentage = st.session_state.quiz_percentage
                weak_area_stats = st.session_state.quiz_weak_areas

                total = len(questions)
                wrong = total - score

                st.markdown("---")

                st.subheader("🎯 Quiz Results")

                # -------------------------------------------------
                # Result metrics
                # -------------------------------------------------

                col1, col2, col3, col4 = st.columns(4)

                with col1:
                    st.metric(
                        "Score",
                        f"{score}/{total}"
                    )

                with col2:
                    st.metric(
                        "Percentage",
                        f"{percentage:.1f}%"
                    )

                with col3:
                    st.metric(
                        "Correct",
                        f"✅ {score}"
                    )

                with col4:
                    st.metric(
                        "Incorrect",
                        f"❌ {wrong}"
                    )

                # -------------------------------------------------
                # Performance message
                # -------------------------------------------------

                if percentage >= 80:

                    st.success(
                        "🎉 Excellent! You have a strong understanding of this topic."
                    )

                elif percentage >= 60:

                    st.info(
                        "👍 Good performance! A little more practice will strengthen your understanding."
                    )

                elif percentage >= 40:

                    st.warning(
                        "📚 You understand some concepts, but several areas need more practice."
                    )

                else:

                    st.error(
                        "⚠️ You need more practice. Focus on the weak areas below."
                    )

                # =================================================
                # Detailed Review
                # =================================================

                st.markdown("---")

                st.subheader("📋 Answer Review")

                for i, q in enumerate(questions):

                    user_answer = st.session_state.quiz_answers.get(i)

                    correct_answer = str(
                        q.get("correct_answer", "")
                    ).strip().upper()

                    options = q.get("options", {})

                    is_correct = (
                        str(user_answer).strip().upper()
                        == correct_answer
                    )

                    # ---------------------------------------------
                    # Correct answer
                    # ---------------------------------------------

                    if is_correct:

                        st.success(
                            f"Question {i + 1} — Correct ✅"
                        )

                        st.markdown(
                            f"**{q.get('question', '')}**"
                        )

                        st.write(
                            f"Your answer: "
                            f"**{user_answer}) {options.get(user_answer, '')}**"
                        )

                    # ---------------------------------------------
                    # Wrong answer
                    # ---------------------------------------------

                    else:

                        st.error(
                            f"Question {i + 1} — Incorrect ❌"
                        )

                        st.markdown(
                            f"**{q.get('question', '')}**"
                        )

                        if user_answer in options:

                            st.write(
                                f"❌ Your answer: "
                                f"**{user_answer}) "
                                f"{options[user_answer]}**"
                            )

                        st.write(
                            f"✅ Correct answer: "
                            f"**{correct_answer}) "
                            f"{options.get(correct_answer, '')}**"
                        )

                        # -----------------------------------------
                        # Explanation
                        # -----------------------------------------

                        explanation = q.get(
                            "explanation",
                            "Explanation is not available."
                        )

                        st.info(
                            f"💡 **Why?**\n\n{explanation}"
                        )

                        st.caption(
                            f"📌 Key Concept: "
                            f"{q.get('key_concept', 'General')}"
                        )

                    st.markdown("---")

                # =================================================
                # Topic-wise Performance
                # =================================================

                st.subheader("📊 Topic-wise Performance")

                weak_topics = []

                for concept, stats in weak_area_stats.items():

                    topic_percentage = (
                        stats["correct"]
                        / stats["total"]
                    ) * 100

                    st.markdown(
                        f"**{concept}** — "
                        f"{stats['correct']}/{stats['total']} "
                        f"({topic_percentage:.1f}%)"
                    )

                    st.progress(
                        min(int(topic_percentage), 100)
                    )

                    # Weak area threshold
                    if topic_percentage < 60:

                        weak_topics.append(
                            (concept, topic_percentage)
                        )

                # =================================================
                # Weak Area Recommendations
                # =================================================

                st.markdown("---")

                st.subheader("🧠 Your Learning Analysis")

                if weak_topics:

                    st.warning(
                        "⚠️ These topics need more attention:"
                    )

                    for concept, topic_percentage in weak_topics:

                        st.write(
                            f"• **{concept}** — "
                            f"{topic_percentage:.1f}%"
                        )

                    st.markdown("### 📚 Recommended Focus")

                    for concept, topic_percentage in weak_topics:

                        if topic_percentage < 40:

                            recommendation = (
                                "Review the fundamentals and "
                                "practice basic questions."
                            )

                        else:

                            recommendation = (
                                "Review the concept and "
                                "practice more application-based questions."
                            )

                        st.write(
                            f"**{concept}:** {recommendation}"
                        )

                else:

                    st.success(
                        "🎉 No major weak areas detected! "
                        "Keep practicing to maintain your performance."
                    )

                # =================================================
                # Retake Quiz
                # =================================================

                st.markdown("---")

                if st.button(
                    "🔄 Take Another Quiz",
                    use_container_width=True
                ):

                    st.session_state.current_quiz = None
                    st.session_state.quiz_submitted = False
                    st.session_state.quiz_answers = {}
                    st.session_state.quiz_score = None
                    st.session_state.quiz_percentage = None
                    st.session_state.quiz_weak_areas = None

                    st.rerun()
    
    # Tab 4: AI Tutor
    with tab4:
        st.subheader("Ask Your AI Tutor")
        st.write("Get personalized explanations and help with your questions.")
        
        question = st.text_area(
            "What would you like help with?",
            placeholder="e.g., Can you explain recursion with an example?",
            height=100
        )
        
        context = st.text_input(
            "Additional context (optional)",
            placeholder="e.g., I'm working on a specific problem..."
        )
        
        if st.button("💬 Ask Tutor", type="primary", disabled=not question):
            with st.spinner("Thinking..."):
                response = st.session_state.handler.get_tutoring(question, context)
                st.session_state.tutor_response = response
        
        if "tutor_response" in st.session_state and st.session_state.tutor_response:
            st.markdown("### 🤖 Tutor Response:")
            st.markdown(st.session_state.tutor_response)
    
    # Tab 5: Document Q&A (RAG)
    with tab5:
        st.subheader("Upload Study Materials & Ask Questions")
        st.write("Upload PDFs or text files and ask questions about them using RAG technology.")
        
        # File upload section
        col1, col2 = st.columns([2, 1])
        with col1:
            uploaded_files = st.file_uploader(
                "Upload study materials (PDF or TXT)",
                type=["pdf", "txt"],
                accept_multiple_files=True
            )
        
        with col2:
            if st.session_state.handler:
                chunk_count = st.session_state.handler.get_document_count()
                file_count = st.session_state.get("uploaded_files_count", 0)

                st.metric("Uploaded Files", file_count)
                st.metric("Text Chunks", chunk_count)
                
                if chunk_count > 0 and st.button("🗑️ Clear All Documents"):
                    st.session_state.handler.clear_documents()
                    st.session_state.uploaded_files_count = 0
                    st.session_state.processed_files = set()
                    st.session_state.rag_answer = ""
                    st.success("Documents cleared!")
                    st.rerun()
        
        # Process uploaded files only once
        if uploaded_files:
            for uploaded_file in uploaded_files:
                # Unique ID for the uploaded file
                file_id = f"{uploaded_file.name}_{uploaded_file.size}"

                # Skip if this file was already processed
                if file_id in st.session_state.processed_files:
                    continue

                # Temporary file path
                temp_path = f"./temp_{uploaded_file.name}"

                try:

                    # Save uploaded file temporarily
                    with open(temp_path, "wb") as f:
                        f.write(uploaded_file.getbuffer())

                    # Determine file type
                    file_type = (
                        "pdf"
                        if uploaded_file.name.lower().endswith(".pdf")
                        else "text"
                    )

                    # Add document to RAG
                    success = st.session_state.handler.add_document_to_rag(
                        temp_path,
                        file_type
                    )

                    if success:

                        # Remember that this file has been processed
                        st.session_state.processed_files.add(file_id)

                        # Count actual uploaded files
                        st.session_state.uploaded_files_count += 1

                        st.success(
                            f"✅ Loaded: {uploaded_file.name}"
                        )

                    else:

                        st.error(
                            f"❌ Failed to load: {uploaded_file.name}"
                        )

                except Exception as e:

                    st.error(
                        f"❌ Error loading {uploaded_file.name}: {e}"
                    )

                finally:

                    # Always remove temporary file
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
        
        st.divider()
        
        # Question answering section
        if st.session_state.handler and st.session_state.handler.get_document_count() > 0:
            st.markdown("### 💡 Ask Questions About Your Documents")
            
            doc_question = st.text_area(
                "What would you like to know?",
                placeholder="e.g., What are the key concepts in chapter 3?",
                height=100,
                key="doc_question"
            )
            
            if st.button("🔍 Search Documents", type="primary", disabled=not doc_question):
                with st.spinner("Searching documents..."):
                    answer = st.session_state.handler.query_documents(doc_question)
                    st.session_state.rag_answer = answer
            
            if "rag_answer" in st.session_state and st.session_state.rag_answer:
                st.markdown("### 📖 Answer from Your Documents:")
                st.markdown(st.session_state.rag_answer)
        else:
            st.info("📤 Upload documents above to start asking questions!")
    
    # Bottom navigation
    st.divider()
    if st.button("🏠 Start New Learning Plan"):
        # Clear session state
        keys_to_clear = [k for k in st.session_state.keys() if k != "step"]
        for key in keys_to_clear:
            del st.session_state[key]
        st.session_state.step = 1
        st.rerun()

if __name__ == "__main__":
    pass
