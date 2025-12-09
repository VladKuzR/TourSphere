"""
Generates view configuration with auto-180 logic for seamless transitions.
"""

import json
import math


def normalize_angle(angle):
    """Normalize angle to [-π, π] range"""
    while angle > math.pi:
        angle -= 2 * math.pi
    while angle < -math.pi:
        angle += 2 * math.pi
    return angle


def generate_view_config(tour_data):
    """
    Generate view configuration with auto-180 logic.
    
    For each link from Scene A to Scene B:
    - Scene B's entry view when coming from A should be ~180° from the hotspot direction
    - This creates the illusion of "walking through" the doorway
    
    Returns a dict structure:
    {
      "scene-id": {
        "Init_parameters": {yaw, pitch, fov},
        "ifCameFrom": {
          "source-scene-id": {yaw, pitch, fov},
          ...
        }
      }
    }
    """
    view_config = {}
    
    # Initialize with default parameters (force horizontal pitch)
    for scene in tour_data['scenes']:
        scene_id = scene['id']
        init_params = scene['initialViewParameters']
        
        view_config[scene_id] = {
            'Init_parameters': {
                'yaw': init_params.get('yaw', 0),
                'pitch': 0,  # Always horizontal
                'fov': init_params.get('fov', 1.3365071038314758)
            },
            'ifCameFrom': {}
        }
    
    # Build the conditional views based on hotspot links
    for source_scene in tour_data['scenes']:
        source_id = source_scene['id']
        
        for hotspot in source_scene.get('linkHotspots', []):
            target_id = hotspot['target']
            
            # CORRECT LOGIC: 
            # Find the RETURN hotspot in the target scene that points back to source
            # Entry angle should be 180° from that return hotspot
            return_hotspot_yaw = None
            
            # Find target scene
            target_scene = next((s for s in tour_data['scenes'] if s['id'] == target_id), None)
            if target_scene:
                # Look for hotspot in target that points back to source
                for return_hs in target_scene.get('linkHotspots', []):
                    if return_hs['target'] == source_id:
                        return_hotspot_yaw = return_hs['yaw']
                        break
            
            # Calculate entry angle
            if return_hotspot_yaw is not None:
                # Face 180° away from the return hotspot (look through the doorway)
                entry_yaw = normalize_angle(return_hotspot_yaw + math.pi)
            else:
                # Fallback: use the clicked hotspot + 180 (old logic)
                entry_yaw = normalize_angle(hotspot['yaw'] + math.pi)
            
            # Always horizontal view (pitch = 0)
            entry_pitch = 0
            
            # Use default FOV from target scene
            entry_fov = view_config[target_id]['Init_parameters']['fov']
            
            # Store the conditional view
            if target_id in view_config:
                view_config[target_id]['ifCameFrom'][source_id] = {
                    'yaw': entry_yaw,
                    'pitch': entry_pitch,
                    'fov': entry_fov
                }
    
    return view_config


def save_view_config(view_config, output_path):
    """Save view config to JSON file"""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(view_config, f, indent=2, ensure_ascii=False)
    print(f"✅ View config saved to: {output_path}")


def generate_from_data_js(data_js_path, output_path):
    """Generate view config from data.js file"""
    # Read and parse data.js
    with open(data_js_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract JSON from "var APP_DATA = {...};"
    start = content.find('{')
    end = content.rfind('}') + 1
    json_str = content[start:end]
    
    tour_data = json.loads(json_str)
    view_config = generate_view_config(tour_data)
    save_view_config(view_config, output_path)
    
    return view_config


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python view_config_generator.py <data.js> <output.json>")
        sys.exit(1)
    
    data_js_path = sys.argv[1]
    output_path = sys.argv[2]
    
    generate_from_data_js(data_js_path, output_path)

