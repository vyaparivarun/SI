// Loan & lease maths. Empty / invalid optional fields count as 0.
const n0 = (v) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};

export function pmt(i, n, pv, fv = 0) {
  if (!i) return (pv - fv) / n;
  return ((pv - fv / Math.pow(1 + i, n)) * i) / (1 - Math.pow(1 + i, -n));
}

// Effective annual cost from monthly cash flows (flows[0] = money received today).
function effectiveAnnual(flows) {
  const npv = (r) => flows.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
  let lo = -0.99, hi = 1;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid;
  }
  return (Math.pow(1 + (lo + hi) / 2, 12) - 1) * 100;
}

function option({ P, n, monthly, upfront, endPayment = 0, financeCharge, extra = {} }) {
  const flows = [P - upfront, ...Array(n).fill(-monthly)];
  flows[n] -= endPayment;
  return {
    monthly, months: n, financeCharge, upfront, endPayment,
    totalPayable: monthly * n + endPayment + upfront,
    effectiveRate: effectiveAnnual(flows), ...extra,
  };
}

export function compareFinance(inp) {
  const P = n0(inp.amount);
  const n = Math.round(n0(inp.tenureMonths));
  if (!P || !n) return null;
  const procFee = (P * n0(inp.processingPct)) / 100;
  const procGst = (procFee * n0(inp.processingGstPct)) / 100;
  const ins = n0(inp.insuranceAmt);
  const insGst = (ins * n0(inp.insuranceGstPct)) / 100;
  const upfront = procFee + procGst + ins + insGst;
  const fees = { procFee, procGst, ins, insGst, upfront };

  const r = n0(inp.reducingRate) / 1200;
  const emiR = pmt(r, n, P);
  const reducing = option({ P, n, monthly: emiR, upfront, financeCharge: emiR * n - P });

  const flatInterest = (P * n0(inp.flatRate) * n) / 1200;
  const flat = option({ P, n, monthly: (P + flatInterest) / n, upfront, financeCharge: flatInterest });

  const i = n0(inp.leaseRate) / 1200;
  const residual = (P * n0(inp.residualPct)) / 100;
  const rentBase = pmt(i, n, P, residual);
  const rentGst = (rentBase * n0(inp.leaseGstPct)) / 100;
  const lease = option({
    P, n, monthly: rentBase + rentGst, upfront, endPayment: residual,
    financeCharge: rentBase * n + residual - P, extra: { rentBase, rentGst, residual, gstTotal: rentGst * n },
  });

  const rows = { reducing, flat, lease };
  const cheapest = Object.entries(rows).sort((a, b) => a[1].totalPayable - b[1].totalPayable)[0][0];
  return { P, n, fees, ...rows, cheapest };
}
