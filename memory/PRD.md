# Solar Intelligence — Neutral Solar Savings, Financing & EPC Marketplace

## Original Problem Statement
Production-quality, responsive B2B web app for the Indian C&I solar market. Solar Intelligence is a NEUTRAL 3-way marketplace connecting Customers ↔ EPCs ↔ Financing Partners (banks/NBFCs/DFIs). The platform spans the full journey: bill → solar potential → project size → cost → govt benefits → financing → EMI → savings → payback → cash flow → ROI → environmental → REC → financing lead. Must look like a sophisticated B2B fintech/energy platform, not a solar installer site.

## Rebrand note (2026-06)
Previously positioned as "EFL Renewable Energy Funding (REF)" (single NBFC). Per user, ALL EFL/Electronica Finance branding was removed and the site repositioned as neutral marketplace "Solar Intelligence". EFL/Electronica now appears ONLY as one listed NBFC among many financing partners. Financing language is generic ("the financing partner's credit assessment"). Lead/EPC/project ID prefixes changed EFL-* → SI-*.

## User Choices
- Scope: full depth across calculator+financing, data portal, and EPC portal.
- Design: Dark premium fintech (navy/charcoal + amber/emerald accents).
- Auth: none (public calculator + lead capture).
- Integrations: none (self-contained).
- Content: full navigation tree built immediately.
- Data must be real/source-tagged (no fabricated live govt data).

## Architecture
- Frontend: React 19 + Tailwind (shadcn), recharts, framer-motion, react-router. Design tokens in index.css.
- Calculation engine: `/app/frontend/src/lib/engine.js` — pure UI-independent functions (generation, savings, EMI, amortization, NPV, IRR, DSCR, payback, suitability, environmental, REC, sensitivity, tornado).
- Data layer (versioned, source-tagged): `/app/frontend/src/data/` — states.js (36 states/UTs), discoms.js (20 DISCOMs), incentives.js (+ eligibility engine), industries.js (25 sectors), config.js (defaults, REC price schedule, EFL product), content.js (tech, models, glossary, FAQ, docs, demo customer).
- Backend: FastAPI + MongoDB (`/app/backend/server.py`) — leads, EPC partners, EPC projects, stats; lead scoring/intent. Routes under /api.

## Data Integrity (real, sourced, 2026-06 verified)
- No central C&I capital subsidy; PM Surya Ghar is residential-only.
- Accelerated Depreciation (Sec 32, 40%), GEOA (≥100 kW), GST, state incentives, ALMM mandate (Jun 1 2026).
- CERC RCO Buyout Price schedule (₹347→₹421/MWh FY24-25→FY29-30).
- All tariffs/irradiation clearly labeled indicative with source + last-verified; disclaimers throughout.

## Implemented (2026-06)
- Homepage with live-style illustrative metrics from engine.
- 6-step Solar Calculator (Location, Business, Bill, Site, System, Cost) with auto system sizing, live sticky summary, mobile sticky savings, demo-data loader, inline validation.
- Results dashboard: 12 metrics, Solar-vs-EMI cash flow, 6 charts (bill w/wo solar, cumulative savings, annual cashflow, generation, cost breakdown, loan outstanding), scenario builder (No solar / 70/80/100% financing), sensitivity tornado + best/base/worst, suitability score gauge, incentives/environmental/REC panels, financing lead form, print-to-PDF report, assumptions & sources.
- Financing page: EMI calculator + amortization charts + scenarios + journey + documents.
- State DB + state detail; DISCOM directory; Government incentives + eligibility engine + GST/tax; REC & Carbon centre + REC calculator; Industries + industry detail (25); Technology knowledge centre; Project models comparison; Solar for Business; EPC portal (register/submit/track pipeline); Resources (glossary/FAQ/docs); Contact.
- Backend lead & EPC persistence with intent scoring. Tested 14/14 backend, 100% frontend flows.

## Backlog / Future (P1/P2)
- P1: Electricity bill OCR extraction (architecture ready), real PDF export (currently print), email/WhatsApp report sharing.
- P1: Admin dashboard to edit states/DISCOMs/tariffs/incentives/rates (data currently in versioned JS modules).
- P2: Auth (EPC/customer/admin logins), AI Solar Advisor (LLM using engine), CRM/EFL loan-application integration, interactive India SVG map.

## Calculator V2 — Ultimate Calculator (2026-06) — DONE
- Live location-aware solar data: new backend GET /api/solar/resource (pincode / city+state / lat+lon). Uses FREE keyless APIs — Zippopotam (IN pincode->lat/lon) with Open-Meteo geocoding fallback, + Open-Meteo Historical Archive (last ~365 days daily sunshine_duration + shortwave_radiation_sum). Returns avgDailyGHI (kWh/m2/day), avgSunshineHours, sunnyDays/yr (>=5h threshold), period. Cached in db.solar_cache (14-day TTL). httpx added to requirements.
- Calculator Step 1: pincode input + "Get live solar data" button + result card (sunny days, GHI, sun hours) + Use-live-data/State-average toggle. Live GHI overrides state-average irradiation when enabled.
- Calculator Step 3: panel technology (Mono PERC/TOPCon/HJT/Thin Film -> PR & degradation via PANEL_TECH_SPECS) + panel wattage selectors; shows per-panel units/day + total panel count.
- Calculator Step 4: editable O&M engine — AMC, CMC, Insurance + custom Other, each with unit toggle (% cost/yr, Rs/W/yr, Rs/month) + annual escalation. Flows through engine.runProjectModel (annualOMOverride, omEscalation, degradationYr) into net savings, payback, IRR, NPV, cashflow. metrics.annualOM exposed. Assumptions block updated (panels, O&M, live/avg source).
- Term-loan/lease financing math untouched. Tested end-to-end (iteration_5.json, 100% BE/FE). Fixed logger-ordering non-blocker.
- Files: config.js (PANEL_TECH_SPECS, PANEL_WATTAGES, OM_UNITS, OM_DEFAULTS, omHeadAnnual), engine.js (runProjectModel O&M/degradation), api.js (getSolarResource), Calculator.jsx, backend/server.py, backend/tests/test_solar_resource.py.

## Next Tasks
- Consider admin CRUD for regulatory data; OCR bill upload; AI advisor.

## Rebrand + Marketplace sections (2026-06) — DONE
- Global rebrand EFL → Solar Intelligence across all pages, Layout (logo "Solar Intelligence"), footer, config (`EFL_PRODUCT`→`FINANCING_PRODUCT`), content, engine header, backend title & ID prefixes (SI-*).
- New data: `/app/frontend/src/data/partners.js` — FINANCING_PARTNERS (8: IREDA, SIDBI 4E, SBI, HDFC, Tata Capital, Electronica Finance, PFC&REC, CGTMSE — source-tagged, editable rate/tenure/LTV) + EPC_PARTNERS (12: Tata Power Solar, Sterling&Wilson, Fourth Partner, CleanMax, Gentari, Waaree, Vikram, Jakson Green, Mahindra Susten, KPI Green, Adani Solar, Amp Energy).
- New pages: `/financing-partners` (type filter: All/DFI/Bank/NBFC/Scheme) and `/epc-partners` (search). Routed in App.js; linked in nav (Financing → Financing Partners; For EPCs → Our EPC Partners) + footer.
- EPC flow text now CUSTOMER → SOLAR INTELLIGENCE → EPC & FINANCING PARTNERS.
- Calculator math untouched. Verified via screenshots (both pages render, logo/nav correct).
