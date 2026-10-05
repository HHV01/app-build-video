$targetNames = @('chrome.exe', 'msedge.exe', 'brave.exe', 'browser.exe')
$procs = Get-CimInstance Win32_Process | Where-Object { 
    $targetNames -contains $_.Name -and ($_.CommandLine -like '*gui_chrome_profiles*' -or $_.CommandLine -like '*clean_*')
}
foreach ($p in $procs) {
    try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
    Write-Host "Killed worker PID: $($p.ProcessId) ($($p.Name))"
}
$drivers = Get-Process -Name 'chromedriver', 'msedgedriver' -ErrorAction SilentlyContinue
if ($drivers) { 
    $drivers | Stop-Process -Force -ErrorAction SilentlyContinue 
    Write-Host "Killed lingering drivers"
}
