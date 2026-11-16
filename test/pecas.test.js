import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIGURACAO, criarPecas, identificarPeca, embaralharPecas, distribuirPecas, orientarPeca, PartidaDomino,
} from '../src/domino.js';
import { TODAS, MAOS_COMPRA, conjuntoCom, novoJogo, peca as p, rejeitaSemAlterar } from '../support/fixtures.js';

describe('CT01 — Conjunto duplo-seis de 28 peças', () => {
  it('contém exatamente as 28 combinações esperadas, sem repetir faces invertidas', () => {
    const pecas = criarPecas();
    assert.deepEqual(pecas, TODAS);
    assert.equal(pecas.length, 28);
    assert.equal(new Set(pecas.map(identificarPeca)).size, 28);
  });

  it('possui sete duplas, 21 peças não duplas e 168 pontos no conjunto', () => {
    const pecas = criarPecas();
    assert.equal(pecas.filter(p => p.a === p.b).length, 7);
    assert.equal(pecas.filter(p => p.a !== p.b).length, 21);
    assert.equal(pecas.reduce((s, p) => s + p.a + p.b, 0), 168);
  });

  it('zero é uma face válida e a orientação não muda a identidade da peça', () => {
    assert.equal(identificarPeca(p(0, 0)), '0-0');
    assert.equal(identificarPeca(p(0, 6)), '0-6');
    assert.equal(identificarPeca(p(6, 0)), '0-6');
  });

  it('cada conjunto novo possui objetos independentes', () => {
    const primeiro = criarPecas();
    primeiro[0].a = 99;
    assert.deepEqual(criarPecas()[0], p(0, 0));
  });

  it('a configuração descreve dois jogadores e não permite alterações', () => {
    assert.deepEqual(CONFIGURACAO, { jogadores: 2, maiorValor: 6, totalPecas: 28, porJogador: 7, monteInicial: 14 });
    assert.throws(() => { CONFIGURACAO.porJogador = 10; }, TypeError);
  });
});

describe('CT02 — Embaralhamento e geradores controlados', () => {
  it('gerador constante zero termina após 27 sorteios e preserva todas as peças', () => {
    let chamadas = 0;
    const pecas = embaralharPecas(() => { chamadas += 1; return 0; });
    assert.equal(chamadas, 27);
    assert.equal(new Set(pecas.map(identificarPeca)).size, 28);
    assert.deepEqual(pecas.map(identificarPeca).sort(), TODAS.map(identificarPeca).sort());
  });

  it('aceita valor próximo de um sem sair dos limites do conjunto', () => {
    assert.deepEqual(embaralharPecas(() => 0.9999999999999999), TODAS);
  });

  it('o mesmo gerador reproduz a mesma ordem para testes', () => {
    const criarGerador = () => { let s = 42; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
    assert.deepEqual(embaralharPecas(criarGerador()), embaralharPecas(criarGerador()));
  });

  it('o gerador padrão também produz o conjunto completo', () => {
    const pecas = embaralharPecas();
    assert.equal(pecas.length, 28);
    assert.deepEqual(pecas.map(identificarPeca).sort(), TODAS.map(identificarPeca).sort());
  });

  for (const gerador of [null, 3, 'gerador']) {
    it(`rejeita gerador que não é função: ${JSON.stringify(gerador)}`, () => {
      assert.throws(() => embaralharPecas(gerador), /deve ser uma função/);
    });
  }

  for (const [nome, valor] of [
    ['negativo', -0.1], ['um', 1], ['NaN', NaN], ['infinito', Infinity],
    ['undefined', undefined], ['texto', '0'], ['null', null], ['booleano', true],
  ]) {
    it(`rejeita retorno inválido do gerador: ${nome}`, () => {
      assert.throws(() => embaralharPecas(() => valor), /entre 0/);
    });
  }
});

describe('CT03 — Distribuição e validação das peças', () => {
  it('distribui alternadamente sete peças para cada jogador e deixa 14 no monte', () => {
    const resultado = distribuirPecas(conjuntoCom());
    assert.deepEqual(resultado.maos, MAOS_COMPRA);
    assert.equal(resultado.monte.length, 14);
    assert.deepEqual(resultado.monte.slice(0, 2), [p(1, 4), p(1, 6)]);
    assert.equal(new Set([...resultado.maos.flat(), ...resultado.monte].map(identificarPeca)).size, 28);
  });

  it('não altera a entrada nem compartilha seus objetos com as mãos ou o monte', () => {
    const entrada = conjuntoCom();
    const antes = structuredClone(entrada);
    const resultado = distribuirPecas(entrada);
    assert.deepEqual(entrada, antes);
    resultado.maos[0][0].a = 99;
    resultado.monte[0].a = 99;
    assert.deepEqual(entrada, antes);
  });

  it('aceita faces invertidas e normaliza sua representação', () => {
    const resultado = distribuirPecas(TODAS.map(p => ({ a: p.b, b: p.a })));
    assert.ok([...resultado.maos.flat(), ...resultado.monte].every(p => p.a <= p.b));
    assert.equal(new Set([...resultado.maos.flat(), ...resultado.monte].map(identificarPeca)).size, 28);
  });

  for (const [nome, pecas] of [
    ['vazio', []], ['27 peças', TODAS.slice(1)], ['29 peças', [...TODAS, p(0, 0)]], ['null', null], ['objeto', {}],
  ]) {
    it(`rejeita conjunto ${nome}`, () => {
      assert.throws(() => distribuirPecas(pecas), /28 peças/);
    });
  }

  for (const [nome, invalida] of [
    ['negativa', p(-1, 0)], ['sete', p(0, 7)], ['fracionária', p(0.5, 1)],
    ['texto', p('0', 1)], ['booleano', p(true, 1)], ['face ausente', { a: 0 }],
    ['objeto vazio', {}], ['null', null], ['NaN', p(NaN, 0)],
  ]) {
    it(`rejeita peça ${nome}, inclusive quando está no monte`, () => {
      assert.throws(() => identificarPeca(invalida), /Peça inválida/);
      const pecas = structuredClone(TODAS);
      pecas[27] = invalida;
      assert.throws(() => distribuirPecas(pecas), /Peça inválida/);
    });
  }

  it('rejeita peças repetidas na mesma orientação', () => {
    const pecas = structuredClone(TODAS);
    pecas[27] = p(0, 0);
    assert.throws(() => distribuirPecas(pecas), /repetidas/);
  });

  it('rejeita repetição escondida por faces invertidas', () => {
    const pecas = structuredClone(TODAS);
    pecas[27] = p(1, 0);
    assert.throws(() => distribuirPecas(pecas), /repetidas/);
  });

  it('rejeita uma lista esparsa com peça ausente', () => {
    const pecas = structuredClone(TODAS);
    delete pecas[4];
    assert.throws(() => distribuirPecas(pecas), /Peça inválida/);
  });
});

describe('CT04 — Escolha do jogador e da peça de abertura', () => {
  it('começa com o jogador que recebeu a dupla seis', () => {
    const jogo = novoJogo();
    assert.equal(jogo.estado.vez, 0);
    assert.equal(jogo.estado.primeiroJogador, 0);
    assert.equal(jogo.estado.aberturaObrigatoria, '6-6');
  });

  it('o jogador um também pode ser o primeiro quando possui a dupla mais alta', () => {
    const jogo = new PartidaDomino({ pecas: conjuntoCom([MAOS_COMPRA[1], MAOS_COMPRA[0]]) });
    assert.equal(jogo.estado.vez, 1);
    assert.equal(jogo.estado.aberturaObrigatoria, '6-6');
  });

  it('uma dupla que ficou no monte não participa da escolha da abertura', () => {
    const maos = [
      [[5, 5], [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 6]],
      [[4, 4], [0, 0], [1, 1], [2, 2], [3, 3], [0, 1], [0, 2]],
    ].map(mao => mao.map(([a, b]) => p(a, b)));
    const jogo = new PartidaDomino({ pecas: conjuntoCom(maos, []) });
    assert.equal(jogo.estado.aberturaObrigatoria, '5-5');
    assert.equal(jogo.estado.vez, 0);
    assert.ok(jogo.inspecionar().monte.some(p => p.a === 6 && p.b === 6));
  });

  it('a dupla zero abre quando é a única dupla, mesmo com peças de soma maior', () => {
    const maos = [
      [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]],
      [[1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 3], [2, 4]],
    ].map(mao => mao.map(([a, b]) => p(a, b)));
    const jogo = new PartidaDomino({ pecas: conjuntoCom(maos, []) });
    assert.equal(jogo.estado.aberturaObrigatoria, '0-0');
  });

  for (const inverter of [false, true]) {
    it(`sem duplas, desempata a maior soma pela maior face; mãos invertidas: ${inverter}`, () => {
      const maos = [
        [[3, 6], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]],
        [[4, 5], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 3]],
      ].map(mao => mao.map(([a, b]) => p(a, b)));
      const jogo = new PartidaDomino({ pecas: conjuntoCom(inverter ? [maos[1], maos[0]] : maos, []) });
      assert.equal(jogo.estado.aberturaObrigatoria, '3-6');
      assert.equal(jogo.estado.vez, inverter ? 1 : 0);
    });
  }

  it('a primeira jogada deve usar a peça de abertura escolhida', () => {
    const jogo = novoJogo();
    rejeitaSemAlterar(jogo, () => jogo.jogar(0, 1), /abertura obrigatória/);
    assert.deepEqual(jogo.jogadasDisponiveis(0), [{ indice: 0, lados: ['esquerda', 'direita'] }]);
    assert.deepEqual(jogo.jogadasDisponiveis(1), []);
  });

  it('não permite comprar ou passar em lugar da abertura obrigatória', () => {
    const jogo = novoJogo();
    rejeitaSemAlterar(jogo, () => jogo.comprar(0), /jogada disponível/);
    rejeitaSemAlterar(jogo, () => jogo.passar(0), /jogada disponível/);
  });
});

describe('CT05 — Orientação das peças e encaixes nas duas pontas', () => {
  for (const [a, b, ponta, lado, esperado] of [
    [2, 6, 6, 'esquerda', [2, 6]], [2, 6, 6, 'direita', [6, 2]],
    [2, 6, 2, 'esquerda', [6, 2]], [2, 6, 2, 'direita', [2, 6]],
    [0, 5, 0, 'esquerda', [5, 0]], [0, 5, 0, 'direita', [0, 5]],
    [0, 5, 5, 'esquerda', [0, 5]], [0, 5, 5, 'direita', [5, 0]],
    [0, 0, 0, 'esquerda', [0, 0]], [0, 0, 0, 'direita', [0, 0]],
    [6, 6, 6, 'esquerda', [6, 6]], [6, 6, 6, 'direita', [6, 6]],
  ]) {
    it(`${a}-${b} encaixa na ponta ${ponta} à ${lado} com orientação ${esperado}`, () => {
      assert.deepEqual(orientarPeca(p(a, b), ponta, lado), p(...esperado));
    });
  }

  for (const lado of ['esquerda', 'direita']) {
    it(`rejeita peça incompatível com a ponta à ${lado}`, () => {
      assert.throws(() => orientarPeca(p(1, 2), 6, lado), /não encaixa/);
    });
  }

  for (const ponta of [-1, 7, 0.5, '0', null, NaN]) {
    it(`rejeita ponta inválida ${String(ponta)}`, () => {
      assert.throws(() => orientarPeca(p(0, 1), ponta, 'direita'), /Ponta inválida/);
    });
  }

  for (const lado of ['meio', 'left', null, 2]) {
    it(`rejeita lado inválido ${JSON.stringify(lado)}`, () => {
      assert.throws(() => orientarPeca(p(0, 1), 0, lado), /Lado inválido/);
    });
  }

  it('orientar uma peça não modifica o objeto original', () => {
    const original = p(2, 6);
    orientarPeca(original, 6, 'direita');
    assert.deepEqual(original, p(2, 6));
  });
});
