import React from "react";

export const Field = ({ label, hint, children, className = "" }) => (
  <div className={className}>
    <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
  </div>
);

const inputBase =
  "w-full bg-slate-900/80 border border-slate-700/80 text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-slate-600";

export const TextInput = React.forwardRef(({ prefix, className = "", ...rest }, ref) => (
  <div className="relative">
    {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm num">{prefix}</span>}
    <input ref={ref} className={`${inputBase} ${prefix ? "pl-8" : ""} num ${className}`} {...rest} />
  </div>
));

export const NumberInput = React.forwardRef(({ prefix, suffix, className = "", ...rest }, ref) => (
  <div className="relative">
    {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm num pointer-events-none">{prefix}</span>}
    <input ref={ref} type="number" inputMode="decimal"
      className={`${inputBase} ${prefix ? "pl-8" : ""} ${suffix ? "pr-12" : ""} num ${className}`} {...rest} />
    {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs num pointer-events-none">{suffix}</span>}
  </div>
));

export const Select = React.forwardRef(({ options = [], placeholder = "Select...", className = "", ...rest }, ref) => (
  <div className="relative">
    <select ref={ref} className={`${inputBase} appearance-none pr-9 cursor-pointer ${className}`} {...rest}>
      {placeholder !== null && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const lab = typeof o === "string" ? o : o.label;
        return <option key={val} value={val} className="bg-[#0D1B2A]">{lab}</option>;
      })}
    </select>
    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" /></svg>
  </div>
));

export const SliderInput = ({ label, value, onChange, min, max, step = 1, format = (v) => v, testId }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <span className="num text-sm font-semibold text-amber-400">{format(value)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      data-testid={testId}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-amber-500 bg-slate-700"
      style={{ background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${((value - min) / (max - min)) * 100}%, #334155 ${((value - min) / (max - min)) * 100}%, #334155 100%)` }} />
  </div>
);

export const Segmented = ({ options, value, onChange, testId }) => (
  <div className="inline-flex bg-slate-900/80 border border-slate-700/80 rounded-lg p-1 flex-wrap gap-1" data-testid={testId}>
    {options.map((o) => {
      const val = typeof o === "string" ? o : o.value;
      const lab = typeof o === "string" ? o : o.label;
      return (
        <button key={val} type="button" onClick={() => onChange(val)}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${value === val ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
          data-testid={`${testId}-${String(val).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
          {lab}
        </button>
      );
    })}
  </div>
);
