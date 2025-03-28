import os
import json
import faiss
import numpy as np
import google.generativeai as genai
import hashlib
import webbrowser
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS


load_dotenv("key.env")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY is missing.")


genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash')


COOKING_KB = {
    "knife_skills": "Basic knife cuts include dice, chop, julienne, and mince.",
    "cooking_methods": "Common methods are sautéing, roasting, grilling, and braising.",
    "food_safety": "Always wash hands, use separate cutting boards, cook to safe temperatures.",
    "temperature_conversions": "Fahrenheit to Celsius: Subtract 32, multiply by 5/9.",
    "common_measurements": "1 cup = 240ml, 1 tbsp = 15ml, 1 tsp = 5ml.",
    "meal_prep": "Plan your meals in advance, store ingredients properly, and batch cook.",
    "herbs_spices": "Experiment with different herbs and spices (e.g., basil, thyme, rosemary) to enhance flavor.",
    "cooking_utensils": "Invest in quality knives, pots, pans, and measuring tools for consistent results.",
    "baking_tips": "Always preheat the oven, measure ingredients accurately, and avoid overmixing.",
    "food_storage": "Store leftovers in airtight containers and refrigerate promptly to maintain freshness.",
}

def get_embedding(text: str) -> np.array:
    # Generate a 16-dimensional embedding using MD5 hash
    hash_val = hashlib.md5(text.encode()).digest()
    vector = np.frombuffer(hash_val, dtype=np.uint8).astype(np.float32)
    norm = np.linalg.norm(vector)
    return vector / norm if norm != 0 else vector

# Build FAISS index for KB embeddings
embedding_dim = 16
kb_texts = list(COOKING_KB.values())
kb_embeddings = np.stack([get_embedding(text) for text in kb_texts])
kb_index = faiss.IndexFlatL2(embedding_dim)
kb_index.add(kb_embeddings)

# Modified retrieval function using FAISS (RAG)
def retrieve_relevant_context(query: str, top_k=2):
    query_embedding = get_embedding(query)
    query_embedding = np.expand_dims(query_embedding, axis=0)
    distances, indices = kb_index.search(query_embedding, top_k)
    matched_texts = [kb_texts[idx] for idx in indices[0]]
    return "\n".join(matched_texts)

def generate_response(query: str):
    context = retrieve_relevant_context(query)
    prompt = f"""As a cooking expert, use this knowledge to answer the question:

Context:
{context}

User question: {query}

Provide a clear and structured response:
- If it's a recipe request, list ingredients first.
- Include specific measurements and temperatures.
- Offer alternatives for allergies.
- Use numbered steps for instructions.
- Explain relevant cooking techniques."""
    response = model.generate_content(prompt)
    return response.text

app = Flask(__name__)
CORS(app)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message', '')
    if not user_input:
        return jsonify({'error': 'No message provided'}), 400
    response = generate_response(user_input)
    return jsonify({'response': response})

if __name__ == "__main__":
    webbrowser.open('file://' + os.path.abspath('index.html'))
    app.run(debug=False, port=5000)
