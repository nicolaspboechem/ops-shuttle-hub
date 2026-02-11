import { lazy, Suspense, ReactNode } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth/AuthContext";
import { DriverAuthProvider } from "@/lib/auth/DriverAuthContext";
import { StaffAuthProvider } from "@/lib/auth/StaffAuthContext";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { DriverRoute } from "@/components/auth/DriverRoute";
import { StaffRoute } from "@/components/auth/StaffRoute";
import { Loader2 } from 'lucide-react';

// Auto-retry dynamic imports on chunk load failure (stale cache after deploy)
function lazyRetry(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().catch(() => {
      // Force reload once to get fresh assets
      const key = 'chunk-retry';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
      sessionStorage.removeItem(key);
      return importFn();
    })
  );
}

// Lazy load pages for code splitting
const Index = lazyRetry(() => import("./pages/Index"));
const Home = lazyRetry(() => import("./pages/Home"));
const Auth = lazyRetry(() => import("./pages/Auth"));
const LoginMotorista = lazyRetry(() => import("./pages/LoginMotorista"));
const LoginEquipe = lazyRetry(() => import("./pages/LoginEquipe"));
const Eventos = lazyRetry(() => import("./pages/Eventos"));
const EventoUsuarios = lazyRetry(() => import("./pages/EventoUsuarios"));
const EventoPainelConfig = lazyRetry(() => import("./pages/EventoPainelConfig"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const ViagensAtivas = lazyRetry(() => import("./pages/ViagensAtivas"));
const ViagensFinalizadas = lazyRetry(() => import("./pages/ViagensFinalizadas"));
const Motoristas = lazyRetry(() => import("./pages/Motoristas"));
const VincularVeiculo = lazyRetry(() => import("./pages/VincularVeiculo"));
const Veiculos = lazyRetry(() => import("./pages/Veiculos"));
const RotasShuttle = lazyRetry(() => import("./pages/RotasShuttle"));
const Configuracoes = lazyRetry(() => import("./pages/Configuracoes"));
const Usuarios = lazyRetry(() => import("./pages/Usuarios"));
const Operacao = lazyRetry(() => import("./pages/Operacao"));
const Auditoria = lazyRetry(() => import("./pages/Auditoria"));
const AppHome = lazyRetry(() => import("./pages/app/AppHome"));
const AppMotorista = lazyRetry(() => import("./pages/app/AppMotorista"));
const AppCliente = lazyRetry(() => import("./pages/app/AppCliente"));
const AppOperador = lazyRetry(() => import("./pages/app/AppOperador"));
const AppSupervisor = lazyRetry(() => import("./pages/app/AppSupervisor"));
const PainelPublico = lazyRetry(() => import("./pages/PainelPublico"));
const PainelLocalizador = lazyRetry(() => import("./pages/PainelLocalizador"));
const Suporte = lazyRetry(() => import("./pages/Suporte"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));

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

// Only mount NotificationsProvider for authenticated users
function ConditionalNotifications({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <>{children}</>;
  return <NotificationsProvider>{children}</NotificationsProvider>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DriverAuthProvider>
        <StaffAuthProvider>
          <ConditionalNotifications>
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
          </ConditionalNotifications>
        </StaffAuthProvider>
      </DriverAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
