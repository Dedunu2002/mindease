# test_gemini.py
# Run: python test_gemini.py
# Confirms your Gemini API key works before building MindBot

from google import genai
from config import Config

print("Testing Gemini API connection...")

# Configure the API with new client
client = genai.Client(api_key=Config.GEMINI_API_KEY)

# ── MindEase system prompt ────────────────────────────────────
SYSTEM_PROMPT = """You are MindBot, a compassionate and supportive mental health
assistant for university students at Sri Lankan universities.

Your role is to:
- Listen empathetically to students who are feeling stressed, anxious, or overwhelmed
- Offer practical, evidence-based coping strategies (breathing exercises, time management, sleep hygiene)
- Encourage students to seek professional help from their university counsellor when needed
- Always respond in a warm, non-judgmental, and supportive tone

You must NEVER:
- Attempt to diagnose any mental health condition
- Replace professional mental health advice or therapy
- Provide specific medication recommendations
- Dismiss or minimise a student's feelings

If a student expresses thoughts of self-harm or suicide, immediately:
1. Acknowledge their feelings with compassion
2. Encourage them to call Sumithrayo Sri Lanka: 1926
3. Suggest they speak with their university counsellor immediately
"""

try:
    test_message = "I am really stressed about my exams and I cannot sleep properly."

    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=SYSTEM_PROMPT + "\n\nStudent: " + test_message
    )

    print("✅ Gemini API connected successfully!\n")
    print("--- Test conversation ---")
    print(f"Student: {test_message}")
    print(f"\nMindBot: {response.text}")
    print("\n✅ MindBot is ready for Day 17!")

except Exception as e:
    print(f"❌ Error: {e}")
    print("\nCheck:")
    print("  1. Is your API key correct in config.py?")
    print("  2. Do you have internet connection?")
    print("  3. Run: pip install google-genai")