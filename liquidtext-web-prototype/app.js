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

        // // Make document item clickable
        // docItem.addEventListener('click', function() {
        //     currentPDF = this.dataset.docId;
        //     const doc = projectData.documents.find(d => d.id === currentPDF);
        //     loadPDF(doc.url);
        // });
        //! Fix: Changed to this:
        docItem.addEventListener('click', function() {
            currentPDF = this.dataset.docId;
            const doc = projectData.documents.find(d => d.id === currentPDF);

            // Don't reload the PDF, just switch to it
            // Update UI to show this is the current document
            document.querySelectorAll('.document-item').forEach(item => {
                item.classList.remove('active');
            });
            this.classList.add('active');

            // If we already have this PDF loaded, just update page
            if (pdfDoc && currentPage) {
                renderPage(currentPage);
            } else {
                // Only load if not already loaded
                loadPDF(doc.url);
            }
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
}

//? Function to handle text selection in the PDF
// function handleTextSelection() {
//     const selection = window.getSelection();
//     if (selection.toString().trim()) {
//         selectedText = selection.toString();

//         // Show an excerpt button near the selection
//         const range = selection.getRangeAt(0);
//         const rect = range.getBoundingClientRect();

//         // Create or update excerpt button
//         let excerptBtn = document.getElementById('excerpt-button');
//         if (!excerptBtn) {
//             excerptBtn = document.createElement('button');
//             excerptBtn.id = 'excerpt-button';
//             excerptBtn.textContent = 'Create Excerpt';
//             excerptBtn.className = 'excerpt-button';
//             document.body.appendChild(excerptBtn);
//         }

//         // Position the button
//         excerptBtn.style.left = (rect.left + window.scrollX) + 'px';
//         excerptBtn.style.top = (rect.bottom + window.scrollY + 5) + 'px';
//         excerptBtn.style.display = 'block';

//         // Handle excerpt creation
//         excerptBtn.onclick = function() {
//             const sourceInfo = {
//                 documentId: currentPDF,
//                 page: currentPage,
//                 text: selectedText,
//                 coordinates: {
//                     x: rect.left - document.getElementById('pdf-canvas').getBoundingClientRect().left,
//                     y: rect.top - document.getElementById('pdf-canvas').getBoundingClientRect().top,
//                     width: rect.width,
//                     height: rect.height
//                 }
//             };

//             createExcerpt(selectedText, sourceInfo);

//             // Hide button after use
//             excerptBtn.style.display = 'none';

//             // Clear selection
//             if (window.getSelection) {
//                 if (window.getSelection().empty) {  // Chrome
//                     window.getSelection().empty();
//                 } else if (window.getSelection().removeAllRanges) {  // Firefox
//                     window.getSelection().removeAllRanges();
//                 }
//             } else if (document.selection) {  // IE
//                 document.selection.empty();
//             }
//         };
//     } else {
//         const excerptBtn = document.getElementById('excerpt-button');
//         if (excerptBtn) {
//             excerptBtn.style.display = 'none';
//         }
//     }
// }

//! fix -- new function
// Modify the handleTextSelection function to work better
function handleTextSelection() {
    const selection = window.getSelection();
    if (selection.toString().trim()) {
        selectedText = selection.toString();

        // Show an excerpt button near the selection
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const pdfContainer = document.querySelector('.pdf-container');
        const containerRect = pdfContainer.getBoundingClientRect();

        // Create or update excerpt button
        let excerptBtn = document.getElementById('excerpt-button');
        if (!excerptBtn) {
            excerptBtn = document.createElement('button');
            excerptBtn.id = 'excerpt-button';
            excerptBtn.textContent = 'Create Excerpt';
            excerptBtn.className = 'excerpt-button';
            document.body.appendChild(excerptBtn);
        }

        // Position the button relative to the PDF container
        excerptBtn.style.left = (rect.left - containerRect.left + pdfContainer.scrollLeft + rect.width/2) + 'px';
        excerptBtn.style.top = (rect.bottom - containerRect.top + pdfContainer.scrollTop + 5) + 'px';
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
        localStorage.setItem('PowerEye-project', JSON.stringify(projectData));
        showNotification('Project saved successfully');
    } catch (e) {
        console.error('Error saving project:', e);
        showNotification('Error saving project: ' + e.message, 'error');
    }
}

// Load a project from local storage
function loadProject() {
    try {
        const savedProject = localStorage.getItem('PowerEye-project');
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
    //possible
    textLayer.style.position = 'absolute';


    document.getElementById('advancedMultiDocView').addEventListener('click', function() {
        window.location.href = 'enhanced-multi-document-view.html';
    });

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

    //? Add document button
    // document.querySelector('.add-document').addEventListener('click', function() {
    //     // In a real app, we'd use File API to let users select a PDF
    //     // For demo, simulate a file dialog then load a sample PDF
    //     const fileInput = document.createElement('input');
    //     fileInput.type = 'file';
    //     fileInput.accept = 'application/pdf';

    //     fileInput.addEventListener('change', function() {
    //         if (this.files && this.files[0]) {
    //             // In a real implementation, we'd handle the user's actual file
    //             // For demo purposes, we'll still load the sample PDF
    //             loadPDF('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');
    //         }
    //     });

    //     fileInput.click();
    // });
    //! fix added the below
    document.querySelector('.add-document').addEventListener('click', function() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'application/pdf';

        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const fileURL = URL.createObjectURL(file);

                // Now load the actual selected file
                loadPDF(fileURL);
            }
        });

        fileInput.click();
    });
    // Tool selection
    document.getElementById('highlightTool').addEventListener('click', function() {
        setActiveTool('highlight');
        document.getElementById('text-layer').style.cursor = 'url("highlight-cursor.png"), auto';
    });

    document.getElementById('commentTool').addEventListener('click', function() {
        setActiveTool('comment');
        document.getElementById('text-layer').style.cursor = 'url("comment-cursor.png"), auto';
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

// Add this function to implement highlighting
function highlightSelectedText() {
    if (!selectedText) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const spans = range.getNodes([Node.ELEMENT_NODE])
        .filter(node => node.nodeName === 'SPAN');

    if (spans.length === 0) return;

    // Add highlight class to all spans in the selection
    spans.forEach(span => {
        span.classList.add('highlighted');
    });

    // Save the highlight to the project data
    const highlightId = 'highlight-' + Date.now();
    const highlight = {
        id: highlightId,
        documentId: currentPDF,
        page: currentPage,
        text: selectedText,
        spans: spans.map(span => span.dataset.index || '0')
    };

    // Add highlight to the current document's data
    const doc = projectData.documents.find(d => d.id === currentPDF);
    if (doc) {
        if (!doc.highlights) doc.highlights = [];
        doc.highlights.push(highlight);
    }

    // Clear the selection
    if (window.getSelection) {
        if (window.getSelection().empty) {
            window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) {
            window.getSelection().removeAllRanges();
        }
    }

    // Hide excerpt button
    const excerptBtn = document.getElementById('excerpt-button');
    if (excerptBtn) {
        excerptBtn.style.display = 'none';
    }

    selectedText = "";

    showNotification('Text highlighted');
}

// Update the highlight tool handler
document.getElementById('highlightTool').addEventListener('click', function() {
    setActiveTool('highlight');

    // When the highlight tool is active, clicking on selected text will highlight it
    const textLayer = document.getElementById('text-layer');
    textLayer.style.cursor = 'text';

    // Add event handler for highlighting
    textLayer.addEventListener('click', function highlightHandler(e) {
        if (currentTool === 'highlight' && selectedText) {
            highlightSelectedText();
        }
    });
});

// Add CSS for highlights
const style = document.createElement('style');
style.textContent = `
.highlighted {
    background-color: rgba(255, 255, 0, 0.5) !important;
    color: black !important;
}
`;
document.head.appendChild(style);