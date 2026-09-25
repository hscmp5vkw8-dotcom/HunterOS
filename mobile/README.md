# HunterOS mobile alpha 0.3

A native React Native + Expo Router implementation, not an HTML wrapper. Preserves the dark forest/lime design of the prototype. No cloud credentials are required for offline/local use. Accounts and cloud sync activate when the owner's Supabase project variables are configured.

## Run

```sh
# From the mobile directory, with Node.js >=22.16 installed:
npm install
npx expo login
npm start
```

On iPhone, open Expo Go and use the same Expo account as the terminal. Scan the generated QR code with Camera. Keep the computer online on the same Wi-Fi. On Windows, `start-windows.cmd` installs dependencies and starts the server. It does not alter the existing website. `npm run web` opens the same interface in a browser. Installing the Expo plugin alone does not start a device session; the project must be run on your computer.

SDK 54 is intentionally targeted for the iPhone App Store version of Expo Go. The official Expo mismatch guide documents this constraint: https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/

## Cloud setup

HunterOS is now cloud-ready while remaining offline-first. Create a Supabase project, run `supabase/schema.sql`, copy `.env.example` to `.env`, and fill in the project URL and publishable/anon key. The client key is intentionally a public client credential; row-level security in `schema.sql` prevents one account from reading another account's workspace. Do not put a service-role key in the app.

Cloud sync is explicit in this alpha: upload this device, or download the cloud copy. This avoids silent last-write-wins conflicts while we build record-level sync. Scan submissions sync separately and are structured for later promotion into the shared reviewed product catalog. `trip_members` is provisioned for shared-trip membership; invitations/assignment UI is not complete yet.

## Implemented

- Gear scanner: UPC/EAN/Code/QR camera scanning plus manual UPC/SKU entry. Every scan is persisted in the workspace scan database with first/last scan timestamps and count. Known scans resolve locally first; packaged-food barcodes can resolve through Open Food Facts. Unknown codes still create an editable locker record so the scan is never lost. Product-photo/OCR recognition remains a later backend feature rather than guessing from appearance.

- Native tabs, stacks and modal editor screens.
- 131 model/configuration references extracted from the preserved `../Indexv1.0.html` by a non-executing JSON parser during install. No scraper runs in the app.
- Photo-first catalog, brand/category filters, text search, favorites, known-weight filter, and price/weight sorting with missing values last.
- Source-linked manufacturer photos for selected products, failure placeholders and configuration captions. These are not generated product look-alikes.
- Product detail, variant navigation, seller links, add-to-trip and owned-gear actions.
- Hunting / camping / combined / backpacking trips, independent packing and ownership toggles, manual gear editing, unknown-aware totals and food-label calorie math.
- Native SQLite persistence, serialized validated writes, explicit save failures, no automatic overwrite of unreadable data.
- Export/import mobile JSON backups. Older browser backups migrate item names, weights, quantities, notes and ownership; old catalog snapshots and weather/offline flags are deliberately not carried over.
- Separate browser storage for web previews.

## Data and photo honesty

Legacy entries are marked `legacy-reference` rather than inheriting earlier blanket `reviewed` flags. Prices were not re-verified. Only weights explicitly checked this build have `weightCheckedAt`. The Durston typical setup entry was corrected to 975 g; 890 g is the complete tent alone, not the tent/sacks/six-stake setup. Nothing updates saved gear when the catalog changes.

Photo URLs and matching product pages are in `data/photo-overrides.json`. Remote manufacturer image references are for prototype review; licensing and permitted in-app/offline use must be resolved with each supplier before commercial distribution. No image binaries are republished in this repository, no license is implied, and reference-image disk caching is disabled. The interface handles missing/blocked images without substituting unrelated pictures.

## Offline limits

Trip data and edits persist locally. The catalog is bundled into the app. Reference photos and shopping pages require internet. **Expo Go can need the development server to reload its JavaScript bundle.** This is not a certified standalone cold-start offline build. TestFlight / development or preview binaries and device airplane-mode testing are the next validation layer, not an already completed feature. There is no live weather, onX map integration, cloud sync or safety certification.

## Checks

```sh
npm test
npm run typecheck
npx expo install --check
npx expo export --platform all
npx playwright install chromium
npm run test:web
```

The GitHub workflow runs domain tests, type checking, Expo dependency checks, iOS/Android/web JavaScript exports and a mobile-size browser interaction test. JavaScript exports are not native signed app builds. Web tests do not prove native SQLite or iPhone cold-start behavior.

## Next device pass

Create a trip, add a photographed product, edit its actual weight, mark it owned/packed, close and reopen, then export/import a backup. Keep the original backup until migration has been checked. Before store distribution, connect the owner's Expo/EAS project and Apple Developer account, confirm bundle IDs, resolve image rights, and add genuine offline image packages. `eas.json` is configuration only; no EAS project, signed build or TestFlight upload has been created.
