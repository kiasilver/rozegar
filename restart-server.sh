#!/bin/bash

# اسکریپت restart کردن سرور Next.js
# این اسکریپت سرور را متوقف کرده و دوباره راه‌اندازی می‌کند

set -e

# رنگ‌ها برای خروجی
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 در حال restart کردن سرور...${NC}"

# تغییر به دایرکتوری پروژه
cd /root/www

# بررسی اینکه آیا next-server در حال اجرا است
NEXT_PID=$(ps aux | grep "next-server" | grep -v grep | awk '{print $2}' | head -1)

if [ ! -z "$NEXT_PID" ]; then
    echo -e "${YELLOW}⏹️  متوقف کردن next-server (PID: $NEXT_PID)...${NC}"
    kill -TERM $NEXT_PID 2>/dev/null || true
    
    # صبر کردن تا پروسه متوقف شود
    sleep 3
    
    # اگر هنوز در حال اجرا است، force kill
    if ps -p $NEXT_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Force killing next-server...${NC}"
        kill -9 $NEXT_PID 2>/dev/null || true
        sleep 2
    fi
    
    echo -e "${GREEN}✅ next-server متوقف شد${NC}"
else
    echo -e "${YELLOW}ℹ️  next-server در حال اجرا نیست${NC}"
fi

# بررسی اینکه آیا npm run dev در حال اجرا است
DEV_PID=$(ps aux | grep "npm run dev\|next dev" | grep -v grep | awk '{print $2}' | head -1)

if [ ! -z "$DEV_PID" ]; then
    echo -e "${YELLOW}⏹️  متوقف کردن npm run dev (PID: $DEV_PID)...${NC}"
    kill -TERM $DEV_PID 2>/dev/null || true
    sleep 2
    
    if ps -p $DEV_PID > /dev/null 2>&1; then
        kill -9 $DEV_PID 2>/dev/null || true
        sleep 1
    fi
    
    echo -e "${GREEN}✅ npm run dev متوقف شد${NC}"
fi

# بررسی Docker
if command -v docker &> /dev/null; then
    if docker ps | grep -q "web\|next\|rouze"; then
        echo -e "${YELLOW}🐳 Restart کردن Docker containers...${NC}"
        docker-compose restart web 2>/dev/null || docker restart $(docker ps -q --filter "name=web") 2>/dev/null || true
        echo -e "${GREEN}✅ Docker containers restart شدند${NC}"
    fi
fi

# بررسی PM2
if command -v pm2 &> /dev/null; then
    PM2_APPS=$(pm2 list | grep -v "No process" | wc -l)
    if [ "$PM2_APPS" -gt 1 ]; then
        echo -e "${YELLOW}🔄 Restart کردن PM2 processes...${NC}"
        pm2 restart all 2>/dev/null || true
        echo -e "${GREEN}✅ PM2 processes restart شدند${NC}"
    fi
fi

# بررسی systemd
if systemctl is-active --quiet rouzeeghtesad 2>/dev/null; then
    echo -e "${YELLOW}🔄 Restart کردن systemd service...${NC}"
    systemctl restart rouzeeghtesad 2>/dev/null || true
    echo -e "${GREEN}✅ systemd service restart شد${NC}"
elif systemctl is-active --quiet nextjs 2>/dev/null; then
    echo -e "${YELLOW}🔄 Restart کردن systemd service...${NC}"
    systemctl restart nextjs 2>/dev/null || true
    echo -e "${GREEN}✅ systemd service restart شد${NC}"
fi

# راه‌اندازی مجدد
echo -e "${YELLOW}🚀 راه‌اندازی مجدد سرور...${NC}"

# بررسی اینکه آیا build شده است
if [ -d ".next" ]; then
    echo -e "${GREEN}✅ Build موجود است، راه‌اندازی در حالت production...${NC}"
    
    # راه‌اندازی در background
    nohup npm start > /tmp/nextjs-start.log 2>&1 &
    START_PID=$!
    
    echo -e "${GREEN}✅ سرور در حال راه‌اندازی است (PID: $START_PID)${NC}"
    echo -e "${YELLOW}📋 لاگ‌ها در /tmp/nextjs-start.log${NC}"
    
    # صبر کردن تا سرور راه‌اندازی شود
    sleep 5
    
    # بررسی اینکه آیا سرور راه‌اندازی شده است
    if ps -p $START_PID > /dev/null 2>&1; then
        echo -e "${GREEN}✅ سرور با موفقیت راه‌اندازی شد!${NC}"
    else
        echo -e "${RED}❌ خطا در راه‌اندازی سرور. لطفاً لاگ‌ها را بررسی کنید:${NC}"
        echo -e "${YELLOW}   tail -f /tmp/nextjs-start.log${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Build موجود نیست. در حال build کردن...${NC}"
    npm run build
    
    echo -e "${GREEN}✅ Build کامل شد. راه‌اندازی سرور...${NC}"
    nohup npm start > /tmp/nextjs-start.log 2>&1 &
    START_PID=$!
    
    echo -e "${GREEN}✅ سرور در حال راه‌اندازی است (PID: $START_PID)${NC}"
    echo -e "${YELLOW}📋 لاگ‌ها در /tmp/nextjs-start.log${NC}"
fi

echo -e "${GREEN}✨ Restart کامل شد!${NC}"
echo -e "${YELLOW}💡 برای مشاهده لاگ‌ها: tail -f /tmp/nextjs-start.log${NC}"

