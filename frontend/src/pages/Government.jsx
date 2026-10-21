import React, { useState } from "react";
import { PageHeader, Section, Card, Pill, Disclaimer, SourceTag, Eyebrow } from "@/components/ui-kit";
import { Select } from "@/components/Form";
import { INCENTIVES, evaluateEligibility } from "@/data/incentives";
import { CheckCircle2, HelpCircle, XCircle, Landmark, Receipt } from "lucide-react";

const CAT_TONE = { CENTRAL: "blue", STATE: "emerald", DISCOM: "amber", REGULATORY: "violet", TAX: "amber", FINANCIAL: "emerald", ENVIRONMENTAL: "emerald" };

function IncentiveCard({ inc, reason }) {
  return (
    <Card className="!p-5" data-testid={`incentive-${inc.id}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-slate-100 text-[15px] leading-snug">{inc.name}</h3>
        <Pill tone={CAT_TONE[inc.category] || "slate"}>{inc.category}</Pill>
      </div>
      <div className="text-[11px] text-slate-500 mb-3">{inc.authority} · {inc.state}</div>
      <p className="text-sm text-slate-300 leading-relaxed">{inc.benefit}</p>
      {inc.eligibility && <p className="text-xs text-slate-500 mt-2"><span className="text-slate-400 font-medium">Eligibility:</span> {inc.eligibility}</p>}
      {reason && <div className="mt-3 text-xs text-amber-400/90 bg-amber-500/5 border border-amber-500/15 rounded-md px-3 py-2">{reason}</div>}
      {inc.note && <p className="text-[11px] text-slate-500 mt-3 italic">{inc.note}</p>}
      <SourceTag className="mt-3 pt-3 border-t border-white/5" source={inc.source} effective={inc.effectiveFrom} verified={inc.lastVerified} />
    </Card>
  );
}

export default function Government() {
  const [ctx, setCtx] = useState({ consumerType: "Industrial", projectType: "CAPEX", capacityKw: 500, installationType: "Rooftop" });
  const elig = evaluateEligibility(ctx);
  return (
    <div>
      <PageHeader eyebrow="Government Benefits & Incentives" title="Incentives, eligibility & tax"
        subtitle="For C&I customers there is no direct central capital subsidy — the key levers are Accelerated Depreciation, Green Open Access, GST treatment and state incentives. Check what may apply to you." />

      {/* Eligibility engine */}
      <Section className="py-10">
        <Card>
          <div className="flex items-center gap-2 mb-5"><Landmark className="w-5 h-5 text-amber-400" /><h2 className="font-head font-semibold text-xl text-slate-100">Eligibility Summary</h2></div>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div><label className="block text-xs text-slate-400 mb-1.5">Consumer type</label><Select value={ctx.consumerType} onChange={(e) => setCtx({ ...ctx, consumerType: e.target.value })} options={["Industrial", "Commercial", "Residential"]} data-testid="elig-consumer" /></div>
            <div><label className="block text-xs text-slate-400 mb-1.5">Project model</label><Select value={ctx.projectType} onChange={(e) => setCtx({ ...ctx, projectType: e.target.value })} options={["CAPEX", "OPEX", "Captive", "Open Access", "PPA"]} data-testid="elig-project" /></div>
            <div><label className="block text-xs text-slate-400 mb-1.5">Capacity / load (kW)</label><Select value={String(ctx.capacityKw)} onChange={(e) => setCtx({ ...ctx, capacityKw: Number(e.target.value) })} options={["50", "100", "250", "500", "1000", "5000"]} data-testid="elig-capacity" /></div>
            <div><label className="block text-xs text-slate-400 mb-1.5">Installation</label><Select value={ctx.installationType} onChange={(e) => setCtx({ ...ctx, installationType: e.target.value })} options={["Rooftop", "Ground Mounted", "Carport", "Mixed"]} data-testid="elig-install" /></div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[["Potentially Eligible", elig.eligible, "emerald", CheckCircle2], ["Requires Verification", elig.verify, "amber", HelpCircle], ["Not Eligible", elig.notEligible, "danger", XCircle]].map(([title, list, tone, Icon]) => (
              <div key={title} className={`rounded-lg border p-4 bg-${tone === "danger" ? "red" : tone}-500/5 border-${tone === "danger" ? "red" : tone}-500/20`}>
                <div className={`flex items-center gap-2 text-sm font-semibold text-${tone === "danger" ? "red" : tone}-400 mb-3`}><Icon className="w-4 h-4" /> {title} ({list.length})</div>
                <ul className="space-y-2">
                  {list.map((x) => <li key={x.id} className="text-xs text-slate-300"><span className="font-medium">{x.name}</span><br /><span className="text-slate-500">{x.reason}</span></li>)}
                  {list.length === 0 && <li className="text-xs text-slate-600">None</li>}
                </ul>
              </div>
            ))}
          </div>
          <Disclaimer className="mt-5">This is an indicative eligibility screen, not an entitlement. Government incentive eligibility is subject to applicable rules and approval by the relevant authority.</Disclaimer>
        </Card>
      </Section>

      {/* All incentives */}
      <Section className="py-6">
        <Eyebrow>All Incentives & Provisions</Eyebrow>
        <h2 className="font-head text-2xl font-bold text-slate-50 mt-3 mb-6">Source-tagged benefits database</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {INCENTIVES.map((inc) => <IncentiveCard key={inc.id} inc={inc} />)}
        </div>
      </Section>

      {/* GST / Tax */}
      <Section id="tax" className="py-14">
        <Card>
          <div className="flex items-center gap-2 mb-5"><Receipt className="w-5 h-5 text-amber-400" /><h2 className="font-head font-semibold text-2xl text-slate-100">GST & Tax Information Centre</h2></div>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              {[
                ["GST on solar equipment", "Since 22-Sep-2025, solar PV modules, cells and solar power generating devices attract 5% GST (earlier 12%). Solar EPC contracts are valued 70% goods at 5% and 30% services at 18% — an effective ≈8.9% on the contract value. Registered businesses may claim Input Tax Credit subject to conditions."],
                ["Accelerated Depreciation", "Under the Income-tax Act, 2025 (in force from 1-Apr-2026), solar power generating systems owned by the business (CAPEX/Captive) are depreciated at 40% of written-down value — 20% if used for less than 180 days in the first year. Not available to the customer under OPEX, where the developer owns the asset."],
              ].map(([t, d]) => (
                <div key={t}><div className="font-semibold text-slate-100 mb-1">{t}</div><p className="text-slate-400 leading-relaxed">{d}</p></div>
              ))}
            </div>
            <div className="space-y-4">
              {[
                ["Capital expenditure treatment", "The solar plant is capitalized as a fixed asset; depreciation is claimed over its life with the accelerated first-year benefit where applicable."],
                ["O&M and financing costs", "O&M expenses are generally revenue in nature; interest on solar financing is typically a deductible business expense — confirm treatment with your tax advisor."],
              ].map(([t, d]) => (
                <div key={t}><div className="font-semibold text-slate-100 mb-1">{t}</div><p className="text-slate-400 leading-relaxed">{d}</p></div>
              ))}
            </div>
          </div>
          <Disclaimer className="mt-6">Indicative information only. GST rates and tax treatment change periodically and depend on your specific facts. Tax treatment should be confirmed with a qualified tax professional.</Disclaimer>
          <SourceTag className="mt-3" source="CBIC Notification 9/2025-CT(Rate) (5% GST from 22-Sep-2025) / Income-tax Act, 2025" verified="2026-10-21" />
        </Card>
      </Section>
    </div>
  );
}
