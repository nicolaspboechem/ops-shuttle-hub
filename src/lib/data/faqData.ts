import { 
  LogIn, 
  Car, 
  MapPin, 
  RefreshCw, 
  Settings, 
  Users, 
  Gauge,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  FileText,
  Shield,
  Smartphone
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface FAQSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: FAQItem[];
}

export type FAQRole = 'admin' | 'motorista' | 'operador' | 'supervisor' | 'cliente';

// FAQ para Motoristas
const motoristaFAQ: FAQSection[] = [
  {
    id: 'login',
    title: 'Login e Acesso',
    icon: LogIn,
    items: [
      {
        id: 'esqueci-senha',
        question: 'Esqueci minha senha',
        answer: 'Entre em contato com o Operador ou Supervisor do seu evento para solicitar o reset da sua senha. Eles podem fazer isso pela tela de Equipe.',
        keywords: ['senha', 'login', 'esqueci', 'acesso']
      },
      {
        id: 'login-erro',
        question: 'Meu login não funciona',
        answer: '1. Verifique se está usando o telefone correto (com DDD)\n2. Confirme que a senha está correta\n3. Certifique-se de estar no evento certo\n4. Se persistir, peça ao Operador para resetar sua senha',
        keywords: ['login', 'erro', 'não funciona', 'acesso']
      }
    ]
  },
  {
    id: 'checkin',
    title: 'Check-in e Vistoria',
    icon: CheckCircle2,
    items: [
      {
        id: 'como-checkin',
        question: 'Como fazer check-in?',
        answer: 'Na tela inicial, toque no card de Check-in. Se o módulo de missões estiver ativo, você precisará vincular um veículo e pode ser necessário realizar uma vistoria antes de começar.',
        keywords: ['checkin', 'check-in', 'começar', 'iniciar']
      },
      {
        id: 'checkin-nao-aparece',
        question: 'O botão de check-in não aparece',
        answer: 'O check-in só está disponível quando o módulo de Missões está ativado no evento. Se não aparecer, o evento usa outro tipo de operação (Shuttle) que não exige check-in.',
        keywords: ['checkin', 'não aparece', 'botão', 'sumiu']
      },
      {
        id: 'vistoria-obrigatoria',
        question: 'Por que preciso fazer vistoria?',
        answer: 'A vistoria documenta as condições do veículo antes de você usá-lo. Isso protege você e a empresa, registrando qualquer avaria pré-existente.',
        keywords: ['vistoria', 'obrigatória', 'fotos', 'veículo']
      }
    ]
  },
  {
    id: 'viagens',
    title: 'Viagens e Missões',
    icon: Car,
    items: [
      {
        id: 'iniciar-viagem',
        question: 'Como iniciar uma viagem?',
        answer: 'Deslize o card da viagem para a direita para iniciar rapidamente, ou toque no card e use o botão "Iniciar". Para missões, primeiro aceite e depois inicie.',
        keywords: ['iniciar', 'viagem', 'começar', 'swipe']
      },
      {
        id: 'viagem-nao-aparece',
        question: 'Minha viagem não aparece',
        answer: '1. Puxe a tela para baixo para atualizar\n2. Verifique se fez check-in (se necessário)\n3. Confirme que a viagem foi designada para você\n4. Verifique se não está na aba de Histórico (já finalizada)',
        keywords: ['viagem', 'não aparece', 'sumiu', 'onde']
      },
      {
        id: 'cancelar-viagem',
        question: 'Preciso cancelar uma viagem',
        answer: 'Motoristas não podem cancelar viagens diretamente. Entre em contato com o Operador ou CCO pelo rádio/telefone para solicitar o cancelamento.',
        keywords: ['cancelar', 'viagem', 'desistir']
      },
      {
        id: 'missao-recusar',
        question: 'Posso recusar uma missão?',
        answer: 'Sim, você pode recusar missões pendentes. Mas lembre-se: recusar muitas missões pode impactar sua avaliação. Se tiver um motivo válido, comunique ao CCO.',
        keywords: ['recusar', 'missão', 'negar']
      }
    ]
  },
  {
    id: 'problemas',
    title: 'Problemas Técnicos',
    icon: RefreshCw,
    items: [
      {
        id: 'app-travando',
        question: 'O app está travando',
        answer: '1. Feche o app completamente e abra novamente\n2. Verifique sua conexão com internet\n3. Limpe o cache do navegador\n4. Se persistir, tente em outro navegador',
        keywords: ['travando', 'lento', 'erro', 'bug']
      },
      {
        id: 'dados-desatualizados',
        question: 'Dados não atualizam',
        answer: 'Puxe a tela para baixo para forçar atualização. Se ainda não funcionar, verifique sua conexão com internet ou recarregue a página completamente.',
        keywords: ['atualizar', 'desatualizado', 'antigo']
      }
    ]
  }
];

// FAQ para Operadores
const operadorFAQ: FAQSection[] = [
  {
    id: 'viagens',
    title: 'Gerenciar Viagens',
    icon: Car,
    items: [
      {
        id: 'criar-viagem',
        question: 'Como criar uma viagem?',
        answer: 'Toque no botão + na barra inferior. Preencha origem, destino, motorista e demais informações. A viagem será criada como "Agendada" e poderá ser iniciada pelo motorista ou por você.',
        keywords: ['criar', 'nova', 'viagem', 'adicionar']
      },
      {
        id: 'editar-viagem',
        question: 'Como editar uma viagem?',
        answer: 'Toque no card da viagem para abrir o modal de edição. Você pode alterar origem, destino, motorista e outras informações enquanto a viagem não estiver encerrada.',
        keywords: ['editar', 'alterar', 'modificar', 'viagem']
      },
      {
        id: 'motorista-nao-aparece',
        question: 'Motorista não aparece na lista',
        answer: '1. Verifique se o motorista está cadastrado neste evento\n2. Confirme se o motorista está ativo\n3. Se necessário, cadastre o motorista pela aba "Mais" > "Cadastrar Motorista"',
        keywords: ['motorista', 'não aparece', 'lista', 'cadastro']
      }
    ]
  },
  {
    id: 'status',
    title: 'Status e Filtros',
    icon: ClipboardList,
    items: [
      {
        id: 'filtrar-status',
        question: 'Como filtrar por status?',
        answer: 'Toque nos cards coloridos no topo da tela (Agendadas, Em Andamento, etc.) para filtrar as viagens. Toque novamente para remover o filtro.',
        keywords: ['filtrar', 'status', 'buscar']
      },
      {
        id: 'acoes-rapidas',
        question: 'Como usar ações rápidas?',
        answer: 'Deslize os cards para a direita ou esquerda para acessar ações rápidas como iniciar, finalizar ou editar viagens sem precisar abrir o modal completo.',
        keywords: ['swipe', 'deslizar', 'ações', 'rápidas']
      }
    ]
  },
  {
    id: 'cadastros',
    title: 'Cadastros',
    icon: Users,
    items: [
      {
        id: 'cadastrar-motorista',
        question: 'Como cadastrar um motorista?',
        answer: 'Vá em "Mais" > "Cadastrar Motorista". Preencha nome e telefone. O motorista poderá fazer login usando o telefone cadastrado.',
        keywords: ['cadastrar', 'motorista', 'novo']
      },
      {
        id: 'cadastrar-veiculo',
        question: 'Como cadastrar um veículo?',
        answer: 'Vá em "Mais" > "Cadastrar Veículo". Informe placa, tipo e demais dados. O veículo ficará disponível para vinculação aos motoristas.',
        keywords: ['cadastrar', 'veículo', 'carro', 'van']
      }
    ]
  }
];

// FAQ para Supervisores
const supervisorFAQ: FAQSection[] = [
  {
    id: 'frota',
    title: 'Gerenciar Frota',
    icon: Car,
    items: [
      {
        id: 'vincular-veiculo',
        question: 'Como vincular veículo a motorista?',
        answer: 'Na aba de Frota ou Motoristas, deslize o card para a esquerda e use a opção "Vincular Veículo". Selecione o veículo na lista de disponíveis.',
        keywords: ['vincular', 'veículo', 'motorista', 'atribuir']
      },
      {
        id: 'liberar-veiculo',
        question: 'Como liberar um veículo para operação?',
        answer: 'Na aba de Frota, localize o veículo e realize a vistoria de liberação. Após aprovada, o veículo ficará com status "Liberado" e poderá ser utilizado.',
        keywords: ['liberar', 'veículo', 'vistoria', 'disponível']
      },
      {
        id: 'registrar-km',
        question: 'Como registrar KM do veículo?',
        answer: 'Vá em "Mais" > "Registrar KM". Selecione o veículo e informe a quilometragem atual. Isso é importante para controle de uso e manutenção.',
        keywords: ['km', 'quilometragem', 'registrar', 'odômetro']
      }
    ]
  },
  {
    id: 'localizacao',
    title: 'Localização',
    icon: MapPin,
    items: [
      {
        id: 'motorista-localizador',
        question: 'Motorista não aparece no localizador',
        answer: 'O motorista precisa ter feito check-in no dia para aparecer no localizador. Verifique se o módulo de missões está ativo e se o motorista iniciou sua jornada.',
        keywords: ['localizador', 'não aparece', 'onde', 'motorista']
      },
      {
        id: 'editar-localizacao',
        question: 'Como editar localização de motorista?',
        answer: 'Deslize o card do motorista e use "Editar Local". Selecione o novo ponto de localização. Isso é útil quando o motorista muda de posição sem viagem.',
        keywords: ['editar', 'localização', 'ponto', 'posição']
      }
    ]
  },
  {
    id: 'viagens',
    title: 'Viagens',
    icon: ClipboardList,
    items: [
      {
        id: 'criar-viagem-supervisor',
        question: 'Como criar uma viagem?',
        answer: 'Use o botão + na barra inferior. Como Supervisor, você tem acesso a criar viagens para qualquer motorista do evento.',
        keywords: ['criar', 'viagem', 'nova']
      },
      {
        id: 'monitorar-viagens',
        question: 'Como monitorar viagens ativas?',
        answer: 'A aba de Viagens mostra todas as viagens do evento. Use os filtros de status para ver apenas as ativas, em andamento ou encerradas.',
        keywords: ['monitorar', 'acompanhar', 'viagens', 'ativas']
      }
    ]
  }
];

// FAQ para Admin (CCO)
const adminFAQ: FAQSection[] = [
  {
    id: 'eventos',
    title: 'Gerenciar Eventos',
    icon: Calendar,
    items: [
      {
        id: 'criar-evento',
        question: 'Como criar um evento?',
        answer: 'Vá em "Eventos" no menu lateral e clique em "Criar Evento". Defina nome, tipo de operação, datas e módulos que deseja ativar.',
        keywords: ['criar', 'evento', 'novo', 'operação']
      },
      {
        id: 'configurar-modulos',
        question: 'Como configurar módulos do evento?',
        answer: 'Dentro do evento, vá em "Configurações". Ative/desative módulos como: Painel Público (Shuttle), Localizador (Missões), Missões (Check-in obrigatório).',
        keywords: ['módulos', 'configurar', 'ativar', 'desativar']
      },
      {
        id: 'evento-nao-publico',
        question: 'Evento não aparece no painel público',
        answer: 'Verifique nas Configurações do evento se "Visível Publicamente" está ativado. Também confirme que o evento está com status "Ativo".',
        keywords: ['público', 'painel', 'não aparece', 'visível']
      }
    ]
  },
  {
    id: 'equipe',
    title: 'Gerenciar Equipe',
    icon: Users,
    items: [
      {
        id: 'cadastrar-equipe',
        question: 'Como cadastrar equipe?',
        answer: 'Vá em "Equipe" dentro do evento. Use "Adicionar Motorista" para motoristas ou "Adicionar Membro" para Operadores e Supervisores.',
        keywords: ['cadastrar', 'equipe', 'motorista', 'operador']
      },
      {
        id: 'resetar-senha',
        question: 'Como resetar senha de usuário?',
        answer: 'Em "Equipe", localize o usuário, clique no menu (3 pontos) e selecione "Editar Acesso" ou "Resetar Senha". Uma nova senha será gerada.',
        keywords: ['senha', 'resetar', 'esqueceu', 'acesso']
      },
      {
        id: 'desativar-usuario',
        question: 'Como desativar um usuário?',
        answer: 'Na lista de equipe, edite o usuário e marque como "Inativo". Ele não conseguirá mais fazer login, mas os dados históricos são mantidos.',
        keywords: ['desativar', 'remover', 'bloquear', 'usuário']
      }
    ]
  },
  {
    id: 'operacao',
    title: 'Operação',
    icon: Gauge,
    items: [
      {
        id: 'dia-operacional',
        question: 'O que é dia operacional?',
        answer: 'O dia operacional pode diferir do dia do calendário. Configure em "Configurações" o horário de virada (ex: 04:00). Viagens após esse horário contam para o próximo dia.',
        keywords: ['dia', 'operacional', 'virada', 'horário']
      },
      {
        id: 'checkin-nao-funciona',
        question: 'Motoristas não conseguem fazer check-in',
        answer: '1. Verifique se o módulo de Missões está ativo\n2. Confirme que o motorista tem veículo atribuído\n3. Certifique-se que o motorista está cadastrado no evento',
        keywords: ['checkin', 'não funciona', 'erro', 'motorista']
      },
      {
        id: 'alertas-atraso',
        question: 'Como configurar alertas de atraso?',
        answer: 'Em "Configurações", defina os limiares de alerta (amarelo e vermelho). Viagens que ultrapassarem esses tempos aparecerão destacadas no painel.',
        keywords: ['alerta', 'atraso', 'tempo', 'configurar']
      }
    ]
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    icon: FileText,
    items: [
      {
        id: 'exportar-dados',
        question: 'Como exportar dados?',
        answer: 'Em cada seção (Viagens, Motoristas, etc.), procure o botão de exportação. Você pode baixar em Excel ou CSV os dados filtrados na tela.',
        keywords: ['exportar', 'download', 'excel', 'relatório']
      },
      {
        id: 'metricas-dashboard',
        question: 'Entendendo as métricas do dashboard',
        answer: 'O Dashboard mostra: viagens ativas, motoristas online (com check-in), veículos liberados e tempo médio. Os gráficos mostram a distribuição ao longo do tempo.',
        keywords: ['métricas', 'dashboard', 'números', 'estatísticas']
      },
      {
        id: 'historico-presenca',
        question: 'Onde ver histórico de presença?',
        answer: 'Vá em "Auditoria" > "Motoristas". Você verá o histórico de check-ins e check-outs de cada motorista por data.',
        keywords: ['presença', 'histórico', 'checkin', 'auditoria']
      }
    ]
  }
];

// FAQ para Clientes
const clienteFAQ: FAQSection[] = [
  {
    id: 'visualizacao',
    title: 'Visualização',
    icon: Eye,
    items: [
      {
        id: 'dashboard-cliente',
        question: 'O que vejo no Dashboard?',
        answer: 'O Dashboard mostra métricas em tempo real da operação: viagens ativas, motoristas disponíveis e veículos em uso. Os dados atualizam automaticamente.',
        keywords: ['dashboard', 'métricas', 'visualizar']
      },
      {
        id: 'localizador-cliente',
        question: 'Como funciona o Localizador?',
        answer: 'O Localizador mostra onde estão os motoristas em tempo real, organizados por ponto de localização. Útil para coordenação de equipe.',
        keywords: ['localizador', 'onde', 'motoristas']
      }
    ]
  },
  {
    id: 'problemas',
    title: 'Problemas',
    icon: RefreshCw,
    items: [
      {
        id: 'dados-cliente-desatualizados',
        question: 'Dados não atualizam',
        answer: 'Puxe a tela para baixo para atualizar ou use o botão de refresh. Os dados atualizam automaticamente a cada poucos segundos quando há conexão.',
        keywords: ['atualizar', 'desatualizado', 'refresh']
      }
    ]
  }
];

// Exportar FAQ por papel
export const faqByRole: Record<FAQRole, FAQSection[]> = {
  admin: adminFAQ,
  motorista: motoristaFAQ,
  operador: operadorFAQ,
  supervisor: supervisorFAQ,
  cliente: clienteFAQ
};

// Labels amigáveis para cada papel
export const roleLabels: Record<FAQRole, string> = {
  admin: 'Administrador',
  motorista: 'Motorista',
  operador: 'Operador',
  supervisor: 'Supervisor',
  cliente: 'Cliente'
};
