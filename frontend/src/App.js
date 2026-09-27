import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
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

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Toaster theme="dark" position="top-center" richColors />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/calculator" element={<Calculator />} />
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
      </BrowserRouter>
    </div>
  );
}

export default App;
