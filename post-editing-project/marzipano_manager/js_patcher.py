"""
Patches Marzipano's index.js to expose viewer and scenes globally.
"""

import os


def patch_index_js(work_dir):
    """
    Patch index.js to expose viewer and scenes as global variables.
    
    Args:
        work_dir: Tour working directory
    """
    index_js_path = os.path.join(work_dir, "app-files", "index.js")
    
    if not os.path.exists(index_js_path):
        print(f"⚠️  Warning: index.js not found at {index_js_path}")
        return False
    
    with open(index_js_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # Expose viewer globally
    if 'window.viewer = viewer;' not in content:
        # Find "var viewer = new Marzipano.Viewer" and make it global
        if 'var viewer = new Marzipano.Viewer(' in content:
            content = content.replace(
                'var viewer = new Marzipano.Viewer(',
                'var viewer = window.viewer = new Marzipano.Viewer('
            )
            modified = True
            print("  ✓ Exposed viewer globally")
    
    # Expose scenes globally
    if 'window.scenes = scenes;' not in content:
        # Find "var scenes = data.scenes.map" and make it global
        if 'var scenes = data.scenes.map(' in content:
            content = content.replace(
                'var scenes = data.scenes.map(',
                'var scenes = window.scenes = data.scenes.map('
            )
            modified = True
            print("  ✓ Exposed scenes globally")
    
    # Add initialization complete flag
    if 'window.marzipanoReady = true;' not in content:
        # Add at the end of the file, before any closing braces
        # Find the switchScene call for the first scene (typical initialization complete point)
        if 'switchScene(scenes[0]);' in content:
            content = content.replace(
                'switchScene(scenes[0]);',
                'switchScene(scenes[0]);\n  window.marzipanoReady = true;\n  console.log("Marzipano initialization complete, viewer and scenes exposed globally");'
            )
            modified = True
            print("  ✓ Added initialization complete flag")
    
    if modified:
        with open(index_js_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    else:
        print("  ℹ️  index.js already patched")
        return False


def patch_for_transitions(work_dir):
    """
    Patch index.js to use seamless transitions instead of direct scene switching.
    
    Args:
        work_dir: Tour working directory
    """
    index_js_path = os.path.join(work_dir, "app-files", "index.js")
    
    if not os.path.exists(index_js_path):
        print(f"⚠️  Warning: index.js not found at {index_js_path}")
        return False
    
    with open(index_js_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # Track current scene for conditional views
    if 'window.setCurrentScene' not in content and 'function switchScene(scene)' in content:
        # Add tracking at the beginning of switchScene
        content = content.replace(
            'function switchScene(scene) {',
            '''function switchScene(scene) {
    // Track current scene for conditional views
    if (window.setCurrentScene) {
      window.setCurrentScene(scene.data.id);
    }
'''
        )
        modified = True
        print("  ✓ Added scene tracking")
    
    # Replace hotspot click handler with seamless transition
    if 'performSeamlessTransition' not in content:
        # Find the link hotspot click handler
        # Original: wrapper.addEventListener('click', function() { switchScene(findSceneById(hotspot.target)); });
        old_handler = '''wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });'''
        
        new_handler = '''wrapper.addEventListener('click', function() {
      console.log('🔘 Hotspot clicked! Target:', hotspot.target);
      
      var targetScene = findSceneById(hotspot.target);
      var currentScene = null;
      
      // Find current scene - use viewer's current scene
      for (var i = 0; i < scenes.length; i++) {
        try {
          if (scenes[i].scene === viewer.scene()) {
            currentScene = scenes[i];
            break;
          }
        } catch(e) {
          // Try alternative method
          if (scenes[i].scene._hotspotContainer && viewer.stage()._hotspotContainer &&
              scenes[i].scene._hotspotContainer === viewer.stage()._hotspotContainer) {
            currentScene = scenes[i];
            break;
          }
        }
      }
      
      console.log('🎯 Current scene found:', currentScene ? currentScene.data.id : 'NONE');
      console.log('🎯 Target scene:', targetScene ? targetScene.data.id : 'NONE');
      
      // Use seamless transition if available, otherwise fallback to direct switch
      if (window.performSeamlessTransition && currentScene && targetScene) {
        console.log('✅ Calling performSeamlessTransition');
        window.performSeamlessTransition(currentScene, targetScene, hotspot);
      } else {
        console.log('⚠️ Falling back to direct switchScene');
        switchScene(targetScene);
      }
    });'''
        
        if old_handler in content:
            content = content.replace(old_handler, new_handler)
            modified = True
            print("  ✓ Replaced hotspot handler with seamless transitions")
    
    if modified:
        with open(index_js_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    else:
        print("  ℹ️  Transition hooks already installed")
        return False


