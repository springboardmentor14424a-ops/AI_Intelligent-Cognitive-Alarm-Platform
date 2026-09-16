"""
API Package initialization.
Ensures api directory and repo root are in sys.path whenever any api.* module is imported.
"""
import os
import sys

_API_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR = os.path.dirname(_API_DIR)

for _p in (_API_DIR, _ROOT_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)
