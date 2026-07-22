#!/bin/bash
# Deploy the admin panel to Vercel
# Usage: ./scripts/deploy-admin.sh

echo "Deploying admin panel..."

cd "$(dirname "$0")/.."

# Deploy to production (no SALON_ID = admin mode)
vercel --prod --yes --name "nailbook-admin"

echo ""
echo "✅ Admin panel deployed: https://nailbook-admin.vercel.app"
echo ""
echo "Next steps:"
echo "1. Visit https://nailbook-admin.vercel.app/bootstrap"
echo "2. Create your super-admin account"
echo "3. Login and create your first salon"
echo "4. Run: ./scripts/deploy-salon.sh <salon-name> <salon-id>"
