
# Garantir Fuso Horario GMT-3 (Brasilia) em Todo o Sistema

## Problema

O sistema ja possui um mecanismo de sincronizacao de horario (`useServerTime` / `getAgoraSync()`) que retorna a hora correta de Brasilia via RPC `get_server_time()`. Porem, **dezenas de arquivos** ainda usam `new Date()` diretamente, que depende do relogio local do dispositivo do usuario. Se o servidor ou o dispositivo estiver em fuso diferente, os dados ficam dessincronizados.

Existem dois tipos de problema:

1. **Timestamps gravados no banco** com `new Date().toISOString()` -- gravam hora UTC do cliente, que pode divergir do servidor
2. **Calculos de dia operacional** com `getDataOperacional(new Date(), ...)` -- usam hora local do cliente em vez da hora sincronizada

## Estrategia

Criar uma funcao utilitaria `getServerNow()` que retorna um ISO string sincronizado com o servidor, e substituir TODOS os `new Date().toISOString()` e `new Date()` em contextos operacionais por chamadas sincronizadas.

Para hooks que ja tem acesso ao `useServerTime`, usar `getAgoraSync().toISOString()`. Para funcoes que nao tem acesso a hooks (ex: helpers puros), receber o timestamp como parametro.

## Arquivos a Modificar

### Grupo 1: Hooks criticos (gravam timestamps no banco)

| Arquivo | Problema | Correcao |
|---------|----------|----------|
| `src/hooks/useMissoes.ts` | `syncMotoristaAoEncerrarMissao` usa `new Date().toISOString()` (linha 309). `MissaoInstantaneaModal` e `MissaoModal` usam `new Date().toISOString().slice(0,10)` para `data_programada` | Importar e usar `useServerTime` + `getAgoraSync().toISOString()`. Passar `getAgoraSync` para `syncMotoristaAoEncerrarMissao`. Para `data_programada`, usar `getDataOperacional(getAgoraSync(), virada)` |
| `src/hooks/useLocalizadorMotoristas.ts` | Linha 37: `getDataOperacional(new Date(), ...)` | Receber offset como parametro ou usar `useServerTime` e passar `getAgoraSync()` |

### Grupo 2: Paginas que calculam dia operacional com hora local

| Arquivo | Linha | Correcao |
|---------|-------|----------|
| `src/pages/Dashboard.tsx` | 44-45 | `getDataOperacional(getAgoraSync(), ...)` |
| `src/pages/ViagensAtivas.tsx` | 22-23 | `getDataOperacional(getAgoraSync(), ...)` |
| `src/pages/ViagensFinalizadas.tsx` | 22-23 | `getDataOperacional(getAgoraSync(), ...)` |
| `src/pages/app/AppSupervisor.tsx` | 73-74 | `getDataOperacional(getAgoraSync(), ...)` |
| `src/pages/app/AppOperador.tsx` | 72-73 | `getDataOperacional(getAgoraSync(), ...)` |
| `src/components/app/MotoristaHistoricoTab.tsx` | 47 | `getDataOperacional(getAgoraSync(), ...)` |

### Grupo 3: Componentes que gravam timestamps no banco

| Arquivo | Uso | Correcao |
|---------|-----|----------|
| `src/pages/MapaServico.tsx` | `ultima_localizacao_at: new Date().toISOString()` (linhas 346, 405) | Usar `getAgoraSync().toISOString()` |
| `src/components/app/SupervisorFrotaTab.tsx` | `liberado_em` e `ultima_localizacao_at` com `new Date().toISOString()` | Usar `getAgoraSync().toISOString()` |
| `src/components/app/SupervisorLocalizadorTab.tsx` | `ultima_localizacao_at: new Date().toISOString()` | Usar `getAgoraSync().toISOString()` |
| `src/components/app/VeiculoKmModal.tsx` | `km_inicial_data` / `km_final_data` | Usar `getAgoraSync().toISOString()` |
| `src/components/veiculos/CreateVeiculoWizard.tsx` | `inspecao_data`, `liberado_em`, `km_inicial_data` | Usar `getAgoraSync().toISOString()` |
| `src/components/app/VistoriaVeiculoWizard.tsx` | `inspecao_data`, `liberado_em`, `km_inicial_data` | Usar `getAgoraSync().toISOString()` |
| `src/components/viagens/EditViagemModal.tsx` | `data_atualizacao` | Usar `getAgoraSync().toISOString()` |
| `src/hooks/useAlertasFrota.ts` | `resolvido_em` | Usar `getAgoraSync().toISOString()` |

### Grupo 4: Componentes que usam `new Date().toISOString().slice(0,10)` para data

| Arquivo | Correcao |
|---------|----------|
| `src/components/motoristas/MissaoInstantaneaModal.tsx` | Usar dia operacional sincronizado |
| `src/components/motoristas/MissaoModal.tsx` | Usar dia operacional sincronizado |
| `src/components/motoristas/MissaoCard.tsx` | Comparar com dia operacional sincronizado |
| `src/components/motoristas/MissoesPanel.tsx` | Filtro de data default sincronizado |

### Grupo 5: Edge Functions (ja corretas)

As edge functions (`close-open-trips`, `auto-checkout`, `sync-data`) ja usam `supabase.rpc('get_server_time')` como fonte de verdade. Nenhuma alteracao necessaria.

## Detalhes Tecnicos

### Padrao para hooks (tem acesso a React)

```text
// Dentro do hook ou componente:
const { getAgoraSync } = useServerTime();

// Gravar timestamp:
const now = getAgoraSync().toISOString();

// Calcular dia operacional:
const dataOp = getDataOperacional(getAgoraSync(), horarioVirada);
```

### Padrao para funcoes que recebem como parametro

```text
// syncMotoristaAoEncerrarMissao recebe timestamp sincronizado
const syncMotoristaAoEncerrarMissao = async (missao: Missao, nowISO: string) => {
  // Usa nowISO em vez de new Date().toISOString()
};

// Chamada:
const now = getAgoraSync().toISOString();
await syncMotoristaAoEncerrarMissao(missao, now);
```

### Padrao para useState inicial

Como `useServerTime` pode ainda estar carregando no primeiro render, usar `new Date()` como fallback inicial e atualizar via `useEffect` quando o offset estiver pronto:

```text
const { getAgoraSync, loading: timeLoading } = useServerTime();
const [dataOperacional, setDataOperacional] = useState<string>(() => 
  getDataOperacional(new Date(), '04:00') // fallback inicial
);

useEffect(() => {
  if (!timeLoading && evento?.horario_virada_dia) {
    setDataOperacional(getDataOperacional(getAgoraSync(), evento.horario_virada_dia));
  }
}, [timeLoading, evento?.horario_virada_dia, getAgoraSync]);
```

## Resultado

- TODOS os timestamps gravados no banco usarao hora sincronizada de Brasilia
- TODOS os calculos de dia operacional usarao hora sincronizada
- Edge functions continuam usando `get_server_time()` do banco (ja corretas)
- Dispositivos em fusos diferentes (ex: servidor em UTC, celular em GMT+1) produzirao dados consistentes com America/Sao_Paulo
