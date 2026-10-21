import React from "react";
import { Pill } from "@/components/ui-kit";
import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

const SourceLink = ({ d }) => d.sourceUrl ? (
  <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline underline-offset-2" data-testid={`discom-source-link-${d.id}`}>
    {d.source} <ExternalLink className="w-3 h-3" />
  </a>
) : <span>{d.source}</span>;

// Calculator: explains exactly what the auto-filled tariff contains.
export const DiscomTariffNote = ({ d }) => {
  if (typeof d.ciTariff !== "number") {
    return (
      <div className="flex gap-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5" data-testid="discom-tariff-unverified">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>{d.note || `We haven't verified ${d.name}'s FY 2026-27 HT tariff yet.`} Enter the average rate from your bill (total bill ÷ units) in the next step. <span className="text-slate-400">Source: <SourceLink d={d} /></span></div>
      </div>
    );
  }
  return (
    <div className="text-xs text-emerald-300 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2.5 space-y-1" data-testid="discom-tariff-note">
      <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Auto-filled <span className="num font-semibold">₹{d.ciTariff}/kWh</span> = {d.ciBasis}.</div>
      <div className="text-slate-400">Not included: {d.excludes}.{d.tod ? ` ToD: ${d.tod}.` : ""} For the most accurate result, use your bill's average rate (total bill ÷ units).</div>
      <div className="text-slate-500 text-[11px]">Source: <SourceLink d={d} /> · effective {d.effectiveFrom} · verified {d.lastVerified}</div>
    </div>
  );
};

// Directory / state pages: base rates or a clear "not verified" marker.
export const DiscomRatePills = ({ d }) => (
  <div className="flex flex-wrap gap-2">
    {d.verified ? (
      <>
        <Pill tone="emerald">Energy ₹{d.energyChargeHT}/{d.energyUnit}</Pill>
        <Pill tone="amber">Demand ₹{d.demandCharge}/{d.demandUnit}</Pill>
        {typeof d.ciTariff === "number" && <Pill tone="blue">≈ ₹{d.ciTariff}/kWh landed</Pill>}
      </>
    ) : <Pill tone="slate">FY 2026-27 rates not yet verified</Pill>}
  </div>
);
