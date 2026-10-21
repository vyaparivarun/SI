# Solar Intelligence — Neutral Solar Savings, Financing & EPC Marketplace

## Original Problem Statement
Production-quality, responsive B2B web app for the Indian C&I solar market. Solar Intelligence is a NEUTRAL 3-way marketplace connecting Customers ↔ EPCs ↔ Financing Partners (banks/NBFCs/DFIs). The platform spans the full journey: bill → solar potential → project size → cost → govt benefits → financing → EMI → savings → payback → cash flow → ROI → environmental → REC → financing lead. Must look like a sophisticated B2B fintech/energy platform, not a solar installer site.

Latest user direction (2026-10-21, verbatim): "dont focus on many features build less features but build them completely not broken. do deep test and make sure all live data fetch for the pincode location and discom data and all policy related data are correct and real-time use more free api and do error handling switch different api If one is not answer but make sure web app dont break and dont show some random wrong data it will break customer trust"

## User Choices
- Scope: full depth across calculator+financing, data portal, EPC portal. Now: fewer features, fully working & trustworthy.
- Design: Dark premium fintech (navy/charcoal + amber/emerald accents).
- Auth: none (public calculator + lead capture).
- Data must be real/source-tagged; no fabricated or "random" values — show "Not verified" instead.

## Architecture
- Frontend: React 19 + Tailwind (shadcn), recharts, react-router. Engine `/app/frontend/src/lib/engine.js` (pure functions).
- Data layer `/app/frontend/src/data/`: states.js, discoms.js (with districts + suggestDiscoms + stateTariffRange), incentives.js, config.js, content.js, partners.js, tariffHistory.js.
- Backend: FastAPI + MongoDB. `server.py` (leads, EPC, stats, /api/solar/resource) + `solar_service.py` (location resolution + multi-source solar consensus).
- Mongo collections: leads, epc_partners, epc_projects, solar_cache (v:4, 14-day fresh / 365-day stale fallback), geo_cache (pincode → location, 90 days).

## Live solar data pipeline (2026-10-21)
- Pincode validation (6 digits, first 1-9) → India Post API (authoritative district/state; "not found" → 404) → coordinates: Nominatim → Photon → district centre (Open-Meteo geocoding / Photon) → Zippopotam last ("approximate"). Results rejected if outside India or state ≠ India Post state. Leh/Kargil → Ladakh.
- 5 free keyless GHI sources in parallel with retry: Global Solar Atlas (Solargis), NASA POWER climatology (2001–2025), PVGIS-ERA5, Open-Meteo ERA5 (last 12 months), NASA POWER daily (last 12 months). Plausible range 2.5–7.5; outliers >15% from median excluded; consensus = median; confidence high/medium/low; sunny days = median of ERA5 & NASA cloud cover (<40%) with range; monthly profile.
- Never breaks: partial source failure → remaining sources; all fail → stale cache → status "state_only" (state average); any unexpected error → 503 message. Open-Meteo "satellite" removed (duplicates ERA5 for India). Sunshine-hours removed (ERA5 overstates it).
- UI (SolarDataCard): location + "Verified by India Post", precision label, likely DISCOM chips (by district), state-mismatch banner with "Switch to X", confidence, per-source table, toggle live vs state average. Auto-fills state/city/DISCOM/tariff.

## Data verification (checked 2026-10-21)
- DISCOM HT-industrial tariffs updated to FY 2026-27 orders with source links for MH (MSEDCL/AEML/Tata), GJ (4 GUVNL + Torrent base), HR, RJ, UP (6 incl. NPCL), KA (5), TN, TS, AP, MP (names fixed: Poorv=East, Madhya=Central, Paschim=West), PB, WBSEDCL, Odisha (4), Bihar (2), JH, UK, HP, KL, Assam, Delhi (4, incl. FPPAS where verified). ciTariff = energy (+wheeling) + only verified surcharges; `excludes` listed.
- Not verified (shown as "not yet verified", tariff field cleared so user enters bill rate): BEST, CESC, IPCL, CSPDCL (HV-3), Torrent landed rate, NE states, Goa, J&K, Ladakh, Chandigarh, Puducherry, DNH&DD, A&N.
- State irradiation = Global Solar Atlas median of industrial clusters; installed solar = MNRE 30-Sep-2026.
- Policies: GST 5% on solar devices from 22-Sep-2025 (70:30 EPC → ≈8.9%); 40% depreciation under Income-tax Act 2025 (20% if <180 days); ALMM List-II for net-metering/OA from 1-Jan-2027 (MNRE OM 18-Jul-2026); CERC RCO buyout ₹347→₹421/MWh; IEX REC ₹338 (14-Oct-2026).
- Engine fix: annual savings capped at the energy bill (net-metering credits can't exceed the bill).

## Implemented (history)
- 2026-06: Full platform (calculator, financing, state/DISCOM DBs, incentives, REC, industries, EPC portal, resources), rebrand to Solar Intelligence, Financing/EPC partner pages, V2 calculator (O&M, panel tech/wattage, live solar data).
- 2026-10-21: Robust pincode/solar pipeline (above), DISCOM district mapping & suggestions, verified FY 2026-27 tariffs with links, state data refresh, policy corrections. Tested iteration_7 (backend 53/53) and iteration_8 (backend 56/56, frontend 100% of flows); final 2 minor items fixed (cache version bump, no estimate while tariff empty).

## Backlog
- P1: Admin panel to update DISCOM tariffs/FPPAS/policies without code (data currently in versioned JS modules).
- P1: Verify remaining DISCOMs (BEST, CESC, IPCL, CSPDCL HV-3, NE/UT utilities) and monthly FPPAS/FAC updates.
- P2: Bill OCR, PDF report + WhatsApp share, auth/dashboards, AI advisor.
