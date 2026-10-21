import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Section, Card, Pill, Disclaimer, SourceTag } from "@/components/ui-kit";
import { TextInput } from "@/components/Form";
import { STATES, DATA_META } from "@/data/states";
import { stateTariffRange } from "@/data/discoms";
import { num } from "@/lib/format";
import { Search, ArrowRight, MapPin } from "lucide-react";

export default function StatesDB() {
  const [q, setQ] = useState("");
  const filtered = STATES.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.clusters.join(" ").toLowerCase().includes(q.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => b.installedMw - a.installedMw);
  return (
    <div>
      <PageHeader eyebrow="India Solar Database" title="State-wise solar profiles"
        subtitle="Irradiation, installed capacity, verified HT tariffs, DISCOMs, open-access rules and industrial clusters for every state and union territory — each figure linked to its source." />
      <Section className="py-10">
        <div className="max-w-md mb-8 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <TextInput placeholder="Search state or cluster (e.g. Gujarat, Morbi)" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" data-testid="state-search" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((s) => (
            <Link key={s.code} to={`/solar/state/${s.code}`} className="card-surface p-6 hover:border-amber-500/40 transition-all group" data-testid={`state-card-${s.code}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-400/70" /><span className="font-head font-semibold text-lg text-slate-100 group-hover:text-amber-400">{s.name}</span></div>
                <span className="num text-xs text-slate-600">{s.code}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Installed</div><div className="num font-bold text-amber-400">{num(s.installedMw)} MW</div></div>
                <div><div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Irradiation</div><div className="num font-bold text-blue-400">{s.irradiation}</div></div>
                <div><div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">HT Tariff</div><div className={`num font-bold ${stateTariffRange(s.name) ? "text-emerald-400" : "text-slate-500 text-xs pt-1"}`}>{stateTariffRange(s.name) || "Not verified"}</div></div>
                <div><div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">DISCOMs</div><div className="num font-bold text-slate-200">{s.discoms.length}</div></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {s.clusters.slice(0, 3).map((c) => <Pill key={c} tone="slate">{c}</Pill>)}
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-500/80 font-medium">Full profile <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></div>
            </Link>
          ))}
        </div>
        <Disclaimer className="mt-8">{DATA_META.disclaimer}</Disclaimer>
        <SourceTag className="mt-3" source={`Capacity: ${DATA_META.capacitySource} · Irradiation: ${DATA_META.irradiationSource} · Tariffs: SERC tariff orders (see DISCOM directory)`} verified={DATA_META.lastVerified} />
      </Section>
    </div>
  );
}
