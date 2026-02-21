

# Diagnóstico: Missões do Supervisor nao aparecem no App do Motorista

## Problema Identificado

Após investigacao detalhada do codigo, foram encontrados **dois problemas** que podem causar o comportamento relatado:

---

## Problema 1: Horario de virada hardcoded (causa principal em horarios de borda)

O `MissaoInstantaneaModal` e o `MissaoDeslocamentoModal` usam `'04:00'` fixo para calcular o dia operacional ao salvar a missao:

```text
data_programada: getDataOperacional(agora, '04:00')   // hardcoded
```

Porem o evento Rio Open 2026 tem `horario_virada_dia = '04:50:00'`. O app do motorista usa o horario real do evento para calcular `dataOperacional` e filtrar missoes:

```text
(!m.data_programada || m.data_programada === dataOperacional)
```

Entre 04:00 e 04:50, o Supervisor calcula um dia operacional **diferente** do Motorista, e a missao fica invisivel.

**Arquivos afetados:**
- `src/components/motoristas/MissaoInstantaneaModal.tsx` (linha 91)
- `src/components/motoristas/MissaoDeslocamentoModal.tsx` (linha 96)
- `src/components/motoristas/MissaoModal.tsx` (linhas 73, 88, 98)
- `src/components/motoristas/MissoesPanel.tsx` (linhas 58, 124, 190, 193)
- `src/components/motoristas/MissaoCard.tsx` (linha 153)

**Correcao:** Todos esses componentes precisam receber o `horario_virada_dia` do evento como prop em vez de usar `'04:00'` hardcoded.

---

## Problema 2: Realtime pode nao disparar para o motorista

O app do motorista depende de Supabase Realtime para detectar novas missoes em tempo real. O canal esta configurado corretamente (`missoes-motorista-${motoristaId}` com filtro `motorista_id=eq.${motoristaId}`), mas:

- Se o Realtime falhar silenciosamente (limite de conexoes, rede instavel), o motorista so vera novas missoes ao fazer pull-to-refresh manualmente
- Nao existe fallback de polling no hook `useMissoesPorMotorista`

**Correcao:** Adicionar um polling de fallback (intervalo de 30s) como rede de seguranca.

---

## Plano de Implementacao

### Etapa 1 - Corrigir horario de virada hardcoded

1. **MissaoInstantaneaModal** e **MissaoDeslocamentoModal**: adicionar prop `horarioVirada?: string` e usar no lugar de `'04:00'`
2. **MissaoModal**: mesma correcao
3. **MissoesPanel**: receber `horarioVirada` do evento pai
4. **MissaoCard**: receber `horarioVirada` para exibicao correta de "Hoje"
5. **AppSupervisor**: passar `evento.horario_virada_dia` para os modais de missao
6. **MissoesPanel (CCO)**: buscar `horario_virada_dia` do evento e propagar

### Etapa 2 - Adicionar polling de fallback no app do motorista

1. No hook `useMissoesPorMotorista`, adicionar um `setInterval` de 30 segundos que chama `fetchMissoes()` como rede de seguranca caso o Realtime falhe
2. Limpar o interval no cleanup do useEffect

### Resumo tecnico das alteracoes

| Arquivo | Alteracao |
|---|---|
| `MissaoInstantaneaModal.tsx` | Adicionar prop `horarioVirada`, usar em `getDataOperacional` |
| `MissaoDeslocamentoModal.tsx` | Adicionar prop `horarioVirada`, usar em `getDataOperacional` |
| `MissaoModal.tsx` | Adicionar prop `horarioVirada`, usar em `getDataOperacional` |
| `MissoesPanel.tsx` | Receber e propagar `horarioVirada` do evento |
| `MissaoCard.tsx` | Receber `horarioVirada` para label "Hoje" |
| `AppSupervisor.tsx` | Passar `horarioVirada` nos modais de missao |
| `useMissoes.ts` | Adicionar polling fallback de 30s em `useMissoesPorMotorista` |

