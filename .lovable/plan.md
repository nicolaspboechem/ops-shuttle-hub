
# Adicionar Versao do Sistema no Header do Mapa de Servico

## Mudanca

Adicionar o badge de versao no header do Mapa de Servico, ao lado do botao "Atualizar", usando o componente `VersionBadge` que ja existe no projeto.

## Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `src/components/mapa-servico/MapaServicoHeader.tsx` | Importar `VersionBadge` e renderizar com `variant="footer"` ao lado direito do header, apos o botao Atualizar |

A versao aparecera discretamente no canto superior direito do Mapa de Servico, no formato "V1.3.0".
