import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { User, Phone, Check, ChevronRight, ChevronLeft, KeyRound, Copy, Eye, EyeOff, Radio, ClipboardCheck, Binoculars } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddStaffWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId?: string;
  onSuccess?: () => void;
}

interface CreatedCredentials {
  login: string;
  password: string;
}

type StaffType = 'operador' | 'supervisor' | 'cliente';

export function AddStaffWizard({ open, onOpenChange, eventoId, onSuccess }: AddStaffWizardProps) {
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [staffType, setStaffType] = useState<StaffType>('operador');
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  const handleSubmit = async () => {
    if (!nome.trim() || !telefone.trim() || !senha.trim()) return;
    setIsSubmitting(true);

    try {
      // Generate a UUID for the new staff member (no Supabase Auth)
      const userId = crypto.randomUUID();
      const phoneDigits = telefone.replace(/\D/g, '');

      // Create profile directly in the database
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: nome.trim(),
          telefone: phoneDigits,
          user_type: staffType,
          login_type: 'phone',
        });

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
        if (profileError.code === '23505') {
          toast.error('Telefone já cadastrado — Este número já está vinculado a outro perfil.');
        } else {
          toast.error('Erro ao criar perfil — Não foi possível salvar os dados. Verifique sua conexão.');
        }
        return;
      }

      // Link to event
      const { error: eventoError } = await supabase
        .from('evento_usuarios')
        .insert({
          user_id: userId,
          evento_id: eventoId,
          role: staffType,
        });

      if (eventoError) {
        console.error('Erro ao vincular ao evento:', eventoError);
        toast.error('Erro ao vincular ao evento — Não foi possível associar o usuário. Tente novamente.');
        return;
      }

      // Create credentials via Edge Function
      const response = await supabase.functions.invoke('staff-register', {
        body: {
          user_id: userId,
          evento_id: eventoId,
          telefone: phoneDigits,
          senha: senha.trim(),
          role: staffType,
          full_name: nome.trim(),
        },
      });

      if (response.error) {
        console.error('Erro ao criar credenciais:', response.error);
        const msg = response.error.message?.toLowerCase() || '';
        if (msg.includes('em uso') || msg.includes('duplicate') || msg.includes('já')) {
          toast.error('Telefone já cadastrado — Este número já possui login de outro colaborador.');
        } else {
          toast.error('Falha na criação do login — Não foi possível criar as credenciais. Tente novamente.');
        }
        return;
      }

      setCreatedCredentials({
        login: `+55${phoneDigits}`,
        password: senha.trim(),
      });
      setShowCredentialsModal(true);
      const roleLabel = staffType === 'operador' ? 'Operador' : staffType === 'supervisor' ? 'Supervisor' : 'Cliente';
      toast.success(`${roleLabel} criado com sucesso!`);
    } catch (err: any) {
      console.error("Erro ao criar staff:", err);
      toast.error("Erro de conexão — Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleClose = () => {
    setNome("");
    setTelefone("");
    setStaffType('operador');
    setSenha("");
    setCreatedCredentials(null);
    setShowCredentialsModal(false);
    setStep(1);
    onOpenChange(false);
  };

  const handleCredentialsModalClose = () => {
    setShowCredentialsModal(false);
    onSuccess?.();
    handleClose();
  };

  const canProceedStep1 = nome.trim().length > 0 && telefone.trim().length >= 10;
  const canProceedStep3 = senha.trim().length >= 6;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Adicionar Staff
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step > s
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={cn(
                    "w-8 h-1 rounded-full",
                    step > s ? "bg-emerald-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Dados Básicos */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Dados do Colaborador</h3>
                <p className="text-sm text-muted-foreground">Preencha as informações básicas</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Nome completo"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone (Login) *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="telefone"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este telefone será usado para login no app
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Tipo de Staff */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Tipo de Acesso</h3>
                <p className="text-sm text-muted-foreground">Selecione o papel no evento</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    staffType === 'operador'
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => setStaffType('operador')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center",
                        staffType === 'operador' ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Radio className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">Operador</p>
                         <p className="text-sm text-muted-foreground">
                           Registra viagens shuttle no campo
                         </p>
                      </div>
                      {staffType === 'operador' && <Check className="h-5 w-5 text-primary" />}
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    staffType === 'supervisor'
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => setStaffType('supervisor')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center",
                        staffType === 'supervisor' ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <ClipboardCheck className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">Supervisor</p>
                        <p className="text-sm text-muted-foreground">
                          Vistoria veículos, controla check-in de motoristas
                        </p>
                      </div>
                      {staffType === 'supervisor' && <Check className="h-5 w-5 text-primary" />}
                    </div>
                  </CardContent>
              </Card>

                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    staffType === 'cliente'
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => setStaffType('cliente')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center",
                        staffType === 'cliente' ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Binoculars className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">Cliente</p>
                        <p className="text-sm text-muted-foreground">
                          Visualiza métricas estratégicas e localização (somente leitura)
                        </p>
                      </div>
                      {staffType === 'cliente' && <Check className="h-5 w-5 text-primary" />}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={() => setStep(3)}>
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Senha */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Credenciais de Acesso</h3>
                <p className="text-sm text-muted-foreground">Defina a senha para acesso ao app</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Login (Telefone)</p>
                  <p className="font-mono font-medium">+55{telefone.replace(/\D/g, '')}</p>
                </div>

                <div className="space-y-2">
                  <Label>Senha de Acesso *</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
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
                  {senha.length > 0 && senha.length < 6 && (
                    <p className="text-xs text-destructive">Senha deve ter pelo menos 6 caracteres</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={() => setStep(4)} disabled={!canProceedStep3}>
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Confirmação */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Confirmar Cadastro</h3>
                <p className="text-sm text-muted-foreground">Revise as informações</p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {staffType === 'operador' ? (
                        <Radio className="h-6 w-6 text-primary" />
                      ) : staffType === 'supervisor' ? (
                        <ClipboardCheck className="h-6 w-6 text-primary" />
                      ) : (
                        <Binoculars className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{nome}</p>
                      <p className="text-sm text-muted-foreground capitalize">{staffType}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Telefone</span>
                      <span>{telefone}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Login</span>
                      <span className="font-mono">+55{telefone.replace(/\D/g, '')}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      ✓ {staffType === 'cliente' 
                        ? 'Acesso ao dashboard estratégico (somente leitura)' 
                        : `Acesso ao app de ${staffType === 'operador' ? 'operações' : 'supervisão'}`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Criando..." : "Criar Usuário"}
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Credenciais Criadas */}
        {showCredentialsModal && createdCredentials && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Usuário Criado com Sucesso!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Anote as credenciais para enviar ao colaborador
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
                </div>

                <Button className="w-full" onClick={handleCredentialsModalClose}>
                  Fechar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
