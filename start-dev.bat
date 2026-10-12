@echo off
echo Starting ParkShare Backend and Web Apps...

start "ParkShare Backend (Port 8000)" cmd /k "cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
start "Customer Web (Port 5173)" cmd /k "cd customer-web && npm run dev"
start "Host Web (Port 5174)" cmd /k "cd host-web && npm run dev"
start "Admin Web (Port 5175)" cmd /k "cd admin-web && npm run dev"

:: Forward ports to connected Android device via ADB
where adb >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Forwarding ports to connected Android phone via ADB...
    adb reverse tcp:5173 tcp:5173 >nul 2>&1
    adb reverse tcp:5174 tcp:5174 >nul 2>&1
    adb reverse tcp:8000 tcp:8000 >nul 2>&1
)

echo.
echo =======================================================
echo  ParkShare Platform Services Running:
echo   - Backend API:   http://localhost:8000/docs
echo   - Customer Web:  http://localhost:5173
echo   - Host Web:      http://localhost:5174
echo   - Admin Web:     http://localhost:5175
echo   - Mobile LAN:    http://192.168.1.17:5173 (Customer) / :5174 (Host)
echo   - Mobile USB:    adb reverse active for ports 5173, 5174, 8000
echo =======================================================
