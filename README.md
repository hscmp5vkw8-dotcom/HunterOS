# HunterOS

The original browser prototypes remain unchanged at `index.html` and `Indexv1.0.html`.

The actual React Native / Expo application is in **[mobile/](mobile/README.md)**. Do not rename its files to HTML or upload it over the website.

## Start the mobile app

Use Node.js 22 LTS or newer. Download this repository as a ZIP and extract it, then open a terminal inside `mobile`:

```sh
npm install
npx expo login
npm start
```

Open Expo Go on the iPhone and sign in to the same Expo account. Scan the terminal QR code with the iPhone Camera. Keep the computer running and connected to the same Wi-Fi. Windows users can double-click `mobile/start-windows.cmd` after installing Node.js. Press `w` in the Expo terminal for the web preview. If LAN connectivity is blocked, try `npx expo start --go --tunnel` and accept the official tunnel-package install prompt.

This is source code, not an App Store release or a hosted Expo session. A QR code is created when you start your local development server.
