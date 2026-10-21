/* Educational content: solar technology, project/financing models, glossary, FAQ, documents, financing journey, demo customer. */

export const PANEL_TECH = [
  { name: "Mono PERC", efficiency: "20–21%", degradation: "~0.55%/yr", tempCoeff: "-0.34%/°C", warranty: "12 yr product / 25–27 yr performance", note: "Mature, cost-effective mainstream technology. Good balance of price and performance for most C&I rooftops." },
  { name: "TOPCon", efficiency: "22–23%", degradation: "~0.40%/yr", tempCoeff: "-0.30%/°C", warranty: "15 yr product / 30 yr performance", note: "Higher efficiency and better low-light & temperature behaviour than PERC; now the volume leader for new C&I projects." },
  { name: "HJT", efficiency: "23–24%", degradation: "~0.25%/yr", tempCoeff: "-0.24%/°C", warranty: "15 yr product / 30 yr performance", note: "Highest efficiency and lowest temperature coefficient; premium price. Strong where roof area is constrained." },
  { name: "Thin Film (CdTe)", efficiency: "16–19%", degradation: "varies", tempCoeff: "-0.28%/°C", warranty: "varies", note: "Better in high-heat/diffuse light; lower efficiency needs more area. Niche in Indian C&I rooftop." },
];

export const INVERTER_TYPES = [
  { name: "String Inverter", use: "Most C&I rooftops (100 kW–3 MW)", efficiency: "98–99%", note: "Multiple MPPTs, modular, easy service. Standard for commercial rooftop." },
  { name: "Central Inverter", use: "Large ground-mount / MW-scale", efficiency: "98.5–99%", note: "Lower ₹/W at scale; single point of failure — used with SCADA for large plants." },
  { name: "Hybrid Inverter", use: "Solar + battery backup", efficiency: "97–98%", note: "Manages PV, battery and grid; enables backup during outages." },
  { name: "Micro Inverter", use: "Small / shaded / complex roofs", efficiency: "96–97%", note: "Panel-level MPPT and monitoring; higher cost, rare in large C&I." },
];

export const BOS_ITEMS = [
  "Mounting Structures (GI / aluminium, RCC & metal roof)", "DC Cables (solar-rated)", "AC Cables & bus ducts",
  "Combiner / Array Junction Boxes", "Step-up Transformer (for HT evacuation)", "LT/HT Switchgear & panels",
  "Earthing & Lightning Protection (LA)", "SCADA & Plant Controller", "Remote Monitoring & Data Logger",
  "Net / Gross / ABT Meters", "Weather Station (large plants)",
];

export const PROJECT_MODELS = [
  { key: "CAPEX", ownership: "Customer owns the plant", capex: "Customer (own funds or partner financing)", savings: "Highest — full savings + depreciation benefit", risk: "Customer bears O&M & performance", best: "Strong balance sheet, high tariff, long horizon", note: "Customer captures all savings, accelerated depreciation and any REC upside. Partner financing removes the upfront capital barrier." },
  { key: "OPEX / RESCO", ownership: "Developer owns the plant", capex: "Developer / third party", savings: "Discount on per-unit tariff; no capex", risk: "Developer bears O&M & performance", best: "Prefer zero capex, off balance sheet", note: "Customer pays only for generated units at an agreed rate below grid tariff. Depreciation benefit accrues to the developer, not the customer." },
  { key: "PPA", ownership: "Developer / IPP", capex: "Developer", savings: "Fixed/escalating tariff over 10–25 yrs", risk: "Contractual — take-or-pay terms", best: "Large offsite / open-access procurement", note: "Long-term power purchase agreement, often via open access from an offsite plant." },
  { key: "Captive", ownership: "Consumer (≥26% equity, ≥51% consumption)", capex: "Consumer / SPV", savings: "High + open-access charge savings", risk: "Compliance with captive rules", best: "Large consumers wanting offsite solar", note: "Consumer owns qualifying equity in the generating plant and consumes proportionate power; exempt from cross-subsidy surcharge if captive criteria are met." },
  { key: "Group Captive", ownership: "Multiple consumers via SPV", capex: "Developer + consumers (≥26%)", savings: "High; shared large plant", risk: "Regulatory compliance of captive status", best: "Consumers who can't build own plant", note: "Several C&I consumers collectively meet the ≥26% equity / ≥51% consumption captive norms in a shared plant." },
  { key: "Open Access", ownership: "Any (via GEOA)", capex: "Developer / consumer", savings: "Below-tariff power for ≥100 kW loads", risk: "CSS, additional surcharge, banking, wheeling charges", best: "≥100 kW loads seeking offsite RE", note: "Green Energy Open Access lets ≥100 kW consumers buy RE directly; economics hinge on state open-access charges." },
];

export const FINANCING_JOURNEY = [
  { step: 1, title: "Calculate Opportunity", desc: "Use the solar calculator to size the project, savings, EMI and payback." },
  { step: 2, title: "Submit Details", desc: "Share business, electricity and project details for a financing assessment." },
  { step: 3, title: "Initial Assessment", desc: "The financing partner reviews indicative eligibility and project economics." },
  { step: 4, title: "Document Collection", desc: "KYC, financials and project documents are collected." },
  { step: 5, title: "Credit Assessment", desc: "The partner's credit team evaluates the borrower and project cashflows (DSCR)." },
  { step: 6, title: "Sanction", desc: "Loan terms — amount, rate, tenure, moratorium — are sanctioned." },
  { step: 7, title: "EPC Confirmation", desc: "EPC scope, BoM (ALMM-compliant) and timeline are confirmed." },
  { step: 8, title: "Documentation", desc: "Loan and security documentation is executed." },
  { step: 9, title: "Disbursement", desc: "Funds are disbursed, typically linked to project milestones." },
  { step: 10, title: "Commissioning", desc: "Plant is installed, tested and commissioned; monitoring begins." },
];

export const DOCUMENTS = [
  { group: "KYC & Constitution", items: ["PAN (entity & promoters)", "Aadhaar / KYC of promoters", "GST registration", "Certificate of Incorporation / Partnership deed / Constitution documents"] },
  { group: "Financials", items: ["Audited financial statements (2–3 yrs)", "ITR (2–3 yrs)", "Bank statements (6–12 months)", "Existing loan / obligation details"] },
  { group: "Project", items: ["EPC quotation & scope", "Detailed Project Report / technical proposal", "Electricity bills (6–12 months)", "Sanctioned load proof"] },
  { group: "Property / Site", items: ["Property ownership / lease documents", "Roof / land availability proof", "Site photographs"] },
];

export const GLOSSARY = [
  { term: "kW / kWp", def: "Kilowatt (peak) — the rated DC capacity of a solar plant under standard test conditions." },
  { term: "kWh / Unit", def: "Kilowatt-hour — one unit of electrical energy; the basis of electricity billing." },
  { term: "Performance Ratio (PR)", def: "Ratio of actual to theoretically possible energy output, capturing all system losses (typically 0.75–0.82)." },
  { term: "Specific Yield", def: "Annual energy generated per kWp installed (kWh/kWp/yr) — depends on location irradiation and PR." },
  { term: "Net Metering", def: "Billing where exported solar energy is netted against imported grid energy on the meter." },
  { term: "Gross Metering", def: "All solar energy is exported and sold at a feed-in tariff; consumption billed separately." },
  { term: "Open Access (GEOA)", def: "Regulatory route allowing ≥100 kW consumers to buy renewable power directly from a generator." },
  { term: "Cross Subsidy Surcharge (CSS)", def: "Charge levied on open-access consumers to compensate DISCOMs for lost cross-subsidy." },
  { term: "Accelerated Depreciation", def: "Solar power generating systems are depreciated at 40% of written-down value (Income-tax Act, 2025; earlier Section 32), reducing taxable income." },
  { term: "REC", def: "Renewable Energy Certificate — a tradable certificate representing 1 MWh of renewable generation's environmental attribute." },
  { term: "DSCR", def: "Debt Service Coverage Ratio — net operating income divided by debt service; lenders look for comfortable coverage (>1.2–1.3x)." },
  { term: "IRR", def: "Internal Rate of Return — the discount rate at which project NPV equals zero; a core return metric." },
  { term: "NPV", def: "Net Present Value — present value of all cashflows at a chosen discount rate." },
  { term: "PR / Degradation", def: "Panels lose a small fraction of output each year (~0.4–0.6%); factored into 25-year projections." },
  { term: "ALMM", def: "Approved List of Models & Manufacturers — MNRE lists mandatory for grid-connected/net-metered projects." },
  { term: "Group Captive", def: "A shared generation model where consumers hold ≥26% equity and consume ≥51% of generation to qualify as captive." },
];

export const FAQS = [
  { q: "Does the government give a subsidy for commercial or industrial solar?", a: "There is no direct central capital subsidy for C&I solar. The PM Surya Ghar subsidy is residential-only. C&I customers instead benefit from 40% accelerated depreciation (Income-tax Act, 2025), 5% GST on solar equipment, state incentives (e.g. electricity duty exemptions) and the Green Open Access framework." },
  { q: "How much roof area do I need?", a: "As a rule of thumb, about 100 sq ft of shadow-free roof supports roughly 1 kW of solar. A 500 kW plant needs roughly 50,000 sq ft. The calculator caps the recommended size by your available area." },
  { q: "Will my monthly savings be more than my EMI?", a: "Often yes for high-tariff, high-daytime-load businesses — but it depends on tariff, generation, project cost and loan terms. The Solar vs EMI cash-flow view shows exactly when savings exceed EMI." },
  { q: "What is the typical payback period?", a: "Indicatively 3–6 years for strong C&I cases, but it varies with tariff, irradiation, cost and financing. The calculator computes both simple and discounted payback for your inputs." },
  { q: "Can the whole project be financed?", a: "Financing partners on the platform offer solar loans (indicatively up to ₹3 Cr per project) subject to credit assessment. Financing share, rate and tenure are decided during assessment — all figures on this platform are indicative." },
  { q: "Do I need ALMM-listed panels?", a: "Yes. Modules must be ALMM List-I. For net-metering and open-access projects, ALMM List-II cells become mandatory for projects commissioned on or after 1 January 2027 (MNRE OM, 18-Jul-2026). Ensure your EPC quotes ALMM-compliant equipment." },
  { q: "Are REC earnings guaranteed?", a: "No. REC eligibility, registration, issuance and price depend on project structure and CERC/state rules. Any REC value shown is indicative only." },
];

export const DEMO_CUSTOMER = {
  label: "DEMO / ILLUSTRATIVE",
  state: "Haryana",
  stateCode: "HR",
  city: "Faridabad",
  discom: "DHBVN (Dakshin Haryana Bijli)",
  businessType: "Manufacturing",
  industry: "manufacturing",
  operatingDays: 26,
  operatingHours: 16,
  daytimePct: 70,
  monthlyBill: 1000000,
  monthlyUnits: 100000,
  tariff: 7.9,
  roofAreaSqft: 80000,
  installationType: "Rooftop",
  roofType: "RCC",
  shading: "Low",
  panelTech: "TOPCon",
};
