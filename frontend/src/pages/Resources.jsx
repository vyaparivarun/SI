import React, { useState } from "react";
import { PageHeader, Section, Card, Disclaimer } from "@/components/ui-kit";
import { TextInput } from "@/components/Form";
import { GLOSSARY, FAQS, DOCUMENTS } from "@/data/content";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, BookOpen, HelpCircle, FileText } from "lucide-react";

export default function Resources() {
  const [q, setQ] = useState("");
  const glossary = GLOSSARY.filter((g) => g.term.toLowerCase().includes(q.toLowerCase()) || g.def.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader eyebrow="Resources" title="Knowledge centre, glossary & FAQs"
        subtitle="Everything you need to understand solar for business — in plain language." />

      <Section id="glossary" className="py-12">
        <div className="flex items-center gap-2 mb-6"><BookOpen className="w-5 h-5 text-amber-400" /><h2 className="font-head font-semibold text-2xl text-slate-100">Glossary</h2></div>
        <div className="max-w-md mb-6 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <TextInput placeholder="Search terms" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" data-testid="glossary-search" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {glossary.map((g) => (
            <Card key={g.term} className="!p-5"><div className="font-semibold text-amber-400 text-sm mb-1">{g.term}</div><p className="text-sm text-slate-400 leading-relaxed">{g.def}</p></Card>
          ))}
        </div>
      </Section>

      <Section id="faqs" className="py-12">
        <div className="flex items-center gap-2 mb-6"><HelpCircle className="w-5 h-5 text-amber-400" /><h2 className="font-head font-semibold text-2xl text-slate-100">Frequently Asked Questions</h2></div>
        <Card>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-white/10">
                <AccordionTrigger className="text-slate-100 hover:text-amber-400 text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-slate-400 text-sm leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </Section>

      <Section id="downloads" className="py-12">
        <div className="flex items-center gap-2 mb-6"><FileText className="w-5 h-5 text-amber-400" /><h2 className="font-head font-semibold text-2xl text-slate-100">Documents Reference</h2></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DOCUMENTS.map((d) => (
            <Card key={d.group} className="!p-5"><div className="font-semibold text-slate-100 text-sm mb-3">{d.group}</div><ul className="space-y-1.5">{d.items.map((it) => <li key={it} className="text-xs text-slate-400 flex gap-2"><span className="text-amber-500">•</span>{it}</li>)}</ul></Card>
          ))}
        </div>
        <Disclaimer className="mt-6">Not every customer will require every document. The exact list depends on the borrower profile and project, and is confirmed during the financing partner's assessment.</Disclaimer>
      </Section>
    </div>
  );
}
