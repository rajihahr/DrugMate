#!/bin/bash
# Navigate to the directory containing the script
cd "$(dirname "$0")"

# Activate virtual environment
source env/bin/activate

# Start the Python service
python embedding_service.py