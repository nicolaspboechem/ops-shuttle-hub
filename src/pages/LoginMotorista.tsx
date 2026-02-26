import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2, Phone, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoASHorizontal from '@/assets/logo_as_horizontal.png';
import { maskPhone } from '@/lib/utils/formatPhone';

export default function LoginMotorista() {
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  // Check existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Check if this user is a motorista
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (roleData?.role === 'motorista') {
          const { data: eventoData } = await supabase
            .from('evento_usuarios')
            .select('evento_id')
            .eq('user_id', session.user.id)
            .limit(1)
            .single();
          
          if (eventoData) {
            navigate(`/app/${eventoData.evento_id}/motorista`, { replace: true });
            return;
          }
        }
      }
      setCheckingSession(false);
    });
  }, [navigate]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(maskPhone(e.target.value));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const phoneDigits = telefone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('Digite um número de celular válido');
      setLoading(false);
      return;
    }

    const phone = '+55' + phoneDigits;
    const { error: authError } = await supabase.auth.signInWithPassword({ phone, password });
    
    if (authError) {
      setError(authError.message || 'Celular ou senha inválidos');
      setLoading(false);
      return;
    }

    // After login, find evento and redirect
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Erro ao obter dados do usuário');
      setLoading(false);
      return;
    }

    const { data: eventoData } = await supabase
      .from('evento_usuarios')
      .select('evento_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (eventoData) {
      navigate(`/app/${eventoData.evento_id}/motorista`, { replace: true });
    } else {
      setError('Nenhum evento vinculado ao seu usuário');
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4361ee]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#4361ee]/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#22c55e]/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4361ee]/5 rounded-full blur-[150px]" />
      </div>

      {/* Ambient light effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#22c55e]/10 to-transparent blur-[80px]" />

      {/* Logo */}
      <div className="mb-8 relative z-10">
        <img 
          src={logoASHorizontal} 
          alt="AS Brasil" 
          className="w-[250px] h-auto object-contain"
        />
      </div>

      {/* Card with glowing border */}
      <div className="w-full max-w-[420px] relative z-10">
        <div 
          className="relative rounded-2xl p-8 border border-[#22c55e]/30"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 22, 40, 0.95) 0%, rgba(10, 14, 26, 0.98) 100%)',
            boxShadow: '0 0 30px rgba(34, 197, 94, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            
          {/* Header */}
          <div className="relative mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                <Phone className="w-5 h-5 text-[#22c55e]" />
              </div>
              <div>
                <h2 className="text-[22px] font-bold text-white">
                  Área do Motorista
                </h2>
                <p className="text-sm text-gray-400">
                  Entre com seu celular e senha
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-5 relative">
            <div className="space-y-2">
              <label htmlFor="phone-login" className="block text-[13px] font-medium text-gray-400">
                Celular
              </label>
              <input
                id="phone-login"
                type="tel"
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={handlePhoneChange}
                style={{ boxShadow: '0 0 10px rgba(34, 197, 94, 0.1)' }}
                required
                autoComplete="tel"
                disabled={loading}
                className="w-full h-12 px-4 rounded-lg bg-[#f0f4ff] text-[#0a0e1a] border border-[#22c55e]/30 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#22c55e] transition-all disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password-login" className="block text-[13px] font-medium text-gray-400">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password-login"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ boxShadow: '0 0 10px rgba(34, 197, 94, 0.1)' }}
                  className="w-full h-12 px-4 pr-11 rounded-lg bg-[#f0f4ff] text-[#0a0e1a] border border-[#22c55e]/30 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#22c55e] transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-semibold uppercase tracking-wider transition-colors flex items-center justify-center mt-6"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Entrar
            </button>
          </form>

          {/* Admin link */}
          <div className="mt-6 pt-5 border-t border-[#2a3f6f]/40">
            <Link 
              to="/auth" 
              className="flex items-center justify-center gap-2 text-[13px] text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Sou administrador
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-gray-600 mt-10 relative z-10">
        © 2025 AS Brasil. Todos os direitos reservados.
      </p>
    </div>
  );
}
