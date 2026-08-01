import sys
import os
from app.graph import compiled_graph


def main():
    if not os.environ.get("GROQ_API_KEY"):
        print("ERROR: set GROQ_API_KEY first, e.g.:")
        print('  export GROQ_API_KEY="your-key-here"')
        sys.exit(1)

    if len(sys.argv) < 2:
        print('Usage: python run_task.py "your topic here"')
        sys.exit(1)

    topic = sys.argv[1]

    initial_state = {
        "topic": topic,
        "research_notes": "",
        "validation_passed": False,
        "validation_feedback": "",
        "retry_count": 0,
        "final_report": "",
    }

    print(f"\n{'=' * 60}")
    print(f"Starting run for topic: {topic}")
    print(f"{'=' * 60}\n")

    final_state = compiled_graph.invoke(initial_state)

    print(f"\n{'=' * 60}")
    print(f"RUN COMPLETE - retries used: {final_state['retry_count']}")
    print(f"{'=' * 60}\n")

    if final_state.get("final_report"):
        print("FINAL REPORT:\n")
        print(final_state["final_report"])
    else:
        print("No final report - validation failed after max retries.")
        print("Last feedback:", final_state.get("validation_feedback"))


if __name__ == "__main__":
    main()
