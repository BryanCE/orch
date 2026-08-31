# WSL / Memory Exhaustion Incident — 2026-08-31

## Machine
- GEEKOM A9 Max, 32 GB DDR5-5600 (Micron), **1 of 2 SODIMM slots used**
- 4.4 GB hardware reserved for iGPU → 27.6 GB usable
- Windows 10.0.26200.9278, WSL 2.7.11.0, kernel 6.18.33.2-2

## Symptoms
- VmmemWSL at 14,091 MB / 87.4% CPU / 795 MB/s disk
- Memory header at 95–98%, disk pinned at 100%
- WSL crashing, system frozen, "catastrophic error" earlier in session

## Root Cause — Two Separate Problems

### 1. WSL had no memory ceiling
No `.wslconfig` existed. WSL2 defaults to 50% of host RAM → 14 GB cap on a
28 GB machine. Linux page cache grew to fill it and never released it back
to Windows. Ubuntu.vhdx (~46 GB) was imported wholesale from the old machine
(DESKTOP-EQ55Q8H), so this was a fresh-box constraint change, not a distro change.

### 2. Runaway `bun test` process — the actual killer
| PID | Start | Commit GB | Working GB | Command |
|---|---|---|---|---|
| 7296 | 8:13:40 | 0.03 | 0.00 | `bun --env-file=.env.local next dev --turbo --hostname 0.0.0.0` |
| 28148 | 8:13:38 | 0.06 | 0.00 | `bun --env-file=.env.local ./ssh-tunnels/tunnel-start.ts --local` |
| 29384 | 8:13:38 | 0.03 | 0.00 | `bun dev:test` |
| **15824** | **9:05:38** | **36.25** | **8.27** | **`bun test`** |

Three processes started together at 8:13 (the `dev:test` group). PID 15824
started alone at 9:05 and accumulated **36.25 GB of commit** over ~1 hour.

**Why Task Manager hid it:** the Processes tab shows working set (resident),
which was only 1,733 MB. The other ~34 GB was committed but paged out —
invisible in the default view, but fully counted against the commit limit.

## Memory State at Diagnosis
```
In use (Compressed)   27.6 GB (64.7 MB)
Available             4.0 MB          ← against the wall
Committed             81.4 / 82.7 GB  ← 98.4% of commit limit
Cached                21.1 GB         ← modified pages, not freeable
Paged pool            760 MB
Non-paged pool        1.6 GB
```
Cached was 21.1 GB while Available was 4 MB — those were dirty pages waiting
on disk writeback, which is why the disk sat at 100% and the machine froze.

Commit math: 36 GB (bun) + 18 GB (WSL reservation) ≈ 54 GB of the 81.4 GB.

## Fix Applied

`C:\Users\Bryan\.wslconfig`:
```ini
[wsl2]
memory=18GB
swap=12GB

[experimental]
autoMemoryReclaim=gradual
sparseVhd=true
```

**Gotcha:** on WSL 2.7.11, `autoMemoryReclaim` and `sparseVhd` must be under
`[experimental]`, NOT `[wsl2]`. Placing them in `[wsl2]` produces
`Unknown key 'wsl2.autoMemoryReclaim'` and they are silently ignored.

`processors` omitted deliberately → defaults to all 24 threads. Cores are
time-sliced by the hypervisor and cost nothing to leave uncapped; only memory
needed a ceiling.

**Result:** VmmemWSL dropped from 14,091 MB → 249 MB. `free -h` reports 17Gi
total (kernel overhead off the 18 GB cap) and 12Gi swap. `nproc` = 24.

**Remaining action:** `Stop-Process -Id 15824 -Force` to reclaim ~36 GB commit.

## Notes / Follow-ups
- A config change only takes effect on next VM start. `wsl -d Ubuntu -- nproc`
  *starts* the VM — so running it after editing the file means the next check
  is reading the old config. Verify with `wsl -l -v` showing `Stopped` first.
- The 18 GB cap counts toward commit whether WSL uses it or not.
- Investigate why `bun test` allocates unbounded — could be the test suite
  (unbounded loop, accumulating fixture, recursion) rather than a Bun runtime
  issue. Bun's core is Zig + JavaScriptCore, not Rust.
- Second SODIMM slot is free. Matching 32 GB module → 64 GB *and* dual-channel,
  which the iGPU would benefit from significantly.