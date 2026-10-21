import React from "react";
import { Segmented } from "@/components/Form";
import { MapPin, ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Info, Satellite } from "lucide-react";

const PRECISION = {
  pincode: "Exact pincode location",
  district: "District centre (pincode area not mapped)",
  city: "City centre",
  coordinates: "Exact coordinates",
  state: "State only",
};

const CONF = {
  high: { label: "High agreement", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  medium: { label: "Medium agreement", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  low: { label: "Low agreement", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

const Chip = ({ children, cls = "bg-slate-800 text-slate-300 border-slate-700", testId }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${cls}`} data-testid={testId}>{children}</span>
);

function LocationHeader({ loc }) {
  return (
    <div data-testid="weather-location">
      <div className="flex items-center gap-2 text-sm text-slate-100 font-medium">
        <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
        <span data-testid="weather-location-label">{loc.label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {loc.verifiedBy && <Chip cls="bg-emerald-500/10 text-emerald-300 border-emerald-500/25" testId="weather-verified-chip"><ShieldCheck className="w-3 h-3" /> Verified by {loc.verifiedBy}</Chip>}
        <Chip testId="weather-precision-chip">{PRECISION[loc.precision] || loc.precision}</Chip>
        {loc.geocoder && <Chip>Mapped via {loc.geocoder}</Chip>}
      </div>
      {loc.postOffices?.length > 0 && (
        <div className="text-[11px] text-slate-500 mt-1.5">Post offices: {loc.postOffices.slice(0, 3).join(" · ")}</div>
      )}
    </div>
  );
}

function StateMismatch({ pinState, selectedState, onSwitch }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5" data-testid="weather-state-mismatch">
      <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> This pincode is in <b>{pinState}</b>, but you selected <b>{selectedState}</b>.</span>
      <button type="button" onClick={onSwitch} className="px-3 py-1.5 rounded-md bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors" data-testid="weather-switch-state-btn">Switch to {pinState}</button>
    </div>
  );
}

function DiscomSuggest({ suggestions, selected, onPick, district }) {
  return (
    <div data-testid="weather-discom-suggest">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-1.5">Likely DISCOM{district ? ` for ${district}` : ""}</div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((d) => (
          <button key={d.id} type="button" onClick={() => onPick(d.name)}
            className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${selected === d.name ? "bg-amber-500 text-slate-950 border-amber-500 font-semibold" : "border-slate-700 text-slate-300 hover:border-amber-500/60"}`}
            data-testid={`weather-discom-suggestion-${d.id}`}>
            {selected === d.name && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}{d.name}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-slate-500 mt-1.5">{suggestions.length > 1 ? "More than one DISCOM serves this area — pick the one printed on your electricity bill." : "Confirm it matches the name on your electricity bill."}</div>
    </div>
  );
}

function Stat({ value, label, tone, testId, sub }) {
  return (
    <div>
      <div className={`num text-xl font-bold ${value == null ? "text-slate-500 text-sm pt-1.5" : tone}`} data-testid={testId}>{value ?? "Not available"}</div>
      {sub && <div className="text-[10px] text-slate-500 num">{sub}</div>}
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-0.5">{label}</div>
    </div>
  );
}

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function MonthlyStrip({ values }) {
  const max = Math.max(...values.filter((v) => v != null));
  return (
    <div data-testid="weather-monthly">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-1.5">Monthly profile (long-term, kWh/m²/day)</div>
      <div className="flex items-end gap-1 h-16">
        {values.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={v != null ? `${v} kWh/m²/day` : "n/a"}>
            <div className="w-full rounded-sm bg-amber-500/70" style={{ height: v != null ? `${Math.max(8, (v / max) * 100)}%` : "4%" }} />
            <div className="text-[9px] text-slate-500 mt-0.5">{MONTHS[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceRow({ s }) {
  const icon = !s.ok ? <XCircle className="w-3.5 h-3.5 text-slate-500" /> : s.used ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0" data-testid={`weather-source-${s.id}`}>
      <span className="mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-slate-300">{s.name}</div>
        <div className="text-[10px] text-slate-500">{s.ok ? s.period : s.note}{s.ok && s.note ? ` · ${s.note}` : ""}</div>
      </div>
      <span className={`num text-xs font-semibold ${s.ok && s.used ? "text-slate-100" : "text-slate-500"}`}>{s.ok ? s.avgDailyGHI : "—"}</span>
    </div>
  );
}

function LiveSolar({ data, useLive, onToggle, stateAvg, stateName }) {
  const conf = CONF[data.confidence] || CONF.low;
  const diff = stateAvg ? ((data.avgDailyGHI - stateAvg) / stateAvg) * 100 : null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Chip cls={conf.cls} testId="weather-confidence">{conf.label} · {data.sourcesUsed}/{data.sourcesTried} sources</Chip>
          {data.status === "cached" && <Chip testId="weather-cache-chip">Fetched {data.fetchedAt?.slice(0, 10)}</Chip>}
          {data.status === "stale" && <Chip cls="bg-amber-500/10 text-amber-300 border-amber-500/30" testId="weather-cache-chip">Saved data from {data.fetchedAt?.slice(0, 10)} — live services busy</Chip>}
        </div>
        <Segmented options={[{ value: true, label: "Use this data" }, { value: false, label: `Use state average${stateAvg ? ` (${stateAvg})` : ""}` }]} value={useLive} onChange={onToggle} testId="weather-toggle" />
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat value={data.avgDailyGHI} label="Peak sun hrs / day (kWh/m²)" tone="text-emerald-400" testId="weather-ghi" />
        <Stat value={data.sunnyDays} sub={data.sunnyDaysRange && data.sunnyDaysRange[0] !== data.sunnyDaysRange[1] ? `range ${data.sunnyDaysRange[0]}–${data.sunnyDaysRange[1]}` : null} label="Sunny days / yr" tone="text-amber-400" testId="weather-sunny-days" />
        <Stat value={data.annualGHI ? data.annualGHI.toLocaleString("en-IN") : null} label="kWh/m² per year" tone="text-blue-400" testId="weather-annual" />
      </div>
      {diff != null && Math.abs(diff) >= 3 && (
        <div className="text-[11px] text-slate-400" data-testid="weather-vs-state">{Math.abs(diff).toFixed(0)}% {diff < 0 ? "lower" : "higher"} than the {stateName} state average ({stateAvg}) — local haze, cloud and monsoon patterns differ across a state.</div>
      )}
      {data.confidence === "low" && (
        <div className="flex gap-2 text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" data-testid="weather-low-confidence"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Only limited or disagreeing data was available for this spot. Consider using the state average until you can refresh.</div>
      )}
      {data.monthlyGHI && <MonthlyStrip values={data.monthlyGHI} />}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-1 flex items-center gap-1.5"><Satellite className="w-3 h-3" /> {data.method} · kWh/m²/day</div>
        <div data-testid="weather-sources">{data.sources.map((s) => <SourceRow key={s.id} s={s} />)}</div>
      </div>
      <div className="text-[10px] text-slate-600 leading-relaxed">
        Consensus = median of the sources that agree; a source more than 15% away from the others, or outside India's plausible range, is excluded. Sunny day = daily mean cloud cover below {data.sunnyDayMaxCloudPct}% (Open-Meteo ERA5 & NASA POWER, last 12 months).
      </div>
    </div>
  );
}

function StateOnly({ data, stateAvg, stateName }) {
  return (
    <div className="flex gap-2.5 text-xs text-blue-200 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2.5" data-testid="weather-state-fallback">
      <Info className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        {data.message} {stateAvg ? <>The calculator is using the <b>{stateName}</b> state average of <b className="num">{stateAvg} kWh/m²/day</b> (Global Solar Atlas, median of major industrial clusters). Tap “Get live solar data” again in a minute to retry.</> : "Pick your state above to use its average."}
      </div>
    </div>
  );
}

export const SolarDataCard = ({ data, useLive, onToggle, selectedState, stateAvg, onSwitchState, suggestions, selectedDiscom, onPickDiscom }) => {
  const loc = data.location || {};
  const mismatch = loc.state && selectedState && loc.state !== selectedState;
  return (
    <div className="mt-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-4" data-testid="weather-result">
      <LocationHeader loc={loc} />
      {mismatch && <StateMismatch pinState={loc.state} selectedState={selectedState} onSwitch={onSwitchState} />}
      {!mismatch && suggestions.length > 0 && <DiscomSuggest suggestions={suggestions} selected={selectedDiscom} onPick={onPickDiscom} district={loc.district} />}
      {data.status === "state_only"
        ? <StateOnly data={data} stateAvg={stateAvg} stateName={selectedState || loc.state} />
        : <LiveSolar data={data} useLive={useLive} onToggle={onToggle} stateAvg={stateAvg} stateName={selectedState} />}
    </div>
  );
};
