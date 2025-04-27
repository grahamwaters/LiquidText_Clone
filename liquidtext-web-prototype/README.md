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
