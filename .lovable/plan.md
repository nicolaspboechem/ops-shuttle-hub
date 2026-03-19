
Objetivo: corrigir de forma definitiva a visibilidade do Localizador no app Cliente, app Supervisor e painel CCO, eliminando divergência entre telas e evitando que novos eventos nasçam com o Localizador ligado sem intenção.

O que encontrei
- No app Cliente, a aba só aparece se `evento.habilitar_localizador` vier verdadeiro.
- O problema é que o evento do print (`MOTO GP - 26`, id `c76c5640-6f6c-4553-8fbe-b385cc552c3e`) está hoje no banco com `habilitar_localizador = true`, então a UI cliente está obedecendo o dado salvo.
- A causa raiz não é só renderização: há inconsistência de configuração.
  1. `CreateEventoWizard.tsx` não grava `habilitar_localizador` ao criar evento.
  2. O banco define `habilitar_localizador BOOLEAN DEFAULT true`.
  3. `EditEventoModal.tsx` também não expõe/salva esse campo.
  4. `Configuracoes.tsx` ainda usa fallback `?? true`, reforçando o comportamento permissivo.
  5. Supervisor já foi endurecido com `=== true`, mas Cliente ainda usa checagem truthy simples.

Plano de correção definitiva

1. Centralizar a regra de visibilidade
- Criar uma única função/helper para módulos do evento, por exemplo:
  - `localizadorHabilitado = evento.habilitar_localizador === true`
  - `painelPublicoHabilitado = evento.visivel_publico === true`
- Usar essa regra única em:
  - `src/pages/app/AppCliente.tsx`
  - `src/pages/app/AppSupervisor.tsx`
  - `src/pages/PainelLocalizador.tsx`
  - hooks/listagens públicas relacionadas

2. Corrigir o app Cliente
- Trocar a lógica atual de `availableTabs` para checagem estrita `=== true`.
- Adicionar guarda de navegação igual ao Supervisor:
  - se `activeTab === 'localizador'` e o módulo estiver desligado, redirecionar para `dashboard`.
- Resultado: mesmo acesso manual/estado antigo não mantém a aba aberta.

3. Corrigir a origem do problema nos formulários
- `src/components/eventos/CreateEventoWizard.tsx`
  - adicionar toggle explícito de Localizador
  - persistir `habilitar_localizador` no insert
- `src/components/eventos/EditEventoModal.tsx`
  - adicionar toggle explícito de Localizador
  - persistir `habilitar_localizador` no update
- Isso evita depender só da tela de Configurações para um módulo tão crítico.

4. Ajustar Configurações para comportamento explícito
- `src/pages/Configuracoes.tsx`
  - parar de usar `?? true` para Localizador
  - carregar com `=== true`
  - melhorar o texto do switch para deixar claro o alcance:
    - “Exibir aba Localizador no app Cliente/Supervisor e no painel /localizador”
- Assim o usuário entende exatamente o que será ocultado.

5. Ajustar o padrão de novos eventos
- Criar migration para mudar o default do banco:
  - `habilitar_localizador default false`
- Opcionalmente normalizar registros `NULL` para `false`.
- Não desativar automaticamente eventos já marcados como `true`, para não causar regressão operacional sem intenção.

6. Revisar superfícies do CCO
- Garantir que o `/localizador` só liste eventos com `habilitar_localizador = true`.
- Se alguém abrir `/localizador/:eventoId` manualmente para um evento desabilitado, mostrar estado bloqueado.
- Revisar textos de suporte/ajuda que ainda associam Localizador a outras flags.

Arquivos principais envolvidos
- `src/pages/app/AppCliente.tsx`
- `src/pages/app/AppSupervisor.tsx`
- `src/pages/PainelLocalizador.tsx`
- `src/pages/Configuracoes.tsx`
- `src/components/eventos/CreateEventoWizard.tsx`
- `src/components/eventos/EditEventoModal.tsx`
- `src/hooks/useEventosLocalizador.ts`
- `supabase/migrations/...`

Risco e impacto
- Baixo risco de quebra visual: é ajuste de regra de visibilidade.
- Médio risco funcional: mudar default do banco afeta criação de novos eventos, então precisa ser intencional.
- Alto impacto positivo: elimina o comportamento “ligado por padrão” e impede divergência entre Cliente, Supervisor e CCO.

Validação que vou executar na implementação
- Evento com Localizador desligado:
  - não mostra aba no Cliente desktop/mobile
  - não mostra aba no Supervisor
  - não aparece na lista do `/localizador`
  - acesso direto ao `/localizador/:eventoId` bloqueado
- Evento com Localizador ligado:
  - continua aparecendo normalmente em todos os pontos
- Novo evento:
  - nasce com Localizador no estado definido no formulário e não por default oculto/implícito do banco

Causa real do “por que isso continuou?”
- Porque o dado salvo do evento ainda está `true`, e o sistema hoje espalha essa configuração entre criação, edição, configuração e renderização, sem uma fonte única de verdade. A correção definitiva é centralizar a regra e gravar o campo explicitamente em todos os fluxos relevantes.
