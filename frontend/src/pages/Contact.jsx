import React, { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section, Card, Btn, Disclaimer, Metric } from "@/components/ui-kit";
import { Field, TextInput, NumberInput, Select } from "@/components/Form";
import { STATES } from "@/data/states";
import { BUSINESS_TYPES } from "@/data/industries";
import { createLead } from "@/lib/api";
import { Phone, Mail, MapPin, CheckCircle2 } from "lucide-react";

export default function Contact() {
  const [f, setF] = useState({ name: "", company: "", mobile: "", email: "", state: "", city: "", industry: "", monthlyBill: "", message: "" });
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.mobile) { toast.error("Name and mobile are required"); return; }
    setBusy(true);
    try {
      const lead = await createLead({ ...f, monthlyBill: Number(f.monthlyBill) || undefined, source: "contact" });
      setDone(lead);
      toast.success(`Enquiry submitted — ${lead.leadId}`);
    } catch { toast.error("Submission failed. Please try again."); }
    setBusy(false);
  };

  return (
    <div>
      <PageHeader eyebrow="Contact / Get a Quote" title="Talk to the Solar Intelligence team"
        subtitle="Share your details for a solar financing assessment or a callback from a Solar Intelligence specialist." />
      <Section className="py-14">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            {[[Phone, "Sales", "+91 1800-XXX-XXXX (demo)"], [Mail, "Email", "hello@solarintelligence.example (demo)"], [MapPin, "Platform", "Solar Savings, Financing & EPC Marketplace"]].map(([Icon, t, d]) => (
              <Card key={t} className="!p-5 flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Icon className="w-5 h-5 text-amber-400" /></div><div><div className="text-xs text-slate-500 font-mono uppercase tracking-wider">{t}</div><div className="text-sm text-slate-200">{d}</div></div></Card>
            ))}
            <Disclaimer>Solar Intelligence is a neutral marketplace connecting customers, EPCs and financing partners — not an EPC installer or a lender. We help evaluate and finance eligible C&I solar projects.</Disclaimer>
          </div>

          <Card className="lg:col-span-2">
            {done ? (
              <div className="text-center py-10" data-testid="contact-success">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
                <h3 className="font-head text-2xl font-bold text-slate-100">Thank you, {done.name}!</h3>
                <p className="text-slate-400 mt-2">Your enquiry has been received.</p>
                <div className="num text-lg text-amber-400 mt-4">Reference: {done.leadId}</div>
                <Metric className="max-w-xs mx-auto mt-6" label="Lead Intent" value={done.intent} tone={done.intent === "HIGH" ? "emerald" : "amber"} />
              </div>
            ) : (
              <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4" data-testid="contact-form">
                <Field label="Name *"><TextInput value={f.name} onChange={upd("name")} placeholder="Your name" data-testid="contact-name" /></Field>
                <Field label="Company"><TextInput value={f.company} onChange={upd("company")} placeholder="Company name" data-testid="contact-company" /></Field>
                <Field label="Mobile *"><TextInput value={f.mobile} onChange={upd("mobile")} placeholder="10-digit mobile" data-testid="contact-mobile" /></Field>
                <Field label="Email"><TextInput value={f.email} onChange={upd("email")} placeholder="you@company.com" data-testid="contact-email" /></Field>
                <Field label="State"><Select value={f.state} onChange={upd("state")} options={STATES.map((s) => s.name)} placeholder="Select state" data-testid="contact-state" /></Field>
                <Field label="City"><TextInput value={f.city} onChange={upd("city")} placeholder="City" data-testid="contact-city" /></Field>
                <Field label="Business type"><Select value={f.industry} onChange={upd("industry")} options={BUSINESS_TYPES} placeholder="Select" data-testid="contact-industry" /></Field>
                <Field label="Monthly electricity bill (₹)"><NumberInput prefix="₹" value={f.monthlyBill} onChange={upd("monthlyBill")} placeholder="500000" data-testid="contact-bill" /></Field>
                <Field label="Message" className="sm:col-span-2"><textarea value={f.message} onChange={upd("message")} rows={3} className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 focus:border-amber-500 rounded-lg px-3.5 py-2.5 text-sm outline-none" placeholder="Tell us about your project" data-testid="contact-message" /></Field>
                <div className="sm:col-span-2"><Btn type="submit" disabled={busy} className="w-full py-3" data-testid="contact-submit">{busy ? "Submitting..." : "Submit Enquiry"}</Btn></div>
              </form>
            )}
          </Card>
        </div>
      </Section>
    </div>
  );
}
