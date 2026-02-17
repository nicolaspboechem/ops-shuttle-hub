

# Atualizar Versao e Remover Virada do Dia do Modal

## Resumo

Duas alteracoes:
1. Remover a secao "Finalizacao Diaria (Virada do Dia)" da aba Periodo do modal Editar Evento
2. Atualizar a versao do app para 2.0.1

## Alteracoes

### 1. `src/components/eventos/EditEventoModal.tsx`

- Remover o state `horarioVirada` e seu useEffect correspondente
- Remover `horario_virada_dia` do objeto `updateData` no `handleSave`
- Remover o import do icone `Clock` (se nao usado em outro lugar)
- Remover o bloco inteiro da "Finalizacao Diaria" na aba Periodo (o `div` com classe `p-4 rounded-lg border bg-muted/30` que contem o input de time, a lista de bullets e as descricoes)

O campo `horario_virada_dia` continua existindo no banco e sendo usado pela edge function `auto-checkout` -- apenas deixa de ser editavel por este modal.

### 2. `src/lib/version.ts`

- `APP_VERSION`: de `'2.0.0'` para `'2.0.1'`
- `APP_BUILD_DATE`: de `'2026-02-15'` para `'2026-02-17'`

## Mensagem de Atualizacao

Apos publicar, enviar para a equipe:

---

**Atualizacao CCO AS Brasil - v2.0.1**

Pessoal, atualizem o app no celular: basta **atualizar a pagina** do navegador e limpar o cache.

Correcoes nesta versao:
- Correcao na exibicao do nome do supervisor
- Melhoria na identificacao dos veiculos (nome + placa)
- Correcao de travamento nos menus laterais
- Sidebar interna agora fica fixa corretamente
- Remocao de opcao de virada do dia (campo interno)

**Como atualizar:** feche a aba do navegador, abra novamente e, se necessario, limpe o cache (Configuracoes > Dados de navegacao > Limpar).

---

