#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ListBlitz — Show what's in your Keychain (no passwords shown)
# ═══════════════════════════════════════════════════════════════
#
# This script checks which marketplace credentials exist in your
# macOS Keychain WITHOUT revealing any passwords.
#
# Usage:  ./scripts/export-credentials-template.sh
# ═══════════════════════════════════════════════════════════════

echo ""
echo "⚡ ListBlitz — Keychain Credential Scanner"
echo "   Checking which marketplace accounts are saved..."
echo ""

DOMAINS=(
  "depop.com:Depop"
  "www.depop.com:Depop"
  "grailed.com:Grailed"
  "www.grailed.com:Grailed"
  "poshmark.com:Poshmark"
  "www.poshmark.com:Poshmark"
  "mercari.com:Mercari"
  "www.mercari.com:Mercari"
  "ebay.com:eBay"
  "signin.ebay.com:eBay"
  "vinted.com:Vinted"
  "www.vinted.com:Vinted"
  "facebook.com:Facebook"
  "www.facebook.com:Facebook"
  "m.facebook.com:Facebook"
  "vestiairecollective.com:Vestiaire"
  "www.vestiairecollective.com:Vestiaire"
)

FOUND=()

for entry in "${DOMAINS[@]}"; do
  IFS=':' read -r domain name <<< "$entry"

  # Check without -g flag (no password revealed)
  OUTPUT=$(security find-internet-password -s "$domain" 2>&1 || true)

  if echo "$OUTPUT" | grep -q '"acct"'; then
    USERNAME=$(echo "$OUTPUT" | grep '"acct"' | head -1 | sed 's/.*="//;s/"//')
    echo "  ✓ ${name} — ${USERNAME} (${domain})"
    FOUND+=("$name")
  fi
done

if [ ${#FOUND[@]} -eq 0 ]; then
  echo "  No marketplace credentials found in Keychain."
  echo ""
  echo "  To add them:"
  echo "  1. Open Safari/Chrome"
  echo "  2. Log into each marketplace"
  echo "  3. Say 'Yes' when asked to save password"
  echo "  4. Run this script again"
else
  echo ""
  UNIQUE=$(echo "${FOUND[@]}" | tr ' ' '\n' | sort -u | wc -l | xargs)
  echo "  Found credentials for ${UNIQUE} platform(s)."
  echo ""
  echo "  To import into ListBlitz, run:"
  echo "    ./scripts/import-credentials.sh"
fi

echo ""
