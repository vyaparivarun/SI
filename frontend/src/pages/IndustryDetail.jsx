import React from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader, Section, Card, Pill, Disclaimer, Btn, Metric } from "@/components/ui-kit";
import { getIndustry, INDUSTRIES } from "@/data/industries";
import { ArrowRight, Sun, Gauge, Clock, Building2, Wrench } from "lucide-react";

export default function IndustryDetail() {
  const { slug } = useParams();
  const ind = getIndustry(slug);
  if (!ind) return (
    <Section className="py-24 text-center"><h1 className="font-head text-2xl text-slate-100">Industry not found</h1><Btn as={Link} to="/industries" className="mt-4">Back to industries</Btn></Section>
  );
  const tone = ind.suitability >= 85 ? "emerald" : ind.suitability >= 75 ? "amber" : "blue";
  return (
    <div>
      <PageHeader eyebrow="Industry Profile" title={`Solar for ${ind.name}`} subtitle={ind.desc}>
        <div className="flex flex-wrap gap-3">
          <Btn as={Link} to="/calculator"><Sun className="w-4 h-4" /> Calculate for my {ind.name.toLowerCase()} unit</Btn>
          <Pill tone={tone}>Suitability {ind.suitability}/100</Pill>
        </div>
      </PageHeader>
      <Section className="py-14">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Metric label="Electricity Intensity" value={ind.intensity} icon={Gauge} tone="amber" />
          <Metric label="Operating Hours/Day" value={ind.operatingHours} icon={Clock} tone="blue" />
          <Metric label="Daytime Load" value={`${Math.round(ind.daytimeLoad * 100)}%`} icon={Sun} tone="emerald" />
          <Metric label="Typical Project Size" value={ind.typicalSizeKw} icon={Building2} />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-head font-semibold text-xl text-slate-100 mb-4">Solar fit</h3>
            <dl className="space-y-3 text-sm">
              {[["Roof suitability", ind.roofSuitability], ["Recommended financing model", ind.financing], ["Common configuration", ind.config], ["Savings potential", ind.savingsPotential], ["Common challenges", ind.challenges]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-white/5 pb-2"><dt className="text-slate-500">{k}</dt><dd className="text-slate-200 text-right">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-4"><Wrench className="w-5 h-5 text-amber-400" /><h3 className="font-head font-semibold text-xl text-slate-100">Recommended approach</h3></div>
            <p className="text-sm text-slate-400 leading-relaxed">{ind.desc}</p>
            <div className="mt-5 p-4 rounded-lg bg-amber-500/5 border border-amber-500/15">
              <div className="text-xs uppercase tracking-wider text-amber-500/80 font-mono mb-1">Financing lens</div>
              <p className="text-sm text-slate-300">With partner financing, a {ind.name.toLowerCase()} unit can often deploy solar with no upfront capital — repaying the loan from electricity savings. Compare CAPEX vs OPEX in the calculator.</p>
            </div>
            <Btn as={Link} to="/financing" variant="outline" className="mt-4">Explore financing <ArrowRight className="w-4 h-4" /></Btn>
          </Card>
        </div>
        <Disclaimer className="mt-8">Profile figures are indicative sector averages. Actual solar economics depend on your specific tariff, consumption, site conditions and financing terms.</Disclaimer>

        <div className="mt-12">
          <h3 className="font-head font-semibold text-lg text-slate-100 mb-4">Other sectors</h3>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.filter((i) => i.slug !== slug).slice(0, 12).map((i) => (
              <Link key={i.slug} to={`/solar/${i.slug}`} className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition-colors">{i.name}</Link>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
