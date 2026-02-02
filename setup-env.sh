#!/bin/bash
# Setup Vercel environment variables for CRMZap
# Usage: source ~/clawd/.secrets/env.sh && ./setup-env.sh

set -e

cd ~/clawd/projects/whatszap

# Check required vars
if [ -z "$VERCEL_TOKEN" ]; then
  echo "Error: VERCEL_TOKEN not set"
  exit 1
fi

if [ -z "$META_APP_ID" ]; then
  echo "Error: META_APP_ID not set"
  exit 1
fi

if [ -z "$META_APP_SECRET" ]; then
  echo "Error: META_APP_SECRET not set"
  exit 1
fi

if [ -z "$CHATWOOT_API_KEY" ]; then
  echo "Warning: CHATWOOT_API_KEY not set - you'll need to add it manually"
fi

echo "Adding environment variables to Vercel..."

# Production URL
echo "whatszap-zeta.vercel.app" | vercel env add NEXT_PUBLIC_URL production --token=$VERCEL_TOKEN 2>/dev/null || true

# Meta credentials
echo "$META_APP_ID" | vercel env add META_APP_ID production --token=$VERCEL_TOKEN 2>/dev/null || true
echo "$META_APP_SECRET" | vercel env add META_APP_SECRET production --token=$VERCEL_TOKEN 2>/dev/null || true

# Chatwoot
echo "https://chatwoot-production-92d9.up.railway.app" | vercel env add CHATWOOT_URL production --token=$VERCEL_TOKEN 2>/dev/null || true
echo "1" | vercel env add CHATWOOT_ACCOUNT_ID production --token=$VERCEL_TOKEN 2>/dev/null || true

if [ -n "$CHATWOOT_API_KEY" ]; then
  echo "$CHATWOOT_API_KEY" | vercel env add CHATWOOT_API_KEY production --token=$VERCEL_TOKEN 2>/dev/null || true
fi

echo ""
echo "Done! Run 'vercel env ls --token=\$VERCEL_TOKEN' to verify"
echo ""
echo "If CHATWOOT_API_KEY is missing, add it manually:"
echo "  echo 'YOUR_KEY' | vercel env add CHATWOOT_API_KEY production --token=\$VERCEL_TOKEN"
