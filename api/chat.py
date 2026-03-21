"""
Vercel Serverless Function — AI Chat backend for muhammademmasiddiqui.github.io
Deploy on Vercel and set the environment variable: GROQ_API_KEY
"""

import os

from groq import Groq
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Allowed origins (restrict to your GitHub Pages domain + local dev) ────────
ALLOWED_ORIGINS = [
    "https://muhammademmasiddiqui.github.io",
    "https://MuhammadEmmadSiddiqui.github.io",
    "http://localhost:8080",
    "http://localhost:8000",
    "http://localhost:5500",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:5500",
]

app = Flask(__name__)
CORS(app, origins=ALLOWED_ORIGINS, methods=["POST", "OPTIONS"], allow_headers=["Content-Type"])

# ── System prompt describing Emmad ────────────────────────────────────────────
SYSTEM_PROMPT = """
You are an AI assistant embedded on Muhammad Emmad Siddiqui's personal academic website.
Your role is to answer visitor questions about Emmad in a friendly, concise, and professional tone.
Keep answers brief (2–4 sentences) unless more detail is clearly needed.

== About Emmad ==
- AI Researcher based in Karachi, Pakistan
- MS in Data Science, FAST NUCES (2023–2025), advised by Dr. Rafi
- B.E. from School of Engineering, NED University of Engineering & Technology (2018–2022), advised by Dr. Wasif
- Contact: k238020@nu.edu.pk

== Research ==
- Trustworthy AI: Conformal Inference, Uncertainty Quantification, Risk Control
- AI Safety & Alignment: applying statistical guarantees to Foundation Models (LLMs, VLMs)
- MS Thesis (defended Nov 2025): "A Step Forward Towards Trustworthy Risk-Aware Facial Retrieval (RA-FR)"
  * Risk-aware facial-image retrieval using uncertainty estimation + conformal prediction + self-supervised DINO features
  * Evaluated on the SCFace dataset; achieves statistically controlled retrieval risk

== Work Experience ==
- Data Scientist at GSK (GlaxoSmithKline) — Global Supply Chain Tech, building computer vision solutions
- Teaching Assistant at FAST NUCES for Advanced Computer Vision (post-grad) with Dr. Maria (from Jul 2025)

== Publications ==
1. "A Step Forward Towards Trustworthy Risk-Aware Facial Retrieval (RA-FR)" — MS Thesis, FAST NUCES, 2025
2. "Mango Farming Optimization With AI: Boosting Cultivation Efficiency" — IEEE ICCIT, Tabuk, 2023
   Co-authored with Syed Umaid Ahmed
   DOI: https://ieeexplore.ieee.org/abstract/document/10273915

== Awards & Achievements ==
- Best FYP Award 2022, NED University of Engineering & Technology
- Funding from North Carolina–NED Forum for Soft Robotics for Healthcare project (Feb 2022)
- Thesis successfully defended Nov 2025

== Rules ==
- Only answer questions about Emmad or his work.
- If asked about unrelated topics (e.g., general coding help, current events, other people),
  politely say you can only answer questions about Emmad.
- Never fabricate information not listed above. If uncertain, say so and suggest contacting
  Emmad directly at k238020@nu.edu.pk.
""".strip()

MAX_MESSAGE_LENGTH = 500


@app.route("/api/chat", methods=["POST", "OPTIONS"])
def chat():
    # CORS preflight
    if request.method == "OPTIONS":
        return "", 204

    # Parse request body
    try:
        body = request.get_json(force=True, silent=True) or {}
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    message = body.get("message", "")

    # Input validation
    if not isinstance(message, str) or not message.strip():
        return jsonify({"error": "Message is required"}), 400

    message = message.strip()
    if len(message) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": f"Message exceeds {MAX_MESSAGE_LENGTH} characters"}), 400

    # Configure Groq
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return jsonify({"error": "Server is not configured. Contact Emmad."}), 503

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": message},
            ],
            max_tokens=512,
            temperature=0.7,
        )
        reply = completion.choices[0].message.content
        return jsonify({"reply": reply})

    except Exception as e:
        # Log server-side but don't leak details to the client
        print(f"[chat] Groq error: {e}")
        return jsonify({"error": "Failed to generate a response. Please try again."}), 500
