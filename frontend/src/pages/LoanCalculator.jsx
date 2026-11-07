import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Section, Card, Btn, Disclaimer } from "@/components/ui-kit";
import { Field, NumberInput } from "@/components/Form";
import { compareFinance } from "@/lib/loanMath";
import { saveActivity, errMsg } from "@/lib/api";
import { inr, inrCompact } from "@/lib/format";
import { Save, Trophy } from "lucide-react";

const INIT = {
  amount: "5000000", tenureMonths: "60", reducingRate: "11", flatRate: "7", leaseRate: "10.5", residualPct: "5",
  processingPct: "1", processingGstPct: "18", insuranceAmt: "", insuranceGstPct: "18", leaseGstPct: "18",
};

const GROUPS = [
  ["Loan basics", [["amount", "Amount to finance (₹) *", "₹"], ["tenureMonths", "Tenure (months) *", null, "months"]]],
  ["Interest rates", [["reducingRate", "Reducing-balance rate (% p.a.)", null, "%"], ["flatRate", "Flat rate (% p.a.)", null, "%"]]],
  ["Leasing", [["leaseRate", "Lease rate (% p.a.)", null, "%"], ["residualPct", "End-of-lease value (% of cost)", null, "%"], ["leaseGstPct", "GST on lease rental", null, "%"]]],
  ["Fees (optional)", [["processingPct", "Processing fee (% of amount)", null, "%"], ["processingGstPct", "GST on processing fee", null, "%"], ["insuranceAmt", "Insurance (one-time ₹)", "₹"], ["insuranceGstPct", "GST on insurance", null, "%"]]],
];

const COLS = [["reducing", "Term loan — reducing"], ["flat", "Term loan — flat rate"], ["lease", "Operating lease"]];

function Row({ label, values, strong, testId }) {
  return (
    <div className={`grid grid-cols-[1.3fr_repeat(3,1fr)] gap-3 py-2.5 border-b border-white/5 text-sm ${strong ? "font-semibold text-slate-100" : "text-slate-300"}`} data-testid={testId}>
      <div className="text-slate-400 font-normal">{label}</div>
      {values.map((v, i) => <div key={i} className="num text-right">{v}</div>)}
    </div>
  );
}

function Comparison({ r }) {
  const v = (fn) => COLS.map(([k]) => fn(r[k]));
  const rate = (x) => (x.effectiveRate == null ? "—" : `${x.effectiveRate.toFixed(2)}%`);
  return (
    <Card className="overflow-x-auto" data-testid="loan-comparison">
      <div className="min-w-[620px]">
        <div className="grid grid-cols-[1.3fr_repeat(3,1fr)] gap-3 pb-3 border-b border-white/10">
          <div />
          {COLS.map(([k, t]) => (
            <div key={k} className={`text-right text-xs font-semibold uppercase tracking-wider ${r.cheapest === k ? "text-emerald-400" : "text-slate-400"}`} data-testid={`loan-col-${k}`}>
              {r.cheapest === k && <Trophy className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}{t}
            </div>
          ))}
        </div>
        <Row label="Monthly payment" values={v((x) => inr(x.monthly))} strong testId="loan-row-monthly" />
        <Row label="Interest / finance charge" values={v((x) => inrCompact(x.financeCharge))} testId="loan-row-interest" />
        <Row label="GST on rentals (total)" values={v((x) => (x.gstTotal ? inrCompact(x.gstTotal) : "—"))} testId="loan-row-rental-gst" />
        <Row label="Upfront fees incl. GST" values={v((x) => inrCompact(x.upfront))} testId="loan-row-fees" />
        <Row label="End-of-lease buyout" values={v((x) => (x.endPayment ? inrCompact(x.endPayment) : "—"))} testId="loan-row-residual" />
        <Row label="Total you pay" values={v((x) => inrCompact(x.totalPayable))} strong testId="loan-row-total" />
        <Row label="Effective annual cost" values={v(rate)} strong testId="loan-row-effective" />
      </div>
      <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
        Effective annual cost includes fees, GST and the buyout, so the options compare fairly. A flat rate looks lower but costs more because interest is charged on the full amount for the whole tenure.
        GST on lease rentals is usually claimable as input tax credit by GST-registered businesses.
      </p>
    </Card>
  );
}

export default function LoanCalculator() {
  const [f, setF] = useState(INIT);
  const r = useMemo(() => compareFinance(f), [f]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!r) return;
    setSaving(true);
    try {
      await saveActivity("loan_calc", `${inrCompact(r.P)} over ${r.n} months`, f, {
        amount: r.P, months: r.n, cheapest: r.cheapest,
        reducingEmi: Math.round(r.reducing.monthly), flatEmi: Math.round(r.flat.monthly), leaseRental: Math.round(r.lease.monthly),
      });
      toast.success("Comparison saved to your account.");
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <div data-testid="loan-calculator-page">
      <div className="border-b border-white/10 bg-[#0D1B2A] hero-radial">
        <Section className="py-8 lg:py-10">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-amber-500 mb-2"><span className="w-6 h-px bg-amber-500/60" />Loan & Lease Calculator</div>
          <h1 className="font-head text-2xl lg:text-3xl font-extrabold text-slate-50">Reducing vs flat interest vs lease — side by side</h1>
          <p className="text-sm text-slate-500 mt-1">Change any number and the comparison updates instantly. Leave a fee empty if it doesn't apply.</p>
        </Section>
      </div>
      <Section className="py-8">
        <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
          <Card className="space-y-6" data-testid="loan-inputs">
            {GROUPS.map(([title, fields]) => (
              <div key={title}>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-3">{title}</div>
                <div className="grid grid-cols-2 gap-3">
                  {fields.map(([k, label, prefix, suffix]) => (
                    <div key={k} className={k === "amount" ? "col-span-2" : ""}>
                      <Field label={label}><NumberInput value={f[k]} prefix={prefix || undefined} suffix={suffix || undefined} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder="0" data-testid={`loan-input-${k}`} /></Field>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
          <div className="space-y-4 min-w-0">
            {r ? <Comparison r={r} /> : <Card className="text-sm text-slate-400" data-testid="loan-empty">Enter the amount and tenure to compare options.</Card>}
            {r && <Btn onClick={save} disabled={saving} data-testid="loan-save-btn"><Save className="w-4 h-4" /> Save this comparison</Btn>}
            <Disclaimer>Indicative only. Actual rates, fees, GST treatment and lease structure depend on the lender's credit assessment and documents.</Disclaimer>
          </div>
        </div>
      </Section>
    </div>
  );
}
