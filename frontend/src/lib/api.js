import axios from "axios";

// Unset on Vercel: the browser calls /api on the same domain (routed to the backend service).
const API = `${process.env.REACT_APP_BACKEND_URL ?? ""}/api`;
const USER_KEY = "si_token";
const ADMIN_KEY = "si_admin_token";

export const getToken = () => localStorage.getItem(USER_KEY);
export const setToken = (t) => (t ? localStorage.setItem(USER_KEY, t) : localStorage.removeItem(USER_KEY));
export const getAdminToken = () => localStorage.getItem(ADMIN_KEY);
export const setAdminToken = (t) => (t ? localStorage.setItem(ADMIN_KEY, t) : localStorage.removeItem(ADMIN_KEY));

const withToken = (instance, getter, onExpired) => {
  instance.interceptors.request.use((cfg) => {
    const t = getter();
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    return cfg;
  });
  instance.interceptors.response.use((r) => r, (err) => {
    if (err?.response?.status === 401 && getter()) onExpired();
    return Promise.reject(err);
  });
  return instance;
};

export const api = withToken(axios.create({ baseURL: API }), getToken, () => { setToken(null); window.dispatchEvent(new Event("si-logout")); });
export const adminApi = withToken(axios.create({ baseURL: API }), getAdminToken, () => { setAdminToken(null); window.dispatchEvent(new Event("si-admin-logout")); });

// FastAPI returns a string, or an array of {msg} for validation errors.
export const errMsg = (e, fallback = "Something went wrong. Please try again.") => {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg).filter(Boolean).join(" ") || fallback;
  return e?.response ? fallback : "Couldn't reach the server. Check your connection and try again.";
};

export const firebaseLogin = (idToken, name) => api.post("/auth/firebase", { idToken, name }).then((r) => r.data);
export const getMe = () => api.get("/auth/me").then((r) => r.data);
export const saveActivity = (kind, title, inputs, summary) => api.post("/activity", { kind, title, inputs, summary }).then((r) => r.data);
export const uploadBill = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post("/bills", fd, { timeout: 60000 }).then((r) => r.data);
};

export const adminLogin = (email, password) => api.post("/admin/login", { email, password }).then((r) => r.data);
export const adminOverview = () => adminApi.get("/admin/overview").then((r) => r.data);
export const adminUsers = (q) => adminApi.get("/admin/users", { params: q ? { q } : {} }).then((r) => r.data);
export const adminUser = (id) => adminApi.get(`/admin/users/${id}`).then((r) => r.data);
export const adminLeads = () => adminApi.get("/leads").then((r) => r.data);
export const adminBillBlob = (fileId) => adminApi.get(`/admin/bills/${fileId}`, { responseType: "blob" }).then((r) => r.data);

export const createLead = (payload) => api.post("/leads", payload).then((r) => r.data);
export const getLead = (id) => api.get(`/leads/${id}`).then((r) => r.data);
export const registerEPC = (payload) => api.post("/epc/register", payload).then((r) => r.data);
export const submitProject = (payload) => api.post("/epc/projects", payload).then((r) => r.data);
export const listProjects = (epcId) => api.get("/epc/projects", { params: epcId ? { epcId } : {} }).then((r) => r.data);
export const getProject = (id) => api.get(`/epc/projects/${id}`).then((r) => r.data);
export const getStats = () => api.get("/stats").then((r) => r.data);
export const getSolarResource = (params) => api.get("/solar/resource", { params, timeout: 60000 }).then((r) => r.data);

export default api;
