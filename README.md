# Desafio — Dominó para dois jogadores

Dominó de compra com **dois jogadores**, conjunto **duplo-seis de 28 peças** e **139 testes automatizados em JavaScript**.

## 1. Concepção do desafio

O desafio consiste em implementar uma partida de Dominó e verificar sua distribuição, abertura, encaixes, turnos, compras e encerramento. Cada jogador recebe **sete peças** e as **14 restantes** formam o monte.

O projeto entrega um motor de partida, funções para validar e orientar peças, uma demonstração no terminal e testes em JavaScript que executam diretamente o código JavaScript de `src/domino.js`.

| Requisito | Como foi atendido |
| --- | --- |
| Explicar a concepção do desafio no leia-me | Seção 1 deste README |
| Explicar o funcionamento dos casos de teste | Seções 4 e 5 deste README |
| Partida para dois jogadores | Instância `PartidaDomino`, com jogadores `0` e `1` |
| Testes em JavaScript para testar JavaScript | `node:test` e `node:assert/strict` em `test/*.test.js` |

Cada instância controla uma rodada completa, até a batida ou o bloqueio. O resultado registra o vencedor e a soma dos pontos que restaram nas mãos.

## 2. Regras adotadas

### Peças, distribuição e abertura

- São 28 peças distintas, com faces de **0 a 6**, incluindo as sete duplas.
- `0-6` e `6-0` representam a mesma peça física.
- A distribuição usa as primeiras 14 peças da ordem recebida, alternando entre os jogadores; as outras 14 formam o monte.
- Abre quem recebeu a **dupla mais alta**, usando obrigatoriamente essa peça.
- Se não houver duplas nas mãos, abre a peça de maior soma; em empate de soma, vence a de maior face.
- Peças que ficaram no monte não participam da escolha da abertura.

A composição do conjunto, a distribuição e a abertura usam como referência as [regras da MobilityWare](https://mobilityware.helpshift.com/hc/en/58-dominoes/faq/3806-basic-rules/). As decisões de desempate e de passagem abaixo fazem parte da variante fixada para este desafio.

### Jogadas, compras e passes

| Situação | Comportamento definido |
| --- | --- |
| Peça compatível com uma ponta | Pode ser jogada à esquerda ou à direita, conforme o encaixe |
| Orientação das faces | O motor inverte a peça automaticamente quando necessário |
| Face branca | Zero encaixa somente com zero |
| Peça dupla | Mantém uma cadeia de duas extremidades e consome uma jogada normal |
| Nenhuma peça jogável e monte disponível | Compra uma peça por chamada, sem trocar a vez |
| Compra ainda sem encaixe | Pode comprar novamente |
| Compra que permite jogar | Deve jogar uma peça compatível; a compra não joga automaticamente |
| Já existe peça jogável | Comprar e passar são bloqueados |
| Sem encaixe e monte vazio | Pode passar; a vez muda para o outro jogador |
| Dois passes consecutivos | Encerra por bloqueio |
| Jogada após um passe | Zera a sequência de passes |

Um encaixe aceito alterna a vez, mesmo quando a peça é dupla. A compra preserva a vez. O monte pode ser comprado até acabar; suas 14 peças participam da partida.

Esses mecanismos de compra e encerramento são descritos também no [material de Dominó da Secretaria Municipal de Educação de Goiânia](https://sme.goiania.go.gov.br/conexaoescola/ensino_fundamental/educacao-fisica-domino-regras-basicas/).

### Encerramento e resultado

| Situação | Resultado |
| --- | --- |
| Jogador coloca sua última peça | Vence por `bateu` |
| Bloqueio com somas diferentes | Vence quem tem menos pontos nas peças restantes |
| Bloqueio com somas iguais | Empate; `vencedor` é `null` |
| Última peça restante igual a `0-0` | Continua sendo uma peça na mão, embora sua soma seja zero |
| Ação após o encerramento | Erro; o estado permanece igual |

`pontosNasMaos` informa as somas restantes dos jogadores `0` e `1`. Não representa um placar acumulado de várias rodadas. Reiniciar redistribui as peças, limpa o progresso e recalcula a abertura, preservando os nomes dos jogadores.

## 3. Como executar

Requisito: **Node.js 22 ou superior**. O projeto usa somente recursos nativos; não há pacotes para instalar.

Na raiz do projeto:

```sh
node --test
```

O atalho equivalente, quando o npm estiver disponível, é:

```sh
npm test
```

Resultado esperado:

```text
tests 139
suites 10
pass 139
fail 0
skipped 0
todo 0
```

Outros comandos:

```sh
# Demonstração de compras, encaixes, batida e reinício
node exemplo.js

# Reexecutar ao salvar os arquivos
node --test --watch

# Executar somente os testes de orientação e encaixe
node --test --test-name-pattern="CT05"

# Cobertura com a opção experimental do Node.js
node --test --experimental-test-coverage
```

Os atalhos npm são `npm run demo`, `npm run test:watch` e `npm run test:coverage`. Consulte a [documentação do executor de testes do Node.js](https://nodejs.org/api/test.html) para suas opções.

## 4. Como os testes funcionam

Cada `describe` agrupa uma parte das regras. Cada `it` executa um caso. Tabelas geram testes separados para faces, pontas, lados e entradas inválidas; o total de 139 inclui essas combinações.

Os testes seguem três etapas:

1. **Preparar:** definir uma distribuição conhecida ou uma peça para orientar.
2. **Agir:** distribuir, consultar jogadas, jogar, comprar, passar ou reiniciar.
3. **Verificar:** comparar o resultado real com o esperado usando `assert`.

Exemplo de orientação à direita:

```js
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { orientarPeca } from './src/domino.js';

it('inverte 2-6 para encaixar na ponta direita seis', () => {
  const resultado = orientarPeca({ a: 2, b: 6 }, 6, 'direita');

  assert.deepEqual(resultado, { a: 6, b: 2 });
});
```

O exemplo explica a estrutura. Os casos de orientação já estão incluídos na suíte.

### Repetibilidade e isolamento

- `support/fixtures.js` contém distribuições fixas e transcrições de partidas completas.
- Os testes de embaralhamento usam geradores controlados; não dependem de uma ordem aleatória específica.
- Cada teste cria uma partida nova, sem compartilhar mãos ou progresso.
- As rejeições verificam tanto o erro quanto a preservação do estado e das peças ocultas.
- Três transcrições cobrem bloqueios com vitória do jogador `0`, vitória do jogador `1` e empate.
- Após cada ação dessas transcrições, a suíte confere que continuam existindo **28 peças distintas** entre mãos, monte e mesa.
- A cadeia da mesa também é verificada: a face direita de uma peça coincide com a face esquerda da próxima.

Uma asserção que falha faz o comando retornar código diferente de zero e reprova a execução no GitHub Actions.

## 5. Catálogo dos casos de teste

| Grupo | Casos | Cobertura | Arquivo |
| --- | ---: | --- | --- |
| CT01 | 5 | Conjunto duplo-seis, 28 peças, sete duplas e 168 pontos | [pecas.test.js](test/pecas.test.js) |
| CT02 | 15 | Embaralhamento, geradores controlados e valores inválidos | [pecas.test.js](test/pecas.test.js) |
| CT03 | 20 | Distribuição 7/7/14, inversões, duplicatas e validação das peças | [pecas.test.js](test/pecas.test.js) |
| CT04 | 8 | Maior dupla, abertura sem duplas e peça inicial obrigatória | [pecas.test.js](test/pecas.test.js) |
| CT05 | 25 | Encaixes nas duas pontas, inversões, zero e lados inválidos | [pecas.test.js](test/pecas.test.js) |
| CT06 | 14 | Mesa, índices da mão, duplas e jogadas sem encaixe | [partida.test.js](test/partida.test.js) |
| CT07 | 15 | Dois jogadores, turnos, nomes e visão individual | [partida.test.js](test/partida.test.js) |
| CT08 | 8 | Compras, preservação da vez, monte vazio e condições de passe | [partida.test.js](test/partida.test.js) |
| CT09 | 13 | Batidas, bloqueios, empate, passes consecutivos e término | [partida.test.js](test/partida.test.js) |
| CT10 | 16 | Reinício, conservação das peças, cópias e isolamento | [partida.test.js](test/partida.test.js) |
| **Total** | **139** | **10 grupos de testes** | |

### Exemplos de entrada e resultado esperado

| Entrada ou ação | Resultado esperado |
| --- | --- |
| Criar uma partida | Dois jogadores, sete peças por mão e 14 no monte |
| Comparar as identidades de `0-6` e `6-0` | Ambas são `0-6` |
| Maior dupla distribuída igual a `5-5`, com `6-6` no monte | Abre `5-5` |
| Encaixar `2-6` na ponta direita seis | Peça orientada como `6-2` |
| Tentar encaixar `1-2` na ponta seis | Erro; a peça permanece na mão |
| Comprar sem encaixe | Mão aumenta, monte diminui e a vez é preservada |
| Passar com peças no monte | Erro; deve comprar |
| Jogador coloca sua última peça | Partida concluída por batida |
| Bloqueio com somas `[6, 40]` | Jogador `0` vence |
| Bloqueio com somas `[6, 6]` | Empate |

## 6. Organização do projeto

```text
domino/
├── .github/workflows/testes.yml
├── .gitignore
├── README.md
├── VALIDACAO.md
├── exemplo.js
├── package.json
├── src/
│   └── domino.js
├── support/
│   └── fixtures.js
└── test/
    ├── pecas.test.js
    └── partida.test.js
```

## 7. API da implementação

Uma peça é um objeto como `{ a: 0, b: 6 }`. As faces usam números inteiros de 0 a 6. A representação é normalizada na distribuição, mas a orientação visível na mesa muda conforme o encaixe.

| Exportação de `src/domino.js` | Finalidade |
| --- | --- |
| `CONFIGURACAO` | Configuração imutável de dois jogadores e 28 peças |
| `criarPecas()` | Novo conjunto completo, em ordem fixa |
| `identificarPeca(peca)` | Identidade independente da orientação, como `'0-6'` |
| `embaralharPecas(aleatorio = Math.random)` | Novo conjunto embaralhado |
| `distribuirPecas(pecas)` | Retorna `{ maos, monte }` sem modificar a entrada |
| `orientarPeca(peca, ponta, lado)` | Orienta a peça para o encaixe ou gera erro |
| `new PartidaDomino(opcoes)` | Cria e distribui uma partida; aceita `jogadores`, `pecas` e `aleatorio` |

O gerador aleatório deve retornar um número de `0`, inclusive, a `1`, exclusive. Fornecer `pecas` permite controlar completamente a distribuição e dispensa o sorteio.

### Recursos da partida

| Recurso | Comportamento |
| --- | --- |
| `jogo.estado` | Cópia da mesa, pontas, contadores, vez e resultado |
| `jogo.visaoDoJogador(jogador)` | Mão própria e quantidades do adversário e do monte |
| `jogo.jogadasDisponiveis(jogador)` | Lista `{ indice, lados }` das peças que possuem encaixe |
| `jogo.jogar(jogador, indice, lado = 'direita')` | Retira uma peça da mão, orienta e coloca na mesa |
| `jogo.comprar(jogador)` | Compra a primeira peça do monte sem trocar a vez |
| `jogo.passar(jogador)` | Passa quando não há encaixe e o monte está vazio |
| `jogo.reiniciar(opcoes = {})` | Redistribui, limpa o progresso e recalcula a abertura |
| `jogo.inspecionar()` | Cópia das duas mãos e do monte para diagnóstico e testes locais |

Os jogadores são `0` e `1`. O índice da peça começa em zero e se refere à mão atual; depois de uma remoção, os índices restantes mudam. Os lados são `'esquerda'` e `'direita'`.

As consultas de jogadas não consomem a vez. Elas informam encaixes nas mãos, enquanto os métodos de ação também verificam de quem é o turno. A interface do jogador deve usar `visaoDoJogador`; `inspecionar` serve ao diagnóstico local.

Os estados são `jogando` e `concluida`. `pontas` é `null` antes da abertura, e `vez` é `null` após o encerramento. `acoes` conta jogadas, compras e passes aceitos; `jogadas` conta peças na mesa.

Exemplo de resultado final:

```js
{
  motivo: 'bloqueio',
  vencedor: null,
  pontosNasMaos: [6, 6]
}
```

Os métodos que alteram a partida retornam cópias do estado atualizado. Ações inválidas geram `Error`, sem modificar a partida.

## 8. Repositório e integração contínua

Repositório: [LuizEdVS/desafio_teste_domino](https://github.com/LuizEdVS/desafio_teste_domino).

```sh
git clone https://github.com/LuizEdVS/desafio_teste_domino.git
cd desafio_teste_domino
node --test
```

O workflow `.github/workflows/testes.yml` executa os testes e a demonstração em **Node.js 22 e 24** a cada push e pull request. Os resultados ficam na aba [Actions](https://github.com/LuizEdVS/desafio_teste_domino/actions).
