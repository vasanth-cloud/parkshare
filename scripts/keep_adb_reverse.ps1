$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
Write-Host "Starting continuous ADB reverse daemon..."
while ($true) {
    try {
        & $adb reverse tcp:8000 tcp:8000 2>&1 | Out-Null
        & $adb reverse tcp:5173 tcp:5173 2>&1 | Out-Null
    } catch {}
    Start-Sleep -Seconds 3
}

