// Main page enhancements: dark theme, bulk upload, resizable sidebar, force-directed graph

document.addEventListener('DOMContentLoaded', function() {
    // Add dark theme support
    addDarkThemeSupport();

    // Add bulk upload functionality
    addBulkUploadSupport();

    // Make document sidebar resizable
    makeDocumentSidebarResizable();

    // Fix search functionality
    fixSearchFunctionality();

    // Add force-directed graph for document icons
    initializeForceDirectedGraph();
});

// Add dark theme toggle and functionality
function addDarkThemeSupport() {
    // Add dark theme stylesheet link
    const darkThemeLink = document.createElement('link');
    darkThemeLink.rel = 'stylesheet';
    darkThemeLink.href = 'dark-theme.css';
    document.head.appendChild(darkThemeLink);

    // Add theme toggle button
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = '☀️';
    themeToggle.title = 'Toggle Dark/Light Theme';
    document.body.appendChild(themeToggle);

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '🌙';
    }

    // Add toggle event
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');

        // Save preference
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '🌙';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '☀️';
        }
    });
}

// Add bulk upload functionality
function addBulkUploadSupport() {
    // Find the add document button
    const addDocBtn = document.querySelector('.add-document');
    if (!addDocBtn) return;

    // Create multi-upload button
    const multiUploadBtn = document.createElement('button');
    multiUploadBtn.className = 'multi-upload-btn';
    multiUploadBtn.innerHTML = '<span>Bulk Upload</span> <span class="upload-count">0</span>';
    multiUploadBtn.title = 'Upload multiple PDF documents at once';

    // Insert after add document button
    addDocBtn.parentNode.insertBefore(multiUploadBtn, addDocBtn.nextSibling);

    // Add click event
    multiUploadBtn.addEventListener('click', function() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'application/pdf';

        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                handleBulkUpload(Array.from(this.files));
            }
        });

        fileInput.click();
    });
}

// Handle bulk PDF upload
async function handleBulkUpload(files) {
    if (!files || files.length === 0) return;

    // Update upload count display
    const uploadCount = document.querySelector('.upload-count');
    if (uploadCount) {
        uploadCount.textContent = files.length;
    }

    // Show loading notification
    showNotification(`Loading ${files.length} PDF files...`, 'info');

    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Create file URL
        const fileURL = URL.createObjectURL(file);

        try {
            // Call the existing loadPDF function if available
            if (typeof loadPDF === 'function') {
                await loadPDF(fileURL, file.name);
            } else {
                console.error('loadPDF function not available');
                throw new Error('PDF loading function not available');
            }

            // Update progress
            if (uploadCount) {
                uploadCount.textContent = files.length - (i + 1);
            }

            // Brief delay to avoid overwhelming the browser
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.error(`Error loading ${file.name}:`, error);
            showNotification(`Error loading ${file.name}`, 'error');
        }
    }

    // Reset counter
    if (uploadCount) {
        uploadCount.textContent = '0';
    }

    // Final notification
    showNotification(`Successfully loaded ${files.length} PDF files`, 'success');

    // Update force-directed graph if it exists
    if (typeof updateForceDirectedGraph === 'function') {
        updateForceDirectedGraph();
    }
}

// Make document sidebar resizable
function makeDocumentSidebarResizable() {
    const sidebar = document.querySelector('.document-sidebar');
    if (!sidebar) return;

    // Add resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    sidebar.appendChild(resizeHandle);

    // Track resize state
    let isResizing = false;
    let initialWidth = 0;
    let initialX = 0;

    // Handle resize start
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        initialWidth = sidebar.offsetWidth;
        initialX = e.clientX;
        resizeHandle.classList.add('active');

        // Add overlay to capture mouse events during resize
        const overlay = document.createElement('div');
        overlay.id = 'resize-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.zIndex = '1000';
        overlay.style.cursor = 'ew-resize';
        document.body.appendChild(overlay);

        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
    });

    // Handle resize move
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;

        const delta = e.clientX - initialX;
        const newWidth = Math.max(150, Math.min(500, initialWidth + delta));

        sidebar.style.width = newWidth + 'px';

        // Store the new width in local storage
        localStorage.setItem('sidebarWidth', newWidth);
    });

    // Handle resize end
    document.addEventListener('mouseup', function() {
        if (!isResizing) return;

        isResizing = false;
        resizeHandle.classList.remove('active');

        // Remove overlay
        const overlay = document.getElementById('resize-overlay');
        if (overlay) {
            overlay.remove();
        }

        // Restore text selection
        document.body.style.userSelect = '';
    });

    // Load saved width if available
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        sidebar.style.width = savedWidth + 'px';
    }
}

// Fix search functionality
function fixSearchFunctionality() {
    // Find search tool button
    const searchToolBtn = document.getElementById('searchTool');
    if (!searchToolBtn) return;

    // Remove old event listener (if possible)
    const newSearchBtn = searchToolBtn.cloneNode(true);
    searchToolBtn.parentNode.replaceChild(newSearchBtn, searchToolBtn);

    // Add new event listener
    newSearchBtn.addEventListener('click', function() {
        // Create search overlay
        const searchOverlay = document.createElement('div');
        searchOverlay.className = 'search-overlay';
        searchOverlay.innerHTML = `
            <div class="search-dialog">
                <h3>Search Documents</h3>
                <div class="search-input-container">
                    <input type="text" id="search-input" placeholder="Enter search term...">
                    <button id="perform-search">Search</button>
                </div>
                <div class="search-options">
                    <label><input type="checkbox" id="search-current-doc" checked> Search current document only</label>
                    <label><input type="checkbox" id="search-case-sensitive"> Case sensitive</label>
                </div>
                <div class="search-results"></div>
                <button class="close-search">Close</button>
            </div>
        `;
        document.body.appendChild(searchOverlay);

        // Add styles for search overlay
        const style = document.createElement('style');
        style.textContent = `
            .search-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            }

            .search-dialog {
                background-color: white;
                border-radius: 8px;
                padding: 20px;
                width: 500px;
                max-width: 90vw;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }

            .dark-theme .search-dialog {
                background-color: #2d2d2d;
                color: white;
            }

            .search-dialog h3 {
                margin-top: 0;
                margin-bottom: 15px;
            }

            .search-input-container {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }

            .search-input-container input {
                flex: 1;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }

            .dark-theme .search-input-container input {
                background-color: #3d3d3d;
                color: white;
                border-color: #555;
            }

            .search-input-container button {
                background-color: #4285f4;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
            }

            .search-input-container button:hover {
                background-color: #2a75f3;
            }

            .search-options {
                margin-bottom: 15px;
            }

            .search-options label {
                margin-right: 15px;
                cursor: pointer;
            }

            .search-results {
                max-height: 300px;
                overflow-y: auto;
                margin-bottom: 15px;
                border: 1px solid #eee;
                border-radius: 4px;
                padding: 10px;
            }

            .dark-theme .search-results {
                border-color: #555;
            }

            .search-result-item {
                padding: 8px;
                margin-bottom: 5px;
                border-bottom: 1px solid #eee;
                cursor: pointer;
            }

            .search-result-item:hover {
                background-color: #f5f5f5;
            }

            .dark-theme .search-result-item {
                border-bottom-color: #555;
            }

            .dark-theme .search-result-item:hover {
                background-color: #444;
            }

            .search-result-item .result-location {
                font-size: 0.8em;
                color: #666;
                margin-bottom: 3px;
            }

            .dark-theme .search-result-item .result-location {
                color: #aaa;
            }

            .search-result-item .result-context {
                font-size: 0.9em;
            }

            .search-result-item .highlight {
                background-color: yellow;
                padding: 0 2px;
            }

            .dark-theme .search-result-item .highlight {
                background-color: #885800;
                color: white;
            }

            .close-search {
                background-color: #f5f5f5;
                border: 1px solid #ddd;
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
            }

            .dark-theme .close-search {
                background-color: #444;
                color: white;
                border-color: #555;
            }

            .close-search:hover {
                background-color: #e5e5e5;
            }

            .dark-theme .close-search:hover {
                background-color: #555;
            }
        `;
        document.head.appendChild(style);

        // Focus search input
        setTimeout(() => {
            document.getElementById('search-input').focus();
        }, 100);

        // Add event listener for search
        document.getElementById('perform-search').addEventListener('click', performSearch);

        // Add event listener for enter key
        document.getElementById('search-input').addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // Add event listener for close button
        document.querySelector('.close-search').addEventListener('click', function() {
            searchOverlay.remove();
        });

        // Also close on Escape key
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                searchOverlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });
    });

    // Function to perform search
    function performSearch() {
        const searchTerm = document.getElementById('search-input').value.trim();
        if (!searchTerm) return;

        const searchCurrentOnly = document.getElementById('search-current-doc').checked;
        const caseSensitive = document.getElementById('search-case-sensitive').checked;

        // Show loading in results
        const resultsDiv = document.querySelector('.search-results');
        resultsDiv.innerHTML = '<div class="searching">Searching...</div>';

        // Perform the search
        setTimeout(() => {
            const results = searchInDocuments(searchTerm, searchCurrentOnly, caseSensitive);
            displaySearchResults(results, searchTerm, caseSensitive);
        }, 300);
    }

    // Function to search in documents
    function searchInDocuments(term, currentOnly, caseSensitive) {
        const results = [];

        // Get documents to search
        let docsToSearch = [];

        if (currentOnly && typeof currentPDF !== 'undefined' && currentPDF) {
            // Only search current document
            const doc = projectData.documents.find(d => d.id === currentPDF);
            if (doc) {
                docsToSearch.push(doc);
            }
        } else {
            // Search all documents
            docsToSearch = projectData.documents;
        }

        // Search in each document
        docsToSearch.forEach(doc => {
            // Check if we have text content for this document
            if (!pdfTextContent || Object.keys(pdfTextContent).length === 0) {
                return;
            }

            // Search in each page
            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                const content = pdfTextContent[pageNum];
                if (!content) continue;

                // Join all text items
                const pageText = content.items.map(item => item.str).join(' ');

                // Create search regex
                const regex = new RegExp(term, caseSensitive ? 'g' : 'gi');

                // Find all matches
                let match;
                while ((match = regex.exec(pageText)) !== null) {
                    // Get context around match
                    const start = Math.max(0, match.index - 30);
                    const end = Math.min(pageText.length, match.index + term.length + 30);
                    let context = pageText.substring(start, end);

                    // Create search result
                    results.push({
                        docId: doc.id,
                        docName: doc.name,
                        pageNum: pageNum,
                        matchIndex: match.index,
                        matchText: match[0],
                        context: context
                    });
                }
            }
        });

        return results;
    }

    // Function to display search results
    function displaySearchResults(results, term, caseSensitive) {
        const resultsDiv = document.querySelector('.search-results');

        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }

        // Clear previous results
        resultsDiv.innerHTML = '';

        // Create regex for highlighting
        const regex = new RegExp(term, caseSensitive ? 'g' : 'gi');

        // Add each result
        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';

            // Add location info
            const locationDiv = document.createElement('div');
            locationDiv.className = 'result-location';
            locationDiv.textContent = `${result.docName} - Page ${result.pageNum}`;

            // Add context with highlighted match
            const contextDiv = document.createElement('div');
            contextDiv.className = 'result-context';
            contextDiv.innerHTML = result.context.replace(regex, match =>
                `<span class="highlight">${match}</span>`);

            // Add to item
            resultItem.appendChild(locationDiv);
            resultItem.appendChild(contextDiv);

            // Add click event to navigate to result
            resultItem.addEventListener('click', function() {
                navigateToSearchResult(result);
                // Close the search dialog
                document.querySelector('.search-overlay').remove();
            });

            // Add to results
            resultsDiv.appendChild(resultItem);
        });
    }

    // Function to navigate to a search result
    function navigateToSearchResult(result) {
        // Switch to document if needed
        if (currentPDF !== result.docId) {
            // Find document item and click it
            const docItem = document.querySelector(`.document-item[data-doc-id="${result.docId}"]`);
            if (docItem) {
                docItem.click();
            } else {
                console.error('Document not found:', result.docId);
                return;
            }
        }

        // Go to page
        if (typeof queueRenderPage === 'function') {
            queueRenderPage(result.pageNum);

            // Highlight the result after a delay (to allow page to render)
            setTimeout(() => {
                highlightSearchResult(result);
            }, 1000);
        }
    }

    // Function to highlight a search result on the page
    function highlightSearchResult(result) {
        const textLayer = document.getElementById('text-layer');
        if (!textLayer) return;

        // Find approximate position based on text content
        const content = pdfTextContent[result.pageNum];
        if (!content) return;

        let charCount = 0;
        let foundItem = null;
        let foundIndex = -1;

        // Find the text item containing our match
        for (let i = 0; i < content.items.length; i++) {
            const item = content.items[i];
            const itemEnd = charCount + item.str.length;

            if (charCount <= result.matchIndex && result.matchIndex < itemEnd) {
                foundItem = item;
                foundIndex = i;
                break;
            }

            charCount += item.str.length + 1; // +1 for space
        }

        if (foundItem && foundIndex >= 0) {
            // Find the corresponding element in the text layer
            const spans = textLayer.querySelectorAll('span');
            if (foundIndex < spans.length) {
                const span = spans[foundIndex];

                // Create highlight overlay
                const highlight = document.createElement('div');
                highlight.className = 'search-highlight';

                // Position highlight based on the span
                const rect = span.getBoundingClientRect();
                const textLayerRect = textLayer.getBoundingClientRect();

                highlight.style.left = (span.offsetLeft) + 'px';
                highlight.style.top = (span.offsetTop) + 'px';
                highlight.style.width = rect.width + 'px';
                highlight.style.height = rect.height + 'px';

                textLayer.appendChild(highlight);

                // Scroll the span into view
                span.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center'
                });

                // Remove the highlight after a few seconds
                setTimeout(() => {
                    highlight.remove();
                }, 3000);
            }
        }
    }
}

// Initialize force-directed graph for document icons
function initializeForceDirectedGraph() {
    // Create container for the graph
    const workspaceView = document.querySelector('.workspace-view');
    if (!workspaceView) return;

    const graphContainer = document.createElement('div');
    graphContainer.className = 'doc-graph-container';
    workspaceView.appendChild(graphContainer);

    // Initialize the force-directed graph only if we have documents
    updateForceDirectedGraph();

    // Update when workspace changes
    document.getElementById('workspace-selector')?.addEventListener('change', updateForceDirectedGraph);
}

// Update the force-directed graph with current documents
function updateForceDirectedGraph() {
    const graphContainer = document.querySelector('.doc-graph-container');
    if (!graphContainer) return;

    // Clear previous graph
    graphContainer.innerHTML = '';

    // Get documents in the current workspace
    const currentWorkspaceId = projectData.currentWorkspace;
    const currentWorkspace = projectData.workspaces.find(w => w.id === currentWorkspaceId);

    if (!currentWorkspace || !currentWorkspace.items || currentWorkspace.items.length === 0) {
        return;
    }

    // Create nodes for documents that have excerpts in this workspace
    const docIds = new Set();
    currentWorkspace.items.forEach(item => {
        if (item.sourceInfo && item.sourceInfo.documentId) {
            docIds.add(item.sourceInfo.documentId);
        }
    });

    // No documents with excerpts
    if (docIds.size === 0) return;

    // Create document nodes
    const nodes = [];

    docIds.forEach(docId => {
        const doc = projectData.documents.find(d => d.id === docId);
        if (!doc) return;

        // Count excerpts from this document
        const excerptCount = currentWorkspace.items.filter(
            item => item.sourceInfo && item.sourceInfo.documentId === docId
        ).length;

        // Create node
        const node = {
            id: docId,
            name: doc.name,
            excerptCount: excerptCount,
            x: Math.random() * graphContainer.offsetWidth,
            y: Math.random() * graphContainer.offsetHeight,
            vx: 0,
            vy: 0
        };

        nodes.push(node);
    });

    // Create DOM elements for nodes
    nodes.forEach(node => {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'doc-node';
        nodeElement.style.left = node.x + 'px';
        nodeElement.style.top = node.y + 'px';

        // Choose icon based on file extension
        let icon = '📄';
        if (node.name.toLowerCase().endsWith('.pdf')) {
            icon = '📑';
        } else if (node.name.toLowerCase().endsWith('.txt')) {
            icon = '📝';
        } else if (node.name.toLowerCase().endsWith('.docx') || node.name.toLowerCase().endsWith('.doc')) {
            icon = '📋';
        }

        // Add content
        nodeElement.innerHTML = `
            <div class="doc-icon">${icon}</div>
            <div class="doc-title">${node.name}</div>
        `;

        // Set size based on excerpt count
        const minSize = 50;
        const maxSize = 80;
        const sizeScale = Math.min(1, Math.max(0.5, node.excerptCount / 10));
        const size = minSize + (maxSize - minSize) * sizeScale;

        nodeElement.style.width = size + 'px';
        nodeElement.style.height = Math.floor(size * 1.2) + 'px';

        // Add to container
        graphContainer.appendChild(nodeElement);

        // Store reference to DOM element
        node.element = nodeElement;

        // Add click event to navigate to document
        nodeElement.addEventListener('click', function() {
            // Find document item and click it
            const docItem = document.querySelector(`.document-item[data-doc-id="${node.id}"]`);
            if (docItem) {
                docItem.click();
            }
        });
    });

    // Run force-directed layout simulation
    runForceSimulation(nodes, graphContainer);
}

// Run force-directed layout simulation
function runForceSimulation(nodes, container) {
    if (nodes.length === 0) return;

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // Force simulation parameters
    const repulsionForce = 200;
    const springLength = 100;
    const springStiffness = 0.1;
    const damping = 0.8;
    const centerForce = 0.05;

    // Run simulation for a fixed number of iterations
    const iterations = 100;
    let iteration = 0;

    function simulateStep() {
        // Apply forces
        for (let i = 0; i < nodes.length; i++) {
            const node1 = nodes[i];

            // Center force
            const dx = containerWidth / 2 - node1.x;
            const dy = containerHeight / 2 - node1.y;
            const distanceToCenter = Math.sqrt(dx * dx + dy * dy);

            if (distanceToCenter > 0) {
                node1.vx += (dx / distanceToCenter) * centerForce * distanceToCenter;
                node1.vy += (dy / distanceToCenter) * centerForce * distanceToCenter;
            }

            // Repulsion between nodes
            for (let j = i + 1; j < nodes.length; j++) {
                const node2 = nodes[j];

                const dx = node2.x - node1.x;
                const dy = node2.y - node1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0 && distance < 200) {
                    const force = repulsionForce / (distance * distance);
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;

                    node1.vx -= fx;
                    node1.vy -= fy;
                    node2.vx += fx;
                    node2.vy += fy;
                }
            }

            // Apply spring forces between related nodes
            for (let j = 0; j < nodes.length; j++) {
                if (i === j) continue;

                const node2 = nodes[j];

                // Check if these nodes are related (e.g., have connections)
                // For simplicity, we'll connect all nodes with springs
                const dx = node2.x - node1.x;
                const dy = node2.y - node1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0) {
                    const displacement = distance - springLength;
                    const force = springStiffness * displacement;
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;

                    node1.vx += fx;
                    node1.vy += fy;
                }
            }
        }

        // Update positions
        for (const node of nodes) {
            // Apply damping
            node.vx *= damping;
            node.vy *= damping;

            // Update position
            node.x += node.vx;
            node.y += node.vy;

            // Keep within bounds
            node.x = Math.max(50, Math.min(containerWidth - 50, node.x));
            node.y = Math.max(50, Math.min(containerHeight - 50, node.y));

            // Update DOM element
            node.element.style.left = Math.round(node.x - node.element.offsetWidth / 2) + 'px';
            node.element.style.top = Math.round(node.y - node.element.offsetHeight / 2) + 'px';
        }

        // Continue simulation
        iteration++;
        if (iteration < iterations) {
            requestAnimationFrame(simulateStep);
        }
    }

    // Start simulation
    simulateStep();
}

// Utility function to show notification
function showNotification(message, type = 'info') {
    // Check if we have a showNotification function already
    if (window.showNotification && typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification ' + type;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove after a few seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
} document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = '☀️';
    themeToggle.title = 'Toggle Dark/Light Theme';
    document.body.appendChild(themeToggle);

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '🌙';
    }

    // Add toggle event
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');

        // Save preference
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '🌙';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '☀️';
        }
    });
}

// Add bulk upload functionality
function addBulkUploadSupport() {
    // Find the add document button
    const addDocBtn = document.querySelector('.add-document');
    if (!addDocBtn) return;

    // Create multi-upload button
    const multiUploadBtn = document.createElement('button');
    multiUploadBtn.className = 'multi-upload-btn';
    multiUploadBtn.innerHTML = '<span>Bulk Upload</span> <span class="upload-count">0</span>';
    multiUploadBtn.title = 'Upload multiple PDF documents at once';

    // Insert after add document button
    addDocBtn.parentNode.insertBefore(multiUploadBtn, addDocBtn.nextSibling);

    // Add click event
    multiUploadBtn.addEventListener('click', function() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'application/pdf';

        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                handleBulkUpload(Array.from(this.files));
            }
        });

        fileInput.click();
    });
}

// Handle bulk PDF upload
async function handleBulkUpload(files) {
    if (!files || files.length === 0) return;

    // Update upload count display
    const uploadCount = document.querySelector('.upload-count');
    if (uploadCount) {
        uploadCount.textContent = files.length;
    }

    // Show loading notification
    showNotification(`Loading ${files.length} PDF files...`, 'info');

    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Create file URL
        const fileURL = URL.createObjectURL(file);

        try {
            // Call the existing loadPDF function if available
            if (typeof loadPDF === 'function') {
                await loadPDF(fileURL, file.name);
            } else {
                console.error('loadPDF function not available');
                throw new Error('PDF loading function not available');
            }

            // Update progress
            if (uploadCount) {
                uploadCount.textContent = files.length - (i + 1);
            }

            // Brief delay to avoid overwhelming the browser
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.error(`Error loading ${file.name}:`, error);
            showNotification(`Error loading ${file.name}`, 'error');
        }
    }

    // Reset counter
    if (uploadCount) {
        uploadCount.textContent = '0';
    }

    // Final notification
    showNotification(`Successfully loaded ${files.length} PDF files`, 'success');

    // Update force-directed graph if it exists
    if (typeof updateForceDirectedGraph === 'function') {
        updateForceDirectedGraph();
    }
}
