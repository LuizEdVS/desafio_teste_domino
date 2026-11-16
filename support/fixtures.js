import assert from 'node:assert/strict';
import { PartidaDomino } from '../src/domino.js';

export const peca = (a, b) => ({ a, b });
export const TODAS = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6],
  [2, 2], [2, 3], [2, 4], [2, 5], [2, 6],
  [3, 3], [3, 4], [3, 5], [3, 6], [4, 4], [4, 5], [4, 6], [5, 5], [5, 6], [6, 6],
].map(([a, b]) => peca(a, b));

export const MAOS_COMPRA = [
  [[6, 6], [5, 6], [4, 5], [3, 4], [2, 3], [1, 2], [0, 1]],
  [[0, 0], [0, 2], [0, 3], [0, 4], [1, 1], [1, 3], [2, 2]],
].map(mao => mao.map(([a, b]) => peca(a, b)));

export const MAOS_BATIDA = [
  [[6, 6], [5, 6], [4, 5], [3, 4], [2, 3], [1, 2], [0, 1]],
  [[0, 6], [0, 2], [2, 4], [4, 4], [1, 4], [1, 1], [3, 3]],
].map(mao => mao.map(([a, b]) => peca(a, b)));

export function conjuntoCom(maos = MAOS_COMPRA, inicioMonte = [peca(1, 4), peca(1, 6)]) {
  const topo = [];
  for (let i = 0; i < 7; i += 1) for (let j = 0; j < 2; j += 1) topo.push(maos[j][i]);
  topo.push(...inicioMonte);
  const chave = p => `${Math.min(p.a, p.b)}-${Math.max(p.a, p.b)}`;
  const usadas = new Set(topo.map(chave));
  assert.equal(usadas.size, topo.length, 'A fixture não pode repetir peças.');
  return structuredClone([...topo, ...TODAS.filter(p => !usadas.has(chave(p)))]);
}

export function novoJogo() {
  return new PartidaDomino({ pecas: conjuntoCom() });
}

export function jogoParaBater(vencedor = 0) {
  const maos = vencedor === 0 ? MAOS_BATIDA : [MAOS_BATIDA[1], MAOS_BATIDA[0]];
  return new PartidaDomino({ pecas: conjuntoCom(maos, []) });
}

export function bater(jogo, vencedor = 0) {
  for (let i = 0; i < 7; i += 1) {
    jogo.jogar(vencedor, 0, i === 0 ? 'direita' : 'esquerda');
    if (jogo.estado.status === 'concluida') break;
    jogo.jogar(1 - vencedor, 0, 'direita');
  }
  assert.equal(jogo.estado.resultado.motivo, 'bateu');
}

export function executarCenario(cenario, quantidade = cenario.acoes.length) {
  const jogo = new PartidaDomino({ pecas: cenario.pecas.map(([a, b]) => peca(a, b)) });
  for (const [metodo, ...argumentos] of cenario.acoes.slice(0, quantidade)) jogo[metodo](...argumentos);
  return jogo;
}

export function rejeitaSemAlterar(jogo, acao, mensagem) {
  const antes = { estado: jogo.estado, diagnostico: jogo.inspecionar() };
  assert.throws(acao, mensagem);
  assert.deepEqual({ estado: jogo.estado, diagnostico: jogo.inspecionar() }, antes);
}

export function verificarConservacao(jogo) {
  const diagnostico = jogo.inspecionar();
  const todas = [...diagnostico.maos.flat(), ...diagnostico.monte, ...jogo.estado.mesa];
  assert.equal(todas.length, 28);
  assert.equal(new Set(todas.map(p => `${Math.min(p.a, p.b)}-${Math.max(p.a, p.b)}`)).size, 28);
  const mesa = jogo.estado.mesa;
  for (let i = 1; i < mesa.length; i += 1) assert.equal(mesa[i - 1].b, mesa[i].a);
}

// Transcrições fixas: duas vitórias por bloqueio e um empate de seis pontos.
export const CENARIOS_BLOQUEIO = [
  { nome: "vencedor0", vencedor: 0, pontos: [6,40],
    pecas: [
      [1,5], [1,1], [0,3], [1,6], [2,3], [5,6], [1,4],
      [4,4], [0,5], [2,2], [3,6], [3,5], [4,5], [4,6],
      [2,5], [6,6], [2,6], [2,4], [3,4], [0,1], [3,3],
      [0,4], [1,2], [1,3], [0,0], [5,5], [0,2], [0,6],
    ],
    acoes: [
      ["jogar",1,3,"direita"], ["jogar",0,3,"direita"], ["jogar",1,1,"direita"],
      ["jogar",0,5,"esquerda"], ["jogar",1,1,"esquerda"], ["jogar",0,4,"direita"],
      ["jogar",1,2,"direita"], ["jogar",0,3,"direita"], ["jogar",1,2,"esquerda"],
      ["jogar",0,1,"direita"], ["comprar",1], ["comprar",1],
      ["comprar",1], ["comprar",1], ["jogar",1,5,"esquerda"],
      ["jogar",0,1,"direita"], ["jogar",1,1,"esquerda"], ["comprar",0],
      ["comprar",0], ["comprar",0], ["comprar",0],
      ["comprar",0], ["jogar",0,5,"esquerda"], ["jogar",1,1,"direita"],
      ["jogar",0,2,"esquerda"], ["comprar",1], ["comprar",1],
      ["jogar",1,4,"esquerda"], ["jogar",0,0,"direita"], ["jogar",1,3,"direita"],
      ["jogar",0,2,"esquerda"], ["comprar",1], ["comprar",1],
      ["comprar",1], ["passar",1], ["jogar",0,0,"direita"],
      ["passar",1], ["passar",0],
    ],
  },
  { nome: "vencedor1", vencedor: 1, pontos: [12,0],
    pecas: [
      [4,4], [2,6], [5,6], [0,1], [1,6], [4,5], [3,6],
      [0,0], [2,4], [1,4], [6,6], [3,5], [3,4], [4,6],
      [2,2], [2,5], [0,2], [5,5], [2,3], [0,3], [3,3],
      [1,2], [1,1], [1,3], [1,5], [0,5], [0,4], [0,6],
    ],
    acoes: [
      ["jogar",0,5,"direita"], ["jogar",1,0,"direita"], ["jogar",0,3,"esquerda"],
      ["jogar",1,4,"esquerda"], ["jogar",0,1,"esquerda"], ["jogar",1,4,"esquerda"],
      ["jogar",0,2,"direita"], ["jogar",1,3,"direita"], ["jogar",0,1,"direita"],
      ["jogar",1,1,"esquerda"], ["comprar",0], ["comprar",0],
      ["jogar",0,3,"esquerda"], ["comprar",1], ["jogar",1,2,"esquerda"],
      ["comprar",0], ["comprar",0], ["comprar",0],
      ["jogar",0,5,"esquerda"], ["comprar",1], ["jogar",1,2,"esquerda"],
      ["jogar",0,4,"esquerda"], ["comprar",1], ["jogar",1,2,"esquerda"],
      ["comprar",0], ["jogar",0,4,"esquerda"], ["jogar",1,0,"esquerda"],
      ["comprar",0], ["comprar",0], ["comprar",0],
      ["jogar",0,6,"esquerda"], ["comprar",1], ["comprar",1],
      ["jogar",1,2,"direita"], ["jogar",0,3,"esquerda"], ["jogar",1,1,"direita"],
      ["jogar",0,4,"esquerda"], ["passar",1], ["jogar",0,1,"direita"],
      ["passar",1], ["jogar",0,2,"esquerda"], ["passar",1],
      ["passar",0],
    ],
  },
  { nome: "empate", vencedor: null, pontos: [6,6],
    pecas: [
      [6,6], [1,3], [2,2], [0,6], [3,5], [0,5], [4,5],
      [0,4], [3,6], [3,3], [5,5], [2,5], [0,3], [1,4],
      [4,4], [1,5], [0,0], [2,6], [2,4], [1,6], [0,1],
      [2,3], [5,6], [4,6], [1,2], [0,2], [3,4], [1,1],
    ],
    acoes: [
      ["jogar",0,0,"direita"], ["jogar",1,1,"esquerda"], ["jogar",0,5,"esquerda"],
      ["jogar",1,0,"esquerda"], ["jogar",0,3,"direita"], ["jogar",1,2,"direita"],
      ["jogar",0,1,"direita"], ["jogar",1,0,"direita"], ["comprar",0],
      ["comprar",0], ["jogar",0,4,"esquerda"], ["jogar",1,0,"direita"],
      ["jogar",0,1,"direita"], ["jogar",1,0,"esquerda"], ["jogar",0,1,"direita"],
      ["comprar",1], ["comprar",1], ["jogar",1,2,"esquerda"],
      ["comprar",0], ["comprar",0], ["jogar",0,3,"esquerda"],
      ["jogar",1,0,"esquerda"], ["jogar",0,2,"esquerda"], ["comprar",1],
      ["comprar",1], ["jogar",1,2,"esquerda"], ["comprar",0],
      ["jogar",0,2,"direita"], ["comprar",1], ["jogar",1,2,"direita"],
      ["jogar",0,1,"direita"], ["comprar",1], ["comprar",1],
      ["comprar",1], ["jogar",1,4,"direita"], ["comprar",0],
      ["passar",0], ["passar",1],
    ],
  },
];
