# Validação local

Verificação realizada em 16/11/2026, no Windows, com Node.js `v24.22.1`.

Comando executado na raiz do projeto:

```sh
node --test
```

Resultado:

```text
tests 139
suites 10
pass 139
fail 0
cancelled 0
skipped 0
todo 0
```

A suíte verifica dois jogadores, conjunto duplo-seis de 28 peças, distribuição 7/7/14, abertura, encaixes, compras, passes, batida, bloqueio, empate e reinício. Também confere a conservação das 28 peças e a conexão da mesa após cada ação de três partidas completas.

Também foi executado `node exemplo.js`, demonstrando duas compras sem troca da vez, uma partida concluída por batida após 13 jogadas e o reinício com sete peças por mão e 14 no monte.

O workflow executa os testes em Node.js 22 e 24. Os resultados da integração contínua ficam na aba [Actions do repositório](https://github.com/LuizEdVS/desafio_teste_domino/actions).
