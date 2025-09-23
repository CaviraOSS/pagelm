# Requires PowerShell 7+
$ErrorActionPreference = "Stop"

# Install backend dependencies
Set-Location backend
npm install

# Install frontend dependencies
Set-Location ../frontend
npm install

Set-Location ..
npm install -g nodemon

# Setup environment
if (-Not (Test-Path ".env")) {
    Copy-Item .env.example .env
}

# Run backend
Set-Location backend
$backend = Start-Process npm -ArgumentList "run", "dev" -PassThru

# Run frontend
Set-Location ../frontend
$frontend = Start-Process npm -ArgumentList "run", "dev" -PassThru

# Wait for both processes to exit
$backend.WaitForExit()
$frontend.WaitForExit()