# E2E Tests

## Setup

```bash
npm install
npx playwright install chromium
npx playwright install-deps chromium
```

## Run Tests

```bash
npm run test:e2e          # Run all tests
npm run test:e2e:ui       # Run with UI
npm run test:e2e:headed   # Run headed (visible browser)
```

## Notes

- Tests require Chromium system dependencies (libnspr4, libnspr4, etc.)
- If `install-deps` fails due to permissions, install manually:
  ```bash
  sudo apt-get install libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
  ```
- App runs on http://localhost:3002 (configured in playwright.config.ts)