// SpaCy backend integration for improved Named Entity Recognition
class SpacyNERProcessor {
    constructor(apiUrl = 'http://localhost:5000/api') {
        this.apiUrl = apiUrl;
        this.isAvailable = false;

        // Check if the backend is available
        this.checkAvailability();
    }

    // Check if the SpaCy backend is available
    async checkAvailability() {
        try {
            const response = await fetch(`${this.apiUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('SpaCy backend is available:', data);
                this.isAvailable = true;
                this.model = data.model;
            } else {
                console.warn('SpaCy backend health check failed');
                this.isAvailable = false;
            }
        } catch (error) {
            console.warn('SpaCy backend is not available:', error);
            this.isAvailable = false;
        }

        return this.isAvailable;
    }

    // Process a single text with SpaCy NER
    async processText(text, entityTypes = null) {
        if (!this.isAvailable) {
            await this.checkAvailability();
            if (!this.isAvailable) {
                console.warn('SpaCy backend is not available, falling back to client-side NER');
                return null;
            }
        }

        try {
            const response = await fetch(`${this.apiUrl}/ner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Filter by entity type if specified
            let entities = data.entities;
            if (entityTypes && Array.isArray(entityTypes) && entityTypes.length > 0) {
                entities = entities.filter(entity => entityTypes.includes(entity.entityType));
            }

            return entities;

        } catch (error) {
            console.error('Error processing text with SpaCy:', error);
            return null;
        }
    }

    // Process multiple pages at once for better efficiency
    async processBulk(pages) {
        if (!this.isAvailable) {
            await this.checkAvailability();
            if (!this.isAvailable) {
                console.warn('SpaCy backend is not available, falling back to client-side NER');
                return null;
            }
        }

        try {
            const response = await fetch(`${this.apiUrl}/ner-bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pages })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.results;

        } catch (error) {
            console.error('Error processing bulk text with SpaCy:', error);
            return null;
        }
    }

    // Process all documents to find entities
    async processAllDocuments(loadedDocuments, enabledEntityTypes = null) {
        const allEntities = [];

        if (!this.isAvailable) {
            await this.checkAvailability();
            if (!this.isAvailable) {
                console.warn('SpaCy backend is not available');
                return [];
            }
        }

        // Prepare batch of pages to process
        const pages = [];

        // Process each loaded document
        for (let docIndex = 0; docIndex < loadedDocuments.length; docIndex++) {
            const docData = loadedDocuments[docIndex];
            if (!docData) continue;

            const docTitle = docData.name || `Document ${docIndex + 1}`;

            // Process each page in the document
            for (let pageNum = 1; pageNum <= docData.pageCount; pageNum++) {
                // Ensure we have text content for this page
                if (!docData.textContent[pageNum]) {
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

                // Add to pages batch
                pages.push({
                    docIndex,
                    pageNum,
                    text: pageText
                });
            }
        }

        // Process all pages at once for better performance
        if (pages.length > 0) {
            try {
                const results = await this.processBulk(pages);

                if (!results) return [];

                // Process results
                for (const pageResult of results) {
                    const { docIndex, pageNum, entities } = pageResult;
                    const docData = loadedDocuments[docIndex];
                    const docTitle = docData ? docData.name || `Document ${docIndex + 1}` : `Document ${docIndex + 1}`;

                    // Filter entities by type if needed
                    let pageEntities = entities;
                    if (enabledEntityTypes && enabledEntityTypes.length > 0) {
                        pageEntities = entities.filter(entity =>
                            enabledEntityTypes.includes(entity.entityType));
                    }

                    // Add processed entities to the result
                    for (const entity of pageEntities) {
                        allEntities.push({
                            ...entity,
                            docIndex,
                            docTitle,
                            pageNum
                        });
                    }
                }
            } catch (error) {
                console.error('Error processing documents with SpaCy:', error);
            }
        }

        return allEntities;
    }
}

// Export the processor
window.SpacyNERProcessor = SpacyNERProcessor;

// Initialize at script load time
let spacyNER;
document.addEventListener('DOMContentLoaded', function() {
    // Create the SpaCy NER processor
    spacyNER = new SpacyNERProcessor();

    // Add button to toggle NER backend
    addNERBackendToggle();
});

// Add toggle button to switch between NER backends
function addNERBackendToggle() {
    const controlsDiv = document.querySelector('.entity-controls');
    if (!controlsDiv) return;

    const divider = document.createElement('div');
    divider.className = 'section-divider';

    const nerToggle = document.createElement('div');
    nerToggle.className = 'ner-backend-toggle';
    nerToggle.innerHTML = `
        <label class="toggle-switch">
            <input type="checkbox" id="ner-backend-toggle">
            <span class="toggle-slider"></span>
        </label>
        <span class="toggle-label">Use SpaCy Backend</span>
    `;

    controlsDiv.appendChild(divider);
    controlsDiv.appendChild(nerToggle);

    // Add event listener
    const toggleCheckbox = nerToggle.querySelector('#ner-backend-toggle');
    toggleCheckbox.addEventListener('change', function() {
        if (this.checked) {
            // Check if backend is available
            spacyNER.checkAvailability().then(available => {
                if (available) {
                    showNotification('Using SpaCy backend for enhanced NER', 'success');
                    // Update global flag
                    window.useSpacyBackend = true;
                } else {
                    showNotification('SpaCy backend not available', 'error');
                    this.checked = false;
                    window.useSpacyBackend = false;
                }
            });
        } else {
            showNotification('Using client-side NER', 'info');
            window.useSpacyBackend = false;
        }
    });

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .ner-backend-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 10px;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        input:checked + .toggle-slider {
            background-color: #4285f4;
        }

        input:checked + .toggle-slider:before {
            transform: translateX(20px);
        }

        .toggle-label {
            font-size: 14px;
        }
    `;

    document.head.appendChild(style);
}

// Update startFullDocumentSearch to use SpaCy backend if enabled
async function startFullDocumentSearchWithSpaCy() {
    // Reset matches
    allMatches = [];
    currentMatchIndex = -1;

    // Check which entity types are enabled
    const enabledTypes = [];
    if (entityHighlights.people.enabled) enabledTypes.push('people');
    if (entityHighlights.places.enabled) enabledTypes.push('places');
    if (entityHighlights.organizations.enabled) enabledTypes.push('organizations');
    if (entityHighlights.dates.enabled) enabledTypes.push('dates');
    if (entityHighlights.custom.enabled) enabledTypes.push('custom');

    if (enabledTypes.length === 0) {
        showNotification('Please select at least one entity type to search for', 'warning');
        return;
    }

    // Show a searching notification
    showNotification('Searching for entities using SpaCy (high accuracy)...', 'info');

    // Find loaded documents
    const loadedIndices = loadedDocuments
        .map((doc, index) => doc ? index : null)
        .filter(index => index !== null);

    if (loadedIndices.length === 0) {
        showNotification('No documents loaded', 'warning');
        return;
    }

    // Add progress bar to UI
    const progressBar = document.createElement('div');
    progressBar.className = 'search-progress';
    document.querySelector('.multi-doc-toolbar').appendChild(progressBar);

    try {
        // Process all documents with SpaCy
        allMatches = await spacyNER.processAllDocuments(loadedDocuments, enabledTypes);

        // For custom entity, filter results further
        if (entityHighlights.custom.enabled && entityHighlights.custom.term) {
            const customTerm = entityHighlights.custom.term.toLowerCase();
            const customMatches = [];

            // For each document page, search for the custom term
            for (let docIndex = 0; docIndex < loadedDocuments.length; docIndex++) {
                const docData = loadedDocuments[docIndex];
                if (!docData) continue;

                const docTitle = docData.name || `Document ${docIndex + 1}`;

                for (let pageNum = 1; pageNum <= docData.pageCount; pageNum++) {
                    if (!docData.textContent[pageNum]) continue;

                    const pageText = docData.textContent[pageNum].items.map(item => item.str).join(' ');
                    const pageLower = pageText.toLowerCase();

                    // Find all occurrences of the custom term
                    let index = pageLower.indexOf(customTerm);
                    while (index !== -1) {
                        // Find the sentence containing this term
                        const sentenceStart = Math.max(0, pageText.lastIndexOf('.', index) + 1);
                        const sentenceEnd = pageText.indexOf('.', index + customTerm.length);
                        const sentence = pageText.substring(
                            sentenceStart,
                            sentenceEnd > -1 ? sentenceEnd + 1 : pageText.length
                        );

                        // Add to matches
                        customMatches.push({
                            text: pageText.substring(index, index + customTerm.length),
                            entityType: 'custom',
                            start: index,
                            end: index + customTerm.length,
                            sentence: sentence.trim(),
                            docIndex,
                            docTitle,
                            pageNum,
                            color: entityHighlights.custom.color
                        });

                        // Find next occurrence
                        index = pageLower.indexOf(customTerm, index + 1);
                    }
                }
            }

            // Add custom matches to all matches
            allMatches = allMatches.concat(customMatches);
        }

        // Animate through all entities to show them
        for (let i = 0; i < allMatches.length; i++) {
            const match = allMatches[i];

            // Add position data for highlighting
            match.position = findPositionInPageForEntity(match);

            // Render the page if it's not already being displayed
            const docData = loadedDocuments[match.docIndex];
            if (docData && docData.currentPage !== match.pageNum) {
                await renderPage(match.docIndex, match.pageNum);
            }

            // Show highlight animation
            if (match.position) {
                highlightMatchWithAnimation(match);
            }

            // Short delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Update match counter
        updateMatchCounter();

        // Return to the first page for each document
        loadedIndices.forEach(index => {
            if (loadedDocuments[index]) {
                renderPage(index, 1);
            }
        });

        // Show completion notification
        showNotification(`Found ${allMatches.length} entities across all documents`, 'success');

    } catch (error) {
        console.error('Error in SpaCy entity search:', error);
        showNotification('Error during entity search: ' + error.message, 'error');
    } finally {
        // Remove progress bar
        progressBar.remove();
    }
}

// Helper function to find position for an entity in the page
function findPositionInPageForEntity(entity) {
    const docData = loadedDocuments[entity.docIndex];
    if (!docData || !docData.textContent[entity.pageNum]) return null;

    const textContent = docData.textContent[entity.pageNum];
    return findPositionInTextContent(textContent, entity.start, entity.end - entity.start);
}

// Override the startFullDocumentSearch function to use SpaCy if enabled
const originalStartFullDocumentSearch = window.startFullDocumentSearch;
window.startFullDocumentSearch = async function() {
    if (window.useSpacyBackend && spacyNER && spacyNER.isAvailable) {
        await startFullDocumentSearchWithSpaCy();
    } else {
        await originalStartFullDocumentSearch();
    }
};