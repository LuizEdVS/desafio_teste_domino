export const CONFIGURACAO = Object.freeze({ jogadores: 2, maiorValor: 6, totalPecas: 28, porJogador: 7, monteInicial: 14 });

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

function validarJogador(jogador) {
  exigir(jogador === 0 || jogador === 1, 'Jogador inválido: use 0 ou 1.');
}

function validarPeca(peca) {
  exigir(peca !== null && typeof peca === 'object'
    && Number.isInteger(peca.a) && peca.a >= 0 && peca.a <= 6
    && Number.isInteger(peca.b) && peca.b >= 0 && peca.b <= 6, 'Peça inválida: os valores devem ser inteiros de 0 a 6.');
}

export function identificarPeca(peca) {
  validarPeca(peca);
  return `${Math.min(peca.a, peca.b)}-${Math.max(peca.a, peca.b)}`;
}

export function criarPecas() {
  const pecas = [];
  for (let a = 0; a <= 6; a += 1) {
    for (let b = a; b <= 6; b += 1) pecas.push({ a, b });
  }
  return pecas;
}

export function embaralharPecas(aleatorio = Math.random) {
  exigir(typeof aleatorio === 'function', 'O gerador aleatório deve ser uma função.');
  const pecas = criarPecas();
  for (let i = pecas.length - 1; i > 0; i -= 1) {
    const valor = aleatorio();
    exigir(typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor < 1,
      'O gerador deve retornar um número entre 0, inclusive, e 1, exclusive.');
    const j = Math.floor(valor * (i + 1));
    [pecas[i], pecas[j]] = [pecas[j], pecas[i]];
  }
  return pecas;
}

export function distribuirPecas(pecas) {
  exigir(Array.isArray(pecas) && pecas.length === 28, 'Informe o conjunto completo de 28 peças.');
  const chaves = new Set();
  const copia = [];
  for (const peca of pecas) {
    const chave = identificarPeca(peca);
    exigir(!chaves.has(chave), 'O conjunto contém peças repetidas.');
    chaves.add(chave);
    copia.push({ a: Math.min(peca.a, peca.b), b: Math.max(peca.a, peca.b) });
  }
  const maos = [[], []];
  for (let i = 0; i < 14; i += 1) maos[i % 2].push(copia[i]);
  return { maos, monte: copia.slice(14) };
}

export function orientarPeca(peca, ponta, lado) {
  validarPeca(peca);
  exigir(Number.isInteger(ponta) && ponta >= 0 && ponta <= 6, 'Ponta inválida: use um inteiro de 0 a 6.');
  exigir(lado === 'esquerda' || lado === 'direita', 'Lado inválido: use esquerda ou direita.');
  exigir(peca.a === ponta || peca.b === ponta, 'A peça não encaixa nesta ponta.');
  const manter = lado === 'esquerda' ? peca.b === ponta : peca.a === ponta;
  return manter ? { a: peca.a, b: peca.b } : { a: peca.b, b: peca.a };
}

function escolherAbertura(maos) {
  let melhor = null;
  maos.forEach((mao, jogador) => mao.forEach(peca => {
    const peso = [peca.a === peca.b ? 1 : 0, peca.a === peca.b ? peca.a : peca.a + peca.b,
      Math.max(peca.a, peca.b), Math.min(peca.a, peca.b)];
    let supera = melhor === null;
    if (melhor) {
      const diferente = peso.findIndex((v, i) => v !== melhor.peso[i]);
      supera = diferente >= 0 && peso[diferente] > melhor.peso[diferente];
    }
    if (supera) melhor = { jogador, peca: identificarPeca(peca), peso };
  }));
  return melhor;
}

export class PartidaDomino {
  #jogadores;
  #maos;
  #monte;
  #mesa;
  #vez;
  #primeiroJogador;
  #abertura;
  #status;
  #passes;
  #compras;
  #acoes;
  #resultado;
  #aleatorio = Math.random;

  constructor({ jogadores = ['Jogador 1', 'Jogador 2'], pecas, aleatorio = Math.random } = {}) {
    exigir(Array.isArray(jogadores) && jogadores.length === 2, 'São necessários dois jogadores.');
    const nomes = Array.from(jogadores);
    exigir(nomes.every(n => typeof n === 'string' && n.trim().length > 0), 'Nome de jogador inválido.');
    const normalizados = nomes.map(n => n.trim());
    exigir(new Set(normalizados).size === 2, 'Os jogadores devem ter nomes diferentes.');
    this.#jogadores = normalizados;
    this.reiniciar({ pecas, aleatorio });
  }

  get estado() {
    return structuredClone({
      jogadores: this.#jogadores, status: this.#status, vez: this.#vez,
      primeiroJogador: this.#primeiroJogador, aberturaObrigatoria: this.#abertura,
      quantidades: this.#maos.map(mao => mao.length), monteQuantidade: this.#monte.length,
      mesa: this.#mesa,
      pontas: this.#mesa.length ? { esquerda: this.#mesa[0].a, direita: this.#mesa.at(-1).b } : null,
      jogadas: this.#mesa.length, compras: this.#compras, passesConsecutivos: this.#passes,
      acoes: this.#acoes, resultado: this.#resultado,
    });
  }

  visaoDoJogador(jogador) {
    validarJogador(jogador);
    return { estado: this.estado, mao: structuredClone(this.#maos[jogador]),
      adversarioQuantidade: this.#maos[1 - jogador].length, monteQuantidade: this.#monte.length };
  }

  // Diagnóstico local para verificar distribuição e conservação das 28 peças.
  inspecionar() {
    return structuredClone({ maos: this.#maos, monte: this.#monte });
  }

  jogadasDisponiveis(jogador) {
    validarJogador(jogador);
    if (this.#status !== 'jogando') return [];
    const pontas = this.estado.pontas;
    return this.#maos[jogador].flatMap((peca, indice) => {
      const lados = [];
      if (pontas === null) {
        if (identificarPeca(peca) === this.#abertura) lados.push('esquerda', 'direita');
      } else {
        if (peca.a === pontas.esquerda || peca.b === pontas.esquerda) lados.push('esquerda');
        if (peca.a === pontas.direita || peca.b === pontas.direita) lados.push('direita');
      }
      return lados.length ? [{ indice, lados }] : [];
    });
  }

  #exigirVez(jogador) {
    validarJogador(jogador);
    exigir(this.#status === 'jogando', 'A partida já terminou. Reinicie para jogar novamente.');
    exigir(this.#vez === jogador, 'Não é a vez deste jogador.');
  }

  #encerrar(motivo, vencedor) {
    this.#resultado = { motivo, vencedor, pontosNasMaos: this.#maos.map(mao => mao.reduce((s, p) => s + p.a + p.b, 0)) };
    this.#status = 'concluida';
    this.#vez = null;
  }

  jogar(jogador, indice, lado = 'direita') {
    this.#exigirVez(jogador);
    exigir(Number.isInteger(indice) && indice >= 0 && indice < this.#maos[jogador].length, 'Índice de peça inválido.');
    exigir(lado === 'esquerda' || lado === 'direita', 'Lado inválido: use esquerda ou direita.');
    const peca = this.#maos[jogador][indice];
    let orientada;
    if (this.#mesa.length === 0) {
      exigir(identificarPeca(peca) === this.#abertura, 'Jogue a peça de abertura obrigatória.');
      orientada = { a: peca.a, b: peca.b };
    } else orientada = orientarPeca(peca, this.estado.pontas[lado], lado);
    this.#maos[jogador].splice(indice, 1);
    const colocada = { ...orientada, jogador };
    if (lado === 'esquerda') this.#mesa.unshift(colocada);
    else this.#mesa.push(colocada);
    this.#passes = 0;
    this.#acoes += 1;
    if (this.#maos[jogador].length === 0) this.#encerrar('bateu', jogador);
    else this.#vez = 1 - jogador;
    return this.estado;
  }

  comprar(jogador) {
    this.#exigirVez(jogador);
    exigir(this.jogadasDisponiveis(jogador).length === 0, 'Você já possui uma jogada disponível.');
    exigir(this.#monte.length > 0, 'O monte está vazio.');
    this.#maos[jogador].push(this.#monte.shift());
    this.#compras += 1;
    this.#acoes += 1;
    return this.estado;
  }

  passar(jogador) {
    this.#exigirVez(jogador);
    exigir(this.jogadasDisponiveis(jogador).length === 0, 'Você já possui uma jogada disponível.');
    exigir(this.#monte.length === 0, 'Compre do monte antes de passar.');
    this.#passes += 1;
    this.#acoes += 1;
    if (this.#passes === 2) {
      const pontos = this.#maos.map(mao => mao.reduce((s, p) => s + p.a + p.b, 0));
      this.#encerrar('bloqueio', pontos[0] === pontos[1] ? null : pontos[0] < pontos[1] ? 0 : 1);
    } else this.#vez = 1 - jogador;
    return this.estado;
  }

  reiniciar({ pecas, aleatorio = this.#aleatorio } = {}) {
    exigir(typeof aleatorio === 'function', 'O gerador aleatório deve ser uma função.');
    const distribuicao = distribuirPecas(pecas === undefined ? embaralharPecas(aleatorio) : pecas);
    const abertura = escolherAbertura(distribuicao.maos);
    this.#maos = distribuicao.maos;
    this.#monte = distribuicao.monte;
    this.#aleatorio = aleatorio;
    this.#mesa = [];
    this.#vez = abertura.jogador;
    this.#primeiroJogador = abertura.jogador;
    this.#abertura = abertura.peca;
    this.#status = 'jogando';
    this.#passes = 0;
    this.#compras = 0;
    this.#acoes = 0;
    this.#resultado = null;
    return this.estado;
  }
}
