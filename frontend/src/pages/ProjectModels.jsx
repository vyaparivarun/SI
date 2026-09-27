import React from "react";
import { Link } from "react-router-dom";
import { PageHeader, Section, Card, Pill, Disclaimer, Btn } from "@/components/ui-kit";
import { PROJECT_MODELS } from "@/data/content";
import { ArrowRight } from "lucide-react";

export default function ProjectModels() {
  return (
    <div>
      <PageHeader eyebrow="Project & Financing Models" title="CAPEX, OPEX, PPA, Captive & Open Access"
        subtitle="Ownership, capital, savings and risk differ sharply across models. Choose the one that matches your balance sheet, tax position and appetite." />

      <Section className="py-12">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-800 rounded-lg overflow-hidden min-w-[820px]">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider font-mono">
              <tr>{["Model", "Ownership", "Capital", "Savings", "Key Risk", "Best For"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {PROJECT_MODELS.map((m) => (
                <tr key={m.key} className="border-t border-slate-800 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-amber-400">{m.key}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{m.ownership}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{m.capex}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{m.savings}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{m.risk}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{m.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section className="py-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROJECT_MODELS.map((m) => (
            <Card key={m.key} id={m.key.toLowerCase().replace(/[^a-z]+/g, "-")} className="scroll-mt-24">
              <div className="flex items-center gap-2 mb-3"><h3 className="font-head font-semibold text-xl text-slate-100">{m.key}</h3></div>
              <p className="text-sm text-slate-400 leading-relaxed">{m.note}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Pill tone="emerald">Savings: {m.savings.split("—")[0]}</Pill>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="py-14">
        <Card className="hero-radial">
          <h3 className="font-head font-semibold text-xl text-slate-100 mb-2">Not sure which model fits?</h3>
          <p className="text-sm text-slate-400 mb-4 max-w-2xl">The calculator lets you compare CAPEX (with financing) against no-solar and different financing shares, so you can see cash flow, payback and returns for each.</p>
          <div className="flex flex-wrap gap-3">
            <Btn as={Link} to="/calculator">Compare in calculator <ArrowRight className="w-4 h-4" /></Btn>
            <Btn as={Link} to="/financing" variant="secondary">See financing options</Btn>
          </div>
        </Card>
        <Disclaimer className="mt-6">Captive and group-captive models must satisfy the ≥26% equity / ≥51% consumption norms to retain captive status and related exemptions. Open-access economics depend on state wheeling, banking, cross-subsidy and additional surcharges.</Disclaimer>
      </Section>
    </div>
  );
}
