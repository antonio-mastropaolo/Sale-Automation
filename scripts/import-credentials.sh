#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ListBlitz — Import Platform Credentials from macOS Keychain
# ═══════════════════════════════════════════════════════════════
#
# This script reads your saved passwords from macOS Keychain
# and imports them directly into ListBlitz (encrypted with AES-256).
#
# Usage:  ./scripts/import-credentials.sh
#
# Your Mac will prompt you to authorize each password access.
# Nothing is saved to disk — credentials go straight to the API.
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

API_URL="${LISTBLITZ_URL:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}⚡ ListBlitz — Keychain Credential Import${NC}"
echo -e "   Reads passwords from macOS Keychain → encrypts → stores in ListBlitz"
echo -e "   ${YELLOW}Your Mac will ask you to authorize each password access.${NC}"
echo ""

# ── Step 1: Get session token ──
echo -e "${CYAN}Logging into ListBlitz...${NC}"
read -p "  Email: " LB_EMAIL
read -sp "  Password: " LB_PASS
echo ""

SESSION=$(curl -s -D - -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${LB_EMAIL}\",\"password\":\"${LB_PASS}\"}" 2>&1 \
  | grep -o 'session_token=[^;]*' || echo "")

if [ -z "$SESSION" ]; then
  echo -e "${RED}✗ Failed to login to ListBlitz. Check your credentials.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Logged in${NC}"
echo ""

# ── Platform domains to search in Keychain ──
declare -A PLATFORM_DOMAINS
PLATFORM_DOMAINS=(
  ["depop"]="depop.com www.depop.com webapi.depop.com"
  ["grailed"]="grailed.com www.grailed.com"
  ["poshmark"]="poshmark.com www.poshmark.com"
  ["mercari"]="mercari.com www.mercari.com"
  ["ebay"]="ebay.com www.ebay.com signin.ebay.com"
  ["vinted"]="vinted.com www.vinted.com"
  ["facebook"]="facebook.com www.facebook.com m.facebook.com"
  ["vestiaire"]="vestiairecollective.com www.vestiairecollective.com"
)

declare -A PLATFORM_NAMES
PLATFORM_NAMES=(
  ["depop"]="Depop"
  ["grailed"]="Grailed"
  ["poshmark"]="Poshmark"
  ["mercari"]="Mercari"
  ["ebay"]="eBay"
  ["vinted"]="Vinted"
  ["facebook"]="Facebook Marketplace"
  ["vestiaire"]="Vestiaire Collective"
)

IMPORTED=0
SKIPPED=0
FAILED=0

echo -e "${BOLD}Searching Keychain for marketplace credentials...${NC}"
echo ""

for platform in depop grailed poshmark mercari ebay vinted facebook vestiaire; do
  name="${PLATFORM_NAMES[$platform]}"
  domains="${PLATFORM_DOMAINS[$platform]}"
  found=false

  for domain in $domains; do
    # Try to find the password in Keychain
    # security command will prompt for user authorization
    KEYCHAIN_OUTPUT=$(security find-internet-password -s "$domain" -g 2>&1 || true)

    if echo "$KEYCHAIN_OUTPUT" | grep -q "password:"; then
      # Extract username (acct field)
      USERNAME=$(echo "$KEYCHAIN_OUTPUT" | grep '"acct"' | head -1 | sed 's/.*="//;s/"//')

      # Extract password
      PASSWORD=$(echo "$KEYCHAIN_OUTPUT" | grep "^password:" | head -1 | sed 's/^password: "//;s/"$//')

      # Handle hex-encoded passwords
      if [ -z "$PASSWORD" ]; then
        PASSWORD=$(echo "$KEYCHAIN_OUTPUT" | grep "^password:" | head -1 | sed 's/^password: //')
      fi

      if [ -n "$USERNAME" ] && [ -n "$PASSWORD" ] && [ "$PASSWORD" != "password: " ]; then
        echo -e "  ${GREEN}✓${NC} ${BOLD}${name}${NC} — found credentials for ${CYAN}${USERNAME}${NC} (from ${domain})"

        # POST to ListBlitz API
        RESPONSE=$(curl -s -X POST "${API_URL}/api/platforms/connect" \
          -H "Content-Type: application/json" \
          -H "Cookie: ${SESSION}" \
          -d "{\"platform\":\"${platform}\",\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"authMethod\":\"credentials\"}" 2>&1)

        if echo "$RESPONSE" | grep -q '"success":true'; then
          echo -e "    → ${GREEN}Imported and encrypted${NC}"
          IMPORTED=$((IMPORTED + 1))
        else
          echo -e "    → ${RED}Failed to save: ${RESPONSE}${NC}"
          FAILED=$((FAILED + 1))
        fi

        found=true
        break
      fi
    fi
  done

  if [ "$found" = false ]; then
    echo -e "  ${YELLOW}—${NC} ${name} — no credentials found in Keychain"
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo -e "  ${GREEN}Imported:${NC} ${IMPORTED}"
echo -e "  ${YELLOW}Skipped:${NC}  ${SKIPPED} (not in Keychain)"
echo -e "  ${RED}Failed:${NC}   ${FAILED}"
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo ""

if [ $IMPORTED -gt 0 ]; then
  echo -e "${GREEN}✓ Done! ${IMPORTED} platform(s) connected.${NC}"
  echo -e "  Go to Settings → Platforms to verify and test connections."
fi

if [ $SKIPPED -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}Missing credentials? You can:${NC}"
  echo -e "  1. Save them in Safari/Chrome first (login to each platform)"
  echo -e "  2. Add them manually in Settings → Platforms"
  echo -e "  3. Run this script again after saving"
fi

echo ""
