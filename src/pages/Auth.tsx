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
      <div className="min-h-screen bg-[#0B1425] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1425] flex flex-col items-center justify-center p-4">
      {/* Logo - maior como na referência */}
      <div className="mb-12">
        <img 
          src={logoASBranca} 
          alt="AS Brasil" 
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Card de Login */}
      <div className="w-full max-w-[420px]">
        <div 
          className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(145deg, rgba(30, 58, 95, 0.3) 0%, rgba(15, 30, 50, 0.6) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.05)'
          }}
        >
          <h2 className="text-[22px] font-bold text-white mb-8">
            Sistema de Controle Operacional
          </h2>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-6">
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
                className="w-full h-11 px-4 rounded-lg bg-[#0A1628] border border-[#1E3A5F] text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-colors"
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
                  className="w-full h-11 px-4 pr-11 rounded-lg bg-[#0A1628] border border-[#1E3A5F] text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold uppercase tracking-wider transition-colors flex items-center justify-center"
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

      {/* Footer */}
      <p className="text-center text-[11px] text-gray-600 mt-10">
        © 2025 AS Brasil. Todos os direitos reservados.
      </p>
    </div>
  );
}
