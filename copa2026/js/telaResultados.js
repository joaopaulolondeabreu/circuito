import { GRUPOS } from './dados/selecoes.js';
import { JOGOS_GRUPOS } from './dados/jogosGrupos.js';
import { criar, blocoTime } from './componentes.js';

export function renderizarResultados(container) {
  const total = JOGOS_GRUPOS.filter((j) => j.golsCasa != null).length;

  container.appendChild(criar('div', { class: 'cabecalho-secao' }, [
    criar('h2', { texto: 'Resultados anteriores' }),
    criar('p', { class: 'texto-apoio', texto: `${total} jogos já confirmados da fase de grupos. Esses resultados estão fixos e não podem ser alterados.` }),
  ]));

  GRUPOS.forEach((grupo) => {
    const jogosDoGrupo = JOGOS_GRUPOS.filter((j) => j.grupo === grupo && j.golsCasa != null);
    if (jogosDoGrupo.length === 0) return;
    const secao = criar('section', { class: 'cartao grupo-resultados' });
    secao.appendChild(criar('h3', { texto: `Grupo ${grupo}` }));
    const lista = criar('div', { class: 'lista-jogos' });
    jogosDoGrupo.forEach((jogo) => {
      lista.appendChild(criarLinhaResultado(jogo));
    });
    secao.appendChild(lista);
    container.appendChild(secao);
  });
}

function criarLinhaResultado(jogo) {
  return criar('div', { class: 'jogo jogo-fixo' }, [
    criar('div', { class: 'jogo-meta' }, [
      criar('span', { class: 'jogo-data', texto: jogo.data }),
      criar('span', { class: 'jogo-cidade', texto: jogo.cidade }),
    ]),
    criar('div', { class: 'jogo-confronto' }, [
      blocoTime(jogo.casa),
      criar('div', { class: 'placar placar-final' }, [
        criar('span', { texto: String(jogo.golsCasa) }),
        criar('span', { class: 'x', texto: '×' }),
        criar('span', { texto: String(jogo.golsFora) }),
      ]),
      blocoTime(jogo.fora),
    ]),
  ]);
}
