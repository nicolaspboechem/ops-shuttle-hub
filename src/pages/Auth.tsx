import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import logoASBranca from '@/assets/logo_as_branca.png';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, user, loading: authLoading, isAdmin, eventRoles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      if (isAdmin) {
        navigate('/eventos', { replace: true });
      } else if (eventRoles.length > 0) {
        navigate('/app', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [user, authLoading, navigate, isAdmin, eventRoles]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email ou senha inválidos');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Email não confirmado. Verifique sua caixa de entrada.');
      } else {
        setError(error.message);
      }
    }
    
    setLoading(false);
  };

  if (authLoading) {
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
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#7c3aed]/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4361ee]/5 rounded-full blur-[150px]" />
      </div>

      {/* Ambient light effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#4361ee]/10 to-transparent blur-[80px]" />

      {/* Logo */}
      <div className="mb-10 relative z-10">
        <img 
          src={logoASBranca} 
          alt="AS Brasil" 
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* Card with glowing border */}
      <div className="w-full max-w-[420px] relative z-10">
        <div className="relative p-[1px] rounded-2xl overflow-hidden">
          {/* Glowing border */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#4361ee]/40 via-[#7c3aed]/20 to-[#4361ee]/40 rounded-2xl" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-2xl" />
          
          {/* Content */}
          <div 
            className="relative rounded-2xl p-8"
            style={{
              background: 'linear-gradient(145deg, rgba(20, 28, 50, 0.95) 0%, rgba(10, 14, 26, 0.98) 100%)',
            }}
          >
            {/* Subtle inner glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            
            {/* Header */}
            <div className="relative mb-8">
              <h2 className="text-[22px] font-bold text-white">
                Sistema de Controle Operacional
              </h2>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-5 relative">
              <div className="space-y-2">
                <label htmlFor="email-login" className="block text-[13px] font-medium text-gray-400">
                  E-mail
                </label>
                <input
                  id="email-login"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="w-full h-10 px-4 rounded-lg bg-white text-[#0a0e1a] border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4361ee] transition-all disabled:opacity-50"
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
                    className="w-full h-10 px-4 pr-11 rounded-lg bg-white text-[#0a0e1a] border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4361ee] transition-all disabled:opacity-50"
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
                className="w-full h-11 rounded-lg bg-[#4361ee] hover:bg-[#3651de] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold uppercase tracking-wider transition-colors flex items-center justify-center mt-6"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Entrar
              </button>
            </form>

            <p className="text-[13px] text-gray-500 text-center mt-5">
              Para criar conta, contate o administrador
            </p>
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
