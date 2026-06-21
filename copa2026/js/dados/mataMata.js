// Modelo oficial do chaveamento de 32 (Copa do Mundo 2026, 48 seleções).
// Tipos de lado de confronto:
//  - { tipo: 'campeaoGrupo', grupo: 'A' }       -> 1º colocado do grupo
//  - { tipo: 'viceGrupo', grupo: 'A' }          -> 2º colocado do grupo
//  - { tipo: 'melhorTerceiro', grupos: [...] }  -> um dos melhores terceiros,
//        definido entre os grupos listados (ver js/chaveamento.js)
//  - { tipo: 'vencedor', jogo: 'id' }           -> vencedor de outro confronto
//  - { tipo: 'perdedor', jogo: 'id' }           -> perdedor de outro confronto

export const OITAVOS_DE_FINAL = [
  { id: 'M73', cidade: 'Los Angeles', ladoA: { tipo: 'viceGrupo', grupo: 'A' }, ladoB: { tipo: 'viceGrupo', grupo: 'B' } },
  { id: 'M74', cidade: 'Boston', ladoA: { tipo: 'campeaoGrupo', grupo: 'E' }, ladoB: { tipo: 'melhorTerceiro', grupos: ['A', 'B', 'C', 'D', 'F'] } },
  { id: 'M75', cidade: 'Monterrey', ladoA: { tipo: 'campeaoGrupo', grupo: 'F' }, ladoB: { tipo: 'viceGrupo', grupo: 'C' } },
  { id: 'M76', cidade: 'Houston', ladoA: { tipo: 'campeaoGrupo', grupo: 'C' }, ladoB: { tipo: 'viceGrupo', grupo: 'F' } },
  { id: 'M77', cidade: 'Nova York/Nova Jersey', ladoA: { tipo: 'campeaoGrupo', grupo: 'I' }, ladoB: { tipo: 'melhorTerceiro', grupos: ['C', 'D', 'F', 'G', 'H'] } },
  { id: 'M78', cidade: 'Dallas', ladoA: { tipo: 'viceGrupo', grupo: 'E' }, ladoB: { tipo: 'viceGrupo', grupo: 'I' } },
  { id: 'M79', cidade: 'Cidade do México', ladoA: { tipo: 'campeaoGrupo', grupo: 'A' }, ladoB: { tipo: 'melhorTerceiro', grupos: ['C', 'E', 'F', 'H', 'I'] } },
  { id: 'M80', cidade: 'Atlanta', ladoA: { tipo: 'campeaoGrupo', grupo: 'L' }, ladoB: { tipo: 'melhorTerceiro', grupos: ['E', 'H', 'I', 'J', 'K'] } },
  { id: 'M81', cidade: 'São Francisco', ladoA: { tipo: 'campeaoGrupo', grupo: 'D' }, ladoB: { tipo: 'melhorTerceiro', grupos: ['B', 'E', 'F', 'I', 'J'] } },
  { id: 'M82', cidade: 'Seattle', ladoA: { tipo: 'campeaoGrupo', grupo: 'G' }, ladoB: { tipo: 'melhorTerceiro', grupos: ['A', 'E', 'H', 'I', 'J'] } },
  { id: 'M83', cidade: 'Toronto', ladoA: { tipo: 'viceGrupo', grupo: 'K' }, ladoB: { tipo: 'viceGrupo', grupo: 'L' } },
  { id: 'M84', cidade: 'Los Angeles', ladoA: { tipo: 'campeaoGrupo', grupo: 'H' }, ladoB: { tipo: 'viceGrupo', grupo: 'J' } },
  { id: 'M85', cidade: 'Vancouver', ladoA: { tipo: 'campeaoGrupo', grupo: 'B' }, ladoB: { tipo: 'melhorTerceiro', grupos: ['E', 'F', 'G', 'I', 'J'] } },
  { id: 'M86', cidade: 'Miami', ladoA: { tipo: 'campeaoGrupo', grupo: 'J' }, ladoB: { tipo: 'viceGrupo', grupo: 'H' } },
  { id: 'M87', cidade: 'Kansas City', ladoA: { tipo: 'campeaoGrupo', grupo: 'K' }, ladoB: { tipo: 'melhorTerceiro', grupos: ['D', 'E', 'I', 'J', 'L'] } },
  { id: 'M88', cidade: 'Atlanta', ladoA: { tipo: 'viceGrupo', grupo: 'D' }, ladoB: { tipo: 'viceGrupo', grupo: 'G' } },
];

export const OITAVOS_FINAL = [
  { id: 'M89', cidade: 'Filadélfia', ladoA: { tipo: 'vencedor', jogo: 'M74' }, ladoB: { tipo: 'vencedor', jogo: 'M77' } },
  { id: 'M90', cidade: 'Houston', ladoA: { tipo: 'vencedor', jogo: 'M73' }, ladoB: { tipo: 'vencedor', jogo: 'M75' } },
  { id: 'M91', cidade: 'Nova York/Nova Jersey', ladoA: { tipo: 'vencedor', jogo: 'M76' }, ladoB: { tipo: 'vencedor', jogo: 'M78' } },
  { id: 'M92', cidade: 'Cidade do México', ladoA: { tipo: 'vencedor', jogo: 'M79' }, ladoB: { tipo: 'vencedor', jogo: 'M80' } },
  { id: 'M93', cidade: 'Dallas', ladoA: { tipo: 'vencedor', jogo: 'M83' }, ladoB: { tipo: 'vencedor', jogo: 'M84' } },
  { id: 'M94', cidade: 'Seattle', ladoA: { tipo: 'vencedor', jogo: 'M81' }, ladoB: { tipo: 'vencedor', jogo: 'M82' } },
  { id: 'M95', cidade: 'Atlanta', ladoA: { tipo: 'vencedor', jogo: 'M86' }, ladoB: { tipo: 'vencedor', jogo: 'M88' } },
  { id: 'M96', cidade: 'Vancouver', ladoA: { tipo: 'vencedor', jogo: 'M85' }, ladoB: { tipo: 'vencedor', jogo: 'M87' } },
];

export const QUARTAS_DE_FINAL = [
  { id: 'M97', cidade: 'Boston', ladoA: { tipo: 'vencedor', jogo: 'M89' }, ladoB: { tipo: 'vencedor', jogo: 'M90' } },
  { id: 'M98', cidade: 'Los Angeles', ladoA: { tipo: 'vencedor', jogo: 'M93' }, ladoB: { tipo: 'vencedor', jogo: 'M94' } },
  { id: 'M99', cidade: 'Miami', ladoA: { tipo: 'vencedor', jogo: 'M91' }, ladoB: { tipo: 'vencedor', jogo: 'M92' } },
  { id: 'M100', cidade: 'Kansas City', ladoA: { tipo: 'vencedor', jogo: 'M95' }, ladoB: { tipo: 'vencedor', jogo: 'M96' } },
];

export const SEMIFINAIS = [
  { id: 'M101', cidade: 'Dallas', ladoA: { tipo: 'vencedor', jogo: 'M97' }, ladoB: { tipo: 'vencedor', jogo: 'M98' } },
  { id: 'M102', cidade: 'Atlanta', ladoA: { tipo: 'vencedor', jogo: 'M99' }, ladoB: { tipo: 'vencedor', jogo: 'M100' } },
];

export const DISPUTA_TERCEIRO = {
  id: 'M103', cidade: 'Miami', ladoA: { tipo: 'perdedor', jogo: 'M101' }, ladoB: { tipo: 'perdedor', jogo: 'M102' },
};

export const FINAL = {
  id: 'M104', cidade: 'East Rutherford (Nova Jersey)', ladoA: { tipo: 'vencedor', jogo: 'M101' }, ladoB: { tipo: 'vencedor', jogo: 'M102' },
};

export const FASES_MATA_MATA = [
  { id: 'fase32', nome: 'Fase de 32 (dezesseis-avos de final)', jogos: OITAVOS_DE_FINAL },
  { id: 'oitavos', nome: 'Oitavos de final', jogos: OITAVOS_FINAL },
  { id: 'quartas', nome: 'Quartas de final', jogos: QUARTAS_DE_FINAL },
  { id: 'semis', nome: 'Semifinais', jogos: SEMIFINAIS },
  { id: 'decisao', nome: 'Decisão', jogos: [DISPUTA_TERCEIRO, FINAL] },
];
