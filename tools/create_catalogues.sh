#!/bin/bash

# Define API details
HOST="localhost"
PORT="8082"
API_KEY="yourRepoApiKey"
URL="http://$HOST:$PORT/catalogues"
CATALOG_PATH="./catalogs"

# Get existing catalogs from API
response=$(curl -s -H "X-API-Key: $API_KEY" -H "Content-Type: text/turtle" "$URL")

# Extract catalog names
created_catalogs=($(echo "$response" | jq -r '.[] | split("/")[-1]'))

# Get list of catalog files (without extensions)
files=()
for file in "$CATALOG_PATH"/*.ttl; do
    [[ -f "$file" ]] && files+=("$(basename "$file" .ttl)")
done

# Determine which catalogs need to be created
to_create_catalogs=()
for fp in "${files[@]}"; do
    if [[ ! " ${created_catalogs[*]} " =~ " $fp " ]]; then
        to_create_catalogs+=("$fp")
    fi
done

# Create new catalogs

for fp in "${to_create_catalogs[@]}"; do
    file_path="$CATALOG_PATH/$fp.ttl"

    # Upload the file
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: text/turtle" --data-binary "@$file_path" "$URL")

    # Check response status
    if [[ $response -ge 200 && $response -lt 300 ]]; then
        echo "Created new catalog: $fp"
    else
        echo "Failed to create catalog: $fp"
    fi

    sleep 0.1
done
