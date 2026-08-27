#!/bin/bash

# In các cron entry an toàn; script không tự ý sửa crontab.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENTRY_1="45 18 * * * cd $SCRIPT_DIR && npm run daily:sync && npm run daily:update >> logs/daily-update.log 2>&1"
ENTRY_2="5 19 * * * cd $SCRIPT_DIR && npm run daily:sync && npm run daily:update >> logs/daily-update.log 2>&1"

mkdir -p "$SCRIPT_DIR/logs"

echo "CRON SETUP FOR VERIFIED DAILY RESEARCH PIPELINE"
echo ""
echo "18:45: đồng bộ hai nguồn, đối chiếu snapshot, tạo snapshot ngày kế"
echo "19:05: chạy lại idempotent nếu nguồn công bố chậm"
echo ""
echo "CRON_TZ=Asia/Ho_Chi_Minh"
echo "$ENTRY_1"
echo "$ENTRY_2"
echo ""
echo "Cài thủ công nếu muốn dùng cron của máy:"
echo "  (crontab -l 2>/dev/null; echo 'CRON_TZ=Asia/Ho_Chi_Minh'; echo '$ENTRY_1'; echo '$ENTRY_2') | crontab -"
echo ""
echo "Kiểm tra thủ công:"
echo "  npm run daily:sync && npm run daily:update"
