import {
  OITAVOS_FINAL, QUARTAS_DE_FINAL, SEMIFINAIS, DISPUTA_TERCEIRO, FINAL,
} from './dados/mataMata.js';

const CHAVE = 'copa2026-simulacao-v1';

// Mapa de dependências: para cada jogo, quais outros jogos do mata-mata
// dependem diretamente do seu resultado (são "filhos" dele no chaveamento).
const TODOS_JOGOS_POSTERIORES = [...OITAVOS_FINAL, ...QUARTAS_DE_FINAL, ...SEMIFINAIS, DISPUTA_TERCEIRO, FINAL];

function construirMapaDeFilhos() {
  const mapa = {};
  TODOS_JOGOS_POSTERIORES.forEach((jogo) => {
    [jogo.ladoA, jogo.ladoB].forEach((lado) => {
      if (lado && lado.jogo) {
        if (!mapa[lado.jogo]) mapa[lado.jogo] = [];
        mapa[lado.jogo].push(jogo.id);
      }
    });
  });
  return mapa;
}

const MAPA_DE_FILHOS = construirMapaDeFilhos();

function estadoPadrao() {
  return {
    palpitesGrupos: {}, // { idDoJogo: { golsCasa, golsFora } }
    faseGruposConfirmada: false,
    palpitesMataMata: {}, // { idDoJogo: { golsA, golsB, penA, penB } }
    ultimoCampeaoMostrado: null,
  };
}

let estado = carregarEstado();

function carregarEstado() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return estadoPadrao();
    return { ...estadoPadrao(), ...JSON.parse(bruto) };
  } catch {
    return estadoPadrao();
  }
}

function salvar() {
  localStorage.setItem(CHAVE, JSON.stringify(estado));
}

export function getEstado() {
  return estado;
}

export function definirPalpiteGrupo(idDoJogo, golsCasa, golsFora) {
  estado.palpitesGrupos[idDoJogo] = { golsCasa, golsFora };
  salvar();
}

export function removerPalpiteGrupo(idDoJogo) {
  delete estado.palpitesGrupos[idDoJogo];
  salvar();
}

export function confirmarFaseDeGrupos() {
  estado.faseGruposConfirmada = true;
  salvar();
}

export function voltarParaFaseDeGrupos() {
  estado.faseGruposConfirmada = false;
  estado.palpitesMataMata = {};
  estado.ultimoCampeaoMostrado = null;
  salvar();
}

export function definirPalpiteMataMata(idDoJogo, golsA, golsB, penA = null, penB = null) {
  estado.palpitesMataMata[idDoJogo] = { golsA, golsB, penA, penB };
  limparDependentes(idDoJogo);
  salvar();
}

// Quando um resultado do mata-mata muda, qualquer palpite que dependia do
// time que saía dali deixa de fazer sentido — então é apagado (em cascata)
// para o usuário escolher de novo.
function limparDependentes(idDoJogo) {
  const filhos = MAPA_DE_FILHOS[idDoJogo] || [];
  filhos.forEach((idFilho) => {
    delete estado.palpitesMataMata[idFilho];
    limparDependentes(idFilho);
  });
}

export function marcarCampeaoMostrado(idTime) {
  estado.ultimoCampeaoMostrado = idTime;
  salvar();
}

export function reiniciarSimulacao() {
  estado = estadoPadrao();
  salvar();
}
