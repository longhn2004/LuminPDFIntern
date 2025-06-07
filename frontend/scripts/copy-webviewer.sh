#!/bin/bash

# Copy WebViewer files from node_modules to public directory
# This script provides an alternative to the Node.js script for Unix-based systems

SOURCE_DIR="./node_modules/@pdftron/webviewer/public"
DEST_DIR="./public/webviewer"

echo "🔄 Copying WebViewer files..."
echo "📂 Source: $SOURCE_DIR"
echo "📁 Destination: $DEST_DIR"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: WebViewer node_modules not found at: $SOURCE_DIR"
    echo "💡 Make sure @pdftron/webviewer is installed"
    exit 1
fi

# Remove existing destination directory if it exists
if [ -d "$DEST_DIR" ]; then
    echo "🗑️  Removing existing WebViewer files..."
    rm -rf "$DEST_DIR"
fi

# Copy files
echo "📋 Copying files..."
cp -r "$SOURCE_DIR" "$DEST_DIR"

if [ $? -eq 0 ]; then
    echo "✅ WebViewer files copied successfully!"
    echo "📋 Copied directories: $(ls $DEST_DIR | tr '\n' ' ')"
else
    echo "❌ Error copying WebViewer files"
    exit 1
fi 