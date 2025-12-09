"""
Local HTTP server for testing tours.
"""

import http.server
import socketserver
import threading
import webbrowser
import os


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler with logging suppressed."""
    
    def log_message(self, format, *args):
        pass  # Suppress logging
    
    def finish(self):
        """Suppress BrokenPipeError exceptions."""
        try:
            super().finish()
        except (BrokenPipeError, ConnectionResetError):
            pass  # Ignore broken pipe errors (browser canceled request)
    
    def handle(self):
        """Handle requests with exception suppression."""
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass  # Ignore broken pipe errors


def start_server(directory, port=8000, open_browser=True):
    """
    Start local HTTP server.
    
    Args:
        directory: Directory to serve
        port: Port number (will auto-increment if busy)
        open_browser: Whether to open browser automatically
    """
    os.chdir(directory)
    
    # Find available port
    while port < 9000:
        try:
            httpd = socketserver.TCPServer(("", port), QuietHandler)
            break
        except OSError:
            port += 1
    
    print(f"\n🌐 Starting local server on http://localhost:{port}")
    print(f"📂 Serving: {directory}")
    print("\n Press Ctrl+C to stop the server")
    
    # Open browser
    if open_browser:
        # Check if index.html is in app-files or root
        if os.path.exists(os.path.join(directory, "app-files", "index.html")):
            url = f"http://localhost:{port}/app-files/index.html"
        else:
            url = f"http://localhost:{port}/index.html"
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped")
        httpd.shutdown()


