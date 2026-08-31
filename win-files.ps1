param([string]$ListPath)

# Run the test files named in $ListPath (one per line) under WINDOWS bun, watched and
# capped, so a runaway is killed long before it can reach the machine's memory.
$capMB = 2500
$deadline = 120

Set-Location 'C:\dev\personal\orch\packages\orch'
$out = 'C:\dev\personal\orch\win-files.txt'
$err = 'C:\dev\personal\orch\win-files.err.txt'

$files = Get-Content $ListPath | Where-Object { $_.Trim() -ne '' }
if ($files.Count -eq 0) { "no files in $ListPath"; exit 1 }

$p = Start-Process -FilePath 'C:\Users\Bryan\.bun\bin\bun.exe' `
  -ArgumentList (@('test') + $files) `
  -RedirectStandardOutput $out -RedirectStandardError $err `
  -PassThru -NoNewWindow

$peak = 0
$verdict = 'completed'
$start = Get-Date

while (-not $p.HasExited) {
  Start-Sleep -Milliseconds 250
  try { $p.Refresh(); $ws = [int]($p.WorkingSet64 / 1MB) } catch { break }
  if ($ws -gt $peak) { $peak = $ws }
  if ($peak -gt $capMB) { $verdict = 'MEMORY'; Stop-Process -Id $p.Id -Force; break }
  if (((Get-Date) - $start).TotalSeconds -gt $deadline) { $verdict = 'HANG'; Stop-Process -Id $p.Id -Force; break }
}

$wall = [int]((Get-Date) - $start).TotalSeconds
"files=$($files.Count) peak=$peak MB wall=${wall}s verdict=$verdict"
