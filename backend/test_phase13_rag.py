import os
import sys
import uuid

# Ensure root is in python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.services.ai_bridge import ai_bridge
from rag_helper import clean_text

def test_rag_pipeline():
    print("=" * 60)
    print("RUNNING COMPREHENSIVE RAG PIPELINE DEBUG & VERIFICATION")
    print("=" * 60)

    # 1. Test Text Cleaning
    raw_sample = "Binary  Search  Algorithm.\n\n\nIt runs in O(log n) time com-\nplexity.\n“Always sorted”.\x00"
    cleaned = clean_text(raw_sample)
    print(f"\n[STEP 1] Text Cleaning Test:")
    print(f"Cleaned output: {repr(cleaned)}")
    assert "complexity" in cleaned, "Hyphenated line break was not joined!"
    assert "\x00" not in cleaned, "Null byte was not stripped!"
    assert "“" not in cleaned, "Smart quote was not normalized!"
    print("✅ Text Cleaning test passed.")

    # 2. Document with Multiple Sections
    user_a_id = f"student_user_a_{uuid.uuid4().hex[:6]}"
    user_b_id = f"student_user_b_{uuid.uuid4().hex[:6]}"

    test_file_path = os.path.join(project_root, "test_os_complete_guide.txt")
    doc_content = """# Operating Systems Master Guide

## Section 1: Process Management & CPU Scheduling
In modern operating systems, CPU scheduling determines which process in the ready queue is allocated CPU time.
- Round Robin (RR): Preemptive scheduling where each process gets a small unit of CPU time called a time quantum (typically 10 to 100 milliseconds).
- Shortest Job Next (SJN): Non-preemptive algorithm that selects the waiting process with the smallest execution time.
- Context Switching: The mechanism of saving the state of the current process and restoring the state of another process.

## Section 2: Concurrency & Deadlocks
Deadlock is a state in which a set of processes are blocked because each process is holding a resource and waiting for another resource acquired by some other process.
The Four Necessary Conditions for Deadlock (Coffman conditions):
1. Mutual Exclusion: At least one resource must be held in a non-shareable mode.
2. Hold and Wait: A process holds at least one resource and requests additional resources held by other processes.
3. No Preemption: Resources cannot be forcibly preempted; they must be released voluntarily.
4. Circular Wait: A closed chain of processes exists where each process waits for a resource held by the next.

Banker's Algorithm:
Developed by Edsger Dijkstra, the Banker's Algorithm is a deadlock avoidance algorithm. It tests for safety by simulating the allocation for predetermined maximum possible amounts of all resources, before deciding whether allocation should be allowed to continue.

## Section 3: Virtual Memory & Page Replacement
Virtual memory allows execution of processes that may not be completely in physical memory.
- Demand Paging: Pages are loaded into memory only when they are referenced during execution.
- Page Fault: An interrupt that occurs when a program tries to access a page that is not currently mapped into physical RAM.
- LRU (Least Recently Used) Algorithm: Replaces the page that has not been used for the longest period of time.
- Thrashing: A phenomenon where the operating system spends more time swapping pages in and out than executing instructions due to insufficient physical memory.
"""
    with open(test_file_path, "w", encoding="utf-8") as f:
        f.write(doc_content)

    print(f"\n[STEP 2 & 3 & 4 & 5] Uploading and Indexing Document for User A ({user_a_id})...")
    upload_res = ai_bridge.upload_document(
        file_path=test_file_path,
        filename="os_complete_guide.txt",
        user_id=user_a_id
    )
    print(f"Upload Result: {upload_res}")
    assert upload_res["success"] is True, "Document upload failed!"
    assert upload_res["num_chunks"] >= 2, "Insufficient chunks generated!"
    doc_id_a = upload_res["doc_id"]
    print(f"✅ Indexed {upload_res['num_chunks']} chunks into ChromaDB for user {user_a_id}.")

    # SCENARIO 1: Question whose answer is clearly present in Section 2 (Deadlock Avoidance)
    print(f"\n[SCENARIO 1 - Factual / Clearly Present]")
    print(f"Question: 'Who developed the Banker\\'s Algorithm and what is its purpose?'")
    q1_res = ai_bridge.query_documents(
        question="Who developed the Banker's Algorithm and what is its purpose?",
        user_id=user_a_id,
        doc_id=doc_id_a
    )
    print(f"Answer:\n{q1_res['answer']}\nSources: {q1_res['sources']}")
    assert "dijkstra" in q1_res["answer"].lower(), "Answer missed Edsger Dijkstra!"
    assert "deadlock" in q1_res["answer"].lower(), "Answer missed deadlock avoidance purpose!"
    print("✅ Scenario 1 Passed.")

    # SCENARIO 2: Question about a different section (Section 3: Virtual Memory)
    print(f"\n[SCENARIO 2 - Different Section / Virtual Memory]")
    print(f"Question: 'What causes Thrashing and what is the LRU page replacement algorithm?'")
    q2_res = ai_bridge.query_documents(
        question="What causes Thrashing and what is the LRU page replacement algorithm?",
        user_id=user_a_id,
        doc_id=doc_id_a
    )
    print(f"Answer:\n{q2_res['answer']}\nSources: {q2_res['sources']}")
    assert "thrashing" in q2_res["answer"].lower() or "swapping" in q2_res["answer"].lower(), "Answer missed Thrashing explanation!"
    assert "least recently used" in q2_res["answer"].lower() or "lru" in q2_res["answer"].lower(), "Answer missed LRU explanation!"
    print("✅ Scenario 2 Passed.")

    # SCENARIO 3: Question requiring information from multiple sections (Section 1 + Section 3)
    print(f"\n[SCENARIO 3 - Multi-Section Synthesis]")
    print(f"Question: 'Compare Round Robin scheduling from CPU scheduling with Demand Paging from Virtual Memory.'")
    q3_res = ai_bridge.query_documents(
        question="Compare Round Robin scheduling from CPU scheduling with Demand Paging from Virtual Memory.",
        user_id=user_a_id,
        doc_id=doc_id_a
    )
    print(f"Answer:\n{q3_res['answer']}\nSources: {q3_res['sources']}")
    assert "round robin" in q3_res["answer"].lower() or "quantum" in q3_res["answer"].lower(), "Answer missed Round Robin context!"
    assert "demand paging" in q3_res["answer"].lower() or "page" in q3_res["answer"].lower() or "virtual" in q3_res["answer"].lower(), "Answer missed Demand Paging context!"
    print("✅ Scenario 3 Passed.")

    # SCENARIO 4: Question that is genuinely NOT present in document
    print(f"\n[SCENARIO 4 - Missing / Out of Scope Information]")
    print(f"Question: 'What are the main causes of global warming and greenhouse gases?'")
    q4_res = ai_bridge.query_documents(
        question="What are the main causes of global warming and greenhouse gases?",
        user_id=user_a_id,
        doc_id=doc_id_a
    )
    print(f"Answer:\n{q4_res['answer']}")
    assert "couldn't find" in q4_res["answer"].lower() or "could not find" in q4_res["answer"].lower(), "Model hallucinated an answer for out-of-scope question!"
    print("✅ Scenario 4 Passed.")

    # SCENARIO 5: User Isolation Test
    print(f"\n[SCENARIO 5 - Multi-User Isolation]")
    print(f"User B ({user_b_id}) querying User A's document...")
    q5_res = ai_bridge.query_documents(
        question="Who developed the Banker's Algorithm?",
        user_id=user_b_id
    )
    print(f"User B Answer:\n{q5_res['answer']}")
    assert "couldn't find" in q5_res["answer"].lower() or "could not find" in q5_res["answer"].lower(), "User B was able to access User A's isolated documents!"
    print("✅ Scenario 5 Passed.")

    # SCENARIO 6: Clean Document Deletion
    print(f"\n[SCENARIO 6 - Document Deletion & Vector Purge]")
    del_ok = ai_bridge.delete_document(doc_id=doc_id_a, user_id=user_a_id)
    assert del_ok is True, "Document deletion failed!"

    q6_res = ai_bridge.query_documents(
        question="Who developed the Banker's Algorithm?",
        user_id=user_a_id
    )
    print(f"Query After Deletion:\n{q6_res['answer']}")
    assert "couldn't find" in q6_res["answer"].lower() or "could not find" in q6_res["answer"].lower(), "Chunks remained in vector store after deletion!"
    print("✅ Scenario 6 Passed.")

    # Cleanup
    if os.path.exists(test_file_path):
        os.remove(test_file_path)

    print("\n" + "=" * 60)
    print("🎉 ALL RAG PIPELINE DEBUG & INTEGRATION SCENARIOS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    test_rag_pipeline()

