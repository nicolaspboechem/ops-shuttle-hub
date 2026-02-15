

# Reformular App Operador - Shuttle com Ida e Volta

## Fluxo

1. Operador toca **+**, preenche **Nome da viagem** + **PAX de ida** -> viagem criada como ativa (`em_andamento`)
2. Viagem aparece na lista de **ativas** na aba principal
3. Quando shuttle volta, operador toca **Encerrar** -> abre modal pedindo **PAX de volta**
4. Confirma -> viagem vai para historico com ida e volta registrados

## Arquivos alterados

| Arquivo | Acao |
|---------|------|
| `src/components/app/CreateShuttleForm.tsx` | Adicionar campo "Nome da viagem" (salvo em `coordenador`). Criar como `em_andamento` com `encerrado: false` |
| `src/components/app/ShuttleCardOperador.tsx` | **NOVO** - Card de viagem ativa com nome, PAX ida, hora, botao "Encerrar" |
| `src/components/app/ShuttleEncerrarModal.tsx` | **NOVO** - Drawer para encerrar: campo PAX de volta + confirmar |
| `src/pages/app/AppOperador.tsx` | Separar viagens em ativas vs encerradas. Viagens ativas usam `ShuttleCardOperador`. Encerradas usam card simples existente. Mostrar nome da viagem nos cards |
| `src/components/app/OperadorHistoricoTab.tsx` | Somar `qtd_pax_retorno` no resumo de PAX total |

## Detalhes tecnicos

### CreateShuttleForm - novo insert

```text
{
  evento_id, tipo_operacao: 'shuttle', motorista: 'Shuttle',
  coordenador: nomeViagem,          // campo existente no banco
  status: 'em_andamento',           // antes era 'encerrado'
  encerrado: false,                 // antes era true
  qtd_pax: Number(qtdPax),
  h_inicio_real: agora,
  criado_por: userId
}
```

### ShuttleEncerrarModal - update direto

```text
supabase.from('viagens').update({
  status: 'encerrado',
  encerrado: true,
  qtd_pax_retorno: paxRetorno,
  h_fim_real: agora,
  finalizado_por: userId
}).eq('id', viagem.id)
```

### Separacao no AppOperador

```text
const viagensAtivas = viagens.filter(v => !v.encerrado && v.status !== 'cancelado');
const viagensEncerradas = viagens.filter(v => v.encerrado || v.status === 'encerrado');
```

### Campos do banco utilizados (todos ja existem, sem migracao)

- `coordenador` - nome/label da viagem
- `qtd_pax` - PAX de ida
- `qtd_pax_retorno` - PAX de volta (preenchido ao encerrar)
- `status` - lifecycle
- `h_inicio_real` / `h_fim_real` - timestamps

