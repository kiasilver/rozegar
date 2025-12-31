#!/bin/bash

# Cursor Data Restore Script
# Restores Cursor IDE data from backup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine Cursor data directory
CURSOR_DIR=""
if [ -d "$HOME/.config/Cursor" ]; then
    CURSOR_DIR="$HOME/.config/Cursor"
elif [ -d "$HOME/.cursor" ]; then
    CURSOR_DIR="$HOME/.cursor"
elif [ -d "$HOME/Library/Application Support/Cursor" ]; then
    CURSOR_DIR="$HOME/Library/Application Support/Cursor"
else
    echo -e "${RED}Error: Cursor data directory not found!${NC}"
    exit 1
fi

BACKUP_BASE="$HOME/cursor_backups"

if [ ! -d "$BACKUP_BASE" ]; then
    echo -e "${RED}Error: No backups found at $BACKUP_BASE${NC}"
    exit 1
fi

echo -e "${GREEN}Cursor Data Restore Script${NC}"
echo "================================"
echo ""
echo "Available backups:"
echo ""

# List available backups
BACKUPS=($(ls -t "$BACKUP_BASE" 2>/dev/null))
for i in "${!BACKUPS[@]}"; do
    BACKUP_DATE=$(echo "${BACKUPS[$i]}" | sed 's/_/ /g' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3/' | sed 's/\([0-9]\{2\}\)\([0-9]\{2\}\)/\1:\2/')
    echo "  [$i] ${BACKUPS[$i]} ($BACKUP_DATE)"
done

echo ""
read -p "Select backup number to restore (or 'q' to quit): " SELECTION

if [ "$SELECTION" = "q" ] || [ -z "$SELECTION" ]; then
    echo "Restore cancelled."
    exit 0
fi

if [ "$SELECTION" -ge "${#BACKUPS[@]}" ] || [ "$SELECTION" -lt 0 ]; then
    echo -e "${RED}Invalid selection!${NC}"
    exit 1
fi

SELECTED_BACKUP="${BACKUPS[$SELECTION]}"
BACKUP_DIR="$BACKUP_BASE/$SELECTED_BACKUP"

echo ""
echo -e "${YELLOW}Warning: This will overwrite existing Cursor data!${NC}"
read -p "Are you sure you want to restore from $SELECTED_BACKUP? (y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Restoring data..."

# Restore chat history
if [ -d "$BACKUP_DIR/History" ]; then
    echo "  - Restoring chat history..."
    mkdir -p "$CURSOR_DIR/User/History"
    cp -r "$BACKUP_DIR/History"/* "$CURSOR_DIR/User/History/" 2>/dev/null || true
fi

# Restore settings
if [ -f "$BACKUP_DIR/User/settings.json" ]; then
    echo "  - Restoring settings..."
    mkdir -p "$CURSOR_DIR/User"
    cp "$BACKUP_DIR/User/settings.json" "$CURSOR_DIR/User/" 2>/dev/null || true
fi

# Restore global storage
if [ -d "$BACKUP_DIR/globalStorage" ]; then
    echo "  - Restoring global storage..."
    mkdir -p "$CURSOR_DIR/User/globalStorage"
    cp -r "$BACKUP_DIR/globalStorage"/* "$CURSOR_DIR/User/globalStorage/" 2>/dev/null || true
fi

# Restore workspace storage
if [ -d "$BACKUP_DIR/workspaceStorage" ]; then
    echo "  - Restoring workspace storage..."
    mkdir -p "$CURSOR_DIR/User/workspaceStorage"
    cp -r "$BACKUP_DIR/workspaceStorage"/* "$CURSOR_DIR/User/workspaceStorage/" 2>/dev/null || true
fi

# Full restore option
if [ -d "$BACKUP_DIR/full_backup" ]; then
    read -p "Restore full backup? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "  - Restoring full backup..."
        cp -r "$BACKUP_DIR/full_backup"/* "$CURSOR_DIR/" 2>/dev/null || true
    fi
fi

echo ""
echo -e "${GREEN}✓ Restore completed!${NC}"
echo ""
echo -e "${YELLOW}Please restart Cursor IDE for changes to take effect.${NC}"
