#!/bin/bash

# Cursor Data Loss Investigation Script
# Helps identify potential causes of data loss

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Cursor Data Loss Investigation${NC}"
echo "===================================="
echo ""

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

echo "Cursor Data Directory: $CURSOR_DIR"
echo ""

# Check if directories exist
echo -e "${GREEN}Checking data directories...${NC}"
echo ""

check_dir() {
    local dir="$1"
    local name="$2"
    if [ -d "$dir" ]; then
        local count=$(find "$dir" -type f 2>/dev/null | wc -l)
        echo -e "  ✓ $name: ${GREEN}EXISTS${NC} ($count files)"
        return 0
    else
        echo -e "  ✗ $name: ${RED}MISSING${NC}"
        return 1
    fi
}

check_file() {
    local file="$1"
    local name="$2"
    if [ -f "$file" ]; then
        local size=$(du -h "$file" | cut -f1)
        echo -e "  ✓ $name: ${GREEN}EXISTS${NC} ($size)"
        return 0
    else
        echo -e "  ✗ $name: ${RED}MISSING${NC}"
        return 1
    fi
}

# Check critical paths
check_dir "$CURSOR_DIR/User/History" "Chat History"
check_dir "$CURSOR_DIR/User/globalStorage" "Global Storage"
check_dir "$CURSOR_DIR/User/workspaceStorage" "Workspace Storage"
check_file "$CURSOR_DIR/User/settings.json" "Settings"

echo ""
echo -e "${GREEN}Checking for logs...${NC}"
echo ""

# Find and check logs
LOG_FILES=$(find "$CURSOR_DIR" -name "*.log" -type f 2>/dev/null | head -5)
if [ -n "$LOG_FILES" ]; then
    echo "Found log files:"
    echo "$LOG_FILES" | while read -r log; do
        echo "  - $log ($(du -h "$log" | cut -f1))"
    done
    
    echo ""
    echo -e "${YELLOW}Searching for payment/subscription related errors...${NC}"
    echo ""
    
    PAYMENT_ERRORS=$(grep -i "payment\|invoice\|subscription\|reset\|clear\|delete\|remove" "$CURSOR_DIR" -r --include="*.log" 2>/dev/null | head -10)
    if [ -n "$PAYMENT_ERRORS" ]; then
        echo -e "${RED}Found potential issues:${NC}"
        echo "$PAYMENT_ERRORS"
    else
        echo -e "${GREEN}No payment-related errors found in logs${NC}"
    fi
else
    echo -e "${YELLOW}No log files found${NC}"
fi

echo ""
echo -e "${GREEN}Checking disk space...${NC}"
echo ""

DISK_USAGE=$(df -h "$CURSOR_DIR" | tail -1 | awk '{print $5}')
echo "  Disk usage: $DISK_USAGE"

echo ""
echo -e "${GREEN}Checking file permissions...${NC}"
echo ""

if [ -d "$CURSOR_DIR/User" ]; then
    PERMS=$(stat -c "%a" "$CURSOR_DIR/User" 2>/dev/null || stat -f "%OLp" "$CURSOR_DIR/User" 2>/dev/null)
    echo "  User directory permissions: $PERMS"
fi

echo ""
echo -e "${GREEN}Checking for backup files...${NC}"
echo ""

BACKUP_BASE="$HOME/cursor_backups"
if [ -d "$BACKUP_BASE" ]; then
    BACKUP_COUNT=$(ls -1 "$BACKUP_BASE" 2>/dev/null | wc -l)
    echo -e "  ✓ Found $BACKUP_COUNT backup(s) at $BACKUP_BASE"
    echo ""
    echo "Recent backups:"
    ls -lt "$BACKUP_BASE" 2>/dev/null | head -5 | tail -n +2 | awk '{print "  - " $9 " (" $6 " " $7 " " $8 ")"}'
else
    echo -e "  ${YELLOW}⚠ No backups found. Consider running backup_cursor_data.sh${NC}"
fi

echo ""
echo -e "${GREEN}Recommendations:${NC}"
echo ""
echo "1. Enable Settings Sync in Cursor (Settings → Sync)"
echo "2. Run backup_cursor_data.sh before paying invoices"
echo "3. Check Cursor version and update if needed"
echo "4. Contact Cursor support if issue persists"
echo ""
