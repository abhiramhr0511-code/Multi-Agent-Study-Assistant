import random
from typing import Dict, Any, List, Optional


def shuffle_question_options(question: Dict[str, Any]) -> Dict[str, Any]:
    """
    Randomly shuffles the options of a multiple-choice question while preserving
    the correct answer mapping.
    
    Guarantees that:
    1. The correct answer is not hardcoded or clustered in 'A'.
    2. The options are shuffled randomly across A, B, C, D.
    3. `question['correct_answer']` accurately points to the new key of the correct option text.
    4. `question['options'][question['correct_answer']]` is the original correct text.
    """
    if not isinstance(question, dict):
        return question

    options = question.get("options")
    if not isinstance(options, dict) or not options:
        return question

    raw_correct = str(question.get("correct_answer", "A")).strip()

    # Step 1: Identify the exact text of the correct answer
    if raw_correct in options:
        correct_text = options[raw_correct]
    else:
        # If correct_answer was passed as the answer text instead of the key
        correct_text = raw_correct
        for k, v in options.items():
            if str(v).strip().lower() == raw_correct.lower():
                correct_text = v
                break

    # Step 2: Extract all option texts
    option_texts = list(options.values())
    if correct_text not in option_texts:
        option_texts[0] = correct_text

    # Step 3: Randomly shuffle the option texts
    random.shuffle(option_texts)

    # Step 4: Re-assign standard keys (A, B, C, D)
    keys = ["A", "B", "C", "D"][:len(option_texts)]
    new_options = {k: text for k, text in zip(keys, option_texts)}

    # Step 5: Locate the key containing the correct text
    new_correct_key = "A"
    for k, text in new_options.items():
        if text == correct_text:
            new_correct_key = k
            break

    # Step 6: Return updated question
    updated_q = dict(question)
    updated_q["options"] = new_options
    updated_q["correct_answer"] = new_correct_key
    return updated_q


def shuffle_quiz_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Shuffles options for an entire list of questions.
    """
    if not isinstance(questions, list):
        return []
    return [shuffle_question_options(q) for q in questions]
