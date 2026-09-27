import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Section, Card, Btn, Disclaimer, Metric, Pill, Eyebrow } from "@/components/ui-kit";
import { Field, NumberInput, SliderInput, Segmented } from "@/components/Form";
import { BarChartCard, AreaChartCard } from "@/components/Charts";
import { calculateLoanEMI, calculateAmortization } from "@/lib/engine";
import { FINANCING_PRODUCT, DEFAULTS } from "@/data/config";
import { FINANCING_JOURNEY, DOCUMENTS } from "@/data/content";
import { inr, inrCompact } from "@/lib/format";
import { IndianRupee, Percent, Calendar, TrendingUp, FileCheck, ArrowRight } from "lucide-react";

export default function Financing() {
  const [projectCost, setProjectCost] = useState(20000000);
  const [financePct, setFinancePct] = useState(80);
  const [rate, setRate] = useState(DEFAULTS.interestRate);
  const [tenure, setTenure] = useState(DEFAULTS.tenureYears);
  const [processingFee, setProcessingFee] = useState(1);

  const principal = projectCost * (financePct / 100);
  const loan = useMemo(() => calculateLoanEMI({ principal, annualRate: rate, tenureYears: tenure }), [principal, rate, tenure]);
  const amort = useMemo(() => calculateAmortization({ principal, annualRate: rate, tenureYears: tenure }), [principal, rate, tenure]);
  const fee = principal * (processingFee / 100);

  const scenarios = [100, 80, 70].map((p) => {
    const pr = projectCost * (p / 100);
    const l = calculateLoanEMI({ principal: pr, annualRate: rate, tenureYears: tenure });
    return { pct: p, principal: pr, emi: l.emi, interest: l.totalInterest, downPayment: projectCost - pr };
  });

  const amortChart = amort.yearly.map((y) => ({ year: `Y${y.year}`, Principal: y.principal, Interest: y.interest }));
  const balanceChart = amort.yearly.map((y) => ({ year: `Y${y.year}`, balance: y.closingBalance }));

  return (
    <div>
      <PageHeader eyebrow="Solar Financing" title="Solar financing for industrial & commercial projects"
        subtitle="Your solar project doesn't have to wait for upfront capital. Solar Intelligence is a neutral marketplace that matches eligible C&I projects to banks, NBFCs and DFIs — we are not an EPC installer or a single lender.">
        <div className="flex flex-wrap gap-2">
          <Pill tone="amber">{FINANCING_PRODUCT.maxLoan}</Pill>
          <Pill tone="emerald">{FINANCING_PRODUCT.collateralFree}</Pill>
          <Pill tone="blue">{FINANCING_PRODUCT.tenureRange} tenure</Pill>
        </div>
      </PageHeader>

      {/* EMI CALCULATOR */}
      <Section id="calculator" className="py-14">
        <Eyebrow>Loan / EMI Calculator</Eyebrow>
        <h2 className="font-head text-2xl lg:text-3xl font-bold text-slate-50 mt-3 mb-8">Model your EMI, interest & amortization</h2>
        <div className="grid lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-2 space-y-6">
            <Field label="Project cost (₹)"><NumberInput prefix="₹" value={projectCost} onChange={(e) => setProjectCost(Number(e.target.value) || 0)} data-testid="fin-project-cost" /></Field>
            <SliderInput label="Financing share" value={financePct} onChange={setFinancePct} min={50} max={100} step={5} format={(v) => `${v}%`} testId="fin-pct" />
            <SliderInput label="Interest rate (p.a.)" value={rate} onChange={setRate} min={8} max={16} step={0.25} format={(v) => `${v}%`} testId="fin-rate" />
            <SliderInput label="Tenure" value={tenure} onChange={setTenure} min={3} max={10} step={1} format={(v) => `${v} yrs`} testId="fin-tenure" />
            <SliderInput label="Processing fee" value={processingFee} onChange={setProcessingFee} min={0} max={3} step={0.25} format={(v) => `${v}%`} testId="fin-fee" />
            <div className="text-xs text-slate-500 border-t border-white/10 pt-4">Interest rate is configurable and finalized by the financing partner at credit assessment. Values shown are indicative.</div>
          </Card>

          <div className="lg:col-span-3 space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric label="Loan Amount" value={inrCompact(principal)} icon={IndianRupee} tone="amber" testId="fin-loan-amount" />
              <Metric label="Monthly EMI" value={inr(loan.emi)} icon={Calendar} tone="emerald" testId="fin-emi" />
              <Metric label="Total Interest" value={inrCompact(loan.totalInterest)} icon={Percent} tone="blue" />
              <Metric label="Total Repayment" value={inrCompact(loan.totalRepayment)} icon={TrendingUp} />
            </div>
            <Card>
              <div className="flex items-center justify-between mb-4"><h3 className="font-head font-semibold text-slate-100">Principal vs Interest (annual)</h3><span className="text-xs text-slate-500">Processing fee: {inr(fee)}</span></div>
              <BarChartCard data={amortChart} xKey="year" stacked series={[{ key: "Principal", name: "Principal", color: "#10B981" }, { key: "Interest", name: "Interest", color: "#F59E0B" }]} height={240} />
            </Card>
            <Card>
              <h3 className="font-head font-semibold text-slate-100 mb-4">Loan outstanding over time</h3>
              <AreaChartCard data={balanceChart} xKey="year" series={[{ key: "balance", name: "Outstanding", color: "#3B82F6" }]} height={200} />
            </Card>
          </div>
        </div>

        {/* Scenarios */}
        <div className="mt-8">
          <h3 className="font-head font-semibold text-lg text-slate-100 mb-4">Financing scenarios</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {scenarios.map((s) => (
              <Card key={s.pct} className={`!p-5 ${s.pct === financePct ? "border-amber-500/40" : ""}`}>
                <div className="flex items-center justify-between mb-3"><span className="font-semibold text-slate-100">{s.pct}% Financing</span>{s.pct === financePct && <Pill tone="amber">Selected</Pill>}</div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Down payment</dt><dd className="num text-slate-200">{inrCompact(s.downPayment)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Loan</dt><dd className="num text-slate-200">{inrCompact(s.principal)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">EMI</dt><dd className="num text-emerald-400 font-semibold">{inr(s.emi)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Total interest</dt><dd className="num text-amber-400">{inrCompact(s.interest)}</dd></div>
                </dl>
              </Card>
            ))}
          </div>
        </div>
        <Disclaimer className="mt-6">{FINANCING_PRODUCT.disclaimer}</Disclaimer>
      </Section>

      {/* JOURNEY */}
      <Section id="journey" className="py-14 border-t border-white/10">
        <Eyebrow>How financing works</Eyebrow>
        <h2 className="font-head text-2xl lg:text-3xl font-bold text-slate-50 mt-3 mb-8">The solar financing journey</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {FINANCING_JOURNEY.map((s) => (
            <div key={s.step} className="card-surface p-5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center num text-amber-400 font-bold text-sm mb-3">{s.step}</div>
              <div className="font-semibold text-slate-100 text-sm mb-1">{s.title}</div>
              <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* DOCUMENTS */}
      <Section id="documents" className="py-14 border-t border-white/10">
        <div className="flex items-center gap-2 mb-6"><FileCheck className="w-5 h-5 text-amber-400" /><h2 className="font-head font-semibold text-2xl text-slate-100">Documents Required</h2></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DOCUMENTS.map((d) => (
            <Card key={d.group} className="!p-5"><div className="font-semibold text-slate-100 text-sm mb-3">{d.group}</div><ul className="space-y-1.5">{d.items.map((it) => <li key={it} className="text-xs text-slate-400 flex gap-2"><span className="text-amber-500">•</span>{it}</li>)}</ul></Card>
          ))}
        </div>
        <Disclaimer className="mt-6">Not every customer will require every document. The exact list depends on the borrower profile and project, and is confirmed during the financing partner's credit assessment.</Disclaimer>
        <div className="mt-8 flex flex-wrap gap-3">
          <Btn as={Link} to="/calculator">Calculate & apply <ArrowRight className="w-4 h-4" /></Btn>
          <Btn as={Link} to="/financing-partners" variant="secondary">View financing partners</Btn>
          <Btn as={Link} to="/contact" variant="secondary">Request a callback</Btn>
        </div>
      </Section>
    </div>
  );
}
