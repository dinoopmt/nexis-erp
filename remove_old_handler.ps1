$filePath = "d:\NEXIS-ERP\client\src\components\inventory\GrnForm.jsx"
$lines = @(Get-Content $filePath)
# Keep lines 0-481 (first 482 lines) and lines from 609 onwards
$newLines = $lines[0..481] + $lines[609..($lines.Length-1)]
$newLines -join "`r`n" | Set-Content $filePath
Write-Host "Removed lines 483-609 from GrnForm.jsx"
