import { lazy, Suspense, ReactNode } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/lib/auth/AuthContext";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { DriverRoute } from "@/components/auth/DriverRoute";
import { StaffRoute } from "@/components/auth/StaffRoute";
import { Loader2 } from 'lucide-react';

// ============================================================
// CRITICAL PAGES: imported directly (NO lazy load)
// ============================================================
import LoginMotorista from "./pages/LoginMotorista";
import Auth from "./pages/Auth";
import LoginEquipe from "./pages/LoginEquipe";
import NotFound from "./pages/NotFound";

// ============================================================
// lazyRetry: retry the import itself (NO page reload)
// ============================================================
function lazyRetry(importFn: () => Promise<any>) {
  return lazy(() => {
    const attempt = (retriesLeft: number, delay: number): Promise<any> =>
      importFn().catch((err) => {
        const msg = String(err?.message || err || '');
        const isStaleChunk =
          msg.includes('MIME') ||
          msg.includes('Failed to fetch dynamically imported module') ||
          msg.includes('Loading chunk') ||
          msg.includes('Loading CSS chunk');

        if (isStaleChunk) {
          const key = 'lazyRetry_reload';
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            window.location.reload();
          }
        }

        if (retriesLeft <= 0) {
          console.error('Chunk load failed after all retries:', err);
          return {
            default: () => (
              <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 p-4">
                <p className="text-destructive text-center">Erro ao carregar página. Verifique sua conexão.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                >
                  Tentar novamente
                </button>
              </div>
            ),
          };
        }
        return new Promise((resolve) =>
          setTimeout(() => resolve(attempt(retriesLeft - 1, delay * 1.5)), delay)
        );
      });
    return attempt(3, 1500);
  });
}

// ============================================================
// LAZY PAGES
// ============================================================
const Index = lazyRetry(() => import("./pages/Index"));
const Home = lazyRetry(() => import("./pages/Home"));
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
const MapaServico = lazyRetry(() => import("./pages/MapaServico"));
const AppHome = lazyRetry(() => import("./pages/app/AppHome"));
const AppMotorista = lazyRetry(() => import("./pages/app/AppMotorista"));
const AppCliente = lazyRetry(() => import("./pages/app/AppCliente"));
const AppOperador = lazyRetry(() => import("./pages/app/AppOperador"));
const AppSupervisor = lazyRetry(() => import("./pages/app/AppSupervisor"));
const PainelPublico = lazyRetry(() => import("./pages/PainelPublico"));
const PainelLocalizador = lazyRetry(() => import("./pages/PainelLocalizador"));
const Suporte = lazyRetry(() => import("./pages/Suporte"));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3,
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Only mount NotificationsProvider for authenticated users
function ConditionalNotifications({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <>{children}</>;
  return <NotificationsProvider>{children}</NotificationsProvider>;
}

// Layout wrapper that provides AuthProvider + Notifications
function AuthLayout() {
  return (
    <AuthProvider>
      <ConditionalNotifications>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </ConditionalNotifications>
    </AuthProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ========================================= */}
            {/* PUBLIC ROUTES: No auth needed */}
            {/* ========================================= */}
            <Route path="/login/motorista" element={<LoginMotorista />} />
            <Route path="/login/equipe" element={<LoginEquipe />} />
            <Route path="/painel" element={<PainelPublico />} />
            <Route path="/painel/:eventoId" element={<PainelPublico />} />
            <Route path="/localizador" element={<PainelLocalizador />} />
            <Route path="/localizador/:eventoId" element={<PainelLocalizador />} />

            {/* ========================================= */}
            {/* AUTH ROUTES: All wrapped in AuthProvider */}
            {/* ========================================= */}
            <Route element={<AuthLayout />}>
              {/* Landing + Auth */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              {/* App Hub */}
              <Route path="/app" element={<ProtectedRoute><AppHome /></ProtectedRoute>} />

              {/* Driver app — now uses Supabase Auth via AuthProvider */}
              <Route path="/app/:eventoId/motorista" element={
                <DriverRoute><AppMotorista /></DriverRoute>
              } />

              {/* Staff field apps */}
              <Route path="/app/:eventoId/operador" element={
                <StaffRoute allowedRoles={['operador', 'supervisor']}><AppOperador /></StaffRoute>
              } />
              <Route path="/app/:eventoId/supervisor" element={
                <StaffRoute allowedRoles={['supervisor']}><AppSupervisor /></StaffRoute>
              } />
              <Route path="/app/:eventoId/cliente" element={
                <StaffRoute allowedRoles={['cliente']}><AppCliente /></StaffRoute>
              } />
              <Route path="/app/:eventoId/vincular-veiculo/:motoristaId" element={
                <StaffRoute allowedRoles={['supervisor']}>
                  <VincularVeiculo />
                </StaffRoute>
              } />

              {/* Admin Routes (CCO) */}
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
              <Route path="/evento/:eventoId/mapa-servico" element={<AdminRoute><MapaServico /></AdminRoute>} />
              <Route path="/evento/:eventoId/auditoria" element={<AdminRoute><Auditoria /></AdminRoute>} />
              <Route path="/evento/:eventoId/painel-config" element={<AdminRoute><EventoPainelConfig /></AdminRoute>} />
              <Route path="/evento/:eventoId/configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
