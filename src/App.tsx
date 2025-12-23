import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { EventRoleRoute } from "@/components/auth/EventRoleRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Eventos from "./pages/Eventos";
import EventoDetalhes from "./pages/EventoDetalhes";
import EventoUsuarios from "./pages/EventoUsuarios";
import EventoPainelConfig from "./pages/EventoPainelConfig";
import Dashboard from "./pages/Dashboard";
import ViagensAtivas from "./pages/ViagensAtivas";
import ViagensFinalizadas from "./pages/ViagensFinalizadas";
import Motoristas from "./pages/Motoristas";
import Veiculos from "./pages/Veiculos";
import Configuracoes from "./pages/Configuracoes";
import Usuarios from "./pages/Usuarios";
import Operacao from "./pages/Operacao";
import Auditoria from "./pages/Auditoria";
import AppHome from "./pages/app/AppHome";

import AppMotorista from "./pages/app/AppMotorista";
import AppOperador from "./pages/app/AppOperador";
import PainelPublico from "./pages/PainelPublico";
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
            <Route path="/auth" element={<Auth />} />
            
            {/* Public routes - no auth required */}
            <Route path="/painel" element={<PainelPublico />} />
            <Route path="/painel/:eventoId" element={<PainelPublico />} />
            
            {/* App Campo - Interface Mobile (role-based) */}
            <Route path="/app" element={<ProtectedRoute><AppHome /></ProtectedRoute>} />
            <Route path="/app/:eventoId/motorista" element={
              <EventRoleRoute allowedRoles={['motorista', 'operador']}>
                <AppMotorista />
              </EventRoleRoute>
            } />
            <Route path="/app/:eventoId/operador" element={
              <EventRoleRoute allowedRoles={['operador']}>
                <AppOperador />
              </EventRoleRoute>
            } />
            
            {/* Admin Routes (CCO - only for admins) */}
            <Route path="/eventos" element={<AdminRoute><Eventos /></AdminRoute>} />
            <Route path="/usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
            <Route path="/evento/:eventoId" element={<AdminRoute><EventoDetalhes /></AdminRoute>} />
            <Route path="/evento/:eventoId/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
            <Route path="/evento/:eventoId/operacao" element={<AdminRoute><Operacao /></AdminRoute>} />
            <Route path="/evento/:eventoId/viagens-ativas" element={<AdminRoute><ViagensAtivas /></AdminRoute>} />
            <Route path="/evento/:eventoId/viagens-finalizadas" element={<AdminRoute><ViagensFinalizadas /></AdminRoute>} />
            <Route path="/evento/:eventoId/motoristas" element={<AdminRoute><Motoristas /></AdminRoute>} />
            <Route path="/evento/:eventoId/veiculos" element={<AdminRoute><Veiculos /></AdminRoute>} />
            <Route path="/evento/:eventoId/equipe" element={<AdminRoute><EventoUsuarios /></AdminRoute>} />
            
            <Route path="/evento/:eventoId/auditoria" element={<AdminRoute><Auditoria /></AdminRoute>} />
            <Route path="/evento/:eventoId/painel-config" element={<AdminRoute><EventoPainelConfig /></AdminRoute>} />
            <Route path="/evento/:eventoId/configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
