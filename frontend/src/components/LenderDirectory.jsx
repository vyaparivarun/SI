import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, Pill } from "@/components/ui-kit";
import { Select, TextInput } from "@/components/Form";
import { STATES } from "@/data/states";
import { LENDERS, LENDER_TYPES, SEGMENTS, STATUS, LENDER_META, coversState, isStateSpecific } from "@/data/lenders";
import { MapPin, ExternalLink, Search, Landmark } from "lucide-react";

const STATE_NAME = Object.fromEntries(STATES.map((s) => [s.code, s.name]));
const STATE_OPTIONS = [{ value: "ALL", label: "All of India" }, ...STATES.map((s) => ({ value: s.code, label: s.name }))];
const TYPE_OPTIONS = [{ value: "ALL", label: "All lender types" }, ...LENDER_TYPES.map((t) => ({ value: t, label: t }))];
const SEGMENT_OPTIONS = [{ value: "ALL", label: "All project types" }, ...Object.entries(SEGMENTS).map(([value, label]) => ({ value, label }))];

const coverageLabel = (l) => (isStateSpecific(l) ? l.coverage.map((c) => STATE_NAME[c] || c).join(", ") : "Pan-India");

const LenderCard = ({ l }) => (
  <Card className="flex flex-col min-w-0 !p-5" data-testid={`lender-card-${l.id}`}>
    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
      <div className="min-w-0">
        <div className="font-head font-semibold text-slate-100 leading-tight">{l.name}</div>
        {l.full && <div className="text-[11px] text-slate-500 mt-0.5">{l.full}</div>}
      </div>
      <Pill tone={STATUS[l.status].tone}>{STATUS[l.status].label}</Pill>
    </div>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mb-3">
      <span className="text-amber-400/90 font-medium">{l.type}</span>
      {l.hq && <span>HQ {l.hq}</span>}
      <span className="inline-flex items-center gap-1" data-testid={`lender-coverage-${l.id}`}><MapPin className="w-3 h-3" />{coverageLabel(l)}</span>
    </div>
    <p className="text-sm text-slate-300 leading-relaxed break-words">{l.product}</p>
    {l.terms && <p className="text-xs text-slate-400 mt-2 leading-relaxed"><span className="text-slate-500">Published terms: </span>{l.terms}</p>}
    {l.coverageNote && <p className="text-[11px] text-slate-500 mt-2">{l.coverageNote}</p>}
    <div className="flex flex-wrap gap-1.5 mt-3">
      {l.segments.map((s) => <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400">{SEGMENTS[s]}</span>)}
    </div>
    <div className="mt-auto pt-3 text-[10px] font-mono text-slate-600 flex items-center justify-between gap-2">
      <span className="truncate min-w-0">{l.source}</span>
      {l.url && (
        <a href={l.url} target="_blank" rel="noopener noreferrer" data-testid={`lender-link-${l.id}`} className="inline-flex items-center gap-1 text-amber-400/80 hover:text-amber-300 shrink-0">
          Source <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  </Card>
);

const useLenderFilters = () => {
  const [params, setParams] = useSearchParams();
  const urlState = params.get("state");
  const state = STATE_NAME[urlState] ? urlState : "ALL";
  const setState = (v) => setParams((p) => { if (v === "ALL") { p.delete("state"); } else { p.set("state", v); } return p; }, { replace: true });
  const [type, setType] = useState("ALL");
  const [segment, setSegment] = useState("ALL");
  const [query, setQuery] = useState("");
  return { state, setState, type, setType, segment, setSegment, query, setQuery };
};

export const LenderDirectory = () => {
  const f = useLenderFilters();
  const results = useMemo(() => {
    const q = f.query.trim().toLowerCase();
    return LENDERS.filter((l) => coversState(l, f.state === "ALL" ? null : f.state)
      && (f.type === "ALL" || l.type === f.type)
      && (f.segment === "ALL" || l.segments.includes(f.segment))
      && (!q || `${l.name} ${l.full || ""} ${l.product} ${l.hq || ""}`.toLowerCase().includes(q)))
      .sort((a, b) => Number(isStateSpecific(b)) - Number(isStateSpecific(a)));
  }, [f.state, f.type, f.segment, f.query]);
  const localCount = results.filter(isStateSpecific).length;

  return (
    <div data-testid="lender-directory">
      <div className="flex items-center gap-2 mb-2"><Landmark className="w-5 h-5 text-amber-400" /><h2 className="font-head font-semibold text-2xl text-slate-100">India solar lender directory</h2></div>
      <p className="text-sm text-slate-400 mb-6 max-w-3xl">{LENDERS.length} banks, NBFCs, government institutions, state financiers, development partners and schemes that fund solar in India. Pick your state to see who can lend there — every entry links to its source.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Select options={STATE_OPTIONS} value={f.state} onChange={(e) => f.setState(e.target.value)} placeholder={null} data-testid="lender-filter-state" aria-label="State" />
        <Select options={TYPE_OPTIONS} value={f.type} onChange={(e) => f.setType(e.target.value)} placeholder={null} data-testid="lender-filter-type" aria-label="Lender type" />
        <Select options={SEGMENT_OPTIONS} value={f.segment} onChange={(e) => f.setSegment(e.target.value)} placeholder={null} data-testid="lender-filter-segment" aria-label="Project type" />
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <TextInput value={f.query} onChange={(e) => f.setQuery(e.target.value)} placeholder="Search lender or scheme" className="pl-9" data-testid="lender-filter-search" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6 text-xs text-slate-400" data-testid="lender-summary">
        <Pill tone="amber"><span data-testid="lender-result-count">{results.length}</span> lenders & schemes</Pill>
        {f.state !== "ALL" && <Pill tone="emerald">{localCount} specific to {STATE_NAME[f.state]}</Pill>}
        {f.state !== "ALL" && <span>Pan-India lenders are included; state-specific ones are shown first.</span>}
      </div>

      {results.length === 0 ? (
        <Card className="text-center text-sm text-slate-400" data-testid="lender-empty">No lender matches these filters. Try “All project types” or clear the search.</Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="lender-grid">
          {results.map((l) => <LenderCard key={l.id} l={l} />)}
        </div>
      )}
      <p className="text-[11px] text-slate-500 mt-6 leading-relaxed" data-testid="lender-disclaimer">Checked {LENDER_META.lastVerified}. {LENDER_META.disclaimer}</p>
    </div>
  );
};

export const lenderCountForState = (code) => LENDERS.filter((l) => coversState(l, code)).length;
