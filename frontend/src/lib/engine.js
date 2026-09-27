/*
 * Solar Intelligence — Calculation Engine
 * Pure functions, UI-independent. Every function exposes its assumptions.
 * All monetary values in INR. All energy in kWh unless noted.
 */

// ---------------------------------------------------------------------------
// 1. SOLAR GENERATION
// Annual Generation = Installed Capacity (kW) x Specific Yield (kWh/kW/yr) x PR factor
// Specific yield is derived from location irradiation (kWh/m2/day) and typical
// performance ratio. We degrade generation each year by a degradation rate.
// ---------------------------------------------------------------------------
export function calculateSolarGeneration({
  capacityKw,
  irradiation = 5.0,        // kWh/m2/day (peak sun hours proxy)
  performanceRatio = 0.78,  // system PR (losses inverter, temp, cable, soiling)
  shadingLoss = 0.02,       // fraction lost to shading
  availability = 0.99,      // uptime
  degradationYr = 0.006,    // 0.6% per year (yr2+); yr1 ~2% handled below
  years = 25,
}) {
  const effPR = performanceRatio * (1 - shadingLoss) * availability;
  // Specific yield (kWh per kWp per year) ~ irradiation * 365 * PR
  const specificYield = irradiation * 365 * effPR;
  const year1 = capacityKw * specificYield; // year-1 generation
  const schedule = [];
  let cumulative = 0;
  for (let y = 1; y <= years; y++) {
    // year1 already at nominal; apply linear degradation from year 2
    const degradeFactor = y === 1 ? 1 : Math.pow(1 - degradationYr, y - 1);
    const gen = year1 * degradeFactor;
    cumulative += gen;
    schedule.push({ year: y, generation: gen, cumulative });
  }
  return {
    specificYield,
    year1Generation: year1,
    dailyAvg: year1 / 365,
    monthlyAvg: year1 / 12,
    lifetimeGeneration: cumulative,
    schedule,
    assumptions: { irradiation, performanceRatio, shadingLoss, availability, degradationYr, effectivePR: effPR },
  };
}

// ---------------------------------------------------------------------------
// 2. SYSTEM SIZING (Auto recommendation)
// Size the plant so that annual generation offsets a target share of the
// daytime-consumable energy. Roof/land availability caps the size.
// ~ 1 kWp needs ~90-100 sq ft rooftop (RCC) → use 100 sq ft/kW.
// ---------------------------------------------------------------------------
// Area <-> capacity conversion helpers
export function areaForCapacity(capacityKw, { sqftPerKw = 100, acreCapacityKw = 250 } = {}) {
  const kw = Math.max(0, capacityKw || 0);
  return { sqft: Math.round(kw * sqftPerKw), acres: +(kw / acreCapacityKw).toFixed(2) };
}

export function capacityFromArea({ roofAreaSqft = 0, landAreaAcres = 0, sqftPerKw = 100, acreCapacityKw = 250 }) {
  return Math.max(0, (roofAreaSqft / sqftPerKw) + (landAreaAcres * acreCapacityKw));
}

// Capacity (kW) needed to offset 100% of annual consumption via self-consumption
export function fullBillCapacityKw({ annualUnits, specificYield, selfConsumption = 0.85 }) {
  if (!specificYield || specificYield <= 0 || !annualUnits) return 0;
  return annualUnits / (specificYield * selfConsumption);
}

export function recommendSystemSize({
  annualUnits,
  daytimePct = 0.65,
  targetOffset = 0.9,       // offset up to 90% of daytime-available load
  specificYield = 1450,
  roofAreaSqft = 0,
  landAreaAcres = 0,
  sqftPerKw = 100,
  acreCapacityKw = 250,     // ~250 kW per acre ground mount
}) {
  const addressable = annualUnits * daytimePct * targetOffset;
  let sizeByLoad = specificYield > 0 ? addressable / specificYield : 0;
  const roofCap = roofAreaSqft > 0 ? roofAreaSqft / sqftPerKw : Infinity;
  const landCap = landAreaAcres > 0 ? landAreaAcres * acreCapacityKw : Infinity;
  const areaCap = Math.min(roofCap, landCap);
  const capped = isFinite(areaCap) ? Math.min(sizeByLoad, areaCap) : sizeByLoad;
  return {
    recommendedKw: Math.max(0, Math.round(capped)),
    unconstrainedKw: Math.round(sizeByLoad),
    roofCapKw: isFinite(roofCap) ? Math.round(roofCap) : null,
    landCapKw: isFinite(landCap) ? Math.round(landCap) : null,
    areaLimited: isFinite(areaCap) && areaCap < sizeByLoad,
  };
}

// ---------------------------------------------------------------------------
// 3. PROJECT COST
// ₹/W benchmark based cost, with a component breakdown for the chart.
// ---------------------------------------------------------------------------
export function calculateProjectCost({ capacityKw, ratePerWatt = 42, breakdown }) {
  const total = capacityKw * 1000 * ratePerWatt;
  // Indicative component shares of EPC turnkey cost
  const shares = breakdown || {
    "Solar Modules": 0.46,
    "Inverters": 0.11,
    "Mounting Structure": 0.10,
    "Cables & Electrical": 0.09,
    "Transformer & LT/HT": 0.06,
    "Civil Work": 0.05,
    "Installation & Labour": 0.06,
    "Engineering & Design": 0.02,
    "Testing & Commissioning": 0.02,
    "Approvals & Metering": 0.015,
    "Contingency": 0.025,
  };
  const components = Object.entries(shares).map(([name, share]) => ({
    name, share, value: total * share,
  }));
  return { totalCost: total, ratePerWatt, components };
}

// ---------------------------------------------------------------------------
// 4. ELECTRICITY SAVINGS (25-year, with tariff escalation)
// Blended effective tariff (₹/kWh). Solar offsets grid units up to what can be
// consumed/exported. Demand & fixed charges largely persist (grid connection).
// ---------------------------------------------------------------------------
export function calculateElectricitySavings({
  annualUnits,
  effectiveTariff = 8.0,     // ₹/kWh blended
  generationSchedule,        // from calculateSolarGeneration
  daytimePct = 0.65,
  selfConsumption = 0.85,    // portion of generation directly consumed
  exportCompensation = 0.9,  // ₹/kWh factor for exported surplus vs tariff (net metering)
  tariffEscalation = 0.05,   // annual %
  years = 25,
}) {
  const rows = [];
  let cumulative = 0;
  for (let y = 1; y <= years; y++) {
    const gen = generationSchedule[y - 1]?.generation || 0;
    const tariff = effectiveTariff * Math.pow(1 + tariffEscalation, y - 1);
    // Energy that can offset consumption is capped by consumption
    const consumableGen = Math.min(gen * selfConsumption, annualUnits);
    const surplus = Math.max(0, gen - consumableGen);
    const offsetSavings = consumableGen * tariff;
    const exportSavings = surplus * tariff * exportCompensation;
    const annualSaving = offsetSavings + exportSavings;
    cumulative += annualSaving;
    const gridBillBefore = annualUnits * tariff;
    const gridBillAfter = Math.max(0, gridBillBefore - annualSaving);
    rows.push({
      year: y, tariff, generation: gen, offsetUnits: consumableGen, surplus,
      annualSaving, cumulative, gridBillBefore, gridBillAfter,
    });
  }
  return {
    year1Saving: rows[0]?.annualSaving || 0,
    monthlyAvgSaving: (rows[0]?.annualSaving || 0) / 12,
    lifetimeSavings: cumulative,
    rows,
    assumptions: { effectiveTariff, selfConsumption, exportCompensation, tariffEscalation },
  };
}

// ---------------------------------------------------------------------------
// 5. LOAN — EMI & AMORTIZATION
// EMI = P*r*(1+r)^n / ((1+r)^n - 1)
// ---------------------------------------------------------------------------
export function calculateLoanEMI({ principal, annualRate = 11, tenureYears = 7 }) {
  const n = Math.round(tenureYears * 12);
  const r = annualRate / 100 / 12;
  if (principal <= 0 || n <= 0) return { emi: 0, totalInterest: 0, totalRepayment: 0, n: 0 };
  let emi;
  if (r === 0) emi = principal / n;
  else emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalRepayment = emi * n;
  return { emi, totalInterest: totalRepayment - principal, totalRepayment, n, monthlyRate: r };
}

export function calculateAmortization({ principal, annualRate = 11, tenureYears = 7 }) {
  const { emi, n, monthlyRate: r } = calculateLoanEMI({ principal, annualRate, tenureYears });
  const monthly = [];
  let balance = principal;
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    const principalPaid = Math.min(emi - interest, balance);
    balance = Math.max(0, balance - principalPaid);
    monthly.push({ month: m, emi, interest, principal: principalPaid, balance });
  }
  // Aggregate to yearly
  const yearly = [];
  for (let y = 0; y < Math.ceil(n / 12); y++) {
    const slice = monthly.slice(y * 12, y * 12 + 12);
    yearly.push({
      year: y + 1,
      interest: slice.reduce((s, x) => s + x.interest, 0),
      principal: slice.reduce((s, x) => s + x.principal, 0),
      debtService: slice.reduce((s, x) => s + x.emi, 0),
      closingBalance: slice[slice.length - 1]?.balance ?? 0,
    });
  }
  return { emi, monthly, yearly };
}

// ---------------------------------------------------------------------------
// 6. FINANCIAL METRICS
// ---------------------------------------------------------------------------
export function calculateNPV(rate, cashflows) {
  // cashflows[0] is year 0 (typically negative equity outflow)
  return cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

export function calculateIRR(cashflows, guess = 0.1) {
  // Newton-Raphson with bisection fallback
  let rate = guess;
  for (let i = 0; i < 80; i++) {
    let npv = 0, d = 0;
    for (let t = 0; t < cashflows.length; t++) {
      npv += cashflows[t] / Math.pow(1 + rate, t);
      if (t > 0) d += (-t * cashflows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(npv) < 1) return rate;
    if (d === 0) break;
    const next = rate - npv / d;
    if (!isFinite(next)) break;
    rate = next;
    if (rate < -0.99) rate = -0.99;
  }
  // Bisection fallback
  let lo = -0.9, hi = 1.0;
  const f = (rr) => cashflows.reduce((a, cf, t) => a + cf / Math.pow(1 + rr, t), 0);
  let flo = f(lo), fhi = f(hi);
  if (flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

export function calculatePayback(initialOutflow, annualNetInflows) {
  // Simple payback: cumulative inflow crosses initial outflow
  let cum = 0;
  for (let y = 0; y < annualNetInflows.length; y++) {
    const prev = cum;
    cum += annualNetInflows[y];
    if (cum >= initialOutflow) {
      const need = initialOutflow - prev;
      return y + need / annualNetInflows[y];
    }
  }
  return null; // does not pay back within horizon
}

export function calculateDiscountedPayback(initialOutflow, annualNetInflows, rate) {
  let cum = 0;
  for (let y = 0; y < annualNetInflows.length; y++) {
    const dcf = annualNetInflows[y] / Math.pow(1 + rate, y + 1);
    const prev = cum;
    cum += dcf;
    if (cum >= initialOutflow) {
      const need = initialOutflow - prev;
      return y + need / dcf;
    }
  }
  return null;
}

export function calculateDSCR(netOperatingIncome, debtService) {
  if (!debtService) return null;
  return netOperatingIncome / debtService;
}

// ---------------------------------------------------------------------------
// 7. ENVIRONMENTAL IMPACT
// CEA grid emission factor ~ 0.71 tCO2/MWh (avg). Configurable.
// ---------------------------------------------------------------------------
export function calculateEnvironmentalImpact({ lifetimeGeneration, year1Generation, gridEmissionFactor = 0.71 }) {
  const lifetimeCo2 = (lifetimeGeneration / 1000) * gridEmissionFactor; // tonnes
  const annualCo2 = (year1Generation / 1000) * gridEmissionFactor;
  return {
    annualCo2Tonnes: annualCo2,
    lifetimeCo2Tonnes: lifetimeCo2,
    equivalentTrees: Math.round(lifetimeCo2 * 16.5), // ~ trees over lifetime
    coalAvoidedTonnes: (lifetimeGeneration / 1000) * 0.5,
    assumptions: { gridEmissionFactor },
  };
}

// ---------------------------------------------------------------------------
// 8. REC ESTIMATE (environmental attribute — NOT guaranteed)
// 1 REC = 1 MWh. Indicative value from CERC buyout price band.
// ---------------------------------------------------------------------------
export function calculateRECEstimate({ year1Generation, recValuePerMwh = 347 }) {
  const potentialCerts = year1Generation / 1000; // MWh → RECs
  return {
    potentialCertsPerYear: potentialCerts,
    indicativeValuePerMwh: recValuePerMwh,
    indicativeAnnualValue: potentialCerts * recValuePerMwh,
    note: "Indicative only. Eligibility, registration, issuance and monetization are not guaranteed and depend on project structure and applicable CERC / state rules.",
  };
}

// ---------------------------------------------------------------------------
// 9. SUITABILITY SCORE (0-100) with explanation factors
// ---------------------------------------------------------------------------
export function calculateSuitabilityScore({
  monthlyBill, effectiveTariff, daytimePct, irradiation,
  roofAreaSqft, recommendedKw, operatingHours, shading, interestRate,
}) {
  const factors = [];
  const add = (label, points, max, detail) => {
    factors.push({ label, points: Math.round(points), max, detail });
    return points;
  };
  let score = 0;
  // Electricity spend (higher = better)
  const billScore = Math.min(monthlyBill / 1_000_000, 1) * 22;
  score += add("Electricity Spend", billScore, 22,
    monthlyBill >= 500000 ? "High spend improves solar economics" : "Moderate/low spend limits savings scale");
  // Tariff
  const tariffScore = Math.min(Math.max(effectiveTariff - 5, 0) / 5, 1) * 16;
  score += add("Grid Tariff", tariffScore, 16,
    effectiveTariff >= 8 ? "High tariff makes solar strongly attractive" : "Lower tariff reduces per-unit savings");
  // Daytime load
  const dayScore = Math.min(daytimePct, 1) * 18;
  score += add("Daytime Load Match", dayScore, 18,
    daytimePct >= 0.6 ? "Strong daytime consumption aligns with solar generation" : "Low daytime load reduces self-consumption");
  // Irradiation
  const irrScore = Math.min(Math.max(irradiation - 3.5, 0) / 2, 1) * 14;
  score += add("Solar Resource", irrScore, 14,
    irradiation >= 5 ? "Excellent solar irradiation at location" : "Moderate irradiation");
  // Roof adequacy
  const need = (recommendedKw || 0) * 100;
  const roofRatio = need > 0 ? Math.min(roofAreaSqft / need, 1) : 0;
  score += add("Roof / Land Area", roofRatio * 12, 12,
    roofRatio >= 0.9 ? "Sufficient area for recommended size" : "Area may limit system size");
  // Operating hours
  const hrScore = Math.min((operatingHours || 8) / 12, 1) * 8;
  score += add("Operating Hours", hrScore, 8,
    operatingHours >= 10 ? "Long operating hours capture more generation" : "Shorter hours");
  // Shading penalty
  const shadeMap = { Low: 6, Medium: 3, High: 0 };
  score += add("Shading", shadeMap[shading] ?? 4, 6,
    shading === "Low" ? "Minimal shading losses" : shading === "High" ? "High shading reduces yield" : "Some shading");
  // Financing cost (lower rate = better) — small weight
  const finScore = Math.min(Math.max(14 - (interestRate || 11), 0) / 4, 1) * 4;
  score += add("Financing Cost", finScore, 4,
    (interestRate || 11) <= 10 ? "Attractive financing cost" : "Higher rate modestly reduces returns");

  const total = Math.round(Math.min(score, 100));
  let verdict, tone;
  if (total >= 75) { verdict = "Excellent — Strong solar & financing case"; tone = "emerald"; }
  else if (total >= 55) { verdict = "Good — Solar is likely worthwhile"; tone = "amber"; }
  else if (total >= 40) { verdict = "Moderate — Evaluate carefully"; tone = "blue"; }
  else { verdict = "Limited — Solar economics are weak here"; tone = "danger"; }
  return { score: total, verdict, tone, factors };
}

// ---------------------------------------------------------------------------
// 10. FULL PROJECT MODEL — orchestrates everything for a scenario
// ---------------------------------------------------------------------------
export function runProjectModel(inp) {
  const {
    capacityKw, irradiation, performanceRatio, shading = "Low",
    ratePerWatt, annualUnits, effectiveTariff, daytimePct = 0.65,
    tariffEscalation = 0.05, financingPct = 0.8, downPaymentPct,
    interestRate = 11, tenureYears = 7, processingFeePct = 1,
    discountRate = 0.10, omPctOfCost = 0.01, years = 25,
    gridEmissionFactor = 0.71, selfConsumption = 0.85,
  } = inp;

  const shadingLoss = { Low: 0.02, Medium: 0.06, High: 0.12 }[shading] ?? 0.03;

  const gen = calculateSolarGeneration({
    capacityKw, irradiation, performanceRatio, shadingLoss, years,
  });
  const cost = calculateProjectCost({ capacityKw, ratePerWatt });
  const savings = calculateElectricitySavings({
    annualUnits, effectiveTariff, generationSchedule: gen.schedule,
    daytimePct, selfConsumption, tariffEscalation, years,
  });

  const finPct = downPaymentPct != null ? (1 - downPaymentPct) : financingPct;
  const loanAmount = cost.totalCost * finPct;
  const equity = cost.totalCost - loanAmount;
  const processingFee = loanAmount * (processingFeePct / 100);
  const loan = calculateLoanEMI({ principal: loanAmount, annualRate: interestRate, tenureYears });
  const amort = calculateAmortization({ principal: loanAmount, annualRate: interestRate, tenureYears });
  const env = calculateEnvironmentalImpact({
    lifetimeGeneration: gen.lifetimeGeneration, year1Generation: gen.year1Generation, gridEmissionFactor,
  });
  const rec = calculateRECEstimate({ year1Generation: gen.year1Generation });

  // Annual project cashflow (equity perspective): savings - O&M - debt service
  const annualOM0 = cost.totalCost * omPctOfCost;
  const projectCashflow = [-equity]; // year 0 equity outflow
  const netAnnual = [];
  const cashflowRows = [];
  let cumNet = 0;
  for (let y = 1; y <= years; y++) {
    const save = savings.rows[y - 1].annualSaving;
    const om = annualOM0 * Math.pow(1.03, y - 1); // O&M escalates ~3%
    const ds = amort.yearly[y - 1]?.debtService || 0;
    const net = save - om - ds; // equity holder net cash after debt service
    cumNet += net;
    projectCashflow.push(net);
    netAnnual.push(save - om); // for project payback (unlevered)
    cashflowRows.push({
      year: y, saving: save, om, debtService: ds, net, cumulative: cumNet,
      loanOutstanding: amort.yearly[y - 1]?.closingBalance ?? 0,
    });
  }

  // Unlevered cashflow for project IRR
  const projectUnlevered = [-cost.totalCost, ...netAnnual];
  const projectIRR = calculateIRR(projectUnlevered);
  const equityIRR = calculateIRR(projectCashflow);
  const npv = calculateNPV(discountRate, projectUnlevered);
  const simplePayback = calculatePayback(cost.totalCost, netAnnual);
  const discPayback = calculateDiscountedPayback(cost.totalCost, netAnnual, discountRate);

  // DSCR (year 1): NOI / debt service
  const noi1 = savings.rows[0].annualSaving - annualOM0;
  const dscr1 = calculateDSCR(noi1, amort.yearly[0]?.debtService || 0);

  // Monthly view (year 1)
  const currentMonthlyBill = (annualUnits * effectiveTariff) / 12;
  const residualMonthlyBill = savings.rows[0].gridBillAfter / 12;
  const monthlyEMI = loan.emi;
  const monthlyOutflowWithSolar = monthlyEMI + residualMonthlyBill + annualOM0 / 12;
  const netMonthlyBenefit = currentMonthlyBill - monthlyOutflowWithSolar;

  const lifetimeNet = savings.lifetimeSavings - loan.totalInterest - (annualOM0 * years * 1.4) - equity;

  return {
    inputs: inp,
    capacityKw,
    generation: gen,
    cost,
    savings,
    loan: { ...loan, loanAmount, equity, processingFee, financingPct: finPct },
    amortization: amort,
    environmental: env,
    rec,
    cashflow: { rows: cashflowRows, projectUnlevered, projectCashflow },
    metrics: {
      projectIRR, equityIRR, npv, simplePayback, discPayback, dscr1,
      lifetimeSavings: savings.lifetimeSavings,
      lifetimeNetBenefit: lifetimeNet,
      currentMonthlyBill, residualMonthlyBill, monthlyEMI, monthlyOutflowWithSolar, netMonthlyBenefit,
      annualSavingsY1: savings.year1Saving,
    },
  };
}

// ---------------------------------------------------------------------------
// 11. SENSITIVITY (best / base / worst) — returns deltas on key metrics
// ---------------------------------------------------------------------------
export function runSensitivity(baseInputs) {
  const scenarios = {
    best: { ratePerWatt: baseInputs.ratePerWatt * 0.9, irradiation: baseInputs.irradiation * 1.08,
            tariffEscalation: (baseInputs.tariffEscalation || 0.05) + 0.02, interestRate: (baseInputs.interestRate || 11) - 1.5,
            performanceRatio: Math.min((baseInputs.performanceRatio || 0.78) + 0.03, 0.85) },
    base: {},
    worst: { ratePerWatt: baseInputs.ratePerWatt * 1.12, irradiation: baseInputs.irradiation * 0.9,
             tariffEscalation: Math.max((baseInputs.tariffEscalation || 0.05) - 0.02, 0.01), interestRate: (baseInputs.interestRate || 11) + 2,
             performanceRatio: Math.max((baseInputs.performanceRatio || 0.78) - 0.04, 0.68) },
  };
  const out = {};
  for (const [k, ov] of Object.entries(scenarios)) {
    const m = runProjectModel({ ...baseInputs, ...ov });
    out[k] = {
      payback: m.metrics.simplePayback,
      projectIRR: m.metrics.projectIRR,
      npv: m.metrics.npv,
      annualSavings: m.metrics.annualSavingsY1,
      lifetimeSavings: m.metrics.lifetimeSavings,
    };
  }
  return out;
}

// Tornado: single-variable +/- swings on base
export function runTornado(baseInputs) {
  const vars = [
    { key: "ratePerWatt", label: "Project Cost (₹/W)", low: 0.9, high: 1.12, invert: true },
    { key: "irradiation", label: "Solar Generation", low: 0.9, high: 1.08 },
    { key: "tariffEscalation", label: "Tariff Escalation", low: 0.6, high: 1.4 },
    { key: "effectiveTariff", label: "Electricity Tariff", low: 0.9, high: 1.1 },
    { key: "interestRate", label: "Interest Rate", low: 0.8, high: 1.2, invert: true },
    { key: "performanceRatio", label: "Performance Ratio", low: 0.92, high: 1.06 },
  ];
  const base = runProjectModel(baseInputs).metrics.simplePayback || 0;
  return vars.map((v) => {
    const lowM = runProjectModel({ ...baseInputs, [v.key]: baseInputs[v.key] * v.low }).metrics.simplePayback || 0;
    const highM = runProjectModel({ ...baseInputs, [v.key]: baseInputs[v.key] * v.high }).metrics.simplePayback || 0;
    return { label: v.label, base, low: lowM, high: highM, range: Math.abs(highM - lowM) };
  }).sort((a, b) => b.range - a.range);
}

// ---------------------------------------------------------------------------
// 12. FLAT-RATE EMI (flat interest method) + effective (reducing) rate
// Flat EMI = (P + P*flatRate*years) / months. Banks/NBFCs quote both — flat
// looks cheaper but the effective reducing-balance rate is ~1.7-1.9x higher.
// ---------------------------------------------------------------------------
export function calculateFlatRateEMI({ principal, flatRate = 8.5, tenureYears = 7 }) {
  const n = Math.round(tenureYears * 12);
  if (principal <= 0 || n <= 0) return { emi: 0, totalInterest: 0, totalRepayment: 0, n: 0, effectiveRate: 0 };
  const totalInterest = principal * (flatRate / 100) * tenureYears;
  const totalRepayment = principal + totalInterest;
  const emi = totalRepayment / n;
  // Effective reducing rate: monthly IRR of borrower cashflow [+P, -emi x n]
  const flows = [principal, ...Array(n).fill(-emi)];
  const mIrr = calculateIRR(flows);
  const effectiveRate = (mIrr != null ? mIrr : flatRate / 100 / 12) * 12 * 100;
  return { emi, totalInterest, totalRepayment, n, effectiveRate };
}

// ---------------------------------------------------------------------------
// 13. FULL FINANCING PACKAGE — loan, down payment, fees, GST, EMI, schedule
// ---------------------------------------------------------------------------
export function calculateFinancingPackage({
  projectCost, financingPct = 0.8, interestRate = 11, tenureYears = 7,
  processingFeePct = 1, gstOnFeePct = 18, insurancePct = 0.35, flatRate = 8.5,
}) {
  const loanAmount = projectCost * financingPct;
  const downPayment = projectCost - loanAmount;
  const processingFee = loanAmount * (processingFeePct / 100);
  const gstOnFee = processingFee * (gstOnFeePct / 100);
  const insurance = projectCost * (insurancePct / 100);
  const upfront = downPayment + processingFee + gstOnFee + insurance;
  const reducing = calculateLoanEMI({ principal: loanAmount, annualRate: interestRate, tenureYears });
  const amort = calculateAmortization({ principal: loanAmount, annualRate: interestRate, tenureYears });
  const flat = calculateFlatRateEMI({ principal: loanAmount, flatRate, tenureYears });
  return {
    loanAmount, downPayment, processingFee, gstOnFee, insurance, upfront,
    reducing, amort, flat, payoffMonths: reducing.n,
    totalCostOfCredit: reducing.totalInterest + processingFee + gstOnFee + insurance,
  };
}

// ---------------------------------------------------------------------------
// 14. OPERATING LEASE — monthly rental + GST, ownership transfers
// at end of tenure. Rental embeds the effective (reducing) lease rate.
// ---------------------------------------------------------------------------
export function calculateLease({ financeAmount, leaseRate = 9.5, tenureYears = 5, gstPct = 18, annualGeneration = 0 }) {
  const { emi, n } = calculateLoanEMI({ principal: financeAmount, annualRate: leaseRate, tenureYears });
  const rentalExGst = emi;
  const gst = rentalExGst * (gstPct / 100);
  const rentalInclGst = rentalExGst + gst;
  const totalRentalsExGst = rentalExGst * n;
  const totalRentalsInclGst = rentalInclGst * n;
  const rentalPerUnit = annualGeneration > 0 ? (rentalExGst * 12) / annualGeneration : null;
  return { rentalExGst, gst, rentalInclGst, months: n, totalRentalsExGst, totalRentalsInclGst, rentalPerUnit, gstPct, leaseRate };
}
