import os
import sys
import json
import re
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

# Ensure project root is in python path to import existing agent modules cleanly
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from agent_handler import StudyAssistantHandler
from rag_helper import RAGHelper
from study_agents import StudyAgents, RobustDuckDuckGo
from backend.database.connection import get_db_collection
from backend.utils.quiz_utils import shuffle_question_options, shuffle_quiz_questions


class AIBridgeService:
    """
    Singleton AI Service Bridge bridging FastAPI backend with existing AI & RAG components.
    Ensures model caching, single initialization of local FLAN-T5-small model,
    batch quiz generation, and non-duplicate document indexing.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIBridgeService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        print("========================================")
        print("Initializing AI Service Bridge...")
        print("========================================")
        self.rag_helper = RAGHelper(collection_name="study_materials")
        self.handlers_cache: Dict[str, StudyAssistantHandler] = {}
        
        # Pre-initialize local FLAN-T5 model on service start
        self.local_qa_handler = StudyAssistantHandler(
            topic="General",
            subject_category="General",
            knowledge_level="Intermediate",
            learning_goal="Document Q&A",
            time_available="1 hour",
            learning_style="Visual",
            provider="groq"
        )
        self.local_qa_handler.rag_helper = self.rag_helper
        try:
            print("🚀 Pre-loading local FLAN-T5-small model for Document Q&A...")
            self.local_qa_handler.initialize_local_qa()
        except Exception as e:
            print(f"⚠️ Warning during initial FLAN-T5 load: {e}")

    def get_handler(
        self,
        topic: str = "General Science",
        subject_category: str = "General",
        knowledge_level: str = "Intermediate",
        learning_goal: str = "Master topic",
        time_available: str = "2 hours",
        learning_style: str = "Visual",
        provider: str = "groq",
        model_name: str = "llama-3.3-70b-versatile"
    ) -> StudyAssistantHandler:
        cache_key = f"{topic}_{subject_category}_{knowledge_level}_{learning_goal}_{time_available}_{learning_style}_{provider}_{model_name}"
        if cache_key not in self.handlers_cache:
            handler = StudyAssistantHandler(
                topic=topic,
                subject_category=subject_category,
                knowledge_level=knowledge_level,
                learning_goal=learning_goal,
                time_available=time_available,
                learning_style=learning_style,
                model_name=model_name,
                provider=provider
            )
            handler.rag_helper = self.rag_helper
            handler.local_qa_model = self.local_qa_handler.local_qa_model
            handler.local_qa_tokenizer = self.local_qa_handler.local_qa_tokenizer
            self.handlers_cache[cache_key] = handler
        return self.handlers_cache[cache_key]

    # ========================================================
    # 1. AI TUTOR CHAT
    # ========================================================
    def chat_tutor(
        self,
        message: str,
        topic: str = "General Study",
        subject_category: str = "General",
        knowledge_level: str = "Intermediate",
        learning_style: str = "Visual"
    ) -> str:
        handler = self.get_handler(
            topic=topic,
            subject_category=subject_category,
            knowledge_level=knowledge_level,
            learning_style=learning_style
        )
        return handler.get_tutoring(student_question=message)

    # ========================================================
    # 1.1 AI MISTAKE ANALYZER & MISCONCEPTION DIAGNOSTIC
    # ========================================================
    def analyze_mistake(
        self,
        question: str,
        student_answer: str,
        correct_answer: str,
        topic: str = "General",
        difficulty: str = "medium",
        options: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Diagnoses an incorrect quiz answer to extract the technical explanation,
        possible conceptual misunderstanding, correct concept, and recommended practice.
        Uses strictly objective, non-psychological phrasing.
        """
        options_text = ""
        if options and isinstance(options, dict):
            options_text = " | ".join([f"{k}: {v}" for k, v in options.items()])

        student_opt_text = student_answer
        correct_opt_text = correct_answer
        if options and isinstance(options, dict):
            if student_answer in options:
                student_opt_text = f"Option {student_answer} ('{options[student_answer]}')"
            if correct_answer in options:
                correct_opt_text = f"Option {correct_answer} ('{options[correct_answer]}')"

        prompt = f"""
You are an expert AI Diagnostic Tutor analyzing a student's mistake on a study question.

QUESTION: {question}
TOPIC: {topic}
DIFFICULTY: {difficulty}
AVAILABLE OPTIONS: {options_text}
STUDENT ANSWER: {student_opt_text}
CORRECT ANSWER: {correct_opt_text}

Analyze WHY this mistake might have occurred from a conceptual standpoint.
DO NOT use psychological assertions (e.g. do not say "The student was careless" or "The student panicked").
Use strictly conceptual terms like "The answer suggests...", "Possible misconception...", "Likely confusing X with Y".

Return ONLY a valid JSON object with EXACTLY these 5 fields:
{{
  "explanation": "Clear explanation of why the correct answer is right and why the student choice is incorrect.",
  "possible_misconception": "Objective identification of the likely conceptual confusion (e.g. 'The answer suggests confusing X with Y').",
  "correct_concept": "Concise statement of the accurate foundational rule or principle.",
  "recommended_action": "Specific conceptual action to review.",
  "practice_recommendation": "Concrete practice task (e.g. 'Complete 3 targeted practice questions on {topic}')."
}}
"""
        try:
            handler = self.get_handler(topic=topic, knowledge_level="Intermediate")
            tutor_agent = handler.agents.tutor_agent()
            resp = tutor_agent.run(prompt, stream=False)
            content = resp.content.strip()

            if content.startswith("```json"):
                content = content[7:].strip()
            elif content.startswith("```"):
                content = content[3:].strip()
            if content.endswith("```"):
                content = content[:-3].strip()

            start = content.find("{")
            end = content.rfind("}")
            if start != -1 and end != -1:
                json_str = content[start:end + 1]
                data = json.loads(json_str)
                if "explanation" in data and "possible_misconception" in data:
                    return {
                        "explanation": data.get("explanation", "").strip(),
                        "possible_misconception": data.get("possible_misconception", "").strip(),
                        "correct_concept": data.get("correct_concept", f"Correctly applying {topic} principles.").strip(),
                        "recommended_action": data.get("recommended_action", f"Review core rules of {topic}.").strip(),
                        "practice_recommendation": data.get("practice_recommendation", f"Complete 3 practice questions on {topic}.").strip()
                    }
        except Exception as e:
            print(f"⚠️ Warning during AI mistake analysis ({e}). Using resilient diagnostic fallback.")

        # Fallback diagnostic
        return {
            "explanation": f"The correct answer is '{correct_opt_text}'. {student_opt_text} does not satisfy the requirements of this question in {topic}.",
            "possible_misconception": f"The answer suggests an incomplete or confused understanding of the distinction between standard operations in {topic}.",
            "correct_concept": f"Foundational mastery of {topic} requires verifying the specific conditions under which {correct_opt_text} applies.",
            "recommended_action": f"Review key definitions, syntax, and examples for {topic}.",
            "practice_recommendation": f"Complete 3 targeted practice questions covering {topic}."
        }

    # ========================================================
    # 2. QUIZ GENERATION (WITH BATCHING REUSE)
    # ========================================================
    def generate_quiz(
        self,
        topic: str,
        difficulty_level: str = "intermediate",
        focus_areas: str = "general concepts",
        num_questions: int = 10,
        subject_category: str = "General",
        knowledge_level: str = "Intermediate"
    ) -> List[Dict[str, Any]]:
        handler = self.get_handler(
            topic=topic,
            subject_category=subject_category,
            knowledge_level=knowledge_level
        )
        res = handler.generate_quiz(
            difficulty_level=difficulty_level,
            focus_areas=focus_areas,
            num_questions=num_questions
        )
        quiz_data = res.get("quiz")
        if quiz_data and "questions" in quiz_data:
            return shuffle_quiz_questions(quiz_data["questions"])
        
        # Fallback generator if AI returned empty structured payload
        return shuffle_quiz_questions(self._generate_fallback_quiz(topic, num_questions))

    def _generate_fallback_quiz(self, topic: str, count: int) -> List[Dict[str, Any]]:
        questions = []
        for i in range(1, count + 1):
            questions.append({
                "id": i,
                "question": f"Question {i}: What is a fundamental core concept of {topic}?",
                "options": {
                    "A": f"Primary principle of {topic}",
                    "B": f"Unrelated secondary feature",
                    "C": f"Obsolete theory",
                    "D": f"Incorrect assumption"
                },
                "correct_answer": "A",
                "explanation": f"Option A represents the primary foundational concept of {topic}.",
                "key_concept": f"{topic} Core Principles",
                "topic": topic,
                "difficulty": "medium"
            })
        return questions

    # ========================================================
    # 2.0.1 ADAPTIVE PERSONALIZED QUIZ GENERATION
    # ========================================================
    def generate_adaptive_quiz(
        self,
        subject: str,
        topics: Optional[List[str]] = None,
        num_questions: int = 10,
        adaptive_context: Optional[Dict[str, Any]] = None,
        base_difficulty: str = "intermediate"
    ) -> Dict[str, Any]:
        """
        Generates an adaptive quiz dynamically prioritizing weak topics (~60%),
        moderate topics (~30%), and strong topics (~10%) with difficulty-mapped questions.
        """
        weak_topics = adaptive_context.get("weak_topics", []) if adaptive_context else []
        moderate_topics = adaptive_context.get("moderate_topics", []) if adaptive_context else []
        strong_topics = adaptive_context.get("strong_topics", []) if adaptive_context else []

        # If user explicitly passed topics and no assessment, categorize or distribute them
        all_candidate_topics = [t.strip() for t in (topics or []) if t and t.strip()]
        if not weak_topics and not moderate_topics and not strong_topics:
            if all_candidate_topics:
                weak_topics = all_candidate_topics[:max(1, len(all_candidate_topics) // 2)]
                moderate_topics = all_candidate_topics[max(1, len(all_candidate_topics) // 2):]
            else:
                weak_topics = [f"{subject} Fundamentals"]
                moderate_topics = [f"{subject} Practical Application"]

        # Compute quota: ~60% weak, ~30% moderate, ~10% strong
        weak_count = 0
        mod_count = 0
        strong_count = 0

        if weak_topics and moderate_topics and strong_topics:
            weak_count = max(1, round(num_questions * 0.6))
            mod_count = max(1, round(num_questions * 0.3))
            strong_count = max(1, num_questions - weak_count - mod_count)
        elif weak_topics and moderate_topics:
            weak_count = max(1, round(num_questions * 0.65))
            mod_count = max(1, num_questions - weak_count)
        elif weak_topics and strong_topics:
            weak_count = max(1, round(num_questions * 0.75))
            strong_count = max(1, num_questions - weak_count)
        elif weak_topics:
            weak_count = num_questions
        elif moderate_topics:
            mod_count = num_questions
        elif strong_topics:
            strong_count = num_questions
        else:
            weak_count = num_questions
            weak_topics = [subject]

        # Adjust total sum to match exactly num_questions
        total_assigned = weak_count + mod_count + strong_count
        if total_assigned < num_questions:
            weak_count += (num_questions - total_assigned)
        elif total_assigned > num_questions:
            diff = total_assigned - num_questions
            if weak_count > diff:
                weak_count -= diff
            elif mod_count > diff:
                mod_count -= diff

        # Build execution queue: (topic, count, starting_difficulty, category)
        queue = []
        if weak_topics and weak_count > 0:
            per_t = max(1, weak_count // len(weak_topics))
            for i, t in enumerate(weak_topics):
                c = (weak_count - (per_t * (len(weak_topics) - 1))) if i == len(weak_topics) - 1 else per_t
                if c > 0:
                    queue.append((t, c, "easy", "Weak Topic (Priority)"))

        if moderate_topics and mod_count > 0:
            per_t = max(1, mod_count // len(moderate_topics))
            for i, t in enumerate(moderate_topics):
                c = (mod_count - (per_t * (len(moderate_topics) - 1))) if i == len(moderate_topics) - 1 else per_t
                if c > 0:
                    queue.append((t, c, "medium", "Moderate Topic (Reinforce)"))

        if strong_topics and strong_count > 0:
            per_t = max(1, strong_count // len(strong_topics))
            for i, t in enumerate(strong_topics):
                c = (strong_count - (per_t * (len(strong_topics) - 1))) if i == len(strong_topics) - 1 else per_t
                if c > 0:
                    queue.append((t, c, "hard", "Strong Topic (Maintenance)"))

        questions: List[Dict[str, Any]] = []
        q_id = 1
        for topic_name, count, target_diff, category_label in queue:
            try:
                topic_qs = self.generate_quiz(
                    topic=f"{topic_name} ({subject})",
                    difficulty_level=target_diff,
                    focus_areas=f"Adaptive remediation on {topic_name}",
                    num_questions=count,
                    subject_category=subject
                )
                for q in topic_qs:
                    questions.append({
                        "id": q_id,
                        "question": q.get("question", f"What is the key principle of {topic_name}?"),
                        "options": q.get("options", {
                            "A": f"Primary optimal pattern for {topic_name}",
                            "B": "Sub-optimal secondary approach",
                            "C": "Invalid assumption",
                            "D": "Outdated convention"
                        }),
                        "correct_answer": q.get("correct_answer", "A"),
                        "explanation": q.get("explanation", f"Understanding {topic_name} is essential for addressing skill gaps."),
                        "key_concept": q.get("key_concept", topic_name),
                        "topic": topic_name,
                        "difficulty": target_diff
                    })
                    q_id += 1
            except Exception as e:
                print(f"⚠️ Error generating adaptive questions for {topic_name}: {e}")
                for _ in range(count):
                    questions.append({
                        "id": q_id,
                        "question": f"Which statement best applies to solving challenges in {topic_name} ({target_diff} level)?",
                        "options": {
                            "A": f"Applying verified best practices in {topic_name}",
                            "B": f"Ignoring edge cases in {topic_name}",
                            "C": "Using deprecated syntax",
                            "D": "None of the above"
                        },
                        "correct_answer": "A",
                        "explanation": f"Foundational mastery of {topic_name} requires correctly understanding core rules.",
                        "key_concept": topic_name,
                        "topic": topic_name,
                        "difficulty": target_diff
                    })
                    q_id += 1

        final_questions = shuffle_quiz_questions(questions[:num_questions])

        return {
            "questions": final_questions,
            "adaptive": True,
            "adaptive_meta": {
                "weak_topics": weak_topics,
                "moderate_topics": moderate_topics,
                "strong_topics": strong_topics,
                "weak_questions_count": weak_count,
                "moderate_questions_count": mod_count,
                "strong_questions_count": strong_count,
                "distribution_ratio": f"{weak_count} Weak / {mod_count} Moderate / {strong_count} Strong"
            }
        }

    # ========================================================
    # 2.1 SKILL GAP ASSESSMENT QUESTION GENERATION
    # ========================================================
    def generate_skill_assessment(
        self,
        subject: str,
        learning_goal: str = "Master core concepts",
        topics: Optional[List[str]] = None,
        difficulty_level: str = "intermediate",
        num_questions: int = 10
    ) -> Dict[str, Any]:
        """
        Generates structured multi-topic assessment questions to evaluate skill gaps across sub-topics.
        """
        # Determine topics list
        selected_topics = [t.strip() for t in (topics or []) if t and t.strip()]
        if not selected_topics:
            # Derive 3 default subtopics based on subject
            selected_topics = [f"{subject} Fundamentals", f"{subject} Applications", f"{subject} Advanced Concepts"]

        questions: List[Dict[str, Any]] = []
        questions_per_topic = max(1, num_questions // len(selected_topics))
        
        q_id = 1
        for idx, current_topic in enumerate(selected_topics):
            # For the last topic, assign any remaining question count
            count_for_this = (num_questions - len(questions)) if idx == len(selected_topics) - 1 else questions_per_topic
            if count_for_this <= 0:
                continue

            try:
                topic_questions = self.generate_quiz(
                    topic=f"{current_topic} ({subject})",
                    difficulty_level=difficulty_level,
                    focus_areas=learning_goal,
                    num_questions=count_for_this,
                    subject_category=subject
                )
                for q in topic_questions:
                    questions.append({
                        "id": q_id,
                        "question": q.get("question", f"What is key about {current_topic}?"),
                        "options": q.get("options", {
                            "A": f"Primary principle of {current_topic}",
                            "B": "Distractor option B",
                            "C": "Distractor option C",
                            "D": "Distractor option D"
                        }),
                        "correct_answer": q.get("correct_answer", "A"),
                        "topic": current_topic,
                        "difficulty": difficulty_level,
                        "explanation": q.get("explanation", f"Understanding {current_topic} is essential for {learning_goal}.")
                    })
                    q_id += 1
            except Exception as e:
                print(f"⚠️ Error generating questions for topic {current_topic}: {e}")
                # Add fallback for this topic
                for i in range(count_for_this):
                    questions.append({
                        "id": q_id,
                        "question": f"Which statement best describes standard practices in {current_topic}?",
                        "options": {
                            "A": f"It establishes optimal workflows for {current_topic}.",
                            "B": f"It is an obsolete pattern rarely applied in {subject}.",
                            "C": f"It has no relation to {learning_goal}.",
                            "D": "None of the above."
                        },
                        "correct_answer": "A",
                        "topic": current_topic,
                        "difficulty": difficulty_level,
                        "explanation": f"Core competency in {current_topic} requires adhering to best practices in {subject}."
                    })
                    q_id += 1

        return {
            "subject": subject,
            "learning_goal": learning_goal,
            "topics": selected_topics,
            "questions": shuffle_quiz_questions(questions[:num_questions])
        }



    # ========================================================
    # 4. RESOURCE FINDER
    # ========================================================
    def search_resources(
        self,
        topic: str,
        skill: str = "",
        learning_goal: str = "",
        difficulty: str = "Intermediate",
        learning_preference: str = "Visual"
    ) -> List[Dict[str, Any]]:
        query_term = f"{topic} {skill}".strip() if skill else topic.strip()
        full_topic = f"{topic.strip()} - {skill.strip()}" if skill.strip() else topic.strip()
        
        resources: List[Dict[str, Any]] = []
        seen_urls = set()
        seen_titles = set()

        def add_resource(item: Dict[str, Any]):
            url = str(item.get("url", "")).strip()
            title = str(item.get("title", "")).strip()
            normalized_title = title.lower().strip()
            
            # Filter dummy tool error strings
            if not url or not title:
                return
            if "temporarily unavailable" in normalized_title or "search tool unavailable" in normalized_title:
                return
            if normalized_title.startswith("curated resources for"):
                return
            
            if url in seen_urls or normalized_title in seen_titles:
                return
                
            seen_urls.add(url)
            seen_titles.add(normalized_title)
            
            res_type = item.get("type", "Article")
            if "video" in title.lower() or "youtube" in url.lower() or "course" in title.lower():
                res_type = "Video Course"
            elif "github" in url.lower() or "code" in title.lower() or "interactive" in title.lower() or "codepen" in url.lower():
                res_type = "Interactive Code"
            elif "docs" in url.lower() or "documentation" in title.lower() or "guide" in title.lower() or "devdocs" in url.lower():
                res_type = "Documentation"
            elif "tutorial" in title.lower() or "roadmap" in url.lower():
                res_type = "Tutorial"

            resources.append({
                "title": title,
                "description": item.get("description", f"High quality study guide and documentation covering {full_topic}."),
                "url": url if url.startswith("http") else f"https://duckduckgo.com/?q={query_term.replace(' ', '+')}",
                "type": res_type,
                "difficulty": item.get("difficulty", difficulty),
                "topic": item.get("topic", full_topic)
            })

        # 1. First attempt web search via DuckDuckGo
        try:
            search_tool = RobustDuckDuckGo()
            raw_json = search_tool.duckduckgo_search(query_term, max_results=8)
            try:
                items = json.loads(raw_json)
                if isinstance(items, list):
                    for idx, item in enumerate(items):
                        t = item.get("title", f"{topic} Resource {idx+1}")
                        u = item.get("href", "")
                        b = item.get("body", f"Comprehensive study guide and documentation covering {topic}.")
                        if u and not u.startswith("https://duckduckgo.com/?q="):
                            add_resource({
                                "title": t,
                                "description": b,
                                "url": u,
                                "type": "Article",
                                "difficulty": difficulty,
                                "topic": full_topic
                            })
            except Exception:
                pass
        except Exception as e:
            print(f"⚠️ Web search error: {e}")

        # 2. If fewer than 5 resources from web search, invoke AI generator to reach at least 6-8 resources
        if len(resources) < 5:
            try:
                ai_items = self._generate_ai_resources(
                    topic=topic,
                    skill=skill,
                    learning_goal=learning_goal,
                    difficulty=difficulty,
                    learning_preference=learning_preference
                )
                for item in ai_items:
                    add_resource(item)
            except Exception as e:
                print(f"⚠️ AI resource generation fallback exception: {e}")

        # 3. If still fewer than 5 resources, supplement from curated domain fallback
        if len(resources) < 5:
            fallback_items = self._generate_curated_fallback_resources(
                topic=topic,
                skill=skill,
                difficulty=difficulty,
                learning_preference=learning_preference
            )
            for item in fallback_items:
                add_resource(item)
                if len(resources) >= 6:
                    break

        return resources

    def _generate_ai_resources(
        self,
        topic: str,
        skill: str = "",
        learning_goal: str = "",
        difficulty: str = "Intermediate",
        learning_preference: str = "Visual"
    ) -> List[Dict[str, Any]]:
        focus_str = f" with special focus on '{skill}'" if skill else ""
        full_topic = f"{topic.strip()} - {skill.strip()}" if skill.strip() else topic.strip()
        prompt = f"""
You are an expert Educational Resource Curator and Academic Advisor.
Generate a structured list of exactly 6 to 8 diverse, high-quality, and authentic learning resources for the topic '{topic}'{focus_str}.

STUDENT REQUIREMENTS:
- Target Knowledge / Difficulty Level: {difficulty}
- Preferred Learning Style: {learning_preference}
- Learning Goal: {learning_goal or f"Master foundational to advanced concepts of {topic}"}

RESOURCE CRITERIA:
1. Provide authentic, real-world learning materials, official documentation portals, authoritative guides, interactive platforms, and video courses (e.g. Official Documentation, MDN Web Docs, DevDocs, freeCodeCamp, GeeksforGeeks, W3Schools, Coursera, edX, MIT OpenCourseWare, Khan Academy, Real Python, Kaggle, GitHub repositories, or official tutorial tracks).
2. DO NOT fabricate broken or non-existent URLs. Use real, authoritative root or section URLs.
3. Ensure diverse resource types including "Documentation", "Video Course", "Interactive Code", "Article", "Tutorial", and "Practice Platform".
4. Provide realistic, concise descriptions (20-45 words) explaining what makes the resource essential.

Return ONLY a valid JSON array of objects with the exact schema below:
[
  {{
    "title": "Clear and descriptive resource title",
    "description": "Concise description of the resource content and why it benefits the learner.",
    "url": "https://...",
    "type": "Documentation",
    "difficulty": "{difficulty}",
    "topic": "{full_topic}"
  }}
]
"""
        try:
            handler = self.get_handler(topic=topic, knowledge_level=difficulty, learning_style=learning_preference)
            resource_finder = handler.agents.resource_finder_agent()
            resp = resource_finder.run(prompt, stream=False)
            content = resp.content.strip()

            if content.startswith("```json"):
                content = content[7:].strip()
            elif content.startswith("```"):
                content = content[3:].strip()
            if content.endswith("```"):
                content = content[:-3].strip()

            start = content.find("[")
            end = content.rfind("]")
            if start != -1 and end != -1:
                json_str = content[start:end + 1]
                data = json.loads(json_str)
                if isinstance(data, list) and len(data) > 0:
                    valid_items = []
                    for item in data:
                        if isinstance(item, dict) and item.get("title") and item.get("url"):
                            valid_items.append({
                                "title": str(item.get("title", "")).strip(),
                                "description": str(item.get("description", f"Comprehensive study resource covering {full_topic}.")).strip(),
                                "url": str(item.get("url", "")).strip(),
                                "type": str(item.get("type", "Documentation")).strip(),
                                "difficulty": str(item.get("difficulty", difficulty)).strip(),
                                "topic": str(item.get("topic", full_topic)).strip()
                            })
                    if valid_items:
                        return valid_items
        except Exception as e:
            print(f"⚠️ Note: AI Resource generator encountered exception ({e}). Falling back to curated database.")
        
        return []

    def _generate_curated_fallback_resources(
        self,
        topic: str,
        skill: str = "",
        difficulty: str = "Intermediate",
        learning_preference: str = "Visual"
    ) -> List[Dict[str, Any]]:
        clean_topic = topic.strip()
        sub_focus = f" - {skill.strip()}" if skill.strip() else ""
        full_topic = f"{clean_topic}{sub_focus}"
        encoded_query = f"{clean_topic}+{skill}".strip().replace(" ", "+") if skill else clean_topic.replace(" ", "+")

        return [
            {
                "title": f"Official Documentation & Reference: {clean_topic}",
                "description": f"Authoritative reference manual, standard API conventions, and syntax guides covering {full_topic}.",
                "url": f"https://devdocs.io/#q={encoded_query}",
                "type": "Documentation",
                "difficulty": difficulty,
                "topic": full_topic
            },
            {
                "title": f"FreeCodeCamp Interactive Study Guide: {clean_topic}",
                "description": f"Hands-on interactive tutorials, real-world walkthroughs, and code challenges exploring {full_topic}.",
                "url": f"https://www.freecodecamp.org/news/search/?query={encoded_query}",
                "type": "Interactive Code",
                "difficulty": difficulty,
                "topic": full_topic
            },
            {
                "title": f"Video Lecture Series & Full Course: {clean_topic}",
                "description": f"In-depth video tutorials, architectural walkthroughs, and visual demonstrations covering {full_topic}.",
                "url": f"https://www.youtube.com/results?search_query={encoded_query}+full+course+tutorial",
                "type": "Video Course",
                "difficulty": difficulty,
                "topic": full_topic
            },
            {
                "title": f"GeeksforGeeks Concept Deep Dive & Code Patterns: {clean_topic}",
                "description": f"Step-by-step algorithms, implementation patterns, cheat sheets, and edge-case handling for {full_topic}.",
                "url": f"https://www.geeksforgeeks.org/search/?q={encoded_query}",
                "type": "Article",
                "difficulty": difficulty,
                "topic": full_topic
            },
            {
                "title": f"Open Source Repositories & Real-World Code: {clean_topic}",
                "description": f"Production-grade templates, starter kits, and community open-source implementations for {full_topic}.",
                "url": f"https://github.com/topics/{clean_topic.lower().replace(' ', '-')}",
                "type": "Interactive Code",
                "difficulty": difficulty,
                "topic": full_topic
            },
            {
                "title": f"Roadmap & Visual Learning Path: {clean_topic}",
                "description": f"Structured milestones, prerequisite checks, and mastery checkpoints for modern {full_topic} developers.",
                "url": "https://roadmap.sh",
                "type": "Tutorial",
                "difficulty": difficulty,
                "topic": full_topic
            }
        ]

    # ========================================================
    # 5. ROADMAP GENERATION
    # ========================================================
    def generate_roadmap(
        self,
        goal: str,
        current_skill_level: str = "Beginner",
        target_skill: str = "Advanced",
        available_study_time: str = "5 hours/week",
        preferred_learning_style: str = "Visual",
        skill_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        handler = self.get_handler(
            topic=goal,
            knowledge_level=current_skill_level,
            learning_goal=target_skill,
            time_available=available_study_time,
            learning_style=preferred_learning_style
        )
        
        # Build student analysis incorporating skill assessment context if available
        if skill_context and (skill_context.get("weak_topics") or skill_context.get("moderate_topics") or skill_context.get("strong_topics")):
            weak_list = [f"- {t} ({skill_context.get('topic_scores', {}).get(t, 0)}% — Weak)" for t in skill_context.get("weak_topics", [])]
            mod_list = [f"- {t} ({skill_context.get('topic_scores', {}).get(t, 0)}% — Moderate)" for t in skill_context.get("moderate_topics", [])]
            strong_list = [f"- {t} ({skill_context.get('topic_scores', {}).get(t, 0)}% — Strong)" for t in skill_context.get("strong_topics", [])]
            
            weak_str = "\n".join(weak_list) if weak_list else "None identified."
            mod_str = "\n".join(mod_list) if mod_list else "None identified."
            strong_str = "\n".join(strong_list) if strong_list else "None identified."
            
            analysis = (
                f"Student goal: Master {goal} starting from {current_skill_level} to reach {target_skill}.\n"
                f"Available time: {available_study_time}, Learning preference: {preferred_learning_style}.\n\n"
                f"=== LATEST SKILL GAP ASSESSMENT PROFILE ===\n"
                f"Assessed Domain: {skill_context.get('assessment_subject', goal)}\n\n"
                f"WEAK TOPICS (HIGHEST LEARNING PRIORITY):\n{weak_str}\n\n"
                f"MODERATE TOPICS (MEDIUM PRIORITY / REINFORCE):\n{mod_str}\n\n"
                f"STRONG TOPICS (MAINTENANCE / ACCELERATED REVIEW):\n{strong_str}\n\n"
                f"CRITICAL INSTRUCTIONS:\n"
                f"1. Design early, intensive milestones around WEAK topics. Tag tasks with '[HIGH PRIORITY]'.\n"
                f"2. Schedule practical reinforcement for MODERATE topics. Tag tasks with '[MEDIUM PRIORITY]'.\n"
                f"3. Do NOT repeat beginner basics for STRONG topics; assign maintenance checks & advanced extensions. Tag tasks with '[MAINTENANCE]'.\n"
                f"4. Include an explanation in the overview explaining why weak areas were prioritized."
            )
            
            fallback_roadmap = self._generate_personalized_fallback_roadmap(goal, skill_context, current_skill_level, target_skill, available_study_time)
        else:
            analysis = f"Student wants to master {goal} starting from {current_skill_level} to reach {target_skill}."
            fallback_roadmap = (
                f"# Learning Roadmap: {goal}\n\n"
                f"**Target Level:** {target_skill} | **Pace:** {available_study_time}\n\n"
                f"### Phase 1: Foundational Core\n- Basic principles and setup\n- Core concepts overview\n\n"
                f"### Phase 2: Practical Application\n- Hands-on exercises and workflows\n- Building standard projects\n\n"
                f"### Phase 3: Advanced Mastery\n- Complex challenges and performance optimization\n- Milestone capstone review\n"
            )

        rm_res = handler.create_roadmap(student_analysis=analysis)
        roadmap_content = rm_res.get("roadmap", fallback_roadmap)
        
        return {
            "roadmap_markdown": roadmap_content,
            "topic": goal
        }

    def _generate_personalized_fallback_roadmap(
        self,
        goal: str,
        skill_context: Dict[str, Any],
        current_skill: str,
        target_skill: str,
        time_available: str
    ) -> str:
        weak_topics = skill_context.get("weak_topics", [])
        mod_topics = skill_context.get("moderate_topics", [])
        strong_topics = skill_context.get("strong_topics", [])
        topic_scores = skill_context.get("topic_scores", {})
        
        weak_desc = ", ".join([f"{t} ({topic_scores.get(t, 0)}%)" for t in weak_topics]) if weak_topics else "None"
        mod_desc = ", ".join([f"{t} ({topic_scores.get(t, 0)}%)" for t in mod_topics]) if mod_topics else "None"
        strong_desc = ", ".join([f"{t} ({topic_scores.get(t, 0)}%)" for t in strong_topics]) if strong_topics else "None"

        md = [
            f"# Personalized Learning Roadmap: {goal}",
            f"**Target Mastery:** {target_skill} | **Study Commitment:** {time_available}\n",
            f"### 🎯 Skill Gap Personalization Overview",
            f"This roadmap is customized based on your latest Skill Gap Assessment:",
            f"- **[HIGH PRIORITY] Priority Focus (Weak Areas):** {weak_desc}",
            f"- **[MEDIUM PRIORITY] Reinforcement (Moderate Areas):** {mod_desc}",
            f"- **[MAINTENANCE] Maintenance (Strong Areas):** {strong_desc}\n",
        ]

        phase_num = 1
        if weak_topics:
            md.append(f"### Phase {phase_num}: Deep Dive into Skill Gaps `[HIGH PRIORITY]`")
            md.append(f"*Estimated Time: 3-4 Weeks | Focus: Remediating critical knowledge gaps*")
            for t in weak_topics:
                md.append(f"- **{t} Mastery**: Targeted exercises, core pattern drills, and concept breakdown (Score: {topic_scores.get(t, 0)}%).")
            md.append("- **Milestone Check**: Complete a targeted quiz on weak areas to verify mastery >= 75%.\n")
            phase_num += 1

        if mod_topics:
            md.append(f"### Phase {phase_num}: Skill Reinforcement & Intermediate Projects `[MEDIUM PRIORITY]`")
            md.append(f"*Estimated Time: 2-3 Weeks | Focus: Solidifying applied workflows*")
            for t in mod_topics:
                md.append(f"- **{t} Application**: Intermediate problem sets, debugging, and real-world scenario challenges (Score: {topic_scores.get(t, 0)}%).")
            md.append("- **Milestone Check**: Build an integrated module utilizing these skills.\n")
            phase_num += 1

        if strong_topics:
            md.append(f"### Phase {phase_num}: Advanced Integration & Maintenance `[MAINTENANCE]`")
            md.append(f"*Estimated Time: 2 Weeks | Focus: Rapid review & high-level architecture*")
            for t in strong_topics:
                md.append(f"- **{t} Maintenance**: Accelerated review, best practice audits, and advanced techniques (Score: {topic_scores.get(t, 0)}%).")
            md.append("- **Milestone Check**: Capstone portfolio implementation connecting all skills.\n")
            phase_num += 1

        md.append(f"### Phase {phase_num}: Comprehensive Capstone & Readiness Review")
        md.append("- Synthesize all competencies in a complete end-to-end practical project.")
        md.append("- Retake the Skill Gap Assessment to confirm balanced mastery across all target topics.")

    # ========================================================
    # 6. AI PROJECT MENTOR
    # ========================================================
    def generate_project_plan(
        self,
        title: str,
        description: str,
        tech_stack: Optional[List[str]] = None,
        goal: Optional[str] = None,
        difficulty_level: str = "Intermediate",
        timeline: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a comprehensive structured project plan including development phases,
        granular tasks with priority, suggested tech stack, and testing/deployment checklists.
        """
        stack_str = ", ".join(tech_stack) if tech_stack else "Modern Web & Backend Stack"
        timeline_str = timeline or "4-6 Weeks"
        goal_str = goal or "Build an industry-standard portfolio-ready project"

        prompt = f"""
You are an expert Senior Software Architect and Technical Mentor creating a production-grade software engineering project roadmap for a student.

PROJECT DETAILS:
- Title: {title}
- Description: {description}
- Stated Tech Stack: {stack_str}
- Primary Goal: {goal_str}
- Target Difficulty: {difficulty_level}
- Target Timeline: {timeline_str}

Generate a comprehensive, structured project roadmap in JSON format.
You must return ONLY a valid JSON object with EXACTLY this structure:
{{
  "summary": "2-3 sentences explaining what this project builds and the key engineering competencies gained.",
  "architecture_overview": "Paragraph describing the architecture (client, API layer, database, state management, security).",
  "suggested_technologies": [
    {{"category": "Frontend", "name": "React / Vite / Tailwind", "reason": "Fast responsive SPA interface"}},
    {{"category": "Backend", "name": "FastAPI / Python", "reason": "High-performance async REST API"}},
    {{"category": "Database", "name": "PostgreSQL / MongoDB", "reason": "Robust persistent storage"}},
    {{"category": "DevOps & Tooling", "name": "Docker / GitHub Actions", "reason": "Containerization and CI/CD"}}
  ],
  "phases": [
    {{
      "phase_number": 1,
      "name": "Phase 1: Architecture, Scaffolding & Setup",
      "duration": "1 Week",
      "description": "Initialize repository, configure linting, design database models, and set up base API routing.",
      "tasks": [
        {{
          "title": "Repository initialization and environment configuration",
          "description": "Configure Git repo, .env variables, dependencies, and formatting tools.",
          "priority": "High",
          "estimated_hours": "3-4 hrs",
          "resources": ["Official Documentation", "Project Setup Guide"]
        }},
        {{
          "title": "Design core schema & database models",
          "description": "Establish entity relationships, migration scripts, and indexing strategy.",
          "priority": "High",
          "estimated_hours": "4-6 hrs",
          "resources": ["Database Design Best Practices"]
        }}
      ]
    }},
    {{
      "phase_number": 2,
      "name": "Phase 2: Core Feature Implementation",
      "duration": "2 Weeks",
      "description": "Build primary business logic, CRUD endpoints, user flows, and state management.",
      "tasks": [
        {{
          "title": "Implement core API endpoints and controllers",
          "description": "Write RESTful endpoints with input validation, error handling, and business logic.",
          "priority": "High",
          "estimated_hours": "8-10 hrs",
          "resources": ["REST API Guidelines"]
        }},
        {{
          "title": "Develop frontend components and state integration",
          "description": "Build interactive UI components, hook up API clients, and manage application state.",
          "priority": "Medium",
          "estimated_hours": "8-10 hrs",
          "resources": ["UI Component Patterns"]
        }}
      ]
    }},
    {{
      "phase_number": 3,
      "name": "Phase 3: Integration, Testing & Refinement",
      "duration": "1 Week",
      "description": "Write automated test suites, optimize performance, and polish UX feedback.",
      "tasks": [
        {{
          "title": "Unit and integration test suites",
          "description": "Cover key API endpoints and frontend workflows with automated tests.",
          "priority": "Medium",
          "estimated_hours": "6-8 hrs",
          "resources": ["Testing Best Practices"]
        }},
        {{
          "title": "Error boundaries and UX polish",
          "description": "Implement toast notifications, loading skeletons, and graceful fallbacks.",
          "priority": "Medium",
          "estimated_hours": "4-5 hrs",
          "resources": ["UX Engineering Guide"]
        }}
      ]
    }},
    {{
      "phase_number": 4,
      "name": "Phase 4: Deployment & CI/CD",
      "duration": "1 Week",
      "description": "Containerize the application, set up continuous deployment, and document setup.",
      "tasks": [
        {{
          "title": "Docker containerization & multi-stage builds",
          "description": "Write clean Dockerfiles and docker-compose configurations for development and production.",
          "priority": "High",
          "estimated_hours": "4-5 hrs",
          "resources": ["Docker Guide"]
        }},
        {{
          "title": "Deploy to cloud platform and write README documentation",
          "description": "Deploy backend and frontend services with SSL and craft a showcase README with demo GIF.",
          "priority": "High",
          "estimated_hours": "3-4 hrs",
          "resources": ["Deployment Checklist"]
        }}
      ]
    }}
  ],
  "testing_checklist": [
    "Unit tests for core calculation and service helper functions",
    "API integration tests with mock database responses",
    "Authentication and authorization security checks",
    "End-to-end critical user flow verification",
    "Cross-browser and responsive layout testing"
  ],
  "deployment_checklist": [
    "Secure secrets management (.env.production / KMS)",
    "Production database backups and migration verification",
    "Optimized production frontend bundle build",
    "CORS headers and rate limiting configured",
    "Uptime health check endpoint and monitoring setup",
    "Comprehensive README with architecture diagram & setup instructions"
  ]
}}
"""

        try:
            handler = self.get_handler(topic=title, knowledge_level=difficulty_level)
            tutor_agent = handler.agents.tutor_agent()
            resp = tutor_agent.run(prompt, stream=False)
            content = resp.content.strip()

            if content.startswith("```json"):
                content = content[7:].strip()
            elif content.startswith("```"):
                content = content[3:].strip()
            if content.endswith("```"):
                content = content[:-3].strip()

            start = content.find("{")
            end = content.rfind("}")
            if start != -1 and end != -1:
                json_str = content[start:end + 1]
                data = json.loads(json_str)

                # Validate and format phases
                raw_phases = data.get("phases", [])
                formatted_phases = []
                for p_idx, p in enumerate(raw_phases):
                    p_num = p.get("phase_number", p_idx + 1)
                    raw_tasks = p.get("tasks", [])
                    formatted_tasks = []
                    for t_idx, t in enumerate(raw_tasks):
                        formatted_tasks.append({
                            "id": f"t-{p_num}-{t_idx + 1}-{uuid.uuid4().hex[:4]}",
                            "title": t.get("title", f"Task {t_idx + 1}"),
                            "description": t.get("description", ""),
                            "priority": t.get("priority", "Medium"),
                            "status": "Not Started",
                            "estimated_hours": t.get("estimated_hours", "3-5 hrs"),
                            "resources": t.get("resources", [])
                        })
                    formatted_phases.append({
                        "id": f"phase-{p_num}",
                        "phase_number": p_num,
                        "name": p.get("name", f"Phase {p_num}"),
                        "duration": p.get("duration", "1-2 Weeks"),
                        "description": p.get("description", ""),
                        "tasks": formatted_tasks
                    })

                if formatted_phases:
                    return {
                        "summary": data.get("summary", f"Roadmap for {title} focusing on {stack_str}."),
                        "architecture_overview": data.get("architecture_overview", "Modular architecture with separated client, API, and storage layers."),
                        "suggested_technologies": data.get("suggested_technologies", [
                            {"category": "Frontend", "name": "React + Vite", "reason": "Modern frontend"},
                            {"category": "Backend", "name": "FastAPI / Node.js", "reason": "Scalable REST API"},
                            {"category": "Database", "name": "PostgreSQL / MongoDB", "reason": "Persistent data storage"}
                        ]),
                        "phases": formatted_phases,
                        "testing_checklist": data.get("testing_checklist", [
                            "Unit tests for core logic",
                            "API endpoint integration tests",
                            "Form validation and edge case verification",
                            "Security and authorization audit"
                        ]),
                        "deployment_checklist": data.get("deployment_checklist", [
                            "Environment variables and secrets setup",
                            "Containerization with Docker",
                            "CI/CD workflow configuration",
                            "Production build optimization and deployment"
                        ])
                    }
        except Exception as e:
            print(f"⚠️ Warning during AI project plan generation: {e}. Using resilient fallback roadmap.")

        # Structured fallback plan
        return self._generate_fallback_project_plan(title, description, tech_stack, goal, difficulty_level, timeline_str)

    def _generate_fallback_project_plan(
        self,
        title: str,
        description: str,
        tech_stack: Optional[List[str]],
        goal: Optional[str],
        difficulty_level: str,
        timeline: str
    ) -> Dict[str, Any]:
        stack = tech_stack or ["React", "FastAPI", "MongoDB/PostgreSQL", "Docker"]
        stack_str = ", ".join(stack)

        phases = [
            {
                "id": "phase-1",
                "phase_number": 1,
                "name": "Phase 1: Architecture & Foundation Setup",
                "duration": "1 Week",
                "description": "Establish project repository, configure development tooling, and design core data models.",
                "tasks": [
                    {
                        "id": f"t-1-1-{uuid.uuid4().hex[:4]}",
                        "title": "Project scaffolding & environment setup",
                        "description": f"Initialize Git repository, configure .env, linters, and baseline dependencies for {stack_str}.",
                        "priority": "High",
                        "status": "Not Started",
                        "estimated_hours": "3-4 hrs",
                        "resources": ["Git Best Practices", "Setup Guide"]
                    },
                    {
                        "id": f"t-1-2-{uuid.uuid4().hex[:4]}",
                        "title": "Database schema and domain modeling",
                        "description": "Design data models, entity relationships, and database connectivity layer.",
                        "priority": "High",
                        "status": "Not Started",
                        "estimated_hours": "4-6 hrs",
                        "resources": ["Data Modeling Standards"]
                    },
                    {
                        "id": f"t-1-3-{uuid.uuid4().hex[:4]}",
                        "title": "Baseline API structure and health check",
                        "description": "Implement root router, CORS configurations, and health check endpoints.",
                        "priority": "Medium",
                        "status": "Not Started",
                        "estimated_hours": "2-3 hrs",
                        "resources": ["FastAPI / Express Routing"]
                    }
                ]
            },
            {
                "id": "phase-2",
                "phase_number": 2,
                "name": "Phase 2: Core Feature Development",
                "duration": "2 Weeks",
                "description": "Build primary business logic, CRUD endpoints, and connected interactive user interface.",
                "tasks": [
                    {
                        "id": f"t-2-1-{uuid.uuid4().hex[:4]}",
                        "title": "Implement core REST API services",
                        "description": "Develop core domain endpoints with robust input validation, status codes, and error handling.",
                        "priority": "High",
                        "status": "Not Started",
                        "estimated_hours": "8-10 hrs",
                        "resources": ["REST API Best Practices"]
                    },
                    {
                        "id": f"t-2-2-{uuid.uuid4().hex[:4]}",
                        "title": "Interactive UI pages & state management",
                        "description": "Build the frontend views, component layout, and data-fetching hooks connected to the API.",
                        "priority": "High",
                        "status": "Not Started",
                        "estimated_hours": "8-10 hrs",
                        "resources": ["React State Patterns"]
                    },
                    {
                        "id": f"t-2-3-{uuid.uuid4().hex[:4]}",
                        "title": "User feedback, notifications & loading states",
                        "description": "Add optimistic updates, error alerts, loading skeletons, and interactive state transitions.",
                        "priority": "Medium",
                        "status": "Not Started",
                        "estimated_hours": "4-5 hrs",
                        "resources": ["UI/UX Engineering"]
                    }
                ]
            },
            {
                "id": "phase-3",
                "phase_number": 3,
                "name": "Phase 3: Testing & Quality Assurance",
                "duration": "1 Week",
                "description": "Validate system integrity with automated tests, edge case handling, and performance audit.",
                "tasks": [
                    {
                        "id": f"t-3-1-{uuid.uuid4().hex[:4]}",
                        "title": "Automated backend unit and integration tests",
                        "description": "Write automated test cases using pytest / Jest covering critical endpoints and services.",
                        "priority": "High",
                        "status": "Not Started",
                        "estimated_hours": "6-8 hrs",
                        "resources": ["Automated Testing Guide"]
                    },
                    {
                        "id": f"t-3-2-{uuid.uuid4().hex[:4]}",
                        "title": "End-to-end integration and security audit",
                        "description": "Verify token handling, input sanitization, error boundaries, and cross-browser consistency.",
                        "priority": "Medium",
                        "status": "Not Started",
                        "estimated_hours": "4-6 hrs",
                        "resources": ["OWASP Top 10 Checklist"]
                    }
                ]
            },
            {
                "id": "phase-4",
                "phase_number": 4,
                "name": "Phase 4: Deployment & Portfolio Polish",
                "duration": "1 Week",
                "description": "Containerize, deploy to cloud hosting, and document architecture for portfolio showcase.",
                "tasks": [
                    {
                        "id": f"t-4-1-{uuid.uuid4().hex[:4]}",
                        "title": "Docker containerization and production build",
                        "description": "Create optimized Dockerfile, docker-compose configuration, and production environment configs.",
                        "priority": "High",
                        "status": "Not Started",
                        "estimated_hours": "4-5 hrs",
                        "resources": ["Docker Deployment Patterns"]
                    },
                    {
                        "id": f"t-4-2-{uuid.uuid4().hex[:4]}",
                        "title": "Cloud deployment and showcase documentation",
                        "description": "Deploy to Vercel/Render/Railway, setup custom domain, and write a stellar README with architecture breakdown.",
                        "priority": "High",
                        "status": "Not Started",
                        "estimated_hours": "4-5 hrs",
                        "resources": ["Portfolio Project Guide"]
                    }
                ]
            }
        ]

        return {
            "summary": f"Comprehensive roadmap for '{title}'. Designed to guide you through building a production-ready application using {stack_str}.",
            "architecture_overview": f"A modular multi-tier application comprising a modern client UI, an asynchronous API service layer, and resilient data persistence.",
            "suggested_technologies": [
                {"category": "Frontend", "name": stack[0] if len(stack) > 0 else "React", "reason": "Dynamic, responsive user interface"},
                {"category": "Backend", "name": stack[1] if len(stack) > 1 else "FastAPI", "reason": "Fast asynchronous API handling"},
                {"category": "Database", "name": stack[2] if len(stack) > 2 else "MongoDB / PostgreSQL", "reason": "Scalable data persistence"},
                {"category": "DevOps", "name": "Docker & GitHub Actions", "reason": "Reproducible builds and automated CI/CD"}
            ],
            "phases": phases,
            "testing_checklist": [
                "Unit tests for data validation and core service logic",
                "API route integration testing with mock databases",
                "Authentication and permission security audit",
                "Responsive design testing across mobile, tablet, and desktop",
                "Network failure and timeout resilience verification"
            ],
            "deployment_checklist": [
                "Environment variable secrets management",
                "Container multi-stage build optimization",
                "SSL certificate and HTTPS enforcement",
                "CORS policy configuration",
                "Structured logging and health check endpoint",
                "Interactive README with architecture overview and live demo link"
            ]
        }

    def chat_project_mentor(
        self,
        project_context: Dict[str, Any],
        message_history: List[Dict[str, Any]],
        user_message: str
    ) -> str:
        """
        Provides intelligent project-specific guidance, debugging help, and architecture recommendations.
        """
        title = project_context.get("title", "Project")
        description = project_context.get("description", "")
        tech_stack = ", ".join(project_context.get("tech_stack", [])) or "Standard Stack"
        difficulty = project_context.get("difficulty_level", "Intermediate")
        progress = project_context.get("progress", 0)

        # Build recent conversation history context
        history_lines = []
        for msg in message_history[-6:]:
            sender = "Student" if msg.get("sender") == "user" else "AI Mentor"
            history_lines.append(f"{sender}: {msg.get('message', '')}")
        history_str = "\n".join(history_lines) if history_lines else "No previous messages."

        prompt = f"""
You are an expert AI Senior Software Mentor assisting a student working on their software project.

PROJECT CONTEXT:
- Title: {title}
- Description: {description}
- Tech Stack: {tech_stack}
- Difficulty Level: {difficulty}
- Current Progress: {progress:.1f}%

RECENT CONVERSATION HISTORY:
{history_str}

STUDENT QUESTION / REQUEST:
{user_message}

Provide a helpful, encouraging, and technically precise answer.
- If they ask for architecture advice, provide clear modular guidance and best practices.
- If they ask for code or implementation tips, provide clean, concise snippets relevant to {tech_stack}.
- If they ask what task to work on next, reference standard project milestones and their current progress.
- Keep the tone professional, structured, and actionable.
"""
        try:
            handler = self.get_handler(topic=title, knowledge_level=difficulty)
            tutor_agent = handler.agents.tutor_agent()
            resp = tutor_agent.run(prompt, stream=False)
            reply = resp.content.strip()
            if reply:
                return reply
        except Exception as e:
            print(f"⚠️ Warning in AI project mentor chat: {e}")

        return (
            f"Here are my recommendations for **{title}**:\n\n"
            f"1. **Architecture & Design**: Ensure your application maintains a clean separation of concerns between your API routes, business logic, and UI components.\n"
            f"2. **Implementation with {tech_stack}**: Break complex endpoints into small testable units. Make sure to validate all incoming inputs.\n"
            f"3. **Next Step**: Check off completed tasks in your project phases to update your progress ({progress:.1f}% currently).\n\n"
            f"Let me know if you need specific code examples, schema design review, or debugging assistance!"
        )


    # ========================================================
    # 7. AI VIVA & INTERVIEW COACH
    # ========================================================
    def generate_interview_questions(
        self,
        interview_type: str,
        subject: str = "Computer Science",
        project_title: Optional[str] = None,
        project_description: Optional[str] = None,
        difficulty: str = "Intermediate",
        num_questions: int = 5,
        student_context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates structured viva or technical/HR interview questions tailored to student context,
        weak areas, project architecture, or target subject domain.
        """
        context_notes = []
        if interview_type == "Project Viva" and project_title:
            context_notes.append(f"PROJECT CONTEXT: Title: '{project_title}', Description: '{project_description or ''}'")
        if student_context:
            weak = student_context.get("weak_topics", [])
            if weak:
                context_notes.append(f"PRIORITY WEAK TOPICS TO PROBE: {', '.join(weak)}")

        context_str = "\n".join(context_notes) if context_notes else "General candidate background."

        prompt = f"""
You are an expert Technical Interviewer and Viva Examiner creating a {interview_type} examination.

INTERVIEW CONFIGURATION:
- Type: {interview_type}
- Subject / Tech: {subject}
- Difficulty Level: {difficulty}
- Total Questions Needed: {num_questions}
{context_str}

Generate EXACTLY {num_questions} realistic, probing interview questions.
- If 'Project Viva', ask deeply about architecture decisions, data flow, concurrency/trade-offs, security, error handling, and scalability.
- If 'Technical Interview', ask conceptual and applied software engineering questions for {subject} with realistic scenarios.
- If 'HR Interview', ask behavioral, teamwork, conflict resolution, ownership, and situational questions (STAR method relevant).

Return ONLY a valid JSON object with EXACTLY this structure:
{{
  "questions": [
    {{
      "id": 1,
      "question": "Clear, articulated interview question",
      "category": "Architecture / Logic / Behavioral / Database / Problem Solving",
      "expected_key_points": [
        "Key concept or requirement 1",
        "Key concept or requirement 2",
        "Key concept or requirement 3"
      ],
      "difficulty": "{difficulty}"
    }}
  ]
}}
"""
        try:
            handler = self.get_handler(topic=subject, knowledge_level=difficulty)
            tutor_agent = handler.agents.tutor_agent()
            resp = tutor_agent.run(prompt, stream=False)
            content = resp.content.strip()

            if content.startswith("```json"):
                content = content[7:].strip()
            elif content.startswith("```"):
                content = content[3:].strip()
            if content.endswith("```"):
                content = content[:-3].strip()

            start = content.find("{")
            end = content.rfind("}")
            if start != -1 and end != -1:
                json_str = content[start:end + 1]
                data = json.loads(json_str)
                qs = data.get("questions", [])
                if qs and isinstance(qs, list):
                    formatted_qs = []
                    for idx, q in enumerate(qs[:num_questions]):
                        formatted_qs.append({
                            "id": idx + 1,
                            "question": q.get("question", f"Question {idx + 1} regarding {subject}"),
                            "category": q.get("category", "Technical Assessment"),
                            "expected_key_points": q.get("expected_key_points", [f"Core principle of {subject}"]),
                            "difficulty": q.get("difficulty", difficulty)
                        })
                    if formatted_qs:
                        return formatted_qs
        except Exception as e:
            print(f"⚠️ Warning during AI interview questions generation: {e}. Using resilient fallback questions.")

        # Structured fallback questions
        return self._generate_fallback_interview_questions(interview_type, subject, project_title, difficulty, num_questions)

    def _generate_fallback_interview_questions(
        self,
        interview_type: str,
        subject: str,
        project_title: Optional[str],
        difficulty: str,
        num_questions: int
    ) -> List[Dict[str, Any]]:
        questions = []
        if interview_type == "Project Viva":
            p_name = project_title or "your system"
            bank = [
                (f"Can you explain the high-level architecture and end-to-end data flow of {p_name}?", "Architecture & Design", ["Client-server separation", "Request lifecycle", "Database persistence layer"]),
                (f"What was the most challenging technical obstacle you faced while building {p_name}, and how did you resolve it?", "Problem Solving & Debugging", ["Root cause diagnosis", "Explored alternatives", "Chosen solution & trade-offs"]),
                (f"How did you design your database schema and indexing strategy to ensure performance in {p_name}?", "Database & Persistence", ["Normalized relationships", "Query optimization", "Integrity constraints"]),
                (f"How does {p_name} handle security, input validation, and unauthorized requests?", "Security & Authentication", ["Token verification (JWT)", "Input sanitization", "CORS & status codes"]),
                (f"If {p_name} had to scale to 100,000 active concurrent users, what would be the primary bottleneck and how would you redesign it?", "Scalability & Distributed Systems", ["Caching layer (Redis)", "Database read replicas", "Load balancing & horizontal scaling"])
            ]
        elif interview_type == "HR Interview":
            bank = [
                ("Tell me about a challenging technical project you worked on. What was your specific role and key contribution?", "Experience & Impact", ["Context setting", "Personal initiative", "Measurable outcome"]),
                ("Describe a situation where you had a technical disagreement with a teammate. How did you handle it?", "Collaboration & Conflict", ["Active listening", "Objective benchmarking", "Constructive compromise"]),
                ("How do you prioritize competing deadlines when multiple tasks or bugs demand your attention simultaneously?", "Time Management & Prioritization", ["Impact vs Effort assessment", "Stakeholder communication", "Structured backlog"]),
                ("Tell me about a time you made a mistake or failed to deliver on time. What did you learn and how did you adapt?", "Accountability & Growth Mindset", ["Ownership of error", "Corrective action taken", "Process improvements"]),
                ("Where do you see your technical career evolving over the next 2 to 3 years?", "Career Vision & Motivation", ["Continuous skill development", "Engineering leadership or specialization", "Value creation"])
            ]
        else: # Technical Interview
            bank = [
                (f"What are the foundational principles and best practices when designing applications with {subject}?", "Core Fundamentals", ["Key abstractions", "Modularity", "Standard conventions"]),
                (f"How do you handle asynchronous operations, concurrency, and error propagation in {subject}?", "Concurrency & Async Logic", ["Non-blocking execution", "Exception handling", "Resource cleanup"]),
                (f"Can you compare the memory and computational trade-offs of the primary data structures used in {subject}?", "Algorithms & Data Structures", ["Time complexity (Big-O)", "Space efficiency", "Cache locality"]),
                (f"How would you diagnose and resolve a severe performance bottleneck or memory leak in {subject}?", "Performance Tuning & Diagnostics", ["Profiling tools", "Benchmarking", "Optimization techniques"]),
                (f"What design patterns or architectural paradigms are best suited for building scalable systems with {subject}?", "System Design & Architecture", ["Factory / Dependency Injection / Pub-Sub", "Loose coupling", "Testability"])
            ]

        for i in range(num_questions):
            q_text, cat, key_pts = bank[i % len(bank)]
            questions.append({
                "id": i + 1,
                "question": q_text,
                "category": cat,
                "expected_key_points": key_pts,
                "difficulty": difficulty
            })
        return questions

    def evaluate_interview_answer(
        self,
        question: str,
        category: str,
        expected_key_points: List[str],
        student_answer: str,
        interview_type: str = "Technical Interview",
        difficulty: str = "Intermediate"
    ) -> Dict[str, Any]:
        """
        Evaluates a candidate's viva/interview answer against technical accuracy, depth,
        structure, and expected key concepts. Generates constructive feedback, a model answer,
        and an intelligent follow-up question.
        """
        key_points_str = ", ".join(expected_key_points) if expected_key_points else "Accurate conceptual explanation"

        prompt = f"""
You are an expert Senior Technical Examiner evaluating a candidate's answer in a {interview_type}.

INTERVIEW QUESTION:
{question}

QUESTION CATEGORY: {category}
DIFFICULTY LEVEL: {difficulty}
EXPECTED KEY POINTS / CONCEPTS: {key_points_str}

CANDIDATE ANSWER:
{student_answer}

Evaluate the candidate's answer rigorously and objectively.
Return ONLY a valid JSON object with EXACTLY this structure:
{{
  "score": 85.0,
  "rating": "Excellent / Good / Needs Improvement / Inadequate",
  "feedback": "2-3 sentences evaluating the clarity, depth, accuracy, and structure of the candidate's response.",
  "key_strengths": [
    "Specific concept or point the candidate articulated well",
    "Good mention of practical trade-off or syntax"
  ],
  "missing_concepts": [
    "Important concept or edge case the candidate omitted or explained weakly"
  ],
  "suggested_model_answer": "A clear, concise, production-grade model answer that would impress a lead engineer / interviewer.",
  "follow_up_question": "A logical follow-up technical question probing one level deeper or exploring an edge case."
}}
"""
        try:
            handler = self.get_handler(topic=category, knowledge_level=difficulty)
            tutor_agent = handler.agents.tutor_agent()
            resp = tutor_agent.run(prompt, stream=False)
            content = resp.content.strip()

            if content.startswith("```json"):
                content = content[7:].strip()
            elif content.startswith("```"):
                content = content[3:].strip()
            if content.endswith("```"):
                content = content[:-3].strip()

            start = content.find("{")
            end = content.rfind("}")
            if start != -1 and end != -1:
                json_str = content[start:end + 1]
                data = json.loads(json_str)

                score_val = float(data.get("score", 70.0))
                score_val = max(0.0, min(100.0, score_val))

                rating = data.get("rating", "Good")
                if score_val >= 90.0:
                    rating = "Excellent"
                elif score_val >= 70.0:
                    rating = "Good"
                elif score_val >= 45.0:
                    rating = "Needs Improvement"
                else:
                    rating = "Inadequate"

                return {
                    "score": round(score_val, 1),
                    "rating": rating,
                    "feedback": data.get("feedback", "Solid technical answer touching upon key concepts."),
                    "key_strengths": data.get("key_strengths", ["Identified core problem requirements."]),
                    "missing_concepts": data.get("missing_concepts", ["Could include more specific architectural trade-offs."]),
                    "suggested_model_answer": data.get("suggested_model_answer", "An ideal answer covers the theoretical definition, real-world implementation trade-offs, and scalability implications."),
                    "follow_up_question": data.get("follow_up_question", "How would your approach change under high concurrency or network latency?")
                }
        except Exception as e:
            print(f"⚠️ Warning during AI interview answer evaluation: {e}. Using resilient evaluation fallback.")

        # Resilient fallback evaluation based on keyword heuristic and answer length
        word_count = len(student_answer.split())
        matched_keys = [k for k in expected_key_points if any(w.lower() in student_answer.lower() for w in k.split())]
        
        if word_count > 30 and len(matched_keys) >= 1:
            score = 80.0
            rating = "Good"
            feedback = "Good explanation that covers the main requirements. To elevate it further, delve deeper into edge cases and production constraints."
            strengths = ["Structured thought process", "Identified relevant principles"]
            missing = [k for k in expected_key_points if k not in matched_keys] or ["Deeper discussion on failure modes"]
        elif word_count > 15:
            score = 65.0
            rating = "Needs Improvement"
            feedback = "The answer addresses the basic premise, but lacks technical depth and concrete terminology."
            strengths = ["Basic concept recognized"]
            missing = expected_key_points or ["Specific implementation steps", "Trade-off analysis"]
        else:
            score = 40.0
            rating = "Inadequate"
            feedback = "The answer is too brief and does not sufficiently explain the underlying mechanisms or trade-offs."
            strengths = []
            missing = expected_key_points or ["Core definitions", "Practical architecture patterns"]

        model_ans = f"In a production environment, this should be addressed by clearly outlining the primary architecture, verifying requirements ({', '.join(expected_key_points)}), and evaluating performance impacts."
        follow_up = f"What specific monitoring metrics or test cases would you implement to validate this behavior in {category}?"

        return {
            "score": score,
            "rating": rating,
            "feedback": feedback,
            "key_strengths": strengths,
            "missing_concepts": missing,
            "suggested_model_answer": model_ans,
            "follow_up_question": follow_up
        }

    # ========================================================
    # 10. DOCUMENT Q&A / RAG SERVICES
    # ========================================================
    def upload_document(
        self,
        file_path: str,
        filename: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Extracts, cleans, chunks, embeds, and indexes a study document with user isolation.
        """
        doc_id = str(uuid.uuid4())
        file_ext = os.path.splitext(filename)[1].lower()
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0

        print(f"\n[RAG UPLOAD] Processing: {filename} ({file_size} bytes) for user_id={user_id}")

        if file_ext == ".pdf":
            success, num_pages, num_chunks = self.rag_helper.load_pdf(
                file_path=file_path,
                user_id=user_id,
                doc_id=doc_id,
                filename=filename
            )
        elif file_ext == ".txt":
            success, num_pages, num_chunks = self.rag_helper.load_text(
                file_path=file_path,
                user_id=user_id,
                doc_id=doc_id,
                filename=filename
            )
        else:
            return {
                "success": False,
                "filename": filename,
                "doc_id": None,
                "document_id": None,
                "num_pages": 0,
                "num_chunks": 0,
                "message": f"Unsupported file extension: {file_ext}"
            }

        if success and num_chunks > 0:
            doc_record = {
                "id": doc_id,
                "document_id": doc_id,
                "user_id": str(user_id),
                "filename": filename,
                "file_path": file_path,
                "file_type": "pdf" if file_ext == ".pdf" else "text",
                "file_size": file_size,
                "num_pages": num_pages,
                "num_chunks": num_chunks,
                "uploaded_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            get_db_collection("documents").insert_one(doc_record)
            
            # Formatted debug logging
            print(f"\n[ RAG INDEX ]\ndocument_id={doc_id}\nuser_id={user_id}\nchunks_created={num_chunks}\nchunks_stored={num_chunks}\n")

            return {
                "success": True,
                "filename": filename,
                "doc_id": doc_id,
                "document_id": doc_id,
                "num_pages": num_pages,
                "num_chunks": num_chunks,
                "message": f"Successfully extracted and indexed {filename} ({num_chunks} chunks generated)."
            }
        else:
            print(f"[RAG UPLOAD] FAILED: Could not index {filename}")
            return {
                "success": False,
                "filename": filename,
                "doc_id": None,
                "document_id": None,
                "num_pages": num_pages,
                "num_chunks": 0,
                "message": "Failed to extract readable content or generate embeddings."
            }

    def get_user_documents(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves the list of uploaded study documents belonging to the user.
        """
        coll = get_db_collection("documents")
        
        candidates = [{"user_id": str(user_id)}]
        try:
            from bson import ObjectId
            if ObjectId.is_valid(user_id):
                candidates.append({"user_id": ObjectId(user_id)})
        except Exception:
            pass

        docs = []
        for q in candidates:
            try:
                found = list(coll.find(q))
                if found:
                    docs.extend(found)
            except Exception:
                continue

        if not docs:
            try:
                all_docs = list(coll.find({}))
                for d in all_docs:
                    if str(d.get("user_id", "")) == str(user_id):
                        docs.append(d)
            except Exception:
                pass

        seen_ids = set()
        result = []
        for d in docs:
            doc_id = str(d.get("id") or d.get("document_id") or d.get("_id") or "")
            if doc_id in seen_ids:
                continue
            seen_ids.add(doc_id)
            result.append({
                "id": doc_id,
                "filename": d.get("filename", "document"),
                "file_type": d.get("file_type", "pdf"),
                "file_size": d.get("file_size", 0),
                "num_pages": d.get("num_pages", 1),
                "num_chunks": d.get("num_chunks", 0),
                "uploaded_at": d.get("uploaded_at", "")
            })
        return result

    def delete_document(self, doc_id: str, user_id: str) -> bool:
        """
        Removes document record from DB and deletes corresponding vector chunks from ChromaDB.
        """
        coll = get_db_collection("documents")
        
        candidates = [
            {"id": str(doc_id), "user_id": str(user_id)},
            {"document_id": str(doc_id), "user_id": str(user_id)},
            {"_id": str(doc_id), "user_id": str(user_id)},
            {"id": str(doc_id)},
            {"document_id": str(doc_id)},
            {"_id": str(doc_id)}
        ]
        
        try:
            from bson import ObjectId
            if ObjectId.is_valid(doc_id):
                candidates.extend([
                    {"_id": ObjectId(doc_id), "user_id": str(user_id)},
                    {"_id": ObjectId(doc_id)},
                ])
                if ObjectId.is_valid(user_id):
                    candidates.append({"_id": ObjectId(doc_id), "user_id": ObjectId(user_id)})
                    candidates.append({"id": str(doc_id), "user_id": ObjectId(user_id)})
        except Exception:
            pass

        existing = None
        for query in candidates:
            try:
                found = coll.find_one(query)
                if found:
                    existing = found
                    break
            except Exception:
                continue

        if not existing:
            try:
                all_docs = list(coll.find({}))
                for d in all_docs:
                    d_id = str(d.get("id") or d.get("document_id") or d.get("_id") or "")
                    if d_id == str(doc_id):
                        existing = d
                        break
            except Exception:
                pass

        if not existing:
            print(f"ℹ️ Document not found in DB for doc_id={doc_id}. Cleaning ChromaDB chunks.")
            self.rag_helper.delete_document_chunks(doc_id=doc_id, user_id=user_id)
            return True

        actual_id = str(existing.get("id") or existing.get("document_id") or existing.get("_id") or doc_id)
        self.rag_helper.delete_document_chunks(doc_id=actual_id, user_id=user_id)
        if actual_id != doc_id:
            self.rag_helper.delete_document_chunks(doc_id=doc_id, user_id=user_id)

        try:
            if "_id" in existing:
                coll.delete_one({"_id": existing["_id"]})
            if "id" in existing:
                coll.delete_one({"id": existing["id"]})
            if "document_id" in existing:
                coll.delete_one({"document_id": existing["document_id"]})
        except Exception as e:
            print(f"⚠️ Error deleting document from database: {e}")

        file_path = existing.get("file_path")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        print(f"✅ Successfully deleted document {doc_id} ({existing.get('filename')}) from DB, ChromaDB, and uploads.")
        return True

    def query_documents(
        self,
        question: str,
        user_id: Optional[str] = None,
        doc_id: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        k: int = 6
    ) -> Dict[str, Any]:
        """
        RAG query pipeline:
        1. Contextual query preservation
        2. Filtered semantic similarity retrieval with distance scoring
        3. Debug metrics logging
        4. Strict grounded answer generation via LLM/Tutor agent or fallback
        """
        if not question or not question.strip():
            return {
                "answer": "Please provide a question to query your study documents.",
                "sources": []
            }

        question_clean = question.strip()
        search_query = question_clean

        # Follow-up query contextual reformulation ONLY if truly a short dependent pronoun phrase
        if history and len(history) > 0:
            tokens = [w.lower() for w in re.findall(r'\w+', question_clean)]
            is_short = len(tokens) <= 3
            pure_pronouns = {"it", "its", "they", "them", "this", "that", "these", "those"}
            has_pronoun_without_noun = is_short and any(t in pure_pronouns for t in tokens)
            is_continuation_phrase = question_clean.lower().startswith(("what about", "how about", "tell me more", "explain that", "can you elaborate"))
            
            if has_pronoun_without_noun or (is_short and is_continuation_phrase):
                last_q = ""
                for turn in reversed(history):
                    if isinstance(turn, dict):
                        cand = turn.get("content") or turn.get("question") or ""
                        role = turn.get("role", "")
                        if cand and (role == "user" or "question" in turn):
                            last_q = cand.strip()
                            break
                if last_q:
                    search_query = f"{last_q} {question_clean}"

        # 1. Debug logging for RAG QUERY
        print(f"\n[ RAG QUERY ]\ndocument_id={doc_id}\nuser_id={user_id}\nquestion={question_clean}\n")

        # 2. Vector store retrieval with scores
        retrieved_chunks = self.rag_helper.query_with_scores(
            question=search_query,
            user_id=user_id,
            doc_id=doc_id,
            k=k
        )

        retrieved_doc_ids = list(set([str(c.get("doc_id") or c.get("metadata", {}).get("doc_id", "")) for c in retrieved_chunks if (c.get("doc_id") or c.get("metadata", {}).get("doc_id"))]))
        
        # 2. Debug logging for RAG RETRIEVAL
        print(f"[ RAG RETRIEVAL ]\nchunks_found={len(retrieved_chunks)}\nretrieved_document_ids={retrieved_doc_ids}\n")

        for idx, rc in enumerate(retrieved_chunks):
            preview = rc['text'][:120].replace('\n', ' ')
            print(f"   Chunk #{idx+1} [score/dist={rc['score']:.4f}, file={rc['filename']}, p.{rc['page']}]: {preview}...")

        # If no chunks found in knowledge base
        if not retrieved_chunks:
            return {
                "answer": "I couldn't find this information in the uploaded document.",
                "sources": []
            }

        # 3. Assemble context & sources from top retrieved chunks
        context_blocks = []
        sources = []
        total_context_len = 0

        for idx, c in enumerate(retrieved_chunks[:5]):
            block = f"--- EXCERPT {idx+1} (Source: {c['filename']}, Page {c['page']}) ---\n{c['text']}"
            context_blocks.append(block)
            total_context_len += len(c['text'])
            src_snippet = f"{c['filename']} (p. {c['page']}): \"{c['text'][:140].strip()}...\""
            if src_snippet not in sources:
                sources.append(src_snippet)

        context_text = "\n\n".join(context_blocks)
        print(f"[RAG CONTEXT] Built context with {len(context_blocks)} excerpts, {total_context_len} chars.")

        # Format history string
        history_str = ""
        if history:
            formatted_turns = []
            for h in history[-4:]:
                if isinstance(h, dict):
                    role = h.get("role") or ("user" if "question" in h else "assistant")
                    content = h.get("content") or h.get("question") or h.get("answer") or ""
                    if content:
                        formatted_turns.append(f"{role.capitalize()}: {content}")
            if formatted_turns:
                history_str = "\n".join(formatted_turns)

        # 4. Synthesized Grounded Answer Generation
        prompt = f"""
You are an expert AI Study Assistant answering a student's question based strictly on the document excerpts provided below.

DOCUMENT EXCERPTS:
{context_text}

RECENT CONVERSATION HISTORY:
{history_str if history_str else "None"}

STUDENT QUESTION:
{question_clean}

STRICT INSTRUCTIONS:
1. Carefully analyze the student's question and synthesize your answer directly from the document excerpts above.
2. Structure your response with a clear, direct answer first.
3. Follow with key structured details, bullet points, explanations, formulas, or code examples if present in the document.
4. If the information needed to answer the question is completely missing or cannot be inferred from the document excerpts, you MUST respond EXACTLY:
   "I couldn't find this information in the uploaded document."
5. Do NOT invent or extrapolate facts that are not present in the excerpts.
"""
        try:
            handler = self.get_handler(topic="Document Q&A", knowledge_level="Intermediate")
            tutor_agent = handler.agents.tutor_agent()
            resp = tutor_agent.run(prompt, stream=False)
            answer_text = resp.content.strip()

            if answer_text.startswith("```markdown"):
                answer_text = answer_text[11:].strip()
            if answer_text.endswith("```"):
                answer_text = answer_text[:-3].strip()

            if "I couldn't find this information in the uploaded document" in answer_text:
                return {
                    "answer": "I couldn't find this information in the uploaded document.",
                    "sources": []
                }

            if answer_text:
                return {
                    "answer": answer_text,
                    "sources": sources[:3]
                }
        except Exception as e:
            print(f"⚠️ LLM answer generation error: {e}. Utilizing structured offline synthesis.")

        # Resilient offline synthesis from top retrieved chunks
        best_chunk = retrieved_chunks[0]
        fallback_answer = (
            f"Based on your uploaded document (**{best_chunk['filename']}**):\n\n"
            + "\n\n".join([c["text"] for c in retrieved_chunks[:2]])
        )

        return {
            "answer": fallback_answer,
            "sources": sources[:3]
        }


ai_bridge = AIBridgeService()

