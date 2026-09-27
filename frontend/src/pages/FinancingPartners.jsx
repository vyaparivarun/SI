import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Section, Card, Btn, Disclaimer, Pill, Eyebrow } from "@/components/ui-kit";
import { FINANCING_PARTNERS, PARTNER_TYPES } from "@/data/partners";
import { Landmark, Percent, Calendar, ShieldCheck, ArrowRight, Building2 } from "lucide-react";

const TONE = { DFI: "emerald", Bank: "blue", NBFC: "amber", Scheme: "violet" };

export default function FinancingPartners() {
  const [filter, setFilter] = useState("All");
  const partners = filter === "All" ? FINANCING_PARTNERS : FINANCING_PARTNERS.filter((p) => p.type === filter);

  return (
    <div>
      <PageHeader eyebrow="Marketplace · Financing Partners" title="Solar financing partners across India"
        subtitle="Solar Intelligence is a neutral marketplace. We connect your project to the right lender — banks, NBFCs, DFIs and guarantee schemes financing C&I solar. Rates, tenure and terms are indicative and finalised by each partner at credit assessment.">
        <div className="flex flex-wrap gap-2">
          <Pill tone="emerald"><ShieldCheck className="w-3 h-3" /> Source-tagged</Pill>
          <Pill tone="amber">{FINANCING_PARTNERS.length} partners listed</Pill>
        </div>
      </PageHeader>

      <Section className="py-10">
        <div className="flex flex-wrap gap-2 mb-8" data-testid="finpartner-filters">
          {PARTNER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              data-testid={`finpartner-filter-${t.toLowerCase()}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${filter === t ? "bg-amber-500 text-slate-950 border-amber-500" : "bg-slate-900/60 text-slate-300 border-slate-800 hover:border-amber-500/40"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="finpartner-grid">
          {partners.map((p) => (
            <Card key={p.name} className="flex flex-col" data-testid={`finpartner-card-${p.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"><Landmark className="w-5 h-5 text-amber-400" /></div>
                  <div>
                    <div className="font-head font-semibold text-slate-100 leading-tight">{p.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{p.full}</div>
                  </div>
                </div>
                <Pill tone={TONE[p.type] || "slate"}>{p.type}</Pill>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="bg-white/[0.03] border border-white/8 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1"><Percent className="w-3 h-3" /> Rate</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1">{p.rateLabel}</div>
                </div>
                <div className="bg-white/[0.03] border border-white/8 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1"><Calendar className="w-3 h-3" /> Tenure</div>
                  <div className="text-sm font-semibold text-slate-200 mt-1">{p.tenure}</div>
                </div>
              </div>

              <dl className="space-y-2 text-xs mb-4">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Coverage</dt><dd className="text-slate-300 text-right">{p.ltv}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Ticket</dt><dd className="text-slate-300 text-right">{p.ticket}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Collateral</dt><dd className="text-slate-300 text-right">{p.collateral}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Best for</dt><dd className="text-slate-300 text-right">{p.best}</dd></div>
              </dl>

              <p className="text-xs text-slate-400 leading-relaxed">{p.note}</p>
              <div className="mt-auto pt-3 text-[10px] text-slate-600 font-mono">{p.source}</div>
            </Card>
          ))}
        </div>

        <Card className="hero-radial mt-10">
          <div className="grid lg:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="font-head font-semibold text-xl text-slate-100 mb-2">Not sure which lender fits your project?</h3>
              <p className="text-sm text-slate-400">Run the calculator to size your project and estimate EMI, then submit a single assessment — we match it to the most suitable financing partners.</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Btn as={Link} to="/calculator">Calculate & apply <ArrowRight className="w-4 h-4" /></Btn>
              <Btn as={Link} to="/epc-partners" variant="secondary"><Building2 className="w-4 h-4" /> View EPC partners</Btn>
            </div>
          </div>
        </Card>

        <Disclaimer className="mt-6">Partner list is indicative and not exhaustive; inclusion is not an endorsement. Rates, tenure, coverage and eligibility are set by each financing partner and finalised at credit assessment. Verify current terms with the partner before any financial decision.</Disclaimer>
      </Section>
    </div>
  );
}
