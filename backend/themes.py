"""
★ موضوعات واجهة المستخدم (UI Themes)
"""

THEMES = {
    "cyberpunk": {
        "primary": "\033[38;5;198m",   # Neon Pink
        "secondary": "\033[38;5;39m",  # Neon Blue
        "accent": "\033[38;5;226m",    # Neon Yellow
        "text": "\033[38;5;253m",      # White/Gray
        "error": "\033[38;5;196m",     # Red
        "reset": "\033[0m"
    },
    "matrix": {
        "primary": "\033[38;5;46m",    # Bright Green
        "secondary": "\033[38;5;22m",   # Dark Green
        "accent": "\033[38;5;118m",     # Lighter Green
        "text": "\033[38;5;253m",       # Bright Default
        "error": "\033[38;5;196m",      # Red
        "reset": "\033[0m"
    },
    "default": {
        "primary": "",
        "secondary": "",
        "accent": "",
        "text": "",
        "error": "",
        "reset": ""
    }
}
