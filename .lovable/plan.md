
# Corrigir perda de dados em formularios ao trocar de aba

## Problema
Quando um formulario (wizard de veiculo ou motorista) esta aberto e o usuario troca de aba na sidebar interna (ex: de "Veiculos" para "Auditoria"), o conteudo da aba e completamente desmontado do DOM. Isso destrói o estado do formulario e causa o efeito de "tremer/sumir/aparecer" ao voltar.

A causa raiz e o uso de renderizacao condicional destrutiva:
```
{activeSection === 'cadastro' && <CadastroContent />}
```
Isso monta e desmonta o componente a cada troca, perdendo todo o estado.

## Solucao

Aplicar duas correcoes complementares:

### 1. Renderizacao com CSS (block/hidden) ao inves de condicional destrutiva

Trocar a renderizacao condicional por classes CSS que escondem/mostram o conteudo sem desmontar:

**`src/pages/Veiculos.tsx`** - Na secao de render (linhas ~546-557):
- Trocar `{activeSection === 'cadastro' && <CadastroContent />}` por `<div className={activeSection === 'cadastro' ? 'block' : 'hidden'}><CadastroContent /></div>`
- Aplicar o mesmo padrao para "auditoria" e "historico-uso"

**`src/pages/Motoristas.tsx`** - Na secao de render (linhas ~1143-1149):
- Trocar `{activeSection === 'cadastro' && <CadastroContent />}` por `<div className={activeSection === 'cadastro' ? 'block' : 'hidden'}><CadastroContent /></div>`
- Aplicar o mesmo padrao para "auditoria" e "missoes"

### 2. Mover os Dialogs/Wizards para fora do conteudo condicional

Os modais de criacao (CreateVeiculoWizard, CreateMotoristaWizard) devem ser renderizados no nivel raiz do componente, fora das abas, para que sobrevivam a qualquer troca de aba.

**`src/pages/Veiculos.tsx`**:
- Mover o `<CreateVeiculoWizard>` de dentro de `CadastroContent` para junto do `<VeiculoDetalheModal>`, no nivel raiz do return.

**`src/pages/Motoristas.tsx`**:
- Mover o `<CreateMotoristaWizard>` de dentro de `CadastroContent` para o nivel raiz do return, junto dos outros modais.

### Resultado esperado
- Trocar de aba nao desmonta mais os formularios
- Dados preenchidos sao preservados ate o usuario salvar ou cancelar
- Sem efeito de "tremor" ou flash na interface
- Performance mantida (componentes ocultos via CSS nao causam re-render)
