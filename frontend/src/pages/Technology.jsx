import React from "react";
import { Link } from "react-router-dom";
import { PageHeader, Section, Card, Pill, Disclaimer, Eyebrow, Btn } from "@/components/ui-kit";
import { PANEL_TECH, INVERTER_TYPES, BOS_ITEMS } from "@/data/content";
import { Cpu, Zap, Layers, HardHat, ArrowRight } from "lucide-react";

const EPC_STEPS = ["Site Survey", "Load Analysis", "Roof/Structural Assessment", "Shadow Analysis", "System Design & Engineering", "Procurement (ALMM)", "Civil Work", "Structure Installation", "Module Installation", "Inverter Installation", "Cabling & Earthing", "Transformer / Grid Connection", "Testing & Commissioning", "Monitoring & O&M"];

export default function Technology() {
  return (
    <div>
      <PageHeader eyebrow="Solar Technology Knowledge Centre" title="Panels, inverters, balance-of-system & the EPC process"
        subtitle="A practical, jargon-light guide to the technology behind a bankable C&I solar plant." />

      <Section id="panels" className="py-12">
        <div className="flex items-center gap-2 mb-6"><Cpu className="w-5 h-5 text-amber-400" /><h2 className="font-head font-semibold text-2xl text-slate-100">Solar Panels</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-800 rounded-lg overflow-hidden">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider font-mono">
              <tr>{["Technology", "Efficiency", "Degradation", "Temp Coeff", "Warranty", "Notes"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {PANEL_TECH.map((p) => (
                <tr key={p.name} className="border-t border-slate-800 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-slate-100">{p.name}</td>
                  <td className="px-4 py-3 num text-emerald-400">{p.efficiency}</td>
                  <td className="px-4 py-3 num text-slate-300">{p.degradation}</td>
                  <td className="px-4 py-3 num text-slate-300">{p.tempCoeff}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{p.warranty}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-xs">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="inverters" className="py-12">
        <div className="flex items-center gap-2 mb-6"><Zap className="w-5 h-5 text-amber-400" /><h2 className="font-head font-semibold text-2xl text-slate-100">Inverters</h2></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {INVERTER_TYPES.map((i) => (
            <Card key={i.name} className="!p-5"><div className="font-semibold text-slate-100 mb-1">{i.name}</div><Pill tone="blue">η {i.efficiency}</Pill><div className="text-xs text-slate-500 mt-3 mb-2">Best for: {i.use}</div><p className="text-xs text-slate-400 leading-relaxed">{i.note}</p></Card>
          ))}
        </div>
      </Section>

      <Section id="bos" className="py-12">
        <div className="flex items-center gap-2 mb-6"><Layers className="w-5 h-5 text-amber-400" /><h2 className="font-head font-semibold text-2xl text-slate-100">Balance of System (BoS)</h2></div>
        <Card>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BOS_ITEMS.map((b) => <div key={b} className="flex items-center gap-2 text-sm text-slate-300"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{b}</div>)}
          </div>
        </Card>
      </Section>

      <Section id="epc-guide" className="py-12">
        <div className="flex items-center gap-2 mb-6"><HardHat className="w-5 h-5 text-amber-400" /><h2 className="font-head font-semibold text-2xl text-slate-100">EPC / Construction Guide</h2></div>
        <div className="relative">
          <div className="grid md:grid-cols-2 lg:grid-cols-7 gap-3">
            {EPC_STEPS.map((s, i) => (
              <div key={s} className="card-surface p-4 relative">
                <div className="num text-amber-500/40 text-xl font-bold">{String(i + 1).padStart(2, "0")}</div>
                <div className="text-xs text-slate-300 mt-1 leading-snug">{s}</div>
              </div>
            ))}
          </div>
        </div>
        <Disclaimer className="mt-6">Modules must be ALMM List-I. For net-metering and open-access projects, ALMM List-II cells are mandatory for projects commissioned on or after 1 January 2027 (MNRE OM, 18-Jul-2026). Confirm equipment compliance during procurement.</Disclaimer>
        <div className="mt-6"><Btn as={Link} to="/calculator">Size your system <ArrowRight className="w-4 h-4" /></Btn></div>
      </Section>
    </div>
  );
}
