
# Rota unica de campo com redirecionamento por role

## Resumo

Criar uma rota unica `/app/:eventoId` que detecta automaticamente a role do usuario e renderiza a view correta (Motorista, Operador, Supervisor ou Cliente). O usuario nunca precisa saber qual URL acessar -- o sistema resolve tudo.

## Fluxo

```text
/app/:eventoId
    |
    +-- role = motorista ----> renderiza AppMotorista
    +-- role = operador -----> renderiza AppOperador
    +-- role = supervisor ---> renderiza AppSupervisor
    +-- role = cliente ------> renderiza AppCliente
    +-- admin (mobile) ------> renderiza AppSupervisor (com badge Admin)
    +-- admin (desktop) -----> renderiza AppSupervisor (com badge Admin)
    +-- sem acesso ----------> tela "Acesso negado"
```

## Mudancas

### 1. Nova pagina: `src/pages/app/AppEvento.tsx`

Componente leve (~40 linhas) que:
- Le `eventoId` dos params
- Usa `useAuth()` para obter `isAdmin` e `getEventRole(eventoId)`
- Se admin: renderiza `<AppSupervisor />` (acesso completo com badge Admin)
- Se motorista: renderiza `<AppMotorista />`
- Se operador: renderiza `<AppOperador />`
- Se supervisor: renderiza `<AppSupervisor />`
- Se cliente: renderiza `<AppCliente />`
- Sem role: mostra tela de acesso negado

Nao mistura logica dos apps -- apenas decide qual renderizar.

### 2. Simplificar rotas em `src/App.tsx`

Antes (5 rotas separadas com AdminRoute):
```
/app/:eventoId/motorista  -> AdminRoute -> AppMotorista
/app/:eventoId/operador   -> AdminRoute -> AppOperador
/app/:eventoId/supervisor -> AdminRoute -> AppSupervisor
/app/:eventoId/cliente    -> AdminRoute -> AppCliente
```

Depois (1 rota unica com ProtectedRoute):
```
/app/:eventoId            -> ProtectedRoute -> AppEvento (resolve a role)
```

As rotas antigas (`/motorista`, `/operador`, etc.) serao mantidas como redirects para `/app/:eventoId` para nao quebrar links existentes.

A rota `/app/:eventoId/vincular-veiculo/:motoristaId` continua separada pois e uma funcionalidade especifica.

### 3. Ajustar `src/pages/app/AppHome.tsx`

Simplificar os redirects:
- Admin seleciona evento: navega para `/app/:eventoId` (sem escolher modo)
- Non-admin seleciona evento: navega para `/app/:eventoId`
- Auto-redirect com 1 evento: navega para `/app/:eventoId`

Remover os botoes de selecao de modo (Motorista, Operador, Supervisor) para admin -- o sistema resolve automaticamente.

### 4. Ajustar `src/pages/Auth.tsx`

- Admin desktop: redireciona para `/eventos` (CCO)
- Admin mobile: redireciona para `/app` (hub de eventos)
- Non-admin: redireciona para `/app` (hub com auto-redirect)

Usa `useIsMobile()` para detectar dispositivo.

## Arquivos afetados

- **Novo**: `src/pages/app/AppEvento.tsx` (componente roteador por role)
- **Editar**: `src/App.tsx` (simplificar rotas de campo)
- **Editar**: `src/pages/app/AppHome.tsx` (remover selecao de modo, unificar navegacao)
- **Editar**: `src/pages/Auth.tsx` (redirect por dispositivo)

## Beneficios

- URL unica e limpa: `/app/:eventoId`
- Usuario nunca escolhe "modo" manualmente
- Admin no mobile entra automaticamente como Supervisor
- Cada app de campo continua sendo um arquivo separado e facil de manter
- Links antigos continuam funcionando via redirect
