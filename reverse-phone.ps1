$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
Write-Host "Starting continuous ADB reverse tunnel for mobile device..."

while ($true) {
    try {
        $devs = & $adb devices | Where-Object { $_ -match "\tdevice$" } | ForEach-Object { ($_ -split "\t")[0] }
        foreach ($d in $devs) {
            & $adb -s $d reverse tcp:5174 tcp:5174 2>&1 | Out-Null
            & $adb -s $d reverse tcp:5173 tcp:5173 2>&1 | Out-Null
            & $adb -s $d reverse tcp:8000 tcp:8000 2>&1 | Out-Null
        }
    } catch {
        # ignore transient hiccups
    }
    Start-Sleep -Seconds 3
}
