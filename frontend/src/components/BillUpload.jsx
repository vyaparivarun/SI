import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { uploadBill, errMsg } from "@/lib/api";
import { Upload, FileCheck2, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firebaseEnabled } from "@/lib/firebase";

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export const BillUpload = () => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Bills are saved to the user's account, so logged-out visitors are sent to log in first.
  const pick = () => (user ? ref.current?.click() : navigate(`/login?next=${encodeURIComponent(pathname)}`));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) { toast.error("Upload a PDF, JPG, PNG or WEBP file."); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("File is larger than 4 MB. Please upload a smaller photo or PDF."); return; }
    setBusy(true);
    try { const r = await uploadBill(file); setDone(r.filename); toast.success("Bill uploaded — our advisor can review it with you."); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  if (!user && !firebaseEnabled) return null; // uploads need an account; hidden until login is configured
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400" data-testid="bill-upload">
      <input ref={ref} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} data-testid="bill-upload-input" />
      <button type="button" onClick={pick} disabled={busy}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/20 hover:border-amber-500/60 text-slate-300 transition-colors" data-testid="bill-upload-btn">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-amber-400" />} Upload electricity bill (optional)
      </button>
      {done ? <span className="inline-flex items-center gap-1 text-emerald-400" data-testid="bill-upload-done"><FileCheck2 className="w-4 h-4" /> {done}</span> : <span>{user ? "PDF or photo, up to 4 MB" : "Log in to upload · PDF or photo, up to 4 MB"}</span>}
    </div>
  );
};
