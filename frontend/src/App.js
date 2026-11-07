import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import LoanCalculator from "@/pages/LoanCalculator";
import Home from "@/pages/Home";
import Calculator from "@/pages/Calculator";
import Financing from "@/pages/Financing";
import StatesDB from "@/pages/StatesDB";
import StateDetail from "@/pages/StateDetail";
import DiscomDB from "@/pages/DiscomDB";
import Government from "@/pages/Government";
import RecCarbon from "@/pages/RecCarbon";
import Industries from "@/pages/Industries";
import IndustryDetail from "@/pages/IndustryDetail";
import Technology from "@/pages/Technology";
import ProjectModels from "@/pages/ProjectModels";
import SolarForBusiness from "@/pages/SolarForBusiness";
import EPC from "@/pages/EPC";
import FinancingPartners from "@/pages/FinancingPartners";
import EpcPartners from "@/pages/EpcPartners";
import Resources from "@/pages/Resources";
import Contact from "@/pages/Contact";

function UserApp() {
  const { user } = useAuth();
  if (user === null) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0B1622]" data-testid="auth-loading"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;
  }
  if (!user) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/loan-calculator" element={<LoanCalculator />} />
            <Route path="/financing" element={<Financing />} />
            <Route path="/states" element={<StatesDB />} />
            <Route path="/solar/state/:code" element={<StateDetail />} />
            <Route path="/discoms" element={<DiscomDB />} />
            <Route path="/government" element={<Government />} />
            <Route path="/rec-carbon" element={<RecCarbon />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/solar/:slug" element={<IndustryDetail />} />
            <Route path="/technology" element={<Technology />} />
            <Route path="/project-models" element={<ProjectModels />} />
            <Route path="/solar-for-business" element={<SolarForBusiness />} />
            <Route path="/epc" element={<EPC />} />
            <Route path="/financing-partners" element={<FinancingPartners />} />
            <Route path="/epc-partners" element={<EpcPartners />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Toaster theme="dark" position="top-center" richColors />
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<UserApp />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
