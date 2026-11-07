import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, Btn, Pill } from "@/components/ui-kit";
import { Field, TextInput } from "@/components/Form";
import { adminLogin, adminOverview, adminUsers, adminUser, adminLeads, adminBillBlob, getAdminToken, setAdminToken, errMsg } from "@/lib/api";
import { inr, inrCompact } from "@/lib/format";
import { Sun, LogOut, Phone, Users, Calculator, Landmark, FileText, Inbox, Search, X, Loader2 } from "lucide-react";

const when = (s) => (s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
const KIND = { savings_calc: "Savings calculation", loan_calc: "Loan / lease comparison", bill_upload: "Electricity bill" };

function AdminLoginForm({ onIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await adminLogin(email, password); setAdminToken(r.token); onIn(); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0B1622]" data-testid="admin-login-page">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div className="flex items-center gap-2 text-slate-100 font-head font-bold text-lg"><Sun className="w-6 h-6 text-amber-400" /> Admin panel</div>
        <Field label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" data-testid="admin-email-input" /></Field>
        <Field label="Password"><TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" data-testid="admin-password-input" /></Field>
        <Btn type="submit" className="w-full justify-center" disabled={busy} data-testid="admin-login-btn">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Log in</Btn>
      </form>
    </div>
  );
}

function Stat({ icon: Icon, label, value, testId }) {
  return (
    <Card className="!p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-mono"><Icon className="w-3.5 h-3.5 text-amber-400" />{label}</div>
      <div className="num text-3xl font-bold text-slate-50 mt-2" data-testid={testId}>{value ?? "—"}</div>
    </Card>
  );
}

function ActivityItem({ a }) {
  const s = a.summary || {};
  const openBill = async () => {
    try { const blob = await adminBillBlob(s.fileId); window.open(URL.createObjectURL(blob), "_blank", "noopener"); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 text-sm" data-testid={`admin-activity-${a.id}`}>
      <div className="flex justify-between gap-2"><span className="text-slate-100 font-semibold">{KIND[a.kind] || a.kind}</span><span className="text-[11px] text-slate-500">{when(a.createdAt)}</span></div>
      {a.title && <div className="text-slate-400 text-xs mt-0.5">{a.title}</div>}
      {a.kind === "savings_calc" && <div className="text-xs text-slate-300 mt-1.5 num">{s.capacityKw} kW · cost {inrCompact(s.projectCost)} · saving {inr(s.monthlySaving)}/mo · bill {inr(s.monthlyBill)}/mo · {s.discom || s.state}</div>}
      {a.kind === "loan_calc" && <div className="text-xs text-slate-300 mt-1.5 num">{inrCompact(s.amount)} / {s.months} mo · reducing {inr(s.reducingEmi)} · flat {inr(s.flatEmi)} · lease {inr(s.leaseRental)}</div>}
      {a.kind === "bill_upload" && <button type="button" onClick={openBill} className="text-xs text-amber-400 hover:text-amber-300 mt-1.5" data-testid={`admin-bill-open-${a.id}`}>Open bill</button>}
    </div>
  );
}

function UserDetail({ id, onClose }) {
  const [d, setD] = useState(null);
  useEffect(() => { adminUser(id).then(setD).catch((e) => toast.error(errMsg(e))); }, [id]);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose} data-testid="admin-user-detail">
      <div className="w-full max-w-lg h-full overflow-y-auto bg-[#0D1B2A] border-l border-white/10 p-6" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="float-right text-slate-400 hover:text-slate-100" data-testid="admin-user-detail-close"><X className="w-5 h-5" /></button>
        {!d ? <Loader2 className="w-5 h-5 animate-spin text-amber-400" /> : (
          <>
            <h3 className="font-head text-xl font-bold text-slate-50">{d.user.name}</h3>
            <a href={`tel:+91${d.user.phone}`} className="inline-flex items-center gap-1.5 text-amber-400 num mt-1" data-testid="admin-user-call"><Phone className="w-4 h-4" /> +91 {d.user.phone}</a>
            <div className="text-xs text-slate-500 mt-1">Joined {when(d.user.createdAt)} · last active {when(d.user.lastActiveAt)} · {d.user.loginCount} logins</div>
            <div className="mt-6 space-y-2">
              {d.activities.length ? d.activities.map((a) => <ActivityItem key={a.id} a={a} />) : <div className="text-sm text-slate-500">No calculations yet.</div>}
            </div>
            {d.leads.length > 0 && <div className="mt-6 text-xs text-slate-400">Enquiries: {d.leads.map((l) => l.leadId).join(", ")}</div>}
          </>
        )}
      </div>
    </div>
  );
}

function UsersTable({ users, onOpen }) {
  return (
    <Card className="overflow-x-auto !p-0" data-testid="admin-users-table">
      <table className="w-full text-sm min-w-[720px]">
        <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-mono border-b border-white/10">
          {["Name", "Mobile", "Joined", "Last active", "Savings", "Loans", "Bills", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
        </tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`admin-user-row-${u.phone}`}>
              <td className="px-4 py-3 text-slate-100 font-medium">{u.name}</td>
              <td className="px-4 py-3"><a href={`tel:+91${u.phone}`} className="text-amber-400 num">+91 {u.phone}</a></td>
              <td className="px-4 py-3 text-slate-400 text-xs">{when(u.createdAt)}</td>
              <td className="px-4 py-3 text-slate-400 text-xs">{when(u.lastActiveAt)}</td>
              <td className="px-4 py-3 num">{u.counts.savings_calc || 0}</td>
              <td className="px-4 py-3 num">{u.counts.loan_calc || 0}</td>
              <td className="px-4 py-3 num">{u.counts.bill_upload || 0}</td>
              <td className="px-4 py-3"><button type="button" onClick={() => onOpen(u.id)} className="text-xs text-amber-400 hover:text-amber-300" data-testid={`admin-user-view-${u.phone}`}>View</button></td>
            </tr>
          ))}
          {!users.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No users yet.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

function LeadsList({ leads }) {
  return (
    <div className="space-y-2" data-testid="admin-leads-list">
      {leads.map((l) => (
        <Card key={l.leadId} className="!p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div><div className="text-slate-100 font-semibold">{l.name} {l.company ? `· ${l.company}` : ""}</div><div className="text-xs text-slate-500">{l.leadId} · {when(l.createdAt)} · {l.city || l.state || ""}</div></div>
          <div className="flex items-center gap-3"><Pill tone={l.intent === "HIGH" ? "emerald" : "amber"}>{l.intent}</Pill>{l.monthlyBill ? <span className="num text-slate-300">{inr(l.monthlyBill)}/mo</span> : null}<a href={`tel:${l.mobile}`} className="text-amber-400 num">{l.mobile}</a></div>
        </Card>
      ))}
      {!leads.length && <Card className="text-sm text-slate-500">No enquiries yet.</Card>}
    </div>
  );
}

function Dashboard({ onOut }) {
  const [tab, setTab] = useState("users");
  const [ov, setOv] = useState(null);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const load = useCallback(() => {
    adminOverview().then(setOv).catch((e) => toast.error(errMsg(e)));
    adminLeads().then(setLeads).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => { adminUsers(q).then(setUsers).catch(() => {}); }, 250); return () => clearTimeout(t); }, [q]);

  return (
    <div className="min-h-screen bg-[#0B1622] px-4 sm:px-8 py-8" data-testid="admin-dashboard">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-slate-100 font-head font-bold text-lg"><Sun className="w-6 h-6 text-amber-400" /> Admin panel</div>
          <Btn variant="ghost" onClick={onOut} data-testid="admin-logout-btn"><LogOut className="w-4 h-4" /> Log out</Btn>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat icon={Users} label="Users" value={ov?.users} testId="admin-stat-users" />
          <Stat icon={Users} label="Active last 7 days" value={ov?.activeUsers7d} testId="admin-stat-active" />
          <Stat icon={Calculator} label="Savings calculations" value={ov?.savingsCalcs} testId="admin-stat-calcs" />
          <Stat icon={Landmark} label="Loan comparisons" value={ov?.loanCalcs} testId="admin-stat-loans" />
          <Stat icon={FileText} label="Bills uploaded" value={ov?.bills} testId="admin-stat-bills" />
          <Stat icon={Inbox} label="Enquiries" value={ov?.leads} testId="admin-stat-leads" />
          <Stat icon={Users} label="New users (7 days)" value={ov?.newUsers7d} testId="admin-stat-new" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-2">
            {[["users", "Users"], ["leads", "Enquiries"]].map(([k, t]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === k ? "bg-amber-500 text-slate-950 font-semibold" : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"}`} data-testid={`admin-tab-${k}`}>{t}</button>
            ))}
          </div>
          {tab === "users" && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
              <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or mobile" className="pl-9" data-testid="admin-user-search" />
            </div>
          )}
        </div>
        {tab === "users" ? <UsersTable users={users} onOpen={setOpen} /> : <LeadsList leads={leads} />}
      </div>
      {open && <UserDetail id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export default function Admin() {
  const [inside, setInside] = useState(Boolean(getAdminToken()));
  useEffect(() => {
    const out = () => setInside(false);
    window.addEventListener("si-admin-logout", out);
    return () => window.removeEventListener("si-admin-logout", out);
  }, []);
  if (!inside) return <AdminLoginForm onIn={() => setInside(true)} />;
  return <Dashboard onOut={() => { setAdminToken(null); setInside(false); }} />;
}
