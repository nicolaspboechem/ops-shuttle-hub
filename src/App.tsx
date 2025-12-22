import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Eventos from "./pages/Eventos";
import EventoDetalhes from "./pages/EventoDetalhes";
import EventoUsuarios from "./pages/EventoUsuarios";
import Dashboard from "./pages/Dashboard";
import ViagensAtivas from "./pages/ViagensAtivas";
import ViagensFinalizadas from "./pages/ViagensFinalizadas";
import Motoristas from "./pages/Motoristas";
import Veiculos from "./pages/Veiculos";
import Configuracoes from "./pages/Configuracoes";
import Usuarios from "./pages/Usuarios";
import Operacao from "./pages/Operacao";
import AppHome from "./pages/app/AppHome";
import AppCoordenador from "./pages/app/AppCoordenador";
import AppMotorista from "./pages/app/AppMotorista";
import AppOperador from "./pages/app/AppOperador";
import PontosEmbarque from "./pages/PontosEmbarque";
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
            {/* App Campo - Interface Mobile */}
            <Route path="/app" element={<ProtectedRoute><AppHome /></ProtectedRoute>} />
            <Route path="/app/:eventoId/coordenador" element={<ProtectedRoute><AppCoordenador /></ProtectedRoute>} />
            <Route path="/app/:eventoId/motorista" element={<ProtectedRoute><AppMotorista /></ProtectedRoute>} />
            <Route path="/app/:eventoId/operador" element={<ProtectedRoute><AppOperador /></ProtectedRoute>} />
            {/* Admin Routes */}
            <Route path="/eventos" element={<ProtectedRoute><Eventos /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
            <Route path="/evento/:eventoId" element={<ProtectedRoute><EventoDetalhes /></ProtectedRoute>} />
            <Route path="/evento/:eventoId/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/evento/:eventoId/operacao" element={<ProtectedRoute><Operacao /></ProtectedRoute>} />
            <Route path="/evento/:eventoId/viagens-ativas" element={<ProtectedRoute><ViagensAtivas /></ProtectedRoute>} />
            <Route path="/evento/:eventoId/viagens-finalizadas" element={<ProtectedRoute><ViagensFinalizadas /></ProtectedRoute>} />
            <Route path="/evento/:eventoId/motoristas" element={<ProtectedRoute><Motoristas /></ProtectedRoute>} />
            <Route path="/evento/:eventoId/veiculos" element={<ProtectedRoute><Veiculos /></ProtectedRoute>} />
            <Route path="/evento/:eventoId/equipe" element={<ProtectedRoute><EventoUsuarios /></ProtectedRoute>} />
            <Route path="/evento/:eventoId/pontos" element={<ProtectedRoute><PontosEmbarque /></ProtectedRoute>} />
            <Route path="/evento/:eventoId/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
