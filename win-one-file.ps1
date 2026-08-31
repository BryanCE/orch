param([string]$TestFile)

# Run one test file with WINDOWS bun, watched. Kill it the moment it passes the cap or
# the deadline, so a runaway cannot take the machine again.
$capMB = 2500
$deadline = 60

Set-Location 'C:\dev\personal\orch\packages\orch'
$out = 'C:\dev\personal\orch\win-one-file.txt'

$p = Start-Process -FilePath 'C:\Users\Bryan\.bun\bin\bun.exe' `
  -ArgumentList @('test', $TestFile) `
  -RedirectStandardOutput $out -RedirectStandardError "$out.err" `
  -PassThru -NoNewWindow

$peak = 0
$verdict = 'completed'
$start = Get-Date

while (-not $p.HasExited) {
  Start-Sleep -Milliseconds 300
  try { $p.Refresh(); $ws = [int]($p.WorkingSet64 / 1MB) } catch { break }
  if ($ws -gt $peak) { $peak = $ws }
  if ($peak -gt $capMB) { $verdict = 'MEMORY'; Stop-Process -Id $p.Id -Force; break }
  if (((Get-Date) - $start).TotalSeconds -gt $deadline) { $verdict = 'HANG'; Stop-Process -Id $p.Id -Force; break }
}

$wall = [int]((Get-Date) - $start).TotalSeconds
"peak=$peak MB wall=${wall}s verdict=$verdict"
