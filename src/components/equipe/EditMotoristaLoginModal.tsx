import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { KeyRound, Phone, Copy, Eye, EyeOff, Check, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditMotoristaLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: {
    id: string;
    nome: string;
    telefone?: string;
    has_login: boolean;
  };
  eventoId?: string;
  onSuccess?: () => void;
}

interface CreatedCredentials {
  login: string;
  password: string;
}

export function EditMotoristaLoginModal({ 
  open, 
  onOpenChange, 
  motorista, 
  eventoId,
  onSuccess 
}: EditMotoristaLoginModalProps) {
  const [telefone, setTelefone] = useState(motorista.telefone || "");
  const [senha, setSenha] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  const hasLogin = motorista.has_login;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleCreateLogin = async () => {
    if (!telefone.trim() || !senha.trim()) {
      toast.error("Telefone e senha são obrigatórios");
      return;
    }
    
    if (senha.trim().length < 4) {
      toast.error("Senha deve ter pelo menos 4 caracteres");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const telefoneDigits = telefone.replace(/\D/g, '');

      // Use driver-register Edge Function (custom credentials table)
      const response = await supabase.functions.invoke('driver-register', {
        body: {
          motorista_id: motorista.id,
          telefone: telefoneDigits,
          senha: senha.trim(),
        },
      });

      if (response.error) {
        const msg = response.error.message?.toLowerCase() || '';
        if (msg.includes('em uso') || msg.includes('duplicate') || msg.includes('já')) {
          toast.error('Telefone já cadastrado — Este número já possui login de outro motorista.');
        } else {
          toast.error('Falha na criação do login — Verifique os dados e tente novamente.');
        }
        return;
      }

      if (response.data?.error) {
        const msg = (response.data.error as string).toLowerCase();
        if (msg.includes('em uso') || msg.includes('duplicate') || msg.includes('já')) {
          toast.error('Telefone já cadastrado — Este número já possui login de outro motorista.');
        } else {
          toast.error('Falha na criação do login — Verifique os dados e tente novamente.');
        }
        return;
      }

      // Update motorista telefone if different
      if (telefoneDigits !== (motorista.telefone?.replace(/\D/g, '') || '')) {
        await supabase
          .from('motoristas')
          .update({ telefone: telefoneDigits })
          .eq('id', motorista.id);
      }
      
      // Primeiro mostrar credenciais, depois chamar onSuccess no handleClose
      setCreatedCredentials({
        login: telefoneDigits,
        password: senha.trim(),
      });
      
      // NÃO chamar onSuccess aqui - vai ser chamado quando fechar o modal de credenciais
      toast.success("Login criado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao criar login:", err);
      toast.error("Erro de conexão — Não foi possível conectar ao servidor. Verifique sua internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!novaSenha.trim() || novaSenha.trim().length < 4) {
      toast.error("Senha deve ter pelo menos 4 caracteres");
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Use driver-register Edge Function to update password
      const response = await supabase.functions.invoke('driver-register', {
        body: {
          motorista_id: motorista.id,
          telefone: motorista.telefone?.replace(/\D/g, '') || '',
          senha: novaSenha.trim(),
        },
      });

      if (response.error) {
        toast.error('Falha ao resetar senha — Não foi possível alterar a senha. Tente novamente.');
        return;
      }

      if (response.data?.error) {
        toast.error('Falha ao resetar senha — Não foi possível alterar a senha. Tente novamente.');
        return;
      }

      setCreatedCredentials({
        login: motorista.telefone || '',
        password: novaSenha.trim(),
      });
      
      setShowResetPassword(false);
      toast.success("Senha resetada com sucesso!");
      onSuccess?.();
    } catch (err: any) {
      console.error("Erro ao resetar senha:", err);
      toast.error("Erro de conexão — Não foi possível conectar ao servidor. Verifique sua internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    const hadCredentials = !!createdCredentials;
    setTelefone(motorista.telefone || "");
    setSenha("");
    setNovaSenha("");
    setCreatedCredentials(null);
    setShowResetPassword(false);
    onOpenChange(false);
    // Chamar onSuccess DEPOIS de fechar, se criou credenciais
    if (hadCredentials) {
      onSuccess?.();
    }
  };

  // Tela de credenciais criadas
  if (createdCredentials) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold">Credenciais Atualizadas</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Anote para enviar ao motorista
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Login (Telefone)</p>
                <p className="font-mono font-medium">{createdCredentials.login}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(createdCredentials.login, "Login")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Senha</p>
                <p className="font-mono font-medium">{createdCredentials.password}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(createdCredentials.password, "Senha")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <Button 
              className="w-full"
              onClick={() => {
                const text = `Login: ${createdCredentials.login}\nSenha: ${createdCredentials.password}`;
                copyToClipboard(text, "Credenciais");
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Tudo
            </Button>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Gerenciar Acesso
          </DialogTitle>
          <DialogDescription>
            {motorista.nome}
          </DialogDescription>
        </DialogHeader>

        {hasLogin ? (
          // Usuário já tem login
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Telefone de Login</p>
              <p className="font-mono font-medium">{motorista.telefone || 'Não definido'}</p>
            </div>

            {!showResetPassword && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowResetPassword(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Resetar Senha
              </Button>
            )}

            {showResetPassword && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Nova Senha *</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="pl-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowResetPassword(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleResetPassword} 
                      disabled={isSubmitting || novaSenha.length < 4}
                      className="flex-1"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Confirmar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          // Usuário não tem login - criar
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Este motorista ainda não possui acesso ao app. Crie um login para ele.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Telefone (Login) *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Senha *</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {senha.length > 0 && senha.length < 4 && (
                  <p className="text-xs text-destructive">Senha deve ter pelo menos 4 caracteres</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateLogin} 
                disabled={isSubmitting || telefone.replace(/\D/g, '').length < 4 || senha.length < 4}
                className="flex-1"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Login
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
