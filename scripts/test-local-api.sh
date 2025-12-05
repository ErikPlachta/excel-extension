#!/bin/bash
# Test local API server connectivity
# Usage: ./scripts/test-local-api.sh

set -e

API_URL="${API_URL:-http://127.0.0.1:8000}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Testing local API server at: $API_URL"
echo "=========================================="

# Test health endpoint
echo -n "Health check... "
if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}FAILED${NC}"
  echo -e "${YELLOW}Ensure backend is running: cd backend && uvicorn main:app --reload${NC}"
  exit 1
fi

# Test catalog endpoint
echo -n "Catalog endpoint... "
CATALOG_RESPONSE=$(curl -s "$API_URL/api/catalog" 2>/dev/null || echo "FAILED")
if [[ "$CATALOG_RESPONSE" != "FAILED" ]] && echo "$CATALOG_RESPONSE" | grep -q "operations"; then
  echo -e "${GREEN}OK${NC}"
  echo "  Operations found: $(echo "$CATALOG_RESPONSE" | grep -o '"name"' | wc -l | tr -d ' ')"
else
  echo -e "${YELLOW}SKIPPED${NC} (endpoint may not exist yet)"
fi

# Test auth endpoints (expect 401 without token)
echo -n "Auth endpoint (expect 401)... "
AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth/profile" 2>/dev/null || echo "000")
if [[ "$AUTH_CODE" == "401" || "$AUTH_CODE" == "403" ]]; then
  echo -e "${GREEN}OK${NC} (got $AUTH_CODE as expected)"
elif [[ "$AUTH_CODE" == "000" ]]; then
  echo -e "${YELLOW}SKIPPED${NC} (connection failed)"
else
  echo -e "${YELLOW}Unexpected: $AUTH_CODE${NC}"
fi

# Test operations endpoint (expect 401 without token)
echo -n "Operations endpoint (expect 401)... "
OPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/operations/test" -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
if [[ "$OPS_CODE" == "401" || "$OPS_CODE" == "403" || "$OPS_CODE" == "404" ]]; then
  echo -e "${GREEN}OK${NC} (got $OPS_CODE as expected)"
elif [[ "$OPS_CODE" == "000" ]]; then
  echo -e "${YELLOW}SKIPPED${NC} (connection failed)"
else
  echo -e "${YELLOW}Unexpected: $OPS_CODE${NC}"
fi

echo "=========================================="
echo -e "${GREEN}API server is reachable!${NC}"
echo ""
echo "To start development:"
echo "  npm start          # Uses proxy to forward to $API_URL"
echo "  npm run start:mock # Uses mock services (no backend needed)"
