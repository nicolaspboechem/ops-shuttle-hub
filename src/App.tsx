import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Eventos from "./pages/Eventos";
import EventoDetalhes from "./pages/EventoDetalhes";
import Dashboard from "./pages/Dashboard";
import ViagensAtivas from "./pages/ViagensAtivas";
import ViagensFinalizadas from "./pages/ViagensFinalizadas";
import Motoristas from "./pages/Motoristas";
import Veiculos from "./pages/Veiculos";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/eventos" element={
              <ProtectedRoute>
                <Eventos />
              </ProtectedRoute>
            } />
            <Route path="/evento/:eventoId" element={
              <ProtectedRoute>
                <EventoDetalhes />
              </ProtectedRoute>
            } />
            <Route path="/evento/:eventoId/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/evento/:eventoId/viagens-ativas" element={
              <ProtectedRoute>
                <ViagensAtivas />
              </ProtectedRoute>
            } />
            <Route path="/evento/:eventoId/viagens-finalizadas" element={
              <ProtectedRoute>
                <ViagensFinalizadas />
              </ProtectedRoute>
            } />
            <Route path="/evento/:eventoId/motoristas" element={
              <ProtectedRoute>
                <Motoristas />
              </ProtectedRoute>
            } />
            <Route path="/evento/:eventoId/veiculos" element={
              <ProtectedRoute>
                <Veiculos />
              </ProtectedRoute>
            } />
            <Route path="/evento/:eventoId/configuracoes" element={
              <ProtectedRoute>
                <Configuracoes />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
