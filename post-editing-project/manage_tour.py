#!/usr/bin/env python3
"""
Marzipano Tour Manager
Command-line interface for managing Marzipano tours.
"""

import argparse
import sys
import os
from pathlib import Path

# Add current directory to Python path so we can import marzipano_manager
# This allows running from both inside and outside the post-editing-project directory
script_dir = Path(__file__).parent.absolute()
if str(script_dir) not in sys.path:
    sys.path.insert(0, str(script_dir))

from marzipano_manager import TourManager


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Marzipano Tour Manager - Initialize and build enhanced tours'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Init command
    init_parser = subparsers.add_parser('init', help='Initialize tour from ZIP')
    init_parser.add_argument('zip_file', help='Path to Marzipano Tool ZIP export')
    init_parser.add_argument('-o', '--output', help='Output directory name')
    
    # Build command
    build_parser = subparsers.add_parser('build', help='Build final tour from config')
    build_parser.add_argument('config', help='Path to config.json from editor')
    build_parser.add_argument('-o', '--output', help='Output ZIP filename', default='final_tour.zip')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    manager = TourManager()
    
    if args.command == 'init':
        manager.init(args.zip_file, args.output)
    elif args.command == 'build':
        manager.build(args.config, args.output)


if __name__ == '__main__':
    main()

