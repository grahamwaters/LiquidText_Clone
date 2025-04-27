// This file provides core document loading functionality
// for the advanced multi-document view

// Global variables for document management
let documentCounter = 0;

// Initialize document handling on page load
document.addEventListener('DOMContentLoaded', function() {
    setupDocumentLoading();
});

// Set up document loading functionality
function setupDocumentLoading() {
    // Add document button event listeners
    document.querySelectorAll('.load-document-btn').forEach(button => {
        button.addEventListener('click', function() {
            const frameIndex = parseInt(this.getAttribute('data-index'));
            openFileDialog(frameIndex);
        });
    });
}

// Open file dialog to select PDF files
function openFileDialog(frameIndex) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf';

    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            loadPDF(frameIndex, file);
        }
    });

    fileInput.click();
}

// Load a PDF file into a document frame
function loadPDF(frameIndex, file) {
    console.log("Loading PDF into frame", frameIndex, file.name);

    const frame = document.querySelector(`.document-frame[data-index="${frameIndex}"]`);
    if (!frame) {
        console.error("Frame not found:", frameIndex);
        return;
    }

    const addDocPanel = frame.querySelector('.add-document-panel');
    if (!addDocPanel) {
        console.error("Add document panel not found in frame", frameIndex);
        return;
    }

    // Create and show loading indicator
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner"></div>';
    frame.appendChild(loadingOverlay);

    // Hide the add document panel
    addDocPanel.style.display = 'none';

    // Update frame title
    const titleElement = frame.querySelector('.pdf-title-bar span');
    if (titleElement) {
        titleElement.textContent = file.name;
    }

    // Create a URL for the file
    const fileURL = URL.createObjectURL(file);

    // Load the PDF using PDF.js
    pdfjsLib.getDocument(fileURL).promise.then(function(pdfDoc) {
        console.log("PDF loaded successfully with", pdfDoc.numPages, "pages");

        // Store the loaded document
        const docData = {
            name: file.name,
            pdfDocument: pdfDoc,
            pageCount: pdfDoc.numPages,
            currentPage: 1,
            scale: 1.0,
            textContent: {}  // Will store text content by page
        };

        // Store in global array if it exists
        if (typeof loadedDocuments !== 'undefined') {
            loadedDocuments[frameIndex] = docData;
        }

        // Update page count display
        const totalPagesElement = frame.querySelector('.total-pages');
        if (totalPagesElement) {
            totalPagesElement.textContent = pdfDoc.numPages;
        }

        // Render the first page
        renderPage(frameIndex, 1, pdfDoc);

        // Remove loading overlay
        loadingOverlay.remove();

        // Apply any active entity highlights if that function exists
        if (typeof applyActiveHighlightsToDocument === 'function') {
            applyActiveHighlightsToDocument(frameIndex);
        }

        showNotification(`Document "${file.name}" loaded successfully`, 'success');

    }).catch(function(error) {
        console.error('Error loading PDF:', error);

        // Show error message
        addDocPanel.style.display = 'flex';
        const messageElement = addDocPanel.querySelector('p');
        if (messageElement) {
            messageElement.textContent = 'Error loading PDF: ' + error.message;
        }

        // Remove loading overlay
        loadingOverlay.remove();

        showNotification('Error loading PDF: ' + error.message, 'error');
    });
}

// Render a specific page of a PDF
function renderPage(frameIndex, pageNum, pdfDoc) {
    console.log("Rendering page", pageNum, "for document in frame", frameIndex);

    // Use the provided pdfDoc or get it from global array if available
    let docData = null;

    if (pdfDoc) {
        docData = {
            pdfDocument: pdfDoc,
            currentPage: pageNum,
            scale: 1.0
        };
    } else if (typeof loadedDocuments !== 'undefined') {
        docData = loadedDocuments[frameIndex];
    }

    if (!docData || !docData.pdfDocument) {
        console.error("No PDF document available for rendering");
        return;
    }

    const frame = document.querySelector(`.document-frame[data-index="${frameIndex}"]`);
    if (!frame) {
        console.error("Frame not found:", frameIndex);
        return;
    }

    const canvas = frame.querySelector(`#pdf-canvas-${frameIndex}`);
    if (!canvas) {
        console.error("Canvas not found for frame", frameIndex);
        return;
    }

    const textLayer = frame.querySelector(`#text-layer-${frameIndex}`);

    // Update page indicator
    const currentPageElement = frame.querySelector('.current-page');
    if (currentPageElement) {
        currentPageElement.textContent = pageNum;
    }

    // Update stored current page
    docData.currentPage = pageNum;

    // Get the PDF page
    docData.pdfDocument.getPage(pageNum).then(function(page) {
        // Calculate the scale to fit within the frame
        const viewport = page.getViewport({ scale: 1.0 });
        const pdfFrame = frame.querySelector('.pdf-frame');

        if (!pdfFrame) {
            console.error("PDF frame element not found");
            return;
        }

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
            if (typeof docData.textContent === 'object') {
                docData.textContent[pageNum] = textContent;
            }

            if (textLayer) {
                // Clear the text layer
                textLayer.innerHTML = '';

                // Set text layer position
                textLayer.style.left = canvas.offsetLeft + 'px';
                textLayer.style.top = canvas.offsetTop + 'px';
                textLayer.style.height = canvas.height + 'px';
                textLayer.style.width = canvas.width + 'px';

                // Render text layer
                renderTextLayer(textLayer, textContent, scaledViewport);

                // Apply any active highlights if that function exists
                if (typeof applyActiveHighlightsToDocument === 'function') {
                    applyActiveHighlightsToDocument(frameIndex);
                }
            }
        });
    }).catch(function(error) {
        console.error("Error rendering page:", error);
        showNotification('Error rendering page: ' + error.message, 'error');
    });
}

// Simplified text layer renderer
function renderTextLayer(textLayer, textContent, viewport) {
    if (!textContent || !textContent.items) return;

    textContent.items.forEach((item, index) => {
        if (!item.transform || item.transform.length < 6) return;

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
        textSpan.style.fontFamily = item.fontName || 'sans-serif';
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

// Create a notification
function showNotification(message, type = 'info') {
    console.log("Notification:", type, message);

    // Check if there's a showNotification function already in the page
    if (window.showNotification && typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }

    // Create our own notification
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