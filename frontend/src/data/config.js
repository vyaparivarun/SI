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
