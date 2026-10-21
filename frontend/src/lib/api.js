import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const createLead = (payload) => api.post("/leads", payload).then((r) => r.data);
export const getLead = (id) => api.get(`/leads/${id}`).then((r) => r.data);
export const registerEPC = (payload) => api.post("/epc/register", payload).then((r) => r.data);
export const submitProject = (payload) => api.post("/epc/projects", payload).then((r) => r.data);
export const listProjects = (epcId) => api.get("/epc/projects", { params: epcId ? { epcId } : {} }).then((r) => r.data);
export const getProject = (id) => api.get(`/epc/projects/${id}`).then((r) => r.data);
export const getStats = () => api.get("/stats").then((r) => r.data);
export const getSolarResource = (params) => api.get("/solar/resource", { params, timeout: 60000 }).then((r) => r.data);

export default api;
