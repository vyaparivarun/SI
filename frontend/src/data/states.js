/*
 * Indian States & Union Territories — solar profile data (source-tagged).
 * irradiation : long-term GHI (kWh/m²/day) from Global Solar Atlas (World Bank / Solargis),
 *               median of the state's major industrial clusters listed below. Used only as the
 *               fallback when exact-location (pincode) data is unavailable.
 * installedMw : total installed solar capacity per MNRE, as on 30-Sep-2026.
 * C&I tariffs live in discoms.js (per DISCOM, with tariff-order links).
 */

export const DATA_META = {
  lastVerified: "2026-10-21",
  irradiationSource: "Global Solar Atlas (World Bank · Solargis) — median of major industrial clusters",
  capacitySource: "MNRE state-wise installed capacity, as on 30-Sep-2026",
  capacitySourceUrl: "https://mnre.gov.in/en/physical-progress/",
  disclaimer:
    "Tariffs and regulations are set by each State Electricity Regulatory Commission (SERC) and change with every tariff order. Figures are linked to their source; verify against the latest order before financial decisions.",
};

const nm = (serc) => `Per ${serc} rooftop solar / net-metering regulations — capacity cap and net-metering vs net-billing rules vary by category; confirm with your DISCOM`;
const GEOA = "Green Energy Open Access for contract demand ≥100 kW (GEOA Rules, 2022)";

export const STATES = [
  { code: "AP", name: "Andhra Pradesh", irradiation: 5.21, installedMw: 8405, discoms: ["APSPDCL", "APEPDCL", "APCPDCL"], netMetering: nm("APERC"), openAccess: GEOA, clusters: ["Visakhapatnam", "Sri City", "Tirupati"], policy: "AP Integrated Clean Energy Policy 2024", source: "APERC" },
  { code: "AR", name: "Arunachal Pradesh", irradiation: 3.99, installedMw: 17, discoms: ["Dept. of Power, Arunachal Pradesh"], netMetering: nm("APSERC"), openAccess: GEOA, clusters: ["Itanagar"], policy: "State solar policy", source: "APSERC" },
  { code: "AS", name: "Assam", irradiation: 4.47, installedMw: 855, discoms: ["APDCL"], netMetering: nm("AERC"), openAccess: GEOA, clusters: ["Guwahati"], policy: "Assam solar policy", source: "AERC" },
  { code: "BR", name: "Bihar", irradiation: 4.7, installedMw: 572, discoms: ["NBPDCL", "SBPDCL"], netMetering: nm("BERC"), openAccess: GEOA, clusters: ["Patna", "Hajipur"], policy: "Bihar renewable energy policy", source: "BERC" },
  { code: "CG", name: "Chhattisgarh", irradiation: 5.11, installedMw: 2247, discoms: ["CSPDCL"], netMetering: nm("CSERC"), openAccess: GEOA, clusters: ["Raipur", "Bhilai"], policy: "Chhattisgarh solar policy", source: "CSERC" },
  { code: "GA", name: "Goa", irradiation: 5.27, installedMw: 102, discoms: ["Electricity Department, Goa"], netMetering: nm("JERC (Goa & UTs)"), openAccess: GEOA, clusters: ["Verna", "Panaji"], policy: "Goa solar policy", source: "JERC (Goa & UTs)" },
  { code: "GJ", name: "Gujarat", irradiation: 5.46, installedMw: 36235, discoms: ["UGVCL", "MGVCL", "DGVCL", "PGVCL", "Torrent Power"], netMetering: nm("GERC"), openAccess: `${GEOA}; GEOA banking ₹1.00/unit (Sep-2026 to Mar-2027)`, clusters: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Morbi"], policy: "Gujarat Renewable Energy Policy 2023", source: "GERC" },
  { code: "HR", name: "Haryana", irradiation: 4.79, installedMw: 2899, discoms: ["UHBVN", "DHBVN"], netMetering: nm("HERC"), openAccess: GEOA, clusters: ["Faridabad", "Gurugram", "Manesar", "Hisar", "Panipat"], policy: "Haryana solar power policy", source: "HERC" },
  { code: "HP", name: "Himachal Pradesh", irradiation: 4.82, installedMw: 385, discoms: ["HPSEBL"], netMetering: nm("HPERC"), openAccess: GEOA, clusters: ["Baddi", "Solan"], policy: "HP solar policy", source: "HPERC" },
  { code: "JH", name: "Jharkhand", irradiation: 4.96, installedMw: 395, discoms: ["JBVNL"], netMetering: nm("JSERC"), openAccess: GEOA, clusters: ["Jamshedpur", "Ranchi"], policy: "Jharkhand Solar Policy 2022", source: "JSERC" },
  { code: "KA", name: "Karnataka", irradiation: 5.35, installedMw: 12348, discoms: ["BESCOM", "MESCOM", "HESCOM", "GESCOM", "CESC Mysuru"], netMetering: nm("KERC"), openAccess: GEOA, clusters: ["Bengaluru", "Hubballi", "Mysuru", "Tumakuru"], policy: "Karnataka Renewable Energy Policy 2022-27", source: "KERC" },
  { code: "KL", name: "Kerala", irradiation: 5.38, installedMw: 2627, discoms: ["KSEBL"], netMetering: nm("KSERC"), openAccess: GEOA, clusters: ["Kochi", "Thiruvananthapuram"], policy: "Kerala solar policy", source: "KSERC" },
  { code: "MP", name: "Madhya Pradesh", irradiation: 5.18, installedMw: 6620, discoms: ["MPPoKVVCL (East)", "MPMKVVCL (Central)", "MPPaKVVCL (West)"], netMetering: nm("MPERC"), openAccess: `${GEOA}; OA wheeling ₹0.69/unit at 11 kV (FY 2026-27)`, clusters: ["Indore", "Pithampur", "Bhopal", "Mandideep"], policy: "MP Renewable Energy Policy", source: "MPERC" },
  { code: "MH", name: "Maharashtra", irradiation: 5.27, installedMw: 20400, discoms: ["MSEDCL", "Adani Electricity Mumbai", "Tata Power (Mumbai)", "BEST"], netMetering: nm("MERC"), openAccess: GEOA, clusters: ["Pune", "Mumbai", "Nashik", "Aurangabad", "Nagpur"], policy: "Maharashtra renewable energy policy", source: "MERC" },
  { code: "MN", name: "Manipur", irradiation: 4.69, installedMw: 18, discoms: ["MSPDCL"], netMetering: nm("JERC (Manipur & Mizoram)"), openAccess: GEOA, clusters: ["Imphal"], policy: "State solar policy", source: "JERC (Manipur & Mizoram)" },
  { code: "ML", name: "Meghalaya", irradiation: 4.41, installedMw: 4, discoms: ["MePDCL"], netMetering: nm("MSERC"), openAccess: GEOA, clusters: ["Shillong"], policy: "State solar policy", source: "MSERC" },
  { code: "MZ", name: "Mizoram", irradiation: 4.82, installedMw: 36, discoms: ["P&E Dept., Mizoram"], netMetering: nm("JERC (Manipur & Mizoram)"), openAccess: GEOA, clusters: ["Aizawl"], policy: "State solar policy", source: "JERC (Manipur & Mizoram)" },
  { code: "NL", name: "Nagaland", irradiation: 4.52, installedMw: 4, discoms: ["Dept. of Power, Nagaland"], netMetering: nm("NERC"), openAccess: GEOA, clusters: ["Dimapur"], policy: "State solar policy", source: "NERC" },
  { code: "OD", name: "Odisha", irradiation: 4.93, installedMw: 1282, discoms: ["TPCODL", "TPWODL", "TPSODL", "TPNODL"], netMetering: nm("OERC"), openAccess: GEOA, clusters: ["Bhubaneswar", "Angul", "Jharsuguda"], policy: "Odisha Renewable Energy Policy 2022", source: "OERC" },
  { code: "PB", name: "Punjab", irradiation: 4.69, installedMw: 1700, discoms: ["PSPCL"], netMetering: nm("PSERC"), openAccess: GEOA, clusters: ["Ludhiana", "Mandi Gobindgarh", "Jalandhar", "Mohali"], policy: "Punjab new & renewable energy policy", source: "PSERC" },
  { code: "RJ", name: "Rajasthan", irradiation: 5.06, installedMw: 45121, discoms: ["JVVNL", "AVVNL", "JdVVNL"], netMetering: nm("RERC"), openAccess: `${GEOA}; CSS ₹1.48 & additional surcharge ₹0.50/unit (FY 2026-27)`, clusters: ["Jaipur", "Jodhpur", "Bhiwadi", "Neemrana"], policy: "Rajasthan Integrated Clean Energy Policy 2024", source: "RERC" },
  { code: "SK", name: "Sikkim", irradiation: 4.18, installedMw: 8, discoms: ["Energy & Power Dept., Sikkim"], netMetering: nm("SSERC"), openAccess: GEOA, clusters: ["Gangtok"], policy: "State solar policy", source: "SSERC" },
  { code: "TN", name: "Tamil Nadu", irradiation: 5.45, installedMw: 14354, discoms: ["TNPDCL (TANGEDCO)"], netMetering: nm("TNERC"), openAccess: `${GEOA}; GEOA banking charge 8% in kind (TNERC 2025)`, clusters: ["Chennai", "Coimbatore", "Tiruppur", "Hosur", "Sriperumbudur"], policy: "Tamil Nadu Solar Energy Policy 2023", source: "TNERC" },
  { code: "TS", name: "Telangana", irradiation: 5.29, installedMw: 5165, discoms: ["TGSPDCL", "TGNPDCL"], netMetering: nm("TGERC"), openAccess: GEOA, clusters: ["Hyderabad", "Medak", "Sangareddy"], policy: "Telangana clean & green energy policy", source: "TGERC" },
  { code: "TR", name: "Tripura", irradiation: 4.58, installedMw: 50, discoms: ["TSECL"], netMetering: nm("TERC"), openAccess: GEOA, clusters: ["Agartala"], policy: "State solar policy", source: "TERC" },
  { code: "UP", name: "Uttar Pradesh", irradiation: 4.78, installedMw: 6701, discoms: ["PVVNL", "MVVNL", "PuVVNL", "DVVNL", "KESCO", "NPCL"], netMetering: nm("UPERC"), openAccess: GEOA, clusters: ["Noida", "Greater Noida", "Kanpur", "Ghaziabad", "Agra"], policy: "UP Solar Energy Policy 2022", source: "UPERC" },
  { code: "UK", name: "Uttarakhand", irradiation: 4.88, installedMw: 980, discoms: ["UPCL"], netMetering: nm("UERC"), openAccess: GEOA, clusters: ["Haridwar", "Rudrapur", "Pantnagar"], policy: "Uttarakhand Solar Energy Policy 2023", source: "UERC" },
  { code: "WB", name: "West Bengal", irradiation: 4.72, installedMw: 364, discoms: ["WBSEDCL", "CESC", "IPCL"], netMetering: nm("WBERC"), openAccess: GEOA, clusters: ["Kolkata", "Haldia", "Durgapur"], policy: "WB renewable energy policy", source: "WBERC" },
  // Union Territories
  { code: "DL", name: "Delhi (NCT)", irradiation: 4.72, installedMw: 466, discoms: ["BSES Rajdhani", "BSES Yamuna", "Tata Power-DDL", "NDMC"], netMetering: "Net metering within sanctioned load; group & virtual net metering (Delhi Solar Policy 2024)", openAccess: GEOA, clusters: ["Okhla", "Bawana", "Narela", "Mundka"], policy: "Delhi Solar Policy 2024", source: "DERC" },
  { code: "JK", name: "Jammu & Kashmir", irradiation: 4.76, installedMw: 272, discoms: ["JPDCL", "KPDCL"], netMetering: nm("JERC (J&K and Ladakh)"), openAccess: GEOA, clusters: ["Jammu", "Srinagar"], policy: "UT solar policy", source: "JERC (J&K and Ladakh)" },
  { code: "LA", name: "Ladakh", irradiation: 5.44, installedMw: 19, discoms: ["Power Development Dept., Ladakh"], netMetering: nm("JERC (J&K and Ladakh)"), openAccess: GEOA, clusters: ["Leh"], policy: "UT solar policy", source: "JERC (J&K and Ladakh)" },
  { code: "CH", name: "Chandigarh", irradiation: 4.75, installedMw: 79, discoms: ["Electricity Dept., Chandigarh"], netMetering: nm("JERC (Goa & UTs)"), openAccess: GEOA, clusters: ["Industrial Area Phase I/II"], policy: "Chandigarh solar policy", source: "JERC (Goa & UTs)" },
  { code: "PY", name: "Puducherry", irradiation: 5.48, installedMw: 93, discoms: ["Electricity Dept., Puducherry"], netMetering: nm("JERC (Goa & UTs)"), openAccess: GEOA, clusters: ["Puducherry", "Mettupalayam"], policy: "UT solar policy", source: "JERC (Goa & UTs)" },
  { code: "DN", name: "Dadra & Nagar Haveli and Daman & Diu", irradiation: 5.27, installedMw: 143, discoms: ["DNH & DD Power Distribution Corp"], netMetering: nm("JERC (Goa & UTs)"), openAccess: GEOA, clusters: ["Silvassa", "Daman"], policy: "UT solar policy", source: "JERC (Goa & UTs)" },
  { code: "AN", name: "Andaman & Nicobar", irradiation: 5.03, installedMw: 33, discoms: ["Electricity Dept., Andaman & Nicobar"], netMetering: nm("JERC (Goa & UTs)"), openAccess: "Not applicable (islanded grid)", clusters: ["Port Blair"], policy: "UT solar policy", source: "JERC (Goa & UTs)" },
];

export const getState = (code) => STATES.find((s) => s.code === code);
export const getStateByName = (name) => STATES.find((s) => s.name === name);
