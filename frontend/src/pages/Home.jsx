import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sun, TrendingUp, Zap, IndianRupee, Leaf, ArrowRight, Calculator as CalcIcon,
  Building2, FileText, BarChart3, ShieldCheck, MapPin, Landmark, Factory, Gauge, Clock,
} from "lucide-react";
import { Section, Eyebrow, Card, Metric, Btn, Pill, Disclaimer } from "@/components/ui-kit";
import { DEMO_CUSTOMER } from "@/data/content";
import { STATES } from "@/data/states";
import { stateTariffRange } from "@/data/discoms";
import { inrCompact, kw, kwh, num } from "@/lib/format";
import { runProjectModel, recommendSystemSize } from "@/lib/engine";
import { DEFAULTS, rateForCapacity } from "@/data/config";

// Precompute a live-style demo opportunity from the engine (illustrative)
function demoModel() {
  const annualUnits = DEMO_CUSTOMER.monthlyUnits * 12;
  const rec = recommendSystemSize({ annualUnits, daytimePct: DEMO_CUSTOMER.daytimePct / 100, specificYield: 1500, roofAreaSqft: DEMO_CUSTOMER.roofAreaSqft });
  const cap = rec.recommendedKw;
  const m = runProjectModel({
    capacityKw: cap, irradiation: 5.3, performanceRatio: DEFAULTS.performanceRatio, shading: "Low",
    ratePerWatt: rateForCapacity(cap), annualUnits, effectiveTariff: DEMO_CUSTOMER.tariff,
    daytimePct: DEMO_CUSTOMER.daytimePct / 100, tariffEscalation: 0.05, financingPct: 0.8,
    interestRate: DEFAULTS.interestRate, tenureYears: DEFAULTS.tenureYears,
  });
  return { cap, m };
}

export default function Home() {
  const [{ cap, m }] = useState(demoModel);
  const [count, setCount] = useState(0);
  useEffect(() => {
    let i = 0; const t = setInterval(() => { i += 3; setCount(Math.min(i, cap)); if (i >= cap) clearInterval(t); }, 16);
    return () => clearInterval(t);
  }, [cap]);

  const heroMetrics = [
    { label: "Recommended Capacity", value: `${num(count)} kW`, tone: "amber", icon: Sun },
    { label: "Annual Generation", value: kwh(m.generation.year1Generation), tone: "blue", icon: Zap },
    { label: "Annual Savings (Yr 1)", value: inrCompact(m.metrics.annualSavingsY1), tone: "emerald", icon: IndianRupee },
    { label: "Simple Payback", value: `${m.metrics.simplePayback?.toFixed(1)} yrs`, tone: "amber", icon: Clock },
    { label: "CO₂ Avoided (25 yr)", value: `${num(m.environmental.lifetimeCo2Tonnes)} t`, tone: "emerald", icon: Leaf },
  ];

  return (
    <div>
      {/* HERO */}
      <div className="relative hero-radial border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <Section className="relative py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <div className="flex items-center gap-2 mb-6">
                <Pill tone="emerald"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" /> Solar Intelligence</Pill>
                <Pill tone="slate">Neutral marketplace — Customer · EPC · Financiers</Pill>
              </div>
              <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-50 leading-[1.05]">
                How much can your business <span className="text-amber-500">save</span> by going solar?
              </h1>
              <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-xl">
                Calculate your solar requirement, project cost, electricity savings, financing requirement, EMI, payback period and long-term returns — in minutes.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Btn as={Link} to="/calculator" data-testid="hero-cta-calculate" className="text-base px-6 py-3">
                  <CalcIcon className="w-4 h-4" /> Calculate My Solar Savings
                </Btn>
                <Btn as={Link} to="/financing" variant="secondary" data-testid="hero-cta-financing" className="text-base px-6 py-3">
                  Explore Solar Financing
                </Btn>
                <Btn as={Link} to="/epc" variant="outline" data-testid="hero-cta-epc" className="text-base px-6 py-3">
                  <Building2 className="w-4 h-4" /> EPC Partner? Submit a Project
                </Btn>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500/70" /> Source-tagged data</span>
                <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-blue-500/70" /> 25-year financial model</span>
                <span className="flex items-center gap-1.5"><Landmark className="w-4 h-4 text-amber-500/70" /> All-India DISCOM & policy</span>
              </div>
            </div>

            {/* Illustrative opportunity card */}
            <div className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-mono rounded-bl-lg border-l border-b border-amber-500/20">DEMO / ILLUSTRATIVE</div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                  <MapPin className="w-3.5 h-3.5" /> Faridabad, Haryana · Manufacturing · ₹10L/month bill
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {heroMetrics.slice(0, 4).map((mm) => (
                    <div key={mm.label} className="bg-white/[0.03] border border-white/8 rounded-lg p-4">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-1">{mm.label}</div>
                      <div className={`num text-xl font-bold text-${mm.tone === "amber" ? "amber" : mm.tone === "emerald" ? "emerald" : "blue"}-400`}>{mm.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-500/80 font-mono">Net Monthly Benefit</div>
                    <div className="num text-2xl font-bold text-emerald-400">{inrCompact(m.metrics.netMonthlyBenefit)}</div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-emerald-400/60" />
                </div>
                <Link to="/calculator" className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-400 hover:text-amber-300 font-medium">
                  Run your own numbers <ArrowRight className="w-4 h-4" />
                </Link>
              </Card>
            </div>
          </div>
        </Section>
      </div>

      {/* LIVE-STYLE METRICS STRIP */}
      <Section className="py-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {heroMetrics.map((mm) => <Metric key={mm.label} {...mm} testId={`home-metric-${mm.label.toLowerCase().replace(/[^a-z]+/g, "-")}`} />)}
        </div>
        <p className="text-[11px] text-slate-600 font-mono mt-3">Illustrative figures from the Solar Intelligence calculation engine · Assumptions: ₹8.5/kWh tariff, 5% escalation, 80% financing @ 11% / 7yr · Not a guarantee.</p>
      </Section>

      {/* JOURNEY */}
      <Section className="py-14">
        <div className="text-center mb-12">
          <Eyebrow className="justify-center">The Solar Decision, End to End</Eyebrow>
          <h2 className="font-head text-3xl lg:text-4xl font-bold text-slate-50 mt-4">One platform, from bill to financing</h2>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto">Arrive with nothing but an electricity bill. Leave with a clear view of capacity, cost, savings, EMI, payback, ROI and next steps.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {["Electricity Bill", "Solar Potential", "Project Size & Cost", "Govt Benefits", "Financing & EMI", "Savings & Payback", "Financing Lead"].map((s, i) => (
            <div key={s} className="card-surface p-4 text-center relative">
              <div className="num text-amber-500/40 text-2xl font-bold">{String(i + 1).padStart(2, "0")}</div>
              <div className="text-xs text-slate-300 mt-1 font-medium leading-snug">{s}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* FEATURE GRID */}
      <Section className="py-14">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: CalcIcon, title: "6-Step Solar Calculator", desc: "Location, business profile, bill, site, system and cost — with an auto-recommended system size.", href: "/calculator", tone: "amber" },
            { icon: IndianRupee, title: "Financing & EMI Engine", desc: "EMI, amortization, DSCR and financing scenarios (70/80/100%) across banks, NBFCs & DFIs.", href: "/financing", tone: "emerald" },
            { icon: BarChart3, title: "25-Year Financial Model", desc: "Cash flow, cumulative savings, IRR, NPV, payback and sensitivity — all charted.", href: "/calculator", tone: "blue" },
            { icon: MapPin, title: "State & DISCOM Database", desc: "Irradiation, C&I tariffs, net-metering & open-access rules for every state and major DISCOM.", href: "/states", tone: "violet" },
            { icon: Landmark, title: "Government Benefits Engine", desc: "Accelerated depreciation, GEOA, GST, state incentives — with dynamic eligibility.", href: "/government", tone: "amber" },
            { icon: Factory, title: "Industry Opportunity", desc: "Solar suitability, typical sizing and financing model for 25+ C&I sectors.", href: "/industries", tone: "emerald" },
          ].map((f) => (
            <Link key={f.title} to={f.href} className="card-surface p-6 hover:border-amber-500/40 transition-all group" data-testid={`feature-${f.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              <div className={`w-11 h-11 rounded-lg bg-${f.tone === "amber" ? "amber" : f.tone === "emerald" ? "emerald" : f.tone === "blue" ? "blue" : "violet"}-500/10 flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 text-${f.tone === "amber" ? "amber" : f.tone === "emerald" ? "emerald" : f.tone === "blue" ? "blue" : "violet"}-400`} />
              </div>
              <h3 className="font-head font-semibold text-lg text-slate-100 group-hover:text-amber-400 transition-colors">{f.title}</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{f.desc}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-500/80 font-medium">Explore <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></div>
            </Link>
          ))}
        </div>
      </Section>

      {/* WHY / WHEN SOLAR WORKS */}
      <Section className="py-14">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-4"><Gauge className="w-5 h-5 text-emerald-400" /><h3 className="font-head font-semibold text-xl text-slate-100">When solar works well</h3></div>
            <ul className="space-y-3 text-sm text-slate-300">
              {["High C&I tariff (₹8+/kWh) and large monthly spend", "Strong daytime load matching solar generation", "Adequate shadow-free roof or land", "Long operating hours, 6–7 days a week", "Good irradiation (Rajasthan, Gujarat, southern states)", "CAPEX ownership to capture depreciation benefit"].map((x) => (
                <li key={x} className="flex gap-2.5"><span className="text-emerald-400 mt-0.5">✓</span>{x}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-4"><Gauge className="w-5 h-5 text-red-400" /><h3 className="font-head font-semibold text-xl text-slate-100">When it is weaker</h3></div>
            <ul className="space-y-3 text-sm text-slate-300">
              {["Predominantly night-time load with little daytime use", "Heavy shading or very limited roof area", "Low tariff (subsidised / very cheap power)", "Short operating hours or seasonal shutdowns", "Leased premises without roof rights", "Base load far exceeding rooftop potential (steel, cement)"].map((x) => (
                <li key={x} className="flex gap-2.5"><span className="text-red-400 mt-0.5">✕</span>{x}</li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      {/* STATE SNAPSHOT */}
      <Section className="py-14">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <Eyebrow>India Solar Data</Eyebrow>
            <h2 className="font-head text-3xl font-bold text-slate-50 mt-3">Top solar states by installed capacity</h2>
          </div>
          <Btn as={Link} to="/states" variant="outline">View full database <ArrowRight className="w-4 h-4" /></Btn>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...STATES].sort((a, b) => b.installedMw - a.installedMw).slice(0, 8).map((s) => (
            <Link key={s.code} to={`/solar/state/${s.code}`} className="card-surface p-5 hover:border-amber-500/40 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100 group-hover:text-amber-400">{s.name}</span>
                <span className="num text-[10px] text-slate-500">{s.code}</span>
              </div>
              <div className="num text-2xl font-bold text-amber-400 mt-3">{num(s.installedMw)} <span className="text-sm text-slate-500">MW</span></div>
              <div className="text-[11px] text-slate-500 mt-1">Irradiation {s.irradiation} kWh/m²/day · HT {stateTariffRange(s.name) || "tariff: check bill"}</div>
            </Link>
          ))}
        </div>
        <p className="text-[11px] text-slate-600 font-mono mt-3">Installed capacity figures indicative · Source: State/central RE data · Last verified 2026-06</p>
      </Section>

      {/* CTA BANNER */}
      <Section className="py-14">
        <div className="card-surface p-8 lg:p-12 relative overflow-hidden hero-radial">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-head text-3xl lg:text-4xl font-bold text-slate-50">Your solar project doesn't have to wait for upfront capital.</h2>
              <p className="text-slate-400 mt-4 max-w-lg">Solar Intelligence matches eligible industrial and commercial solar projects with the right banks, NBFCs and DFIs — so you can go solar without upfront capital.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Btn as={Link} to="/calculator" data-testid="banner-cta-calc">Start the Calculator <ArrowRight className="w-4 h-4" /></Btn>
                <Btn as={Link} to="/financing" variant="secondary">See financing details</Btn>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[["Up to ₹3 Cr", "Project financing"], ["3–10 yrs", "Flexible tenure"], ["Fast-track", "Assessment"]].map(([a, b]) => (
                <div key={a} className="bg-white/[0.03] border border-white/8 rounded-lg p-4 text-center">
                  <div className="num text-lg font-bold text-amber-400">{a}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Disclaimer className="mt-4">Financing figures are indicative and subject to the financing partner's credit assessment, applicable terms and approval. Solar Intelligence is a neutral marketplace, not an EPC installer or lender.</Disclaimer>
      </Section>
    </div>
  );
}
