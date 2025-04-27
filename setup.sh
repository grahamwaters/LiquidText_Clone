#!/bin/bash

# Create project directory
mkdir -p liquidtext-web-prototype
cd liquidtext-web-prototype

# Create index.html
cat > index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LiquidText Web Clone</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="app-container">
        <header class="toolbar">
            <div class="logo">LiquidText Web Clone</div>
            <div class="tools">
                <button id="highlightTool" title="Highlight Text">🖌️</button>
                <button id="commentTool" title="Add Comment">💬</button>
                <button id="penTool" title="Pen Tool">✒️</button>
                <button id="eraserTool" title="Eraser Tool">🧹</button>
                <button id="searchTool" title="Search">🔍</button>
            </div>
            <div class="project-controls">
                <button id="newProject" title="New Project">New</button>
                <button id="openProject" title="Open Project">Open</button>
                <button id="saveProject" title="Save Project">Save</button>
                <button id="exportProject" title="Export Project">Export</button>
            </div>
        </header>

        <main class="main-content">
            <aside class="document-sidebar">
                <div class="sidebar-header">Documents</div>
                <div class="document-list">
                    <!-- Document list items will be inserted here -->
                </div>
                <button class="add-document">Add Document</button>
            </aside>

            <section class="document-view">
                <div class="pdf-container">
                    <!-- PDF will be rendered here -->
                    <canvas id="pdf-canvas"></canvas>
                    <!-- Text layer will be added dynamically -->
                </div>
                <div class="document-controls">
                    <button id="prevPage" title="Previous Page">◀</button>
                    <span id="pageNum">1</span> / <span id="pageCount">1</span>
                    <button id="nextPage" title="Next Page">▶</button>
                    <input type="number" id="goToPage" min="1" value="1" title="Go to Page">
                    <button id="zoomIn" title="Zoom In">+</button>
                    <button id="zoomOut" title="Zoom Out">-</button>
                </div>
            </section>

            <section class="workspace-view">
                <!-- Workspace selector will be added dynamically -->
                <!-- New workspace button will be added dynamically -->
                <div class="workspace-canvas">
                    <!-- Excerpts and notes will be placed here -->
                </div>
            </section>
        </main>
    </div>

    <!-- Load PDF.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js"></script>
    <!-- Load Fabric.js for canvas manipulation -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js"></script>
    <!-- Custom scripts -->
    <script src="app.js"></script>
</body>
</html>
EOL

# Create styles.css with the updated CSS
cat > styles.css << 'EOL'
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: Arial, sans-serif;
    overflow: hidden;
    height: 100vh;
}

.app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background-color: #f4f4f4;
    border-bottom: 1px solid #ddd;
    height: 50px;
}

.logo {
    font-weight: bold;
    font-size: 1.2em;
}

.tools, .project-controls {
    display: flex;
    gap: 8px;
}

button {
    padding: 6px 12px;
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
}

button:hover {
    background-color: #f0f0f0;
}

button.active {
    background-color: #e0e0e0;
    border-color: #aaa;
}

.main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.document-sidebar {
    width: 200px;
    background-color: #f7f7f7;
    border-right: 1px solid #ddd;
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    padding: 10px;
    font-weight: bold;
    border-bottom: 1px solid #ddd;
}

.document-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
}

.add-document {
    margin: 10px;
}

.document-view {
    flex: 2;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #ddd;
}

.pdf-container {
    flex: 1;
    overflow: auto;
    background-color: #e0e0e0;
    display: flex;
    justify-content: center;
    padding: 20px;
    position: relative;
}

#pdf-canvas {
    background-color: white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}

.document-controls {
    padding: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    background-color: #f4f4f4;
    border-top: 1px solid #ddd;
}

.workspace-view {
    flex: 2;
    background-color: #f0f0f0;
    overflow: auto;
    position: relative;
}

.workspace-canvas {
    width: 100%;
    height: 100%;
    position: relative;
}

/* For the canvas elements that will be created by Fabric.js */
canvas.workspace-fabric {
    width: 100%;
    height: 100%;
}

input[type="number"] {
    width: 50px;
    padding: 5px;
}

.document-item {
    padding: 8px;
    margin-bottom: 4px;
    background-color: #fff;
    border-radius: 4px;
    cursor: pointer;
}

.document-item:hover {
    background-color: #e9e9e9;
}

/* Text layer for PDF selection */
.text-layer {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    opacity: 0.2;
    line-height: 1.0;
    user-select: text;
    pointer-events: auto;
}

.text-layer > span {
    color: transparent;
    position: absolute;
    white-space: pre;
    cursor: text;
    transform-origin: 0% 0%;
}

/* Excerpt button that appears on text selection */
.excerpt-button {
    position: absolute;
    z-index: 1000;
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 3px;
    padding: 5px 10px;
    cursor: pointer;
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
    display: none;
}

.excerpt-button:hover {
    background-color: #2a75f3;
}

/* Loading indicator */
.loading-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 1000;
}

/* Search highlight */
.search-highlight {
    background-color: #ffff00 !important;
    color: black !important;
    border-radius: 2px;
    animation: pulse 1s infinite alternate;
}

@keyframes pulse {
    from {
        background-color: #ffff00;
    }
    to {
        background-color: #ffa500;
    }
}

/* Workspace selector */
.workspace-selector {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 100;
    padding: 5px;
    border-radius: 3px;
    border: 1px solid #ccc;
    background-color: white;
}

/* New workspace button */
.new-workspace-btn {
    position: absolute;
    top: 10px;
    left: 160px;
    z-index: 100;
    width: 28px;
    height: 28px;
    padding: 0;
    font-size: 18px;
    line-height: 1;
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 3px;
}

.new-workspace-btn:hover {
    background-color: #2a75f3;
}

/* Source highlight */
.source-highlight {
    position: absolute;
    background-color: rgba(255, 255, 0, 0.5);
    border: 2px solid rgba(255, 165, 0, 0.8);
    z-index: 100;
    pointer-events: none;
    animation: pulse 1s infinite alternate;
}

/* Notification */
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    border-radius: 4px;
    color: white;
    z-index: 2000;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    opacity: 1;
    transition: opacity 0.5s;
}

.notification.success {
    background-color: #4caf50;
}

.notification.error {
    background-color: #f44336;
}

.notification.warning {
    background-color: #ff9800;
}

.notification.info {
    background-color: #2196f3;
}

.notification.fade-out {
    opacity: 0;
}

/* For pinch gesture (simulated in this prototype) */
.pinch-view {
    position: absolute;
    background-color: rgba(0, 0, 0, 0.1);
    border: 1px dashed #777;
    z-index: 150;
    pointer-events: none;
}
EOL

# Create app.js with the enhanced JavaScript
cat > app.js << 'EOL'
// Define global variables
let currentPDF = null;
let currentPage = 1;
let pdfDoc = null;
let pageCount = 0;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;
let currentTool = null; // Track the currently selected tool
let selectedText = ""; // Store selected text
let workspaceCanvas;
let pdfTextContent = {}; // Store text content of each page
let projectData = {
    name: "Untitled Project",
    documents: [],
    workspaces: [{
        id: "main-workspace",
        name: "Main Workspace",
        items: []
    }],
    currentWorkspace: "main-workspace"
};

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

// Function to render a specific page of the PDF
function renderPage(num) {
    pageRendering = true;

    // Using promise to fetch the page
    pdfDoc.getPage(num).then(function(page) {
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.getElementById('pdf-canvas');
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        const renderTask = page.render(renderContext);

        // Wait for rendering to finish
        renderTask.promise.then(function() {
            pageRendering = false;
            if (pageNumPending !== null) {
                // New page rendering is pending
                renderPage(pageNumPending);
                pageNumPending = null;
            }

            // Extract text content for selection and search
            return page.getTextContent();
        }).then(function(textContent) {
            pdfTextContent[num] = textContent;

            // Add text layer for selection
            const textLayerDiv = document.getElementById('text-layer');
            textLayerDiv.style.left = canvas.offsetLeft + 'px';
            textLayerDiv.style.top = canvas.offsetTop + 'px';
            textLayerDiv.style.height = canvas.height + 'px';
            textLayerDiv.style.width = canvas.width + 'px';

            // Clear previous text layer
            textLayerDiv.innerHTML = '';

            const textLayer = new pdfjsLib.TextLayerBuilder({
                textLayerDiv: textLayerDiv,
                pageIndex: page.pageNumber - 1,
                viewport: viewport
            });

            textLayer.setTextContent(textContent);
            textLayer.render();
        });
    });

    // Update page counters
    document.getElementById('pageNum').textContent = num;
    currentPage = num;
}

// Function to load a PDF file
function loadPDF(url) {
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Loading PDF...';
    document.querySelector('.pdf-container').appendChild(loadingIndicator);

    pdfjsLib.getDocument(url).promise.then(function(pdf) {
        pdfDoc = pdf;
        pageCount = pdf.numPages;
        document.getElementById('pageCount').textContent = pageCount;
        document.getElementById('goToPage').max = pageCount;

        // Remove loading indicator
        document.querySelector('.loading-indicator').remove();

        // Initial/first page rendering
        renderPage(1);

        // Add the PDF to the document list and project data
        const docList = document.querySelector('.document-list');
        const filename = url.split('/').pop();
        const docId = 'doc-' + Date.now();
        const docItem = document.createElement('div');
        docItem.className = 'document-item';
        docItem.dataset.docId = docId;
        docItem.textContent = filename;
        docList.appendChild(docItem);

        // Add to project data
        projectData.documents.push({
            id: docId,
            name: filename,
            url: url,
            currentPage: 1
        });

        // Set as current document
        currentPDF = docId;

        // Make document item clickable
        docItem.addEventListener('click', function() {
            currentPDF = this.dataset.docId;
            const doc = projectData.documents.find(d => d.id === currentPDF);
            loadPDF(doc.url);
        });
    }).catch(function(error) {
        console.error('Error loading PDF:', error);
        if (document.querySelector('.loading-indicator')) {
            document.querySelector('.loading-indicator').textContent = 'Error loading PDF: ' + error.message;
        }
    });
}

// Function to queueRenderPage if there's already a page being rendered
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

// Function to create an excerpt from selected text
function createExcerpt(text, sourceInfo) {
    if (!text || text.trim() === '') return;

    // Generate unique ID for the excerpt
    const excerptId = 'excerpt-' + Date.now();

    // Create a text object on the workspace canvas with a yellowish background
    const excerpt = new fabric.Textbox(text, {
        left: 50 + (Math.random() * 100), // Random position to avoid stacking
        top: 50 + (Math.random() * 100),
        width: 300,
        fill: '#000000',
        fontSize: 16,
        padding: 10,
        backgroundColor: '#ffffcc',
        borderColor: '#e6e6b3',
        cornerColor: '#e6e6b3',
        cornerSize: 10,
        transparentCorners: false,
        id: excerptId
    });

    // Store source information for bi-directional linking
    excerpt.sourceInfo = sourceInfo;

    // Add a small indicator for the source link
    const linkIcon = new fabric.Text('🔗', {
        fontSize: 16,
        left: 5,
        top: 5,
        selectable: false,
        evented: false
    });

    // Group the excerpt and link icon
    const group = new fabric.Group([excerpt, linkIcon], {
        left: excerpt.left,
        top: excerpt.top,
        id: excerptId,
        subTargetCheck: true
    });

    // Store for project data
    const excerptData = {
        id: excerptId,
        text: text,
        sourceInfo: sourceInfo,
        position: { x: group.left, y: group.top },
        workspaceId: projectData.currentWorkspace
    };

    // Add to current workspace's items
    const workspace = projectData.workspaces.find(w => w.id === projectData.currentWorkspace);
    if (workspace) {
        workspace.items.push(excerptData);
    }

    // Add the group to the canvas
    workspaceCanvas.add(group);
    workspaceCanvas.setActiveObject(group);
    workspaceCanvas.renderAll();

    // Clear selected text
    selectedText = "";

    return excerptId;
}

// Function to navigate to the source of an excerpt
function navigateToSource(sourceInfo) {
    if (!sourceInfo) return;

    // Navigate to the source document if needed
    if (sourceInfo.documentId !== currentPDF) {
        // Find document in project data
        const doc = projectData.documents.find(d => d.id === sourceInfo.documentId);
        if (doc) {
            currentPDF = doc.id;
            loadPDF(doc.url);
        }
    }

    // Go to the page
    if (sourceInfo.page && sourceInfo.page !== currentPage) {
        queueRenderPage(sourceInfo.page);
    }

    // Highlight the source area when we have coordinates
    if (sourceInfo.coordinates) {
        // Implement highlight effect here
        const highlight = document.createElement('div');
        highlight.className = 'source-highlight';
        highlight.style.left = sourceInfo.coordinates.x + 'px';
        highlight.style.top = sourceInfo.coordinates.y + 'px';
        highlight.style.width = sourceInfo.coordinates.width + 'px';
        highlight.style.height = sourceInfo.coordinates.height + 'px';

        const textLayer = document.getElementById('text-layer');
        textLayer.appendChild(highlight);

        // Remove highlight after a short time
        setTimeout(() => {
            highlight.remove();
        }, 3000);
    }
    // Handle text selection in the PDF
    function handleTextSelection() {
        const selection = window.getSelection();
        if (selection.toString().trim()) {
            selectedText = selection.toString();

            // Show an excerpt button near the selection
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Create or update excerpt button
            let excerptBtn = document.getElementById('excerpt-button');
            if (!excerptBtn) {
                excerptBtn = document.createElement('button');
                excerptBtn.id = 'excerpt-button';
                excerptBtn.textContent = 'Create Excerpt';
                excerptBtn.className = 'excerpt-button';
                document.body.appendChild(excerptBtn);
            }

            // Position the button
            excerptBtn.style.left = (rect.left + window.scrollX) + 'px';
            excerptBtn.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            excerptBtn.style.display = 'block';

            // Handle excerpt creation
            excerptBtn.onclick = function() {
                const sourceInfo = {
                    documentId: currentPDF,
                    page: currentPage,
                    text: selectedText,
                    coordinates: {
                        x: rect.left - document.getElementById('pdf-canvas').getBoundingClientRect().left,
                        y: rect.top - document.getElementById('pdf-canvas').getBoundingClientRect().top,
                        width: rect.width,
                        height: rect.height
                    }
                };

                createExcerpt(selectedText, sourceInfo);

                // Hide button after use
                excerptBtn.style.display = 'none';

                // Clear selection
                if (window.getSelection) {
                    if (window.getSelection().empty) {  // Chrome
                        window.getSelection().empty();
                    } else if (window.getSelection().removeAllRanges) {  // Firefox
                        window.getSelection().removeAllRanges();
                    }
                } else if (document.selection) {  // IE
                    document.selection.empty();
                }
            };
        } else {
            const excerptBtn = document.getElementById('excerpt-button');
            if (excerptBtn) {
                excerptBtn.style.display = 'none';
            }
        }
    }

    // Create a new workspace
    function createWorkspace(name) {
        const workspaceId = 'workspace-' + Date.now();
        const newWorkspace = {
            id: workspaceId,
            name: name || 'Workspace ' + (projectData.workspaces.length + 1),
            items: []
        };

        projectData.workspaces.push(newWorkspace);

        // Add to workspace selector
        const selector = document.getElementById('workspace-selector');
        const option = document.createElement('option');
        option.value = workspaceId;
        option.textContent = newWorkspace.name;
        selector.appendChild(option);

        return workspaceId;
    }

    // Switch to a different workspace
    function switchWorkspace(workspaceId) {
        if (!workspaceId || !projectData.workspaces.find(w => w.id === workspaceId)) return;

        // Save current workspace item positions
        saveWorkspaceState();

        // Update current workspace
        projectData.currentWorkspace = workspaceId;

        // Clear workspace canvas
        workspaceCanvas.clear();

        // Add background
        addWorkspaceBackground();

        // Load workspace items
        loadWorkspaceItems();
    }

    // Save the current state of the workspace
    function saveWorkspaceState() {
        const workspace = projectData.workspaces.find(w => w.id === projectData.currentWorkspace);
        if (!workspace) return;

        // For each item on the canvas, update its position
        workspaceCanvas.getObjects().forEach(obj => {
            if (obj.id && obj.id.startsWith('excerpt-')) {
                const item = workspace.items.find(i => i.id === obj.id);
                if (item) {
                    item.position = { x: obj.left, y: obj.top };
                }
            }
        });
    }

    // Load the items for the current workspace
    function loadWorkspaceItems() {
        const workspace = projectData.workspaces.find(w => w.id === projectData.currentWorkspace);
        if (!workspace) return;

        workspace.items.forEach(item => {
            // Recreate excerpts
            if (item.id.startsWith('excerpt-')) {
                const excerpt = new fabric.Textbox(item.text, {
                    left: item.position.x,
                    top: item.position.y,
                    width: 300,
                    fill: '#000000',
                    fontSize: 16,
                    padding: 10,
                    backgroundColor: '#ffffcc',
                    borderColor: '#e6e6b3',
                    cornerColor: '#e6e6b3',
                    cornerSize: 10,
                    transparentCorners: false,
                    id: item.id
                });

                // Store source information for bi-directional linking
                excerpt.sourceInfo = item.sourceInfo;

                // Add a small indicator for the source link
                const linkIcon = new fabric.Text('🔗', {
                    fontSize: 16,
                    left: 5,
                    top: 5,
                    selectable: false,
                    evented: false
                });

                // Group the excerpt and link icon
                const group = new fabric.Group([excerpt, linkIcon], {
                    left: excerpt.left,
                    top: excerpt.top,
                    id: item.id,
                    subTargetCheck: true
                });

                workspaceCanvas.add(group);
            }
        });

        workspaceCanvas.renderAll();
    }

    // Add a white background to the workspace
    function addWorkspaceBackground() {
        const backgroundRect = new fabric.Rect({
            left: 0,
            top: 0,
            fill: 'white',
            width: workspaceCanvas.width,
            height: workspaceCanvas.height,
            selectable: false,
            evented: false,
            id: 'workspace-background'
        });
        workspaceCanvas.add(backgroundRect);
        workspaceCanvas.sendToBack(backgroundRect);
    }

    // Save the project to local storage
    function saveProject() {
        // Save current workspace state first
        saveWorkspaceState();

        // Save to localStorage
        try {
            localStorage.setItem('liquidtext-project', JSON.stringify(projectData));
            showNotification('Project saved successfully');
        } catch (e) {
            console.error('Error saving project:', e);
            showNotification('Error saving project: ' + e.message, 'error');
        }
    }

    // Load a project from local storage
    function loadProject() {
        try {
            const savedProject = localStorage.getItem('liquidtext-project');
            if (savedProject) {
                projectData = JSON.parse(savedProject);

                // Update UI
                document.querySelector('.document-list').innerHTML = '';
                projectData.documents.forEach(doc => {
                    const docItem = document.createElement('div');
                    docItem.className = 'document-item';
                    docItem.dataset.docId = doc.id;
                    docItem.textContent = doc.name;
                    document.querySelector('.document-list').appendChild(docItem);

                    // Make document item clickable
                    docItem.addEventListener('click', function() {
                        currentPDF = this.dataset.docId;
                        const docToLoad = projectData.documents.find(d => d.id === currentPDF);
                        loadPDF(docToLoad.url);
                    });
                });

                // Update workspace selector
                const selector = document.getElementById('workspace-selector');
                selector.innerHTML = '';
                projectData.workspaces.forEach(workspace => {
                    const option = document.createElement('option');
                    option.value = workspace.id;
                    option.textContent = workspace.name;
                    selector.appendChild(option);
                });

                // Set current workspace
                selector.value = projectData.currentWorkspace;

                // Load current workspace
                switchWorkspace(projectData.currentWorkspace);

                showNotification('Project loaded successfully');

                // Load the first document if available
                if (projectData.documents.length > 0) {
                    currentPDF = projectData.documents[0].id;
                    loadPDF(projectData.documents[0].url);
                }
            } else {
                showNotification('No saved project found', 'warning');
            }
        } catch (e) {
            console.error('Error loading project:', e);
            showNotification('Error loading project: ' + e.message, 'error');
        }
    }

    // Create and show a notification
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'notification ' + type;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Automatically remove after a few seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    // Function to search in the current document
    function searchInDocument(term) {
        if (!term || !pdfDoc) return;

        const results = [];
        const termLower = term.toLowerCase();

        // Search in the current page first
        if (pdfTextContent[currentPage]) {
            const content = pdfTextContent[currentPage];
            content.items.forEach((item, index) => {
                if (item.str.toLowerCase().includes(termLower)) {
                    results.push({
                        page: currentPage,
                        text: item.str,
                        index: index
                    });
                }
            });
        }

        // If we have results, highlight the first one
        if (results.length > 0) {
            highlightSearchResult(results[0]);
            showNotification(`Found ${results.length} occurrences on page ${currentPage}`);
        } else {
            // No results on current page, search in other pages
            showNotification('Searching in other pages...', 'info');

            // For demo purposes, just say we don't have full text content for other pages
            setTimeout(() => {
                showNotification('Search in other pages not implemented in this prototype', 'warning');
            }, 1500);
        }
    }

    // Function to highlight a search result
    function highlightSearchResult(result) {
        if (!result) return;

        // Navigate to the page if needed
        if (result.page !== currentPage) {
            queueRenderPage(result.page);
        }

        // For a real implementation, we'd find the text element and highlight it
        // For the prototype, we'll just create a highlight effect
        const textLayerItems = document.querySelectorAll('#text-layer span');
        if (textLayerItems[result.index]) {
            const el = textLayerItems[result.index];

            // Scroll into view
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Highlight temporarily
            el.classList.add('search-highlight');
            setTimeout(() => {
                el.classList.remove('search-highlight');
            }, 3000);
        }
    }

    // Handle window resize
    function handleResize() {
        // Resize the workspace canvas
        if (workspaceCanvas) {
            workspaceCanvas.setWidth(document.querySelector('.workspace-view').offsetWidth);
            workspaceCanvas.setHeight(document.querySelector('.workspace-view').offsetHeight);

            // Resize the background
            const background = workspaceCanvas.getObjects().find(obj => obj.id === 'workspace-background');
            if (background) {
                background.set({
                    width: workspaceCanvas.width,
                    height: workspaceCanvas.height
                });
            }

            workspaceCanvas.renderAll();
        }

        // Update text layer position
        if (document.getElementById('text-layer')) {
            const canvas = document.getElementById('pdf-canvas');
            const textLayer = document.getElementById('text-layer');
            textLayer.style.left = canvas.offsetLeft + 'px';
            textLayer.style.top = canvas.offsetTop + 'px';
            textLayer.style.height = canvas.height + 'px';
            textLayer.style.width = canvas.width + 'px';
        }
    }

    // Set up event listeners
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize the Fabric.js canvas
        const canvasContainer = document.querySelector('.workspace-canvas');
        const canvasElement = document.createElement('canvas');
        canvasElement.id = 'workspace-fabric';
        canvasContainer.appendChild(canvasElement);

        workspaceCanvas = new fabric.Canvas('workspace-fabric', {
            isDrawingMode: false,
            selection: true,
            width: document.querySelector('.workspace-view').offsetWidth,
            height: document.querySelector('.workspace-view').offsetHeight,
        });

        // Add white background to workspace
        addWorkspaceBackground();

        // Add text layer to PDF container for text selection
        const textLayer = document.createElement('div');
        textLayer.id = 'text-layer';
        textLayer.className = 'text-layer';
        document.querySelector('.pdf-container').appendChild(textLayer);

        // Listen for text selection in the PDF
        document.getElementById('text-layer').addEventListener('mouseup', handleTextSelection);

        // Add workspace selector
        const workspaceSelector = document.createElement('select');
        workspaceSelector.id = 'workspace-selector';
        workspaceSelector.className = 'workspace-selector';
        document.querySelector('.workspace-view').insertBefore(workspaceSelector, document.querySelector('.workspace-canvas'));

        // Add first workspace option
        const defaultOption = document.createElement('option');
        defaultOption.value = projectData.workspaces[0].id;
        defaultOption.textContent = projectData.workspaces[0].name;
        workspaceSelector.appendChild(defaultOption);

        // Handle workspace selection change
        workspaceSelector.addEventListener('change', function() {
            switchWorkspace(this.value);
        });

        // Add a button to create new workspace
        const newWorkspaceBtn = document.createElement('button');
        newWorkspaceBtn.textContent = '+';
        newWorkspaceBtn.className = 'new-workspace-btn';
        newWorkspaceBtn.title = 'Create New Workspace';
        document.querySelector('.workspace-view').insertBefore(newWorkspaceBtn, document.querySelector('.workspace-canvas'));

        newWorkspaceBtn.addEventListener('click', function() {
            const name = prompt('Enter workspace name:');
            if (name) {
                const newId = createWorkspace(name);
                workspaceSelector.value = newId;
                switchWorkspace(newId);
            }
        });

        // Navigation controls
        document.getElementById('prevPage').addEventListener('click', function() {
            if (currentPage <= 1) return;
            queueRenderPage(currentPage - 1);
        });

        document.getElementById('nextPage').addEventListener('click', function() {
            if (currentPage >= pageCount) return;
            queueRenderPage(currentPage + 1);
        });

        document.getElementById('goToPage').addEventListener('change', function() {
            const num = parseInt(this.value);
            if (num > 0 && num <= pageCount) {
                queueRenderPage(num);
            }
        });

        document.getElementById('zoomIn').addEventListener('click', function() {
            scale *= 1.2;
            renderPage(currentPage);
        });

        document.getElementById('zoomOut').addEventListener('click', function() {
            scale /= 1.2;
            renderPage(currentPage);
        });

        // Add document button
        document.querySelector('.add-document').addEventListener('click', function() {
            // In a real app, we'd use File API to let users select a PDF
            // For demo, simulate a file dialog then load a sample PDF
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'application/pdf';

            fileInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    // In a real implementation, we'd handle the user's actual file
                    // For demo purposes, we'll still load the sample PDF
                    loadPDF('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');
                }
            });

            fileInput.click();
        });

        // Tool selection
        document.getElementById('highlightTool').addEventListener('click', function() {
            setActiveTool('highlight');
            document.getElementById('text-layer').style.cursor = 'url("highlight-cursor.png"), text';
        });

        document.getElementById('commentTool').addEventListener('click', function() {
            setActiveTool('comment');
            document.getElementById('text-layer').style.cursor = 'url("comment-cursor.png"), text';
        });

        document.getElementById('penTool').addEventListener('click', function() {
            setActiveTool('pen');
            workspaceCanvas.isDrawingMode = true;
            workspaceCanvas.freeDrawingBrush.color = '#000000';
            workspaceCanvas.freeDrawingBrush.width = 2;
        });

        document.getElementById('eraserTool').addEventListener('click', function() {
            setActiveTool('eraser');

            // In a real implementation, this would enable eraser mode
            // For now, let's just remove the selected object(s)
            const activeObjects = workspaceCanvas.getActiveObjects();
            if (activeObjects.length) {
                activeObjects.forEach(obj => {
                    workspaceCanvas.remove(obj);
                });
                workspaceCanvas.discardActiveObject();
                workspaceCanvas.renderAll();
            }
        });

        document.getElementById('searchTool').addEventListener('click', function() {
            const searchTerm = prompt('Enter search term:');
            if (searchTerm && searchTerm.trim()) {
                searchInDocument(searchTerm.trim());
            }
        });

        // Project controls
        document.getElementById('newProject').addEventListener('click', function() {
            if (confirm('Create a new project? Unsaved changes will be lost.')) {
                projectData = {
                    name: "Untitled Project",
                    documents: [],
                    workspaces: [{
                        id: "main-workspace",
                        name: "Main Workspace",
                        items: []
                    }],
                    currentWorkspace: "main-workspace"
                };

                // Clear UI
                document.querySelector('.document-list').innerHTML = '';
                document.getElementById('workspace-selector').innerHTML = '';

                // Reset workspace selector
                const option = document.createElement('option');
                option.value = 'main-workspace';
                option.textContent = 'Main Workspace';
                document.getElementById('workspace-selector').appendChild(option);

                // Clear workspace
                workspaceCanvas.clear();
                addWorkspaceBackground();

                showNotification('New project created');
            }
        });

        document.getElementById('openProject').addEventListener('click', function() {
            loadProject();
        });

        document.getElementById('saveProject').addEventListener('click', function() {
            saveProject();
        });

        document.getElementById('exportProject').addEventListener('click', function() {
            // Save current workspace state
            saveWorkspaceState();

            // Create a download link
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", projectData.name + ".json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });

        // Handle canvas object events
        workspaceCanvas.on('object:dblclick', function(e) {
            if (e.target && e.target.id && e.target.id.startsWith('excerpt-')) {
                // Navigate to source on double-click
                navigateToSource(e.target.sourceInfo);
            }
        });

        // Handle window resize
        window.addEventListener('resize', handleResize);

        // Initialize with a sample PDF
        loadPDF('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');

        // Try to load saved project
        loadProject();
    });

    // Helper function to set the active tool
    function setActiveTool(tool) {
        currentTool = tool;

        // Reset UI for all tools
        document.getElementById('highlightTool').classList.remove('active');
        document.getElementById('commentTool').classList.remove('active');
        document.getElementById('penTool').classList.remove('active');
        document.getElementById('eraserTool').classList.remove('active');
        document.getElementById('searchTool').classList.remove('active');

        document.getElementById('text-layer').style.cursor = 'auto';
        workspaceCanvas.isDrawingMode = false;

        // Set active UI
        document.getElementById(tool + 'Tool').classList.add('active');
    }

    // Add simulated "pinch to collapse" functionality (requires touch events in a real implementation)
    function simulatePinchCollapse() {
        // This is a simplified simulation
        const pinchView = document.createElement('div');
        pinchView.className = 'pinch-view';
        document.querySelector('.pdf-container').appendChild(pinchView);

        // Animate the pinch effect
        setTimeout(() => {
            pinchView.style.left = '20%';
            pinchView.style.top = '10%';
            pinchView.style.width = '60%';
            pinchView.style.height = '80%';

            setTimeout(() => {
                pinchView.style.height = '20%';

                setTimeout(() => {
                    // Show the "collapsed" view (in a real implementation, this would show only highlights)
                    pinchView.innerHTML = '<div style="padding: 20px; background: white;">Collapsed View: Only Highlights/Search Results would be shown here</div>';

                    // Remove after a few seconds
                    setTimeout(() => {
                        pinchView.remove();
                    }, 3000);
                }, 500);
            }, 500);
        }, 100);
    }

    // Add a method to create links between workspace items
    function createInkLink(fromObj, toObj) {
        if (!fromObj || !toObj) return;

        // Create a line connecting the two objects
        const line = new fabric.Line([
            fromObj.left + fromObj.width / 2,
            fromObj.top + fromObj.height / 2,
            toObj.left + toObj.width / 2,
            toObj.top + toObj.height / 2
        ], {
            stroke: '#4285f4',
            strokeWidth: 2,
            selectable: false,
            evented: true,
            id: `link-${Date.now()}`,
            fromId: fromObj.id,
            toId: toObj.id
        });

        // Add the link to the canvas
        workspaceCanvas.add(line);
        workspaceCanvas.sendToBack(line);

        // Make sure the background stays at the very back
        const background = workspaceCanvas.getObjects().find(obj => obj.id === 'workspace-background');
        if (background) {
            workspaceCanvas.sendToBack(background);
        }

        return line;
    }
EOL

# Create a README.md file
cat > README.md << 'EOL'
# LiquidText Web Prototype

This is a web-based prototype of a LiquidText-like application, built with HTML, CSS, and JavaScript.

## Features

- PDF document viewing and text selection
- Create excerpts from selected text with bi-directional linking
- Multiple workspaces for organizing content
- Workspace canvas for arranging excerpts
- Project management (save, load, export)
- Basic annotation tools (highlight, comment, pen, eraser)
- Search functionality

## How to Run

1. Clone or download this repository
2. Open index.html in a modern web browser
   - For local development, use a local server to avoid CORS issues with PDF loading
   - You can use Python's built-in server: `python -m http.server 8000`
   - Then access http://localhost:8000 in your browser

## Usage Instructions

1. **Document Management**:
   - Click "Add Document" to load a sample PDF
   - Navigate through pages using the controls at the bottom

2. **Creating Excerpts**:
   - Select text in the PDF
   - Click the "Create Excerpt" button that appears
   - The excerpt will be added to the workspace

3. **Workspace Management**:
   - Use the dropdown at the top of the workspace to switch between workspaces
   - Click the "+" button to create a new workspace
   - Drag excerpts to organize them
   - Double-click an excerpt to navigate to its source in the PDF

4. **Project Management**:
   - Click "Save" to save your project to local storage
   - Click "Open" to load a previously saved project
   - Click "Export" to download your project as a JSON file

## Libraries Used

- PDF.js for PDF rendering
- Fabric.js for the workspace canvas

## Limitations

This is a prototype with some simulated functionality:
- The "pinch to collapse" gesture is not fully implemented
- Some features like highlighting and commenting have minimal implementations
- Only loads sample PDFs (in a full implementation, you would be able to load your own files)

## License

This prototype is provided for educational purposes only.
EOL

# Create a simple server script to help with development (avoiding CORS issues)
cat > serve.py << 'EOL'
import http.server
import socketserver

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    '.js': 'application/javascript',
})

print(f"Starting server at http://localhost:{PORT}")
print("Use Ctrl+C to stop the server")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
EOL

echo "Setup complete! Project files created in: liquidtext-web-prototype"
echo "To run the project:"
echo "1. cd liquidtext-web-prototype"
echo "2. Start a local server: python serve.py"
echo "3. Open http://localhost:8000 in your browser"

# Make the script executable
chmod +x serve.py
EOL

echo "Setup script created successfully! Run it using: bash setup.sh"