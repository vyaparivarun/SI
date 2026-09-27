/*
 * Default engine assumptions & indicative marketplace financing configuration.
 * All values here are CONFIGURABLE defaults — not hardcoded into UI logic.
 */

export const DEFAULTS = {
  // Solar system
  performanceRatio: 0.78,
  degradationYr: 0.006,
  availability: 0.99,
  selfConsumption: 0.85,
  gridEmissionFactor: 0.71, // tCO2/MWh (CEA average, indicative)
  sqftPerKw: 100,
  panelWattage: 580,

  // Cost benchmark (indicative ₹/W, turnkey EPC)
  ratePerWattByRange: [
    { maxKw: 100, ratePerWatt: 48, label: "< 100 kW" },
    { maxKw: 500, ratePerWatt: 44, label: "100–500 kW" },
    { maxKw: 1000, ratePerWatt: 41, label: "500 kW – 1 MW" },
    { maxKw: 5000, ratePerWatt: 38, label: "1–5 MW" },
    { maxKw: Infinity, ratePerWatt: 35, label: "> 5 MW" },
  ],

  // Savings
  tariffEscalation: 0.05,
  exportCompensation: 0.9,

  // Financing (indicative marketplace defaults — configurable per partner)
  interestRate: 11.0,
  tenureYears: 7,
  financingPct: 0.8,
  processingFeePct: 1.0,
  gstOnFeePct: 18,
  insurancePct: 0.35,
  flatRate: 8.5,
  leaseRate: 9.5,
  gstOnRentalPct: 18,
  discountRate: 0.10,
  omPctOfCost: 0.01,

  // REC (CERC buyout price band, indicative)
  recValuePerMwh: 347,
};

// CERC RCO Buyout Price schedule (source-tagged)
export const REC_PRICE_SCHEDULE = {
  source: "CERC Order dated 18 Feb 2026 (Petition No. 12/SM/2025) — RCO Buyout Price",
  lastVerified: "2026-06",
  note: "There is no separate solar/non-solar floor or forbearance price since the 2022 REC Regulations; market prices are discovered on power exchanges (recently ~₹345–349/REC).",
  schedule: [
    { fy: "2024-25", pricePerMwh: 347 },
    { fy: "2025-26", pricePerMwh: 347 },
    { fy: "2026-27", pricePerMwh: 364 },
    { fy: "2027-28", pricePerMwh: 382 },
    { fy: "2028-29", pricePerMwh: 401 },
    { fy: "2029-30", pricePerMwh: 421 },
  ],
};

export function rateForCapacity(capacityKw) {
  const band = DEFAULTS.ratePerWattByRange.find((b) => capacityKw <= b.maxKw);
  return band ? band.ratePerWatt : 40;
}

// Panel technology specs — adjust system PR contribution & annual degradation.
// pr = indicative delivered performance ratio for the tech; deg = yearly loss.
export const PANEL_TECH_SPECS = {
  "Mono PERC": { pr: 0.77, degradationYr: 0.0055, efficiency: "20–21%", note: "Mature, cost-effective mainstream technology." },
  "TOPCon": { pr: 0.79, degradationYr: 0.0040, efficiency: "22–23%", note: "Higher efficiency & better low-light/temperature behaviour; volume leader for new C&I." },
  "HJT": { pr: 0.80, degradationYr: 0.0025, efficiency: "23–24%", note: "Highest efficiency & lowest degradation; premium price. Best where area is tight." },
  "Thin Film (CdTe)": { pr: 0.75, degradationYr: 0.0050, efficiency: "16–19%", note: "Better in high heat/diffuse light; needs more area for same output." },
};

export const PANEL_WATTAGES = [400, 440, 540, 580, 610, 700];

// O&M / recurring-charge unit options and defaults (all editable in the UI).
export const OM_UNITS = [
  { value: "pctCost", label: "% of project cost / yr" },
  { value: "perW", label: "₹ per watt / yr" },
  { value: "perMonth", label: "₹ per month" },
];

export const OM_DEFAULTS = {
  amc: { val: 0.5, unit: "pctCost" },       // Annual Maintenance Contract
  cmc: { val: 0, unit: "pctCost" },         // Comprehensive Maintenance Contract
  insurance: { val: 0.35, unit: "pctCost" },
  other: { name: "Other charges", val: 0, unit: "pctCost" },
  escalation: 5,                             // % per year
};

// Convert one O&M head to an absolute year-1 ₹/year figure.
export function omHeadAnnual(head, projectCost, capacityW) {
  const v = Number(head?.val) || 0;
  if (v <= 0) return 0;
  if (head.unit === "perW") return capacityW * v;
  if (head.unit === "perMonth") return v * 12;
  return projectCost * (v / 100); // pctCost
}

// Indicative marketplace financing product config (configurable per partner)
export const FINANCING_PRODUCT = {
  name: "Solar Financing via partner banks & NBFCs",
  maxLoan: "Up to ₹3 Crore per project (indicative)",
  collateralFree: "Collateral-free options up to ₹50 Lakh (subject to credit assessment)",
  interestRange: "Indicative ~7%–13% p.a. (subject to partner, credit profile & approval)",
  tenureRange: "3–15 years",
  moratorium: "Up to 3–6 months (project-dependent)",
  turnaround: "Fast-track assessment (indicative 3–7 working days on complete documents)",
  disclaimer: "All financing figures are indicative and subject to the financing partner's credit assessment, applicable terms and approval.",
};

export const DISCLAIMERS = {
  generation: "Solar generation is an estimate and depends on location, irradiation, system design, shading, equipment and operating conditions.",
  incentive: "Government incentive eligibility is subject to applicable rules and approval by the relevant authority.",
  tariff: "Tariffs and regulatory charges are subject to change.",
  tax: "Tax treatment should be confirmed with a qualified tax professional. Indicative information only.",
  financing: "Financing figures are indicative and subject to the financing partner's credit assessment, applicable terms and approval.",
  rec: "REC / carbon-credit eligibility and monetization are not guaranteed.",
  data: "Data is indicative and source-tagged. Verify against the latest official orders before financial decisions.",
};
