import { GRUPOS, timesDoGrupo } from './dados/selecoes.js';
import { calcularTabelaGrupo, compararTerceiros } from './classificacao.js';
import {
  OITAVOS_DE_FINAL, OITAVOS_FINAL, QUARTAS_DE_FINAL, SEMIFINAIS, DISPUTA_TERCEIRO, FINAL,
} from './dados/mataMata.js';

// Monta a classificação final dos 12 grupos: campeões, vices e os 12
// terceiros colocados (já ordenados, prontos para escolher os 8 melhores).
export function calcularClassificacaoGeral(jogosPorGrupo) {
  const primeiros = {};
  const segundos = {};
  const terceiros = [];

  GRUPOS.forEach((grupo) => {
    const ids = timesDoGrupo(grupo).map((t) => t.id);
    const tabela = calcularTabelaGrupo(ids, jogosPorGrupo[grupo]);
    primeiros[grupo] = tabela[0].id;
    segundos[grupo] = tabela[1].id;
    terceiros.push({ ...tabela[2], grupo });
  });

  terceiros.sort(compararTerceiros);
  const melhoresTerceiros = terceiros.slice(0, 8);

  return { primeiros, segundos, terceiros, melhoresTerceiros };
}

// Encaixa os 8 melhores terceiros nas vagas oficiais do chaveamento
// (cada vaga só aceita terceiros de uma lista fixa de grupos). Usa busca
// com retrocesso (casamento bipartido) para achar uma combinação válida,
// já que mais de uma vaga costuma aceitar o mesmo grupo.
export function encaixarMelhoresTerceiros(melhoresTerceiros) {
  const vagas = OITAVOS_DE_FINAL
    .filter((jogo) => jogo.ladoB.tipo === 'melhorTerceiro')
    .map((jogo) => ({ jogo: jogo.id, grupos: jogo.ladoB.grupos }));

  const gruposDisponiveis = melhoresTerceiros.map((t) => t.grupo);

  // Tenta primeiro as vagas com menos opções (heurística simples para
  // achar uma solução válida rapidamente).
  const vagasOrdenadas = [...vagas].sort(
    (a, b) => a.grupos.filter((g) => gruposDisponiveis.includes(g)).length
      - b.grupos.filter((g) => gruposDisponiveis.includes(g)).length,
  );

  const usados = new Set();
  const atribuicao = {};

  function tentar(i) {
    if (i === vagasOrdenadas.length) return true;
    const vaga = vagasOrdenadas[i];
    const candidatos = vaga.grupos.filter((g) => gruposDisponiveis.includes(g) && !usados.has(g));
    for (const grupo of candidatos) {
      usados.add(grupo);
      atribuicao[vaga.jogo] = grupo;
      if (tentar(i + 1)) return true;
      usados.delete(grupo);
      delete atribuicao[vaga.jogo];
    }
    return false;
  }

  const achou = tentar(0);
  if (!achou) {
    throw new Error('Não foi possível encaixar os melhores terceiros no chaveamento.');
  }
  return atribuicao; // { idDoJogo: grupo }
}

function resolverLadoGrupo(lado, classificacao, atribuicaoTerceiros, idDoJogo) {
  if (lado.tipo === 'campeaoGrupo') return classificacao.primeiros[lado.grupo];
  if (lado.tipo === 'viceGrupo') return classificacao.segundos[lado.grupo];
  if (lado.tipo === 'melhorTerceiro') {
    const grupo = atribuicaoTerceiros[idDoJogo];
    const time = classificacao.melhoresTerceiros.find((t) => t.grupo === grupo);
    return time ? time.id : null;
  }
  return null;
}

function definirVencedor(resultado) {
  if (resultado.golsA == null || resultado.golsB == null) return null;
  if (resultado.golsA > resultado.golsB) return resultado.timeA;
  if (resultado.golsB > resultado.golsA) return resultado.timeB;
  if (resultado.penA == null || resultado.penB == null || resultado.penA === resultado.penB) return null;
  return resultado.penA > resultado.penB ? resultado.timeA : resultado.timeB;
}

function definirPerdedor(resultado, vencedor) {
  if (!vencedor) return null;
  return vencedor === resultado.timeA ? resultado.timeB : resultado.timeA;
}

function resolverLadoPosterior(lado, resultados) {
  if (!lado) return null;
  const ref = resultados[lado.jogo];
  if (!ref) return null;
  if (lado.tipo === 'vencedor') return ref.vencedor;
  if (lado.tipo === 'perdedor') return ref.perdedor;
  return null;
}

// Monta o chaveamento completo (fase de 32 até a final), resolvendo cada
// confronto com base na classificação dos grupos e nos palpites do
// usuário para os jogos do mata-mata já preenchidos.
export function montarChaveamentoCompleto(classificacao, palpitesMataMata) {
  const atribuicaoTerceiros = encaixarMelhoresTerceiros(classificacao.melhoresTerceiros);
  const resultados = {};

  function registrar(jogo, timeA, timeB) {
    const palpite = palpitesMataMata[jogo.id] || {};
    const resultado = {
      id: jogo.id,
      cidade: jogo.cidade,
      timeA,
      timeB,
      golsA: timeA && timeB ? (palpite.golsA ?? null) : null,
      golsB: timeA && timeB ? (palpite.golsB ?? null) : null,
      penA: timeA && timeB ? (palpite.penA ?? null) : null,
      penB: timeA && timeB ? (palpite.penB ?? null) : null,
    };
    resultado.vencedor = definirVencedor(resultado);
    resultado.perdedor = definirPerdedor(resultado, resultado.vencedor);
    resultados[jogo.id] = resultado;
    return resultado;
  }

  const fase32 = OITAVOS_DE_FINAL.map((jogo) => registrar(
    jogo,
    resolverLadoGrupo(jogo.ladoA, classificacao, atribuicaoTerceiros, jogo.id),
    resolverLadoGrupo(jogo.ladoB, classificacao, atribuicaoTerceiros, jogo.id),
  ));

  const oitavos = OITAVOS_FINAL.map((jogo) => registrar(
    jogo,
    resolverLadoPosterior(jogo.ladoA, resultados),
    resolverLadoPosterior(jogo.ladoB, resultados),
  ));

  const quartas = QUARTAS_DE_FINAL.map((jogo) => registrar(
    jogo,
    resolverLadoPosterior(jogo.ladoA, resultados),
    resolverLadoPosterior(jogo.ladoB, resultados),
  ));

  const semis = SEMIFINAIS.map((jogo) => registrar(
    jogo,
    resolverLadoPosterior(jogo.ladoA, resultados),
    resolverLadoPosterior(jogo.ladoB, resultados),
  ));

  const terceiroLugar = registrar(
    DISPUTA_TERCEIRO,
    resolverLadoPosterior(DISPUTA_TERCEIRO.ladoA, resultados),
    resolverLadoPosterior(DISPUTA_TERCEIRO.ladoB, resultados),
  );

  const final = registrar(
    FINAL,
    resolverLadoPosterior(FINAL.ladoA, resultados),
    resolverLadoPosterior(FINAL.ladoB, resultados),
  );

  return {
    fase32, oitavos, quartas, semis, terceiroLugar, final, atribuicaoTerceiros,
  };
}
