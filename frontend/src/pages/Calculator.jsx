import React, { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Section, Card, Btn, Disclaimer, Metric, Pill, ScoreGauge, SourceTag } from "@/components/ui-kit";
import { Field, TextInput, NumberInput, Select, SliderInput, Segmented } from "@/components/Form";
import { AreaChartCard, BarChartCard, LineChartCard, ComposedCashflowCard, CostPieCard, TornadoChart } from "@/components/Charts";
import { STATES, getStateByName } from "@/data/states";
import { getDiscomsByState, getDiscomByName, DISCOMS } from "@/data/discoms";
import { BUSINESS_TYPES, getIndustry } from "@/data/industries";
import { DEMO_CUSTOMER } from "@/data/content";
import { DEFAULTS, rateForCapacity, PANEL_TECH_SPECS, PANEL_WATTAGES, OM_UNITS, omHeadAnnual } from "@/data/config";
import { evaluateEligibility } from "@/data/incentives";
import {
  runProjectModel, runSensitivity, runTornado, calculateSuitabilityScore,
  areaForCapacity, capacityFromArea, fullBillCapacityKw,
  calculateFinancingPackage, calculateFlatRateEMI, calculateLease,
} from "@/lib/engine";
import { getTariffTrend, buildTariffHistory, TARIFF_TREND_META, topTariffRisers } from "@/data/tariffHistory";
import { createLead, getSolarResource } from "@/lib/api";
import { inr, inrCompact, kw, kwh, num, pct, yrs } from "@/lib/format";
import {
  MapPin, Receipt, Sun, Wallet, ArrowRight, ArrowLeft, Sparkles,
  TrendingUp, Leaf, Award, IndianRupee, CheckCircle2, Printer, Gauge, BarChart3,
  Zap, Ruler, Building2, MoveRight, HelpCircle, CloudSun, Loader2, Cpu,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Location", icon: MapPin },
  { id: 2, label: "Business & Bill", icon: Receipt },
  { id: 3, label: "Solar Area", icon: Ruler },
  { id: 4, label: "Financing", icon: Wallet },
];

const SHADE_LOSS = { Low: 0.02, Medium: 0.06, High: 0.12 };

function OMInput({ label, head, onChange, testId }) {
  return (
    <div className="grid sm:grid-cols-[1.4fr_1fr] gap-3 items-end">
      <Field label={label}><NumberInput value={head.val} onChange={(e) => onChange({ ...head, val: e.target.value })} data-testid={testId} /></Field>
      <Field label="Unit"><Select value={head.unit} onChange={(e) => onChange({ ...head, unit: e.target.value })} options={OM_UNITS} /></Field>
    </div>
  );
}

const initialState = {
  state: "", city: "", discom: "", pincode: "",
  businessType: "", billMethod: "bill", monthlyBill: "", monthlyUnits: "", tariff: 8,
  installationType: "Rooftop", roofAreaSqft: "", landAreaAcres: "", shading: "Low",
  panelTech: "TOPCon", panelWattage: 580, useWeather: true,
  autoSize: true, capacityKw: "", ratePerWatt: "",
  tariffEscalation: 5, financingPct: 80, interestRate: DEFAULTS.interestRate, tenureYears: DEFAULTS.tenureYears,
  amc: { val: 0.5, unit: "pctCost" }, cmc: { val: 0, unit: "pctCost" },
  insurance: { val: 0.35, unit: "pctCost" }, otherOM: { name: "Other charges", val: 0, unit: "pctCost" },
  omEscalation: 5,
};

export default function Calculator() {
  const [step, setStep] = useState(1);
  const [f, setF] = useState(initialState);
  const [showResults, setShowResults] = useState(false);
  const [stepError, setStepError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showOM, setShowOM] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const upd = (patch) => setF((s) => ({ ...s, ...patch }));
  const reportRef = useRef(null);

  const stateObj = getStateByName(f.state);
  const panelSpec = PANEL_TECH_SPECS[f.panelTech] || PANEL_TECH_SPECS["TOPCon"];
  const performanceRatio = panelSpec.pr;
  const degradationYr = panelSpec.degradationYr;
  const baseIrradiation = stateObj?.irradiation || 5.2;
  const irradiation = (f.useWeather && weather?.avgDailyGHI) ? weather.avgDailyGHI : baseIrradiation;
  const stateDiscoms = f.state ? getDiscomsByState(f.state) : [];
  const selectedDiscom = f.discom ? getDiscomByName(f.discom) : null;

  // ---------- Electricity ----------
  const monthlyUnits = f.billMethod === "units"
    ? Number(f.monthlyUnits) || 0
    : (Number(f.monthlyBill) || 0) / (Number(f.tariff) || 8);
  const monthlyBill = f.billMethod === "bill"
    ? Number(f.monthlyBill) || 0
    : (Number(f.monthlyUnits) || 0) * (Number(f.tariff) || 8);
  const annualUnits = monthlyUnits * 12;
  const effectiveTariff = Number(f.tariff) || (monthlyUnits > 0 ? monthlyBill / monthlyUnits : 8);

  // ---------- Area-driven sizing ----------
  const shadingLoss = SHADE_LOSS[f.shading] ?? 0.03;
  const specificYield = irradiation * 365 * performanceRatio * (1 - shadingLoss) * DEFAULTS.availability;
  const fullKw = fullBillCapacityKw({ annualUnits, specificYield, selfConsumption: DEFAULTS.selfConsumption });
  const areaNeed = areaForCapacity(fullKw);
  const areaCapKw = capacityFromArea({ roofAreaSqft: Number(f.roofAreaSqft) || 0, landAreaAcres: Number(f.landAreaAcres) || 0 });
  const hasAreaInput = (Number(f.roofAreaSqft) || 0) > 0 || (Number(f.landAreaAcres) || 0) > 0;

  const fitKw = Math.max(0, Math.round(hasAreaInput ? Math.min(fullKw, areaCapKw) : fullKw));
  const capacityKw = f.autoSize ? fitKw : (Number(f.capacityKw) || fitKw);
  const coveragePct = fullKw > 0 ? Math.min((capacityKw / fullKw) * 100, 100) : 0;
  const areaLimited = hasAreaInput && areaCapKw < fullKw;

  const ratePerWatt = Number(f.ratePerWatt) || rateForCapacity(capacityKw);

  // Panel-level output & O&M cost engine
  const perPanelDailyUnits = (Number(f.panelWattage) / 1000) * (specificYield / 365);
  const panelCount = capacityKw > 0 ? Math.ceil((capacityKw * 1000) / Number(f.panelWattage)) : 0;
  const projectCostEst = capacityKw * 1000 * ratePerWatt;
  const capacityW = capacityKw * 1000;
  const annualOM =
    omHeadAnnual(f.amc, projectCostEst, capacityW) +
    omHeadAnnual(f.cmc, projectCostEst, capacityW) +
    omHeadAnnual(f.insurance, projectCostEst, capacityW) +
    omHeadAnnual(f.otherOM, projectCostEst, capacityW);
  const omEscalationFrac = (Number(f.omEscalation) || 0) / 100;

  const fetchWeather = async () => {
    if (!f.pincode && !f.city) { toast.error("Enter a pincode or city first"); return; }
    setWeatherLoading(true); setWeatherError("");
    try {
      const params = f.pincode ? { pincode: f.pincode } : { city: f.city, state: f.state };
      const data = await getSolarResource(params);
      setWeather(data); upd({ useWeather: true });
      toast.success(`Live solar data loaded for ${data.location?.label || "your area"}`);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Could not fetch live solar data — using state average.";
      setWeatherError(msg); toast.error(msg);
    } finally { setWeatherLoading(false); }
  };

  const model = useMemo(() => {
    if (!capacityKw || !annualUnits) return null;
    return runProjectModel({
      capacityKw, irradiation, performanceRatio, degradationYr, shading: f.shading,
      ratePerWatt, annualUnits, effectiveTariff, daytimePct: 0.65,
      tariffEscalation: (Number(f.tariffEscalation) || 5) / 100, financingPct: (Number(f.financingPct) || 80) / 100,
      interestRate: Number(f.interestRate) || 11, tenureYears: Number(f.tenureYears) || 7,
      annualOMOverride: annualOM, omEscalation: omEscalationFrac,
    });
  }, [capacityKw, irradiation, performanceRatio, degradationYr, f.shading, ratePerWatt, annualUnits, effectiveTariff, f.tariffEscalation, f.financingPct, f.interestRate, f.tenureYears, annualOM, omEscalationFrac]);

  const loadDemo = () => {
    upd({
      state: DEMO_CUSTOMER.state, city: DEMO_CUSTOMER.city, discom: DEMO_CUSTOMER.discom,
      businessType: DEMO_CUSTOMER.businessType, billMethod: "bill", monthlyBill: String(DEMO_CUSTOMER.monthlyBill),
      monthlyUnits: String(DEMO_CUSTOMER.monthlyUnits), tariff: DEMO_CUSTOMER.tariff,
      roofAreaSqft: String(DEMO_CUSTOMER.roofAreaSqft), installationType: DEMO_CUSTOMER.installationType, shading: DEMO_CUSTOMER.shading,
    });
    toast.success("Demo data loaded (illustrative)");
  };

  const setAreaToNeeded = () => {
    if (f.installationType === "Ground-mounted") upd({ landAreaAcres: String(Math.max(0.5, Math.round(areaNeed.acres * 10) / 10)) });
    else upd({ roofAreaSqft: String(Math.max(1000, Math.round(areaNeed.sqft / 100) * 100)) });
    toast.success("Set to area needed for ~100% coverage");
  };

  const canProceed = () => {
    if (step === 1) return f.state && f.city;
    if (step === 2) return (f.billMethod === "bill" ? f.monthlyBill : f.monthlyUnits) && f.tariff;
    return true;
  };

  const next = () => {
    const msg = step === 1 ? "Please select a State and enter a City."
      : step === 2 ? "Please enter your monthly bill (or units) and average tariff."
      : "";
    if (!canProceed()) { setStepError(msg); toast.error(msg); return; }
    setStepError("");
    if (step < 4) setStep(step + 1);
    else {
      if (!model) { setStepError("Enter bill details to calculate."); return; }
      setShowResults(true);
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  return (
    <div>
      <div className="border-b border-white/10 bg-[#0D1B2A] hero-radial">
        <Section className="py-8 lg:py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-amber-500 mb-2"><span className="w-6 h-px bg-amber-500/60" />Solar Savings Calculator</div>
              <h1 className="font-head text-2xl lg:text-3xl font-extrabold text-slate-50">See how much you can save every month</h1>
              <p className="text-sm text-slate-500 mt-1">Just 4 quick steps — we fill in the technical details for you.</p>
            </div>
            <Btn variant="outline" onClick={loadDemo} data-testid="load-demo-btn"><Sparkles className="w-4 h-4" /> Load demo data</Btn>
          </div>
        </Section>
      </div>

      {!showResults && (
        <Section className="py-8">
          {/* Progress */}
          <div className="flex items-center gap-1 mb-8 overflow-x-auto nav-scroll pb-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button onClick={() => s.id <= step && setStep(s.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg shrink-0 transition-colors ${step === s.id ? "bg-amber-500/10 border border-amber-500/30" : step > s.id ? "opacity-80" : "opacity-40"}`} data-testid={`step-tab-${s.id}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${step >= s.id ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-500"}`}>
                    {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-medium ${step === s.id ? "text-amber-400" : "text-slate-400"}`}>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="w-4 h-px bg-slate-700 shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="min-h-[440px]">
                {/* STEP 1 — LOCATION */}
                {step === 1 && (
                  <div className="space-y-5">
                    <h2 className="font-head font-semibold text-xl text-slate-100">Where is your facility?</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="State / UT *"><Select value={f.state} onChange={(e) => upd({ state: e.target.value, discom: "" })} options={STATES.map((s) => s.name)} placeholder="Select state" data-testid="calc-state" /></Field>
                      <Field label="City *"><TextInput value={f.city} onChange={(e) => upd({ city: e.target.value })} placeholder="e.g. Faridabad" data-testid="calc-city" /></Field>
                    </div>
                    <Field label="Your electricity DISCOM" hint={stateObj ? `Irradiation at ${f.state}: ${irradiation} kWh/m²/day · picking your DISCOM auto-fills the correct tariff` : "Pick your state first"}>
                      <Select value={f.discom} onChange={(e) => { const d = getDiscomByName(e.target.value); upd({ discom: e.target.value, ...(d ? { tariff: d.ciTariff } : {}) }); }} options={(stateDiscoms.length ? stateDiscoms : DISCOMS).map((d) => d.name)} placeholder="Select DISCOM" data-testid="calc-discom" />
                    </Field>
                    {selectedDiscom && (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Using {selectedDiscom.name}'s FY25-26 tariff of <span className="num font-semibold">₹{selectedDiscom.ciTariff}/kWh</span> (HT energy ₹{selectedDiscom.energyChargeHT}, demand ₹{selectedDiscom.demandCharge}/kVA).
                      </div>
                    )}

                    <div className="pt-3 border-t border-white/10">
                      <div className="text-xs uppercase tracking-wider text-slate-500 font-mono mb-3 flex items-center gap-1.5"><CloudSun className="w-3.5 h-3.5 text-amber-400" /> Live solar data (optional, recommended)</div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Pincode" hint="Pulls last-12-months sunshine & irradiance for your exact location">
                          <TextInput value={f.pincode} onChange={(e) => upd({ pincode: e.target.value })} placeholder="e.g. 302001" data-testid="calc-pincode" />
                        </Field>
                        <Field label={"\u00A0"}>
                          <Btn type="button" variant="outline" onClick={fetchWeather} disabled={weatherLoading} className="w-full" data-testid="fetch-weather-btn">
                            {weatherLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Fetching…</> : <><CloudSun className="w-4 h-4" /> Get live solar data</>}
                          </Btn>
                        </Field>
                      </div>
                      {weatherError && <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" data-testid="weather-error">{weatherError}</div>}
                      {weather && (
                        <div className="mt-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20" data-testid="weather-result">
                          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                            <div className="text-xs text-slate-300">{weather.location?.label}</div>
                            <Segmented options={[{ value: true, label: "Use live data" }, { value: false, label: "State average" }]} value={f.useWeather} onChange={(v) => upd({ useWeather: v })} testId="weather-toggle" />
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div><div className="num text-xl font-bold text-amber-400">{weather.sunnyDays}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Sunny days / yr</div></div>
                            <div><div className="num text-xl font-bold text-emerald-400">{weather.avgDailyGHI}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">kWh/m²/day</div></div>
                            <div><div className="num text-xl font-bold text-blue-400">{weather.avgSunshineHours}</div><div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Sun hrs / day</div></div>
                          </div>
                          <div className="text-[10px] text-slate-600 mt-3">Based on {weather.totalDaysAnalyzed} days ({weather.periodStart} → {weather.periodEnd}). A day counts as "sunny" at ≥{weather.sunnyDayThresholdHours}h sunshine. Source: Open-Meteo (ERA5).</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2 — BUSINESS & BILL */}
                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="font-head font-semibold text-xl text-slate-100">Your electricity bill</h2>
                    <Field label="Business type"><Select value={f.businessType} onChange={(e) => upd({ businessType: e.target.value })} options={BUSINESS_TYPES} placeholder="Select" data-testid="calc-business" /></Field>
                    <Segmented options={[{ value: "bill", label: "I know my monthly bill (₹)" }, { value: "units", label: "I know my monthly units (kWh)" }]} value={f.billMethod} onChange={(v) => upd({ billMethod: v })} testId="calc-billmethod" />
                    <div className="grid sm:grid-cols-2 gap-4">
                      {f.billMethod === "bill"
                        ? <Field label="Average monthly bill (₹) *"><NumberInput prefix="₹" value={f.monthlyBill} onChange={(e) => upd({ monthlyBill: e.target.value })} placeholder="100000" data-testid="calc-bill" /></Field>
                        : <Field label="Average monthly units (kWh) *"><NumberInput value={f.monthlyUnits} onChange={(e) => upd({ monthlyUnits: e.target.value })} suffix="kWh" placeholder="100000" data-testid="calc-units" /></Field>}
                      <Field label="Your tariff (₹/kWh) *" hint={selectedDiscom ? `Auto-filled from ${f.discom}. Adjust if yours differs.` : (stateObj ? `${f.state} C&I range ₹${stateObj.ciTariffLow}–${stateObj.ciTariffHigh}` : "")}>
                        <NumberInput prefix="₹" value={f.tariff} onChange={(e) => upd({ tariff: e.target.value })} suffix="/kWh" data-testid="calc-tariff" />
                      </Field>
                    </div>
                    {monthlyUnits > 0 && (
                      <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/15 text-sm text-slate-300">
                        You use ~<span className="num text-blue-400 font-semibold">{num(monthlyUnits)} kWh/month</span> and spend <span className="num text-blue-400 font-semibold">{inr(monthlyBill)}/month</span> ({inr(monthlyBill * 12)}/year).
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3 — AREA */}
                {step === 3 && (
                  <div className="space-y-5">
                    <h2 className="font-head font-semibold text-xl text-slate-100">How much area do you have?</h2>

                    {fullKw > 0 && (
                      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div className="text-xs uppercase tracking-wider text-amber-500/80 font-mono mb-1">To cover 100% of your bill</div>
                        <div className="num text-2xl font-bold text-amber-400">{num(areaNeed.sqft)} sq ft <span className="text-base text-slate-500 font-normal">(≈ {kw(fullKw)})</span></div>
                        <div className="text-xs text-slate-500 mt-1">or about {areaNeed.acres} acres if ground-mounted. Then compare with the area you actually have below.</div>
                      </div>
                    )}

                    <Field label="Installation type"><Segmented options={["Rooftop", "Ground-mounted", "Carport"]} value={f.installationType} onChange={(v) => upd({ installationType: v })} testId="calc-install" /></Field>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {f.installationType === "Ground-mounted"
                        ? <Field label="Land available (acres)"><NumberInput value={f.landAreaAcres} onChange={(e) => upd({ landAreaAcres: e.target.value })} suffix="acres" placeholder="e.g. 3" data-testid="calc-land" /></Field>
                        : <Field label="Roof area available (sq ft)"><NumberInput value={f.roofAreaSqft} onChange={(e) => upd({ roofAreaSqft: e.target.value })} suffix="sqft" placeholder="e.g. 80000" data-testid="calc-roof" /></Field>}
                      <Field label="Shading"><Segmented options={["Low", "Medium", "High"]} value={f.shading} onChange={(v) => upd({ shading: v })} testId="calc-shading" /></Field>
                    </div>

                    <div className="pt-1">
                      <div className="text-xs uppercase tracking-wider text-slate-500 font-mono mb-3 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-amber-400" /> Panel technology & size</div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Panel technology" hint={panelSpec.note}><Select value={f.panelTech} onChange={(e) => upd({ panelTech: e.target.value })} options={Object.keys(PANEL_TECH_SPECS)} data-testid="calc-paneltech" /></Field>
                        <Field label="Panel wattage (Wp)"><Select value={String(f.panelWattage)} onChange={(e) => upd({ panelWattage: Number(e.target.value) })} options={PANEL_WATTAGES.map((w) => ({ value: String(w), label: `${w} Wp` }))} data-testid="calc-panelwattage" /></Field>
                      </div>
                      {capacityKw > 0 && (
                        <div className="mt-3 p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/15 text-sm text-slate-300" data-testid="panel-readout">
                          One <span className="text-slate-100 font-semibold">{f.panelWattage} Wp {f.panelTech}</span> panel makes about <span className="num text-blue-400 font-semibold">{perPanelDailyUnits.toFixed(1)} units/day</span>. Your <span className="num font-semibold">{kw(capacityKw)}</span> plant ≈ <span className="num text-amber-400 font-semibold">{num(panelCount)} panels</span> ({panelSpec.efficiency} efficiency).
                        </div>
                      )}
                    </div>
                    {fullKw > 0 && <Btn variant="outline" size="sm" onClick={setAreaToNeeded} data-testid="use-full-area-btn"><Ruler className="w-4 h-4" /> I have enough area — cover my full bill</Btn>}

                    {hasAreaInput && fullKw > 0 && (
                      <div className={`p-4 rounded-lg border ${areaLimited ? "bg-blue-500/5 border-blue-500/20" : "bg-emerald-500/5 border-emerald-500/20"}`}>
                        <div className="text-xs uppercase tracking-wider font-mono mb-1.5" style={{ color: areaLimited ? "#60A5FA" : "#34D399" }}>What your area gives you</div>
                        <div className="text-sm text-slate-300 leading-relaxed">
                          Your area fits about <span className="num font-bold text-slate-100">{kw(fitKw)}</span>, covering ~<span className="num font-bold" style={{ color: areaLimited ? "#60A5FA" : "#34D399" }}>{coveragePct.toFixed(0)}%</span> of your bill.
                          {areaLimited && <> The remaining ~{(100 - coveragePct).toFixed(0)}% stays on grid. To cover 100%, you'd need ~{num(areaNeed.sqft)} sq ft.</>}
                        </div>
                      </div>
                    )}

                    {/* Offsite / credits */}
                    <div className="flex gap-3 p-4 rounded-lg bg-white/[0.03] border border-white/10">
                      <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-400 leading-relaxed">
                        <span className="text-slate-200 font-semibold">Don't have enough roof?</span> You can install solar at a <span className="text-slate-200">different location</span> and still cut this factory's bill via <span className="text-slate-200">Open Access / Group Captive</span> — the plant feeds power to the grid and your connection gets credited (subject to your state's wheeling, banking & open-access charges). Net metering offsets only the <span className="text-slate-200">same connection</span>; for a different factory connection, use Open Access or Group Captive. See <Link to="/project-models" className="text-amber-400 underline underline-offset-2">Project Models</Link>.
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4 — FINANCING */}
                {step === 4 && (
                  <div className="space-y-5">
                    <h2 className="font-head font-semibold text-xl text-slate-100">Financing (indicative marketplace defaults)</h2>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10"><div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Financing share</div><div className="num text-xl font-bold text-amber-400">{f.financingPct}%</div></div>
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10"><div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Interest rate</div><div className="num text-xl font-bold text-amber-400">{f.interestRate}%</div></div>
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10"><div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Tenure</div><div className="num text-xl font-bold text-amber-400">{f.tenureYears} yrs</div></div>
                    </div>
                    <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-amber-400 hover:text-amber-300 font-medium" data-testid="toggle-advanced">
                      {showAdvanced ? "Hide advanced options" : "Adjust financing, cost & tariff escalation →"}
                    </button>
                    {showAdvanced && (
                      <div className="grid sm:grid-cols-3 gap-5 pt-1">
                        <SliderInput label="Financing share" value={f.financingPct} onChange={(v) => upd({ financingPct: v })} min={50} max={100} step={5} format={(v) => `${v}%`} testId="calc-finpct" />
                        <SliderInput label="Interest rate" value={f.interestRate} onChange={(v) => upd({ interestRate: v })} min={8} max={16} step={0.25} format={(v) => `${v}%`} testId="calc-rate-slider" />
                        <SliderInput label="Tenure" value={f.tenureYears} onChange={(v) => upd({ tenureYears: v })} min={3} max={10} step={1} format={(v) => `${v}y`} testId="calc-tenure" />
                        <SliderInput label="Tariff escalation / yr" value={f.tariffEscalation} onChange={(v) => upd({ tariffEscalation: v })} min={0} max={10} step={1} format={(v) => `${v}%`} testId="calc-escalation" />
                        <Field label="EPC cost (₹/W)"><NumberInput prefix="₹" value={f.ratePerWatt} onChange={(e) => upd({ ratePerWatt: e.target.value })} suffix="/W" placeholder={String(rateForCapacity(capacityKw))} data-testid="calc-rate" /></Field>
                        <div className="flex items-end"><Segmented options={[{ value: true, label: "Auto size" }, { value: false, label: "Custom kW" }]} value={f.autoSize} onChange={(v) => upd({ autoSize: v })} testId="calc-autosize" /></div>
                        {!f.autoSize && <Field label="Custom capacity (kW)"><NumberInput value={f.capacityKw} onChange={(e) => upd({ capacityKw: e.target.value })} suffix="kW" placeholder={String(fitKw)} data-testid="calc-capacity" /></Field>}
                      </div>
                    )}
                    <div className="pt-1">
                      <button type="button" onClick={() => setShowOM(!showOM)} className="text-xs text-amber-400 hover:text-amber-300 font-medium" data-testid="toggle-om">
                        {showOM ? "Hide O&M / yearly charges" : "Add AMC, CMC, insurance & other yearly charges →"}
                      </button>
                      {showOM && (
                        <div className="mt-4 space-y-4">
                          <OMInput label="AMC — Annual Maintenance" head={f.amc} onChange={(h) => upd({ amc: h })} testId="om-amc" />
                          <OMInput label="CMC — Comprehensive Maintenance" head={f.cmc} onChange={(h) => upd({ cmc: h })} testId="om-cmc" />
                          <OMInput label="Insurance" head={f.insurance} onChange={(h) => upd({ insurance: h })} testId="om-insurance" />
                          <div className="grid sm:grid-cols-[1fr_1.4fr] gap-3 items-end">
                            <Field label="Other charge name"><TextInput value={f.otherOM.name} onChange={(e) => upd({ otherOM: { ...f.otherOM, name: e.target.value } })} data-testid="om-other-name" /></Field>
                            <OMInput label={f.otherOM.name || "Other"} head={f.otherOM} onChange={(h) => upd({ otherOM: { ...h, name: f.otherOM.name } })} testId="om-other" />
                          </div>
                          <SliderInput label="Annual O&M escalation" value={f.omEscalation} onChange={(v) => upd({ omEscalation: v })} min={0} max={10} step={1} format={(v) => `${v}%`} testId="om-escalation" />
                          <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-sm text-slate-300" data-testid="om-readout">
                            Total year-1 O&M ≈ <span className="num text-emerald-400 font-semibold">{inrCompact(annualOM)}/yr</span> ({inr(annualOM / 12)}/mo). Subtracted from your savings in every metric below.
                          </div>
                        </div>
                      )}
                    </div>
                    <Disclaimer>Financing figures are indicative and subject to the financing partner's credit assessment, applicable terms and approval.</Disclaimer>
                  </div>
                )}

                <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                  <Btn variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}><ArrowLeft className="w-4 h-4" /> Back</Btn>
                  <Btn onClick={next} data-testid="calc-next-btn">{step === 4 ? "See My Monthly Saving" : "Continue"} <ArrowRight className="w-4 h-4" /></Btn>
                </div>
                {stepError && <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5" data-testid="calc-step-error">{stepError}</div>}
              </Card>
            </div>

            {/* Live summary */}
            <div className="lg:sticky lg:top-20 h-fit">
              <Card>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-mono mb-4">Live Estimate</div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center"><span className="text-sm text-slate-400">Plant size</span><span className="num font-semibold text-amber-400">{capacityKw ? kw(capacityKw) : "—"}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-slate-400">Bill coverage</span><span className="num font-semibold text-emerald-400">{fullKw ? `${coveragePct.toFixed(0)}%` : "—"}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-slate-400">Project cost</span><span className="num font-semibold text-slate-200">{capacityKw ? inrCompact(capacityKw * 1000 * ratePerWatt) : "—"}</span></div>
                  <div className="border-t border-white/10 pt-3 flex justify-between items-center"><span className="text-sm text-slate-300 font-medium">Monthly saving</span><span className="num font-bold text-emerald-400 text-lg">{model ? inr(model.metrics.netMonthlyBenefit) : "—"}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-slate-400">Monthly EMI</span><span className="num font-semibold text-amber-400">{model ? inr(model.metrics.monthlyEMI) : "—"}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-slate-400">Payback</span><span className="num font-semibold text-slate-200">{model?.metrics.simplePayback ? yrs(model.metrics.simplePayback) : "—"}</span></div>
                </div>
              </Card>
            </div>
          </div>
        </Section>
      )}

      {!showResults && model && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/10 p-3 flex items-center justify-between no-print">
          <div><div className="text-[10px] text-slate-500 font-mono uppercase">Est. Monthly Saving</div><div className="num text-lg font-bold text-emerald-400">{inr(model.metrics.netMonthlyBenefit)}</div></div>
          <Btn onClick={next} className="!py-2">{step === 4 ? "Calculate" : "Next"} <ArrowRight className="w-4 h-4" /></Btn>
        </div>
      )}

      {showResults && model && <Results f={f} model={model} capacityKw={capacityKw} fullKw={fullKw} areaNeed={areaNeed} coveragePct={coveragePct} areaLimited={areaLimited} fitKw={fitKw} hasAreaInput={hasAreaInput} irradiation={irradiation} ratePerWatt={ratePerWatt} annualUnits={annualUnits} effectiveTariff={effectiveTariff} monthlyBill={monthlyBill} performanceRatio={performanceRatio} degradationYr={degradationYr} annualOM={annualOM} omEscalation={omEscalationFrac} panelCount={panelCount} perPanelDailyUnits={perPanelDailyUnits} weather={f.useWeather ? weather : null} panelWattage={f.panelWattage} panelTech={f.panelTech} reportRef={reportRef} onEdit={() => setShowResults(false)} />}
    </div>
  );
}

// ============================ RESULTS ============================
function Results({ f, model, capacityKw, fullKw, areaNeed, coveragePct, areaLimited, fitKw, hasAreaInput, irradiation, ratePerWatt, annualUnits, effectiveTariff, monthlyBill, performanceRatio, degradationYr, annualOM, omEscalation, panelCount, perPanelDailyUnits, weather, panelWattage, panelTech, reportRef, onEdit }) {
  const [horizon, setHorizon] = useState(25);
  const m = model.metrics;

  const baseInputs = {
    capacityKw, irradiation, performanceRatio, degradationYr, shading: f.shading, ratePerWatt,
    annualUnits, effectiveTariff, daytimePct: 0.65, tariffEscalation: (Number(f.tariffEscalation) || 5) / 100,
    financingPct: (Number(f.financingPct) || 80) / 100, interestRate: Number(f.interestRate) || 11, tenureYears: Number(f.tenureYears) || 7,
    annualOMOverride: annualOM, omEscalation,
  };
  const sensitivity = useMemo(() => runSensitivity(baseInputs), [capacityKw, ratePerWatt, effectiveTariff]);
  const tornado = useMemo(() => runTornado(baseInputs), [capacityKw, ratePerWatt, effectiveTariff]);

  const suitability = calculateSuitabilityScore({
    monthlyBill, effectiveTariff, daytimePct: 0.65, irradiation,
    roofAreaSqft: Number(f.roofAreaSqft) || 0, recommendedKw: capacityKw,
    operatingHours: 12, shading: f.shading, interestRate: Number(f.interestRate) || 11,
  });
  const eligibility = evaluateEligibility({ consumerType: "Industrial", projectType: "CAPEX", capacityKw, installationType: f.installationType });

  const scenarios = [
    { name: "No Solar", fin: null },
    { name: "Solar — No Financing", fin: 0 },
    { name: "Solar — 70% Financing", fin: 70 },
    { name: "Solar — 80% Financing", fin: 80 },
    { name: "Solar — 100% Financing", fin: 100 },
  ].map((s) => {
    if (s.fin === null) return { ...s, payback: null, irr: null, lifetime: 0, interest: 0, monthlyOut: monthlyBill };
    const mm = runProjectModel({ ...baseInputs, financingPct: s.fin / 100 });
    return { ...s, payback: mm.metrics.simplePayback, irr: mm.metrics.projectIRR, lifetime: mm.metrics.lifetimeNetBenefit, interest: mm.loan.totalInterest, monthlyOut: mm.metrics.monthlyOutflowWithSolar };
  });

  const genChart = model.generation.schedule.slice(0, horizon).map((r) => ({ year: `Y${r.year}`, generation: r.generation }));
  const savingsChart = model.savings.rows.slice(0, horizon).map((r) => ({ year: `Y${r.year}`, cumulative: r.cumulative }));
  const cashflowChart = model.cashflow.rows.slice(0, horizon).map((r) => ({ year: r.year, saving: r.saving, debtService: r.debtService, net: r.net }));
  const billChart = model.savings.rows.slice(0, horizon).map((r) => ({ year: `Y${r.year}`, "Without Solar": r.gridBillBefore, "With Solar": r.gridBillAfter }));

  // The user's mental model breakdown (monthly, year-1)
  const solarCovers = m.annualSavingsY1 / 12;               // value of solar per month
  const residual = m.residualMonthlyBill;                    // still pay grid
  const emi = m.monthlyEMI;                                  // loan EMI
  const omMonthly = m.annualOM / 12;
  const totalWithSolar = residual + emi + omMonthly;
  const netSaving = monthlyBill - totalWithSolar;
  const emiGtSaving = netSaving > 0;

  const [lead, setLead] = useState({ name: "", company: "", mobile: "", email: "" });
  const [leadDone, setLeadDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const submitLead = async (e) => {
    e.preventDefault();
    if (!lead.name || !lead.mobile) return toast.error("Name and mobile required");
    setBusy(true);
    try {
      const r = await createLead({
        ...lead, city: f.city, state: f.state, discom: f.discom, industry: f.businessType,
        monthlyBill, projectSizeKw: capacityKw, loanRequirement: model.loan.loanAmount, source: "calculator",
        result: { recommendedCapacityKw: capacityKw, projectCost: model.cost.totalCost, loanAmount: model.loan.loanAmount, emi, annualSavings: m.annualSavingsY1, netMonthlyBenefit: netSaving, paybackYears: m.simplePayback, projectIrr: m.projectIRR, lifetimeSavings: m.lifetimeSavings, co2AvoidedTonnes: model.environmental.lifetimeCo2Tonnes, suitabilityScore: suitability.score },
        inputs: { state: f.state, city: f.city, businessType: f.businessType, tariff: effectiveTariff },
      });
      setLeadDone(r); toast.success(`Assessment requested — ${r.leadId}`);
    } catch { toast.error("Submission failed"); } setBusy(false);
  };

  return (
    <div ref={reportRef}>
      <Section className="py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 no-print">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-amber-500 mb-2"><span className="w-6 h-px bg-amber-500/60" />Your Solar Opportunity</div>
            <h2 className="font-head text-2xl lg:text-3xl font-extrabold text-slate-50">Solar Opportunity Report</h2>
            <p className="text-sm text-slate-500 mt-1">{f.businessType || "Business"} · {f.city}, {f.state} · {f.discom || "DISCOM"}</p>
          </div>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={onEdit}><ArrowLeft className="w-4 h-4" /> Edit inputs</Btn>
            <Btn variant="outline" onClick={() => window.print()} data-testid="print-report-btn"><Printer className="w-4 h-4" /> Print / PDF</Btn>
          </div>
        </div>

        {/* HERO: net monthly saving breakdown — exactly the customer's mental model */}
        <Card className="mb-8 overflow-hidden relative hero-radial">
          <div className="grid lg:grid-cols-5 gap-6 items-center">
            <div className="lg:col-span-3">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-mono mb-1">Every month (Year 1)</div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-slate-300">
                <div className="flex items-baseline gap-1.5"><span className="text-xs text-slate-500">Current bill</span><span className="num text-lg font-bold text-slate-100">{inr(monthlyBill)}</span></div>
                <MoveRight className="w-4 h-4 text-slate-600" />
                <div className="flex items-baseline gap-1.5"><span className="text-xs text-slate-500">Solar covers</span><span className="num text-lg font-bold text-emerald-400">− {inr(solarCovers)}</span></div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-slate-300 mt-2">
                <div className="flex items-baseline gap-1.5"><span className="text-xs text-slate-500">You still pay grid</span><span className="num text-lg font-bold text-slate-100">{inr(residual)}</span></div>
                <span className="text-slate-600">+</span>
                <div className="flex items-baseline gap-1.5"><span className="text-xs text-slate-500">Loan EMI</span><span className="num text-lg font-bold text-amber-400">{inr(emi)}</span></div>
                <span className="text-slate-600">=</span>
                <div className="flex items-baseline gap-1.5"><span className="text-xs text-slate-500">Total outflow</span><span className="num text-lg font-bold text-slate-100">{inr(totalWithSolar)}</span></div>
              </div>
              <div className="mt-3 text-xs text-slate-500">O&M of {inr(omMonthly)}/mo is included in the outflow.</div>
            </div>
            <div className="lg:col-span-2 lg:border-l lg:border-white/10 lg:pl-8 text-center">
              <div className="text-xs uppercase tracking-wider font-mono mb-1" style={{ color: emiGtSaving ? "#34D399" : "#F87171" }}>Net Monthly Saving</div>
              <div className={`num text-5xl font-extrabold ${emiGtSaving ? "text-emerald-400" : "text-red-400"}`} data-testid="res-net-benefit">{inr(netSaving)}</div>
              <div className="text-xs text-slate-500 mt-2">{emiGtSaving ? "You pocket this every month after paying EMI." : "EMI currently exceeds savings — savings grow as tariffs rise."}</div>
            </div>
          </div>
        </Card>

        {/* Area / coverage card */}
        <div className="grid lg:grid-cols-2 gap-4 mb-8">
          <Card className="!p-5">
            <div className="flex items-center gap-2 mb-3"><Ruler className="w-5 h-5 text-amber-400" /><h3 className="font-head font-semibold text-lg text-slate-100">Area & coverage</h3></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Area to cover 100% of bill</span><span className="num text-slate-100 font-semibold">{num(areaNeed.sqft)} sq ft ({kw(fullKw)})</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Your area fits</span><span className="num text-slate-100 font-semibold">{hasAreaInput ? kw(fitKw) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Bill covered by solar</span><span className={`num font-semibold ${coveragePct >= 99 ? "text-emerald-400" : "text-amber-400"}`}>{coveragePct.toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Recommended plant</span><span className="num text-amber-400 font-semibold">{kw(capacityKw)}</span></div>
            </div>
            {areaLimited && <p className="text-xs text-blue-400 mt-3 bg-blue-500/5 border border-blue-500/15 rounded-md px-3 py-2">Your area covers ~{coveragePct.toFixed(0)}%. To cover 100%, add ~{num(Math.max(0, areaNeed.sqft - (Number(f.roofAreaSqft) || 0)))} sq ft more — or use Open Access / Group Captive offsite.</p>}
          </Card>
          <Card className="!p-5">
            <div className="flex items-center gap-2 mb-3"><HelpCircle className="w-5 h-5 text-amber-400" /><h3 className="font-head font-semibold text-lg text-slate-100">Different location? Get credits</h3></div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-slate-200 font-medium">Yes, it's possible.</span> With <span className="text-slate-200">Open Access</span> or <span className="text-slate-200">Group Captive</span>, you build solar at a different site, feed it to the grid, and your factory's connection is credited — effectively using that energy against your bill. <span className="text-slate-200">Net metering</span> only offsets the same connection; group/virtual net metering works within the same DISCOM. Charges (wheeling, banking, cross-subsidy) depend on your state.
            </p>
            <Btn as={Link} to="/project-models" variant="ghost" className="mt-3 !px-0">Compare CAPEX / OPEX / Open Access <ArrowRight className="w-3.5 h-3.5" /></Btn>
          </Card>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Metric label="Recommended Capacity" value={kw(capacityKw)} tone="amber" icon={Sun} testId="res-capacity" />
          <Metric label="Project Cost" value={inrCompact(model.cost.totalCost)} tone="blue" icon={Wallet} testId="res-cost" />
          <Metric label="Loan Requirement" value={inrCompact(model.loan.loanAmount)} tone="amber" icon={IndianRupee} />
          <Metric label="Monthly EMI" value={inr(m.monthlyEMI)} tone="amber" icon={IndianRupee} testId="res-emi" />
          <Metric label="Annual Savings (Yr1)" value={inrCompact(m.annualSavingsY1)} tone="emerald" icon={TrendingUp} testId="res-savings" />
          <Metric label="Simple Payback" value={m.simplePayback ? yrs(m.simplePayback) : "—"} tone="emerald" icon={Gauge} testId="res-payback" />
          <Metric label="Project IRR" value={m.projectIRR != null ? pct(m.projectIRR * 100) : "—"} tone="emerald" icon={BarChart3} />
          <Metric label="25-Yr Lifetime Savings" value={inrCompact(m.lifetimeSavings)} tone="emerald" icon={IndianRupee} />
          <Metric label="CO₂ Avoided (25yr)" value={`${num(model.environmental.lifetimeCo2Tonnes)} t`} tone="emerald" icon={Leaf} />
          <Metric label="Current Bill /mo" value={inr(monthlyBill)} icon={Receipt} />
          <Metric label="Post-Solar Bill /mo" value={inr(residual)} tone="blue" icon={Receipt} />
          <Metric label="Potential RECs /yr" value={num(model.rec.potentialCertsPerYear)} tone="blue" icon={Zap} />
        </div>
      </Section>

      {/* Charts */}
      <Section className="py-6">
        <div className="flex items-center justify-between mb-4 no-print">
          <h3 className="font-head font-semibold text-xl text-slate-100">Financial projections</h3>
          <Segmented options={[{ value: 10, label: "10 yr" }, { value: 15, label: "15 yr" }, { value: 25, label: "25 yr" }]} value={horizon} onChange={setHorizon} testId="horizon-toggle" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card><h4 className="font-medium text-slate-200 mb-4 text-sm">Electricity bill — Without vs With Solar</h4><BarChartCard data={billChart} xKey="year" series={[{ key: "Without Solar", color: "#EF4444" }, { key: "With Solar", color: "#10B981" }]} height={260} /></Card>
          <Card><h4 className="font-medium text-slate-200 mb-4 text-sm">Cumulative savings</h4><AreaChartCard data={savingsChart} xKey="year" series={[{ key: "cumulative", name: "Cumulative Savings", color: "#10B981" }]} height={260} /></Card>
          <Card><h4 className="font-medium text-slate-200 mb-4 text-sm">Annual cash flow (savings vs EMI vs net)</h4><ComposedCashflowCard data={cashflowChart} height={260} /></Card>
          <Card><h4 className="font-medium text-slate-200 mb-4 text-sm">Solar generation (with degradation)</h4><LineChartCard data={genChart} xKey="year" fmt={(v) => `${(v / 1000).toFixed(0)}k`} series={[{ key: "generation", name: "kWh", color: "#3B82F6" }]} height={260} /></Card>
          <Card><h4 className="font-medium text-slate-200 mb-4 text-sm">Project cost breakdown</h4><div className="grid grid-cols-2 gap-4 items-center"><CostPieCard data={model.cost.components} height={220} /><div className="space-y-1.5 text-xs">{model.cost.components.slice(0, 7).map((c, i) => <div key={c.name} className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-sm" style={{ background: ["#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6366F1", "#F97316"][i] }} />{c.name}</span><span className="num text-slate-300">{pct(c.share * 100, 0)}</span></div>)}</div></div></Card>
          <Card><h4 className="font-medium text-slate-200 mb-4 text-sm">Loan outstanding</h4><AreaChartCard data={model.cashflow.rows.slice(0, horizon).map((r) => ({ year: `Y${r.year}`, balance: r.loanOutstanding }))} xKey="year" series={[{ key: "balance", name: "Outstanding", color: "#F59E0B" }]} height={260} /></Card>
        </div>
      </Section>

      {/* Finance deep dive */}
      <FinanceDeepDive projectCost={model.cost.totalCost} financingPct={(Number(f.financingPct) || 80) / 100} interestRate={Number(f.interestRate) || 11} tenureYears={Number(f.tenureYears) || 7} annualGeneration={model.generation.year1Generation} />

      {/* Tariff history */}
      <TariffHistory stateObj={getStateByName(f.state)} discom={f.discom} effectiveTariff={effectiveTariff} escalationPct={Number(f.tariffEscalation) || 5} />

      {/* Scenario builder */}
      <Section className="py-6">
        <Card>
          <h3 className="font-head font-semibold text-xl text-slate-100 mb-4">Scenario Builder</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-slate-500 text-xs uppercase tracking-wider font-mono border-b border-white/10">
                <tr>{["Scenario", "Monthly Outflow", "Payback", "Project IRR", "Total Interest", "25-Yr Net"].map((h) => <th key={h} className="px-3 py-3 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-3 py-3 font-medium text-slate-200">{s.name}</td>
                    <td className="px-3 py-3 num text-slate-300">{inr(s.monthlyOut)}</td>
                    <td className="px-3 py-3 num text-slate-300">{s.payback ? yrs(s.payback) : "—"}</td>
                    <td className="px-3 py-3 num text-emerald-400">{s.irr != null ? pct(s.irr * 100) : "—"}</td>
                    <td className="px-3 py-3 num text-amber-400">{s.fin === null ? "—" : inrCompact(s.interest)}</td>
                    <td className="px-3 py-3 num text-emerald-400">{s.fin === null ? "—" : inrCompact(s.lifetime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* Sensitivity + Suitability */}
      <Section className="py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-head font-semibold text-xl text-slate-100 mb-1">Sensitivity — Payback (yrs)</h3>
            <p className="text-sm text-slate-500 mb-5">Which variables move your payback the most?</p>
            <TornadoChart data={tornado} base={m.simplePayback || 0} />
            <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-white/10">
              {[["Best", "emerald", sensitivity.best], ["Base", "amber", sensitivity.base], ["Worst", "danger", sensitivity.worst]].map(([lbl, tone, sc]) => (
                <div key={lbl} className="text-center">
                  <Pill tone={tone === "danger" ? "danger" : tone}>{lbl} case</Pill>
                  <div className="num text-lg font-bold text-slate-100 mt-2">{sc.payback ? yrs(sc.payback) : "—"}</div>
                  <div className="text-[10px] text-slate-500">IRR {sc.projectIRR != null ? pct(sc.projectIRR * 100) : "—"}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="font-head font-semibold text-xl text-slate-100 mb-1">Solar Suitability Score</h3>
            <p className="text-sm text-slate-500 mb-2">{suitability.verdict}</p>
            <ScoreGauge score={suitability.score} tone={suitability.tone} />
            <div className="space-y-2 mt-2">
              {suitability.factors.map((fac) => (
                <div key={fac.label} className="flex items-center gap-3 text-xs">
                  <div className="w-32 text-slate-400 shrink-0">{fac.label}</div>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${(fac.points / fac.max) * 100}%` }} /></div>
                  <div className="num text-slate-500 w-10 text-right">{fac.points}/{fac.max}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      {/* Incentives + Environmental + REC */}
      <Section className="py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-amber-400" /><h3 className="font-head font-semibold text-lg text-slate-100">Potential Incentives</h3></div>
            <div className="space-y-2">
              {eligibility.eligible.slice(0, 4).map((i) => <div key={i.id} className="text-xs text-slate-300 flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />{i.name}</div>)}
              {eligibility.verify.slice(0, 2).map((i) => <div key={i.id} className="text-xs text-slate-400 flex gap-2"><span className="text-amber-400 shrink-0">?</span>{i.name} <span className="text-slate-600">(verify)</span></div>)}
            </div>
            <Btn as={Link} to="/government" variant="ghost" className="mt-4 !px-0">Check full eligibility <ArrowRight className="w-3.5 h-3.5" /></Btn>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-4"><Leaf className="w-5 h-5 text-emerald-400" /><h3 className="font-head font-semibold text-lg text-slate-100">Environmental Impact</h3></div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Annual CO₂ avoided</span><span className="num text-emerald-400 font-semibold">{num(model.environmental.annualCo2Tonnes)} t</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">25-year CO₂ avoided</span><span className="num text-emerald-400 font-semibold">{num(model.environmental.lifetimeCo2Tonnes)} t</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Equivalent trees</span><span className="num text-emerald-400 font-semibold">{num(model.environmental.equivalentTrees)}</span></div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-4"><Zap className="w-5 h-5 text-blue-400" /><h3 className="font-head font-semibold text-lg text-slate-100">Potential RECs</h3></div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Potential RECs / yr</span><span className="num text-blue-400 font-semibold">{num(model.rec.potentialCertsPerYear)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Indicative value / yr</span><span className="num text-blue-400 font-semibold">{inrCompact(model.rec.indicativeAnnualValue)}</span></div>
            </div>
            <Btn as={Link} to="/rec-carbon" variant="ghost" className="mt-4 !px-0">Explore RECs <ArrowRight className="w-3.5 h-3.5" /></Btn>
          </Card>
        </div>
      </Section>

      {/* Lead form */}
      <Section className="py-10">
        <Card className="hero-radial" id="lead-form">
          {leadDone ? (
            <div className="text-center py-8" data-testid="lead-success">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
              <h3 className="font-head text-2xl font-bold text-slate-100">Financing assessment requested!</h3>
              <p className="text-slate-400 mt-2">Our financing partners will reach out.</p>
              <div className="num text-lg text-amber-400 mt-4">Reference: {leadDone.leadId}</div>
              <div className="flex justify-center gap-3 mt-4"><Pill tone={leadDone.intent === "HIGH" ? "emerald" : "amber"}>{leadDone.intent} intent</Pill><Pill tone="blue">Score {leadDone.score}/100</Pill></div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="font-head text-2xl lg:text-3xl font-bold text-slate-50">Get a Financing Assessment</h3>
                <p className="text-slate-400 mt-3">Turn this estimate into a real financing conversation. Share your details and we'll match your project to the right financing partners.</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] border border-white/8 rounded-lg p-3"><div className="text-[10px] text-slate-500 font-mono uppercase">Est. Loan</div><div className="num text-amber-400 font-bold">{inrCompact(model.loan.loanAmount)}</div></div>
                  <div className="bg-white/[0.03] border border-white/8 rounded-lg p-3"><div className="text-[10px] text-slate-500 font-mono uppercase">Est. EMI</div><div className="num text-emerald-400 font-bold">{inr(m.monthlyEMI)}</div></div>
                </div>
              </div>
              <form onSubmit={submitLead} className="grid sm:grid-cols-2 gap-4" data-testid="lead-form">
                <Field label="Name *"><TextInput value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} data-testid="lead-name" /></Field>
                <Field label="Company"><TextInput value={lead.company} onChange={(e) => setLead({ ...lead, company: e.target.value })} /></Field>
                <Field label="Mobile *"><TextInput value={lead.mobile} onChange={(e) => setLead({ ...lead, mobile: e.target.value })} data-testid="lead-mobile" /></Field>
                <Field label="Email"><TextInput value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} data-testid="lead-email" /></Field>
                <div className="sm:col-span-2"><Btn type="submit" disabled={busy} className="w-full py-3" data-testid="lead-submit">{busy ? "Submitting..." : "Get Financing Assessment"}</Btn></div>
              </form>
            </div>
          )}
        </Card>
      </Section>

      {/* Assumptions & disclaimers */}
      <Section className="py-6">
        <Card className="print-white">
          <h3 className="font-head font-semibold text-lg text-slate-100 mb-4">Assumptions & Sources</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-400">
            {[
              ["Irradiation", `${irradiation} kWh/m²/day (${weather ? "live · " + (weather.location?.label || "site") : f.state})`],
              ["Performance ratio", `${performanceRatio} (${panelTech}, ${f.shading} shading)`],
              ["Specific yield", `~${Math.round(specificYieldCalc(irradiation, f.shading, performanceRatio))} kWh/kW/yr`],
              ["Degradation", `~${(degradationYr * 100).toFixed(2)}% / yr (${panelTech})`],
              ["Panels", `${num(panelCount)} × ${panelWattage} Wp`],
              ["Annual O&M", `${inrCompact(annualOM)}/yr @ ${(omEscalation * 100).toFixed(0)}% esc.`],
              ["EPC cost", `₹${ratePerWatt}/W (benchmark)`],
              ["Effective tariff", `₹${effectiveTariff.toFixed(2)}/kWh`],
              ["Tariff escalation", `${f.tariffEscalation}% / yr`],
              ["Financing", `${f.financingPct}% @ ${f.interestRate}% / ${f.tenureYears} yr`],
            ].map(([k, v]) => <div key={k}><div className="text-slate-600 font-mono uppercase tracking-wider text-[10px]">{k}</div><div className="text-slate-300 mt-0.5">{v}</div></div>)}
          </div>
          <SourceTag className="mt-4 pt-4 border-t border-white/10" source="SERC tariff orders / NIWE irradiation / CEA emission factor / CERC REC price" verified="2026-06" />
          <div className="mt-4 space-y-2 text-[11px] text-slate-500 leading-relaxed">
            <p>• Solar generation is an <b>estimate</b> and depends on location, irradiation, system design, shading, equipment and operating conditions.</p>
            <p>• Government incentive eligibility is subject to applicable rules and approval by the relevant authority.</p>
            <p>• Financing figures are indicative and subject to the financing partner's credit assessment, applicable terms and approval.</p>
            <p>• REC / carbon-credit eligibility and monetization are not guaranteed. Tax treatment should be confirmed with a qualified tax professional.</p>
          </div>
        </Card>
      </Section>
    </div>
  );
}

function specificYieldCalc(irradiation, shading, pr = DEFAULTS.performanceRatio) {
  const loss = SHADE_LOSS[shading] ?? 0.03;
  return irradiation * 365 * pr * (1 - loss) * DEFAULTS.availability;
}

// ============================ FINANCE DEEP DIVE ============================
function FinanceDeepDive({ projectCost, financingPct, interestRate, tenureYears, annualGeneration }) {
  const [structure, setStructure] = useState("loan"); // loan | lease
  const [method, setMethod] = useState("reducing");    // reducing | flat (loan only)
  const [flatRate, setFlatRate] = useState(DEFAULTS.flatRate);
  const [feePct, setFeePct] = useState(DEFAULTS.processingFeePct);
  const [leaseRate, setLeaseRate] = useState(DEFAULTS.leaseRate);
  const [leaseTenure, setLeaseTenure] = useState(5);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAllMonths, setShowAllMonths] = useState(false);

  const pkg = useMemo(() => calculateFinancingPackage({
    projectCost, financingPct, interestRate, tenureYears,
    processingFeePct: feePct, gstOnFeePct: DEFAULTS.gstOnFeePct, insurancePct: DEFAULTS.insurancePct, flatRate,
  }), [projectCost, financingPct, interestRate, tenureYears, feePct, flatRate]);

  const lease = useMemo(() => calculateLease({
    financeAmount: pkg.loanAmount, leaseRate, tenureYears: leaseTenure, gstPct: DEFAULTS.gstOnRentalPct, annualGeneration,
  }), [pkg.loanAmount, leaseRate, leaseTenure, annualGeneration]);

  const active = method === "reducing" ? pkg.reducing : pkg.flat;
  const start = new Date();
  const end = new Date(start.getFullYear(), start.getMonth() + pkg.payoffMonths, 1);
  const endLabel = end.toLocaleString("en-IN", { month: "short", year: "numeric" });
  const startLabel = start.toLocaleString("en-IN", { month: "short", year: "numeric" });
  const leaseEnd = new Date(start.getFullYear(), start.getMonth() + lease.months, 1);
  const leaseEndLabel = leaseEnd.toLocaleString("en-IN", { month: "short", year: "numeric" });
  const isLoan = structure === "loan";

  const fees = [
    ["Project cost (incl. GST)", projectCost],
    [`Down payment (${Math.round((1 - financingPct) * 100)}% margin)`, pkg.downPayment],
    [isLoan ? "Loan amount" : "Lease finance amount", pkg.loanAmount],
    [`Processing fee (${feePct}%)`, pkg.processingFee],
    ["GST on processing fee (18%)", pkg.gstOnFee],
    [`Insurance (${DEFAULTS.insurancePct}%)`, pkg.insurance],
    ["Total upfront (day 0)", pkg.upfront],
  ];

  const compRows = [
    ["Ownership", "You own from day 1", `The financier owns during term → transfers to you after ${lease.months} months`],
    ["Monthly payment", "EMI (principal + interest)", "Rental + 18% GST"],
    ["Balance sheet", "On balance sheet (asset + loan)", "Off balance sheet (operating lease)"],
    ["Depreciation", "You claim (40% accelerated)", "The financier claims (not you)"],
    ["GST", "Upfront input credit on project", "GST charged on each rental"],
    ["Income-tax benefit", "Interest + depreciation deductible", "100% of rental deductible"],
    ["Pre-closure", "Charges may apply", "No pre-closure charges"],
  ];

  return (
    <Section className="py-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2"><Wallet className="w-5 h-5 text-amber-400" /><h3 className="font-head font-semibold text-xl text-slate-100">Financing — full breakdown</h3></div>
          <Segmented options={[{ value: "loan", label: "Term Loan" }, { value: "lease", label: "Leasing" }]} value={structure} onChange={setStructure} testId="finance-structure" />
        </div>

        {/* Structure explainer */}
        <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/10 mb-6 text-sm text-slate-400 leading-relaxed">
          {isLoan
            ? <><span className="text-slate-200 font-semibold">Term Loan:</span> you own the plant from day one, repay a monthly EMI on reducing balance, claim depreciation and upfront GST input credit. Pre-closure charges may apply.</>
            : <><span className="text-slate-200 font-semibold">Operating Lease:</span> the financier owns the plant and you pay a monthly rental (+GST); the full rental is tax-deductible and it stays off your balance sheet. Ownership transfers to you after {lease.months} months of timely rentals. No pre-closure charges.</>}
        </div>

        {isLoan ? (
          <>
            <div className="flex justify-end mb-4">
              <Segmented options={[{ value: "reducing", label: "Reducing rate" }, { value: "flat", label: "Flat rate" }]} value={method} onChange={setMethod} testId="finance-method" />
            </div>
            {/* Payoff banner */}
            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 mb-6 flex flex-wrap items-center gap-x-8 gap-y-2">
              <div><div className="text-[10px] uppercase tracking-wider text-amber-500/80 font-mono">You pay</div><div className="num text-2xl font-bold text-amber-400" data-testid="emi-amount">{inr(active.emi)}<span className="text-sm text-slate-500 font-normal">/month</span></div></div>
              <div className="text-slate-500 text-sm">for <span className="num text-slate-200 font-semibold">{pkg.payoffMonths} EMIs</span> — from <span className="text-slate-200">{startLabel}</span> until <span className="text-slate-200 font-semibold">{endLabel}</span></div>
              {method === "flat" && <Pill tone="danger">Effective rate ≈ {pct(pkg.flat.effectiveRate)} reducing</Pill>}
            </div>
          </>
        ) : (
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 mb-6 flex flex-wrap items-center gap-x-8 gap-y-2">
            <div><div className="text-[10px] uppercase tracking-wider text-amber-500/80 font-mono">Monthly rental</div><div className="num text-2xl font-bold text-amber-400" data-testid="rental-amount">{inr(lease.rentalInclGst)}<span className="text-sm text-slate-500 font-normal">/month</span></div><div className="text-[11px] text-slate-500">{inr(lease.rentalExGst)} + {inr(lease.gst)} GST</div></div>
            <div className="text-slate-500 text-sm">for <span className="num text-slate-200 font-semibold">{lease.months} rentals</span> — until <span className="text-slate-200 font-semibold">{leaseEndLabel}</span>{lease.rentalPerUnit ? <> · <span className="num text-slate-200">₹{lease.rentalPerUnit.toFixed(2)}/unit</span></> : null}</div>
            <Pill tone="emerald">Effective ≈ {pct(leaseRate)} reducing</Pill>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Fee breakdown */}
          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-3">Cost & fee breakdown</h4>
            <div className="space-y-1.5">
              {fees.map(([k, v], i) => (
                <div key={k} className={`flex justify-between text-sm py-1.5 ${i === fees.length - 1 ? "border-t border-white/10 pt-2.5 font-semibold" : ""}`}>
                  <span className="text-slate-400">{k}</span><span className={`num ${i === fees.length - 1 ? "text-amber-400" : "text-slate-200"}`}>{inr(v)}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <SliderInput label="Processing fee" value={feePct} onChange={setFeePct} min={0} max={3} step={0.25} format={(v) => `${v}%`} testId="fee-slider" />
              {isLoan && method === "flat" && <SliderInput label="Flat interest rate" value={flatRate} onChange={setFlatRate} min={5} max={13} step={0.25} format={(v) => `${v}%`} testId="flat-slider" />}
              {!isLoan && <SliderInput label="Effective lease rate" value={leaseRate} onChange={setLeaseRate} min={7} max={14} step={0.25} format={(v) => `${v}%`} testId="lease-slider" />}
              {!isLoan && <SliderInput label="Lease tenure" value={leaseTenure} onChange={setLeaseTenure} min={3} max={7} step={1} format={(v) => `${v} yrs`} testId="lease-tenure-slider" />}
            </div>
          </div>

          {/* Repayment metrics */}
          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-3">{isLoan ? `Repayment (${method === "reducing" ? "reducing balance" : "flat"})` : "Lease summary"}</h4>
            <div className="grid grid-cols-2 gap-3">
              {isLoan ? (
                <>
                  <Metric label="Monthly EMI" value={inr(active.emi)} tone="amber" />
                  <Metric label="Principal" value={inrCompact(pkg.loanAmount)} tone="blue" />
                  <Metric label="Total Interest" value={inrCompact(active.totalInterest)} tone="danger" />
                  <Metric label="Total Repayment" value={inrCompact(active.totalRepayment)} />
                  <Metric label="Total Cost of Credit" value={inrCompact(pkg.totalCostOfCredit)} tone="danger" sub="Interest + fees + GST" />
                  <Metric label="Loan Closes" value={endLabel} tone="emerald" sub={`${pkg.payoffMonths} EMIs`} />
                </>
              ) : (
                <>
                  <Metric label="Rental (incl GST)" value={inr(lease.rentalInclGst)} tone="amber" />
                  <Metric label="Rental (ex GST)" value={inr(lease.rentalExGst)} tone="blue" />
                  <Metric label="GST / month (18%)" value={inr(lease.gst)} tone="danger" />
                  <Metric label="Total Rentals (incl GST)" value={inrCompact(lease.totalRentalsInclGst)} />
                  <Metric label="Rental per unit" value={lease.rentalPerUnit ? `₹${lease.rentalPerUnit.toFixed(2)}` : "—"} tone="emerald" sub="₹/kWh generated" />
                  <Metric label="Ownership transfers" value={leaseEndLabel} tone="emerald" sub={`after ${lease.months} rentals`} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reducing vs flat comparison (loan only) */}
        {isLoan && (
          <div className="mt-6 overflow-x-auto">
            <h4 className="text-sm font-medium text-slate-200 mb-3">Reducing vs Flat — why the quoted rate matters</h4>
            <table className="w-full text-sm min-w-[560px]">
              <thead className="text-slate-500 text-xs uppercase tracking-wider font-mono border-b border-white/10">
                <tr>{["Method", "Quoted rate", "Monthly EMI", "Total interest", "Effective rate"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="px-3 py-3 font-medium text-emerald-400">Reducing balance</td>
                  <td className="px-3 py-3 num text-slate-300">{interestRate}%</td>
                  <td className="px-3 py-3 num text-slate-200">{inr(pkg.reducing.emi)}</td>
                  <td className="px-3 py-3 num text-amber-400">{inrCompact(pkg.reducing.totalInterest)}</td>
                  <td className="px-3 py-3 num text-slate-300">{interestRate}%</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 font-medium text-slate-300">Flat rate</td>
                  <td className="px-3 py-3 num text-slate-300">{flatRate}%</td>
                  <td className="px-3 py-3 num text-slate-200">{inr(pkg.flat.emi)}</td>
                  <td className="px-3 py-3 num text-amber-400">{inrCompact(pkg.flat.totalInterest)}</td>
                  <td className="px-3 py-3 num text-red-400">≈ {pct(pkg.flat.effectiveRate)}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[11px] text-slate-500 mt-2">A flat {flatRate}% is not the same as reducing {flatRate}% — its true (reducing-balance) cost is about {pct(pkg.flat.effectiveRate)}. Always compare on effective/reducing rate.</p>
          </div>
        )}

        {/* Term Loan vs Leasing comparison */}
        <div className="mt-6 overflow-x-auto">
          <h4 className="text-sm font-medium text-slate-200 mb-3">Term Loan vs Leasing</h4>
          <table className="w-full text-sm min-w-[620px]">
            <thead className="text-slate-500 text-xs uppercase tracking-wider font-mono border-b border-white/10">
              <tr><th className="px-3 py-2.5 text-left font-medium">Feature</th><th className={`px-3 py-2.5 text-left font-medium ${isLoan ? "text-amber-400" : ""}`}>Term Loan</th><th className={`px-3 py-2.5 text-left font-medium ${!isLoan ? "text-amber-400" : ""}`}>Operating Lease</th></tr>
            </thead>
            <tbody>
              {compRows.map(([feat, loan, lz]) => (
                <tr key={feat} className="border-b border-white/5">
                  <td className="px-3 py-2.5 text-slate-400">{feat}</td>
                  <td className={`px-3 py-2.5 ${isLoan ? "text-slate-100" : "text-slate-400"}`}>{loan}</td>
                  <td className={`px-3 py-2.5 ${!isLoan ? "text-slate-100" : "text-slate-400"}`}>{lz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Full schedule (yearly + all-months) */}
        <div className="mt-6">
          <button onClick={() => setShowSchedule(!showSchedule)} className="text-sm text-amber-400 hover:text-amber-300 font-medium" data-testid="toggle-schedule">
            {showSchedule ? "Hide" : "Show"} {isLoan ? "EMI" : "rental"} schedule →
          </button>
          {showSchedule && (
            <div className="mt-4">
              {/* Yearly summary */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[620px]">
                  <thead className="text-slate-500 text-xs uppercase tracking-wider font-mono border-b border-white/10">
                    <tr>{(isLoan ? ["Year", "Annual EMI", "Principal paid", "Interest paid", "Balance left"] : ["Year", "Annual rental (incl GST)", "GST portion", "Rentals left"]).map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {isLoan ? pkg.amort.yearly.map((y) => (
                      <tr key={y.year} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-3 py-2.5 text-slate-300">Year {y.year}</td>
                        <td className="px-3 py-2.5 num text-slate-200">{inr(y.debtService)}</td>
                        <td className="px-3 py-2.5 num text-emerald-400">{inr(y.principal)}</td>
                        <td className="px-3 py-2.5 num text-amber-400">{inr(y.interest)}</td>
                        <td className="px-3 py-2.5 num text-slate-300">{inr(y.closingBalance)}</td>
                      </tr>
                    )) : Array.from({ length: Math.ceil(lease.months / 12) }).map((_, yi) => {
                      const monthsThisYr = Math.min(12, lease.months - yi * 12);
                      return (
                        <tr key={yi} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-3 py-2.5 text-slate-300">Year {yi + 1}</td>
                          <td className="px-3 py-2.5 num text-slate-200">{inr(lease.rentalInclGst * monthsThisYr)}</td>
                          <td className="px-3 py-2.5 num text-amber-400">{inr(lease.gst * monthsThisYr)}</td>
                          <td className="px-3 py-2.5 num text-slate-300">{lease.months - (yi + 1) * monthsThisYr < 0 ? 0 : lease.months - Math.min((yi + 1) * 12, lease.months)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* All months */}
              <button onClick={() => setShowAllMonths(!showAllMonths)} className="text-sm text-amber-400 hover:text-amber-300 font-medium mt-4" data-testid="toggle-monthly">
                {showAllMonths ? "Hide" : "Show"} every single month ({isLoan ? pkg.payoffMonths : lease.months} payments) →
              </button>
              {showAllMonths && (
                <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-white/10" data-testid="monthly-schedule">
                  <table className="w-full text-sm min-w-[620px]">
                    <thead className="text-slate-500 text-[10px] uppercase tracking-wider font-mono border-b border-white/10 sticky top-0 bg-[#0D1B2A]">
                      <tr>{(isLoan ? ["#", "Month", "EMI", "Principal", "Interest", "Balance"] : ["#", "Month", "Rental (incl GST)", "GST"]).map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {isLoan ? pkg.amort.monthly.map((mo) => {
                        const d = new Date(start.getFullYear(), start.getMonth() + mo.month, 1);
                        return (
                          <tr key={mo.month} className="border-b border-white/5">
                            <td className="px-3 py-1.5 num text-slate-500">{mo.month}</td>
                            <td className="px-3 py-1.5 text-slate-400">{d.toLocaleString("en-IN", { month: "short", year: "2-digit" })}</td>
                            <td className="px-3 py-1.5 num text-slate-200">{inr(mo.emi)}</td>
                            <td className="px-3 py-1.5 num text-emerald-400">{inr(mo.principal)}</td>
                            <td className="px-3 py-1.5 num text-amber-400">{inr(mo.interest)}</td>
                            <td className="px-3 py-1.5 num text-slate-300">{inr(mo.balance)}</td>
                          </tr>
                        );
                      }) : Array.from({ length: lease.months }).map((_, i) => {
                        const d = new Date(start.getFullYear(), start.getMonth() + i + 1, 1);
                        return (
                          <tr key={i} className="border-b border-white/5">
                            <td className="px-3 py-1.5 num text-slate-500">{i + 1}</td>
                            <td className="px-3 py-1.5 text-slate-400">{d.toLocaleString("en-IN", { month: "short", year: "2-digit" })}</td>
                            <td className="px-3 py-1.5 num text-slate-200">{inr(lease.rentalInclGst)}</td>
                            <td className="px-3 py-1.5 num text-amber-400">{inr(lease.gst)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2">{isLoan ? `Reducing-balance schedule — early EMIs are interest-heavy; loan closes ${endLabel}.` : `Level monthly rental (+GST) for ${lease.months} months; ownership transfers ${leaseEndLabel}.`}</p>
            </div>
          )}
        </div>
        <Disclaimer className="mt-6">Fees, GST, lease rentals and rates are indicative and configurable by the financing partner, and finalised at credit assessment. Depreciation, GST-input and lease-rental tax treatment should be confirmed with a qualified tax professional.</Disclaimer>
      </Card>
    </Section>
  );
}

// ============================ TARIFF HISTORY ============================
function TariffHistory({ stateObj, discom, effectiveTariff, escalationPct }) {
  const trend = getTariffTrend(stateObj?.code);
  const history = buildTariffHistory(effectiveTariff, trend.c10, 10);
  const risers = topTariffRisers(STATES, 6);
  const firstYr = history[0];
  const lastYr = history[history.length - 1];

  return (
    <Section className="py-6">
      <Card>
        <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-5 h-5 text-amber-400" /><h3 className="font-head font-semibold text-xl text-slate-100">Electricity tariff trend — why solar gets better every year</h3></div>
        <p className="text-sm text-slate-500 mb-5">{stateObj?.name || "Your state"}{discom ? ` · ${discom}` : ""} — grid power keeps getting costlier, so your solar savings grow over time. Your rate is locked; the grid's is not.</p>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LineChartCard data={history} xKey="year" fmt={(v) => `₹${Number(v).toFixed(1)}`} series={[{ key: "tariff", name: "Tariff ₹/kWh", color: "#F59E0B" }]} height={240} />
            <p className="text-[11px] text-slate-500 mt-2">Indicative HT C&I tariff, back-computed from today's ₹{Number(effectiveTariff).toFixed(2)}/kWh using the state's historical CAGR.</p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="10-yr tariff CAGR" value={pct(trend.c10)} tone="amber" />
              <Metric label="5-yr tariff CAGR" value={pct(trend.c5)} tone="danger" />
            </div>
            <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10 text-sm">
              <div className="text-slate-400">Tariff moved from about</div>
              <div className="num text-slate-200 font-semibold">₹{firstYr.tariff} <span className="text-slate-500">({firstYr.year})</span> → ₹{lastYr.tariff} <span className="text-slate-500">({lastYr.year})</span></div>
              <div className="text-xs text-slate-500 mt-2">A ~{pct(((lastYr.tariff / firstYr.tariff) - 1) * 100, 0)} rise over 10 years. Assuming this continues, your solar savings escalate each year.</div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-slate-200 mb-3">States with the steepest C&I tariff rise (10-yr CAGR)</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {risers.map((r) => (
              <div key={r.code} className={`p-3 rounded-lg border ${stateObj?.code === r.code ? "bg-amber-500/10 border-amber-500/30" : "bg-slate-900/40 border-slate-800"}`}>
                <div className="text-xs text-slate-300 truncate">{r.name}</div>
                <div className="num text-lg font-bold text-amber-400">{pct(r.c10)}</div>
              </div>
            ))}
          </div>
        </div>
        <SourceTag className="mt-5 pt-4 border-t border-white/10" source={TARIFF_TREND_META.source} verified={TARIFF_TREND_META.lastVerified} />
        <Disclaimer className="mt-3">{TARIFF_TREND_META.note}</Disclaimer>
      </Card>
    </Section>
  );
}
