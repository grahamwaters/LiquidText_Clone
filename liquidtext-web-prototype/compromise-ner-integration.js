// Enhanced NER Component using Compromise.js
// This file integrates the Compromise NLP library for better entity recognition

// Load necessary libraries
// Note: Make sure to include these in your HTML file:
// <script src="https://unpkg.com/compromise@latest/builds/compromise.min.js"></script>
// <script src="https://unpkg.com/compromise-numbers@latest/builds/compromise-numbers.min.js"></script>
// <script src="https://unpkg.com/compromise-dates@latest/builds/compromise-dates.min.js"></script>
// <script src="https://unpkg.com/compromise-entities@latest/builds/compromise-entities.min.js"></script>

class EnhancedNERProcessor {
    constructor() {
        // Initialize entity maps
        this.entityTypes = {
            people: { tag: '#Person', color: '#ffcccc', enabled: true },
            places: { tag: '#Place', color: '#ccffcc', enabled: true },
            organizations: { tag: '#Organization', color: '#ff9999', enabled: true },
            dates: { tag: '#Date', color: '#ccccff', enabled: true },
            money: { tag: '#Money', color: '#ffd699', enabled: true },
            percentages: { tag: '#Percentage', color: '#e6ccff', enabled: true },
            values: { tag: '#Value', color: '#ffe6cc', enabled: true },
            custom: { tag: '', color: '#ffff99', enabled: false, term: '' }
        };

        // Initialize compromise plugins if available
        this.initializeCompromise();
    }

    // Initialize Compromise with plugins
    initializeCompromise() {
        if (typeof nlp === 'undefined') {
            console.error('Compromise.js not loaded! Make sure to include it in your HTML.');
            return false;
        }

        // Check and load plugins
        try {
            // Extend nlp with plugins if they exist
            if (window.compromiseNumbers) {
                nlp.extend(window.compromiseNumbers);
            }
            if (window.compromiseDates) {
                nlp.extend(window.compromiseDates);
            }
            if (window.compromiseEntities) {
                nlp.extend(window.compromiseEntities);
            }

            return true;
        } catch (error) {
            console.error('Error initializing Compromise plugins:', error);
            return false;
        }
    }

    // Process text to identify entities using Compromise
    processText(text, entityTypes = null) {
        if (typeof nlp === 'undefined') {
            console.error('Compromise.js not loaded!');
            return [];
        }

        // Initialize empty results array
        const results = [];

        try {
            // Create document
            const doc = nlp(text);

            // Process each enabled entity type
            Object.keys(this.entityTypes).forEach(type => {
                // Skip if this type is not enabled or not in the requested types
                if (!this.entityTypes[type].enabled ||
                    (entityTypes && !entityTypes.includes(type))) {
                    return;
                }

                // Handle custom entity search
                if (type === 'custom' && this.entityTypes.custom.term) {
                    // Search for custom term
                    const customMatches = this.findCustomEntity(text, this.entityTypes.custom.term);
                    customMatches.forEach(match => {
                        results.push({
                            text: match.text,
                            entityType: 'custom',
                            type: 'custom',
                            start: match.start,
                            end: match.end,
                            color: this.entityTypes.custom.color
                        });
                    });
                    return;
                }

                // Get tag for this entity type
                const tag = this.entityTypes[type].tag;
                if (!tag) return;

                // Find entities of this type
                const entities = doc.match(tag);

                // Extract and store each match
                entities.json().forEach(entity => {
                    const start = entity.offset.start;
                    const end = entity.offset.start + entity.offset.length;

                    results.push({
                        text: entity.text,
                        entityType: type,
                        type: type,
                        start: start,
                        end: end,
                        color: this.entityTypes[type].color
                    });
                });
            });

            return results;

        } catch (error) {
            console.error('Error processing text with Compromise:', error);
            return [];
        }
    }

    // Find custom entity in text
    findCustomEntity(text, term) {
        const results = [];
        const termLower = term.toLowerCase();

        // Simple implementation for custom term search
        let index = text.toLowerCase().indexOf(termLower);
        while (index !== -1) {
            results.push({
                text: text.substring(index, index + term.length),
                start: index,
                end: index + term.length
            });

            index = text.toLowerCase().indexOf(termLower, index + 1);
        }

        return results;
    }

    // Extract entities from PDF text content
    extractEntitiesFromPDFContent(textContent) {
        if (!textContent || !textContent.items) return [];

        // Join all text items
        const text = textContent.items.map(item => item.str).join(' ');

        // Process the combined text
        return this.processText(text);
    }

    // Get sentence containing an entity
    getSentenceForEntity(text, entityText, entityStart) {
        // Split text into sentences (simple implementation)
        const sentences = text.split(/(?<=[.!?])\s+/);

        let charCount = 0;
        // Find the sentence containing this entity
        for (const sentence of sentences) {
            const sentenceEnd = charCount + sentence.length + 1; // +1 for the space

            if (entityStart >= charCount && entityStart < sentenceEnd) {
                return sentence.trim();
            }

            charCount = sentenceEnd;
        }

        // Fallback if we can't find the sentence - extract surrounding text
        const contextStart = Math.max(0, entityStart - 50);
        const contextEnd = Math.min(text.length, entityStart + entityText.length + 50);
        return text.substring(contextStart, contextEnd).trim();
    }

    // Enable/disable entity type detection
    setEntityTypeEnabled(type, enabled) {
        if (this.entityTypes[type]) {
            this.entityTypes[type].enabled = enabled;
        }
    }

    // Set color for entity type
    setEntityTypeColor(type, color) {
        if (this.entityTypes[type]) {
            this.entityTypes[type].color = color;
        }
    }

    // Set custom entity search term
    setCustomEntityTerm(term) {
        this.entityTypes.custom.term = term;
        this.entityTypes.custom.enabled = !!term;
    }

    // Process all documents to find entities
    async processAllDocuments(loadedDocuments) {
        const allEntities = [];

        // Process each loaded document
        for (let docIndex = 0; docIndex < loadedDocuments.length; docIndex++) {
            const docData = loadedDocuments[docIndex];
            if (!docData) continue;

            const docTitle = docData.name || `Document ${docIndex + 1}`;

            // Process each page in the document
            for (let pageNum = 1; pageNum <= docData.pageCount; pageNum++) {
                // Ensure we have text content for this page
                if (!docData.textContent[pageNum]) {
                    // Get the page if needed
                    try {
                        const page = await docData.pdfDocument.getPage(pageNum);
                        docData.textContent[pageNum] = await page.getTextContent();
                    } catch (error) {
                        console.error(`Error getting page ${pageNum} for document ${docIndex}:`, error);
                        continue;
                    }
                }

                // Extract text from the text content
                const pageText = docData.textContent[pageNum].items.map(item => item.str).join(' ');

                // Find entities in this page
                const entities = this.processText(pageText);

                // Add document and page information to each entity
                entities.forEach(entity => {
                    // Get the sentence containing this entity
                    const sentence = this.getSentenceForEntity(pageText, entity.text, entity.start);

                    // Add to all entities list
                    allEntities.push({
                        ...entity,
                        docIndex,
                        docTitle,
                        pageNum,
                        sentence
                    });
                });
            }
        }

        return allEntities;
    }
}

// Helper function to create highlights from NER results
function createHighlightsFromNERResults(nerResults, docIndex, pageNum, textLayer, scale = 1.0) {
    if (!nerResults || !textLayer) return [];

    const highlights = [];
    const docData = window.loadedDocuments[docIndex];
    if (!docData || !docData.textContent[pageNum]) return [];

    const textContent = docData.textContent[pageNum];

    // Create a highlight for each entity
    nerResults.forEach(entity => {
        if (entity.docIndex !== docIndex || entity.pageNum !== pageNum) return;

        // Find position in the PDF
        const position = findPositionInTextContent(textContent, entity.start, entity.text.length, scale);
        if (!position) return;

        // Create highlight element
        const highlight = document.createElement('div');
        highlight.className = `highlight-animation entity-${entity.entityType}`;
        highlight.style.backgroundColor = entity.color;
        highlight.style.position = 'absolute';
        highlight.style.left = `${position.left}px`;
        highlight.style.top = `${position.top}px`;
        highlight.style.width = `${position.width}px`;
        highlight.style.height = `${position.height}px`;
        highlight.style.zIndex = '10';
        highlight.dataset.text = entity.text;
        highlight.dataset.entityType = entity.entityType;
        highlight.dataset.sentence = entity.sentence || '';

        // Add tooltip
        highlight.title = `${entity.text} (${entity.entityType})`;

        // Add to the document
        textLayer.appendChild(highlight);
        highlights.push(highlight);

        // Send to dossier if the global function exists
        if (typeof window.highlightEntityWithSentence === 'function' && entity.sentence) {
            window.highlightEntityWithSentence(
                entity.entityType,
                entity.text,
                entity.sentence,
                entity.docTitle
            );
        }
    });

    return highlights;
}

// Helper function to find position of text within PDF content
function findPositionInTextContent(textContent, textStart, textLength, scale = 1.0) {
    if (!textContent || !textContent.items || textContent.items.length === 0) return null;

    let currentPos = 0;
    let startFound = false;
    let startItem = null;
    let endItem = null;

    // Find the items containing our text
    for (let i = 0; i < textContent.items.length; i++) {
        const item = textContent.items[i];
        if (!item.str) continue;

        const itemStart = currentPos;
        const itemEnd = currentPos + item.str.length;

        // Check if this item contains our text start
        if (!startFound && textStart < itemEnd) {
            startItem = item;
            startFound = true;
        }

        // Check if this item contains our text end
        if (startFound && textStart + textLength <= itemEnd) {
            endItem = item;
            break;
        }

        currentPos += item.str.length + 1; // +1 for the space
    }

    if (!startItem) return null;

    // If we didn't find an end item, use the start item
    if (!endItem) endItem = startItem;

    // Get position from transform
    const transform = startItem.transform;
    const width = endItem ?
        (endItem.transform[4] + endItem.width - transform[4]) * scale :
        startItem.width * scale;

    return {
        left: transform[4] * scale,
        top: (transform[5] - startItem.height) * scale,
        width: width,
        height: startItem.height * scale
    };
}

// Export the processor
window.EnhancedNERProcessor = EnhancedNERProcessor;