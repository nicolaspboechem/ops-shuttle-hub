
# Backup Instantaneo - Remover Delay

## Problema

O botao "Backup" no card do Mapa de Servico atualiza o Supabase e depois espera o Realtime propagar a mudanca de volta -- isso causa um delay visivel de 1-3 segundos ate o badge BACKUP aparecer/desaparecer.

## Solucao: Estado Otimista Local

### `src/components/mapa-servico/MapaServicoCard.tsx`

Adicionar um estado local `optimisticBackup` que reflete imediatamente a acao do usuario:

1. Criar `const [optimisticBackup, setOptimisticBackup] = useState<boolean | null>(null)` -- `null` significa "usar valor real"
2. Calcular `const isBackupActive = optimisticBackup ?? backup` para decidir o visual
3. No `handleToggleBackup`:
   - **Antes** do await: `setOptimisticBackup(!backup)` -- UI muda instantaneamente
   - **Apos** o await com sucesso: manter o valor (o realtime eventualmente sincroniza)
   - **Em caso de erro**: `setOptimisticBackup(null)` -- reverte para o valor real
4. Quando `motorista.veiculo` mudar (dados reais do realtime chegarem), resetar o otimista: adicionar `useEffect` que faz `setOptimisticBackup(null)` quando `motorista.veiculo?.observacoes_gerais` mudar
5. Usar `isBackupActive` em todos os lugares onde `backup` e usado (badge, botao, borda)

### Sobre o Localizador

O `LocalizadorCard` nao tem botao de toggle -- apenas exibe o badge. Ele ja atualiza quando o realtime do Mapa de Servico propaga. Nao precisa de mudanca.

## Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `src/components/mapa-servico/MapaServicoCard.tsx` | Estado otimista para backup toggle -- UI atualiza instantaneamente ao clicar |

## Resultado

Ao clicar "Backup" ou "Remover Backup", o badge e o botao mudam imediatamente, sem esperar a resposta do servidor. Se houver erro, o estado reverte automaticamente.
