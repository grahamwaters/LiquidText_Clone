#!/bin/bash

# Create project directory
mkdir -p PowerEye-web-prototype
cd PowerEye-web-prototype

# Create index.html
cat > index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PowerEye Web Clone</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="app-container">
        <header class="toolbar">
            <div class="logo">PowerEye Web Clone</div>
            <div class="tools">
                <button id="highlightTool">Highlight</button>
                <button id="commentTool">Comment</button>
                <button id="penTool">Pen</button>
                <button id="eraserTool">Eraser</button>
                <button id="searchTool">Search</button>
            </div>
            <div class="project-controls">
                <button id="newProject">New</button>
                <button id="openProject">Open</button>
                <button id="saveProject">Save</button>
                <button id="exportProject">Export</button>
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
                </div>
                <div class="document-controls">
                    <button id="prevPage">Previous</button>
                    <span id="pageNum">1</span> / <span id="pageCount">1</span>
                    <button id="nextPage">Next</button>
                    <input type="number" id="goToPage" min="1" value="1">
                    <button id="zoomIn">+</button>
                    <button id="zoomOut">-</button>
                </div>
            </section>

            <section class="workspace-view">
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

# Create styles.css
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
}

button:hover {
    background-color: #f0f0f0;
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
EOL

# Create app.js
cat > app.js << 'EOL'
// Define global variables
let currentPDF = null;
let currentPage = 1;
let pdfDoc = null;
let pageCount = 0;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

// Initialize workspace canvas with Fabric.js
let workspaceCanvas;

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
        });
    });

    // Update page counters
    document.getElementById('pageNum').textContent = num;
    currentPage = num;
}

// Function to load a PDF file
function loadPDF(url) {
    pdfjsLib.getDocument(url).promise.then(function(pdf) {
        pdfDoc = pdf;
        pageCount = pdf.numPages;
        document.getElementById('pageCount').textContent = pageCount;
        document.getElementById('goToPage').max = pageCount;

        // Initial/first page rendering
        renderPage(1);

        // Add the PDF to the document list
        const docList = document.querySelector('.document-list');
        const docItem = document.createElement('div');
        docItem.className = 'document-item';
        docItem.textContent = url.split('/').pop(); // Just use filename
        docList.appendChild(docItem);
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
    // Create a text object on the workspace canvas
    const excerpt = new fabric.Textbox(text, {
        left: 50,
        top: 50,
        width: 300,
        fill: '#000000',
        fontSize: 16,
        padding: 10,
        backgroundColor: '#ffffcc'
    });

    // Store source information for bi-directional linking
    excerpt.sourceInfo = sourceInfo;

    // Add the excerpt to the canvas
    workspaceCanvas.add(excerpt);
    workspaceCanvas.setActiveObject(excerpt);
    workspaceCanvas.renderAll();
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

    // Create a white background for the workspace
    const backgroundRect = new fabric.Rect({
        left: 0,
        top: 0,
        fill: 'white',
        width: workspaceCanvas.width,
        height: workspaceCanvas.height,
        selectable: false
    });
    workspaceCanvas.add(backgroundRect);
    workspaceCanvas.renderAll();

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
        // For demo, we'll just load a sample PDF
        loadPDF('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');
    });

    // Tool selection
    document.getElementById('highlightTool').addEventListener('click', function() {
        // In a real implementation, we'd add highlighting functionality
        alert('Highlight tool selected');
    });

    document.getElementById('commentTool').addEventListener('click', function() {
        // In a real implementation, we'd add commenting functionality
        alert('Comment tool selected');
    });

    // Add a sample excerpt (simulating text selection and extraction)
    document.getElementById('penTool').addEventListener('click', function() {
        createExcerpt('This is a sample excerpt from the document. In a real implementation, you would select text from the PDF.', {
            page: currentPage,
            coordinates: { x: 100, y: 200 } // Example coordinates
        });
    });

    // Initialize with a sample PDF
    loadPDF('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');
});

// Handle window resize
window.addEventListener('resize', function() {
    // Resize the workspace canvas
    if (workspaceCanvas) {
        workspaceCanvas.setWidth(document.querySelector('.workspace-view').offsetWidth);
        workspaceCanvas.setHeight(document.querySelector('.workspace-view').offsetHeight);
        workspaceCanvas.renderAll();
    }
});
EOL

# Create a README.md file
cat > README.md << 'EOL'
# PowerEye Web Prototype

This is a basic web-based prototype of a PowerEye-like application, built with HTML, CSS, and JavaScript.

## Features

- PDF document viewing
- Basic navigation (next/previous page, go to page, zoom)
- Simple workspace for excerpts
- Simulated excerpt creation
- Bi-directional linking (conceptual)

## How to Run

1. Clone or download this repository
2. Open index.html in a modern web browser
   - For local development, use a local server to avoid CORS issues with PDF loading
   - You can use Python's built-in server: `python -m http.server 8000`
   - Then access http://localhost:8000 in your browser

## Libraries Used

- PDF.js for PDF rendering
- Fabric.js for the workspace canvas

## Next Steps

This is a minimal prototype. Future enhancements would include:
- Proper text selection and excerpting from PDFs
- Highlighting and annotation tools
- Gesture support (e.g., pinch to collapse)
- Project management with local storage
- Multiple workspaces
- Export functionality

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

echo "Setup complete! Project files created in: PowerEye-web-prototype"
echo "To run the project:"
echo "1. cd PowerEye-web-prototype"
echo "2. Start a local server: python serve.py"
echo "3. Open http://localhost:8000 in your browser"

# Make the script executable
chmod +x serve.py
EOL

# Make the setup script executable
chmod +x setup.sh

echo "Setup script created. Run it using: ./setup.sh"