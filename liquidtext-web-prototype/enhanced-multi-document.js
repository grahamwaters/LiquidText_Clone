// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

// Add these lines at the beginning of the enhanced-multi-document.js file, after the global variables declaration

// Initialize the Enhanced NER Processor
let enhancedNER;
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the NER processor once the document is loaded
    if (typeof EnhancedNERProcessor === 'function') {
        enhancedNER = new EnhancedNERProcessor();
        console.log('Enhanced NER processor initialized successfully');
    } else {
        console.error('EnhancedNERProcessor not found. Make sure compromise-ner-integration.js is loaded');
    }
});

// Then, replace the findEntitiesOnPage function with this improved version:

// Find entities on a specific page using the enhanced NER
async function findEntitiesOnPage(docIndex, pageNum, entityType) {
    const docData = loadedDocuments[docIndex];
    if (!docData || !docData.textContent[pageNum]) return [];

    // Check if we have the enhanced NER processor
    if (!enhancedNER) {
        console.warn('Enhanced NER processor not available, falling back to simple pattern matching');
        return findEntitiesWithPatterns(docIndex, pageNum, entityType, docData.textContent[pageNum]);
    }

    try {
        // Extract text from the textContent
        const textContent = docData.textContent[pageNum];
        const pageText = textContent.items.map(item => item.str).join(' ');

        // Use the enhanced NER to find entities
        let entities;

        if (entityType === 'custom') {
            // For custom entity search, set the custom term first
            enhancedNER.setCustomEntityTerm(entityHighlights.custom.term);
            entities = enhancedNER.processText(pageText, ['custom']);
        } else {
            // For regular entity types
            enhancedNER.setEntityTypeEnabled(entityType, true);
            entities = enhancedNER.processText(pageText, [entityType]);
        }

        const docTitle = docData.name || `Document ${docIndex + 1}`;

        // Process the results
        const matches = [];

        for (const entity of entities) {
            // Find position of this entity in the PDF
            const position = findPositionInTextContent(textContent, entity.start, entity.text.length);

            if (position) {
                // Get the sentence containing this entity
                const sentence = enhancedNER.getSentenceForEntity(pageText, entity.text, entity.start);

                matches.push({
                    docIndex: docIndex,
                    pageNum: pageNum,
                    text: entity.text,
                    entityType: entityType,
                    color: entityHighlights[entityType].color,
                    position: position,
                    sentence: sentence,
                    docTitle: docTitle
                });
            }
        }

        return matches;

    } catch (error) {
        console.error('Error in findEntitiesOnPage:', error);
        return [];
    }
}

// Also, replace the startFullDocumentSearch function with this enhanced version:

// Start searching for all checked entity types with enhanced NER
async function startFullDocumentSearch() {
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

    // Check if we have the enhanced NER processor
    if (!enhancedNER) {
        showNotification('Enhanced NER processor not available, using basic entity detection', 'warning');
        searchAllDocumentsForEntities(enabledTypes);
        return;
    }

    // Show a searching notification
    showNotification('Searching for entities using enhanced NLP model...', 'info');

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
        // Set up entity types in the enhanced NER
        enabledTypes.forEach(type => {
            if (type === 'custom' && entityHighlights.custom.term) {
                enhancedNER.setCustomEntityTerm(entityHighlights.custom.term);
            } else {
                enhancedNER.setEntityTypeEnabled(type, true);
                enhancedNER.setEntityTypeColor(type, entityHighlights[type].color);
            }
        });

        // Process all documents in bulk
        const entities = await enhancedNER.processAllDocuments(loadedDocuments);

        // Filter to only include enabled entity types
        const filteredEntities = entities.filter(entity =>
            enabledTypes.includes(entity.entityType));

        // Add to allMatches
        allMatches = filteredEntities;

        // Animate through all entities to show them
        for (let i = 0; i < allMatches.length; i++) {
            const match = allMatches[i];

            // Render the page if it's not already being displayed
            const docData = loadedDocuments[match.docIndex];
            if (docData.currentPage !== match.pageNum) {
                await renderPage(match.docIndex, match.pageNum);
            }

            // Show highlight animation
            highlightMatchWithAnimation(match);

            // Short delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Update match counter
        updateMatchCounter();

        // Return to the first page for each document
        loadedIndices.forEach(index => {
            renderPage(index, 1);
        });

        // Show completion notification
        showNotification(`Found ${allMatches.length} entities across all documents`, 'success');

    } catch (error) {
        console.error('Error in enhanced entity search:', error);
        showNotification('Error during entity search: ' + error.message, 'error');
    } finally {
        // Remove progress bar
        progressBar.remove();
    }
}

// Finally, update the applyActiveHighlightsToDocument function:

// Apply entity highlights to a document based on active filters
function applyActiveHighlightsToDocument(frameIndex) {
    // Remove all highlights first
    const frame = document.querySelector(`.document-frame[data-index="${frameIndex}"]`);
    const textLayer = frame.querySelector(`#text-layer-${frameIndex}`);
    const highlights = textLayer.querySelectorAll('.highlight-animation');
    highlights.forEach(el => el.remove());

    // Get current page
    const docData = loadedDocuments[frameIndex];
    if (!docData) return;
    const currentPage = docData.currentPage;

    // Apply all active highlights for this page
    const relevantMatches = allMatches.filter(match =>
        match.docIndex === frameIndex && match.pageNum === currentPage);

    relevantMatches.forEach(match => {
        // Only add if the entity type is enabled
        if (entityHighlights[match.entityType].enabled) {
            highlightMatchWithAnimation(match);
        }
    });
}

// Global variables
const MAX_DOCUMENTS = 4;
let loadedDocuments = [];
let currentLayout = '2x2'; // Default layout: 2x2 grid (4 documents)
let entityHighlights = {
    people: { enabled: false, color: '#ffff00' },
    places: { enabled: false, color: '#00ff00' },
    organizations: { enabled: false, color: '#ff0000' },
    dates: { enabled: false, color: '#0000ff' },
    custom: { enabled: false, color: '#ffff99', term: '' }
};

// For search and navigation
let allMatches = [];
let currentMatchIndex = -1;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    setupLayoutControls();
    setupEntityControls();
    initializeDocumentFrames();
    setupMatchNavigation();
});

// Set up layout control buttons
function setupLayoutControls() {
    const layoutOptions = document.querySelectorAll('.layout-option');

    layoutOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            layoutOptions.forEach(opt => opt.classList.remove('active'));

            // Add active class to clicked option
            this.classList.add('active');

            // Update the layout
            const layout = this.getAttribute('data-layout');
            changeLayout(layout);
        });
    });
}

// Change the document layout
function changeLayout(layout) {
    const contentContainer = document.querySelector('.multi-doc-content');

    // Remove all layout classes
    contentContainer.classList.remove('layout-2x1', 'layout-1x3', 'layout-2x2');

    // Add the selected layout class
    contentContainer.classList.add(`layout-${layout}`);
    currentLayout = layout;

    // Adjust the number of document frames
    updateDocumentFrames();

    // Re-render the PDFs to fit the new layout
    loadedDocuments.forEach((doc, index) => {
        if (doc && doc.pdfDocument) {
            renderPage(index, doc.currentPage);
        }
    });
}

// Set up entity highlighting controls
function setupEntityControls() {
    // People highlighting
    document.getElementById('highlight-people').addEventListener('change', function() {
        entityHighlights.people.enabled = this.checked;
        if (this.checked) {
            this.parentElement.classList.add('active');
            startEntitySearch('people');
        } else {
            this.parentElement.classList.remove('active');
            removeEntityHighlights('people');
        }
    });

    document.getElementById('people-color').addEventListener('input', function() {
        entityHighlights.people.color = this.value;
        if (entityHighlights.people.enabled) {
            updateEntityHighlightColors('people');
        }
    });

    // Places highlighting
    document.getElementById('highlight-places').addEventListener('change', function() {
        entityHighlights.places.enabled = this.checked;
        if (this.checked) {
            this.parentElement.classList.add('active');
            startEntitySearch('places');
        } else {
            this.parentElement.classList.remove('active');
            removeEntityHighlights('places');
        }
    });

    document.getElementById('places-color').addEventListener('input', function() {
        entityHighlights.places.color = this.value;
        if (entityHighlights.places.enabled) {
            updateEntityHighlightColors('places');
        }
    });

    // Organizations highlighting
    document.getElementById('highlight-organizations').addEventListener('change', function() {
        entityHighlights.organizations.enabled = this.checked;
        if (this.checked) {
            this.parentElement.classList.add('active');
            startEntitySearch('organizations');
        } else {
            this.parentElement.classList.remove('active');
            removeEntityHighlights('organizations');
        }
    });

    document.getElementById('organizations-color').addEventListener('input', function() {
        entityHighlights.organizations.color = this.value;
        if (entityHighlights.organizations.enabled) {
            updateEntityHighlightColors('organizations');
        }
    });

    // Dates highlighting
    document.getElementById('highlight-dates').addEventListener('change', function() {
        entityHighlights.dates.enabled = this.checked;
        if (this.checked) {
            this.parentElement.classList.add('active');
            startEntitySearch('dates');
        } else {
            this.parentElement.classList.remove('active');
            removeEntityHighlights('dates');
        }
    });

    document.getElementById('dates-color').addEventListener('input', function() {
        entityHighlights.dates.color = this.value;
        if (entityHighlights.dates.enabled) {
            updateEntityHighlightColors('dates');
        }
    });

    // Custom entity search
    document.getElementById('search-entity').addEventListener('click', function() {
        const customTerm = document.getElementById('custom-entity').value.trim();
        if (customTerm) {
            entityHighlights.custom.term = customTerm;
            entityHighlights.custom.enabled = true;
            startCustomEntitySearch(customTerm);
        }
    });

    document.getElementById('custom-color').addEventListener('input', function() {
        entityHighlights.custom.color = this.value;
        if (entityHighlights.custom.enabled) {
            updateEntityHighlightColors('custom');
        }
    });

    // Start search all button
    document.getElementById('start-all-search').addEventListener('click', function() {
        startFullDocumentSearch();
    });
}

// Set up match navigation
function setupMatchNavigation() {
    document.getElementById('prev-match').addEventListener('click', function() {
        navigateMatches(-1);
    });

    document.getElementById('next-match').addEventListener('click', function() {
        navigateMatches(1);
    });
}

// Initialize document frames based on the current layout
function initializeDocumentFrames() {
    const contentContainer = document.querySelector('.multi-doc-content');
    contentContainer.innerHTML = ''; // Clear existing frames

    let numFrames;
    switch (currentLayout) {
        case '2x1': numFrames = 2; break;
        case '1x3': numFrames = 3; break;
        case '2x2': numFrames = 4; break;
        default: numFrames = 4;
    }

    // Initialize the loadedDocuments array
    loadedDocuments = new Array(MAX_DOCUMENTS).fill(null);

    // Create document frames
    for (let i = 0; i < numFrames; i++) {
        const frame = createDocumentFrame(i);
        contentContainer.appendChild(frame);
    }
}

// Update document frames when layout changes
function updateDocumentFrames() {
    const contentContainer = document.querySelector('.multi-doc-content');
    const currentFrames = contentContainer.querySelectorAll('.document-frame');

    let numFrames;
    switch (currentLayout) {
        case '2x1': numFrames = 2; break;
        case '1x3': numFrames = 3; break;
        case '2x2': numFrames = 4; break;
        default: numFrames = 4;
    }

    // Add frames if needed
    if (currentFrames.length < numFrames) {
        for (let i = currentFrames.length; i < numFrames; i++) {
            const frame = createDocumentFrame(i);
            contentContainer.appendChild(frame);
        }
    }
    // Remove frames if needed
    else if (currentFrames.length > numFrames) {
        for (let i = numFrames; i < currentFrames.length; i++) {
            contentContainer.removeChild(currentFrames[i]);
        }
    }
}

// Create a document frame with PDF viewer
function createDocumentFrame(index) {
    const frame = document.createElement('div');
    frame.className = 'document-frame';
    frame.dataset.index = index;

    // Create the title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'pdf-title-bar';
    titleBar.innerHTML = `<span>Document ${index + 1}</span>`;

    // Create remove document button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-document-btn';
    removeBtn.innerHTML = '✕';
    removeBtn.title = 'Remove document';
    removeBtn.style.background = 'none';
    removeBtn.style.border = 'none';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.fontSize = '16px';
    removeBtn.style.color = '#666';
    removeBtn.addEventListener('click', function() {
        removeDocument(index);
    });

    titleBar.appendChild(removeBtn);

    // Create PDF viewer area
    const pdfFrame = document.createElement('div');
    pdfFrame.className = 'pdf-frame';
    pdfFrame.innerHTML = `
        <canvas id="pdf-canvas-${index}"></canvas>
        <div id="text-layer-${index}" class="text-layer"></div>
    `;

    // Create page controls
    const controls = document.createElement('div');
    controls.className = 'pdf-controls';
    controls.innerHTML = `
        <button class="prev-page" data-index="${index}">◀</button>
        <span class="page-indicator"><span class="current-page">0</span>/<span class="total-pages">0</span></span>
        <button class="next-page" data-index="${index}">▶</button>
    `;

    // Add "Add Document" panel if no document is loaded
    const addDocPanel = document.createElement('div');
    addDocPanel.className = 'add-document-panel';
    addDocPanel.innerHTML = `
        <p>No document loaded</p>
        <button class="load-document-btn" data-index="${index}">Add Document</button>
    `;

    // Assemble the frame
    frame.appendChild(titleBar);
    frame.appendChild(pdfFrame);
    frame.appendChild(controls);
    frame.appendChild(addDocPanel);

    // Add event listeners
    frame.querySelector('.load-document-btn').addEventListener('click', function() {
        openFileDialog(index);
    });

    frame.querySelector('.prev-page').addEventListener('click', function() {
        if (loadedDocuments[index] && loadedDocuments[index].currentPage > 1) {
            renderPage(index, loadedDocuments[index].currentPage - 1);
        }
    });

    frame.querySelector('.next-page').addEventListener('click', function() {
        if (loadedDocuments[index] &&
            loadedDocuments[index].currentPage < loadedDocuments[index].pageCount) {
            renderPage(index, loadedDocuments[index].currentPage + 1);
        }
    });

    return frame;
}

// Improved removeDocument function for multi-document view
function removeDocument(index) {
    if (!loadedDocuments[index]) return;

    // Clear document data
    loadedDocuments[index] = null;

    // Update allMatches array - remove all matches from this document
    allMatches = allMatches.filter(match => match.docIndex !== index);

    // Reset the document frame
    const frame = document.querySelector(`.document-frame[data-index="${index}"]`);
    if (!frame) return;

    frame.querySelector('.pdf-title-bar span').textContent = `Document ${index + 1}`;
    frame.querySelector('.current-page').textContent = '0';
    frame.querySelector('.total-pages').textContent = '0';

    const canvas = frame.querySelector('#pdf-canvas-' + index);
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const textLayer = frame.querySelector('#text-layer-' + index);
    if (textLayer) {
        textLayer.innerHTML = '';
    }

    // Show the add document panel
    const addDocPanel = frame.querySelector('.add-document-panel');
    if (addDocPanel) {
        addDocPanel.style.display = 'flex';
    }

    // Update match counter
    updateMatchCounter();

    // Update dossier if it exists
    if (typeof window.compileDossier === 'function') {
        window.compileDossier();
    }

    showNotification('Document removed', 'info');
}

// Open a file dialog to load a PDF
function openFileDialog(frameIndex) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf';

    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            loadPDF(frameIndex, this.files[0]);
        }
    });

    fileInput.click();
}

// Load a PDF file into a document frame
function loadPDF(frameIndex, file) {
    const frame = document.querySelector(`.document-frame[data-index="${frameIndex}"]`);
    const addDocPanel = frame.querySelector('.add-document-panel');

    // Create and show loading indicator
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner"></div>';
    frame.appendChild(loadingOverlay);

    // Hide the add document panel
    addDocPanel.style.display = 'none';

    // Update frame title
    frame.querySelector('.pdf-title-bar span').textContent = file.name;

    // Create a URL for the file
    const fileURL = URL.createObjectURL(file);

    // Load the PDF using PDF.js
    pdfjsLib.getDocument(fileURL).promise.then(function(pdfDoc) {
        // Store the loaded document
        loadedDocuments[frameIndex] = {
            name: file.name,
            pdfDocument: pdfDoc,
            pageCount: pdfDoc.numPages,
            currentPage: 1,
            scale: 1.0,
            textContent: {}  // Will store text content by page
        };

        // Update page count display
        frame.querySelector('.total-pages').textContent = pdfDoc.numPages;

        // Render the first page
        renderPage(frameIndex, 1);

        // Remove loading overlay
        loadingOverlay.remove();

        // Apply any active entity highlights
        applyActiveHighlightsToDocument(frameIndex);

    }).catch(function(error) {
        console.error('Error loading PDF:', error);

        // Show error message
        addDocPanel.style.display = 'flex';
        addDocPanel.querySelector('p').textContent = 'Error loading PDF: ' + error.message;

        // Remove loading overlay
        loadingOverlay.remove();
    });
}

// Render a specific page of a PDF
function renderPage(frameIndex, pageNum) {
    const docData = loadedDocuments[frameIndex];
    if (!docData || !docData.pdfDocument) return;

    const frame = document.querySelector(`.document-frame[data-index="${frameIndex}"]`);
    const canvas = frame.querySelector(`#pdf-canvas-${frameIndex}`);
    const textLayer = frame.querySelector(`#text-layer-${frameIndex}`);

    // Update page indicator
    frame.querySelector('.current-page').textContent = pageNum;

    // Update stored current page
    docData.currentPage = pageNum;

    // Get the PDF page
    docData.pdfDocument.getPage(pageNum).then(function(page) {
        // Calculate the scale to fit within the frame
        const viewport = page.getViewport({ scale: 1.0 });
        const pdfFrame = frame.querySelector('.pdf-frame');
        const containerWidth = pdfFrame.clientWidth - 20; // accounting for padding
        const containerHeight = pdfFrame.clientHeight - 20;

        // Determine scale to fit width and height
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const scale = Math.min(scaleX, scaleY, 1.5); // Limit max scale

        // Store the scale
        docData.scale = scale;

        // Apply the scale to the viewport
        const scaledViewport = page.getViewport({ scale: scale });

        // Set canvas dimensions
        const context = canvas.getContext('2d');
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        // Render the PDF page
        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };

        const renderTask = page.render(renderContext);

        // Get text content for selection and highlighting
        page.getTextContent().then(function(textContent) {
            // Store text content for later use
            docData.textContent[pageNum] = textContent;

            // Clear the text layer
            textLayer.innerHTML = '';

            // Set text layer position
            textLayer.style.left = canvas.offsetLeft + 'px';
            textLayer.style.top = canvas.offsetTop + 'px';
            textLayer.style.height = canvas.height + 'px';
            textLayer.style.width = canvas.width + 'px';

            // Render text layer
            renderTextLayer(textLayer, textContent, scaledViewport);

            // Apply any active highlights
            applyActiveHighlightsToDocument(frameIndex);
        });
    });
}

// Simplified text layer renderer
function renderTextLayer(textLayer, textContent, viewport) {
    textContent.items.forEach((item, index) => {
        const tx = pdfjsLib.Util.transform(
            viewport.transform,
            item.transform
        );

        // Create text spans for each text item
        const textSpan = document.createElement('span');
        textSpan.textContent = item.str;
        textSpan.style.left = Math.floor(tx[4]) + 'px';
        textSpan.style.top = Math.floor(tx[5] - item.height) + 'px';
        textSpan.style.fontSize = Math.floor(item.height) + 'px';
        textSpan.style.fontFamily = item.fontName;
        textSpan.dataset.index = index;

        // Set transform
        const angle = Math.atan2(tx[1], tx[0]);
        if (angle !== 0) {
            textSpan.style.transform = `rotate(${angle}rad)`;
            textSpan.style.transformOrigin = '0% 0%';
        }

        textLayer.appendChild(textSpan);
    });
}

// Start searching for all checked entity types
function startFullDocumentSearch() {
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

    // Start the search animation
    searchAllDocumentsForEntities(enabledTypes);
}

// Search all documents for a specific entity type
function startEntitySearch(entityType) {
    // Reset matches for this entity type
    allMatches = allMatches.filter(match => match.entityType !== entityType);

    // Start the search animation for just this entity type
    searchAllDocumentsForEntities([entityType]);
}

// Start a custom search
function startCustomEntitySearch(term) {
    // Reset custom matches
    allMatches = allMatches.filter(match => match.entityType !== 'custom');

    // Start the search animation
    searchAllDocumentsForEntities(['custom']);
}

// Search through all documents for the specified entity types
async function searchAllDocumentsForEntities(entityTypes) {
    // Show a searching notification
    showNotification('Searching for entities...', 'info');

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

    // Start the search process
    for (const docIndex of loadedIndices) {
        const docData = loadedDocuments[docIndex];

        for (let pageNum = 1; pageNum <= docData.pageCount; pageNum++) {
            // Render the page to show search progress
            await renderPage(docIndex, pageNum);

            // Extract text content
            if (!docData.textContent[pageNum]) {
                const page = await docData.pdfDocument.getPage(pageNum);
                docData.textContent[pageNum] = await page.getTextContent();
            }

            // Search for entities on this page
            for (const entityType of entityTypes) {
                const matches = await findEntitiesOnPage(docIndex, pageNum, entityType);
                allMatches.push(...matches);

                // Highlight the matches with animation
                for (const match of matches) {
                    highlightMatchWithAnimation(match);
                    // Short delay for visual effect
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }
    }

    // Remove progress bar
    progressBar.remove();

    // Update match counter
    updateMatchCounter();

    // Return to the first page for each document
    loadedIndices.forEach(index => {
        renderPage(index, 1);
    });

    // Show completion notification
    showNotification(`Found ${allMatches.length} entities across all documents`, 'success');
}

// Find entities on a specific page
async function findEntitiesOnPage(docIndex, pageNum, entityType) {
    const docData = loadedDocuments[docIndex];
    const textContent = docData.textContent[pageNum];
    const matches = [];

    if (!textContent || !textContent.items) return matches;

    // Combine all text items into a single string
    const fullText = textContent.items.map(item => item.str).join(' ');

    // Use Compromise.js for NLP entity recognition
    // First, make sure nlp (Compromise) is available
    if (typeof nlp === 'undefined') {
        console.warn('Compromise.js not loaded, using simple pattern matching instead');
        return findEntitiesWithPatterns(docIndex, pageNum, entityType, textContent);
    }

    const doc = nlp(fullText);
    let entities = [];

    if (entityType === 'custom') {
        // For custom search, use the custom term
        const term = entityHighlights.custom.term;
        const regex = new RegExp(term, 'gi');
        let match;

        while ((match = regex.exec(fullText)) !== null) {
            entities.push({
                text: match[0],
                offset: match.index,
                length: match[0].length
            });
        }
    } else {
        // Map our entity types to Compromise tags
        const tagMap = {
            'people': '#Person',
            'places': '#Place',
            'organizations': '#Organization',
            'dates': '#Date'
        };

        const tag = tagMap[entityType];
        if (!tag) return matches;

        entities = doc.match(tag).out('array').map(text => {
            const offset = fullText.indexOf(text);
            return {
                text: text,
                offset: offset,
                length: text.length
            };
        });
    }

    // Find positions of entities in the text content
    for (const entity of entities) {
        const position = findPositionInTextContent(textContent, entity.offset, entity.length);

        if (position) {
            matches.push({
                docIndex: docIndex,
                pageNum: pageNum,
                text: entity.text,
                entityType: entityType,
                color: entityHighlights[entityType].color,
                position: position
            });
        }
    }

    return matches;
}

// Fallback function to find entities with simple patterns
function findEntitiesWithPatterns(docIndex, pageNum, entityType, textContent) {
    const matches = [];
    const fullText = textContent.items.map(item => item.str).join(' ');

    // Simple patterns for entity types
    const patterns = {
        'people': /\b[A-Z][a-z]+ (?:[A-Z][a-z]+\b)?/g,
        'places': /\b(?:New York|London|Paris|Tokyo|Berlin|Rome|Beijing|Moscow|Los Angeles|Chicago|Sydney|Toronto|Madrid|Washington|Boston|San Francisco|Seattle|Atlanta)\b/g,
        'organizations': /\b(?:Inc|Corp|LLC|Ltd|Association|Company|Organization|University|School|College)\b/g,
        'dates': /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|[0-3]?[0-9](?:st|nd|rd|th)?|(?:19|20)[0-9]{2})\b/g,
        'custom': new RegExp(entityHighlights.custom.term, 'gi')
    };

    const pattern = patterns[entityType];
    if (!pattern) return matches;

    let match;
    while ((match = pattern.exec(fullText)) !== null) {
        const position = findPositionInTextContent(textContent, match.index, match[0].length);

        if (position) {
            matches.push({
                docIndex: docIndex,
                pageNum: pageNum,
                text: match[0],
                entityType: entityType,
                color: entityHighlights[entityType].color,
                position: position
            });
        }
    }

    return matches;
}

// Find the position of text within the PDF's text content
function findPositionInTextContent(textContent, offset, length) {
    let currentOffset = 0;
    let startFound = false;
    let startItem = null;
    let endItem = null;

    for (let i = 0; i < textContent.items.length; i++) {
        const item = textContent.items[i];
        const itemLength = item.str.length;

        // Check if this item contains the start of our text
        if (!startFound && currentOffset + itemLength > offset) {
            startItem = item;
            startFound = true;
        }

        // Check if this item contains the end of our text
        if (startFound && currentOffset + itemLength >= offset + length) {
            endItem = item;
            break;
        }

        currentOffset += itemLength + 1; // +1 for the space we added when joining
    }

    if (!startItem) return null;

    // Use the transform information to get position
    const transform = startItem.transform;

    return {
        left: transform[4],
        top: transform[5] - startItem.height,
        width: endItem ? endItem.transform[4] + endItem.width - transform[4] : startItem.width,
        height: startItem.height
    };
}

// Highlight a match with animation
function highlightMatchWithAnimation(match) {
    const frame = document.querySelector(`.document-frame[data-index="${match.docIndex}"]`);
    const textLayer = frame.querySelector(`#text-layer-${match.docIndex}`);

    // Create highlight element
    const highlight = document.createElement('div');
    highlight.className = `highlight-animation entity-${match.entityType}`;
    highlight.style.backgroundColor = match.color;
    highlight.style.position = 'absolute';
    highlight.style.left = `${match.position.left}px`;
    highlight.style.top = `${match.position.top}px`;
    highlight.style.width = `${match.position.width}px`;
    highlight.style.height = `${match.position.height}px`;
    highlight.style.zIndex = '10';
    highlight.dataset.text = match.text;
    highlight.dataset.entityType = match.entityType;

    // Add tooltip
    highlight.title = `${match.text} (${match.entityType})`;

    // Add to the document
    textLayer.appendChild(highlight);

    // Extract the sentence containing this entity (if possible)
    if (match.docIndex !== undefined && match.pageNum !== undefined) {
        const docData = loadedDocuments[match.docIndex];
        if (docData && docData.textContent && docData.textContent[match.pageNum]) {
            const textContent = docData.textContent[match.pageNum];
            const pageText = textContent.items.map(item => item.str).join(' ');
            const sentence = extractSentenceFromText(pageText, match.text);

            if (sentence) {
                const docTitle = docData.name || `Document ${match.docIndex + 1}`;

                // Send to dossier if the global function exists
                if (typeof window.highlightEntityWithSentence === 'function') {
                    window.highlightEntityWithSentence(
                        match.entityType,
                        match.text,
                        sentence,
                        docTitle
                    );
                }
            }
        }
    }
}

// Extract a sentence containing an entity
function extractSentenceFromText(text, entityText) {
    // Split text into sentences (simple implementation)
    const sentences = text.split(/(?<=[.!?])\s+/);

    // Find sentences containing the entity
    const relevantSentences = sentences.filter(sentence =>
        sentence.toLowerCase().includes(entityText.toLowerCase()));

    return relevantSentences.length > 0 ? relevantSentences[0] : null;
}

// Apply entity highlights to a document based on active filters
function applyActiveHighlightsToDocument(frameIndex) {
    // Remove all highlights first
    const frame = document.querySelector(`.document-frame[data-index="${frameIndex}"]`);
    const textLayer = frame.querySelector(`#text-layer-${frameIndex}`);
    const highlights = textLayer.querySelectorAll('.highlight-animation');
    highlights.forEach(el => el.remove());

    // Get current page
    const docData = loadedDocuments[frameIndex];
    if (!docData) return;
    const currentPage = docData.currentPage;

    // Apply all active highlights for this page
    const relevantMatches = allMatches.filter(match =>
        match.docIndex === frameIndex && match.pageNum === currentPage);

    relevantMatches.forEach(match => {
        // Only add if the entity type is enabled
        if (entityHighlights[match.entityType].enabled) {
            highlightMatchWithAnimation(match);
        }
    });
}

// Update entity highlight colors
function updateEntityHighlightColors(entityType) {
    const color = entityHighlights[entityType].color;

    // Update existing highlights
    document.querySelectorAll(`.entity-${entityType}`).forEach(element => {
        element.style.backgroundColor = color;
    });
}

// Remove entity highlights of a specific type
function removeEntityHighlights(entityType) {
    // Remove the highlights
    document.querySelectorAll(`.entity-${entityType}`).forEach(element => {
        element.remove();
    });
}

// Navigate through matches
function navigateMatches(direction) {
    if (allMatches.length === 0) {
        showNotification('No matches found', 'info');
        return;
    }

    // Update the current match index
    currentMatchIndex = (currentMatchIndex + direction + allMatches.length) % allMatches.length;
    const match = allMatches[currentMatchIndex];

    // Navigate to the document and page
    const docData = loadedDocuments[match.docIndex];
    if (docData && docData.currentPage !== match.pageNum) {
        renderPage(match.docIndex, match.pageNum);
    }

    // Highlight the match and scroll it into view
    const frame = document.querySelector(`.document-frame[data-index="${match.docIndex}"]`);
    const highlights = frame.querySelectorAll('.highlight-animation');

    // Remove active class from all highlights
    highlights.forEach(h => h.classList.remove('active-match'));

    // Find the highlight for this match
    setTimeout(() => {
        const matchHighlight = Array.from(highlights).find(h =>
            h.dataset.text === match.text &&
            h.dataset.entityType === match.entityType);

        if (matchHighlight) {
            matchHighlight.classList.add('active-match');
            matchHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Update the match counter
        updateMatchCounter();
    }, 100);
}

// Update the match counter
function updateMatchCounter() {
    const counter = document.getElementById('match-counter');
    if (counter) {
        counter.textContent = allMatches.length > 0 ?
            `${currentMatchIndex + 1} of ${allMatches.length}` :
            '0 of 0';
    }
}