

# Limpar viagens do Routes Hotel 2026

Executar duas operações de DELETE no banco de dados do evento `1dde22c2-884c-4b14-89e2-17fa5d0b33d1`:

1. **Apagar 55 registros de `viagem_logs`** (logs das viagens deste evento)
2. **Apagar 31 registros de `viagens`** (viagens do evento)

A ordem é importante: logs primeiro (têm FK para viagens), viagens depois.

A equipe cadastrada (`evento_usuarios`, `motoristas`, `veiculos`, `pontos_embarque`, `rotas_shuttle`, `escalas`) permanece intacta.

