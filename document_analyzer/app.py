from flask import Flask, request, jsonify
from pdfminer.high_level import extract_text
import spacy
from textblob import TextBlob
import datefinder
import re
from collections import defaultdict
from flask_cors import CORS
import io
import logging

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow CORS for all origins
logging.basicConfig(level=logging.DEBUG)  # Enable detailed logging
nlp = spacy.load("en_core_web_sm", disable=["parser"])  # Optimize spaCy
documents = {}  # Store document texts by ID

@app.route('/health', methods=['GET'])
def health_check():
    app.logger.debug("Health check requested")
    return jsonify({"status": "healthy", "documents": len(documents)}), 200

@app.route('/upload', methods=['POST'])
def upload_pdfs():
    try:
        app.logger.debug("Upload endpoint called")
        uploaded_files = request.files.getlist("files")
        if not uploaded_files:
            app.logger.warning("No files uploaded")
            return jsonify({"error": "No files uploaded"}), 400

        doc_ids = []
        for file in uploaded_files:
            if not file.filename.lower().endswith('.pdf'):
                app.logger.warning(f"Skipping non-PDF file: {file.filename}")
                continue
            app.logger.debug(f"Processing file: {file.filename}")
            file_stream = io.BytesIO(file.read())
            try:
                text = extract_text(file_stream)
                if not text.strip():
                    app.logger.warning(f"No text extracted from {file.filename}")
                    continue
                doc_id = len(documents)
                documents[doc_id] = {'name': file.filename, 'text': text}
                doc_ids.append({'id': doc_id, 'name': file.filename})
                app.logger.debug(f"Successfully processed {file.filename} as doc_id {doc_id}")
            except Exception as e:
                app.logger.error(f"Error processing {file.filename}: {str(e)}")
                continue
            finally:
                file_stream.close()

        if not doc_ids:
            app.logger.warning("No valid PDFs processed")
            return jsonify({"error": "No valid PDFs processed"}), 400

        app.logger.debug(f"Returning {len(doc_ids)} documents")
        return jsonify(doc_ids)
    except Exception as e:
        app.logger.error(f"Upload endpoint error: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/analyze/phrases', methods=['GET'])
def analyze_phrases():
    try:
        app.logger.debug("Phrases analysis requested")
        sentence_to_docs = defaultdict(list)
        for doc_id, doc in documents.items():
            sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s', doc['text'])
            for sentence in sentences:
                sentence = sentence.strip()
                if len(sentence) > 10:  # Filter short sentences
                    sentence_to_docs[sentence].append(doc_id)
        shared_sentences = {sentence: docs for sentence, docs in sentence_to_docs.items() if len(docs) > 1}
        connections = set()
        for docs in shared_sentences.values():
            for i in range(len(docs)):
                for j in range(i + 1, len(docs)):
                    connections.add((min(docs[i], docs[j]), max(docs[i], docs[j])))
        app.logger.debug(f"Found {len(shared_sentences)} shared sentences")
        return jsonify({'connections': list(connections), 'shared_sentences': shared_sentences})
    except Exception as e:
        app.logger.error(f"Phrases analysis error: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/analyze/people', methods=['GET'])
def analyze_people():
    try:
        app.logger.debug("People analysis requested")
        people_to_docs = defaultdict(list)
        for doc_id, doc in documents.items():
            doc_nlp = nlp(doc['text'])
            for ent in doc_nlp.ents:
                if ent.label_ == "PERSON" and len(ent.text) > 3:  # Filter short names
                    people_to_docs[ent.text].append(doc_id)
        shared_people = {person: docs for person, docs in people_to_docs.items() if len(docs) > 1}
        connections = set()
        for docs in shared_people.values():
            for i in range(len(docs)):
                for j in range(i + 1, len(docs)):
                    connections.add((min(docs[i], docs[j]), max(docs[i], docs[j])))
        app.logger.debug(f"Found {len(shared_people)} shared people")
        return jsonify({'connections': list(connections), 'shared_people': shared_people})
    except Exception as e:
        app.logger.error(f"People analysis error: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/analyze/sentiment', methods=['GET'])
def analyze_sentiment():
    try:
        app.logger.debug("Sentiment analysis requested")
        sentiments = {}
        for doc_id, doc in documents.items():
            blob = TextBlob(doc['text'])
            sentiments[doc_id] = blob.sentiment.polarity
        app.logger.debug(f"Computed sentiments for {len(sentiments)} documents")
        return jsonify(sentiments)
    except Exception as e:
        app.logger.error(f"Sentiment analysis error: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/analyze/chronology', methods=['GET'])
def analyze_chronology():
    try:
        app.logger.debug("Chronology analysis requested")
        events = []
        for doc_id, doc in documents.items():
            sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s', doc['text'])
            for sentence in sentences:
                sentence = sentence.strip()
                if sentence:
                    matches = list(datefinder.find_dates(sentence, strict=True))
                    if matches:
                        events.append({
                            'date': matches[0],
                            'text': sentence,
                            'doc': doc['name']
                        })
        events.sort(key=lambda x: x['date'])
        chronology = "\n".join(
            f"{event['date'].strftime('%Y-%m-%d')}: {event['text']} (Source: {event['doc']})"
            for event in events
        ) or "No dated events found."
        app.logger.debug(f"Found {len(events)} events in chronology")
        return jsonify({'chronology': chronology})
    except Exception as e:
        app.logger.error(f"Chronology analysis error: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == "__main__":
    app.logger.info("Starting Flask server on http://0.0.0.0:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)