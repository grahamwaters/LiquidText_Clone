"""
SpaCy Backend for Named Entity Recognition
This script creates a Flask API that uses SpaCy for accurate NER
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
import json
import re

# Load SpaCy model - you can use different models for different languages
# For English: en_core_web_sm (small), en_core_web_md (medium), or en_core_web_lg (large)
# The larger models are more accurate but require more resources
nlp = spacy.load("en_core_web_lg")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/ner', methods=['POST'])
def perform_ner():
    """API endpoint to perform NER on text using SpaCy"""
    data = request.json

    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400

    try:
        text = data['text']
        doc = nlp(text)

        # Extract entities with their sentences
        entities = []
        for ent in doc.ents:
            # Get the sentence containing this entity
            sentence = ent.sent.text

            # Map SpaCy entity types to our frontend categories
            entity_type = map_entity_type(ent.label_)

            # Calculate character offsets
            start = ent.start_char
            end = ent.end_char

            entities.append({
                'text': ent.text,
                'entityType': entity_type,
                'start': start,
                'end': end,
                'sentence': sentence,
                'label': ent.label_
            })

        return jsonify({
            'success': True,
            'entities': entities
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def map_entity_type(spacy_label):
    """Maps SpaCy entity types to our frontend categories"""
    mapping = {
        'PERSON': 'people',
        'NORP': 'people',  # Nationalities, religious or political groups
        'GPE': 'places',   # Countries, cities, states
        'LOC': 'places',   # Non-GPE locations, mountain ranges, bodies of water
        'FAC': 'places',   # Buildings, airports, highways, bridges, etc.
        'ORG': 'organizations',
        'DATE': 'dates',
        'TIME': 'dates',
        'MONEY': 'money',
        'PERCENT': 'percentages',
        'QUANTITY': 'values',
        'ORDINAL': 'values',
        'CARDINAL': 'values'
    }

    return mapping.get(spacy_label, 'custom')

@app.route('/api/ner-bulk', methods=['POST'])
def perform_ner_bulk():
    """Process multiple text entries at once (for handling PDF pages)"""
    data = request.json

    if not data or 'pages' not in data:
        return jsonify({'error': 'No pages provided'}), 400

    results = []

    try:
        for page in data['pages']:
            if 'text' not in page:
                continue

            doc = nlp(page['text'])

            page_entities = []
            for ent in doc.ents:
                # Get the sentence containing this entity
                sentence = ent.sent.text

                # Map SpaCy entity types to our frontend categories
                entity_type = map_entity_type(ent.label_)

                # Calculate character offsets
                start = ent.start_char
                end = ent.end_char

                page_entities.append({
                    'text': ent.text,
                    'entityType': entity_type,
                    'start': start,
                    'end': end,
                    'sentence': sentence,
                    'label': ent.label_,
                    'docIndex': page.get('docIndex', 0),
                    'pageNum': page.get('pageNum', 1)
                })

            results.append({
                'docIndex': page.get('docIndex', 0),
                'pageNum': page.get('pageNum', 1),
                'entities': page_entities
            })

        return jsonify({
            'success': True,
            'results': results
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model': nlp.meta['name']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)