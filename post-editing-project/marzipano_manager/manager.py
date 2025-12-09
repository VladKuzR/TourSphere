"""
Main Tour Manager module.
Orchestrates initialization and building of Marzipano tours.
"""

import os
import sys
from pathlib import Path

from . import parser
from . import transitions
from . import file_ops
from . import html_patcher
from . import js_patcher
from . import server
from . import view_config_generator


class TourManager:
    """Manages Marzipano tour initialization and building."""
    
    def __init__(self):
        self.work_dir = None
        self.data = None
        self.manager_dir = Path(__file__).parent
        
    def init(self, zip_path, output_dir=None):
        """
        Initialize a tour from Marzipano Tool export.
        
        Args:
            zip_path: Path to the ZIP archive from Marzipano Tool
            output_dir: Optional output directory (defaults to extracted folder name)
        """
        print(f"📦 Extracting tour from {zip_path}...")
        
        # Determine output directory
        if output_dir is None:
            output_dir = os.path.splitext(os.path.basename(zip_path))[0] + "_editor"
        
        self.work_dir = os.path.abspath(output_dir)
        
        # Extract ZIP
        file_ops.extract_zip(zip_path, self.work_dir)
        print(f"✓ Extracted to {self.work_dir}")
        
        # Parse data.js
        data_js_path = os.path.join(self.work_dir, "app-files", "data.js")
        if not os.path.exists(data_js_path):
            print(f"❌ Error: data.js not found at {data_js_path}")
            sys.exit(1)
        
        print("🔍 Parsing data.js...")
        self.data = parser.parse_data_js(data_js_path)
        print(f"✓ Found {len(self.data['scenes'])} scenes")
        
        # Apply Auto-180 Logic
        print("🔄 Applying Auto-180 Logic...")
        transitions.calculate_entry_angles(self.data)
        print("✓ Entry headings calculated")
        
        # Copy editor files
        print("📝 Installing editor...")
        editor_dir = self.manager_dir / "editor"
        target_dir = os.path.join(self.work_dir, "app-files")
        file_ops.copy_editor_files(editor_dir, target_dir)
        print("✓ Editor installed")
        
        # Patch index.html
        print("🔧 Patching index.html...")
        # Try app-files/index.html first (common structure), then root index.html
        index_path = os.path.join(self.work_dir, "app-files", "index.html")
        if not os.path.exists(index_path):
            index_path = os.path.join(self.work_dir, "index.html")
        if not os.path.exists(index_path):
            print(f"❌ Error: index.html not found in {self.work_dir} or app-files/")
            sys.exit(1)
        editor_init_template = self.manager_dir / "templates" / "editor_init.html"
        html_patcher.patch_index_html(index_path, editor_init_template)
        print("✓ index.html patched")
        
        # Patch index.js to expose Marzipano objects
        print("🔧 Patching index.js...")
        js_patcher.patch_index_js(self.work_dir)
        print("✓ index.js patched")
        
        # Generate view config with auto-180 logic
        print("🎯 Generating view config (auto-180 logic)...")
        view_config = view_config_generator.generate_view_config(self.data)
        view_config_path = os.path.join(self.work_dir, "app-files", "view_config.json")
        view_config_generator.save_view_config(view_config, view_config_path)
        print("✓ View config generated")
        
        # Copy transition runtime
        print("🎬 Installing transition system...")
        transition_runtime = self.manager_dir / "transitions" / "runtime.js"
        target_runtime = os.path.join(self.work_dir, "app-files", "transition_runtime.js")
        import shutil
        shutil.copy(transition_runtime, target_runtime)
        print("✓ Transition system installed")
        
        # Patch index.html to include transition runtime
        print("🔧 Injecting transition system into index.html...")
        html_patcher.inject_transition_system(index_path)
        print("✓ Transition system injected")
        
        # Patch index.js to use seamless transitions
        print("🔧 Patching index.js for seamless transitions...")
        js_patcher.patch_for_transitions(self.work_dir)
        print("✓ Transition hooks installed")
        
        # Save enhanced data as JSON for editor
        json_path = os.path.join(self.work_dir, "app-files", "tour_data.json")
        parser.data_to_json(self.data, json_path)
        
        print("\n✅ Initialization complete!")
        print(f"📁 Tour directory: {self.work_dir}")
        
        # Start local server
        server.start_server(self.work_dir)
        
    def build(self, config_path, output_zip=None):
        """
        Build final tour from config.
        
        Args:
            config_path: Path to config.json from editor
            output_zip: Output ZIP filename (defaults to final_tour.zip)
        """
        print(f"🔨 Building tour from {config_path}...")
        
        if not os.path.exists(config_path):
            print(f"❌ Error: Config file not found: {config_path}")
            sys.exit(1)
        
        # Load config
        self.data = parser.json_to_data(config_path)
        
        # Determine work directory (assume config is in the tour directory)
        config_dir = os.path.dirname(os.path.abspath(config_path))
        # Check for index.html in app-files/ or root
        if os.path.exists(os.path.join(config_dir, "app-files", "index.html")) or \
           os.path.exists(os.path.join(config_dir, "index.html")):
            self.work_dir = config_dir
        else:
            print("❌ Error: Could not find tour directory (no index.html found)")
            sys.exit(1)
        
        print("✓ Config loaded")
        
        # Generate final data.js
        print("📝 Generating data.js...")
        data_js_path = os.path.join(self.work_dir, "app-files", "data.js")
        parser.generate_data_js(self.data, data_js_path)
        print("✓ data.js generated")
        
        # Copy player.js
        print("🎮 Installing player.js...")
        player_src = self.manager_dir / "editor" / "player.js"
        player_dst = os.path.join(self.work_dir, "app-files", "player.js")
        import shutil
        shutil.copy(player_src, player_dst)
        print("✓ player.js installed")
        
        # Remove editor files
        print("🧹 Removing editor files...")
        file_ops.remove_editor_files(self.work_dir)
        print("✓ Editor files removed")
        
        # Package ZIP
        if output_zip is None:
            output_zip = "final_tour.zip"
        
        print(f"📦 Packaging {output_zip}...")
        file_ops.create_zip(self.work_dir, output_zip)
        print(f"✓ Tour packaged to {output_zip}")
        
        print("\n✅ Build complete!")


