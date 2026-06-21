import { FASES_MATA_MATA } from './dados/mataMata.js';
import {
  getEstado, definirPalpiteMataMata, voltarParaFaseDeGrupos, reiniciarSimulacao, marcarCampeaoMostrado,
} from './estado.js';
import { obterTodosJogosGruposComPalpites } from './jogos.js';
import { calcularClassificacaoGeral, montarChaveamentoCompleto } from './chaveamento.js';
import { criar, blocoTime, blocoPlaceholder, inputPlacar } from './componentes.js';
import { mostrarCelebracaoCampeao } from './celebracao.js';

export function renderizarMataMata(container, aoMudar) {
  const estado = getEstado();
  const jogosPorGrupo = obterTodosJogosGruposComPalpites(estado);
  const classificacao = calcularClassificacaoGeral(jogosPorGrupo);
  const chaveamento = montarChaveamentoCompleto(classificacao, estado.palpitesMataMata);

  container.appendChild(criar('div', { class: 'cabecalho-secao' }, [
    criar('h2', { texto: 'Chaveamento mata-mata' }),
    criar('p', { class: 'texto-apoio', texto: 'Esses confrontos seguem o chaveamento oficial definido pela FIFA. Escolha o placar de cada fase para liberar a próxima — em caso de empate no mata-mata, defina os pênaltis.' }),
    criar('div', { class: 'linha-botoes' }, [
      criar('button', {
        class: 'botao-texto',
        texto: 'Voltar e editar a fase de grupos',
        onclick: () => {
          if (window.confirm('Voltar agora apaga os palpites do mata-mata já escolhidos. Continuar?')) {
            voltarParaFaseDeGrupos();
            aoMudar();
          }
        },
      }),
      criar('button', {
        class: 'botao-texto',
        texto: 'Reiniciar simulação',
        onclick: () => {
          if (window.confirm('Isso vai apagar todos os palpites já escolhidos. Quer continuar?')) {
            reiniciarSimulacao();
            aoMudar();
          }
        },
      }),
    ]),
  ]));

  const todasPorId = new Map();
  [...chaveamento.fase32, ...chaveamento.oitavos, ...chaveamento.quartas, ...chaveamento.semis,
    chaveamento.terceiroLugar, chaveamento.final].forEach((r) => todasPorId.set(r.id, r));

  FASES_MATA_MATA.forEach((fase) => {
    const secao = criar('section', { class: 'cartao fase-mata-mata' });
    secao.appendChild(criar('h3', { texto: fase.nome }));
    const grade = criar('div', { class: 'grade-mata-mata' });
    fase.jogos.forEach((jogoTemplate) => {
      const resultado = todasPorId.get(jogoTemplate.id);
      const ehFinal = jogoTemplate.id === 'M104';
      const ehTerceiro = jogoTemplate.id === 'M103';
      grade.appendChild(criarCartaoMataMata(resultado, aoMudar, { ehFinal, ehTerceiro }));
    });
    secao.appendChild(grade);
    container.appendChild(secao);
  });

  if (chaveamento.final.vencedor && chaveamento.final.vencedor !== estado.ultimoCampeaoMostrado) {
    marcarCampeaoMostrado(chaveamento.final.vencedor);
    mostrarCelebracaoCampeao(chaveamento.final.vencedor);
  }
}

function criarCartaoMataMata(resultado, aoMudar, opcoes = {}) {
  const cartao = criar('div', { class: `confronto-mata-mata${opcoes.ehFinal ? ' confronto-final' : ''}${opcoes.ehTerceiro ? ' confronto-terceiro' : ''}` });
  cartao.appendChild(criar('div', { class: 'jogo-meta' }, [
    criar('span', { class: 'jogo-cidade', texto: resultado.cidade }),
  ]));

  const ladoA = resultado.timeA ? blocoTime(resultado.timeA) : blocoPlaceholder('A definir');
  const ladoB = resultado.timeB ? blocoTime(resultado.timeB) : blocoPlaceholder('A definir');

  if (!resultado.timeA || !resultado.timeB) {
    cartao.appendChild(criar('div', { class: 'jogo-confronto' }, [
      ladoA,
      criar('span', { class: 'x x-desabilitado', texto: '×' }),
      ladoB,
    ]));
    return cartao;
  }

  const inputGolsA = inputPlacar(resultado.golsA);
  const inputGolsB = inputPlacar(resultado.golsB);
  const areaPenaltis = criar('div', { class: 'area-penaltis' });

  function salvar() {
    const a = inputGolsA.value === '' ? null : parseInt(inputGolsA.value, 10);
    const b = inputGolsB.value === '' ? null : parseInt(inputGolsB.value, 10);
    const valido = (v) => Number.isInteger(v) && v >= 0;
    if (!valido(a) || !valido(b)) {
      // Só limpa/reconstrói se já havia um palpite salvo: evita apagar o
      // primeiro placar digitado quando o usuário ainda está preenchendo
      // o segundo campo (o 'change' do primeiro dispara antes do segundo).
      if (resultado.golsA != null || resultado.golsB != null) {
        definirPalpiteMataMata(resultado.id, null, null, null, null);
        aoMudar();
      }
      return;
    }
    if (a === b) {
      montarPenaltis(a, b);
      return;
    }
    definirPalpiteMataMata(resultado.id, a, b, null, null);
    aoMudar();
  }

  function montarPenaltis(a, b) {
    areaPenaltis.innerHTML = '';
    const penAtual = resultado.penA != null ? resultado : null;
    const inputPenA = inputPlacar(penAtual ? resultado.penA : null);
    const inputPenB = inputPlacar(penAtual ? resultado.penB : null);
    const aviso = criar('span', { class: 'aviso-penaltis', texto: '' });

    function salvarPenaltis() {
      const pa = inputPenA.value === '' ? null : parseInt(inputPenA.value, 10);
      const pb = inputPenB.value === '' ? null : parseInt(inputPenB.value, 10);
      const valido = (v) => Number.isInteger(v) && v >= 0;
      if (!valido(pa) || !valido(pb)) {
        aviso.textContent = '';
        if (resultado.penA != null || resultado.penB != null) {
          definirPalpiteMataMata(resultado.id, a, b, null, null);
          aoMudar();
        }
        return;
      }
      if (pa === pb) {
        aviso.textContent = 'Os pênaltis não podem terminar empatados.';
        definirPalpiteMataMata(resultado.id, a, b, null, null);
        return;
      }
      aviso.textContent = '';
      definirPalpiteMataMata(resultado.id, a, b, pa, pb);
      aoMudar();
    }
    inputPenA.addEventListener('change', salvarPenaltis);
    inputPenB.addEventListener('change', salvarPenaltis);

    areaPenaltis.appendChild(criar('div', { class: 'linha-penaltis' }, [
      criar('span', { class: 'rotulo-penaltis', texto: 'Empate — pênaltis:' }),
      inputPenA,
      criar('span', { class: 'x', texto: '×' }),
      inputPenB,
    ]));
    areaPenaltis.appendChild(aviso);
  }

  inputGolsA.addEventListener('change', salvar);
  inputGolsB.addEventListener('change', salvar);

  cartao.appendChild(criar('div', { class: 'jogo-confronto' }, [
    ladoA,
    criar('div', { class: 'placar placar-editavel' }, [inputGolsA, criar('span', { class: 'x', texto: '×' }), inputGolsB]),
    ladoB,
  ]));
  cartao.appendChild(areaPenaltis);

  if (resultado.golsA != null && resultado.golsA === resultado.golsB) {
    montarPenaltis(resultado.golsA, resultado.golsB);
  }

  return cartao;
}
