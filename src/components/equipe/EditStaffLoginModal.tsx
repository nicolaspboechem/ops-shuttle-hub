import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { KeyRound, Phone, Copy, Eye, EyeOff, Check, RefreshCw, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditStaffLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: {
    id: string;
    user_id?: string;
    nome: string;
    telefone?: string;
    role: string;
    has_login: boolean;
  };
  eventoId?: string;
  onSuccess?: () => void;
}

interface CreatedCredentials {
  login: string;
  password: string;
}

export function EditStaffLoginModal({ 
  open, 
  onOpenChange, 
  staff, 
  eventoId,
  onSuccess 
}: EditStaffLoginModalProps) {
  const [nome, setNome] = useState(staff.nome || "");
  const [telefone, setTelefone] = useState(staff.telefone || "");
  const [senha, setSenha] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  
  const hasLogin = staff.has_login;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleUpdateInfo = async () => {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Update profile
      if (staff.user_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            full_name: nome.trim(),
            telefone: telefone.replace(/\D/g, '') || null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', staff.user_id);

        if (profileError) throw profileError;
      }

      // Update staff_credenciais telefone if changed
      if (telefone && eventoId && staff.user_id) {
        const telefoneDigits = telefone.replace(/\D/g, '');
        await supabase
          .from('staff_credenciais')
          .update({ telefone: telefoneDigits, updated_at: new Date().toISOString() })
          .eq('user_id', staff.user_id)
          .eq('evento_id', eventoId);
      }
      
      setEditingInfo(false);
      toast.success("Informações atualizadas!");
      onSuccess?.();
    } catch (err: any) {
      console.error("Erro ao atualizar info:", err);
      toast.error(err.message || "Erro ao atualizar informações");
    } finally {
      setIsSubmitting(false);
    }
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

      // Use staff-register Edge Function
      const response = await supabase.functions.invoke('staff-register', {
        body: {
          user_id: staff.user_id,
          evento_id: eventoId,
          telefone: telefoneDigits,
          senha: senha.trim(),
          role: staff.role,
          full_name: nome || staff.nome,
        },
      });

      if (response.error) {
        toast.error(`Erro ao criar login: ${response.error.message}`);
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      // Update profile telefone if different
      if (staff.user_id) {
        await supabase
          .from('profiles')
          .update({ telefone: telefoneDigits })
          .eq('user_id', staff.user_id);
      }
      
      setCreatedCredentials({
        login: telefoneDigits,
        password: senha.trim(),
      });
      
      toast.success("Login criado com sucesso!");
      onSuccess?.();
    } catch (err: any) {
      console.error("Erro ao criar login:", err);
      toast.error("Erro ao criar login");
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
      // Use staff-register Edge Function to update password
      const response = await supabase.functions.invoke('staff-register', {
        body: {
          user_id: staff.user_id,
          evento_id: eventoId,
          telefone: staff.telefone?.replace(/\D/g, '') || telefone.replace(/\D/g, ''),
          senha: novaSenha.trim(),
          role: staff.role,
          full_name: staff.nome,
        },
      });

      if (response.error) {
        toast.error(`Erro ao resetar senha: ${response.error.message}`);
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      setCreatedCredentials({
        login: staff.telefone || '',
        password: novaSenha.trim(),
      });
      
      setShowResetPassword(false);
      toast.success("Senha resetada com sucesso!");
      onSuccess?.();
    } catch (err: any) {
      console.error("Erro ao resetar senha:", err);
      toast.error("Erro ao resetar senha");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNome(staff.nome || "");
    setTelefone(staff.telefone || "");
    setSenha("");
    setNovaSenha("");
    setCreatedCredentials(null);
    setShowResetPassword(false);
    setEditingInfo(false);
    onOpenChange(false);
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
              Anote para enviar ao membro da equipe
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

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Acesse em: <strong>/login/equipe</strong>
              </p>
            </div>

            <Button 
              className="w-full"
              onClick={() => {
                const text = `Login: ${createdCredentials.login}\nSenha: ${createdCredentials.password}\n\nAcesse: /login/equipe`;
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
            Gerenciar {staff.role === 'supervisor' ? 'Supervisor' : 'Operador'}
          </DialogTitle>
          <DialogDescription>
            {staff.nome}
          </DialogDescription>
        </DialogHeader>

        {/* Seção de edição de informações */}
        {!editingInfo ? (
          <div className="space-y-3">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{staff.nome}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="font-mono">{staff.telefone || 'Não definido'}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setEditingInfo(true)}
            >
              <User className="h-4 w-4 mr-2" />
              Editar Informações
            </Button>
          </div>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
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
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNome(staff.nome || "");
                    setTelefone(staff.telefone || "");
                    setEditingInfo(false);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpdateInfo} 
                  disabled={isSubmitting || !nome.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="border-t pt-4 mt-2">
          <p className="text-sm font-medium mb-3">Acesso ao Sistema</p>
          
          {hasLogin ? (
            // Usuário já tem login
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Login ativo
                </p>
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
                  Este membro ainda não possui acesso ao app. Crie um login para ele.
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
