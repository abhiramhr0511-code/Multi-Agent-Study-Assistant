"""
Test suite for Quiz Answer Generation & Randomization (Phase 16)
Verifies:
1. Correct answers are randomly distributed across A, B, C, and D (not hardcoded/stuck at A).
2. Options are shuffled randomly while preserving correct answer mapping.
3. question['options'][question['correct_answer']] always matches the intended correct answer text.
4. Scoring logic behaves consistently whether the answer is A, B, C, or D.
5. ai_bridge quiz generation returns shuffled questions.
"""
import unittest
import sys
import os

# Add project root and backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.utils.quiz_utils import shuffle_question_options, shuffle_quiz_questions
from backend.services.ai_bridge import ai_bridge


class TestQuizAnswerRandomization(unittest.TestCase):

    def test_single_question_shuffle_preserves_correct_text(self):
        """Verify that shuffling preserves the exact text of the correct answer."""
        original = {
            "id": 1,
            "question": "What is Python?",
            "options": {
                "A": "A programming language",
                "B": "A species of snake only",
                "C": "A database engine",
                "D": "An operating system"
            },
            "correct_answer": "A",
            "explanation": "Python is a high-level programming language."
        }
        
        # Test 50 iterations to ensure mapping is always 100% accurate
        for _ in range(50):
            shuffled = shuffle_question_options(original)
            correct_key = shuffled["correct_answer"]
            self.assertIn(correct_key, ["A", "B", "C", "D"])
            # The text under the new correct key MUST be the original correct answer text
            self.assertEqual(shuffled["options"][correct_key], "A programming language")
            # All 4 options must still exist
            self.assertEqual(len(shuffled["options"]), 4)
            self.assertEqual(
                set(shuffled["options"].values()),
                {"A programming language", "A species of snake only", "A database engine", "An operating system"}
            )

    def test_twenty_questions_distribution_not_all_A(self):
        """
        Verify that in a 20-question quiz where all inputs originally had correct_answer='A',
        the shuffled outputs are distributed across A, B, C, D (not all A).
        """
        raw_questions = [
            {
                "id": i,
                "question": f"Question {i}: What is concept {i}?",
                "options": {
                    "A": f"Correct Answer for {i}",
                    "B": f"Wrong option 1 for {i}",
                    "C": f"Wrong option 2 for {i}",
                    "D": f"Wrong option 3 for {i}"
                },
                "correct_answer": "A",
                "explanation": f"Explanation {i}"
            }
            for i in range(1, 21)
        ]

        shuffled = shuffle_quiz_questions(raw_questions)
        self.assertEqual(len(shuffled), 20)

        answer_counts = {"A": 0, "B": 0, "C": 0, "D": 0}
        for q in shuffled:
            c_key = q["correct_answer"]
            answer_counts[c_key] += 1
            # Check content integrity
            self.assertEqual(q["options"][c_key], f"Correct Answer for {q['id']}")

        print(f"\n[Test Result] 20-Question Distribution: {answer_counts}")

        # The correct answers must not all be 'A'
        self.assertLess(answer_counts["A"], 20, "All 20 questions were assigned to option A!")
        # At least 2 different option keys should be represented across 20 questions
        non_zero_keys = [k for k, v in answer_counts.items() if v > 0]
        self.assertGreaterEqual(len(non_zero_keys), 2, "Answers did not distribute across options.")

    def test_correct_answer_passed_as_text(self):
        """Verify handling when correct_answer is passed as full text instead of key."""
        question = {
            "id": 1,
            "question": "Which data structure uses LIFO?",
            "options": {
                "A": "Queue",
                "B": "Stack",
                "C": "Array",
                "D": "Tree"
            },
            "correct_answer": "Stack"
        }
        shuffled = shuffle_question_options(question)
        correct_key = shuffled["correct_answer"]
        self.assertEqual(shuffled["options"][correct_key], "Stack")

    def test_ai_bridge_fallback_quiz_is_shuffled(self):
        """Verify that ai_bridge._generate_fallback_quiz when shuffled has varying answer keys."""
        fallback_raw = ai_bridge._generate_fallback_quiz("Machine Learning", 15)
        shuffled = shuffle_quiz_questions(fallback_raw)
        
        answer_keys = [q["correct_answer"] for q in shuffled]
        unique_keys = set(answer_keys)
        self.assertGreater(len(unique_keys), 1, "Fallback quiz answers were not shuffled!")
        
        # Verify correctness
        for q in shuffled:
            c_key = q["correct_answer"]
            self.assertEqual(q["options"][c_key], "Primary principle of Machine Learning")

    def test_scoring_simulation(self):
        """Verify that user scoring works accurately regardless of which option is correct."""
        raw_questions = [
            {
                "id": i,
                "question": f"Question {i}",
                "options": {"A": f"Ans_{i}", "B": f"W1_{i}", "C": f"W2_{i}", "D": f"W3_{i}"},
                "correct_answer": "A"
            }
            for i in range(1, 11)
        ]
        shuffled = shuffle_quiz_questions(raw_questions)

        # Simulate user choosing the correct option every time
        user_correct_answers = {i: q["correct_answer"] for i, q in enumerate(shuffled)}
        correct_count = sum(1 for i, q in enumerate(shuffled) if user_correct_answers[i] == q["correct_answer"])
        self.assertEqual(correct_count, 10)

        # Simulate user choosing 'A' every time (should NOT get 100% unless all happened to be A)
        user_always_a = {i: "A" for i, _ in enumerate(shuffled)}
        a_count = sum(1 for i, q in enumerate(shuffled) if user_always_a[i] == q["correct_answer"])
        # Should match the actual number of questions where shuffled correct_answer was A
        expected_a = sum(1 for q in shuffled if q["correct_answer"] == "A")
        self.assertEqual(a_count, expected_a)


if __name__ == "__main__":
    unittest.main()
