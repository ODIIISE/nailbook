#!/bin/bash
# Deploy a new salon to Vercel
# Usage: ./scripts/deploy-salon.sh <salon-name> <salon-id>

SALON_NAME=$1
SALON_ID=$2

if [ -z "$SALON_NAME" ] || [ -z "$SALON_ID" ]; then
  echo "Usage: ./scripts/deploy-salon.sh <salon-name> <salon-id>"
  echo "Example: ./scripts/deploy-salon.sh forehand-nail abc-123-def-456"
  exit 1
fi

echo "Deploying salon: $SALON_NAME (ID: $SALON_ID)"

# Create Vercel project and deploy
cd "$(dirname "$0")/.."

# Set environment variable
echo "Setting SALON_ID=$SALON_ID..."
vercel env add SALON_ID production <<< "$SALON_ID" 2>/dev/null || true

# Deploy to production
echo "Deploying to Vercel..."
vercel --prod --yes --name "$SALON_NAME"

echo ""
echo "✅ Deployed: https://$SALON_NAME.vercel.app"
echo "   SALON_ID: $SALON_ID"
