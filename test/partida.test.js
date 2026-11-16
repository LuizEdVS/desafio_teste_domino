import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PartidaDomino, identificarPeca } from '../src/domino.js';
import {
  MAOS_BATIDA, MAOS_COMPRA, CENARIOS_BLOQUEIO, conjuntoCom, novoJogo, jogoParaBater, bater,
  executarCenario, peca as p, rejeitaSemAlterar, verificarConservacao,
} from '../support/fixtures.js';

describe('CT06 — Jogadas e evolução da mesa', () => {
  it('começa com mesa vazia, sete peças por mão e 14 no monte', () => {
    const jogo = novoJogo();
    assert.equal(jogo.estado.status, 'jogando');
    assert.deepEqual(jogo.estado.quantidades, [7, 7]);
    assert.equal(jogo.estado.monteQuantidade, 14);
    assert.deepEqual(jogo.estado.mesa, []);
    assert.equal(jogo.estado.pontas, null);
    assert.equal(jogo.estado.acoes, 0);
    assert.equal(jogo.estado.resultado, null);
  });

  it('a abertura consome uma peça, define as pontas e alterna a vez', () => {
    const jogo = novoJogo();
    jogo.jogar(0, 0);
    assert.deepEqual(jogo.estado.mesa, [{ a: 6, b: 6, jogador: 0 }]);
    assert.deepEqual(jogo.estado.pontas, { esquerda: 6, direita: 6 });
    assert.deepEqual(jogo.estado.quantidades, [6, 7]);
    assert.equal(jogo.estado.vez, 1);
    assert.equal(jogo.estado.jogadas, 1);
    assert.equal(jogo.estado.acoes, 1);
  });

  it('encadeia jogadas à direita e à esquerda, invertendo as faces quando necessário', () => {
    const jogo = jogoParaBater();
    jogo.jogar(0, 0);
    jogo.jogar(1, 0, 'direita');
    jogo.jogar(0, 0, 'esquerda');
    assert.deepEqual(jogo.estado.mesa, [
      { a: 5, b: 6, jogador: 0 }, { a: 6, b: 6, jogador: 0 }, { a: 6, b: 0, jogador: 1 },
    ]);
    assert.deepEqual(jogo.estado.pontas, { esquerda: 5, direita: 0 });
    verificarConservacao(jogo);
  });

  it('também permite abrir pela esquerda e inverter uma peça colocada à direita', () => {
    const jogo = jogoParaBater();
    jogo.jogar(0, 0, 'esquerda');
    jogo.jogar(1, 0, 'esquerda');
    jogo.jogar(0, 0, 'direita');
    assert.deepEqual(jogo.estado.pontas, { esquerda: 0, direita: 5 });
    assert.deepEqual(jogo.estado.mesa.at(-1), { a: 6, b: 5, jogador: 0 });
  });

  it('a dupla zero encaixa no branco sem criar novas extremidades ou vez extra', () => {
    const maos = [
      [[6, 6], [0, 0], [0, 5], [1, 5], [2, 5], [3, 5], [4, 5]],
      [[0, 6], [1, 1], [1, 2], [1, 3], [1, 4], [1, 6], [2, 2]],
    ].map(mao => mao.map(([a, b]) => p(a, b)));
    const jogo = new PartidaDomino({ pecas: conjuntoCom(maos, []) });
    jogo.jogar(0, 0);
    jogo.jogar(1, 0);
    jogo.jogar(0, 0);
    assert.deepEqual(jogo.estado.pontas, { esquerda: 6, direita: 0 });
    assert.deepEqual(jogo.estado.mesa.at(-1), { a: 0, b: 0, jogador: 0 });
    assert.equal(jogo.estado.vez, 1);
  });

  it('rejeita peça sem encaixe e preserva a mão, a mesa e a vez', () => {
    const jogo = jogoParaBater();
    jogo.jogar(0, 0);
    jogo.jogar(1, 0);
    rejeitaSemAlterar(jogo, () => jogo.jogar(0, 1, 'direita'), /não encaixa/);
  });

  for (const indice of [-1, 7, 0.5, '0', null, NaN]) {
    it(`rejeita índice de peça inválido ${String(indice)}`, () => {
      const jogo = novoJogo();
      rejeitaSemAlterar(jogo, () => jogo.jogar(0, indice), /Índice de peça inválido/);
    });
  }

  it('os índices são atualizados depois que uma peça sai da mão', () => {
    const jogo = jogoParaBater();
    jogo.jogar(0, 0);
    jogo.jogar(1, 0);
    assert.equal(jogo.visaoDoJogador(0).mao.length, 6);
    assert.deepEqual(jogo.visaoDoJogador(0).mao[0], p(5, 6));
    rejeitaSemAlterar(jogo, () => jogo.jogar(0, 6), /Índice de peça inválido/);
  });

  it('rejeita lados desconhecidos sem retirar a peça da mão', () => {
    const jogo = novoJogo();
    for (const lado of ['meio', 'left', null, 2]) {
      rejeitaSemAlterar(jogo, () => jogo.jogar(0, 0, lado), /Lado inválido/);
    }
  });
});

describe('CT07 — Dois jogadores, turnos e visibilidade', () => {
  it('aceita dois nomes e remove espaços ao redor', () => {
    const jogo = new PartidaDomino({ jogadores: [' Ana ', 'Bia'], pecas: conjuntoCom() });
    assert.deepEqual(jogo.estado.jogadores, ['Ana', 'Bia']);
  });

  for (const jogadores of [[], ['A'], ['A', 'B', 'C'], 'A,B']) {
    it(`rejeita quantidade ou formato de jogadores ${JSON.stringify(jogadores)}`, () => {
      assert.throws(() => new PartidaDomino({ jogadores }), /dois jogadores/);
    });
  }

  it('rejeita nomes vazios, repetidos, inválidos e ausentes', () => {
    for (const jogadores of [['A', ' A '], ['A', ''], ['A', 1], Array(2)]) {
      assert.throws(() => new PartidaDomino({ jogadores }), /nomes diferentes|Nome de jogador inválido/);
    }
  });

  it('jogar, comprar e passar fora da vez são ações sem efeito', () => {
    const jogo = novoJogo();
    rejeitaSemAlterar(jogo, () => jogo.jogar(1, 0), /Não é a vez/);
    rejeitaSemAlterar(jogo, () => jogo.comprar(1), /Não é a vez/);
    rejeitaSemAlterar(jogo, () => jogo.passar(1), /Não é a vez/);
  });

  for (const jogador of [-1, 2, '0', null, true]) {
    it(`rejeita identificador de jogador ${JSON.stringify(jogador)} em ações e consultas`, () => {
      const jogo = novoJogo();
      for (const acao of [
        () => jogo.jogar(jogador, 0), () => jogo.comprar(jogador), () => jogo.passar(jogador),
        () => jogo.jogadasDisponiveis(jogador), () => jogo.visaoDoJogador(jogador),
      ]) rejeitaSemAlterar(jogo, acao, /Jogador inválido/);
    });
  }

  it('a visão do jogador mostra a própria mão e somente a quantidade do adversário', () => {
    const jogo = novoJogo();
    const visao = jogo.visaoDoJogador(0);
    assert.deepEqual(visao.mao, MAOS_COMPRA[0]);
    assert.equal(visao.adversarioQuantidade, 7);
    assert.equal(visao.monteQuantidade, 14);
    assert.equal('maos' in visao.estado, false);
    assert.equal('monte' in visao.estado, false);
    assert.equal('maoAdversario' in visao, false);
  });

  it('consultar jogadas não consome turno e as listas retornadas são independentes', () => {
    const jogo = novoJogo();
    const antes = jogo.estado;
    const opcoes = jogo.jogadasDisponiveis(0);
    opcoes[0].lados.push('invalido');
    assert.deepEqual(jogo.estado, antes);
    assert.deepEqual(jogo.jogadasDisponiveis(0), [{ indice: 0, lados: ['esquerda', 'direita'] }]);
  });

  it('uma jogada aceita alterna os jogadores', () => {
    const jogo = jogoParaBater();
    jogo.jogar(0, 0);
    assert.equal(jogo.estado.vez, 1);
    jogo.jogar(1, 0);
    assert.equal(jogo.estado.vez, 0);
  });
});

describe('CT08 — Compras e condições para passar', () => {
  it('compra uma peça por ação e mantém a vez quando ainda não há encaixe', () => {
    const jogo = novoJogo();
    jogo.jogar(0, 0);
    jogo.comprar(1);
    assert.equal(jogo.estado.monteQuantidade, 13);
    assert.deepEqual(jogo.estado.quantidades, [6, 8]);
    assert.deepEqual(jogo.visaoDoJogador(1).mao.at(-1), p(1, 4));
    assert.deepEqual(jogo.jogadasDisponiveis(1), []);
    assert.equal(jogo.estado.vez, 1);
    assert.equal(jogo.estado.compras, 1);
    assert.equal(jogo.estado.jogadas, 1);
    verificarConservacao(jogo);
  });

  it('pode continuar comprando até encontrar uma peça jogável', () => {
    const jogo = novoJogo();
    jogo.jogar(0, 0);
    jogo.comprar(1);
    jogo.comprar(1);
    assert.equal(jogo.estado.monteQuantidade, 12);
    assert.deepEqual(jogo.estado.quantidades, [6, 9]);
    assert.deepEqual(jogo.visaoDoJogador(1).mao.at(-1), p(1, 6));
    assert.deepEqual(jogo.jogadasDisponiveis(1), [{ indice: 8, lados: ['esquerda', 'direita'] }]);
    assert.equal(jogo.estado.vez, 1);
    assert.equal(jogo.estado.jogadas, 1);
  });

  it('a peça comprada precisa ser jogada explicitamente antes de alternar a vez', () => {
    const jogo = novoJogo();
    jogo.jogar(0, 0);
    jogo.comprar(1);
    jogo.comprar(1);
    jogo.jogar(1, 8, 'direita');
    assert.deepEqual(jogo.estado.mesa.at(-1), { a: 6, b: 1, jogador: 1 });
    assert.equal(jogo.estado.vez, 0);
    assert.deepEqual(jogo.estado.quantidades, [6, 8]);
    assert.equal(jogo.estado.acoes, 4);
    assert.equal(jogo.estado.compras, 2);
  });

  it('bloqueia nova compra assim que há uma peça jogável na mão', () => {
    const jogo = novoJogo();
    jogo.jogar(0, 0);
    jogo.comprar(1);
    jogo.comprar(1);
    rejeitaSemAlterar(jogo, () => jogo.comprar(1), /jogada disponível/);
    rejeitaSemAlterar(jogo, () => jogo.passar(1), /jogada disponível/);
  });

  it('não permite passar enquanto há peças no monte e não há encaixe na mão', () => {
    const jogo = novoJogo();
    jogo.jogar(0, 0);
    rejeitaSemAlterar(jogo, () => jogo.passar(1), /Compre do monte/);
    assert.equal(jogo.estado.passesConsecutivos, 0);
  });

  it('não permite comprar de um monte vazio', () => {
    const c = CENARIOS_BLOQUEIO[0];
    const indice = c.acoes.findIndex(a => a[0] === 'passar');
    const jogo = executarCenario(c, indice);
    assert.equal(jogo.estado.monteQuantidade, 0);
    assert.deepEqual(jogo.jogadasDisponiveis(jogo.estado.vez), []);
    rejeitaSemAlterar(jogo, () => jogo.comprar(jogo.estado.vez), /monte está vazio/);
  });

  it('mesmo sem monte, uma jogada disponível impede o passe', () => {
    const c = CENARIOS_BLOQUEIO[0];
    const indice = c.acoes.findIndex((a, i) => a[0] === 'passar' && c.acoes[i + 1]?.[0] === 'jogar');
    const jogo = executarCenario(c, indice + 1);
    assert.equal(jogo.estado.monteQuantidade, 0);
    assert.ok(jogo.jogadasDisponiveis(jogo.estado.vez).length > 0);
    rejeitaSemAlterar(jogo, () => jogo.passar(jogo.estado.vez), /jogada disponível/);
  });

  it('o monte pode ser esgotado com todas as 14 compras contabilizadas', () => {
    for (const c of CENARIOS_BLOQUEIO) {
      const jogo = executarCenario(c);
      assert.equal(jogo.estado.monteQuantidade, 0);
      assert.equal(jogo.estado.compras, 14);
      verificarConservacao(jogo);
    }
  });
});

describe('CT09 — Batida, bloqueio e empate', () => {
  for (const vencedor of [0, 1]) {
    it(`o jogador ${vencedor} pode vencer ao jogar todas as suas sete peças`, () => {
      const jogo = jogoParaBater(vencedor);
      bater(jogo, vencedor);
      const pontos = vencedor === 0 ? [0, 6] : [6, 0];
      assert.deepEqual(jogo.estado.resultado, { motivo: 'bateu', vencedor, pontosNasMaos: pontos });
      assert.equal(jogo.estado.status, 'concluida');
      assert.equal(jogo.estado.vez, null);
      assert.equal(jogo.estado.jogadas, 13);
      assert.equal(jogo.estado.monteQuantidade, 14);
      assert.equal(jogo.visaoDoJogador(vencedor).mao.length, 0);
    });
  }

  it('a partida continua com uma peça na mão e termina somente após a última jogada', () => {
    const jogo = jogoParaBater();
    for (let i = 0; i < 6; i += 1) {
      jogo.jogar(0, 0, i === 0 ? 'direita' : 'esquerda');
      jogo.jogar(1, 0, 'direita');
    }
    assert.equal(jogo.estado.status, 'jogando');
    assert.deepEqual(jogo.estado.quantidades, [1, 1]);
    assert.equal(jogo.estado.resultado, null);
    jogo.jogar(0, 0, 'esquerda');
    assert.equal(jogo.estado.resultado.vencedor, 0);
  });

  for (const c of CENARIOS_BLOQUEIO) {
    it(`bloqueio ${c.nome}: pontuação restante ${c.pontos} e vencedor ${c.vencedor}`, () => {
      const jogo = executarCenario(c);
      assert.equal(jogo.estado.status, 'concluida');
      assert.equal(jogo.estado.vez, null);
      assert.equal(jogo.estado.passesConsecutivos, 2);
      assert.deepEqual(jogo.estado.resultado, { motivo: 'bloqueio', vencedor: c.vencedor, pontosNasMaos: c.pontos });
      assert.ok(jogo.estado.quantidades.every(q => q > 0));
      assert.deepEqual(jogo.jogadasDisponiveis(0), []);
      assert.deepEqual(jogo.jogadasDisponiveis(1), []);
    });

    it(`um único passe ainda não encerra o cenário ${c.nome}`, () => {
      const jogo = executarCenario(c, c.acoes.length - 1);
      assert.equal(jogo.estado.status, 'jogando');
      assert.equal(jogo.estado.passesConsecutivos, 1);
      assert.equal(jogo.estado.resultado, null);
      jogo.passar(jogo.estado.vez);
      assert.equal(jogo.estado.status, 'concluida');
    });
  }

  it('uma jogada após um passe zera a sequência de passes', () => {
    const c = CENARIOS_BLOQUEIO[0];
    const indice = c.acoes.findIndex((a, i) => a[0] === 'passar' && c.acoes[i + 1]?.[0] === 'jogar');
    const jogo = executarCenario(c, indice + 1);
    assert.equal(jogo.estado.passesConsecutivos, 1);
    jogo.jogar(...c.acoes[indice + 1].slice(1));
    assert.equal(jogo.estado.passesConsecutivos, 0);
    assert.equal(jogo.estado.status, 'jogando');
  });

  it('uma mão com soma zero ainda pode conter a dupla branca no bloqueio', () => {
    const jogo = executarCenario(CENARIOS_BLOQUEIO[1]);
    assert.equal(jogo.estado.resultado.pontosNasMaos[1], 0);
    assert.deepEqual(jogo.visaoDoJogador(1).mao, [p(0, 0)]);
    assert.equal(jogo.estado.resultado.motivo, 'bloqueio');
  });

  for (const motivo of ['bateu', 'bloqueio']) {
    it(`jogar, comprar e passar são bloqueados depois do término por ${motivo}`, () => {
      const jogo = motivo === 'bateu' ? jogoParaBater() : executarCenario(CENARIOS_BLOQUEIO[2]);
      if (motivo === 'bateu') bater(jogo);
      for (const jogador of [0, 1]) {
        rejeitaSemAlterar(jogo, () => jogo.jogar(jogador, 0), /já terminou/);
        rejeitaSemAlterar(jogo, () => jogo.comprar(jogador), /já terminou/);
        rejeitaSemAlterar(jogo, () => jogo.passar(jogador), /já terminou/);
      }
    });
  }
});

describe('CT10 — Reinício, conservação das peças e isolamento', () => {
  for (const origem of ['inicial', 'jogada', 'compra', 'batida', 'bloqueio', 'empate']) {
    it(`reinicia depois de ${origem} e limpa todo o progresso`, () => {
      let jogo = origem === 'batida' ? jogoParaBater() : novoJogo();
      if (origem === 'jogada' || origem === 'compra') jogo.jogar(0, 0);
      if (origem === 'compra') jogo.comprar(1);
      if (origem === 'batida') bater(jogo);
      if (origem === 'bloqueio') jogo = executarCenario(CENARIOS_BLOQUEIO[0]);
      if (origem === 'empate') jogo = executarCenario(CENARIOS_BLOQUEIO[2]);
      const nomes = jogo.estado.jogadores;
      jogo.reiniciar({ pecas: conjuntoCom() });
      assert.equal(jogo.estado.status, 'jogando');
      assert.equal(jogo.estado.vez, 0);
      assert.equal(jogo.estado.aberturaObrigatoria, '6-6');
      assert.deepEqual(jogo.estado.quantidades, [7, 7]);
      assert.equal(jogo.estado.monteQuantidade, 14);
      assert.deepEqual(jogo.estado.mesa, []);
      assert.equal(jogo.estado.pontas, null);
      assert.equal(jogo.estado.compras, 0);
      assert.equal(jogo.estado.passesConsecutivos, 0);
      assert.equal(jogo.estado.acoes, 0);
      assert.equal(jogo.estado.resultado, null);
      assert.deepEqual(jogo.estado.jogadores, nomes);
      verificarConservacao(jogo);
    });
  }

  it('uma nova distribuição recalcula quem começa', () => {
    const jogo = novoJogo();
    jogo.reiniciar({ pecas: conjuntoCom([MAOS_COMPRA[1], MAOS_COMPRA[0]]) });
    assert.equal(jogo.estado.vez, 1);
    assert.equal(jogo.estado.primeiroJogador, 1);
  });

  it('um reinício inválido preserva a partida anterior', () => {
    const jogo = novoJogo();
    jogo.jogar(0, 0);
    rejeitaSemAlterar(jogo, () => jogo.reiniciar({ pecas: [] }), /28 peças/);
    rejeitaSemAlterar(jogo, () => jogo.reiniciar({ aleatorio: null }), /deve ser uma função/);
    rejeitaSemAlterar(jogo, () => jogo.reiniciar({ aleatorio: () => 1 }), /entre 0/);
  });

  it('reiniciar sem peças reutiliza o gerador configurado e valida antes de substituí-lo', () => {
    let chamadas = 0;
    const jogo = new PartidaDomino({ aleatorio: () => { chamadas += 1; return 0; } });
    assert.equal(chamadas, 27);
    rejeitaSemAlterar(jogo, () => jogo.reiniciar({ aleatorio: () => 1 }), /entre 0/);
    jogo.reiniciar();
    assert.equal(chamadas, 54);
    verificarConservacao(jogo);
  });

  it('peças fornecidas dispensam o sorteio na criação e no reinício', () => {
    const jogo = new PartidaDomino({ pecas: conjuntoCom(), aleatorio: () => { throw new Error('Sorteio inesperado.'); } });
    jogo.reiniciar({ pecas: conjuntoCom() });
    verificarConservacao(jogo);
  });

  for (const c of CENARIOS_BLOQUEIO) {
    it(`conserva as 28 peças e os encaixes após cada ação do cenário ${c.nome}`, () => {
      const jogo = new PartidaDomino({ pecas: c.pecas.map(([a, b]) => p(a, b)) });
      verificarConservacao(jogo);
      for (const [metodo, ...argumentos] of c.acoes) {
        jogo[metodo](...argumentos);
        verificarConservacao(jogo);
      }
    });
  }

  it('opções e cópias de estado, mão e diagnóstico não permitem alterar a partida', () => {
    const jogadores = ['Ana', 'Bia'];
    const pecas = conjuntoCom();
    const jogo = new PartidaDomino({ jogadores, pecas });
    jogadores[0] = 'Alterado';
    pecas[0].a = 99;
    const estado = jogo.estado;
    estado.jogadores[0] = 'Outro';
    estado.quantidades[0] = 99;
    const visao = jogo.visaoDoJogador(0);
    visao.mao[0].a = 99;
    const diagnostico = jogo.inspecionar();
    diagnostico.maos[0][0].a = 99;
    diagnostico.monte.splice(0);
    assert.equal(jogo.estado.jogadores[0], 'Ana');
    assert.equal(jogo.estado.quantidades[0], 7);
    assert.deepEqual(jogo.visaoDoJogador(0).mao[0], p(6, 6));
    assert.equal(jogo.inspecionar().monte.length, 14);
  });

  it('o resultado final também é devolvido como cópia', () => {
    const jogo = jogoParaBater();
    bater(jogo);
    const estado = jogo.estado;
    estado.resultado.vencedor = 1;
    estado.resultado.pontosNasMaos[0] = 99;
    assert.deepEqual(jogo.estado.resultado, { motivo: 'bateu', vencedor: 0, pontosNasMaos: [0, 6] });
  });

  it('partidas diferentes não compartilham mãos, compras ou mesa', () => {
    const primeira = novoJogo();
    const segunda = novoJogo();
    primeira.jogar(0, 0);
    primeira.comprar(1);
    assert.equal(segunda.estado.jogadas, 0);
    assert.equal(segunda.estado.compras, 0);
    assert.equal(segunda.estado.monteQuantidade, 14);
    assert.deepEqual(segunda.estado.quantidades, [7, 7]);
    assert.equal(new Set([...segunda.inspecionar().maos.flat(), ...segunda.inspecionar().monte].map(identificarPeca)).size, 28);
  });
});
