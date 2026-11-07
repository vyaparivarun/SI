import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/ui-kit";
import { Field, TextInput } from "@/components/Form";
import { sendOtp, verifyOtp, firebaseLogin, errMsg } from "@/lib/api";
import { firebaseEnabled, sendFirebaseOtp, confirmFirebaseOtp, firebaseErrMsg } from "@/lib/firebase";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Sun, ShieldCheck, Calculator, Landmark, Loader2, ArrowLeft } from "lucide-react";

const PERKS = [
  [Calculator, "Monthly saving in two inputs", "Pincode + bill. We fetch state, DISCOM, tariff and local sunlight."],
  [Landmark, "Loan, flat-rate & lease side by side", "EMI, fees, GST and true effective cost for each option."],
  [ShieldCheck, "Sourced data only", "Tariffs and policies linked to official orders — never guessed."],
];

const RECAPTCHA_ID = "recaptcha-container";
const loginErr = (err) => firebaseErrMsg(err) || errMsg(err);

function OtpStep({ phone, name, confirmation, onResent, onBack }) {
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(30);
  useEffect(() => { if (wait <= 0) return undefined; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(code)) { toast.error("Enter the code from the SMS."); return; }
    setBusy(true);
    try {
      const r = confirmation
        ? await firebaseLogin(await confirmFirebaseOtp(confirmation, code), name)
        : await verifyOtp(phone, name, code);
      login(r.token, r.user);
      toast.success(`Welcome, ${r.user.name}!`);
    } catch (err) { toast.error(loginErr(err)); } finally { setBusy(false); }
  };
  const resend = async () => {
    try {
      if (confirmation) onResent(await sendFirebaseOtp(phone, RECAPTCHA_ID)); else await sendOtp(phone, name);
      setWait(30); toast.success("New code sent.");
    } catch (err) { toast.error(loginErr(err)); }
  };

  return (
    <form onSubmit={verify} className="space-y-5" data-testid="otp-form">
      <button type="button" onClick={onBack} className="text-xs text-slate-400 hover:text-amber-400 inline-flex items-center gap-1" data-testid="otp-change-number"><ArrowLeft className="w-3.5 h-3.5" /> Change number</button>
      <div>
        <h2 className="font-head text-2xl font-bold text-slate-50">Enter the 6-digit code</h2>
        <p className="text-sm text-slate-400 mt-1">Sent by SMS to <span className="text-slate-200 num">+91 {phone}</span></p>
      </div>
      <TextInput value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="••••••" className="text-center text-2xl tracking-[0.5em] num" data-testid="otp-code-input" />
      <Btn type="submit" className="w-full justify-center" disabled={busy} data-testid="otp-verify-btn">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Verify & continue</Btn>
      <div className="text-xs text-slate-500 text-center">
        {wait > 0 ? <>Resend code in <span className="num">{wait}s</span></> : <button type="button" onClick={resend} className="text-amber-400 hover:text-amber-300" data-testid="otp-resend-btn">Resend code</button>}
      </div>
    </form>
  );
}

function PhoneStep({ onSent }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) { toast.error("Please enter your name."); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error("Enter a valid 10-digit mobile number."); return; }
    setBusy(true);
    try {
      const confirmation = firebaseEnabled ? await sendFirebaseOtp(phone, RECAPTCHA_ID) : (await sendOtp(phone, name.trim()), null);
      onSent(phone, name.trim(), confirmation); toast.success("OTP sent by SMS.");
    }
    catch (err) { toast.error(loginErr(err)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-5" data-testid="login-form">
      <div>
        <h2 className="font-head text-2xl font-bold text-slate-50">Log in with your mobile</h2>
        <p className="text-sm text-slate-400 mt-1">We'll text you a one-time code. No password needed.</p>
      </div>
      <Field label="Your name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" autoComplete="name" data-testid="login-name-input" /></Field>
      <Field label="Mobile number">
        <div className="flex">
          <span className="px-3 flex items-center rounded-l-lg bg-white/[0.06] border border-r-0 border-white/10 text-slate-300 text-sm num">+91</span>
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="tel-national" placeholder="98XXXXXXXX" className="rounded-l-none num" data-testid="login-phone-input" />
        </div>
      </Field>
      <Btn type="submit" className="w-full justify-center" disabled={busy} data-testid="login-send-otp-btn">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Send OTP</Btn>
      <p className="text-[11px] text-slate-500 leading-relaxed">By continuing you agree that our solar advisors may call you about the estimates you create. Your calculations are saved to your account.</p>
    </form>
  );
}

export default function Login({ showBack = false }) {
  const [sent, setSent] = useState(null);
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-[#0B1622]" data-testid="login-page">
      <div className="hidden lg:flex flex-col justify-between p-12 hero-radial border-r border-white/10">
        <div className="flex items-center gap-2 text-slate-100 font-head font-bold text-lg"><Sun className="w-6 h-6 text-amber-400" /> Solar Intelligence</div>
        <div className="max-w-lg">
          <h1 className="font-head text-4xl xl:text-5xl font-extrabold text-slate-50 leading-tight">Know your solar saving before you call an EPC.</h1>
          <div className="mt-10 space-y-6">
            {PERKS.map(([Icon, t, s], i) => (
              <div key={t} className="flex gap-4 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-amber-400" /></div>
                <div><div className="text-slate-100 font-semibold">{t}</div><div className="text-sm text-slate-400">{s}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-600">India's neutral solar marketplace for businesses, EPCs and lenders.</div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 text-slate-100 font-head font-bold text-lg mb-10"><Sun className="w-6 h-6 text-amber-400" /> Solar Intelligence</div>
          {showBack && <Link to="/" className="text-xs text-slate-400 hover:text-amber-400 inline-flex items-center gap-1 mb-8" data-testid="login-back-to-site"><ArrowLeft className="w-3.5 h-3.5" /> Back to the site</Link>}
          {sent
            ? <OtpStep phone={sent.phone} name={sent.name} confirmation={sent.confirmation} onResent={(c) => setSent({ ...sent, confirmation: c })} onBack={() => setSent(null)} />
            : <PhoneStep onSent={(phone, name, confirmation) => setSent({ phone, name, confirmation })} />}
          <div id={RECAPTCHA_ID} />
        </div>
      </div>
    </div>
  );
}
