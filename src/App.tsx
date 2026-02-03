import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { DriverAuthProvider } from "@/lib/auth/DriverAuthContext";
import { StaffAuthProvider } from "@/lib/auth/StaffAuthContext";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { DriverRoute } from "@/components/auth/DriverRoute";
import { StaffRoute } from "@/components/auth/StaffRoute";
import { Loader2 } from 'lucide-react';

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const LoginMotorista = lazy(() => import("./pages/LoginMotorista"));
const LoginEquipe = lazy(() => import("./pages/LoginEquipe"));
const Eventos = lazy(() => import("./pages/Eventos"));
const EventoUsuarios = lazy(() => import("./pages/EventoUsuarios"));
const EventoPainelConfig = lazy(() => import("./pages/EventoPainelConfig"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ViagensAtivas = lazy(() => import("./pages/ViagensAtivas"));
const ViagensFinalizadas = lazy(() => import("./pages/ViagensFinalizadas"));
const Motoristas = lazy(() => import("./pages/Motoristas"));
const VincularVeiculo = lazy(() => import("./pages/VincularVeiculo"));
const Veiculos = lazy(() => import("./pages/Veiculos"));
const RotasShuttle = lazy(() => import("./pages/RotasShuttle"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Operacao = lazy(() => import("./pages/Operacao"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const AppHome = lazy(() => import("./pages/app/AppHome"));
const AppMotorista = lazy(() => import("./pages/app/AppMotorista"));
const AppCliente = lazy(() => import("./pages/app/AppCliente"));
const AppOperador = lazy(() => import("./pages/app/AppOperador"));
const AppSupervisor = lazy(() => import("./pages/app/AppSupervisor"));
const PainelPublico = lazy(() => import("./pages/PainelPublico"));
const PainelLocalizador = lazy(() => import("./pages/PainelLocalizador"));
const Suporte = lazy(() => import("./pages/Suporte"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Optimized QueryClient with caching and stale time
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DriverAuthProvider>
        <StaffAuthProvider>
          <NotificationsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
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
                    <Route path="/home" element={<AdminRoute><Home /></AdminRoute>} />
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
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </NotificationsProvider>
        </StaffAuthProvider>
      </DriverAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
