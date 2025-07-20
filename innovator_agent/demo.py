from .agent import InnovatorAgent


def main():
    prompt = input("Enter command in Japanese or English: ")
    agent = InnovatorAgent()
    try:
        success = agent.run(prompt)
        print("SUCCESS" if success else "FAILURE")
    finally:
        agent.shutdown()


if __name__ == "__main__":
    main()
