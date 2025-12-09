"""
Auto-180 logic calculator for scene transitions.
Calculates optimal entry angles for seamless transitions.
"""

import math


def calculate_entry_angles(data):
    """
    Calculate entry headings for scenes based on incoming links.
    If Scene A has a link to Scene B at angle X, Scene B should start at X + 180°.
    
    Args:
        data: Tour data dictionary (modified in place)
    """
    # Build a map of target scene -> incoming link angles
    entry_angles = {}
    
    for scene in data['scenes']:
        scene_id = scene['id']
        
        for hotspot in scene.get('linkHotspots', []):
            target = hotspot.get('target')
            if target:
                yaw = hotspot.get('yaw', 0)
                
                # Calculate opposite angle (add 180° or π radians)
                entry_yaw = yaw + math.pi
                
                # Normalize to [-π, π]
                while entry_yaw > math.pi:
                    entry_yaw -= 2 * math.pi
                while entry_yaw < -math.pi:
                    entry_yaw += 2 * math.pi
                
                # Store this as the entry angle for the target scene
                if target not in entry_angles:
                    entry_angles[target] = []
                entry_angles[target].append({
                    'from': scene_id,
                    'yaw': entry_yaw
                })
    
    # Add entry angles to scene data
    for scene in data['scenes']:
        scene_id = scene['id']
        if scene_id in entry_angles:
            if 'entryAngles' not in scene:
                scene['entryAngles'] = {}
            for entry in entry_angles[scene_id]:
                scene['entryAngles'][entry['from']] = entry['yaw']
    
    return data


