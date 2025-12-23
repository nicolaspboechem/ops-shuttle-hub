import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      // Smart redirect based on role
      if (isAdmin) {
        // Admin goes to CCO panel
        navigate('/eventos', { replace: true });
      } else if (eventRoles.length > 0) {
        // User with event roles goes to app
        navigate('/app', { replace: true });
      } else {
        // User without any roles - go to app (will show message)
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
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8">
        <img 
          src={logoASBranca} 
          alt="AS Brasil" 
          className="h-16 w-auto object-contain"
        />
      </div>

      {/* Card de Login */}
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-[#1e3a5f]/60 bg-[#0d1f35]/80 backdrop-blur-sm p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">
            Sistema de Controle Operacional
          </h2>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email-login" className="text-gray-300 text-sm">
                E-mail
              </Label>
              <Input
                id="email-login"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-[#0d2847] border-[#1e3a5f] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-login" className="text-gray-300 text-sm">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password-login"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="bg-[#0d2847] border-[#1e3a5f] text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-5 uppercase tracking-wide"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Entrar
            </Button>
          </form>

          <button 
            type="button"
            className="w-full text-center text-sm text-gray-500 hover:text-gray-400 transition-colors mt-4"
          >
            Esqueci minha senha
          </button>

          <div className="mt-6 pt-4 border-t border-[#1e3a5f]/40">
            <p className="text-xs text-gray-500 text-center">
              Ao continuar, você concorda com os Termos e a Política de Privacidade.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-600 mt-8">
        © 2025 AS Brasil. Todos os direitos reservados.
      </p>
    </div>
  );
}
