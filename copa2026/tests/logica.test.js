// Testes rápidos da lógica de classificação e chaveamento.
// Rodar com: node tests/logica.test.js (dentro de copa2026/)
import { GRUPOS, timesDoGrupo } from '../js/dados/selecoes.js';
import { JOGOS_GRUPOS } from '../js/dados/jogosGrupos.js';
import { calcularTabelaGrupo } from '../js/classificacao.js';
import { calcularClassificacaoGeral, montarChaveamentoCompleto } from '../js/chaveamento.js';

let passou = 0;
let falhou = 0;

function verificar(descricao, condicao) {
  if (condicao) {
    passou += 1;
  } else {
    falhou += 1;
    console.error(`FALHOU: ${descricao}`);
  }
}

// 1) Tabela do Grupo A com os resultados reais já fixados (sem o jogo 3).
const jogosA = JOGOS_GRUPOS.filter((j) => j.grupo === 'A' && j.rodada <= 2);
const tabelaA = calcularTabelaGrupo(timesDoGrupo('A').map((t) => t.id), jogosA);
verificar('México lidera o Grupo A com 6 pontos', tabelaA[0].id === 'mx' && tabelaA[0].pontos === 6);
verificar('Coreia do Sul é 2ª com 3 pontos', tabelaA[1].id === 'kr' && tabelaA[1].pontos === 3);

// 2) Preenche todos os jogos em aberto com um placar fixo para poder
// calcular uma classificação completa e testar o encaixe dos terceiros.
function completarJogos(grupo) {
  return JOGOS_GRUPOS.filter((j) => j.grupo === grupo).map((j) => (
    j.golsCasa == null ? { ...j, golsCasa: 1, golsFora: 0 } : j
  ));
}
const jogosPorGrupoCompletos = {};
GRUPOS.forEach((g) => { jogosPorGrupoCompletos[g] = completarJogos(g); });

const classificacao = calcularClassificacaoGeral(jogosPorGrupoCompletos);
verificar('12 grupos têm campeão definido', Object.keys(classificacao.primeiros).length === 12);
verificar('8 melhores terceiros selecionados', classificacao.melhoresTerceiros.length === 8);

const chaveamento = montarChaveamentoCompleto(classificacao, {});
verificar('Fase de 32 tem 16 confrontos, todos com 2 times definidos', chaveamento.fase32.length === 16
  && chaveamento.fase32.every((j) => j.timeA && j.timeB));

const gruposUsadosNosTercos = Object.values(chaveamento.atribuicaoTerceiros);
verificar('Cada melhor terceiro foi usado em exatamente uma vaga', gruposUsadosNosTercos.length === 8
  && new Set(gruposUsadosNosTercos).size === 8);

// 3) Resolve a fase de 32 inteira com placares simulados (com pênaltis num
// empate) e confere se a final fecha corretamente.
const palpites = {};
chaveamento.fase32.forEach((jogo) => { palpites[jogo.id] = { golsA: 2, golsB: 1 }; });
const chaveamento2 = montarChaveamentoCompleto(classificacao, palpites);
verificar('Todos os vencedores da fase de 32 avançam (timeA)', chaveamento2.fase32.every((j) => j.vencedor === j.timeA));
verificar('Oitavas de final já têm os dois times definidos', chaveamento2.oitavos.every((j) => j.timeA && j.timeB));
verificar('Quartas/semis/final ainda não definidos (sem palpite)', chaveamento2.final.timeA === null);

// 4) Testa desempate por pênaltis numa partida do mata-mata.
const palpitesComPenalti = { ...palpites, M73: { golsA: 1, golsB: 1, penA: 4, penB: 3 } };
const chaveamento3 = montarChaveamentoCompleto(classificacao, palpitesComPenalti);
const m73 = chaveamento3.fase32.find((j) => j.id === 'M73');
verificar('Pênaltis decidem o vencedor em caso de empate', m73.vencedor === m73.timeA);

console.log(`\n${passou} testes passaram, ${falhou} falharam.`);
if (falhou > 0) process.exit(1);
