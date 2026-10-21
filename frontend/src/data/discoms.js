/*
 * DISCOM database — HT industrial tariff for FY 2026-27, each record linked to its tariff order.
 *   energyChargeHT / demandCharge : base rates of the most common HT-industrial slab (see notes for other slabs).
 *   ciTariff : estimated per-unit variable cost that solar offsets = energy charge (+ wheeling) + only those
 *              surcharges / duties we verified (listed in ciBasis). Items in `excludes` are NOT included.
 *              null = not verified — the calculator asks for the average rate from the customer's bill.
 *   districts : India Post district names served (used to suggest the DISCOM from a pincode).
 *   primary   : default DISCOM for the state when no district matches.
 */

export const TARIFF_VERIFIED_ON = "2026-10-21";
const V = TARIFF_VERIFIED_ON;

const reg = (serc) => ({
  netMetering: `Per ${serc} rooftop solar regulations — cap and net-metering vs net-billing rules vary by category; confirm with the DISCOM`,
  grossMetering: `Per ${serc} regulations`,
  openAccess: "Green Energy Open Access for contract demand ≥100 kW (GEOA Rules, 2022)",
  banking: `Per ${serc} GEOA regulations`,
  wheeling: `Per ${serc} tariff order`,
  css: `Per ${serc} tariff order`,
});

const unverified = (serc, sourceUrl = "", note = "") => ({
  ...reg(serc), energyChargeHT: null, demandCharge: null, ciTariff: null, verified: false, note,
  source: `${serc} — FY 2026-27 HT industrial schedule not yet verified by us`, sourceUrl, effectiveFrom: null, lastVerified: null,
});

const D = (o) => ({ energyUnit: "kWh", demandUnit: "kVA/month", verified: true, lastVerified: V, ...o });

// ---- shared verified schedules ----
const DELHI = (o) => D({ ...reg("DERC"), state: "Delhi (NCT)", energyChargeHT: 7.75, energyUnit: "kVAh", demandCharge: 250, demandNote: "₹250 per kW/kVA of sanctioned load per month", source: "DERC tariff schedule in force for FY 2026-27 + monthly FPPAS orders", sourceUrl: "https://www.derc.gov.in/tarriff-orders", effectiveFrom: "FY 2026-27", ...o });
const MERC_SRC = { source: "MERC MYT Order, Case No. 75 of 2025 (25-Mar-2026)", sourceUrl: "https://www.mahadiscom.in/en/consumer/tariff-details/", effectiveFrom: "01-Apr-2026" };
const GUJ = (o) => D({ ...reg("GERC"), banking: "GEOA banking ₹1.00/unit (1-Sep-2026 to 31-Mar-2027), max 30% of monthly consumption", state: "Gujarat", energyChargeHT: 4.2, demandCharge: 150, demandNote: "₹150 first 500 kVA · ₹260 next 500 kVA · ₹475 above 1,000 kVA", energyNote: "₹4.00 up to 500 kVA · ₹4.20 for 500–2,500 kVA · ₹4.30 above 2,500 kVA", ciTariff: 6.9, ciBasis: "₹4.20 energy + ₹2.45 base FPPAS, +3.99% variable FPPAS (Jul-2026)", excludes: "electricity duty, ToU peak charge (₹0.45–0.85/unit), demand charges", tod: "₹0.60/unit discount 11:00–17:00", source: "GERC Tariff Order FY 2026-27 (25-Mar-2026) + GUVNL FPPAS Jul-2026", sourceUrl: "https://gercin.org/tariff-schedules/", effectiveFrom: "01-Apr-2026", ...o });
const HARYANA = (o) => D({ ...reg("HERC"), state: "Haryana", energyChargeHT: 6.95, energyUnit: "kVAh", demandCharge: 290, energyNote: "11 kV; ₹6.85 at 33 kV, ₹6.75 at 66/132 kV", ciTariff: 7.05, ciBasis: "₹6.95 energy + ₹0.10 electricity duty", excludes: "FSA/FPPAS, municipal tax (₹0.05 within MC limits), demand charges", source: "HERC Tariff Order FY 2026-27 (25-Mar-2026)", sourceUrl: "https://herc.gov.in", effectiveFrom: "01-Apr-2026", ...o });
const RAJ = (o) => D({ ...reg("RERC"), css: "₹1.48/unit; additional surcharge ₹0.50/unit (FY 2026-27)", state: "Rajasthan", energyChargeHT: 6.5, demandCharge: 380, energyNote: "Large Industrial (LIP/HT-5); 3–5% voltage rebate at higher voltages", ciTariff: 6.5, ciBasis: "₹6.50 energy", excludes: "fuel surcharge (FAC), electricity duty & cess, demand charges", tod: "−10% 12:00–16:00; +10% 18:00–22:00; +5% 06:00–08:00", source: "RERC Retail Tariff Order FY 2026-27", sourceUrl: "https://rerc.rajasthan.gov.in", effectiveFrom: "01-Apr-2026", ...o });
const UP = (o) => D({ ...reg("UPERC"), state: "Uttar Pradesh", energyChargeHT: 7.1, energyUnit: "kVAh", demandCharge: 300, energyNote: "HV-2 up to 11 kV; ₹6.80 & ₹290 for 11–66 kV; 7.5% rebate on rural schedule", ciTariff: 7.1, ciBasis: "₹7.10 energy", excludes: "electricity duty, regulatory surcharge, ToD, demand charges", source: "UPERC Tariff Order FY 2026-27 (HV-2 rate schedule)", sourceUrl: "https://www.uperc.org", effectiveFrom: "FY 2026-27", ...o });
const KA = (o) => D({ ...reg("KERC"), state: "Karnataka", energyChargeHT: 6.7, demandCharge: 365, ciTariff: 7.3, ciBasis: "₹6.70 energy + 9% electricity tax", excludes: "FAC / true-up charges, ToD (mandatory ≥500 kVA), demand charges", source: "KERC Tariff Order (review, 03-Mar-2026) — HT-2(a)", sourceUrl: "https://kerc.karnataka.gov.in", effectiveFrom: "01-Apr-2026", ...o });
const TG = (o) => D({ ...reg("TGERC"), state: "Telangana", energyChargeHT: 7.65, demandCharge: 500, ciTariff: 7.65, ciBasis: "₹7.65 energy", excludes: "electricity duty, FSA, demand charges", tod: "₹0.50/unit rebate 10:00–18:00; +₹1.50/unit 06–10 & 18–22", source: "TGERC Retail Supply Tariff Order FY 2026-27 (HT-I(A), 11 kV)", sourceUrl: "https://tgsouthernpower.org/resources/PDF/Tariffs/69tarifffile.pdf", effectiveFrom: "01-Apr-2026", ...o });
const AP = (o) => D({ ...reg("APERC"), state: "Andhra Pradesh", energyChargeHT: 6.3, energyUnit: "kVAh", demandCharge: 475, ciTariff: 6.3, ciBasis: "₹6.30 energy (normal hours)", excludes: "electricity duty, FPPCA, demand charges", tod: "In high-demand months: peak ₹7.80, off-peak (00–06 & 10–15) ₹5.55", source: "APERC Retail Supply Tariff Order FY 2026-27 (25-Mar-2026, tariffs retained)", sourceUrl: "https://aperc.gov.in/page/Tariff_Orders", effectiveFrom: "01-Apr-2026", ...o });
const MP = (o) => D({ ...reg("MPERC"), wheeling: "OA wheeling ₹0.69/unit at 11 kV (FY 2026-27)", css: "≈₹1.49/unit; additional surcharge ₹1.18/unit (FY 2026-27)", state: "Madhya Pradesh", energyChargeHT: 6.6, demandCharge: 320, energyNote: "HV-3 industrial, 11 kV", ciTariff: 6.6, ciBasis: "₹6.60 energy", excludes: "electricity duty, FCA, ToD, demand charges", source: "MPERC Retail Supply Tariff Order FY 2026-27 (26-Mar-2026)", sourceUrl: "https://mperc.in", effectiveFrom: "01-Apr-2026", ...o });
const OD = (o) => D({ ...reg("OERC"), state: "Odisha", energyChargeHT: 5.85, energyUnit: "kVAh", demandCharge: 250, energyNote: "Large industry HT, load factor ≤60%; ₹4.75 above 60% LF", ciTariff: 5.85, ciBasis: "₹5.85 energy", excludes: "electricity duty, load-factor rebates, demand charges", source: "OERC Retail Supply Tariff FY 2026-27", sourceUrl: "https://www.orierc.org/CuteSoft_Client/writereaddata/upload/DISCOMs_Tariff_Notification_FY_2026-27.PDF", effectiveFrom: "01-Apr-2026", ...o });
const BR = (o) => D({ ...reg("BERC"), state: "Bihar", energyChargeHT: 7.98, energyUnit: "kVAh", demandCharge: 550, energyNote: "HTS-I (11 kV); ₹7.92 at 33 kV", ciTariff: 7.98, ciBasis: "₹7.98 energy", excludes: "electricity duty, FPPAS, ToD (mandatory >10 kW), demand charges", source: "BERC Tariff Order FY 2026-27 (18-Mar-2026)", sourceUrl: "https://berc.co.in/images/pdf/tariff-order/2026-27/Tariff_Chart_FY_2026-27.pdf", effectiveFrom: "01-Apr-2026", ...o });

export const DISCOMS = [
  // ---------------- Delhi ----------------
  DELHI({ id: "bses-rajdhani", name: "BSES Rajdhani Power Limited (BRPL)", coverage: "South & West Delhi", districts: ["South Delhi", "South West Delhi", "West Delhi", "South East Delhi", "New Delhi"], ciTariff: 9.6, ciBasis: "₹7.75 energy + 17.94% FPPAS (May-2026) + 5% electricity duty", excludes: "PPAC changes after May-2026, demand charges" }),
  DELHI({ id: "bses-yamuna", name: "BSES Yamuna Power Limited (BYPL)", coverage: "Central & East Delhi", districts: ["East Delhi", "North East Delhi", "Shahdara", "Central Delhi", "North Delhi"], ciTariff: 8.1, ciBasis: "₹7.75 energy + 5% electricity duty", excludes: "monthly FPPAS (≈12–18% in 2026), demand charges" }),
  DELHI({ id: "tata-ddl", name: "Tata Power Delhi Distribution Ltd (TPDDL)", coverage: "North & North-West Delhi", districts: ["North Delhi", "North West Delhi"], ciTariff: 9.1, ciBasis: "₹7.75 energy + 12.21% FPPAS (May-2026) + 5% electricity duty", excludes: "FPPAS changes after May-2026, demand charges" }),
  DELHI({ id: "ndmc", name: "NDMC (New Delhi Municipal Council)", coverage: "Lutyens' / New Delhi", districts: ["New Delhi", "Central Delhi"], ciTariff: 8.1, ciBasis: "₹7.75 energy + 5% electricity duty", excludes: "PPAC / FPPAS, demand charges" }),

  // ---------------- Maharashtra ----------------
  D({ ...reg("MERC"), ...MERC_SRC, id: "msedcl", name: "MSEDCL (Mahavitaran)", state: "Maharashtra", coverage: "Maharashtra (ex-Mumbai city)", primary: true, districts: ["Mumbai", "Thane"], energyChargeHT: 8.44, energyUnit: "kVAh", wheeling: "₹0.81/kVAh (11–33 kV)", demandCharge: 650, energyNote: "HT-I(A) industry; + ₹0.81/kVAh wheeling at 11–33 kV", ciTariff: 10.2, ciBasis: "₹8.44 energy + ₹0.81 wheeling, +7.5% electricity duty, +₹0.29 tax on sale", excludes: "FAC, ToD, demand charges", tod: "Solar-hours rebate 15% (Apr–Sep) / 25% (Oct–Mar) 09:00–17:00; +25% 17:00–24:00" }),
  D({ ...reg("MERC"), id: "aeml", name: "Adani Electricity Mumbai Ltd (AEML)", state: "Maharashtra", coverage: "Mumbai suburbs, Mira-Bhayandar", districts: ["Mumbai", "Mumbai Suburban", "Thane"], energyChargeHT: 5.73, energyUnit: "kVAh", wheeling: "₹0.57/kVAh", demandCharge: 400, ciTariff: 7.1, ciBasis: "₹5.73 energy + ₹0.57 wheeling, +7.5% electricity duty, +₹0.29 tax on sale", excludes: "FAC, ToD, demand charges", tod: "Solar-hours rebate 15–25% 09:00–17:00", source: "MERC MYT Order for AEML — FY 2026-27 schedule", sourceUrl: "https://merc.gov.in", effectiveFrom: "01-Apr-2026" }),
  D({ ...reg("MERC"), id: "tata-mumbai", name: "Tata Power (Mumbai)", state: "Maharashtra", coverage: "Mumbai licence area", districts: ["Mumbai", "Mumbai Suburban"], energyChargeHT: 5.67, energyUnit: "kVAh", wheeling: "₹0.69/kVAh (HT)", demandCharge: 400, ciTariff: 7.1, ciBasis: "₹5.67 energy + ₹0.69 wheeling, +7.5% electricity duty, +₹0.29 tax on sale", excludes: "FAC, ToD, demand charges", tod: "Solar-hours rebate 15–25% 09:00–17:00; +20% 17:00–24:00", source: "MERC MYT Order, Case No. 210 of 2024 (TPC-D) — FY 2026-27", sourceUrl: "https://www.tatapower.com/regulatory/licence-area-mumbai/regulatory-filings/distribution-business-schedule-of-electricity-tariff/Final-MYT-Order-TPC-D-Case-No.-210-of-2024.pdf", effectiveFrom: "01-Apr-2026" }),
  { id: "best", name: "BEST Undertaking", state: "Maharashtra", coverage: "South Mumbai (Island City)", districts: ["Mumbai"], ...unverified("MERC (Case No. 207 of 2024)", "https://www.bestundertaking.com/page.asp?i=33") },

  // ---------------- Gujarat ----------------
  GUJ({ id: "ugvcl", name: "UGVCL (Uttar Gujarat Vij)", coverage: "North Gujarat (Mehsana, Gandhinagar, Banaskantha)", districts: ["Ahmedabad", "Gandhinagar", "Gandhi Nagar", "Mehsana", "Mahesana", "Patan", "Banaskantha", "Sabarkantha", "Aravalli", "Arvalli"] }),
  GUJ({ id: "mgvcl", name: "MGVCL (Madhya Gujarat Vij)", coverage: "Central Gujarat (Vadodara, Anand)", districts: ["Vadodara", "Anand", "Kheda", "Panchmahal", "Panch Mahals", "Dahod", "Mahisagar", "Chhota Udaipur", "Chhotaudepur"] }),
  GUJ({ id: "dgvcl", name: "DGVCL (Dakshin Gujarat Vij)", coverage: "South Gujarat (Surat, Bharuch, Valsad)", districts: ["Surat", "Bharuch", "Narmada", "Tapi", "Navsari", "Valsad", "Dang", "The Dangs"] }),
  GUJ({ id: "pgvcl", name: "PGVCL (Paschim Gujarat Vij)", coverage: "Saurashtra & Kutch (Rajkot, Morbi, Jamnagar)", districts: ["Rajkot", "Jamnagar", "Devbhumi Dwarka", "Porbandar", "Junagadh", "Gir Somnath", "Amreli", "Bhavnagar", "Botad", "Morbi", "Surendranagar", "Kutch", "Kachchh"] }),
  D({ ...reg("GERC"), id: "torrent", name: "Torrent Power", state: "Gujarat", coverage: "Ahmedabad, Gandhinagar, Surat cities; Dahej", districts: ["Ahmedabad", "Gandhinagar", "Gandhi Nagar", "Surat", "Bharuch"], energyChargeHT: 4.2, demandCharge: 150, demandNote: "₹150 first 500 kVA · ₹260 next 500 kVA · ₹475 above 1,000 kVA", energyNote: "₹4.00 up to 500 kVA · ₹4.20 for 500–2,500 kVA · ₹4.30 above 2,500 kVA", ciTariff: null, ciBasis: "", note: "Torrent's quarterly FPPPA (fuel surcharge) is not yet verified by us, so we can't estimate its landed rate.", tod: "₹0.30/unit solar-hours rebate 11:00–15:00", source: "GERC Tariff Orders FY 2026-27 for TPL-D (Ahmedabad & Surat)", sourceUrl: "https://www.torrentpower.com/public/pdf/regulatory/TPL-D-A-2585-2025-Tariff-Order-of-FY-2026-27.pdf", effectiveFrom: "01-Apr-2026" }),

  // ---------------- Haryana ----------------
  HARYANA({ id: "uhbvn", name: "UHBVN (Uttar Haryana Bijli)", coverage: "North Haryana (Panipat, Karnal, Sonipat)", districts: ["Panchkula", "Ambala", "Yamunanagar", "Yamuna Nagar", "Kurukshetra", "Kaithal", "Karnal", "Panipat", "Sonipat", "Sonepat", "Rohtak", "Jhajjar", "Jind"] }),
  HARYANA({ id: "dhbvn", name: "DHBVN (Dakshin Haryana Bijli)", coverage: "South Haryana (Gurugram, Faridabad, Hisar)", districts: ["Hisar", "Fatehabad", "Sirsa", "Bhiwani", "Charkhi Dadri", "Mahendragarh", "Rewari", "Gurgaon", "Gurugram", "Faridabad", "Palwal", "Nuh", "Mewat"] }),

  // ---------------- Rajasthan ----------------
  RAJ({ id: "jvvnl", name: "JVVNL (Jaipur Vidyut Vitran Nigam)", coverage: "Jaipur zone (Jaipur, Alwar, Kota)", districts: ["Jaipur", "Dausa", "Alwar", "Bharatpur", "Dholpur", "Kota", "Bundi", "Baran", "Jhalawar", "Sawai Madhopur", "Tonk", "Karauli", "Kotputli-Behror", "Khairthal-Tijara", "Deeg"] }),
  RAJ({ id: "avvnl", name: "AVVNL (Ajmer Vidyut Vitran Nigam)", coverage: "Ajmer zone (Ajmer, Bhilwara, Udaipur)", districts: ["Ajmer", "Bhilwara", "Nagaur", "Sikar", "Jhunjhunu", "Jhunjhunun", "Udaipur", "Banswara", "Chittorgarh", "Chittaurgarh", "Rajsamand", "Dungarpur", "Pratapgarh", "Salumbar", "Beawar"] }),
  RAJ({ id: "jdvvnl", name: "JdVVNL (Jodhpur Vidyut Vitran Nigam)", coverage: "Jodhpur zone (Jodhpur, Bikaner, Pali)", districts: ["Jodhpur", "Barmer", "Jaisalmer", "Bikaner", "Sri Ganganagar", "Ganganagar", "Hanumangarh", "Churu", "Pali", "Jalore", "Jalor", "Sirohi", "Balotra", "Phalodi"] }),

  // ---------------- Uttar Pradesh ----------------
  UP({ id: "pvvnl", name: "PVVNL (Paschimanchal)", coverage: "West UP (Noida, Ghaziabad, Meerut)", districts: ["Meerut", "Ghaziabad", "Gautam Buddha Nagar", "Gautam Buddh Nagar", "Bulandshahr", "Baghpat", "Hapur", "Muzaffarnagar", "Shamli", "Saharanpur", "Moradabad", "Rampur", "Amroha", "Jyotiba Phule Nagar", "Sambhal", "Bijnor"] }),
  UP({ id: "mvvnl", name: "MVVNL (Madhyanchal)", coverage: "Central UP (Lucknow, Bareilly)", districts: ["Lucknow", "Barabanki", "Sitapur", "Hardoi", "Kheri", "Lakhimpur Kheri", "Unnao", "Raebareli", "Rae Bareli", "Faizabad", "Ayodhya", "Ambedkar Nagar", "Sultanpur", "Amethi", "Bahraich", "Shravasti", "Balrampur", "Gonda", "Bareilly", "Budaun", "Badaun", "Pilibhit", "Shahjahanpur"] }),
  UP({ id: "puvvnl", name: "PuVVNL (Purvanchal)", coverage: "East UP (Varanasi, Prayagraj, Gorakhpur)", districts: ["Varanasi", "Chandauli", "Ghazipur", "Jaunpur", "Mirzapur", "Sonbhadra", "Bhadohi", "Sant Ravidas Nagar", "Allahabad", "Prayagraj", "Pratapgarh", "Kaushambi", "Fatehpur", "Azamgarh", "Mau", "Ballia", "Gorakhpur", "Deoria", "Kushinagar", "Maharajganj", "Basti", "Sant Kabir Nagar", "Siddharthnagar"] }),
  UP({ id: "dvvnl", name: "DVVNL (Dakshinanchal)", coverage: "South-west UP (Agra, Aligarh, Jhansi)", districts: ["Agra", "Mathura", "Firozabad", "Mainpuri", "Etah", "Kasganj", "Kanshiram Nagar", "Aligarh", "Hathras", "Mahamaya Nagar", "Etawah", "Auraiya", "Farrukhabad", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Jalaun", "Jhansi", "Lalitpur", "Hamirpur", "Mahoba", "Banda", "Chitrakoot"] }),
  UP({ id: "kesco", name: "KESCO (Kanpur Electricity Supply)", coverage: "Kanpur city", districts: ["Kanpur Nagar"] }),
  UP({ id: "npcl", name: "Noida Power Company Ltd (NPCL)", coverage: "Greater Noida", districts: ["Gautam Buddha Nagar", "Gautam Buddh Nagar"], source: "NPCL rate schedule applicable from 13-Jul-2026 (UPERC FY 2026-27)", sourceUrl: "https://iwebapps.noidapower.com:8032/download/Tariff%20applicable%20from%2013%20July%202026.pdf", effectiveFrom: "13-Jul-2026" }),

  // ---------------- Karnataka ----------------
  KA({ id: "bescom", name: "BESCOM", coverage: "Bengaluru & surrounding", districts: ["Bangalore", "Bengaluru", "Bangalore Urban", "Bengaluru Urban", "Bangalore Rural", "Bengaluru Rural", "Ramanagara", "Ramanagar", "Bengaluru South", "Kolar", "Chikkaballapur", "Chikballapur", "Tumkur", "Tumakuru", "Chitradurga", "Davangere", "Davanagere"], ciTariff: 7.9, ciBasis: "₹6.70 energy + ₹0.56 true-up (from Apr-2026), +9% electricity tax" }),
  KA({ id: "mescom", name: "MESCOM", coverage: "Coastal & Malnad Karnataka (Mangaluru, Shivamogga)", districts: ["Dakshina Kannada", "Udupi", "Shimoga", "Shivamogga", "Chikmagalur", "Chikkamagaluru"] }),
  KA({ id: "hescom", name: "HESCOM", coverage: "North-west Karnataka (Hubballi, Belagavi)", districts: ["Belgaum", "Belagavi", "Dharwad", "Gadag", "Haveri", "Uttara Kannada", "Bijapur", "Bijapur(KAR)", "Vijayapura", "Bagalkot", "Bagalkote"] }),
  KA({ id: "gescom", name: "GESCOM", coverage: "Kalyana Karnataka (Kalaburagi, Ballari)", districts: ["Gulbarga", "Kalaburagi", "Bidar", "Raichur", "Koppal", "Bellary", "Ballari", "Vijayanagara", "Yadgir"] }),
  KA({ id: "cesc-mysuru", name: "CESC Mysuru (Chamundeshwari)", coverage: "Mysuru region", districts: ["Mysore", "Mysuru", "Mandya", "Hassan", "Kodagu", "Chamarajanagar", "Chamrajnagar"] }),

  // ---------------- Tamil Nadu ----------------
  D({ ...reg("TNERC"), banking: "GEOA banking charge 8% in kind; no carry-forward beyond the month (TNERC 2025)", id: "tnpdcl", name: "TNPDCL (TANGEDCO)", state: "Tamil Nadu", coverage: "Tamil Nadu (HT I industrial)", primary: true, districts: [], energyChargeHT: 7.5, demandCharge: 608, ciTariff: 7.9, ciBasis: "₹7.50 energy + 5% electricity tax", excludes: "CPI-linked revision due Jul-2026 (not notified as of Oct-2026), ToD, demand charges", source: "TNERC Tariff Order No. 6 of 2025 (eff. 01-Jul-2025, in force)", sourceUrl: "https://tnerc.tn.gov.in/Orders/files/TO-Order%20No6300620252131.pdf", effectiveFrom: "01-Jul-2025" }),

  // ---------------- Telangana ----------------
  TG({ id: "tgspdcl", name: "TGSPDCL (South Telangana)", coverage: "Hyderabad & south Telangana", districts: ["Hyderabad", "Rangareddy", "Ranga Reddy", "K.V.Rangareddy", "Medchal-Malkajgiri", "Medchal Malkajgiri", "Sangareddy", "Medak", "Siddipet", "Vikarabad", "Mahabubnagar", "Mahbubnagar", "Narayanpet", "Wanaparthy", "Nagarkurnool", "Jogulamba Gadwal", "Nalgonda", "Suryapet", "Yadadri Bhuvanagiri"] }),
  TG({ id: "tgnpdcl", name: "TGNPDCL (North Telangana)", coverage: "Warangal & north Telangana", districts: ["Warangal", "Hanumakonda", "Jangaon", "Mahabubabad", "Jayashankar Bhupalpally", "Mulugu", "Karimnagar", "Peddapalli", "Jagtial", "Rajanna Sircilla", "Khammam", "Bhadradri Kothagudem", "Adilabad", "Komaram Bheem Asifabad", "Mancherial", "Nirmal", "Nizamabad", "Kamareddy"] }),

  // ---------------- Andhra Pradesh ----------------
  AP({ id: "apspdcl", name: "APSPDCL (South AP)", coverage: "South Andhra (Tirupati, Nellore, Kurnool)", districts: ["Nellore", "SPSR Nellore", "Chittoor", "Tirupati", "Cuddapah", "Kadapa", "YSR", "Annamayya", "Anantapur", "Ananthapur", "Sri Sathya Sai", "Kurnool", "Nandyal"] }),
  AP({ id: "apepdcl", name: "APEPDCL (East AP)", coverage: "North-coastal Andhra (Visakhapatnam, Godavari)", districts: ["Srikakulam", "Vizianagaram", "Visakhapatnam", "East Godavari", "West Godavari", "Anakapalli", "Alluri Sitharama Raju", "Parvathipuram Manyam", "Kakinada", "Konaseema", "Eluru"] }),
  AP({ id: "apcpdcl", name: "APCPDCL (Central AP)", coverage: "Central Andhra (Vijayawada, Guntur)", districts: ["Krishna", "NTR", "Guntur", "Palnadu", "Bapatla", "Prakasam"] }),

  // ---------------- Kerala ----------------
  D({ ...reg("KSERC"), id: "ksebl", name: "KSEBL (Kerala State Electricity Board)", state: "Kerala", coverage: "Kerala (HT-I(A) industry)", primary: true, districts: [], energyChargeHT: 6.25, demandCharge: 420, ciTariff: 6.25, ciBasis: "₹6.25 energy", excludes: "electricity duty, fuel surcharge, demand charges", tod: "Normal 06–18 at 100%; peak 18–22 at 150%; off-peak 22–06 at 75%", source: "KSERC Tariff Order (05-Dec-2024; rates for 01-Apr-2025 to 31-Mar-2027)", sourceUrl: "https://kseb.in", effectiveFrom: "01-Apr-2025" }),

  // ---------------- Madhya Pradesh ----------------
  MP({ id: "mppokvvcl", name: "MPPoKVVCL — Poorv Kshetra (East MP)", coverage: "East MP (Jabalpur, Sagar, Rewa)", districts: ["Jabalpur", "Katni", "Narsinghpur", "Chhindwara", "Pandhurna", "Seoni", "Balaghat", "Mandla", "Dindori", "Sagar", "Damoh", "Tikamgarh", "Niwari", "Chhatarpur", "Panna", "Rewa", "Mauganj", "Satna", "Maihar", "Sidhi", "Singrauli", "Shahdol", "Umaria", "Anuppur"] }),
  MP({ id: "mpmkvvcl", name: "MPMKVVCL — Madhya Kshetra (Central MP)", coverage: "Central MP (Bhopal, Gwalior)", districts: ["Bhopal", "Sehore", "Raisen", "Vidisha", "Rajgarh", "Hoshangabad", "Narmadapuram", "Harda", "Betul", "Gwalior", "Shivpuri", "Guna", "Ashoknagar", "Datia", "Morena", "Bhind", "Sheopur"] }),
  MP({ id: "mppakvvcl", name: "MPPaKVVCL — Paschim Kshetra (West MP)", coverage: "West MP (Indore, Pithampur, Ujjain)", districts: ["Indore", "Dhar", "Jhabua", "Alirajpur", "Khargone", "West Nimar", "Barwani", "Khandwa", "East Nimar", "Burhanpur", "Dewas", "Ujjain", "Shajapur", "Agar Malwa", "Ratlam", "Mandsaur", "Neemuch"] }),

  // ---------------- Punjab ----------------
  D({ ...reg("PSERC"), id: "pspcl", name: "PSPCL (Punjab State Power Corp)", state: "Punjab", coverage: "Punjab", primary: true, districts: [], energyChargeHT: 5.9, energyUnit: "kVAh", demandCharge: 210, energyNote: "Large Supply 100–1,000 kVA; above 1,000 kVA: ₹6.00/kVAh & ₹280/kVA", ciTariff: 5.9, ciBasis: "₹5.90 energy", excludes: "electricity duty & IDF, FPPAS, ToD, demand charges", source: "PSERC Tariff Order FY 2026-27 (06-Mar-2026)", sourceUrl: "https://docs.pspcl.in/docs/cecommercial2620260310162642809.pdf", effectiveFrom: "01-Apr-2026" }),

  // ---------------- West Bengal ----------------
  D({ ...reg("WBERC"), id: "wbsedcl", name: "WBSEDCL", state: "West Bengal", coverage: "West Bengal (ex-CESC area)", primary: true, districts: ["Howrah", "Hooghly", "North 24 Parganas", "South 24 Parganas", "Bardhaman", "Paschim Bardhaman"], energyChargeHT: 7.07, demandCharge: 384, energyNote: "Industrial 11 kV, Rate E(B); ToD option available", ciTariff: 7.07, ciBasis: "₹7.07 energy", excludes: "MVCA, electricity duty, demand charges", tod: "Optional ToD: 06–17 ≈₹7.05, 17–23 ≈₹10.30, 23–06 ≈₹4.24", source: "WBERC Tariff Order (gist 2025-26), in force for FY 2026-27", sourceUrl: "https://www.wbsedcl.in/irj/go/km/docs/internet/new_website/pdf/Tariff_Volumn/Gist%20of%20Tariff%20Order%202025-26_28_03.pdf", effectiveFrom: "01-Apr-2025" }),
  { id: "cesc", name: "CESC Limited", state: "West Bengal", coverage: "Kolkata & Howrah", districts: ["Kolkata", "Howrah", "Hooghly", "North 24 Parganas", "South 24 Parganas"], ...unverified("WBERC", "https://www.cesc.co.in/tariff") },
  { id: "ipcl", name: "India Power Corp (IPCL)", state: "West Bengal", coverage: "Asansol-Raniganj", districts: ["Bardhaman", "Paschim Bardhaman"], ...unverified("WBERC", "https://www.wberc.gov.in/tariff-order") },

  // ---------------- Odisha ----------------
  OD({ id: "tpcodl", name: "TPCODL (Tata Power Central Odisha)", coverage: "Central Odisha (Bhubaneswar, Cuttack, Angul)", districts: ["Khorda", "Khordha", "Cuttack", "Puri", "Jagatsinghpur", "Jagatsinghapur", "Kendrapara", "Jajpur", "Nayagarh", "Dhenkanal", "Angul"] }),
  OD({ id: "tpwodl", name: "TPWODL (Tata Power Western Odisha)", coverage: "West Odisha (Sambalpur, Jharsuguda)", districts: ["Sambalpur", "Bargarh", "Jharsuguda", "Sundargarh", "Deogarh", "Debagarh", "Bolangir", "Balangir", "Sonepur", "Subarnapur", "Kalahandi", "Nuapada"] }),
  OD({ id: "tpsodl", name: "TPSODL (Tata Power Southern Odisha)", coverage: "South Odisha (Berhampur, Koraput)", districts: ["Ganjam", "Gajapati", "Kandhamal", "Phulbani", "Boudh", "Rayagada", "Koraput", "Nabarangpur", "Nabarangapur", "Malkangiri"] }),
  OD({ id: "tpnodl", name: "TPNODL (Tata Power Northern Odisha)", coverage: "North Odisha (Balasore, Keonjhar)", districts: ["Balasore", "Baleswar", "Bhadrak", "Mayurbhanj", "Keonjhar", "Kendujhar"] }),

  // ---------------- Bihar ----------------
  BR({ id: "nbpdcl", name: "NBPDCL (North Bihar)", coverage: "North Bihar (Muzaffarpur, Darbhanga)", districts: ["Muzaffarpur", "Vaishali", "Sitamarhi", "Sheohar", "East Champaran", "Purba Champaran", "West Champaran", "Pashchim Champaran", "Saran", "Siwan", "Gopalganj", "Darbhanga", "Madhubani", "Samastipur", "Begusarai", "Khagaria", "Saharsa", "Supaul", "Madhepura", "Purnia", "Purnea", "Katihar", "Araria", "Kishanganj"] }),
  BR({ id: "sbpdcl", name: "SBPDCL (South Bihar)", coverage: "South Bihar (Patna, Gaya)", districts: ["Patna", "Nalanda", "Bhojpur", "Buxar", "Rohtas", "Kaimur", "Bhabua", "Gaya", "Jehanabad", "Arwal", "Aurangabad", "Aurangabad(BH)", "Nawada", "Sheikhpura", "Lakhisarai", "Jamui", "Munger", "Bhagalpur", "Banka"] }),

  // ---------------- Chhattisgarh ----------------
  { id: "cspdcl", name: "CSPDCL", state: "Chhattisgarh", coverage: "Chhattisgarh (Raipur, Bhilai)", primary: true, districts: [], ...unverified("CSERC", "https://cserc.gov.in", "FY 2026-27 order (eff. 01-Jul-2026) verified only for HV-4 steel: ₹7.05/unit & ₹400/kVA. Other HT industry rates not yet verified.") },

  // ---------------- Jharkhand ----------------
  D({ ...reg("JSERC"), id: "jbvnl", name: "JBVNL (Jharkhand Bijli Vitran)", state: "Jharkhand", coverage: "Jharkhand (Ranchi, Jamshedpur)", primary: true, districts: [], energyChargeHT: 6.4, energyUnit: "kVAh", demandCharge: 400, ciTariff: 6.4, ciBasis: "₹6.40 energy", excludes: "electricity duty, FPPAS, demand charges", source: "JSERC MYT Tariff Order for JBVNL (25-Mar-2026)", sourceUrl: "https://jserc.org/pdf/tariff_order/JBVNL-2026.pdf", effectiveFrom: "01-Apr-2026" }),

  // ---------------- Uttarakhand ----------------
  D({ ...reg("UERC"), id: "upcl", name: "UPCL (Uttarakhand Power Corp)", state: "Uttarakhand", coverage: "Uttarakhand (Haridwar, Pantnagar)", primary: true, districts: [], energyChargeHT: 6.85, energyUnit: "kVAh", demandCharge: 410, energyNote: "HT industry up to 50% load factor (₹6.60 above); ₹480/kVA above 1,000 kVA", ciTariff: 6.85, ciBasis: "₹6.85 energy", excludes: "electricity duty, FPPCA, demand charges", tod: "22.5% solar-hours rebate 09:00–17:00 (load >25 kW)", source: "UERC Tariff Order FY 2026-27 (31-Mar-2026)", sourceUrl: "https://uerc.uk.gov.in/tariff-order-2026-27/", effectiveFrom: "01-Apr-2026" }),

  // ---------------- Himachal Pradesh ----------------
  D({ ...reg("HPERC"), id: "hpsebl", name: "HPSEBL", state: "Himachal Pradesh", coverage: "Himachal (Baddi, Solan)", primary: true, districts: [], energyChargeHT: 5.85, energyUnit: "kVAh", demandCharge: 250, energyNote: "LIPS HT-1 (≤1 MVA); HT-2 (>1 MVA): ₹5.60 & ₹400/kVA", ciTariff: 5.85, ciBasis: "₹5.85 energy", excludes: "electricity duty, FCA, demand charges", source: "HPERC Tariff Order FY 2026-27 (25-Mar-2026)", sourceUrl: "https://hperc.org/wp-content/uploads/2026/03/pntariff26-27.pdf", effectiveFrom: "01-Apr-2026" }),

  // ---------------- Assam & North-East ----------------
  D({ ...reg("AERC"), id: "apdcl", name: "APDCL (Assam Power Distribution)", state: "Assam", coverage: "Assam (Guwahati)", primary: true, districts: [], energyChargeHT: 8.09, demandCharge: 280, energyNote: "HT Industries-II (>150 kVA) option 1; option 2: ₹7.69 & ₹360/kVA", ciTariff: 8.09, ciBasis: "₹8.09 energy", excludes: "electricity duty, FPPPA, demand charges", tod: "Solar hours 09:00–17:00 billed at 80%; peak 17:00–22:00 at 120%", source: "AERC Tariff Order FY 2026-27 (06-Mar-2026)", sourceUrl: "https://www.apdcl.org/website/docs/acts_and_rules/TariffnoticeforFY2026-27.pdf", effectiveFrom: "01-Apr-2026" }),
  { id: "mspdcl", name: "MSPDCL (Manipur)", state: "Manipur", coverage: "Manipur (Imphal)", primary: true, districts: [], ...unverified("JERC (Manipur & Mizoram)", "https://jerc.mizoram.gov.in/") },
  { id: "mepdcl", name: "MePDCL (Meghalaya)", state: "Meghalaya", coverage: "Meghalaya (Shillong)", primary: true, districts: [], ...unverified("MSERC", "https://www.mserc.gov.in/") },
  { id: "tsecl", name: "TSECL (Tripura)", state: "Tripura", coverage: "Tripura (Agartala)", primary: true, districts: [], ...unverified("TERC", "https://cercind.gov.in/serc.html") },
  { id: "dop-nagaland", name: "Dept. of Power, Nagaland", state: "Nagaland", coverage: "Nagaland (Dimapur)", primary: true, districts: [], ...unverified("NERC", "https://cercind.gov.in/serc.html") },
  { id: "pe-mizoram", name: "P&E Dept., Mizoram", state: "Mizoram", coverage: "Mizoram (Aizawl)", primary: true, districts: [], ...unverified("JERC (Manipur & Mizoram)", "https://jerc.mizoram.gov.in/") },
  { id: "dop-arunachal", name: "Dept. of Power, Arunachal Pradesh", state: "Arunachal Pradesh", coverage: "Arunachal (Itanagar)", primary: true, districts: [], ...unverified("APSERC", "https://apserc.nic.in/") },
  { id: "ep-sikkim", name: "Energy & Power Dept., Sikkim", state: "Sikkim", coverage: "Sikkim (Gangtok)", primary: true, districts: [], ...unverified("SSERC", "https://www.sserc.org/") },

  // ---------------- Goa & Union Territories ----------------
  { id: "goa-ed", name: "Electricity Department, Goa", state: "Goa", coverage: "Goa (Verna, Panaji)", primary: true, districts: [], ...unverified("JERC (Goa & UTs)", "https://jercuts.gov.in/") },
  { id: "jpdcl", name: "JPDCL (Jammu)", state: "Jammu & Kashmir", coverage: "Jammu region", districts: ["Jammu", "Kathua", "Samba", "Udhampur", "Reasi", "Rajouri", "Poonch", "Doda", "Kishtwar", "Ramban"], ...unverified("JERC (J&K and Ladakh)", "https://jercjkl.nic.in/") },
  { id: "kpdcl", name: "KPDCL (Kashmir)", state: "Jammu & Kashmir", coverage: "Kashmir region", districts: ["Srinagar", "Budgam", "Anantnag", "Baramulla", "Kupwara", "Pulwama", "Shopian", "Kulgam", "Ganderbal", "Bandipora"], ...unverified("JERC (J&K and Ladakh)", "https://jercjkl.nic.in/") },
  { id: "ladakh-pdd", name: "Power Development Dept., Ladakh", state: "Ladakh", coverage: "Ladakh (Leh, Kargil)", primary: true, districts: [], ...unverified("JERC (J&K and Ladakh)", "https://jercjkl.nic.in/") },
  { id: "chandigarh-ed", name: "Electricity Dept., Chandigarh", state: "Chandigarh", coverage: "Chandigarh (Industrial Area)", primary: true, districts: [], ...unverified("JERC (Goa & UTs)", "https://jercuts.gov.in/") },
  { id: "puducherry-ed", name: "Electricity Dept., Puducherry", state: "Puducherry", coverage: "Puducherry (Mettupalayam)", primary: true, districts: [], ...unverified("JERC (Goa & UTs)", "https://jercuts.gov.in/") },
  { id: "dnh-power", name: "DNH & DD Power Distribution Corp", state: "Dadra & Nagar Haveli and Daman & Diu", coverage: "Silvassa, Daman, Diu", primary: true, districts: [], ...unverified("JERC (Goa & UTs)", "https://jercuts.gov.in/") },
  { id: "an-ed", name: "Electricity Dept., Andaman & Nicobar", state: "Andaman & Nicobar", coverage: "Port Blair", primary: true, districts: [], ...unverified("JERC (Goa & UTs)", "https://jercuts.gov.in/"), openAccess: "Not applicable (islanded grid)" },
];

export const getDiscomsByState = (stateName) => DISCOMS.filter((d) => d.state === stateName);
export const getDiscomByName = (name) => DISCOMS.find((d) => d.name === name);
export const getDiscomById = (id) => DISCOMS.find((d) => d.id === id);

const nk = (s) => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");

// Likely DISCOM(s) for a location — by India Post district, else the state's primary DISCOM.
export function suggestDiscoms(stateName, districts = []) {
  const list = getDiscomsByState(stateName);
  if (list.length <= 1) return list;
  const keys = districts.map(nk).filter(Boolean);
  const hit = list.filter((d) => (d.districts || []).some((x) => keys.includes(nk(x))));
  return hit.length ? hit : list.filter((d) => d.primary);
}

// "₹7.1–10.2/kWh" from verified DISCOM rates in the state, or null when none are verified.
export function stateTariffRange(stateName) {
  const vals = getDiscomsByState(stateName).map((d) => d.ciTariff).filter((v) => typeof v === "number");
  if (!vals.length) return null;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return lo === hi ? `₹${lo}/kWh` : `₹${lo}–${hi}/kWh`;
}
