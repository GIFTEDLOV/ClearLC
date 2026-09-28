# CharterLock Baseline Provenance

Captured 2026-09-28 in `C:\Users\DELL\ClearLC` before implementation.

| Item | Observed value |
| --- | --- |
| OS | Windows (PowerShell; exact build not captured by baseline shell) |
| Python | 3.14.3 system; matching Beacon Python 3.14 environment |
| Node | v24.14.0 |
| npm | 11.9.0 |
| pnpm | 11.0.9 |
| Git | 2.53.0.windows.2 |
| GenLayer CLI | 0.40.0-rc.3 |
| matching Python SDK | genlayer-py 0.19.0rc2 |
| matching test harness | genlayer-test 0.30.0rc2 |
| GenVM linter | 0.11.0 |
| GenVM runtime family | v0.6.0-rc2 cached for direct tests; localnet CLI default is v0.65.0 and was not started |
| target network | Studio-dev compatibility target; deployment not attempted |
| target chain ID | 61997 from installed SDK metadata; deployment not attempted |

The system Python also has stable `genlayer-py 0.18.0` and `genlayer-test
0.29.2`; they are not the selected compatibility family. Tests and checks use
the explicit Beacon executable path above, without changing global tooling.

