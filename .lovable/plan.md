
# Corrigir formularios sumindo ao trocar de aba

## Diagnostico

A correcao anterior aplicou o padrao `block/hidden` em Veiculos.tsx e Motoristas.tsx, mas restam dois problemas:

### Problema 1: CreateMotoristaWizard nunca foi renderizado
Na movimentacao anterior, o `CreateMotoristaWizard` foi removido de dentro do `CadastroContent` em Motoristas.tsx, mas **nunca foi adicionado ao JSX raiz**. O estado `showCreateWizard` existe (linha 304) mas o componente nao aparece no return. Isso significa que o botao de criar motorista via wizard simplesmente nao funciona.

### Problema 2: RotasShuttle.tsx ainda usa renderizacao destrutiva
A pagina de Rotas/Pontos (RotasShuttle.tsx) ainda usa o padrao antigo:
```
{activeSection === 'pontos' && <PontosContent />}
{activeSection === 'rotas' && <RotasContent />}
```
Isso destrói o conteudo ao trocar de aba, perdendo qualquer estado de formulario aberto.

## Solucao

### 1. Adicionar CreateMotoristaWizard ao JSX raiz de Motoristas.tsx

Renderizar o componente no nivel raiz (junto do `EditarLocalizacaoModal`, ~linha 1209), passando os props necessarios:

```text
<CreateMotoristaWizard
  open={showCreateWizard}
  onOpenChange={setShowCreateWizard}
  veiculos={veiculos}
  eventoId={eventoId || ''}
  onSubmit={async (data) => {
    // criar motorista e retornar id
  }}
/>
```

### 2. Corrigir RotasShuttle.tsx: trocar condicional por block/hidden

**Arquivo**: `src/pages/RotasShuttle.tsx` (linhas 286-289)

Trocar:
```text
{activeSection === 'pontos' && <PontosContent />}
{activeSection === 'rotas' && <RotasContent />}
```

Por:
```text
<div className={activeSection === 'pontos' ? 'block' : 'hidden'}>
  <PontosContent />
</div>
<div className={activeSection === 'rotas' ? 'block' : 'hidden'}>
  <RotaContent />
</div>
```

### Resultado esperado
- Formularios e wizards sobrevivem a troca de aba em todas as paginas
- Nenhum dado preenchido e perdido ao navegar entre secoes da sidebar interna
- O wizard de criacao de motorista volta a funcionar corretamente
