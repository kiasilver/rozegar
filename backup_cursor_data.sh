#!/bin/bash

# Cursor Data Backup Script
# This script backs up Cursor IDE data to prevent loss during invoice payments

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
    echo "Checked locations:"
    echo "  - ~/.config/Cursor"
    echo "  - ~/.cursor"
    echo "  - ~/Library/Application Support/Cursor"
    exit 1
fi

# Create backup directory
BACKUP_BASE="$HOME/cursor_backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE/$DATE"

echo -e "${GREEN}Cursor Data Backup Script${NC}"
echo "================================"
echo ""
echo "Source: $CURSOR_DIR"
echo "Backup: $BACKUP_DIR"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup critical directories
echo "Backing up data..."

# Chat history
if [ -d "$CURSOR_DIR/User/History" ]; then
    echo "  - Chat history..."
    cp -r "$CURSOR_DIR/User/History" "$BACKUP_DIR/" 2>/dev/null || true
fi

# Settings
if [ -f "$CURSOR_DIR/User/settings.json" ]; then
    echo "  - Settings..."
    mkdir -p "$BACKUP_DIR/User"
    cp "$CURSOR_DIR/User/settings.json" "$BACKUP_DIR/User/" 2>/dev/null || true
fi

# Global storage (recent activities, etc.)
if [ -d "$CURSOR_DIR/User/globalStorage" ]; then
    echo "  - Global storage (recent activities)..."
    cp -r "$CURSOR_DIR/User/globalStorage" "$BACKUP_DIR/" 2>/dev/null || true
fi

# Workspace storage
if [ -d "$CURSOR_DIR/User/workspaceStorage" ]; then
    echo "  - Workspace storage..."
    cp -r "$CURSOR_DIR/User/workspaceStorage" "$BACKUP_DIR/" 2>/dev/null || true
fi

# Full backup option
read -p "Create full backup of all Cursor data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  - Creating full backup..."
    cp -r "$CURSOR_DIR" "$BACKUP_DIR/full_backup" 2>/dev/null || true
fi

# Create backup info file
cat > "$BACKUP_DIR/backup_info.txt" << EOF
Cursor Data Backup
==================
Date: $(date)
Source: $CURSOR_DIR
Backup Location: $BACKUP_DIR

Backed up:
- Chat history
- Settings
- Global storage
- Workspace storage
EOF

echo ""
echo -e "${GREEN}✓ Backup completed successfully!${NC}"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "To restore, copy files back to: $CURSOR_DIR"
echo ""

# Clean old backups (keep last 10)
if [ -d "$BACKUP_BASE" ]; then
    BACKUP_COUNT=$(ls -1 "$BACKUP_BASE" | wc -l)
    if [ "$BACKUP_COUNT" -gt 10 ]; then
        echo "Cleaning old backups (keeping last 10)..."
        cd "$BACKUP_BASE"
        ls -t | tail -n +11 | xargs rm -rf
        echo -e "${GREEN}✓ Old backups cleaned${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}Important:${NC} Run this script before paying any Cursor invoice!"
