import React, { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section, Card, Btn, Disclaimer, Pill, Eyebrow, Metric } from "@/components/ui-kit";
import { Field, TextInput, NumberInput, Select } from "@/components/Form";
import { STATES } from "@/data/states";
import { DISCOMS } from "@/data/discoms";
import { BUSINESS_TYPES } from "@/data/industries";
import { registerEPC, submitProject, getProject } from "@/lib/api";
import { inrCompact } from "@/lib/format";
import { Building2, Send, Search, CheckCircle2, Handshake, TrendingUp, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STAGES = ["Submitted", "Under Review", "Documents Pending", "Credit Evaluation", "Approved", "Disbursed"];

export default function EPC() {
  const [tab, setTab] = useState("register");

  // Register
  const [reg, setReg] = useState({ companyName: "", contactPerson: "", mobile: "", email: "", gstin: "", yearsInBusiness: "", annualInstallations: "", typicalProjectSize: "", moduleBrands: "", inverterBrands: "", projectsCompleted: "" });
  const [regDone, setRegDone] = useState(null);

  // Submit project
  const [prj, setPrj] = useState({ epcCompany: "", customerName: "", industry: "", state: "", city: "", discom: "", monthlyBill: "", monthlyUnits: "", sanctionedLoad: "", solarCapacityKw: "", projectCost: "", customerContribution: "", loanRequirement: "", projectModel: "CAPEX", commissioningDate: "" });
  const [prjDone, setPrjDone] = useState(null);
  const [busy, setBusy] = useState(false);

  // Track
  const [trackId, setTrackId] = useState("");
  const [tracked, setTracked] = useState(null);

  const doRegister = async (e) => {
    e.preventDefault();
    if (!reg.companyName || !reg.mobile) return toast.error("Company name and mobile required");
    setBusy(true);
    try { const r = await registerEPC({ ...reg, yearsInBusiness: Number(reg.yearsInBusiness) || undefined }); setRegDone(r); setPrj((p) => ({ ...p, epcCompany: r.companyName, epcId: r.epcId })); toast.success(`Registered — ${r.epcId}`); }
    catch { toast.error("Registration failed"); } setBusy(false);
  };

  const doSubmit = async (e) => {
    e.preventDefault();
    if (!prj.customerName) return toast.error("Customer name required");
    setBusy(true);
    try {
      const r = await submitProject({
        ...prj, epcId: regDone?.epcId,
        monthlyBill: Number(prj.monthlyBill) || undefined, monthlyUnits: Number(prj.monthlyUnits) || undefined,
        sanctionedLoad: Number(prj.sanctionedLoad) || undefined, solarCapacityKw: Number(prj.solarCapacityKw) || undefined,
        projectCost: Number(prj.projectCost) || undefined, customerContribution: Number(prj.customerContribution) || undefined,
        loanRequirement: Number(prj.loanRequirement) || undefined,
      });
      setPrjDone(r); toast.success(`Project submitted — ${r.projectId}`);
    } catch { toast.error("Submission failed"); } setBusy(false);
  };

  const doTrack = async () => {
    if (!trackId) return;
    try { const r = await getProject(trackId.trim()); setTracked(r); }
    catch { toast.error("Project not found"); setTracked(null); }
  };

  const stateDiscoms = DISCOMS.filter((d) => d.state === prj.state);

  return (
    <div>
      <PageHeader eyebrow="For EPC Partners" title="Are you an EPC? Submit your project."
        subtitle="Bring your industrial & commercial customers to our financing partners for fast solar financing. Register, submit a project, and track it to disbursement — CUSTOMER → SOLAR INTELLIGENCE → EPC & FINANCING PARTNERS.">
        <div className="flex flex-wrap gap-2">
          <Pill tone="amber"><Handshake className="w-3 h-3" /> Channel partner programme</Pill>
          <Pill tone="emerald">Lead pipeline & tracking</Pill>
        </div>
      </PageHeader>

      <Section className="py-14">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-slate-900/60 border border-slate-800 mb-8">
            <TabsTrigger value="register" data-testid="epc-tab-register">Become a Partner</TabsTrigger>
            <TabsTrigger value="submit" data-testid="epc-tab-submit">Submit a Project</TabsTrigger>
            <TabsTrigger value="dashboard" data-testid="epc-tab-dashboard">Track / Dashboard</TabsTrigger>
          </TabsList>

          {/* REGISTER */}
          <TabsContent value="register" id="register">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <Card>
                  <div className="flex items-center gap-2 mb-3"><Building2 className="w-5 h-5 text-amber-400" /><h3 className="font-head font-semibold text-lg text-slate-100">EPC Partner Benefits</h3></div>
                  <ul className="space-y-2.5 text-sm text-slate-400">
                    {["Fast financing for your customers", "Quick project calculator & eligibility check", "Structured lead pipeline & tracking", "Grow deal closure by removing capital barriers", "Access to multiple banks, NBFCs & DFIs"].map((b) => <li key={b} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{b}</li>)}
                  </ul>
                </Card>
              </div>
              <Card className="lg:col-span-2">
                {regDone ? (
                  <div className="text-center py-8" data-testid="epc-register-success">
                    <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
                    <h3 className="font-head text-2xl font-bold text-slate-100">Welcome, {regDone.companyName}!</h3>
                    <div className="num text-lg text-amber-400 mt-3">Partner ID: {regDone.epcId}</div>
                    <Btn className="mt-6" onClick={() => setTab("submit")}>Submit your first project</Btn>
                  </div>
                ) : (
                  <form onSubmit={doRegister} className="grid sm:grid-cols-2 gap-4" data-testid="epc-register-form">
                    <Field label="Company name *"><TextInput value={reg.companyName} onChange={(e) => setReg({ ...reg, companyName: e.target.value })} data-testid="epc-company" /></Field>
                    <Field label="Contact person"><TextInput value={reg.contactPerson} onChange={(e) => setReg({ ...reg, contactPerson: e.target.value })} /></Field>
                    <Field label="Mobile *"><TextInput value={reg.mobile} onChange={(e) => setReg({ ...reg, mobile: e.target.value })} data-testid="epc-mobile" /></Field>
                    <Field label="Email"><TextInput value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} /></Field>
                    <Field label="GSTIN"><TextInput value={reg.gstin} onChange={(e) => setReg({ ...reg, gstin: e.target.value })} /></Field>
                    <Field label="Years in business"><NumberInput value={reg.yearsInBusiness} onChange={(e) => setReg({ ...reg, yearsInBusiness: e.target.value })} /></Field>
                    <Field label="Annual installations (MW)"><TextInput value={reg.annualInstallations} onChange={(e) => setReg({ ...reg, annualInstallations: e.target.value })} /></Field>
                    <Field label="Typical project size"><TextInput value={reg.typicalProjectSize} onChange={(e) => setReg({ ...reg, typicalProjectSize: e.target.value })} placeholder="e.g. 200 kW – 2 MW" /></Field>
                    <Field label="Preferred module brands"><TextInput value={reg.moduleBrands} onChange={(e) => setReg({ ...reg, moduleBrands: e.target.value })} /></Field>
                    <Field label="Preferred inverter brands"><TextInput value={reg.inverterBrands} onChange={(e) => setReg({ ...reg, inverterBrands: e.target.value })} /></Field>
                    <Field label="Projects completed" className="sm:col-span-2"><TextInput value={reg.projectsCompleted} onChange={(e) => setReg({ ...reg, projectsCompleted: e.target.value })} /></Field>
                    <div className="sm:col-span-2"><Btn type="submit" disabled={busy} className="w-full py-3" data-testid="epc-register-submit">{busy ? "Registering..." : "Register as EPC Partner"}</Btn></div>
                  </form>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* SUBMIT */}
          <TabsContent value="submit" id="submit">
            <Card>
              {prjDone ? (
                <div className="text-center py-8" data-testid="epc-submit-success">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
                  <h3 className="font-head text-2xl font-bold text-slate-100">Project submitted for {prjDone.customerName}</h3>
                  <div className="num text-lg text-amber-400 mt-3">Lead ID: {prjDone.projectId}</div>
                  <div className="grid sm:grid-cols-3 gap-4 max-w-xl mx-auto mt-6">
                    <Metric label="Loan Requirement" value={inrCompact(prjDone.loanRequirement)} tone="amber" />
                    <Metric label="Intent" value={prjDone.intent} tone={prjDone.intent === "HIGH" ? "emerald" : "amber"} />
                    <Metric label="Score" value={`${prjDone.score}/100`} tone="blue" />
                  </div>
                  <div className="flex gap-3 justify-center mt-6">
                    <Btn variant="secondary" onClick={() => { setTrackId(prjDone.projectId); setTracked(prjDone); setTab("dashboard"); }}>Track this project</Btn>
                    <Btn onClick={() => { setPrjDone(null); }}>Submit another</Btn>
                  </div>
                </div>
              ) : (
                <form onSubmit={doSubmit} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="epc-submit-form">
                  <Field label="EPC company"><TextInput value={prj.epcCompany} onChange={(e) => setPrj({ ...prj, epcCompany: e.target.value })} placeholder={regDone?.companyName || "Your company"} /></Field>
                  <Field label="Customer name *"><TextInput value={prj.customerName} onChange={(e) => setPrj({ ...prj, customerName: e.target.value })} data-testid="prj-customer" /></Field>
                  <Field label="Industry"><Select value={prj.industry} onChange={(e) => setPrj({ ...prj, industry: e.target.value })} options={BUSINESS_TYPES} placeholder="Select" /></Field>
                  <Field label="State"><Select value={prj.state} onChange={(e) => setPrj({ ...prj, state: e.target.value, discom: "" })} options={STATES.map((s) => s.name)} placeholder="Select state" data-testid="prj-state" /></Field>
                  <Field label="City"><TextInput value={prj.city} onChange={(e) => setPrj({ ...prj, city: e.target.value })} /></Field>
                  <Field label="DISCOM"><Select value={prj.discom} onChange={(e) => setPrj({ ...prj, discom: e.target.value })} options={stateDiscoms.length ? stateDiscoms.map((d) => d.name) : DISCOMS.map((d) => d.name)} placeholder="Select DISCOM" /></Field>
                  <Field label="Monthly bill (₹)"><NumberInput prefix="₹" value={prj.monthlyBill} onChange={(e) => setPrj({ ...prj, monthlyBill: e.target.value })} data-testid="prj-bill" /></Field>
                  <Field label="Monthly units (kWh)"><NumberInput value={prj.monthlyUnits} onChange={(e) => setPrj({ ...prj, monthlyUnits: e.target.value })} suffix="kWh" /></Field>
                  <Field label="Sanctioned load (kW)"><NumberInput value={prj.sanctionedLoad} onChange={(e) => setPrj({ ...prj, sanctionedLoad: e.target.value })} suffix="kW" /></Field>
                  <Field label="Solar capacity (kW)"><NumberInput value={prj.solarCapacityKw} onChange={(e) => setPrj({ ...prj, solarCapacityKw: e.target.value })} suffix="kW" /></Field>
                  <Field label="Project cost (₹)"><NumberInput prefix="₹" value={prj.projectCost} onChange={(e) => setPrj({ ...prj, projectCost: e.target.value })} /></Field>
                  <Field label="Customer contribution (₹)"><NumberInput prefix="₹" value={prj.customerContribution} onChange={(e) => setPrj({ ...prj, customerContribution: e.target.value })} /></Field>
                  <Field label="Loan requirement (₹)"><NumberInput prefix="₹" value={prj.loanRequirement} onChange={(e) => setPrj({ ...prj, loanRequirement: e.target.value })} data-testid="prj-loan" /></Field>
                  <Field label="Project model"><Select value={prj.projectModel} onChange={(e) => setPrj({ ...prj, projectModel: e.target.value })} options={["CAPEX", "OPEX", "PPA", "Captive", "Group Captive", "Open Access"]} /></Field>
                  <Field label="Expected commissioning"><TextInput type="date" value={prj.commissioningDate} onChange={(e) => setPrj({ ...prj, commissioningDate: e.target.value })} /></Field>
                  <div className="sm:col-span-2 lg:col-span-3"><Btn type="submit" disabled={busy} className="w-full py-3" data-testid="epc-submit-project"><Send className="w-4 h-4" />{busy ? "Submitting..." : "Submit Project for Financing"}</Btn></div>
                </form>
              )}
            </Card>
            <Disclaimer className="mt-6">Submitting a project creates a financing lead routed to our financing partners. Financing is subject to the partner's credit assessment, applicable terms and approval.</Disclaimer>
          </TabsContent>

          {/* DASHBOARD / TRACK */}
          <TabsContent value="dashboard" id="dashboard">
            <Card className="mb-6">
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Track a project by Lead ID" className="flex-1 min-w-[240px]"><TextInput value={trackId} onChange={(e) => setTrackId(e.target.value)} placeholder="SI-PRJ-XXXX-XXXX" data-testid="track-input" /></Field>
                <Btn onClick={doTrack} data-testid="track-btn"><Search className="w-4 h-4" /> Track</Btn>
              </div>
            </Card>

            {tracked ? (
              <Card data-testid="track-result">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-head font-semibold text-xl text-slate-100">{tracked.customerName}</h3>
                    <div className="text-xs text-slate-500 mt-1">{tracked.projectId} · {tracked.industry || "—"} · {tracked.city || ""} {tracked.state || ""}</div>
                  </div>
                  <div className="flex gap-2">
                    <Pill tone={tracked.intent === "HIGH" ? "emerald" : "amber"}>{tracked.intent} intent</Pill>
                    <Pill tone="blue">Score {tracked.score}</Pill>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  <Metric label="Solar Capacity" value={tracked.solarCapacityKw ? `${tracked.solarCapacityKw} kW` : "—"} tone="amber" />
                  <Metric label="Project Cost" value={inrCompact(tracked.projectCost)} tone="blue" />
                  <Metric label="Loan Requirement" value={inrCompact(tracked.loanRequirement)} tone="emerald" />
                </div>
                <div className="relative">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {STAGES.map((st, i) => {
                      const curIdx = STAGES.indexOf(tracked.stage || "Submitted");
                      const active = i <= curIdx;
                      return (
                        <div key={st} className={`p-4 rounded-lg border text-center ${active ? "bg-amber-500/10 border-amber-500/30" : "bg-slate-900/40 border-slate-800"}`}>
                          <div className={`num text-xs font-bold ${active ? "text-amber-400" : "text-slate-600"}`}>{String(i + 1).padStart(2, "0")}</div>
                          <div className={`text-xs mt-1 ${active ? "text-slate-200" : "text-slate-600"}`}>{st}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Disclaimer className="mt-6">Stage shown is indicative for this demo. Actual credit evaluation follows the financing partner's internal process.</Disclaimer>
              </Card>
            ) : (
              <Card className="text-center py-14">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Enter a Lead ID above to track a submitted project through the financing pipeline.</p>
                <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs text-slate-500">
                  {STAGES.map((s) => <span key={s} className="px-2 py-1 rounded bg-slate-800/60">{s}</span>)}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </Section>
    </div>
  );
}
