# Playwright Sharding CI Experiment

Reproducible Playwright experiment for comparing end-to-end test execution strategies against OWASP Juice Shop:

- sequential execution;
- native Playwright sharding;
- native Playwright sharding with `fullyParallel`;
- duration-aware balanced sharding using an LPT-style planner.

The suite lives in `tests` and contains 33 tests across 23 spec files.

## Local Setup

```powershell
npm ci
npx playwright install chromium
npm run app:up
npm run wait
```

Run the full suite locally:

```powershell
npm test
```

## Local Scripts

Create historical duration data:

```powershell
npm run calibrate -- --runs=3 --workers=1
```

Create a balanced sharding plan:

```powershell
npm run plan -- --run-id=manual-balanced-4 --shards=4
```

Run one shard manually:

```powershell
npm run run -- --strategy=native --run-id=manual-native-4 --shards=4 --shard=1 --workers=1
npm run run -- --strategy=balanced --run-id=manual-balanced-4 --shards=4 --shard=1 --workers=1
```

Collect metrics:

```powershell
npm run metrics -- --run-id=manual-balanced-4
```

Generated reports are written under `artifacts/`.

## GitHub Actions

The workflow is defined in `.github/workflows/experiment.yml` and can be started manually from the Actions tab.

Suggested smoke run:

```text
repetitions=3
calibration_runs=3
shard_counts=4
workers=1
include_fully=true
```

Larger run:

```text
repetitions=10
calibration_runs=5
shard_counts=2,4,8
workers=1
include_fully=true
```

The final summary artifact is named `experiment-summary` and contains:

```text
artifacts/metrics/gha-summary.csv
artifacts/metrics/gha-summary.json
artifacts/metrics/gha-aggregate.csv
artifacts/metrics/gha-aggregate.json
```

`gha-summary.*` contains one row/object per experimental run. `gha-aggregate.*`
groups those runs by strategy, shard count and worker count, reporting mean,
median, sample standard deviation and 95% confidence interval.

Timing metrics are measured around the Playwright command inside each job. They
do not include GitHub Actions queue time, dependency installation, browser
installation, service startup, artifact upload or billable workflow duration.
