#!/bin/bash
# Frontend Health Check Script

echo "🔍 VisionRapid Frontend Health Check"
echo "===================================="
echo ""

# Check 1: Node modules
echo "✓ Checking node_modules..."
if [ -d "node_modules" ]; then
    echo "  ✅ node_modules exists"
else
    echo "  ❌ node_modules missing - Run: npm install"
    exit 1
fi

# Check 2: Key dependencies
echo ""
echo "✓ Checking key dependencies..."
if [ -d "node_modules/axios" ]; then
    echo "  ✅ axios installed"
else
    echo "  ❌ axios missing"
fi

if [ -d "node_modules/react-router-dom" ]; then
    echo "  ✅ react-router-dom installed"
else
    echo "  ❌ react-router-dom missing"
fi

if [ -d "node_modules/sonner" ]; then
    echo "  ✅ sonner installed"
else
    echo "  ❌ sonner missing"
fi

# Check 3: Auth files
echo ""
echo "✓ Checking authentication files..."
auth_files=(
    "src/contexts/AuthContext.tsx"
    "src/lib/auth-service.ts"
    "src/lib/axios-setup.ts"
    "src/components/ProtectedRoute.tsx"
    "src/pages/Login.tsx"
)

for file in "${auth_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file missing"
    fi
done

# Check 4: Environment file
echo ""
echo "✓ Checking environment configuration..."
if [ -f ".env" ]; then
    echo "  ✅ .env exists"
    if grep -q "VITE_API_URL" .env; then
        echo "  ✅ VITE_API_URL configured"
    else
        echo "  ⚠️  VITE_API_URL not found in .env"
    fi
else
    echo "  ❌ .env missing - Create from .env.example"
fi

# Check 5: Package.json scripts
echo ""
echo "✓ Checking package.json scripts..."
if grep -q '"dev"' package.json; then
    echo "  ✅ dev script exists"
else
    echo "  ❌ dev script missing"
fi

# Final summary
echo ""
echo "===================================="
echo "Health check complete!"
echo ""
echo "📋 Next Steps:"
echo "1. If any ❌ errors, fix them first"
echo "2. Run: npm install (if dependencies missing)"
echo "3. Run: npm run dev (to start frontend)"
echo "4. Open: http://localhost:5173/login"
echo ""
echo "For detailed troubleshooting, see FRONTEND_VALIDATION.md"
