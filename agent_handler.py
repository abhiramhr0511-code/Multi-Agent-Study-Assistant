import os
import sys
import warnings
import yaml
import json
from contextlib import contextmanager
import streamlit as st
from study_agents import StudyAgents
from rag_helper import RAGHelper
from typing import Optional, Dict, Any
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, logging as tf_logging

# Suppress unnecessary Transformers and User warnings
tf_logging.set_verbosity_error()
warnings.filterwarnings("ignore", category=UserWarning)


class SafeStatus:
    """
    A safe status object wrapper.
    In Streamlit environment, forwards updates to the active st.status object.
    In non-Streamlit (FastAPI), gracefully no-ops without throwing AttributeError or Streamlit exceptions.
    """
    def __init__(self, real_status=None):
        self.real_status = real_status

    def update(self, label: Optional[str] = None, state: Optional[str] = None, expanded: Optional[bool] = None):
        if self.real_status is not None:
            try:
                kwargs = {}
                if label is not None:
                    kwargs["label"] = label
                if state is not None:
                    kwargs["state"] = state
                if expanded is not None:
                    kwargs["expanded"] = expanded
                self.real_status.update(**kwargs)
            except Exception:
                pass


@contextmanager
def safe_status(label: str, expanded: bool = True):
    """
    Context manager that safely manages st.status UI containers.
    If Streamlit runtime is available, creates and enters st.status.
    Otherwise yields a no-op SafeStatus object.
    """
    real_status = None
    try:
        if st is not None and hasattr(st, "status"):
            real_status = st.status(label, expanded=expanded)
    except Exception:
        real_status = None

    if real_status is not None:
        try:
            with real_status as s:
                yield SafeStatus(s)
        except Exception:
            yield SafeStatus(None)
    else:
        yield SafeStatus(None)


def safe_set_session_state(key: str, value: Any):
    """Safely set Streamlit session state if active."""
    try:
        if st is not None and hasattr(st, "session_state"):
            setattr(st.session_state, key, value)
    except Exception:
        pass


def safe_st_error(msg: str):
    """Safely display Streamlit error if active."""
    try:
        if st is not None and hasattr(st, "error"):
            st.error(msg)
    except Exception:
        pass


class StudyAssistantHandler:
    def __init__(self, topic, subject_category, knowledge_level, learning_goal, 
                 time_available, learning_style, model_name="llama-3.3-70b-versatile", provider="groq"):
        """
        Initialize the study assistant handler.
        
        Args:
            topic (str): The specific topic or subject to study
            subject_category (str): The category of the subject
            knowledge_level (str): Student's current knowledge level
            learning_goal (str): What the student wants to achieve
            time_available (str): How much time the student has
            learning_style (str): Student's preferred learning style
            model_name (str): The model to use
            provider (str): The AI provider ("openai" or "groq")
        """
        self.topic = topic
        self.subject_category = subject_category
        self.knowledge_level = knowledge_level
        self.learning_goal = learning_goal
        self.time_available = time_available
        self.learning_style = learning_style
        self.model_name = model_name
        self.provider = provider
        self.agents = StudyAgents(
            topic, subject_category, knowledge_level, learning_goal,
            time_available, learning_style, model_name, provider,
        )
        self.config = self._load_config()
        self.rag_helper = None
        self.local_qa_tokenizer = None
        self.local_qa_model = None
    
    def _load_config(self):
        """
        Load the complete configuration from the YAML file.
        
        Returns:
            dict: A dictionary of configuration data
        """
        prompts_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts.yaml")
        with open(prompts_path, "r", encoding="utf-8") as file:
            return yaml.safe_load(file)
    
    def _format_prompt(self, prompt_template, **kwargs):
        """
        Format a prompt template with variables.
        
        Args:
            prompt_template (str): The prompt template to format
            **kwargs: The variables to insert into the template
            
        Returns:
            str: The formatted prompt
        """
        return prompt_template.format(**kwargs)
    
    def analyze_student(self):
        """
        Analyze the student's learning needs and create a profile.
        
        Returns:
            dict: Analysis results
        """
        results = {}
        
        with safe_status("Analyzing your learning needs...", expanded=True) as status:
            status.update(label="Creating student profile...", state="running")
            
            analyzer = self.agents.student_analyzer_agent()
            analysis_prompt = self._format_prompt(
                self.config["prompts"]["student_analysis"]["base"],
                topic=self.topic,
                subject_category=self.subject_category,
                knowledge_level=self.knowledge_level,
                learning_goal=self.learning_goal,
                time_available=self.time_available,
                learning_style=self.learning_style
            )
            
            analysis_resp = analyzer.run(analysis_prompt, stream=False)
            analysis_result = analysis_resp.content
            results["analysis"] = analysis_result
            safe_set_session_state("student_analysis", analysis_result)
            
            status.update(label="Analysis complete!", state="complete")
        
        return results
    
    def create_roadmap(self, student_analysis: str):
        """
        Create a personalized learning roadmap based on student analysis.
        
        Args:
            student_analysis (str): The student analysis from analyze_student()
            
        Returns:
            dict: Roadmap results
        """
        results = {}
        
        with safe_status("Creating your personalized learning roadmap...", expanded=True) as status:
            status.update(label="Designing learning path...", state="running")
            
            roadmap_creator = self.agents.roadmap_creator_agent()
            roadmap_prompt = self._format_prompt(
                self.config["prompts"]["roadmap_creation"]["base"],
                student_analysis=student_analysis,
                topic=self.topic,
                learning_goal=self.learning_goal,
                time_available=self.time_available,
                knowledge_level=self.knowledge_level
            )
            
            roadmap_resp = roadmap_creator.run(roadmap_prompt, stream=False)
            roadmap_result = roadmap_resp.content
            results["roadmap"] = roadmap_result
            safe_set_session_state("learning_roadmap", roadmap_result)
            
            status.update(label="Roadmap created!", state="complete")
        
        return results
    
    def find_resources(self):
        """
        Find and recommend learning resources for the topic.
        
        Returns:
            dict: Resource recommendations
        """
        results = {}
        
        with safe_status("Finding learning resources...", expanded=True) as status:
            status.update(label="Searching for resources...", state="running")
            
            resource_finder = self.agents.resource_finder_agent()
            resource_prompt = self._format_prompt(
                self.config["prompts"]["resource_finding"]["base"],
                topic=self.topic,
                learning_goal=self.learning_goal,
                knowledge_level=self.knowledge_level,
                learning_style=self.learning_style
            )
            
            resource_resp = resource_finder.run(resource_prompt, stream=False)
            resource_result = resource_resp.content
            results["resources"] = resource_result
            safe_set_session_state("learning_resources", resource_result)
            
            status.update(label="Resources found!", state="complete")
        
        return results
    
    def generate_quiz(
        self,
        difficulty_level: str = "intermediate",
        focus_areas: str = "general",
        num_questions: int = 10
    ):
        """
        Generate a structured interactive quiz in small batches.
        Each batch contains a maximum of 5 questions.
        Failed batches are automatically retried.
        """

        results = {}
        all_questions = []

        batch_size = 5
        remaining = num_questions

        with safe_status("Generating quiz...", expanded=True) as status:

            try:

                while remaining > 0:

                    current_batch = min(batch_size, remaining)

                    batch_start = len(all_questions) + 1
                    batch_end = len(all_questions) + current_batch

                    status.update(
                        label=f"Generating questions "
                              f"({batch_start}-{batch_end})...",
                        state="running"
                    )

                    print(
                        f"\nGenerating batch: "
                        f"{batch_start}-{batch_end}"
                    )

                    # -----------------------------------------
                    # Retry failed batch up to 3 times
                    # -----------------------------------------

                    batch_questions = None

                    for attempt in range(1, 4):

                        try:

                            quiz_generator = (
                                self.agents.quiz_generator_agent()
                            )

                            quiz_prompt = self._format_prompt(
                                self.config["prompts"]["quiz_generation"]["base"],
                                topic=self.topic,
                                difficulty_level=difficulty_level,
                                focus_areas=focus_areas,
                                num_questions=current_batch
                            )

                            # On retry, add extra instruction
                            if attempt > 1:

                                quiz_prompt += """

IMPORTANT RETRY:
Your previous response was invalid JSON.

Generate exactly the requested number of questions again.

Return ONLY valid JSON.
Do not include Markdown.
Do not include ```json.
Keep explanations short.
Make sure every JSON object and array is properly closed.
Make sure commas are present between all JSON fields.
"""

                            quiz_resp = quiz_generator.run(
                                quiz_prompt,
                                stream=False
                            )

                            quiz_result = quiz_resp.content

                            print(
                                f"Batch {batch_start}-{batch_end} "
                                f"attempt {attempt}"
                            )

                            # ---------------------------------
                            # Clean AI response
                            # ---------------------------------

                            cleaned_result = quiz_result.strip()

                            if cleaned_result.startswith("```json"):
                                cleaned_result = (
                                    cleaned_result[7:].strip()
                                )

                            elif cleaned_result.startswith("```"):
                                cleaned_result = (
                                    cleaned_result[3:].strip()
                                )

                            if cleaned_result.endswith("```"):
                                cleaned_result = (
                                    cleaned_result[:-3].strip()
                                )

                            # ---------------------------------
                            # Extract JSON object
                            # ---------------------------------

                            start = cleaned_result.find("{")
                            end = cleaned_result.rfind("}")

                            if start == -1 or end == -1:
                                raise ValueError(
                                    "No complete JSON object found."
                                )

                            cleaned_result = (
                                cleaned_result[start:end + 1]
                            )

                            # ---------------------------------
                            # Parse JSON
                            # ---------------------------------

                            quiz_data = json.loads(
                                cleaned_result
                            )

                            questions = quiz_data.get(
                                "questions"
                            )

                            if not isinstance(
                                questions,
                                list
                            ):
                                raise ValueError(
                                    "Invalid questions list."
                                )

                            if len(questions) < current_batch:
                                raise ValueError(
                                    f"AI generated only "
                                    f"{len(questions)} questions "
                                    f"instead of "
                                    f"{current_batch}."
                                )

                            # ---------------------------------
                            # Validate questions
                            # ---------------------------------

                            required_fields = [
                                "question",
                                "options",
                                "correct_answer",
                                "explanation",
                                "key_concept"
                            ]

                            for question in questions:

                                for field in required_fields:

                                    if field not in question:
                                        raise ValueError(
                                            f"Missing field: {field}"
                                        )

                                options = question["options"]

                                if not isinstance(
                                    options,
                                    dict
                                ):
                                    raise ValueError(
                                        "Invalid options."
                                    )

                                if set(options.keys()) != {
                                    "A",
                                    "B",
                                    "C",
                                    "D"
                                }:
                                    raise ValueError(
                                        "Every question must have "
                                        "A, B, C and D."
                                    )

                                if question[
                                    "correct_answer"
                                ] not in {
                                    "A",
                                    "B",
                                    "C",
                                    "D"
                                }:
                                    raise ValueError(
                                        "Invalid correct answer."
                                    )

                            # ---------------------------------
                            # Batch successful
                            # ---------------------------------

                            batch_questions = (
                                questions[:current_batch]
                            )

                            print(
                                f"Batch {batch_start}-{batch_end} "
                                f"generated successfully."
                            )

                            break

                        except (
                            json.JSONDecodeError,
                            ValueError
                        ) as e:

                            print(
                                f"\nBatch {batch_start}-{batch_end} "
                                f"attempt {attempt} failed:"
                            )

                            print(e)

                            if attempt < 3:

                                status.update(
                                    label=(
                                        f"Retrying questions "
                                        f"({batch_start}-{batch_end})..."
                                    ),
                                    state="running"
                                )

                            else:

                                raise ValueError(
                                    f"Unable to generate batch "
                                    f"{batch_start}-{batch_end} "
                                    f"after 3 attempts."
                                )

                    # -----------------------------------------
                    # Make sure batch exists
                    # -----------------------------------------

                    if not batch_questions:
                        raise ValueError(
                            f"Batch {batch_start}-{batch_end} "
                            f"could not be generated."
                        )

                    # -----------------------------------------
                    # Add batch to final quiz
                    # -----------------------------------------

                    all_questions.extend(
                        batch_questions
                    )

                    remaining = (
                        num_questions -
                        len(all_questions)
                    )

                    print(
                        f"Total questions generated: "
                        f"{len(all_questions)}/{num_questions}"
                    )

                # -----------------------------------------
                # Final validation
                # -----------------------------------------

                if len(all_questions) != num_questions:

                    raise ValueError(
                        f"Expected {num_questions} questions "
                        f"but generated "
                        f"{len(all_questions)}."
                    )

                # -----------------------------------------
                # Final quiz
                # -----------------------------------------

                results["quiz"] = {
                    "questions": all_questions
                }

                status.update(
                    label="Quiz ready!",
                    state="complete"
                )

                print(
                    f"\nQuiz successfully generated: "
                    f"{len(all_questions)} questions."
                )

            except Exception as e:

                status.update(
                    label="Quiz generation failed",
                    state="error"
                )

                safe_st_error(
                    f"Unable to generate the quiz: {e}"
                )

                print(
                    "\n========== QUIZ ERROR =========="
                )
                print(e)
                print(
                    "================================\n"
                )

                results["quiz"] = None

        return results
    
    def get_tutoring(self, student_question: str, context: str = ""):
        """
        Get tutoring help on a specific question.
        
        Args:
            student_question (str): The student's question
            context (str): Additional context
            
        Returns:
            str: Tutoring response
        """
        tutor = self.agents.tutor_agent()
        tutor_prompt = self._format_prompt(
            self.config["prompts"]["tutoring"]["base"],
            student_question=student_question,
            context=context,
            knowledge_level=self.knowledge_level
        )
        
        tutor_resp = tutor.run(tutor_prompt, stream=False)
        return tutor_resp.content
    
    def initialize_rag(self, collection_name: str = "study_materials"):
        """
        Initialize RAG helper for document-based learning.
        
        Args:
            collection_name (str): Name for the document collection
        """
        self.rag_helper = RAGHelper(collection_name=collection_name)
    
    def add_document_to_rag(self, file_path: str, file_type: str = "pdf", user_id: str = "default_user") -> bool:
        """
        Add a document to the RAG knowledge base.
        
        Args:
            file_path (str): Path to the document
            file_type (str): Type of document ("pdf" or "text")
            user_id (str): User ID for isolation
            
        Returns:
            bool: Success status
        """
        if not self.rag_helper:
            self.initialize_rag()
        
        if file_type == "pdf":
            success, _, _ = self.rag_helper.load_pdf(file_path, user_id=user_id)
            return success
        elif file_type == "text":
            success, _, _ = self.rag_helper.load_text(file_path, user_id=user_id)
            return success
        return False

    def initialize_local_qa(self):
        """
        Initialize the local Document Q&A model.
        Runs locally using google/flan-t5-small via direct Transformers API.
        No Groq API.
        No OpenAI API.
        """
        if self.local_qa_model is None or self.local_qa_tokenizer is None:
            print("========================================")
            print("Loading local Q&A model...")
            print("Model: google/flan-t5-small")
            print("Device: CPU")
            print("========================================")

            try:
                model_name = "google/flan-t5-small"
                self.local_qa_tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.local_qa_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
                print("✅ Local Q&A model loaded successfully.")

            except Exception as e:
                print(f"❌ Error loading local Q&A model: {e}")
                self.local_qa_tokenizer = None
                self.local_qa_model = None
                raise e

        return self.local_qa_model, self.local_qa_tokenizer

    def query_documents(self, question: str, user_id: Optional[str] = None, doc_id: Optional[str] = None, k: int = 6) -> str:
        """
        Answer questions using local RAG.
        """
        if not self.rag_helper:
            return "No documents have been uploaded yet. Please upload study materials first."

        if not question or not question.strip():
            return "Please enter a question."

        # 1. Retrieve relevant document chunks with scores
        chunks = self.rag_helper.query_with_scores(
            question=question.strip(),
            user_id=user_id,
            doc_id=doc_id,
            k=k
        )

        if not chunks:
            return "I couldn't find this information in the uploaded document."

        # Distance threshold filtering
        valid_chunks = [c for c in chunks if c["score"] <= 1.35]
        if not valid_chunks:
            if chunks[0]["score"] <= 1.45:
                valid_chunks = [chunks[0]]
            else:
                return "I couldn't find this information in the uploaded document."

        context = "\n\n".join([f"[Source: {c['filename']}, p.{c['page']}]\n{c['text']}" for c in valid_chunks[:4]])

        # Try LLM tutor agent first if available
        try:
            tutor_agent = self.agents.tutor_agent()
            prompt = f"""
Answer the student's question based STRICTLY on the document context below.
If the information is not in the context, respond EXACTLY with:
"I couldn't find this information in the uploaded document."

CONTEXT:
{context}

QUESTION:
{question.strip()}
"""
            resp = tutor_agent.run(prompt, stream=False)
            ans = resp.content.strip()
            if ans:
                return ans
        except Exception:
            pass

        # Try FLAN-T5 model
        try:
            qa_model, qa_tokenizer = self.initialize_local_qa()
            rag_prompt = f"Answer the question based on the context below.\n\nQuestion: {question.strip()}\n\nContext:\n{context[:1500]}\n\nAnswer:"
            inputs = qa_tokenizer(rag_prompt, return_tensors="pt", truncation=True, max_length=1024)
            outputs = qa_model.generate(inputs["input_ids"], max_new_tokens=180, do_sample=False, num_beams=2, early_stopping=True)
            answer = qa_tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
            if answer.lower().startswith("answer:"):
                answer = answer[7:].strip()
            if answer and len(answer) >= 5 and "unanswerable" not in answer.lower():
                return answer
        except Exception:
            pass

        # Extractive fallback
        q_words = [w.lower() for w in question.strip().split() if len(w) > 3]
        for c in valid_chunks:
            for sentence in c["text"].split("."):
                sentence_clean = sentence.strip()
                if len(sentence_clean) > 15 and any(w in sentence_clean.lower() for w in q_words):
                    return sentence_clean + "."

        return "I couldn't find this information in the uploaded document."
    
    def get_document_count(self) -> int:
        """
        Get the number of documents in the RAG knowledge base.
        
        Returns:
            int: Number of documents
        """
        if not self.rag_helper:
            return 0
        return self.rag_helper.get_document_count()
    
    def clear_documents(self) -> bool:
        """
        Clear all documents from the RAG knowledge base.
        Returns:
            bool: Success status
        """
        if not self.rag_helper:
            return False
        return self.rag_helper.clear_database()
