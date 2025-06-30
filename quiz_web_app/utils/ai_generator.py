import openai

openai.api_key = "YOUR_API_KEY"


def generate_quiz(text: str) -> str:
    """Generate a 3-question true/false quiz from text using GPT-3.5."""
    prompt = (
        "次のテキストから〇×クイズを3問作成してください。"
        "形式は次のとおりです:\nQ: 質問\nA: 〇または×"
        f"\n\nテキスト:\n{text}"
    )
    messages = [
        {"role": "system", "content": "あなたは教育者です。"},
        {"role": "user", "content": prompt},
    ]
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages,
    )
    return response.choices[0].message.content.strip()
