import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Sun, ChevronDown, Zap } from "lucide-react";

export const NAV = [
  {
    label: "Solar for Business",
    href: "/solar-for-business",
    items: [
      { label: "Why Solar?", href: "/solar-for-business" },
      { label: "Industry Profiles", href: "/industries" },
      { label: "Manufacturing", href: "/solar/manufacturing" },
      { label: "Textiles", href: "/solar/textile" },
      { label: "Warehousing", href: "/solar/warehouse" },
      { label: "Hospitals", href: "/solar/hospital" },
      { label: "Hotels", href: "/solar/hotel" },
      { label: "Cold Storage", href: "/solar/cold-storage" },
      { label: "Data Centres", href: "/solar/data-centre" },
    ],
  },
  {
    label: "Technology",
    href: "/technology",
    items: [
      { label: "Solar Panels", href: "/technology#panels" },
      { label: "Inverters", href: "/technology#inverters" },
      { label: "Balance of System", href: "/technology#bos" },
      { label: "EPC & Construction Guide", href: "/technology#epc-guide" },
    ],
  },
  {
    label: "Project Models",
    href: "/project-models",
    items: [
      { label: "CAPEX", href: "/project-models#capex" },
      { label: "OPEX / RESCO", href: "/project-models#opex" },
      { label: "PPA", href: "/project-models#ppa" },
      { label: "Captive & Group Captive", href: "/project-models#captive" },
      { label: "Open Access", href: "/project-models#open-access" },
    ],
  },
  {
    label: "Calculator",
    href: "/calculator",
    items: [
      { label: "Solar Savings Calculator", href: "/calculator" },
      { label: "Financing / EMI Calculator", href: "/financing#calculator" },
      { label: "REC Calculator", href: "/rec-carbon#calculator" },
    ],
  },
  {
    label: "Govt & Policy",
    href: "/government",
    items: [
      { label: "Incentives & Eligibility", href: "/government" },
      { label: "GST & Tax", href: "/government#tax" },
      { label: "RECs", href: "/rec-carbon" },
      { label: "Carbon Credits", href: "/rec-carbon#carbon" },
    ],
  },
  {
    label: "India Solar Data",
    href: "/states",
    items: [
      { label: "State-wise Database", href: "/states" },
      { label: "DISCOM Directory", href: "/discoms" },
      { label: "Industry Opportunity", href: "/industries" },
    ],
  },
  {
    label: "Financing",
    href: "/financing",
    items: [
      { label: "Solar Financing Overview", href: "/financing" },
      { label: "Financing Partners", href: "/financing-partners" },
      { label: "How Financing Works", href: "/financing#journey" },
      { label: "Documents Required", href: "/financing#documents" },
    ],
  },
  {
    label: "For EPCs",
    href: "/epc",
    items: [
      { label: "Our EPC Partners", href: "/epc-partners" },
      { label: "Become a Partner", href: "/epc#register" },
      { label: "Submit a Project", href: "/epc#submit" },
      { label: "Partner Dashboard", href: "/epc#dashboard" },
    ],
  },
  {
    label: "Resources",
    href: "/resources",
    items: [
      { label: "Knowledge Centre", href: "/technology" },
      { label: "Glossary", href: "/resources#glossary" },
      { label: "FAQs", href: "/resources#faqs" },
    ],
  },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState(null);
  const loc = useLocation();

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass border-b border-white/10" data-testid="site-header">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" data-testid="logo-link">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center amber-glow">
              <Sun className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
            </div>
          </div>
          <div className="leading-none">
            <div className="font-head font-extrabold text-[15px] tracking-tight text-slate-50">Solar <span className="text-amber-500">Intelligence</span></div>
            <div className="text-[9px] uppercase tracking-[0.15em] text-slate-400 mt-0.5 font-mono">Savings · Financing · EPC</div>
          </div>
        </Link>

        <nav className="hidden xl:flex items-center gap-0.5 flex-1 justify-center" onMouseLeave={() => setOpen(null)}>
          {NAV.map((n) => (
            <div key={n.label} className="relative" onMouseEnter={() => setOpen(n.label)}>
              <Link
                to={n.href}
                className="flex items-center gap-1 px-2.5 py-2 text-[13px] font-medium text-slate-300 hover:text-amber-400 rounded-md transition-colors"
                data-testid={`nav-${n.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              >
                {n.label}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Link>
              {open === n.label && (
                <div className="absolute top-full left-0 pt-1.5 w-60 animate-fade-up">
                  <div className="card-surface p-2 shadow-2xl">
                    {n.items.map((it) => (
                      <Link
                        key={it.label + it.href}
                        to={it.href}
                        className="block px-3 py-2 text-[13px] text-slate-300 hover:text-amber-400 hover:bg-white/5 rounded-md transition-colors"
                      >
                        {it.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="hidden xl:flex items-center gap-2 shrink-0">
          <Link to="/calculator" className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[13px] font-bold transition-colors active:scale-[0.98]" data-testid="header-cta-calculator">
            Calculate Savings
          </Link>
        </div>

        <button className="xl:hidden p-2 text-slate-200" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle" aria-label="Menu">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="xl:hidden border-t border-white/10 bg-[#0B132B] max-h-[80vh] overflow-y-auto" data-testid="mobile-menu">
          <div className="px-4 py-4 space-y-1">
            {NAV.map((n) => (
              <details key={n.label} className="group">
                <summary className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-slate-200 cursor-pointer list-none">
                  {n.label}
                  <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pl-4 pb-2">
                  {n.items.map((it) => (
                    <Link key={it.label + it.href} to={it.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-400 hover:text-amber-400">
                      {it.label}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
            <Link to="/calculator" onClick={() => setMobileOpen(false)} className="block text-center mt-3 px-4 py-3 rounded-lg bg-amber-500 text-slate-950 font-bold" data-testid="mobile-cta-calculator">
              Calculate My Solar Savings
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

const Footer = () => (
  <footer className="border-t border-white/10 bg-[#0D1B2A] mt-24 no-print" data-testid="site-footer">
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-14">
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
              <Sun className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
            </div>
            <div className="font-head font-extrabold text-lg text-slate-50">Solar <span className="text-amber-500">Intelligence</span></div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
            India's neutral solar decision & marketplace platform for businesses. Understand your solar opportunity, calculate savings, evaluate the project and get matched to the right EPC and financing partners.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
            <Zap className="w-3.5 h-3.5" /> Neutral marketplace — Customer · EPC · Financiers
          </div>
        </div>
        {[
          { title: "Platform", links: [["Solar Calculator", "/calculator"], ["Financing", "/financing"], ["State Database", "/states"], ["DISCOM Directory", "/discoms"]] },
          { title: "Knowledge", links: [["Technology", "/technology"], ["Project Models", "/project-models"], ["Government & Policy", "/government"], ["RECs & Carbon", "/rec-carbon"]] },
          { title: "Company", links: [["Financing Partners", "/financing-partners"], ["EPC Partners", "/epc-partners"], ["For EPCs", "/epc"], ["Contact", "/contact"]] },
        ].map((col) => (
          <div key={col.title}>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-mono mb-4">{col.title}</div>
            <ul className="space-y-2.5">
              {col.links.map(([l, h]) => (
                <li key={l}><Link to={h} className="text-sm text-slate-400 hover:text-amber-400 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500 leading-relaxed space-y-2">
        <p>All calculations, tariffs, incentives and data are indicative, source-tagged and subject to change. Solar generation is an estimate; government incentive eligibility is subject to applicable rules; tax treatment should be confirmed with a professional; financing figures are subject to the financing partner's credit assessment and approval; REC/carbon-credit eligibility and monetization are not guaranteed.</p>
        <p className="text-slate-600">© {new Date().getFullYear()} Solar Intelligence — Neutral Solar Savings, Financing & EPC Marketplace. Demonstration platform.</p>
      </div>
    </div>
  </footer>
);

export default function Layout({ children }) {
  const loc = useLocation();
  React.useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) { window.scrollTo(0, 0); return undefined; }
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    return () => clearTimeout(t);
  }, [loc.pathname]);
  return (
    <div className="min-h-screen bg-[#0B132B]">
      <Header />
      <main className="pt-[62px]">{children}</main>
      <Footer />
    </div>
  );
}
