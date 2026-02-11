#!/bin/bash
# ═══════════════════════════════════════
# TSS Deploy Guard
# SCRIPT_URLの不整合を検出してデプロイ事故を防ぐ
# Usage: ./deploy.sh "commit message"
# ═══════════════════════════════════════

set -e

PROD_URL="AKfycbxB3OJAAuNC3I2dCNsIKenpnwOj4WBRbcR-hsIX_lg_PGkBXQqOIDgbVr3x6IUazcBmfg"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "═══════════════════════════════════"
echo "  TSS Deploy Guard 🛡️"
echo "═══════════════════════════════════"
echo ""

# Check: TSS.html should NOT exist
if [ -f "TSS.html" ]; then
    echo -e "${RED}❌ TSS.html が存在します！${NC}"
    echo "   app/index.html が唯一の正本です。TSS.htmlは削除してください。"
    exit 1
fi
echo -e "${GREEN}✅ TSS.html なし（正常）${NC}"

# Check: app/index.html SCRIPT_URL
if ! grep -q "$PROD_URL" app/index.html; then
    echo -e "${RED}❌ app/index.html のSCRIPT_URLが本番用ではありません！${NC}"
    echo "   開発版のURLが混入している可能性があります。"
    exit 1
fi
echo -e "${GREEN}✅ app/index.html SCRIPT_URL OK${NC}"

# Check: dashboard.html SCRIPT_URL
if [ -f "dashboard.html" ]; then
    if ! grep -q "$PROD_URL" dashboard.html; then
        echo -e "${YELLOW}⚠️  dashboard.html のSCRIPT_URLが本番用と異なります${NC}"
    else
        echo -e "${GREEN}✅ dashboard.html SCRIPT_URL OK${NC}"
    fi
fi

# Check: APP_VERSION consistency
APP_VER=$(grep -o "APP_VERSION = '[^']*'" app/index.html | head -1)
CACHE_VER=$(grep -o "tss-cache-v[^']*" app/sw.js | head -1)
echo -e "${GREEN}✅ ${APP_VER}${NC}"
echo -e "${GREEN}✅ SW: ${CACHE_VER}${NC}"

echo ""
echo "═══════════════════════════════════"
echo -e "${GREEN}  All checks passed! 🎉${NC}"
echo "═══════════════════════════════════"
echo ""

# Deploy
MSG="${1:-update}"
git add -A
git commit -m "$MSG"
git push origin main

echo ""
echo -e "${GREEN}✅ Deployed to GitHub Pages!${NC}"
