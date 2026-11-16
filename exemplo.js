import { criarPecas, identificarPeca, PartidaDomino } from './src/domino.js';

const peca = (a, b) => ({ a, b });
function montarConjunto(maos, inicioMonte = []) {
  const topo = [];
  for (let i = 0; i < 7; i += 1) for (let jogador = 0; jogador < 2; jogador += 1) topo.push(maos[jogador][i]);
  topo.push(...inicioMonte);
  const usadas = new Set(topo.map(identificarPeca));
  return [...topo, ...criarPecas().filter(p => !usadas.has(identificarPeca(p)))];
}

const maoAna = [[6, 6], [5, 6], [4, 5], [3, 4], [2, 3], [1, 2], [0, 1]].map(([a, b]) => peca(a, b));
const maoCompra = [[0, 0], [0, 2], [0, 3], [0, 4], [1, 1], [1, 3], [2, 2]].map(([a, b]) => peca(a, b));
const jogo = new PartidaDomino({
  jogadores: ['Ana', 'Bia'],
  pecas: montarConjunto([maoAna, maoCompra], [peca(1, 4), peca(1, 6)]),
});
console.log('Dominó para dois jogadores: sete peças por mão e 14 no monte.');
jogo.jogar(0, 0);
console.log('Ana abre com 6-6. Bia não possui encaixe.');
jogo.comprar(1);
console.log('Bia compra 1-4 e continua sem encaixe, mantendo a vez.');
jogo.comprar(1);
jogo.jogar(1, 8, 'direita');
console.log('Bia compra 1-6 e joga como 6-1. Agora é a vez de Ana.');
console.log(`Compras: ${jogo.estado.compras}; peças no monte: ${jogo.estado.monteQuantidade}.`);

const maoBia = [[0, 6], [0, 2], [2, 4], [4, 4], [1, 4], [1, 1], [3, 3]].map(([a, b]) => peca(a, b));
jogo.reiniciar({ pecas: montarConjunto([maoAna, maoBia]) });
console.log('\nNova distribuição para demonstrar uma partida completa:');
for (let i = 0; i < 7; i += 1) {
  jogo.jogar(0, 0, i === 0 ? 'direita' : 'esquerda');
  if (jogo.estado.status === 'concluida') break;
  jogo.jogar(1, 0, 'direita');
}
console.log(jogo.estado.mesa.map(p => `[${p.a}|${p.b}]`).join(' '));
console.log(`Vencedora: ${jogo.estado.jogadores[jogo.estado.resultado.vencedor]}. Motivo: ${jogo.estado.resultado.motivo}.`);
console.log(`Jogadas: ${jogo.estado.jogadas}; pontos restantes nas mãos: ${jogo.estado.resultado.pontosNasMaos}.`);
jogo.reiniciar({ pecas: montarConjunto([maoAna, maoBia]) });
console.log(`Após reiniciar: ${jogo.estado.quantidades} peças nas mãos; ${jogo.estado.monteQuantidade} no monte; mesa vazia.`);
