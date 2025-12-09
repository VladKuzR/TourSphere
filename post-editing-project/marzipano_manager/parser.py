"""
Data parser for Marzipano data.js files.
Handles conversion between JavaScript and Python data structures.
"""

import json
import re


def parse_data_js(file_path):
    """
    Parse data.js file and extract the APP_DATA object.
    
    Args:
        file_path: Path to data.js file
        
    Returns:
        dict: Parsed data structure
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract the JavaScript object
    # Looking for: var APP_DATA = { ... };
    match = re.search(r'var\s+APP_DATA\s*=\s*({.*?});', content, re.DOTALL)
    if not match:
        raise ValueError("Could not find APP_DATA in data.js")
    
    js_object = match.group(1)
    
    # Convert JavaScript to JSON (basic conversion)
    # Handle trailing commas and single quotes
    json_str = js_object
    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)  # Remove trailing commas
    json_str = json_str.replace("'", '"')  # Replace single quotes
    
    try:
        data = json.loads(json_str)
        return data
    except json.JSONDecodeError as e:
        raise ValueError(f"Error parsing data.js: {e}")


def generate_data_js(data, output_path):
    """
    Generate clean data.js from Python dictionary.
    
    Args:
        data: Python dictionary with tour data
        output_path: Where to write data.js
    """
    js_content = "var APP_DATA = " + json.dumps(data, indent=2) + ";"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)


def data_to_json(data, output_path):
    """
    Save data as JSON file.
    
    Args:
        data: Python dictionary with tour data
        output_path: Where to write JSON file
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)


def json_to_data(json_path):
    """
    Load data from JSON file.
    
    Args:
        json_path: Path to JSON file
        
    Returns:
        dict: Loaded data
    """
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


