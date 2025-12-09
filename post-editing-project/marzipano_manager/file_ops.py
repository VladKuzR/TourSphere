"""
File operations for tour management.
Handles ZIP extraction, file copying, and packaging.
"""

import os
import shutil
import zipfile


def extract_zip(zip_path, output_dir):
    """
    Extract ZIP archive to output directory.
    
    Args:
        zip_path: Path to ZIP file
        output_dir: Directory to extract to
    """
    if not os.path.exists(zip_path):
        raise FileNotFoundError(f"ZIP file not found: {zip_path}")
    
    os.makedirs(output_dir, exist_ok=True)
    
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(output_dir)


def copy_editor_files(editor_dir, target_dir):
    """
    Copy editor files to tour directory.
    
    Args:
        editor_dir: Source directory with editor files
        target_dir: Target directory (typically app-files)
    """
    files_to_copy = ['editor.js', 'editor.css']
    
    for filename in files_to_copy:
        src = os.path.join(editor_dir, filename)
        dst = os.path.join(target_dir, filename)
        
        if os.path.exists(src):
            shutil.copy(src, dst)
        else:
            raise FileNotFoundError(f"Editor file not found: {src}")


def remove_editor_files(tour_dir):
    """
    Remove editor files from tour directory.
    
    Args:
        tour_dir: Tour directory path
    """
    app_files_dir = os.path.join(tour_dir, "app-files")
    
    files_to_remove = [
        os.path.join(app_files_dir, "editor.js"),
        os.path.join(app_files_dir, "editor.css"),
        os.path.join(app_files_dir, "tour_data.json")
    ]
    
    for file_path in files_to_remove:
        if os.path.exists(file_path):
            os.remove(file_path)


def create_zip(source_dir, output_zip):
    """
    Create ZIP archive of directory.
    
    Args:
        source_dir: Directory to archive
        output_zip: Output ZIP filename
    """
    output_path = os.path.abspath(output_zip)
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)


