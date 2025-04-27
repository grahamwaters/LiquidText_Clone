// Dossier component for extracting and displaying entity information
class DossierBuilder {
    constructor() {
        this.entities = {
            people: [],
            places: [],
            organizations: [],
            dates: []
        };
        this.sentences = {};
        this.dossierElement = null;
        this.isVisible = false;
    }

    // Initialize the dossier component
    initialize() {
        // Create the dossier popup element
        this.createDossierElement();

        // Add button to toolbar
        this.addDossierButton();

        // Listen for entity highlighting events
        document.addEventListener('entityHighlighted', this.handleEntityHighlighted.bind(this));
    }

    // Create the dossier popup element
    createDossierElement() {
        const dossier = document.createElement('div');
        dossier.className = 'dossier-popup';
        dossier.innerHTML = `
            <div class="dossier-header">
                <h2>Document Analysis Dossier</h2>
                <div class="dossier-controls">
                    <button class="dossier-refresh">Refresh</button>
                    <button class="dossier-close">×</button>
                </div>
            </div>
            <div class="dossier-content">
                <div class="dossier-loading">
                    <div class="dossier-spinner"></div>
                    <p>Compiling information from documents...</p>
                </div>
                <div class="dossier-results" style="display: none;">
                    <div class="entity-section" id="people-section">
                        <h3>People</h3>
                        <div class="entity-list"></div>
                    </div>
                    <div class="entity-section" id="places-section">
                        <h3>Places</h3>
                        <div class="entity-list"></div>
                    </div>
                    <div class="entity-section" id="organizations-section">
                        <h3>Organizations</h3>
                        <div class="entity-list"></div>
                    </div>
                    <div class="entity-section" id="dates-section">
                        <h3>Dates</h3>
                        <div class="entity-list"></div>
                    </div>
                </div>
            </div>
        `;

        // Add styles for the dossier popup
        const style = document.createElement('style');
        style.textContent = `
            .dossier-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 700px;
                max-width: 90vw;
                max-height: 80vh;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 2000;
                display: flex;
                flex-direction: column;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
            }

            .dossier-popup.visible {
                opacity: 1;
                visibility: visible;
            }

            .dossier-header {
                padding: 15px 20px;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background-color: #f8f8f8;
                border-radius: 8px 8px 0 0;
            }

            .dossier-header h2 {
                margin: 0;
                font-size: 1.5rem;
                color: #333;
            }

            .dossier-controls {
                display: flex;
                gap: 10px;
            }

            .dossier-controls button {
                padding: 5px 10px;
                cursor: pointer;
                border-radius: 4px;
            }

            .dossier-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #666;
                cursor: pointer;
            }

            .dossier-refresh {
                background-color: #4285f4;
                color: white;
                border: none;
            }

            .dossier-content {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }

            .dossier-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 200px;
            }

            .dossier-spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .entity-section {
                margin-bottom: 25px;
            }

            .entity-section h3 {
                margin-top: 0;
                margin-bottom: 10px;
                padding-bottom: 5px;
                border-bottom: 1px solid #eee;
                color: #444;
            }

            .entity-item {
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px dashed #eee;
            }

            .entity-name {
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
                font-size: 1.1em;
            }

            .entity-mentions {
                list-style-type: none;
                padding-left: 0;
                margin-top: 5px;
            }

            .entity-mention {
                padding: 8px 12px;
                background-color: #f9f9f9;
                border-left: 3px solid #4285f4;
                margin-bottom: 8px;
                font-size: 0.95em;
                line-height: 1.4;
            }

            .mention-document {
                font-style: italic;
                font-size: 0.85em;
                color: #666;
                display: block;
                margin-top: 4px;
            }

            .compile-dossier-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 15px;
                background-color: #4285f4;
                color: white;
                border: none;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                cursor: pointer;
                z-index: 100;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s ease;
            }

            .compile-dossier-btn:hover {
                background-color: #2a75f3;
                transform: translateY(-2px);
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
            }

            .compile-dossier-btn i {
                font-size: 18px;
            }

            .compile-dossier-btn span {
                font-weight: 500;
            }

            /* Styling for entity labels */
            .entity-label {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 0.75em;
                font-weight: bold;
                margin-left: 5px;
                vertical-align: middle;
            }

            .entity-label.people {
                background-color: rgba(255, 200, 200, 0.5);
                color: #c62828;
            }

            .entity-label.places {
                background-color: rgba(200, 255, 200, 0.5);
                color: #2e7d32;
            }

            .entity-label.organizations {
                background-color: rgba(255, 150, 150, 0.5);
                color: #d84315;
            }

            .entity-label.dates {
                background-color: rgba(200, 200, 255, 0.5);
                color: #283593;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(dossier);
        this.dossierElement = dossier;

        // Add event listeners
        dossier.querySelector('.dossier-close').addEventListener('click', () => {
            this.hide();
        });

        dossier.querySelector('.dossier-refresh').addEventListener('click', () => {
            this.compileEntities();
        });
    }

    // Add the dossier button to the UI
    addDossierButton() {
        const button = document.createElement('button');
        button.className = 'compile-dossier-btn';
        button.innerHTML = '<i>📋</i><span>Compile Dossier</span>';
        button.addEventListener('click', () => {
            this.show();
            this.compileEntities();
        });

        document.body.appendChild(button);
    }

    // Show the dossier
    show() {
        if (!this.dossierElement) this.createDossierElement();
        this.dossierElement.classList.add('visible');
        this.isVisible = true;
    }

    // Hide the dossier
    hide() {
        if (this.dossierElement) {
            this.dossierElement.classList.remove('visible');
            this.isVisible = false;
        }
    }

    // Handle entity highlighted event
    handleEntityHighlighted(event) {
        const { entity, text, docTitle, sentence } = event.detail;

        if (!this.entities[entity]) return;

        // Add entity if it doesn't exist
        const existingEntity = this.entities[entity].find(e => e.text.toLowerCase() === text.toLowerCase());

        if (!existingEntity) {
            this.entities[entity].push({
                text: text,
                mentions: []
            });
        }

        // Get the entity (either existing or newly added)
        const entityObj = this.entities[entity].find(e => e.text.toLowerCase() === text.toLowerCase());

        // Add mention if it's not already there
        const mentionExists = entityObj.mentions.some(m =>
            m.sentence === sentence && m.docTitle === docTitle);

        if (!mentionExists) {
            entityObj.mentions.push({
                sentence: sentence,
                docTitle: docTitle
            });
        }
    }

    // Extract sentence containing an entity
    extractSentence(text, entityText, docTitle) {
        // Split text into sentences (simple implementation)
        const sentences = text.split(/(?<=[.!?])\s+/);

        // Find sentences containing the entity
        const relevantSentences = sentences.filter(sentence =>
            sentence.toLowerCase().includes(entityText.toLowerCase()));

        return relevantSentences.length > 0 ? relevantSentences[0] : null;
    }

    // Compile entities from all loaded documents
    async compileEntities() {
        if (!this.dossierElement) return;

        // Show loading state
        const loadingEl = this.dossierElement.querySelector('.dossier-loading');
        const resultsEl = this.dossierElement.querySelector('.dossier-results');
        loadingEl.style.display = 'flex';
        resultsEl.style.display = 'none';

        // Reset entities
        this.entities = {
            people: [],
            places: [],
            organizations: [],
            dates: []
        };

        // Wait for a moment to show loading spinner
        await new Promise(resolve => setTimeout(resolve, 800));

        // Process all documents
        this.processDocuments();

        // Update the UI with found entities
        this.updateDossierContent();

        // Hide loading, show results
        loadingEl.style.display = 'none';
        resultsEl.style.display = 'block';
    }

    // Process loaded documents to extract entities and sentences
    processDocuments() {
        // Check if we have the global loadedDocuments array
        if (typeof loadedDocuments === 'undefined' || !Array.isArray(loadedDocuments)) {
            console.error('No loaded documents found');
            return;
        }

        // Check if we have the global allMatches array
        if (typeof allMatches === 'undefined' || !Array.isArray(allMatches)) {
            console.error('No entity matches found');
            return;
        }

        // Group matches by entity and text
        const entityGroups = {};

        allMatches.forEach(match => {
            if (!match.entityType || !match.text) return;

            // Skip custom entity type
            if (match.entityType === 'custom') return;

            const entityType = match.entityType;
            const entityText = match.text;
            const docIndex = match.docIndex;

            // Skip if no valid document
            if (!loadedDocuments[docIndex]) return;

            const docTitle = loadedDocuments[docIndex].name || `Document ${docIndex + 1}`;
            const pageNum = match.pageNum;

            // Get document text content
            const textContent = loadedDocuments[docIndex].textContent;
            if (!textContent || !textContent[pageNum]) return;

            // Get text from the page
            const pageText = textContent[pageNum].items.map(item => item.str).join(' ');

            // Extract sentence containing the entity
            const sentence = this.extractSentence(pageText, entityText, docTitle);
            if (!sentence) return;

            // Initialize entity group if needed
            if (!entityGroups[entityType]) entityGroups[entityType] = {};
            if (!entityGroups[entityType][entityText]) {
                entityGroups[entityType][entityText] = [];
            }

            // Check if we already have this sentence for this document
            const existingMention = entityGroups[entityType][entityText].find(
                mention => mention.sentence === sentence && mention.docTitle === docTitle
            );

            if (!existingMention) {
                entityGroups[entityType][entityText].push({
                    sentence: sentence,
                    docTitle: docTitle
                });
            }
        });

        // Convert grouped data to our entity structure
        Object.keys(entityGroups).forEach(entityType => {
            if (!this.entities[entityType]) return;

            Object.keys(entityGroups[entityType]).forEach(entityText => {
                this.entities[entityType].push({
                    text: entityText,
                    mentions: entityGroups[entityType][entityText]
                });
            });
        });
    }

    // Update the dossier content with found entities
    updateDossierContent() {
        // Update each entity section
        Object.keys(this.entities).forEach(entityType => {
            const sectionEl = this.dossierElement.querySelector(`#${entityType}-section .entity-list`);
            if (!sectionEl) return;

            // Clear previous content
            sectionEl.innerHTML = '';

            // Check if we have entities of this type
            if (this.entities[entityType].length === 0) {
                sectionEl.innerHTML = '<p class="no-entities">No entities found</p>';
                return;
            }

            // Sort entities by number of mentions (most mentioned first)
            const sortedEntities = [...this.entities[entityType]].sort(
                (a, b) => b.mentions.length - a.mentions.length
            );

            // Create entity items
            sortedEntities.forEach(entity => {
                const entityEl = document.createElement('div');
                entityEl.className = 'entity-item';

                const nameEl = document.createElement('div');
                nameEl.className = 'entity-name';
                nameEl.textContent = entity.text;

                const labelEl = document.createElement('span');
                labelEl.className = `entity-label ${entityType}`;
                labelEl.textContent = entityType.replace(/s$/, ''); // Remove plural s
                nameEl.appendChild(labelEl);

                const mentionsEl = document.createElement('ul');
                mentionsEl.className = 'entity-mentions';

                // Add mentions
                entity.mentions.forEach(mention => {
                    const mentionEl = document.createElement('li');
                    mentionEl.className = 'entity-mention';

                    // Create highlighted sentence with entity highlighted
                    const highlightedSentence = this.highlightEntityInText(
                        mention.sentence, entity.text
                    );

                    mentionEl.innerHTML = highlightedSentence;

                    const docEl = document.createElement('span');
                    docEl.className = 'mention-document';
                    docEl.textContent = `Source: ${mention.docTitle}`;

                    mentionEl.appendChild(docEl);
                    mentionsEl.appendChild(mentionEl);
                });

                entityEl.appendChild(nameEl);
                entityEl.appendChild(mentionsEl);
                sectionEl.appendChild(entityEl);
            });
        });
    }

    // Highlight entity text within a sentence
    highlightEntityInText(text, entityText) {
        // Escape special regex characters
        const escapedEntity = entityText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Create regex that matches whole word and is case insensitive
        const regex = new RegExp(`(\\b${escapedEntity}\\b)`, 'gi');

        // Replace matches with highlighted version
        return text.replace(regex, '<span style="background-color: #ffff0080; font-weight: bold;">$1</span>');
    }
}

// Initialize the dossier builder when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    const dossier = new DossierBuilder();
    dossier.initialize();

    // Create a custom event for entity highlighting
    window.highlightEntityWithSentence = function(entityType, text, sentence, docTitle) {
        const event = new CustomEvent('entityHighlighted', {
            detail: {
                entity: entityType,
                text: text,
                sentence: sentence,
                docTitle: docTitle
            }
        });
        document.dispatchEvent(event);
    };
});

// Function to trigger dossier compilation
window.compileDossier = function() {
    const dossierBuilder = document.querySelector('.dossier-popup');
    if (dossierBuilder) {
        dossierBuilder.classList.add('visible');
        // Find and click the refresh button
        const refreshButton = dossierBuilder.querySelector('.dossier-refresh');
        if (refreshButton) refreshButton.click();
    }
};