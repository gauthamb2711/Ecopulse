# EcoPulse — AI-Based Smart Dustbin Fill-Level Detection, Prediction & Automatic Alert System

A complete, software-only Smart City Waste Management Control Centre running 100% inside the browser with React, TypeScript, Vite, Tailwind CSS, Recharts, and LocalStorage.

## Key Capabilities

1. **Interactive 3D Cutaway Smart Dustbin Simulator**
   - Real-time animated waste level and layered waste objects (paper, bottles, cans, organic, cardboard).
   - Visible top-mounted **HC-SR04 (Simulated)** ultrasonic transducer with animated downward Tx and upward Echo waves.
   - Add waste (+5%, +15%, +30%, custom %, random), remove waste (-10%, -25%, empty), and run automatic or manual simulation modes with adjustable speed.

2. **Simulated HC-SR04 Ultrasonic Sensor Physics**
   - `Waste Height = Bin Height × (Fill % / 100)`
   - `Sensor Distance = Bin Height − Waste Height`
   - Configurable bin height calibration (`30–300 cm`), echo pulse duration (`µs`), and optional bounded Gaussian sensor noise.

3. **Genuine Browser-Based Random Forest Classifier**
   - Implemented in pure TypeScript (`src/services/randomForest.ts`) with CART Gini impurity splitting, bootstrap sampling, random feature subsets, and majority voting.
   - Synthetic training dataset generator (`600` to `2,000` samples) with 75/25 stratified train/validation split.
   - Computes real validation accuracy, 4×4 confusion matrix, precision, recall, and F1-score.
   - Classifies bins into **Empty (0–25%)**, **Half-Filled (26–50%)**, **Nearly Full (51–90%)**, and **Completely Full (91–100%)**.

4. **Linear Regression Full-Time Prediction**
   - Ordinary Least Squares regression over actual simulated fill history timestamps to estimate filling velocity (`%/hr`), R² fit, and time remaining to 100% capacity.

5. **Multi-Bin Fleet, Alerts, Collection Dispatch & Reports**
   - Pre-seeded with 5 independent bins (`BIN-001` through `BIN-005`) plus full CRUD.
   - Deduplicated in-app alert system with Web Audio API chime toggle.
   - Waste collection dispatch queue that resets collected bins and records collection events.
   - Searchable history logs with CSV export, printable reports, and JSON backup/import.

## Local Development

```bash
npm install
npm run dev
```

## Production Build & Vercel Deployment

```bash
npm run lint
npm run build
```

Deploy directly to Vercel as a static Vite application using the included `vercel.json` SPA rewrite configuration (`npm run build` → `dist`). No environment variables or external databases are required.
