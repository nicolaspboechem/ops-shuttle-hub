import { Car, Bus, Radio, MapPin, Eye, UserCheck, Clock, HelpCircle, ChevronRight, ArrowRight, Users, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Suporte() {
  return (
    <MainLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary" />
            Central de Suporte
          </h1>
          <p className="text-muted-foreground mt-2">
            Guia completo de operações do CCO - Centro de Controle Operacional
          </p>
        </div>

        <Tabs defaultValue="operacoes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inicio">Início Rápido</TabsTrigger>
            <TabsTrigger value="operacoes">Tipos de Operação</TabsTrigger>
            <TabsTrigger value="glossario">Glossário</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>

          {/* Tab: Início Rápido */}
          <TabsContent value="inicio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fluxo Operacional</CardTitle>
                <CardDescription>Passos para iniciar uma operação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <span className="font-medium">1. Criar Evento</span>
                    <span className="text-xs text-muted-foreground mt-1">Nome, tipo e datas</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <span className="font-medium">2. Cadastrar Equipe</span>
                    <span className="text-xs text-muted-foreground mt-1">Motoristas e veículos</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <span className="font-medium">3. Configurar Rotas</span>
                    <span className="text-xs text-muted-foreground mt-1">Pontos e horários</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    </div>
                    <span className="font-medium">4. Operar</span>
                    <span className="text-xs text-muted-foreground mt-1">Monitorar em tempo real</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mt-6 text-muted-foreground">
                  <ArrowRight className="w-4 h-4" />
                  <span className="text-sm">Cada etapa desbloqueia a próxima</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-600" />
                    Painel Público (/painel)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Interface para <strong>passageiros</strong> visualizarem rotas de Shuttle.</p>
                  <p className="mt-2">Exibe grade de horários, próximas saídas e pontos de embarque.</p>
                  <Badge variant="outline" className="mt-3 bg-green-50 text-green-700 border-green-200">
                    Apenas Shuttle
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    Localizador (/localizador)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Painel TV para <strong>supervisores</strong> acompanharem localização dos motoristas.</p>
                  <p className="mt-2">Kanban por localização com atualização automática.</p>
                  <Badge variant="outline" className="mt-3 bg-purple-50 text-purple-700 border-purple-200">
                    Apenas Missões
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Tipos de Operação */}
          <TabsContent value="operacoes" className="space-y-6">
            {/* Shuttle */}
            <Card className="border-green-200">
              <CardHeader className="bg-green-50/50 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-green-900">
                  <Bus className="w-6 h-6 text-green-600" />
                  Shuttle (Circular)
                </CardTitle>
                <CardDescription className="text-green-700">
                  Rotas fixas com grade de horários
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Transporte em massa entre pontos definidos. O veículo circula em intervalos 
                  regulares e o passageiro se adapta ao horário do transporte.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Quem inicia a viagem?</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="w-4 h-4" />
                      <span>Motorista ou Operador criam e iniciam</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Quem define o horário?</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="w-4 h-4" />
                      <span>Grade fixa (a cada X minutos)</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <XCircle className="w-3 h-3 mr-1" />
                    Não precisa de Check-in
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    APARECE no Painel Público
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <XCircle className="w-3 h-3 mr-1" />
                    Não aparece no Localizador
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Missões */}
            <Card className="border-purple-200">
              <CardHeader className="bg-purple-50/50 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-purple-900">
                  <Radio className="w-6 h-6 text-purple-600" />
                  Missões (Staff)
                </CardTitle>
                <CardDescription className="text-purple-700">
                  Designações internas pelo CCO
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tarefas designadas em tempo real pelo CCO para motoristas disponíveis.
                  Motoristas precisam fazer check-in para ficar visíveis e podem aceitar ou 
                  recusar as missões atribuídas.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Quem inicia a viagem?</h4>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">1</span>
                        <span>CCO designa a missão</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">2</span>
                        <span>Motorista aceita ou recusa</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">3</span>
                        <span>Motorista inicia a viagem</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Quem define o horário?</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="w-4 h-4" />
                      <span>CCO (Centro de Controle)</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    PRECISA de Check-in/Vistoria
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <XCircle className="w-3 h-3 mr-1" />
                    Não aparece no Painel Público
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    APARECE no Localizador
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Comparativo Rápido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Característica</th>
                        <th className="text-center py-3 px-4">
                          <span className="flex items-center justify-center gap-2">
                            <Bus className="w-4 h-4 text-green-600" />
                            Shuttle
                          </span>
                        </th>
                        <th className="text-center py-3 px-4">
                          <span className="flex items-center justify-center gap-2">
                            <Radio className="w-4 h-4 text-purple-600" />
                            Missão
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Check-in/Vistoria</td>
                        <td className="text-center py-3 px-4"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                        <td className="text-center py-3 px-4"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Painel Público</td>
                        <td className="text-center py-3 px-4"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                        <td className="text-center py-3 px-4"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Localizador</td>
                        <td className="text-center py-3 px-4"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                        <td className="text-center py-3 px-4"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Quem inicia</td>
                        <td className="text-center py-3 px-4 text-xs">Motorista/Operador</td>
                        <td className="text-center py-3 px-4 text-xs">CCO → Motorista</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">Horário</td>
                        <td className="text-center py-3 px-4 text-xs">Grade fixa</td>
                        <td className="text-center py-3 px-4 text-xs">CCO define</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Glossário */}
          <TabsContent value="glossario" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Glossário de Termos</CardTitle>
                <CardDescription>Definições dos principais termos utilizados no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium">PAX</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Passageiros. Termo utilizado em transporte para quantificar pessoas transportadas.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium">Dia Operacional</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Período de 24h que pode cruzar meia-noite. Definido pelo "Horário de Virada do Dia" 
                      configurado no evento. Por exemplo, se virada é 04:00, uma viagem às 02:00 do dia 14 
                      será contabilizada como dia 13.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium">Check-in</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Registro de entrada do motorista no turno. Confirma presença e disponibilidade 
                      para receber missões. Vincula o veículo atribuído ao motorista.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium">Vistoria</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Inspeção visual do veículo antes do início das atividades. Registra condições, 
                      avarias e nível de combustível.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium">Missão</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tarefa designada pelo CCO para um motorista específico. Contém ponto de origem, 
                      destino e horário previsto. O motorista pode aceitar ou recusar.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium">CCO</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Centro de Controle Operacional. Interface administrativa para gerenciar toda a 
                      operação de transporte em tempo real.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium">Ponto de Embarque</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Local definido onde passageiros aguardam o transporte. Pode ser hotel, aeroporto, 
                      local do evento, etc.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: FAQ */}
          <TabsContent value="faq" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Perguntas Frequentes</CardTitle>
                <CardDescription>Dúvidas comuns sobre o sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>
                      Por que meus motoristas não conseguem fazer check-in?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        O check-in só está disponível quando o <strong>Módulo de Missões</strong> está 
                        ativo nas configurações do evento. Acesse as configurações do evento e ative 
                        o módulo de missões. Lembre-se: check-in é exclusivo para operações de Missão, 
                        não é necessário para Transfer ou Shuttle.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>
                      Como configuro rotas de Shuttle?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        Acesse o evento e vá para a aba "Painel Público" &gt; "Rotas". Lá você pode 
                        cadastrar os pontos de embarque e as rotas de shuttle com horários de início, 
                        fim e frequência (a cada quantos minutos).
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>
                      Qual a diferença entre Shuttle e Missão?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground mb-2">
                        <strong>Shuttle:</strong> Transporte circular em rotas pré-definidas com frequência 
                        regular. Aparece no Painel Público e pode ser acompanhado pelos passageiros.
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Missão:</strong> Tarefa designada pelo CCO em tempo real. O motorista 
                        precisa fazer check-in, recebe a missão e decide aceitar ou recusar antes de 
                        iniciar. Ideal para operações internas e staff.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>
                      Por que meu evento não aparece no Painel Público?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        Verifique se: (1) O evento está com status "Ativo", (2) A opção "Visível no 
                        Painel Público" está ativada nas configurações, (3) Existem rotas de Shuttle 
                        cadastradas e ativas. O Painel Público é exclusivo para operações Shuttle.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>
                      Por que meu evento não aparece no Localizador?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        O Localizador exibe apenas eventos com o <strong>Módulo de Missões</strong> 
                        ativo. Acesse as configurações do evento e ative o módulo. Além disso, 
                        motoristas precisam fazer check-in para aparecerem no painel.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-6">
                    <AccordionTrigger>
                      Como vincular um veículo a um motorista?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        Na página de Motoristas, clique no card do motorista e selecione "Vincular 
                        Veículo". Um kanban visual mostrará os veículos disponíveis organizados por 
                        status. Escolha um veículo liberado para vincular.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-7">
                    <AccordionTrigger>
                      O que significa o "Horário de Virada do Dia"?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        Eventos noturnos frequentemente operam após meia-noite. O horário de virada 
                        define quando um novo "dia operacional" começa. Por exemplo, se configurado 
                        para 04:00, uma viagem às 02:00 do dia 14 será contabilizada como dia 13 nos 
                        relatórios e auditorias.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
