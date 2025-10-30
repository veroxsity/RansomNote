$ErrorActionPreference = "Stop"

Write-Host "Starting Ransom Notes Online development servers..." -ForegroundColor Green

# Start backend server in a new window
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; npm run dev"

# Start frontend server in a new window
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev"

Write-Host "Development servers started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Press Ctrl+C in each window to stop the servers" -ForegroundColor Yellow