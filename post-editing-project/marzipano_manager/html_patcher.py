"""
HTML patching utilities for injecting editor code.
"""

import os


def patch_index_html(index_path, editor_init_template_path):
    """
    Patch index.html to include editor files and initialization.
    
    Args:
        index_path: Path to index.html
        editor_init_template_path: Path to editor initialization template
    """
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add lang="en" to prevent auto-translation
    if '<html>' in content and 'lang=' not in content:
        content = content.replace('<html>', '<html lang="en">')
    
    # Determine if index.html is in app-files/ or root
    # This affects the path to editor files
    is_in_app_files = 'app-files' in index_path
    editor_path_prefix = '' if is_in_app_files else 'app-files/'
    
    # Add editor CSS before </head>
    css_link = f'<link rel="stylesheet" href="{editor_path_prefix}editor.css">'
    if css_link not in content and 'editor.css' not in content:
        content = content.replace(
            '</head>',
            f'  {css_link}\n</head>'
        )
    
    # Expose viewer and scenes globally for editor
    # Find where viewer and scenes are created and expose them
    if 'window.viewer = viewer;' not in content:
        content = content.replace(
            'var viewer = new Marzipano.Viewer(',
            'var viewer = window.viewer = new Marzipano.Viewer('
        )
    
    if 'window.scenes = scenes;' not in content:
        # Add after scenes array is created
        content = content.replace(
            'var scenes = data.scenes.map(',
            'var scenes = window.scenes = data.scenes.map('
        )
    
    # Add editor JS and initialization before </body>
    js_script = f'<script src="{editor_path_prefix}editor.js"></script>'
    if js_script not in content and 'editor.js' not in content:
        with open(editor_init_template_path, 'r', encoding='utf-8') as f:
            editor_init = f.read()
        
        # Replace placeholder in template with correct path
        editor_init = editor_init.replace('app-files/editor.js', f'{editor_path_prefix}editor.js')
        
        content = content.replace('</body>', editor_init + '\n</body>')
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(content)


def patch_for_player(index_path, player_js_path):
    """
    Patch index.html to include player for final build.
    
    Args:
        index_path: Path to index.html
        player_js_path: Path to player.js (relative to app-files)
    """
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add player JS before </body>
    if '<script src="app-files/player.js"></script>' not in content:
        player_init = '''
  <script src="app-files/player.js"></script>
  <script>
    // Initialize player after Marzipano loads
    (function() {
      setTimeout(function() {
        if (window.viewer && window.scenes && window.APP_DATA) {
          MarzipanoPlayer.init(window.viewer, window.scenes, window.APP_DATA);
        }
      }, 500);
    })();
  </script>
'''
        content = content.replace('</body>', player_init + '</body>')
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(content)


def inject_transition_system(index_path):
    """
    Inject transition system scripts into index.html.
    
    Args:
        index_path: Path to index.html
    """
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Determine path prefix
    is_in_app_files = 'app-files' in index_path
    path_prefix = '' if is_in_app_files else 'app-files/'
    
    # Add transition runtime before editor.js
    transition_script = f'<script src="{path_prefix}transition_runtime.js"></script>'
    view_config_loader = f'''
  <script>
    // Load view configuration
    fetch('{path_prefix}view_config.json')
      .then(response => response.json())
      .then(config => {{
        if (window.loadViewConfig) {{
          window.loadViewConfig(config);
        }} else {{
          window.addEventListener('load', function() {{
            setTimeout(function() {{
              if (window.loadViewConfig) window.loadViewConfig(config);
            }}, 100);
          }});
        }}
      }})
      .catch(err => console.error('Failed to load view config:', err));
  </script>
'''
    
    if transition_script not in content and 'transition_runtime.js' not in content:
        # Inject before editor.js
        if f'<script src="{path_prefix}editor.js"></script>' in content:
            content = content.replace(
                f'<script src="{path_prefix}editor.js"></script>',
                transition_script + '\n  ' + view_config_loader + '\n  ' + f'<script src="{path_prefix}editor.js"></script>'
            )
        else:
            # Fallback: inject before </body>
            content = content.replace('</body>', transition_script + '\n  ' + view_config_loader + '\n</body>')
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(content)


