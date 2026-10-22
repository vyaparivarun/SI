/*
 * India solar lender directory — every institution here was found in an official or
 * published source (linked per entry). Checked 2026-10-22.
 * coverage : "ALL" (pan-India) or state codes from states.js.
 * status   : how the lender funds solar —
 *   scheme    dedicated solar product page found
 *   general   funds solar through business / green / project loans
 *   onlending funds solar only through partner banks / NBFCs (not direct)
 *   confirm   lender type confirmed, solar product not published — ask the branch
 * Rates are deliberately omitted: they are benchmark-linked and change often.
 */

export const LENDER_META = {
  lastVerified: "2026-10-22",
  disclaimer:
    "Directory is compiled from lender product pages, MNRE / DFS / PIB releases and press reports linked on each entry. Inclusion is not an endorsement or an offer of credit. Products, eligibility and rates change — confirm current terms with the lender before applying.",
};

export const STATUS = {
  scheme: { label: "Dedicated solar product", tone: "emerald" },
  general: { label: "Funds solar via business / project loans", tone: "blue" },
  onlending: { label: "Funds via partner lenders", tone: "violet" },
  confirm: { label: "Ask branch — no published solar product", tone: "amber" },
};

export const SEGMENTS = {
  CI: "C&I / MSME",
  RES: "Homes (PM Surya Ghar)",
  AGRI: "Farm / PM-KUSUM",
  UTIL: "Utility & open access",
  VENDOR: "Solar vendor finance",
};

export const LENDER_TYPES = [
  "Public Sector Bank",
  "Private Bank",
  "Small Finance Bank",
  "Foreign Bank",
  "Regional Rural Bank",
  "Co-operative Bank",
  "Government FI / DFI",
  "NBFC / Green lender",
  "State Financial Institution",
  "Multilateral / Development partner",
  "Government scheme / Guarantee",
];

const ALL = "ALL";
const MINT = "https://www.livemint.com/industry/energy/finance-ministry-banks-loan-processing-rooftop-solar-11791516026104.html";
const MNRE_FIN = "https://solarrooftop.pmsuryaghar.gov.in/pdf/financial_options-20230306.pdf";
const PIB_RE = "https://www.pib.gov.in/PressReleasePage.aspx?lang=1&PRID=2287149&reg=1";
const FDRE = "https://www.trowers.com/news/trowers-advises-lenders-on-usd-600-million-dual-currency-financing-for-india-s-first-large-scale-fdre-project";
const PSL_NOTE = "No solar-specific product published (checked 2026-10-22). Renewable-energy loans qualify for RBI priority-sector lending — ask the branch for an MSME / business term loan.";

const bank = (type) => (id, name, hq, o) => ({ id, name, type, hq, coverage: ALL, ...o });
const psb = bank("Public Sector Bank");
const pvt = bank("Private Bank");
const sfb = bank("Small Finance Bank");
const fgn = (id, name, url, source) => bank("Foreign Bank")(id, name, "India branches", {
  segments: ["UTIL"], status: "general",
  product: "Project finance and green loans for large solar / hybrid projects, usually in multi-bank syndicates",
  url, source,
});
const pvtConfirm = (id, name, hq) => pvt(id, name, hq, { segments: ["CI"], status: "confirm", product: PSL_NOTE, url: null, source: "No published solar product" });

const PUBLIC_SECTOR = [
  psb("sbi", "State Bank of India", "Mumbai", {
    segments: ["CI", "RES", "AGRI"], status: "scheme",
    product: "Surya Shakti Solar Finance (business) · PM Surya Ghar loan (homes) · PM-KUSUM B & C (farmers)",
    terms: "Captive projects up to ₹10 Cr (≤10 yrs, 20% margin); non-captive up to ₹50 Cr (≤15 yrs, 25% margin); CIBIL 650+ and Udyam registration",
    url: "https://sbi.bank.in/web/business/sme/sme-loans/surya-shakti-solar-finance", source: "SBI Surya Shakti product page",
  }),
  psb("bob", "Bank of Baroda", "Vadodara", {
    segments: ["CI", "RES"], status: "scheme",
    product: "Solar Projects Finance Scheme — MSME captive rooftop / ground-mounted plants",
    terms: "Term loan ₹10 lakh–₹30 Cr, repayment up to 120 months; pricing by credit rating",
    url: "https://bankofbaroda.bank.in/business-banking/msme-banking/loans-and-advances/solar-projects-finance-scheme", source: "Bank of Baroda product page",
  }),
  psb("union", "Union Bank of India", "Mumbai", {
    segments: ["CI", "RES"], status: "scheme",
    product: "Union Solar (business captive rooftop / ground-mounted) · Union Roof Top Solar (homes, up to 25 kW)",
    terms: "Homes: up to 80% of cost or ₹15 lakh, up to 84 months, 20% margin",
    url: "https://www.unionbankofindia.bank.in/en/details/union-solar", source: "Union Bank product page",
  }),
  psb("pnb", "Punjab National Bank", "New Delhi", {
    segments: ["CI", "RES", "VENDOR"], status: "scheme",
    product: "PNB Solar Energy Scheme (MSME & non-MSME) · Rooftop solar for homes (up to 10 kW) · Solar Vendor Financing",
    terms: "Business: need-based, min 20% margin, up to 10 yrs. Homes: up to ₹6 lakh",
    url: "https://pnb.bank.in/SCHEME-FOR-FINANCING-OF-ROOFTOP-SOLAR-POWER-SYSTEMS.html", source: "PNB scheme pages",
  }),
  psb("canara", "Canara Bank", "Bengaluru", {
    segments: ["RES", "VENDOR"], status: "scheme",
    product: "Canara Rooftop Solar – PM Surya Ghar · Housing-cum-Solar loan · Canara MSME Solar Vendor (working capital)",
    terms: "Homes: up to ₹6 lakh, 10 yrs, no collateral (asset hypothecation). Vendors: ₹10 lakh–₹5 Cr",
    url: "https://www.canarabank.bank.in/best-solar-loan", source: "Canara Bank solar loan page",
  }),
  psb("boi", "Bank of India", "Mumbai", {
    segments: ["RES"], status: "scheme",
    product: "Star Rooftop Solar Panel Finance",
    url: "https://bankofindia.bank.in/personal-loan/star-rooftop-solar-panel-finance-loan", source: "Bank of India product page",
  }),
  psb("indianbank", "Indian Bank", "Chennai", {
    segments: ["RES"], status: "scheme",
    product: "PM Surya Ghar Muft Bijli Yojana Rooftop Solar Loan",
    terms: "CIBIL 680+; above 3 kW needs ₹3 lakh net annual income; 70% released upfront, 30% after verification",
    url: "https://indianbank.bank.in/en/pm-surya-ghar-muft-bijli-yojana-roof-top-solar-loan", source: "Indian Bank product page",
  }),
  psb("central", "Central Bank of India", "Mumbai", {
    segments: ["RES"], status: "scheme",
    product: "Cent Solar — Roof Top Solar Loan Scheme",
    terms: "Up to ₹2 lakh at 10% margin; up to ₹6 lakh at 20% margin; up to 120 months",
    url: "https://centralbank.bank.in/en/Roof-Top-Solar-Loan-Scheme", source: "Central Bank product page",
  }),
  psb("iob", "Indian Overseas Bank", "Chennai", {
    segments: ["CI", "RES"], status: "scheme",
    product: "IOB Tejas (MSME captive solar up to 2 MW) · IOB Surya (PM Surya Ghar)",
    terms: "Tejas: above ₹20 lakh to ₹9 Cr, up to 120 months; Udyam + CIBIL 650+; collateral 25–35%",
    url: "https://www.iob.bank.in/en/iob-tejas", source: "IOB product page",
  }),
  psb("uco", "UCO Bank", "Kolkata", {
    segments: ["RES"], status: "scheme",
    product: "UCO Suryodaya Loan (PM Surya Ghar), applied via Jan Samarth",
    terms: "CIBIL 680+",
    url: "https://www.uco.bank.in/uco-suryodaya-loan", source: "UCO Bank product page",
  }),
  psb("bom", "Bank of Maharashtra", "Pune", {
    segments: ["RES", "VENDOR"], status: "scheme",
    product: "Maha Bank Rooftop Solar Loan · Maha Bank Finance to Solar Vendors (MFSV)",
    terms: "Vendors: above ₹10 lakh to ₹5 Cr for MNRE-registered vendors, CGTMSE cover",
    url: "https://bankofmaharashtra.bank.in/mahabank-rooftop-solar-panel-loan", source: "Bank of Maharashtra product pages",
  }),
  psb("psb", "Punjab & Sind Bank", "New Delhi", {
    segments: ["RES"], status: "general",
    product: "PM Surya Ghar rooftop loans via Jan Samarth — one of the 12 public sector banks in the scheme",
    url: "https://www.jansamarth.in", source: "PM Surya Ghar lender list (Jan Samarth)",
  }),
];

const PRIVATE = [
  pvt("hdfc", "HDFC Bank", "Mumbai", {
    segments: ["RES", "CI"], status: "general",
    product: "PM Surya Ghar loans via Jan Samarth; business term loans for C&I solar",
    url: MINT, source: "Finance Ministry review of PM Surya Ghar lending (Mint, 9 Oct 2026)",
  }),
  pvt("icici", "ICICI Bank", "Mumbai", {
    segments: ["RES", "CI"], status: "scheme",
    product: "Solar loans for individuals and business entities",
    terms: "Up to 90% of project cost, 12–36 months, no security or guarantor",
    url: MNRE_FIN, source: "MNRE National Portal — financing options",
  }),
  pvt("axis", "Axis Bank", "Mumbai", {
    segments: ["CI", "UTIL"], status: "general",
    product: "Green and business term loans, including rooftop solar for SMEs",
    url: "https://www.axis.bank.in/sustainability-reports/2022-2023/pdf/inclusive-and-equitable-economy.pdf", source: "Axis Bank Sustainability Report 2022-23",
  }),
  pvt("kotak", "Kotak Mahindra Bank", "Mumbai", {
    segments: ["RES"], status: "general",
    product: "Participating lender for PM Surya Ghar via Jan Samarth",
    url: MINT, source: "Finance Ministry review of PM Surya Ghar lending (Mint, 9 Oct 2026)",
  }),
  pvt("idbi", "IDBI Bank", "Mumbai", {
    segments: ["RES"], status: "general",
    product: "Participating lender for PM Surya Ghar via Jan Samarth",
    url: MINT, source: "Finance Ministry review of PM Surya Ghar lending (Mint, 9 Oct 2026)",
  }),
  pvt("indusind", "IndusInd Bank", "Mumbai", {
    segments: ["CI"], status: "scheme",
    product: "Solar financing for micro & small enterprises, with Tata Power Renewable Energy",
    terms: "₹10 lakh–₹2 Cr, collateral-free, 20% margin, up to 7 yrs",
    url: "https://www.indusind.bank.in/iblogs/pressrelease/indusind-bank-partners-with-tata-power-renewable-energy-limited-to-empower-mses-with-solar-energy-financing-solutions/", source: "IndusInd Bank press release",
  }),
  pvt("yes", "Yes Bank", "Mumbai", {
    segments: ["CI"], status: "scheme",
    product: "YES KIRAN — captive solar for MSME manufacturers",
    terms: "Up to ₹3 Cr, 6-yr tenure, 6-month moratorium",
    url: "https://www.financialexpress.com/business/sme-msme-green-now-msmes-can-get-up-to-rs-3-cr-loan-to-install-solar-panels-at-premises-see-yes-banks-scheme-details-3078773/", source: "Financial Express",
  }),
  pvt("federal", "Federal Bank", "Aluva, Kerala", {
    segments: ["CI"], status: "scheme",
    product: "Green Loan Scheme for business units · co-lending with Ecofy for 20–200 kW commercial rooftops",
    terms: "₹10 lakh–₹5 Cr",
    url: "https://www.federal.bank.in/green-loan-scheme", source: "Federal Bank product page",
  }),
  pvt("karnatakabank", "Karnataka Bank", "Mangaluru", {
    segments: ["RES", "AGRI", "CI"], status: "scheme",
    product: "KBL Ravi Kiran — solar for individuals, farmers, professionals and institutions",
    terms: "Up to ₹10 lakh, up to 60 months",
    url: "https://www.karnatakabank.bank.in/personal/loans/ravi-kiran", source: "Karnataka Bank product page",
  }),
  pvt("kvb", "Karur Vysya Bank", "Karur", {
    segments: ["AGRI"], status: "scheme",
    product: "Farm Credit – Renewable Energy (solar pumps, lamps, fencing) for farmers, SHGs and JLGs",
    terms: "₹1 lakh–₹1 Cr, 60–84 months",
    url: "https://www.kvb.bank.in/agriculture/products/farm-credit/", source: "KVB product page",
  }),
  pvt("idfcfirst", "IDFC FIRST Bank", "Mumbai", {
    segments: ["CI"], status: "general",
    product: "Climate on-lending programme incl. renewable energy (AIIB-proposed USD 100 M, 2026)",
    url: "https://www.aiib.org/en/projects/details/2026/proposed/india-climate-mitigation-on-lending-program-idfc-first-bank.html", source: "AIIB project page",
  }),
  pvtConfirm("rbl", "RBL Bank", "Mumbai"),
  pvtConfirm("bandhan", "Bandhan Bank", "Kolkata"),
  pvtConfirm("dcb", "DCB Bank", "Mumbai"),
  pvtConfirm("sib", "South Indian Bank", "Thrissur"),
  pvtConfirm("cub", "City Union Bank", "Kumbakonam"),
  pvtConfirm("tmb", "Tamilnad Mercantile Bank", "Thoothukudi"),
  pvtConfirm("jkbank", "J&K Bank", "Srinagar"),
  pvtConfirm("dhanlaxmi", "Dhanlaxmi Bank", "Thrissur"),
  pvtConfirm("csb", "CSB Bank", "Thrissur"),
];

const SMALL_FINANCE = [
  sfb("esaf", "ESAF Small Finance Bank", "Thrissur", {
    segments: ["RES", "CI"], status: "scheme",
    product: "Clean Energy Product Loan — solar generators and inverters",
    terms: "Up to ₹10 lakh, 1–7 yrs",
    url: "https://www.esaf.bank.in/products/clean-energy-product-loan/", source: "ESAF product page",
  }),
  sfb("ausfb", "AU Small Finance Bank", "Jaipur", {
    segments: ["CI"], status: "general",
    product: "Climate on-lending programme incl. renewable energy (AIIB-proposed USD 100 M, 2026)",
    url: "https://www.aiib.org/en/projects/details/2026/proposed/india-climate-mitigation-on-lending-program-au-small-finance-bank.html", source: "AIIB project page",
  }),
  sfb("shivalik", "Shivalik Small Finance Bank", "Saharanpur", {
    segments: ["CI", "AGRI", "RES"], status: "general",
    product: "Solar financing for MSMEs, farmers and individuals",
    url: MNRE_FIN, source: "MNRE National Portal — financing options",
  }),
];

const FOREIGN = [
  fgn("scb", "Standard Chartered", FDRE, "1 GW FDRE financing syndicate (May 2026)"),
  fgn("dbs", "DBS Bank India", FDRE, "1 GW FDRE financing syndicate (May 2026)"),
  fgn("bnp", "BNP Paribas", FDRE, "1 GW FDRE financing syndicate (May 2026)"),
  fgn("mufg", "MUFG Bank", FDRE, "1 GW FDRE financing syndicate (May 2026)"),
  fgn("smbc", "SMBC", FDRE, "1 GW FDRE financing syndicate (May 2026)"),
  fgn("cacib", "Crédit Agricole CIB", FDRE, "1 GW FDRE financing syndicate (May 2026)"),
];

const RRB_SOURCE = "https://financialservices.gov.in/list-rrbs-functioning-country";
const rrb = (code, name, hq, sponsor, url) => ({
  id: `rrb-${code.toLowerCase()}`, name, type: "Regional Rural Bank", hq, coverage: [code], sponsor,
  segments: ["RES", "AGRI"], status: "confirm",
  product: `State RRB (sponsor: ${sponsor}). RRBs are onboarded lenders on Jan Samarth for PM Surya Ghar rooftop loans and farm credit — confirm the solar product at your branch.`,
  url, source: "DFS list of RRBs (w.e.f. 01-May-2025)", sourceUrl: RRB_SOURCE,
});

const RRBS = [
  rrb("AP", "Andhra Pradesh Grameena Bank", "Amaravati", "Union Bank of India", "https://apgb.bank.in/"),
  rrb("AR", "Arunachal Pradesh Rural Bank", "Naharlagun", "State Bank of India", "https://aprb.bank.in/"),
  rrb("AS", "Assam Gramin Bank", "Guwahati", "Punjab National Bank", "https://www.agvb.bank.in/"),
  rrb("BR", "Bihar Gramin Bank", "Patna", "Punjab National Bank", "https://bgb.bank.in/"),
  rrb("CG", "Chhattisgarh Gramin Bank", "Raipur", "State Bank of India", "https://www.crgb.bank.in/"),
  rrb("GJ", "Gujarat Gramin Bank", "Vadodara", "Bank of Baroda", "https://www.ggb.bank.in/"),
  rrb("HR", "Haryana Gramin Bank", "Rohtak", "Punjab National Bank", "https://shgb.bank.in/"),
  rrb("HP", "Himachal Pradesh Gramin Bank", "Mandi", "Punjab National Bank", "https://www.hpgb.bank.in/"),
  rrb("JK", "Jammu and Kashmir Grameen Bank", "Jammu", "J&K Bank", "https://www.jkgrameen.bank.in/"),
  rrb("JH", "Jharkhand Gramin Bank", "Ranchi", "State Bank of India", "https://www.jrgbank.bank.in/index"),
  rrb("KA", "Karnataka Grameena Bank", "Ballari", "Canara Bank", "https://karnatakagb.bank.in/"),
  rrb("KL", "Kerala Grameena Bank", "Malappuram", "Canara Bank", "https://kgb.bank.in/"),
  rrb("MP", "Madhya Pradesh Gramin Bank", "Indore", "Bank of India", "https://mpgb.bank.in/"),
  rrb("MH", "Maharashtra Gramin Bank", "Chhatrapati Sambhajinagar", "Bank of Maharashtra", "https://www.mahagramin.bank.in/"),
  rrb("MN", "Manipur Rural Bank", "Imphal", "Punjab National Bank", "https://manipurrural.bank.in/"),
  rrb("ML", "Meghalaya Rural Bank", "Shillong", "State Bank of India", "https://meghalayaruralbank.bank.in/"),
  rrb("MZ", "Mizoram Rural Bank", "Aizawl", "State Bank of India", "https://mrb.bank.in/"),
  rrb("NL", "Nagaland Rural Bank", "Kohima", "State Bank of India", "https://www.nrb.bank.in/"),
  rrb("OD", "Odisha Grameen Bank", "Bhubaneswar", "Indian Overseas Bank", "https://odishabank.in/"),
  rrb("PY", "Puducherry Grama Bank", "Puducherry", "Indian Bank", "https://pygb.bank.in/"),
  rrb("PB", "Punjab Gramin Bank", "Kapurthala", "Punjab National Bank", "https://pgb.bank.in/"),
  rrb("RJ", "Rajasthan Gramin Bank", "Jaipur", "State Bank of India", "https://rgb.bank.in/"),
  rrb("TN", "Tamil Nadu Grama Bank", "Salem", "Indian Bank", "https://tngb.bank.in/"),
  rrb("TS", "Telangana Grameena Bank", "Hyderabad", "State Bank of India", "https://tgbhyd.in/"),
  rrb("TR", "Tripura Gramin Bank", "Agartala", "Punjab National Bank", "https://tripuragramin.bank.in/"),
  rrb("UP", "Uttar Pradesh Gramin Bank", "Lucknow", "Bank of Baroda", "https://upgb.bank.in/"),
  rrb("UK", "Uttarakhand Gramin Bank", "Dehradun", "State Bank of India", "https://www.ukgb.bank.in/"),
  rrb("WB", "West Bengal Gramin Bank", "Kolkata", "Punjab National Bank", "https://www.wbgb.bank.in/"),
];

const coop = (id, name, hq, state, o) => ({
  id, name, type: "Co-operative Bank", hq, coverage: [state], status: "scheme",
  coverageNote: "Head-office state shown — ask about branches in other states", ...o,
});

const COOPERATIVE = [
  coop("saraswat", "Saraswat Co-operative Bank", "Mumbai", "MH", {
    segments: ["CI", "RES"], product: "Solar Urja Loan — salaried individuals and industrial, commercial, institutional entities",
    terms: "Up to ₹50 lakh, 7 yrs; no collateral up to ₹10 lakh, 25% above",
    url: MNRE_FIN, source: "MNRE National Portal — financing options",
  }),
  coop("tjsb", "TJSB Sahakari Bank", "Thane", "MH", {
    segments: ["CI"], product: "Industrial Solar Scheme for business entities",
    terms: "Up to ₹5 Cr per entity (₹10 Cr group), up to 84 months incl. 12-month moratorium",
    url: "https://www.tjsb.bank.in/business-banking/Industrial-Solar-Scheme", source: "TJSB product page",
  }),
  coop("nkgsb", "NKGSB Co-operative Bank", "Mumbai", "MH", {
    segments: ["CI", "RES"], product: "Solar Panel Loan — residential and commercial premises",
    terms: "Up to ₹2 Cr, 3–5 yrs; no collateral for MSMEs up to ₹2 Cr",
    url: "https://www.nkgsb-bank.com/solar-panel-loan.php", source: "NKGSB product page",
  }),
  coop("abhyudaya", "Abhyudaya Co-operative Bank", "Mumbai", "MH", {
    segments: ["CI", "RES"], product: "Surya Shakti Loan Scheme — industrial, educational, hospital and household premises",
    terms: "Up to 70% of cost; ₹10 lakh individuals / ₹50 lakh others; up to 84 EMIs",
    url: "https://www.abhyudaya.bank.in/english/Surya-Shakti-Loan-Scheme.aspx", source: "Abhyudaya Bank product page",
  }),
  coop("kalupur", "Kalupur Commercial Co-operative Bank", "Ahmedabad", "GJ", {
    segments: ["CI"], product: "Renewable Energy (solar, biogas, wind) loan for captive use by manufacturers",
    terms: "Up to ₹15 Cr, 15% margin, 72 months incl. 6-month moratorium",
    url: "https://kalupur.bank.in/products/renewable-energy-solar-biogas-wind/", source: "Kalupur Bank product page",
  }),
  coop("tarntaran", "Tarn Taran Central Co-operative Bank", "Tarn Taran", "PB", {
    segments: ["AGRI"], product: "Solar loans for members of Primary Agricultural Co-operative Societies",
    terms: "Up to 85% of project cost",
    url: MNRE_FIN, source: "MNRE National Portal — financing options",
  }),
];

const gfi = (id, name, hq, o) => ({ id, name, type: "Government FI / DFI", hq, coverage: ALL, ...o });

const GOVT_FI = [
  gfi("ireda", "IREDA", "New Delhi", {
    full: "Indian Renewable Energy Development Agency",
    segments: ["CI", "UTIL"], status: "scheme",
    product: "Rooftop Solar PV loan scheme (industrial, commercial, institutional) · project finance for utility & open-access plants",
    terms: "Min 1,000 kWp per application (aggregators: sub-projects from 20 kWp); up to 70–75% of cost; up to 10 yrs (15 in specific cases), 12-month moratorium",
    url: "https://www.ireda.in/IredaWebPortal/loan-products/schemes", source: "IREDA loan schemes & financing norms (Oct 2025)",
  }),
  gfi("sidbi", "SIDBI", "Lucknow", {
    full: "Small Industries Development Bank of India",
    segments: ["CI"], status: "scheme",
    product: "STAR rooftop solar term loan · Green Finance Scheme · 4E energy-efficiency scheme",
    terms: "STAR: up to 100% financing, up to 5 yrs. Green Finance Scheme: up to ₹20 Cr for MSMEs",
    url: "https://www.sidbi.in/green-finance", source: "SIDBI green finance page",
  }),
  gfi("nabard", "NABARD", "Mumbai", {
    full: "National Bank for Agriculture and Rural Development",
    segments: ["AGRI", "RES"], status: "onlending",
    product: "Refinance to banks, RRBs and co-operative banks; PM-KUSUM loans to state governments; ADB rooftop line",
    terms: "PM-KUSUM loans to states: cost of funds + 0.60%, 7 yrs incl. 2-yr moratorium",
    url: "https://www.mahaurja.maharashtra.gov.in/Site/Upload/Pdf/Annexure-V.pdf", source: "MEDA PM-KUSUM annexure (NABARD terms)",
  }),
  gfi("pfc", "Power Finance Corporation", "New Delhi", {
    segments: ["UTIL"], status: "general", product: "Project finance for large renewable-energy projects",
    url: PIB_RE, source: "PIB — RE financing by IREDA, PFC, REC, SIDBI, NABARD, IIFCL, NaBFID",
  }),
  gfi("rec", "REC Limited", "Gurugram", {
    segments: ["UTIL"], status: "general", product: "Project finance for large renewable-energy projects",
    url: PIB_RE, source: "PIB — RE financing by IREDA, PFC, REC, SIDBI, NABARD, IIFCL, NaBFID",
  }),
  gfi("iifcl", "IIFCL", "New Delhi", {
    full: "India Infrastructure Finance Company Ltd",
    segments: ["UTIL"], status: "general", product: "Long-tenure infrastructure finance, incl. renewable energy",
    url: PIB_RE, source: "PIB — RE financing by IREDA, PFC, REC, SIDBI, NABARD, IIFCL, NaBFID",
  }),
  gfi("nabfid", "NaBFID", "Mumbai", {
    full: "National Bank for Financing Infrastructure and Development",
    segments: ["UTIL"], status: "general", product: "Infrastructure development finance, incl. renewable energy",
    url: PIB_RE, source: "PIB — RE financing by IREDA, PFC, REC, SIDBI, NABARD, IIFCL, NaBFID",
  }),
];

const nbfc = (id, name, hq, o) => ({ id, name, type: "NBFC / Green lender", hq, coverage: ALL, ...o });

const NBFCS = [
  nbfc("tatacapital", "Tata Capital — Cleantech Finance", "Mumbai", {
    segments: ["CI", "UTIL"], status: "general",
    product: "Cleantech finance vertical (Tata Cleantech Capital merged into Tata Capital, Jan 2024) — rooftop, C&I and utility renewable loans",
    url: "https://www.nrdc.org/greenbanknetwork/membership/tata-capital-limited-cleantech-finance", source: "Green Bank Network member profile",
  }),
  nbfc("abcl", "Aditya Birla Capital", "Mumbai", {
    segments: ["CI", "UTIL"], status: "general",
    product: "Debt financing for renewable-energy projects (Aditya Birla Finance merged into ABCL, Apr 2025)",
    url: "https://www.aiib.org/en/projects/details/2025/_download/India/AIIB-PSI-P000906-India-ABFL-Sustainable-Infrastructure-Financing-October-31-2025.pdf", source: "AIIB project summary (Oct 2025)",
  }),
  nbfc("efl", "Electronica Finance", "Pune", {
    segments: ["CI", "RES"], status: "scheme",
    product: "Surya Shakti rooftop solar loan — residential, commercial and industrial",
    terms: "Up to ₹3 Cr; collateral-free up to ₹50 lakh; up to 4 yrs",
    coverageNote: "Branches in major cities incl. Delhi NCR, Mumbai, Pune, Chennai, Bengaluru, Ahmedabad",
    url: "https://www.electronicafinance.com/rooftop-solar-loan/", source: "Electronica Finance product page",
  }),
  nbfc("ecofy", "Ecofy", "Mumbai", {
    segments: ["CI", "RES"], status: "scheme",
    product: "Collateral-free rooftop solar loans for homes and MSMEs (green-only NBFC)",
    coverageNote: "26 states, 500+ cities",
    url: "https://www.ecofy.co.in/rooftop-solar", source: "Ecofy product page",
  }),
  nbfc("creditfair", "Credit Fair", "Mumbai", {
    segments: ["RES", "CI"], status: "scheme",
    product: "Solar loans for homes, businesses and housing societies; listed on Jan Samarth",
    coverageNote: "80+ cities",
    url: "https://www.creditfair.in/", source: "Credit Fair website",
  }),
  nbfc("ckers", "cKers Finance", null, {
    segments: ["CI"], status: "general",
    product: "Loans to SMEs and developers for rooftop solar and distributed renewables (US DFC-guaranteed)",
    url: "https://www.dfc.gov/investment-story/filling-financing-gap-distributed-renewable-energy-india", source: "US DFC investment story",
  }),
  nbfc("metafin", "Metafin", "Mumbai", {
    segments: ["RES", "CI"], status: "scheme", coverage: ["UP", "BR", "OD", "JH", "CG", "MP"],
    product: "Rural solar loans for micro-businesses and households replacing diesel",
    url: "https://www.metafin.in/", source: "Metafin website",
  }),
];

const sfi = (id, name, hq, state, o) => ({ id, name, type: "State Financial Institution", hq, coverage: [state], ...o });

const STATE_FI = [
  sfi("tiic", "TIIC", "Chennai", "TN", {
    full: "Tamilnadu Industrial Investment Corporation",
    segments: ["CI", "UTIL"], status: "scheme",
    product: "Solar Power Projects Scheme — captive plants, or 1 MW+ plants selling to the state DISCOM",
    terms: "Promoter contribution 25% (existing units) / 35% (new); up to 9 yrs incl. 1-yr moratorium; collateral 35–50% of loan",
    url: "https://www.tiic.org/solar-power-project-scheme/", source: "TIIC scheme page",
  }),
  sfi("rfc", "Rajasthan Financial Corporation", "Jaipur", "RJ", {
    segments: ["CI", "UTIL"], status: "scheme",
    product: "Solar PV project finance under the Rajasthan solar policy, incl. net-metering projects",
    terms: "Up to 70% of cost; min 1 MW (0.5 MW for captive rooftop / off-grid); up to 10 yrs. Scheme document dated Jan 2020 — confirm current terms",
    url: "https://istart.rajasthan.gov.in/public/uploads/notifications/1578051206_4220.pdf", source: "RFC scheme document (iStart Rajasthan)",
  }),
  sfi("kfc", "Kerala Financial Corporation", "Thiruvananthapuram", "KL", {
    segments: ["CI"], status: "general",
    product: "MSME term loans that can fund solar; collateral-free options with CGTMSE cover; up to 10 yrs",
    url: "https://www.kfc.org/", source: "KFC website",
  }),
  sfi("ksidc", "KSIDC", "Thiruvananthapuram", "KL", {
    full: "Kerala State Industrial Development Corporation",
    segments: ["CI"], status: "general",
    product: "Project term loans for establishment, expansion or modernisation, incl. solar",
    url: "https://www.ksidc.org/work-divisions/project_financing/", source: "KSIDC project financing page",
  }),
];

const dp = (id, name, product, url, source) => ({
  id, name, type: "Multilateral / Development partner", hq: "International", coverage: ALL,
  segments: ["CI", "RES", "UTIL"], status: "onlending", product, url, source,
});

const DEV_PARTNERS = [
  dp("worldbank", "World Bank", "Rooftop solar lines via SBI (USD 625 M, 2016); USD 890 M approved Jul 2026 for PM Surya Ghar homes",
    "https://www.worldbank.org/en/news/press-release/2026/07/09/world-bank-supports-india-s-solar-rooftop-program-to-boost-clean-energy-create-jobs-and-unlock-private-capital", "World Bank press release (9 Jul 2026)"),
  dp("adb", "Asian Development Bank", "Solar rooftop multitranche facility via SBI and NABARD (USD 175 M tranche, 2026)",
    "https://www.adb.org/projects/49419-004/main", "ADB project 49419"),
  dp("aiib", "AIIB", "Climate on-lending via IDFC FIRST Bank and AU Small Finance Bank (proposed 2026); Aditya Birla Capital (2025)",
    "https://www.aiib.org/en/projects/details/2026/proposed/india-climate-mitigation-on-lending-program-idfc-first-bank.html", "AIIB project pages"),
  dp("kfw", "KfW", "Renewable-energy credit lines via IREDA", "https://www.ireda.in/IredaWebPortal/loan-products/financing-norms", "IREDA financing norms"),
  dp("jica", "JICA", "Renewable-energy credit lines via IREDA", "https://www.ireda.in/IredaWebPortal/loan-products/financing-norms", "IREDA financing norms"),
  dp("miga", "MIGA", "USD 317.5 M guarantee (2024) for SBI rooftop-solar refinancing", "https://www.miga.org/project/sbi-rooftop-solar-refinancing-0", "MIGA project page"),
  dp("dfc", "US DFC", "Loan guarantees to Electronica Finance and cKers Finance for distributed solar",
    "https://www.dfc.gov/investment-story/filling-financing-gap-distributed-renewable-energy-india", "US DFC investment story"),
  dp("bii", "British International Investment", "Backed USD 5 M debt to Credit Fair for rooftop solar (2025)",
    "https://investmentguruindia.com/newsdetail/credit-fair-secures-5-million-from-symbiotics-investments-backed-by-british-international-investment-to-propel-rooftop-solar-financing-in-india120414", "Press report (2025)"),
];

const scheme = (id, name, o) => ({ id, name, type: "Government scheme / Guarantee", hq: "Government of India", coverage: ALL, status: "scheme", ...o });

const SCHEMES = [
  scheme("jansamarth", "PM Surya Ghar via Jan Samarth", {
    segments: ["RES"], product: "Single-window loan portal for home rooftop solar — 300+ lenders",
    terms: "Model loan: collateral-free up to ₹2 lakh, repo-linked (repo + 0.5%), up to 10 yrs",
    url: "https://www.jansamarth.in", source: "Jan Samarth · PIB",
  }),
  scheme("cgtmse", "CGTMSE", {
    full: "Credit Guarantee Fund Trust for Micro and Small Enterprises",
    segments: ["CI"], product: "Credit guarantee (not a lender) — lets MSEs borrow collateral-free from member banks",
    terms: "Cover up to ₹10 Cr for guarantees from 1-Apr-2025 (banks); ₹2 Cr cap for SFBs / RRBs",
    url: "https://www.dcmsme.gov.in/Circular%20No.%202502024-25%205cr%20to%2010%20cr%20CGTMSE.pdf", source: "CGTMSE circular (₹5 Cr → ₹10 Cr)",
  }),
  scheme("msegift", "MSE-GIFT (via SIDBI)", {
    segments: ["CI"], product: "Interest subvention and risk-sharing for MSE green-technology loans",
    terms: "2% interest subvention on loans up to ₹2 Cr",
    url: "https://www.sidbi.in/assets/front/pdf/Circular_MSE_GIFT.pdf", source: "SIDBI MSE-GIFT circular",
  }),
  scheme("kusum", "PM-KUSUM", {
    segments: ["AGRI"], product: "Solar pumps and pump solarisation — central + state subsidy, balance via bank loan",
    terms: "Typical split: 30% central CFA, 30% state, farmer 40% of which bank loan can cover 30%",
    url: "https://mnre.gov.in/en/pradhan-mantri-kisan-urja-suraksha-evam-utthaan-mahabhiyaan-pm-kusum/", source: "MNRE PM-KUSUM",
  }),
];

export const LENDERS = [
  ...PUBLIC_SECTOR, ...PRIVATE, ...SMALL_FINANCE, ...FOREIGN, ...RRBS,
  ...COOPERATIVE, ...GOVT_FI, ...NBFCS, ...STATE_FI, ...DEV_PARTNERS, ...SCHEMES,
];

export const coversState = (l, code) => !code || l.coverage === ALL || l.coverage.includes(code);
export const isStateSpecific = (l) => l.coverage !== ALL;
export const lendersForState = (code) => LENDERS.filter((l) => coversState(l, code));
