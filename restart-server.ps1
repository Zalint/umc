# Restart Server Script
# Stops any running Node.js servers and starts fresh

Write-Host "==============================================`n" -ForegroundColor Cyan
Write-Host "  Gambia Election Results Server - Restart`n" -ForegroundColor Cyan
Write-Host "==============================================`n" -ForegroundColor Cyan

# Step 1: Stop any running Node.js processes
Write-Host "Stopping existing Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Stopped running servers`n" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "✓ No servers running`n" -ForegroundColor Green
}

# Step 2: Start the server
Write-Host "Starting server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Cyan

npm start

