# Full suite under WINDOWS bun, watched. Killed the moment it passes the cap, so the
# machine is never at risk. The last file named in the output is where it went wrong.
$capMB = 3000
$deadline = 420

Set-Location 'C:\dev\personal\orch\packages\orch'
$out = 'C:\dev\personal\orch\win-suite.txt'
$err = 'C:\dev\personal\orch\win-suite.err.txt'

$p = Start-Process -FilePath 'C:\Users\Bryan\.bun\bin\bun.exe' `
  -ArgumentList @('test') `
  -RedirectStandardOutput $out -RedirectStandardError $err `
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
