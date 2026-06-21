import { GRUPOS } from './dados/selecoes.js';
import { JOGOS_GRUPOS } from './dados/jogosGrupos.js';

// Combina o resultado real (fixo) de um jogo com o palpite do usuário,
// quando o jogo ainda não aconteceu.
export function obterJogosGrupoComPalpites(grupo, estado) {
  return JOGOS_GRUPOS.filter((j) => j.grupo === grupo).map((jogo) => {
    if (jogo.golsCasa != null) {
      return { ...jogo, fixo: true };
    }
    const palpite = estado.palpitesGrupos[jogo.id];
    return {
      ...jogo,
      fixo: false,
      golsCasa: palpite ? palpite.golsCasa : null,
      golsFora: palpite ? palpite.golsFora : null,
    };
  });
}

export function obterTodosJogosGruposComPalpites(estado) {
  const mapa = {};
  GRUPOS.forEach((g) => { mapa[g] = obterJogosGrupoComPalpites(g, estado); });
  return mapa;
}

export function faseDeGruposCompleta(estado) {
  return GRUPOS.every((g) => obterJogosGrupoComPalpites(g, estado).every((j) => j.golsCasa != null && j.golsFora != null));
}

export function contarPreenchidos(estado) {
  const editaveis = JOGOS_GRUPOS.filter((j) => j.golsCasa == null);
  const preenchidos = editaveis.filter((j) => estado.palpitesGrupos[j.id]).length;
  return { preenchidos, total: editaveis.length };
}
