import { GRUPOS, SELECOES } from './dados/selecoes.js';
import {
  getEstado, definirPalpiteGrupo, removerPalpiteGrupo, confirmarFaseDeGrupos, reiniciarSimulacao,
} from './estado.js';
import {
  obterJogosGrupoComPalpites, faseDeGruposCompleta, contarPreenchidos,
} from './jogos.js';
import { calcularTabelaGrupo } from './classificacao.js';
import { criar, blocoTime, inputPlacar } from './componentes.js';

// Estado puramente visual (não persistido): quais jogos do resumo estão
// com o formulário de edição aberto.
const emEdicaoResumo = new Set();

export function renderizarSimular(container, aoMudar) {
  const estado = getEstado();
  if (faseDeGruposCompleta(estado)) {
    renderizarResumo(container, estado, aoMudar);
  } else {
    emEdicaoResumo.clear();
    renderizarGrade(container, estado, aoMudar);
  }
}

function botaoReiniciar(aoMudar) {
  return criar('button', {
    class: 'botao-texto',
    texto: 'Reiniciar simulação',
    onclick: () => {
      if (window.confirm('Isso vai apagar todos os palpites já escolhidos. Quer continuar?')) {
        reiniciarSimulacao();
        aoMudar();
      }
    },
  });
}

function renderizarGrade(container, estado, aoMudar) {
  const { preenchidos, total } = contarPreenchidos(estado);

  container.appendChild(criar('div', { class: 'cabecalho-secao' }, [
    criar('h2', { texto: 'Simule um resultado' }),
    criar('p', { class: 'texto-apoio', texto: 'Escolha o placar dos jogos da fase de grupos que ainda não aconteceram. A classificação de cada grupo é recalculada automaticamente.' }),
    criar('div', { class: 'progresso-linha' }, [
      criar('div', { class: 'barra-progresso' }, [
        criar('div', { class: 'barra-progresso-preenchida', style: `width:${total ? (preenchidos / total) * 100 : 100}%` }),
      ]),
      criar('span', { class: 'progresso-texto', texto: `${preenchidos}/${total} jogos preenchidos` }),
    ]),
    botaoReiniciar(aoMudar),
  ]));

  GRUPOS.forEach((grupo) => {
    container.appendChild(criarSecaoGrupo(grupo, aoMudar));
  });
}

function criarSecaoGrupo(grupo, aoMudar) {
  const secao = criar('section', { class: 'cartao grupo-simulacao' });
  secao.appendChild(criar('h3', { texto: `Grupo ${grupo}` }));

  const listaJogos = criar('div', { class: 'lista-jogos' });
  const containerTabela = criar('div', { class: 'tabela-grupo-wrap' });

  function atualizarTabela() {
    containerTabela.innerHTML = '';
    containerTabela.appendChild(criarTabelaGrupo(grupo));
  }

  const idsTimesDoGrupo = Object.entries(SELECOES).filter(([, t]) => t.grupo === grupo).map(([id]) => id);

  obterJogosGrupoComPalpites(grupo, getEstado()).forEach((jogo) => {
    listaJogos.appendChild(criarCartaoJogo(jogo, idsTimesDoGrupo, () => {
      atualizarTabela();
      if (faseDeGruposCompleta(getEstado())) aoMudar();
    }));
  });

  secao.appendChild(listaJogos);
  atualizarTabela();
  secao.appendChild(containerTabela);
  return secao;
}

function criarCartaoJogo(jogo, idsTimesDoGrupo, aoSalvar) {
  if (jogo.fixo) {
    return criar('div', { class: 'jogo jogo-fixo' }, [
      criar('div', { class: 'jogo-meta' }, [
        criar('span', { class: 'jogo-data', texto: jogo.data }),
        criar('span', { class: 'etiqueta-oficial', texto: 'Resultado oficial' }),
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

  const inputCasa = inputPlacar(jogo.golsCasa);
  const inputFora = inputPlacar(jogo.golsFora);

  function tratarMudanca() {
    const casa = inputCasa.value === '' ? null : parseInt(inputCasa.value, 10);
    const fora = inputFora.value === '' ? null : parseInt(inputFora.value, 10);
    const valido = (v) => Number.isInteger(v) && v >= 0;
    if (valido(casa) && valido(fora)) {
      definirPalpiteGrupo(jogo.id, casa, fora);
    } else {
      removerPalpiteGrupo(jogo.id);
    }
    aoSalvar();
  }
  inputCasa.addEventListener('input', tratarMudanca);
  inputFora.addEventListener('input', tratarMudanca);

  return criar('div', { class: 'jogo' }, [
    criar('div', { class: 'jogo-meta' }, [
      criar('span', { class: 'jogo-data', texto: jogo.data }),
      criar('span', { class: 'jogo-cidade', texto: jogo.cidade }),
    ]),
    criar('div', { class: 'jogo-confronto' }, [
      blocoTime(jogo.casa),
      criar('div', { class: 'placar placar-editavel' }, [inputCasa, criar('span', { class: 'x', texto: '×' }), inputFora]),
      blocoTime(jogo.fora),
    ]),
  ]);
}

function criarTabelaGrupo(grupo) {
  const idsTimesDoGrupo = Object.entries(SELECOES).filter(([, t]) => t.grupo === grupo).map(([id]) => id);
  const jogos = obterJogosGrupoComPalpites(grupo, getEstado());
  const tabela = calcularTabelaGrupo(idsTimesDoGrupo, jogos);

  const el = criar('table', { class: 'tabela-grupo' });
  const cabecalho = criar('tr', {}, [
    criar('th', { texto: '#' }), criar('th', { class: 'col-selecao', texto: 'Seleção' }),
    criar('th', { texto: 'P' }), criar('th', { texto: 'J' }), criar('th', { texto: 'V' }),
    criar('th', { texto: 'E' }), criar('th', { texto: 'D' }), criar('th', { texto: 'GP' }),
    criar('th', { texto: 'GC' }), criar('th', { texto: 'SG' }),
  ]);
  el.appendChild(criar('thead', {}, [cabecalho]));

  const corpo = criar('tbody');
  tabela.forEach((linha, indice) => {
    const tr = criar('tr', { class: indice < 2 ? 'linha-classificado' : '' }, [
      criar('td', { texto: String(indice + 1) }),
      criar('td', { class: 'col-selecao' }, [blocoTime(linha.id, 22)]),
      criar('td', { texto: String(linha.pontos) }),
      criar('td', { texto: String(linha.jogos) }),
      criar('td', { texto: String(linha.vitorias) }),
      criar('td', { texto: String(linha.empates) }),
      criar('td', { texto: String(linha.derrotas) }),
      criar('td', { texto: String(linha.golsPro) }),
      criar('td', { texto: String(linha.golsContra) }),
      criar('td', { texto: (linha.saldo > 0 ? '+' : '') + linha.saldo }),
    ]);
    corpo.appendChild(tr);
  });
  el.appendChild(corpo);
  return el;
}

function renderizarResumo(container, estado, aoMudar) {
  container.appendChild(criar('div', { class: 'cabecalho-secao' }, [
    criar('h2', { texto: 'Confira seus palpites da fase de grupos' }),
    criar('p', { class: 'texto-apoio', texto: 'Todos os jogos da fase de grupos já têm um placar. Revise, edite o que quiser e confirme para ver o chaveamento mata-mata.' }),
    criar('div', { class: 'linha-botoes' }, [
      criar('button', {
        class: 'botao-azul botao-grande',
        texto: 'Confirmar e prosseguir',
        onclick: () => { confirmarFaseDeGrupos(); aoMudar(); },
      }),
      botaoReiniciar(aoMudar),
    ]),
  ]));

  GRUPOS.forEach((grupo) => {
    const secao = criar('section', { class: 'cartao grupo-resumo' });
    secao.appendChild(criar('h3', { texto: `Grupo ${grupo}` }));
    const lista = criar('div', { class: 'lista-jogos' });
    obterJogosGrupoComPalpites(grupo, getEstado()).forEach((jogo) => {
      lista.appendChild(criarLinhaResumo(jogo, aoMudar));
    });
    secao.appendChild(lista);
    container.appendChild(secao);
  });
}

function criarLinhaResumo(jogo, aoMudar) {
  if (emEdicaoResumo.has(jogo.id) && !jogo.fixo) {
    const inputCasa = inputPlacar(jogo.golsCasa);
    const inputFora = inputPlacar(jogo.golsFora);
    return criar('div', { class: 'jogo jogo-em-edicao' }, [
      criar('div', { class: 'jogo-meta' }, [criar('span', { class: 'jogo-data', texto: jogo.data })]),
      criar('div', { class: 'jogo-confronto' }, [
        blocoTime(jogo.casa),
        criar('div', { class: 'placar placar-editavel' }, [inputCasa, criar('span', { class: 'x', texto: '×' }), inputFora]),
        blocoTime(jogo.fora),
      ]),
      criar('button', {
        class: 'botao-azul botao-pequeno',
        texto: 'Salvar',
        onclick: () => {
          const casa = parseInt(inputCasa.value, 10);
          const fora = parseInt(inputFora.value, 10);
          if (Number.isInteger(casa) && casa >= 0 && Number.isInteger(fora) && fora >= 0) {
            definirPalpiteGrupo(jogo.id, casa, fora);
          } else {
            removerPalpiteGrupo(jogo.id);
          }
          emEdicaoResumo.delete(jogo.id);
          aoMudar();
        },
      }),
    ]);
  }

  return criar('div', { class: 'jogo jogo-resumo' }, [
    criar('div', { class: 'jogo-meta' }, [
      criar('span', { class: 'jogo-data', texto: jogo.data }),
      jogo.fixo ? criar('span', { class: 'etiqueta-oficial', texto: 'Resultado oficial' }) : null,
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
    !jogo.fixo ? criar('button', {
      class: 'botao-azul botao-pequeno botao-editar',
      texto: 'Editar placar',
      onclick: () => { emEdicaoResumo.add(jogo.id); aoMudar(); },
    }) : null,
  ]);
}
