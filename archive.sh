#!/bin/bash

# Create timestamp for unique archive name
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="RansomNote_${TIMESTAMP}.zip"
TEMP_DIR="temp_archive_$$"

echo "Creating temporary directory: ${TEMP_DIR}"
mkdir -p "${TEMP_DIR}"

echo "Copying files (excluding node_modules)..."
rsync -av --progress \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude="${TEMP_DIR}" \
  --exclude='*.zip' \
  ./ "${TEMP_DIR}/"

echo "Creating archive: ${ARCHIVE_NAME}"
cd "${TEMP_DIR}" && zip -r "../${ARCHIVE_NAME}" . && cd ..

echo "Cleaning up temporary directory..."
rm -rf "${TEMP_DIR}"

echo "✓ Archive created: ${ARCHIVE_NAME}"
echo "Size: $(du -h "${ARCHIVE_NAME}" | cut -f1)"
