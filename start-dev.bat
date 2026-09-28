@echo off
echo Starting ParkShare Backend and Web Apps...

start "ParkShare Backend (Port 8000)" cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"
start "Customer Web (Port 5173)" cmd /k "cd customer-web && npm run dev"
start "Host Web (Port 5174)" cmd /k "cd host-web && npm run dev"
start "Admin Web (Port 5175)" cmd /k "cd admin-web && npm run dev"

echo.
echo =======================================================
echo  ParkShare Platform Services Running:
echo   - Backend API:   http://localhost:8000/docs
echo   - Customer Web:  http://localhost:5173
echo   - Host Web:      http://localhost:5174
echo   - Admin Web:     http://localhost:5175
echo =======================================================
