Write-Host "========================================="
Write-Host "  Starting ArmorIQ Platform              "
Write-Host "========================================="

# Start Backend
Write-Host "Starting Backend on Port 3000..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Start Frontend
Write-Host "Starting Frontend Dashboard..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Services are launching in separate windows."
Write-Host "Please ensure your .env variables (DATABASE_URL and GEMINI_API_KEY) are valid."
Write-Host "To register the Custom MCP Server, open the Dashboard -> MCP Registry and add:"
Write-Host "Name: armoriq-custom-mcp"
Write-Host "Type: stdio"
Write-Host "Command: node"
Write-Host "Args: [\"dist/index.js\"] (Ensure you run 'npm run build' in custom-mcp-server first)"
