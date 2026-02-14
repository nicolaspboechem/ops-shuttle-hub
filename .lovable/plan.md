

# Adicionar Historico de Viagens na aba "Hist. Uso" do VeiculoDetalheModal

## Problema

A aba "Hist. Uso" consulta apenas a tabela `motorista_presenca` (check-in/check-out). Veiculos que foram usados em viagens sem que o motorista fizesse check-in formal nao aparecem no historico. Exemplo: o veiculo "15 - TCROSS CINZA" (TDH0A30) tem 3 viagens encerradas com Cacia Lima, mas zero registros de presenca.

Dos ~60 veiculos do evento, pelo menos 23 tem viagens mas nenhuma presenca registrada.

## Solucao

Adicionar uma segunda query na aba "Hist. Uso" que busca viagens do veiculo (por `veiculo_id` e fallback por `placa`), exibindo uma secao "Viagens Realizadas" abaixo da tabela de presenca existente. Tambem incluir quem criou/iniciou cada viagem (campo `criado_por`/`iniciado_por` cruzado com `profiles`).

## Alteracoes em `src/components/veiculos/VeiculoDetalheModal.tsx`

### 1. Nova query de viagens do veiculo (useQuery)

Buscar viagens filtradas por `veiculo_id` OU `placa`, ordenadas por `data_criacao` DESC, limite 50. Incluir JOIN com `motoristas` via `motorista_id` para nome do motorista.

```
Campos exibidos:
- Data/Hora (data_criacao formatada)
- Motorista (campo motorista - texto legado)
- Rota (ponto_embarque -> ponto_desembarque)
- PAX (qtd_pax)
- Status (badge: encerrado, em_andamento, agendado)
- Duracao (calculada de h_inicio_real ate h_fim_real)
- Criado por (criado_por -> profiles.full_name)
```

### 2. Nova query para nomes de criadores (useQuery)

Buscar `profiles` dos `criado_por` e `iniciado_por` das viagens para exibir quem vinculou/criou cada viagem.

### 3. Reestruturar a aba "Hist. Uso" (linhas 516-576)

Dividir em duas secoes com subtitulos:

**Secao A - "Presenca (Check-in/Check-out)"**
- Manter tabela atual se houver dados
- Se vazia, nao mostrar esta secao

**Secao B - "Viagens Realizadas"**
- Nova tabela com: Data/Hora, Motorista, Rota, PAX, Duracao, Status, Criado por
- Badge colorido de status (verde=encerrado, amarelo=em_andamento, cinza=agendado)
- Duracao calculada via h_inicio_real e h_fim_real
- Se vazia, nao mostrar esta secao

Se ambas as secoes estiverem vazias, exibir mensagem "Nenhum registro de uso encontrado".

### 4. Atualizar metrica "Motoristas" no header

Combinar motoristas unicos de presencas E de viagens no calculo do card de metricas, para refletir todos os motoristas que efetivamente usaram o veiculo.

## Resultado esperado

Ao clicar "ver mais" no veiculo "15 - TCROSS CINZA", a aba "Hist. Uso" mostrara:
- 3 viagens com Cacia Lima (GIG->Windsor Barra, Windsor Barra->Jockey Club, Jockey Club->Windsor Barra)
- Com horarios de inicio/fim, duracao calculada, status "Encerrado" e quem criou a viagem

