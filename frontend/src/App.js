import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FloatingActions } from "@/components/FloatingActions";
import { LanguagePicker } from "@/components/LanguagePicker";
import Home from "@/pages/Home";
import ServicePage from "@/pages/ServicePage";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import Roadmap from "@/pages/Roadmap";

function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-rk-bg">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingActions />
      <LanguagePicker />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/services/:type" element={<Layout><ServicePage /></Layout>} />
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/admin" element={<Layout><Admin /></Layout>} />
            <Route path="/roadmap" element={<Layout><Roadmap /></Layout>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
