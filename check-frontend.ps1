# Frontend Health Check Script (Windows PowerShell)

Write-Host "🔍 VisionRapid Frontend Health Check" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check 1: Node modules
Write-Host "✓ Checking node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "  ✅ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ node_modules missing - Run: npm install" -ForegroundColor Red
    exit 1
}

# Check 2: Key dependencies
Write-Host ""
Write-Host "✓ Checking key dependencies..." -ForegroundColor Yellow
$dependencies = @("axios", "react-router-dom", "sonner")
foreach ($dep in $dependencies) {
    if (Test-Path "node_modules\$dep") {
        Write-Host "  ✅ $dep installed" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $dep missing" -ForegroundColor Red
    }
}

# Check 3: Auth files
Write-Host ""
Write-Host "✓ Checking authentication files..." -ForegroundColor Yellow
$authFiles = @(
    "src\contexts\AuthContext.tsx",
    "src\lib\auth-service.ts",
    "src\lib\axios-setup.ts",
    "src\components\ProtectedRoute.tsx",
    "src\pages\Login.tsx"
)

foreach ($file in $authFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file missing" -ForegroundColor Red
    }
}

# Check 4: Environment file
Write-Host ""
Write-Host "✓ Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  ✅ .env exists" -ForegroundColor Green
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "VITE_API_URL") {
        Write-Host "  ✅ VITE_API_URL configured" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  VITE_API_URL not found in .env" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ .env missing - Create from .env.example" -ForegroundColor Red
}

# Check 5: Package.json scripts
Write-Host ""
Write-Host "✓ Checking package.json scripts..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw
if ($packageJson -match '"dev"') {
    Write-Host "  ✅ dev script exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ dev script missing" -ForegroundColor Red
}

# Final summary
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Health check complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor White
Write-Host "1. If any ❌ errors, fix them first"
Write-Host "2. Run: npm install (if dependencies missing)"
Write-Host "3. Run: npm run dev (to start frontend)"
Write-Host "4. Open: http://localhost:5173/login"
Write-Host ""
Write-Host "For detailed troubleshooting, see FRONTEND_VALIDATION.md" -ForegroundColor Gray
