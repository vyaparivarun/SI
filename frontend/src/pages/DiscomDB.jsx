import React, { useState } from "react";
import { PageHeader, Section, Card, Disclaimer } from "@/components/ui-kit";
import { TextInput, Select } from "@/components/Form";
import { DISCOMS, TARIFF_VERIFIED_ON } from "@/data/discoms";
import { DiscomRatePills } from "@/components/DiscomTariff";
import { STATES } from "@/data/states";
import { Search, ExternalLink } from "lucide-react";

export default function DiscomDB() {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const filtered = DISCOMS.filter((d) =>
    (!q || d.name.toLowerCase().includes(q.toLowerCase()) || d.coverage.toLowerCase().includes(q.toLowerCase())) &&
    (!state || d.state === state));
  return (
    <div>
      <PageHeader eyebrow="DISCOM Directory" title="Distribution utility database"
        subtitle={`HT industrial tariffs for FY 2026-27 with a link to each tariff order (checked ${TARIFF_VERIFIED_ON}), plus metering, open access and banking notes. DISCOMs we couldn't verify are clearly marked.`} />
      <Section className="py-10">
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
            <TextInput placeholder="Search DISCOM or coverage area" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" data-testid="discom-search" />
          </div>
          <div className="w-56">
            <Select value={state} onChange={(e) => setState(e.target.value)} placeholder="All states"
              options={[{ value: "", label: "All states" }, ...STATES.map((s) => s.name)]} data-testid="discom-state-filter" />
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((d) => (
            <Card key={d.id} className="!p-0 overflow-hidden" data-testid={`discom-row-${d.id}`}>
              <div className="p-5 lg:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-head font-semibold text-lg text-slate-100">{d.name}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">{d.state} · {d.coverage}</div>
                  </div>
                  <DiscomRatePills d={d} />
                </div>
                {(d.energyNote || d.demandNote || d.tod || d.ciBasis || d.note) && (
                  <div className="text-xs text-slate-400 space-y-1 mb-4" data-testid={`discom-notes-${d.id}`}>
                    {d.energyNote && <div><span className="text-slate-500">Energy slabs:</span> {d.energyNote}</div>}
                    {d.demandNote && <div><span className="text-slate-500">Demand slabs:</span> {d.demandNote}</div>}
                    {d.ciBasis && <div><span className="text-slate-500">Landed rate:</span> {d.ciBasis} (excl. {d.excludes})</div>}
                    {d.tod && <div><span className="text-slate-500">Time-of-day:</span> {d.tod}</div>}
                    {d.note && <div className="text-amber-300">{d.note}</div>}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  {[["Net Metering", d.netMetering], ["Open Access", d.openAccess], ["Banking", d.banking], ["Wheeling", d.wheeling], ["Cross Subsidy Surcharge", d.css], ["Gross Metering", d.grossMetering]].map(([k, v]) => (
                    <div key={k}><div className="text-[10px] uppercase tracking-wider text-slate-600 font-mono mb-0.5">{k}</div><div className="text-slate-300">{v}</div></div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500 mt-4 pt-3 border-t border-white/5">
                  {d.sourceUrl
                    ? <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber-400/90 hover:text-amber-300" data-testid={`discom-source-link-${d.id}`}>Source: {d.source} <ExternalLink className="w-3 h-3" /></a>
                    : <span>Source: {d.source}</span>}
                  {d.effectiveFrom && <span>Effective: {d.effectiveFrom}</span>}
                  {d.lastVerified && <span>Verified: {d.lastVerified}</span>}
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <div className="text-center text-slate-500 py-12">No DISCOMs match your filters.</div>}
        </div>
        <Disclaimer className="mt-8">Base rates are the most common HT-industrial slab from each SERC tariff order. Real bills add fuel/power-purchase surcharges (revised monthly or quarterly), electricity duty, demand charges and ToD adjustments. “Landed rate” includes only the components listed. Always confirm against your latest bill.</Disclaimer>
      </Section>
    </div>
  );
}
