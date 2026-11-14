from phi.agent import Agent
from phi.model.openai import OpenAIChat
from phi.model.groq import Groq
from phi.tools import Toolkit
from phi.utils.log import logger

import yaml
import os
import json
from typing import Any, Optional


# ============================================================
# DuckDuckGo Search
# ============================================================

try:
    from ddgs import DDGS
except ImportError:
    DDGS = None


class RobustDuckDuckGo(Toolkit):
    """
    Robust DuckDuckGo search toolkit.

    Uses the modern `ddgs` package and performs a single search
    request instead of manually cycling through api/html/lite
    backends.

    If DuckDuckGo is unavailable or rate-limited, the tool returns
    a graceful fallback so the Resource Finder agent can continue.
    """

    def __init__(
        self,
        search: bool = True,
        news: bool = False,
        modifier: Optional[str] = None,
        fixed_max_results: Optional[int] = None,
        headers: Optional[Any] = None,
        proxy: Optional[str] = None,
        proxies: Optional[Any] = None,
        timeout: Optional[int] = 10,
        verify_ssl: bool = True,
    ):

        super().__init__(name="duckduckgo")

        self.headers: Optional[Any] = headers or {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 "
                "(KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }

        self.proxy: Optional[str] = proxy
        self.proxies: Optional[Any] = proxies
        self.timeout: Optional[int] = timeout
        self.fixed_max_results: Optional[int] = fixed_max_results
        self.modifier: Optional[str] = modifier
        self.verify_ssl: bool = verify_ssl

        if search:
            self.register(self.duckduckgo_search)

        if news:
            self.register(self.duckduckgo_news)

    # ========================================================
    # Text Search
    # ========================================================

    def duckduckgo_search(
        self,
        query: str,
        max_results: int = 5
    ) -> str:
        """
        Search DuckDuckGo using the ddgs package.

        Returns a JSON string containing search results.
        """

        logger.debug(
            f"Searching DuckDuckGo for: {query}"
        )

        # ----------------------------------------------------
        # Check package
        # ----------------------------------------------------

        if DDGS is None:

            logger.warning(
                "ddgs package is not installed."
            )

            return json.dumps(
                [
                    {
                        "title": "Search tool unavailable",
                        "href": "",
                        "body": (
                            "The ddgs search package is not "
                            "available. Use the AI's knowledge "
                            "to recommend suitable resources."
                        ),
                    }
                ],
                indent=2,
            )

        # ----------------------------------------------------
        # Prepare query
        # ----------------------------------------------------

        search_query = (
            f"{self.modifier} {query}"
            if self.modifier
            else query
        )

        num_results = (
            self.fixed_max_results
            or max_results
        )

        # Keep requests reasonable
        num_results = min(
            max(1, num_results),
            10
        )

        # ----------------------------------------------------
        # Perform search
        # ----------------------------------------------------

        try:

            ddgs = DDGS(
                proxy=self.proxy,
                timeout=self.timeout,
            )

            results = ddgs.text(
                query=search_query,
                max_results=num_results,
            )

            if results:

                logger.debug(
                    f"DuckDuckGo returned "
                    f"{len(results)} results."
                )

                return json.dumps(
                    results,
                    indent=2,
                    ensure_ascii=False
                )

            logger.warning(
                f"DuckDuckGo returned no results "
                f"for '{search_query}'."
            )

        except Exception as e:

            logger.warning(
                f"DuckDuckGo search unavailable "
                f"for '{search_query}': {e}"
            )

        # ----------------------------------------------------
        # Graceful fallback
        # ----------------------------------------------------

        logger.warning(
            f"DuckDuckGo search unavailable for "
            f"query '{search_query}'. "
            f"Using graceful fallback."
        )

        return json.dumps(
            [
                {
                    "title": (
                        f"Curated Resources for {query}"
                    ),
                    "href": (
                        "https://duckduckgo.com/?q="
                        + query.replace(" ", "+")
                    ),
                    "body": (
                        "DuckDuckGo search is temporarily "
                        "unavailable. The Resource Finder "
                        "should use its knowledge to recommend "
                        "high-quality courses, tutorials, "
                        "documentation, and learning materials "
                        f"for {query}."
                    ),
                }
            ],
            indent=2,
            ensure_ascii=False
        )

    # ========================================================
    # News Search
    # ========================================================

    def duckduckgo_news(
        self,
        query: str,
        max_results: int = 5
    ) -> str:
        """
        Search DuckDuckGo news using ddgs.
        """

        if DDGS is None:

            logger.warning(
                "ddgs package is not installed."
            )

            return json.dumps([])

        try:

            ddgs = DDGS(
                proxy=self.proxy,
                timeout=self.timeout,
            )

            num_results = (
                self.fixed_max_results
                or max_results
            )

            num_results = min(
                max(1, num_results),
                10
            )

            results = ddgs.news(
                query=query,
                max_results=num_results,
            )

            return json.dumps(
                results or [],
                indent=2,
                ensure_ascii=False
            )

        except Exception as e:

            logger.warning(
                f"DuckDuckGo news unavailable "
                f"for '{query}': {e}"
            )

            return json.dumps([])


# ============================================================
# Study Agents
# ============================================================

class StudyAgents:

    def __init__(
        self,
        topic,
        subject_category,
        knowledge_level,
        learning_goal,
        time_available,
        learning_style,
        model_name="gpt-4o",
        provider="openai"
    ):
        """
        Initialize study assistant agents.

        Args:
            topic: Specific topic or subject.
            subject_category: Subject category.
            knowledge_level: Student's current level.
            learning_goal: Student's learning goal.
            time_available: Available study time.
            learning_style: Preferred learning style.
            model_name: AI model name.
            provider: AI provider ("openai" or "groq").
        """

        self.topic = topic
        self.subject_category = subject_category
        self.knowledge_level = knowledge_level
        self.learning_goal = learning_goal
        self.time_available = time_available
        self.learning_style = learning_style
        self.model_name = model_name
        self.provider = provider

        self.personas = self._load_personas()

    # ========================================================
    # Load Personas
    # ========================================================

    def _load_personas(self):
        prompts_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts.yaml")
        with open(
            prompts_path,
            "r",
            encoding="utf-8"
        ) as file:

            config = yaml.safe_load(file)

            return config.get(
                "personas",
                {}
            )

    # ========================================================
    # Learning Style
    # ========================================================

    def _get_learning_style_info(self):
        prompts_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts.yaml")
        with open(
            prompts_path,
            "r",
            encoding="utf-8"
        ) as file:

            config = yaml.safe_load(file)

            return config.get(
                "learning_styles",
                {}
            ).get(
                self.learning_style,
                {}
            )

    # ========================================================
    # Model
    # ========================================================

    def _get_model(
        self,
        temperature=0.7
    ):
        groq_api_key = os.getenv("GROQ_API_KEY")
        openai_api_key = os.getenv("OPENAI_API_KEY")

        provider = self.provider
        # Auto-detect provider if specified one has no valid key
        if provider == "groq" and (not groq_api_key or "your_" in groq_api_key):
            if openai_api_key and "your_" not in openai_api_key:
                provider = "openai"
        elif provider == "openai" and (not openai_api_key or "your_" in openai_api_key):
            if groq_api_key and "your_" not in groq_api_key:
                provider = "groq"

        if provider == "groq":
            model_id = self.model_name
            # Ensure model_id is a valid Groq model name
            if not model_id or "gpt" in model_id.lower() or "oss" in model_id.lower():
                model_id = "llama-3.3-70b-versatile"
            return Groq(
                id=model_id,
                api_key=groq_api_key,
                temperature=temperature
            )

        model_id = self.model_name
        if not model_id or "llama" in model_id.lower() or "oss" in model_id.lower():
            model_id = "gpt-4o"
        return OpenAIChat(
            id=model_id,
            api_key=openai_api_key,
            temperature=temperature
        )

    # ========================================================
    # Student Analyzer
    # ========================================================

    def student_analyzer_agent(self):

        system_prompt = (
            self.personas
            .get("student_analyzer", {})
            .get("system_prompt", "")
        )

        learning_style_info = (
            self._get_learning_style_info()
        )

        full_prompt = f"""
{system_prompt}

You are analyzing a student who wants to learn about
{self.topic}.

STUDENT PROFILE:

- Current Knowledge Level: {self.knowledge_level}
- Learning Goal: {self.learning_goal}
- Available Time: {self.time_available}
- Learning Style: {self.learning_style}
- Learning Style Notes:
  {learning_style_info.get('description', '')}
"""

        return Agent(
            model=self._get_model(
                temperature=0.6
            ),
            system_prompt=full_prompt
        )

    # ========================================================
    # Roadmap Creator
    # ========================================================

    def roadmap_creator_agent(self):

        system_prompt = (
            self.personas
            .get("roadmap_creator", {})
            .get("system_prompt", "")
        )

        learning_style_info = (
            self._get_learning_style_info()
        )

        recommendations = (
            learning_style_info
            .get("recommendations", [])
        )

        full_prompt = f"""
{system_prompt}

You are creating a personalized learning roadmap
for {self.topic}.

STUDENT CONTEXT:

- Knowledge Level: {self.knowledge_level}
- Learning Goal: {self.learning_goal}
- Time Available: {self.time_available}
- Learning Style: {self.learning_style}

LEARNING STYLE RECOMMENDATIONS:

{chr(10).join(
    f'- {rec}'
    for rec in recommendations
)}
"""

        return Agent(
            model=self._get_model(
                temperature=0.7
            ),
            system_prompt=full_prompt
        )

    # ========================================================
    # Quiz Generator
    # ========================================================

    def quiz_generator_agent(self):

        system_prompt = (
            self.personas
            .get("quiz_generator", {})
            .get("system_prompt", "")
        )

        full_prompt = f"""
{system_prompt}

You are creating quizzes for a student
learning {self.topic}.

STUDENT LEVEL:
{self.knowledge_level}

Ensure questions are appropriate for this
knowledge level and help the student progress
toward their goal:

{self.learning_goal}
"""

        return Agent(
            model=self._get_model(
                temperature=0.5
            ),
            system_prompt=full_prompt
        )

    # ========================================================
    # Tutor
    # ========================================================

    def tutor_agent(self):

        system_prompt = (
            self.personas
            .get("tutor_agent", {})
            .get("system_prompt", "")
        )

        learning_style_info = (
            self._get_learning_style_info()
        )

        full_prompt = f"""
{system_prompt}

You are tutoring a student on {self.topic}.

STUDENT CONTEXT:

- Knowledge Level: {self.knowledge_level}
- Learning Style: {self.learning_style}
- Learning Style Description:
  {learning_style_info.get('description', '')}

Adapt your explanations to match the student's
learning style and knowledge level.
"""

        return Agent(
            model=self._get_model(
                temperature=0.7
            ),
            system_prompt=full_prompt
        )

    # ========================================================
    # Resource Finder
    # ========================================================

    def resource_finder_agent(self):

        system_prompt = (
            self.personas
            .get("resource_finder", {})
            .get("system_prompt", "")
        )

        learning_style_info = (
            self._get_learning_style_info()
        )

        full_prompt = f"""
{system_prompt}

You are finding learning resources for
{self.topic}.

STUDENT PREFERENCES:

- Knowledge Level: {self.knowledge_level}
- Learning Style: {self.learning_style}
- Learning Goal: {self.learning_goal}

Prioritize resources that match the
{self.learning_style} learning style.

SEARCH INSTRUCTIONS:

- Use the search tool when current web resources
  are useful.
- Prefer high-quality educational resources.
- Prefer free resources when possible.
- Avoid duplicate resources.
- Match resources to the student's learning style.
- If web search is unavailable, continue using
  your own knowledge instead of failing.
"""

        return Agent(
            model=self._get_model(
                temperature=0.6
            ),

            tools=[
                RobustDuckDuckGo()
            ],

            # Hide technical tool execution
            # messages from the student UI.
            show_tool_calls=False,

            system_prompt=full_prompt
        )

    # ========================================================
    # RAG Tutor
    # ========================================================

    def rag_tutor_agent(
        self,
        knowledge_base=None
    ):

        system_prompt = (
            self.personas
            .get("tutor_agent", {})
            .get("system_prompt", "")
        )

        full_prompt = f"""
{system_prompt}

You are tutoring a student on {self.topic}
using provided study materials.

IMPORTANT:

- Base your answers on the provided context
  from the student's documents.
- If information isn't in the provided context,
  acknowledge this.
- Cite specific sections when referencing
  the materials.
- Help the student understand the material deeply.

STUDENT LEVEL:
{self.knowledge_level}
"""

        agent_config = {
            "model": self._get_model(
                temperature=0.6
            ),
            "system_prompt": full_prompt
        }

        # Add knowledge base if provided
        if knowledge_base:

            agent_config[
                "knowledge_base"
            ] = knowledge_base

            agent_config[
                "search_knowledge"
            ] = True

        return Agent(
            **agent_config
        )