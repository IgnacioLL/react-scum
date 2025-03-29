#!/bin/bash

# Check if a directory is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <directory_path> [output_file]"
    exit 1
fi

# Set the input directory
INPUT_DIR="$1"

# Set the output file (default if not provided)
OUTPUT_FILE="${2:-accumulated_files.txt}"

# Check if the input directory exists
if [ ! -d "$INPUT_DIR" ]; then
    echo "Error: Directory $INPUT_DIR does not exist."
    exit 1
fi

# Clear the output file if it already exists
> "$OUTPUT_FILE"

# Find and process all files in the directory (including subdirectories)
find "$INPUT_DIR" -type f | while read -r file; do
    # Add a separator and the file path
    echo "FILE PATH: $file" >> "$OUTPUT_FILE"
    echo "----------------------------" >> "$OUTPUT_FILE"
    
    # Add the contents of the file
    cat "$file" >> "$OUTPUT_FILE"
    
    # Add an extra newline to separate files
    echo -e "\n\n" >> "$OUTPUT_FILE"
done

echo "All files have been accumulated in $OUTPUT_FILE"
