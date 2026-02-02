import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { DriverAuthProvider } from "@/lib/auth/DriverAuthContext";
import { StaffAuthProvider } from "@/lib/auth/StaffAuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { EventRoleRoute } from "@/components/auth/EventRoleRoute";
import { DriverRoute } from "@/components/auth/DriverRoute";
import { StaffRoute } from "@/components/auth/StaffRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import LoginMotorista from "./pages/LoginMotorista";
import LoginEquipe from "./pages/LoginEquipe";
import Eventos from "./pages/Eventos";
import EventoUsuarios from "./pages/EventoUsuarios";
import EventoPainelConfig from "./pages/EventoPainelConfig";
import Dashboard from "./pages/Dashboard";
import ViagensAtivas from "./pages/ViagensAtivas";
import ViagensFinalizadas from "./pages/ViagensFinalizadas";
import Motoristas from "./pages/Motoristas";
import VincularVeiculo from "./pages/VincularVeiculo";
import Veiculos from "./pages/Veiculos";
import RotasShuttle from "./pages/RotasShuttle";
import Configuracoes from "./pages/Configuracoes";
import Usuarios from "./pages/Usuarios";
import Operacao from "./pages/Operacao";
import Auditoria from "./pages/Auditoria";
import AppHome from "./pages/app/AppHome";

import AppMotorista from "./pages/app/AppMotorista";
import AppCliente from "./pages/app/AppCliente";
import AppOperador from "./pages/app/AppOperador";
import AppSupervisor from "./pages/app/AppSupervisor";
import PainelPublico from "./pages/PainelPublico";
import PainelLocalizador from "./pages/PainelLocalizador";
import Suporte from "./pages/Suporte";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DriverAuthProvider>
        <StaffAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/login/motorista" element={<LoginMotorista />} />
                <Route path="/login/equipe" element={<LoginEquipe />} />
              
              {/* Public routes - no auth required */}
              <Route path="/painel" element={<PainelPublico />} />
              <Route path="/painel/:eventoId" element={<PainelPublico />} />
              <Route path="/localizador" element={<PainelLocalizador />} />
              <Route path="/localizador/:eventoId" element={<PainelLocalizador />} />
              
              {/* App Campo - Interface Mobile (role-based) */}
              <Route path="/app" element={<ProtectedRoute><AppHome /></ProtectedRoute>} />
              
              {/* Motorista uses custom driver auth */}
              <Route path="/app/:eventoId/motorista" element={
                <DriverRoute>
                  <AppMotorista />
                </DriverRoute>
              } />
              
              {/* Staff uses custom staff auth */}
              <Route path="/app/:eventoId/operador" element={
                <StaffRoute allowedRoles={['operador', 'supervisor']}>
                  <AppOperador />
                </StaffRoute>
              } />
              <Route path="/app/:eventoId/supervisor" element={
                <StaffRoute allowedRoles={['supervisor']}>
                  <AppSupervisor />
                </StaffRoute>
              } />
              <Route path="/app/:eventoId/cliente" element={
                <StaffRoute allowedRoles={['cliente']}>
                  <AppCliente />
                </StaffRoute>
              } />
              
              {/* Admin Routes (CCO - only for admins) */}
              <Route path="/eventos" element={<AdminRoute><Eventos /></AdminRoute>} />
              <Route path="/usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
              <Route path="/suporte" element={<AdminRoute><Suporte /></AdminRoute>} />
              <Route path="/evento/:eventoId" element={<AdminRoute><Dashboard /></AdminRoute>} />
              <Route path="/evento/:eventoId/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
              <Route path="/evento/:eventoId/operacao" element={<AdminRoute><Operacao /></AdminRoute>} />
              <Route path="/evento/:eventoId/viagens-ativas" element={<AdminRoute><ViagensAtivas /></AdminRoute>} />
              <Route path="/evento/:eventoId/viagens-finalizadas" element={<AdminRoute><ViagensFinalizadas /></AdminRoute>} />
              <Route path="/evento/:eventoId/motoristas" element={<AdminRoute><Motoristas /></AdminRoute>} />
              <Route path="/evento/:eventoId/vincular-veiculo/:motoristaId" element={<AdminRoute><VincularVeiculo /></AdminRoute>} />
              <Route path="/evento/:eventoId/veiculos" element={<AdminRoute><Veiculos /></AdminRoute>} />
              <Route path="/evento/:eventoId/rotas-shuttle" element={<AdminRoute><RotasShuttle /></AdminRoute>} />
              <Route path="/evento/:eventoId/equipe" element={<AdminRoute><EventoUsuarios /></AdminRoute>} />
              
              <Route path="/evento/:eventoId/auditoria" element={<AdminRoute><Auditoria /></AdminRoute>} />
              <Route path="/evento/:eventoId/painel-config" element={<AdminRoute><EventoPainelConfig /></AdminRoute>} />
              <Route path="/evento/:eventoId/configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />
              
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </StaffAuthProvider>
      </DriverAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
