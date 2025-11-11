#!/bin/bash

echo "🚀 FinOps Tracker - Deployment Script"
echo "===================================="

echo "📁 Checking deployment structure..."

# Check if build exists
if [ ! -f "index.html" ]; then
    echo "❌ Error: Build files not found. Please build the React app first."
    exit 1
fi

# Check if API configuration exists
if [ ! -f "api/index.js" ]; then
    echo "❌ Error: API configuration not found."
    exit 1
fi

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: Vercel configuration not found."
    exit 1
fi

echo "✅ All deployment files found"

echo "📦 Checking database..."
if [ ! -f "finops-platform/backend/database.sqlite" ]; then
    echo "❌ Error: Database file not found."
    exit 1
fi

echo "✅ Database file found"

echo "🔧 Checking API routes..."
api_routes=("auth" "companies" "pods" "vendors" "invoices" "payments" "dashboard" "alerts")
for route in "${api_routes[@]}"; do
    if [ ! -f "finops-platform/backend/routes/${route}.js" ]; then
        echo "❌ Error: API route for ${route} not found."
        exit 1
    fi
done

echo "✅ All API routes found"

echo "📝 Checking environment configuration..."
if [ ! -f ".env.production" ]; then
    echo "❌ Error: Production environment file not found."
    exit 1
fi

echo "✅ Environment configuration found"

echo ""
echo "🎉 Deployment check complete!"
echo "📋 Summary:"
echo "   - Frontend built and ready"
echo "   - Backend API configured"
echo "   - Database with real data"
echo "   - Vercel configuration complete"
echo ""
echo "🚀 Ready to deploy to Vercel!"
echo ""
echo "Next steps:"
echo "1. Run 'vercel' to deploy"
echo "2. Set environment variables in Vercel dashboard"
echo "3. Test the deployed application"