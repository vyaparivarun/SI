import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Section, Card, Btn, Disclaimer, Pill } from "@/components/ui-kit";
import { EPC_PARTNERS } from "@/data/partners";
import { TextInput } from "@/components/Form";
import { Building2, MapPin, Layers, ArrowRight, Search, Handshake, ShieldCheck } from "lucide-react";

export default function EpcPartners() {
  const [q, setQ] = useState("");
  const list = EPC_PARTNERS.filter((p) =>
    [p.name, p.hq, p.segment, p.models].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <PageHeader eyebrow="Marketplace · EPC Partners" title="Our EPC partners across India"
        subtitle="Solar Intelligence connects customers with experienced EPC (Engineering, Procurement & Construction) companies and the right financing partner. Browse leading Indian solar EPCs across utility, rooftop and open-access segments.">
        <div className="flex flex-wrap gap-2">
          <Pill tone="emerald"><ShieldCheck className="w-3 h-3" /> Vetted network</Pill>
          <Pill tone="amber">{EPC_PARTNERS.length} EPCs listed</Pill>
        </div>
      </PageHeader>

      <Section className="py-10">
        <div className="max-w-md mb-8 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <TextInput placeholder="Search EPC, city or model" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" data-testid="epcpartner-search" />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="epcpartner-grid">
          {list.map((p) => (
            <Card key={p.name} className="flex flex-col" data-testid={`epcpartner-card-${p.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-blue-400" /></div>
                <div>
                  <div className="font-head font-semibold text-slate-100 leading-tight">{p.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.hq}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Pill tone="amber">{p.segment}</Pill>
              </div>
              <dl className="space-y-2 text-xs mb-3">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Scale</dt><dd className="text-slate-300 text-right">{p.scale}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500 flex items-center gap-1"><Layers className="w-3 h-3" /> Models</dt><dd className="text-slate-300 text-right">{p.models}</dd></div>
              </dl>
              <p className="text-xs text-slate-400 leading-relaxed">{p.note}</p>
            </Card>
          ))}
        </div>
        {list.length === 0 && <p className="text-center text-slate-500 py-10">No EPC partners match your search.</p>}

        <Card className="hero-radial mt-10">
          <div className="grid lg:grid-cols-2 gap-6 items-center">
            <div>
              <div className="flex items-center gap-2 mb-2"><Handshake className="w-5 h-5 text-amber-400" /><h3 className="font-head font-semibold text-xl text-slate-100">Are you an EPC company?</h3></div>
              <p className="text-sm text-slate-400">Join the marketplace to bring your C&I customers a fast financing option and grow deal closure — CUSTOMER → SOLAR INTELLIGENCE → EPC & FINANCING PARTNERS.</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Btn as={Link} to="/epc">Become a partner <ArrowRight className="w-4 h-4" /></Btn>
              <Btn as={Link} to="/financing-partners" variant="secondary">View financing partners</Btn>
            </div>
          </div>
        </Card>

        <Disclaimer className="mt-6">EPC partner list is indicative and not exhaustive; inclusion is illustrative and not an endorsement or guarantee of engagement. Please conduct your own due diligence before appointing any EPC.</Disclaimer>
      </Section>
    </div>
  );
}
