# Swarnam Product Live

Independent Product Live app connected to the original Firebase project.

Run `npm run dev`. Build with `npm run build`. Run selector tests with `npm test`.

Real-time sources: Firebase Realtime Database date nodes for camera vehicle/product counts, Firestore `realtime/{date}` archive fallback, `erp/{date}` for vehicle/product allocations, and `products` for catalog names. Listeners are read-only; this app does not change database records.

The app defaults to the current noon-to-noon production day and advances automatically. Open `/?date=2026-10-20` to inspect a specific production day, including next-morning scans. ERP matching checks the loading calendar date and production date. The vehicle and product follow the latest recognized timestamp, and counts are vehicle-specific.

`.env.local` contains the same frontend Firebase configuration and optional camera URL as the original project. Keep it out of Git. Existing Firebase access rules still apply. Connection errors are shown instead of fabricated data. A camera URL must be configured for video.

The original app remains unchanged. All UI panels remain responsive and recent scans are scrollable.

## Entry PIN

Set `VITE_PRODUCT_LIVE_PIN` to your four-digit PIN in `.env.local`, then restart `npm run dev` (or rebuild for deployment). There is no hardcoded PIN fallback. The PIN screen appears before production/ERP listeners mount. Unlock is remembered for the browser tab session.

Vite embeds `VITE_` variables in browser code. This PIN screen is a frontend access gate, not server-enforced authentication. Firebase access rules remain the authority for data access. `.env.example` lists required variable names without values.

When the current production day has no vehicle counts, the monitor shows the newest available day within the last seven days with a visible date notice and Last recorded badge. It continues watching today and switches automatically once vehicle counts arrive. An explicit `?date=YYYY-MM-DD` never falls back to a different day.
