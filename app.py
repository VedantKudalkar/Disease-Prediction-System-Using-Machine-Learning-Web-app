import json
from flask import Flask, render_template, request, jsonify
import numpy as np
import pickle
from urllib.parse import unquote

app = Flask(__name__)

# Load resources
with open("model.pkl", "rb") as f:
    model = pickle.load(f)

with open("label_encoder.pkl", "rb") as f:
    le = pickle.load(f)

with open("feature_names.pkl", "rb") as f:
    features = [x.strip().lower() for x in pickle.load(f)]

with open("disease_descriptions.pkl", "rb") as f:
    descriptions = pickle.load(f)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/suggest')
def suggest():
    try:
        query = unquote(request.args.get('q', '')).lower().strip()
        # Find matches using substring matching
        matches = [f for f in features if query in f]
        # Prioritize those starting with the query
        starts_with = [f for f in matches if f.startswith(query)]
        other_matches = [f for f in matches if f not in starts_with]
        combined = list(dict.fromkeys(starts_with + other_matches))
        return jsonify(combined[:10])
    except Exception as e:
        print(f"Suggestion error: {str(e)}")
        return jsonify([])

# Pandemic diseases for WHO updates
WHO_DISEASES = [
    {
        "name": "COVID-19 Pandemic",
        "image": "covid19.png",
        "description": "Global pandemic caused by the SARS-CoV-2 virus, affecting respiratory health.",
        "link": "https://www.who.int/health-topics/coronavirus"
    },
    {
        "name": "Spanish Flu (1918 Influenza Pandemic)",
        "image": "spanish_flu.png",
        "description": "Severe influenza pandemic of 1918 caused by the H1N1 influenza virus.",
        "link": "https://en.wikipedia.org/wiki/Spanish_flu"
    },
    {
        "name": "HIV/AIDS Pandemic",
        "image": "hiv_aids.png",
        "description": "Global pandemic caused by the Human Immunodeficiency Virus (HIV).",
        "link": "https://www.who.int/health-topics/hiv-aids"
    },
    {
        "name": "Swine Flu (H1N1 Pandemic 2009)",
        "image": "swine_flu.png",
        "description": "Pandemic caused by a novel strain of the H1N1 influenza virus.",
        "link": "https://en.wikipedia.org/wiki/2009_flu_pandemic"
    }
]

@app.route('/who-updates')
def who_updates():
    return jsonify(WHO_DISEASES)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        symptoms = [s.strip().lower() for s in request.json.get('symptoms', [])]
        # Create input vector based on the presence of each symptom
        input_vector = [1 if any(symptom in feature for symptom in symptoms) else 0 for feature in features]
        probas = model.predict_proba([input_vector])[0]
        max_idx = np.argmax(probas)
        disease = le.inverse_transform([max_idx])[0]
        return jsonify({
            'disease': disease,
            'probability': probas[max_idx] * 100,
            'description': descriptions.get(disease, "Description not available")
        })
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({'error': 'Could not process request. Please try again.'}), 500

if __name__ == '__main__':
    app.run(debug=True)
