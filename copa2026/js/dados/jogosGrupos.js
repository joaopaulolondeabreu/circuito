// Os 72 jogos da fase de grupos. Jogos que já têm `golsCasa`/`golsFora`
// preenchidos são tratados como RESULTADOS REAIS e ficam fixos (não editáveis).
// Jogos com gols = null estão em aberto para o usuário simular.
//
// Para "atualizar" um resultado real conforme as partidas terminam, basta
// editar os campos golsCasa/golsFora do jogo correspondente nesta lista —
// o site automaticamente passa a tratá-lo como fixo e recalcula tudo.
export const JOGOS_GRUPOS = [
  // Grupo A
  { id: 'A1', grupo: 'A', rodada: 1, data: '11/06', cidade: 'Cidade do México', casa: 'mx', fora: 'za', golsCasa: 2, golsFora: 0 },
  { id: 'A2', grupo: 'A', rodada: 1, data: '11/06', cidade: 'Zapopan', casa: 'kr', fora: 'cz', golsCasa: 2, golsFora: 1 },
  { id: 'A3', grupo: 'A', rodada: 2, data: '18/06', cidade: 'Monterrey', casa: 'cz', fora: 'za', golsCasa: 1, golsFora: 1 },
  { id: 'A4', grupo: 'A', rodada: 2, data: '18/06', cidade: 'Cidade do México', casa: 'mx', fora: 'kr', golsCasa: 1, golsFora: 0 },
  { id: 'A5', grupo: 'A', rodada: 3, data: '24/06', cidade: 'Cidade do México', casa: 'cz', fora: 'mx', golsCasa: null, golsFora: null },
  { id: 'A6', grupo: 'A', rodada: 3, data: '24/06', cidade: 'Monterrey', casa: 'za', fora: 'kr', golsCasa: null, golsFora: null },

  // Grupo B
  { id: 'B1', grupo: 'B', rodada: 1, data: '12/06', cidade: 'Toronto', casa: 'ca', fora: 'ba', golsCasa: 1, golsFora: 1 },
  { id: 'B2', grupo: 'B', rodada: 1, data: '13/06', cidade: 'Santa Clara', casa: 'ch', fora: 'qa', golsCasa: 1, golsFora: 1 },
  { id: 'B3', grupo: 'B', rodada: 2, data: '18/06', cidade: 'Santa Clara', casa: 'ch', fora: 'ba', golsCasa: 4, golsFora: 1 },
  { id: 'B4', grupo: 'B', rodada: 2, data: '18/06', cidade: 'Toronto', casa: 'ca', fora: 'qa', golsCasa: 6, golsFora: 0 },
  { id: 'B5', grupo: 'B', rodada: 3, data: '24/06', cidade: 'Vancouver', casa: 'ch', fora: 'ca', golsCasa: null, golsFora: null },
  { id: 'B6', grupo: 'B', rodada: 3, data: '24/06', cidade: 'Seattle', casa: 'ba', fora: 'qa', golsCasa: null, golsFora: null },

  // Grupo C
  { id: 'C1', grupo: 'C', rodada: 1, data: '13/06', cidade: 'East Rutherford', casa: 'br', fora: 'ma', golsCasa: 1, golsFora: 1 },
  { id: 'C2', grupo: 'C', rodada: 1, data: '13/06', cidade: 'Foxborough', casa: 'gb-sct', fora: 'ht', golsCasa: 1, golsFora: 0 },
  { id: 'C3', grupo: 'C', rodada: 2, data: '19/06', cidade: 'Foxborough', casa: 'ma', fora: 'gb-sct', golsCasa: 1, golsFora: 0 },
  { id: 'C4', grupo: 'C', rodada: 2, data: '19/06', cidade: 'Philadelphia', casa: 'br', fora: 'ht', golsCasa: 3, golsFora: 0 },
  { id: 'C5', grupo: 'C', rodada: 3, data: '24/06', cidade: 'Miami', casa: 'gb-sct', fora: 'br', golsCasa: null, golsFora: null },
  { id: 'C6', grupo: 'C', rodada: 3, data: '24/06', cidade: 'Atlanta', casa: 'ma', fora: 'ht', golsCasa: null, golsFora: null },

  // Grupo D
  { id: 'D1', grupo: 'D', rodada: 1, data: '12/06', cidade: 'Inglewood', casa: 'us', fora: 'py', golsCasa: 4, golsFora: 1 },
  { id: 'D2', grupo: 'D', rodada: 1, data: '13/06', cidade: 'Santa Clara', casa: 'au', fora: 'tr', golsCasa: 2, golsFora: 0 },
  { id: 'D3', grupo: 'D', rodada: 2, data: '19/06', cidade: 'Seattle', casa: 'us', fora: 'au', golsCasa: 2, golsFora: 0 },
  { id: 'D4', grupo: 'D', rodada: 2, data: '19/06', cidade: 'Santa Clara', casa: 'py', fora: 'tr', golsCasa: 1, golsFora: 0 },
  { id: 'D5', grupo: 'D', rodada: 3, data: '25/06', cidade: 'Inglewood', casa: 'tr', fora: 'us', golsCasa: null, golsFora: null },
  { id: 'D6', grupo: 'D', rodada: 3, data: '25/06', cidade: 'Santa Clara', casa: 'py', fora: 'au', golsCasa: null, golsFora: null },

  // Grupo E
  { id: 'E1', grupo: 'E', rodada: 1, data: '14/06', cidade: 'Houston', casa: 'de', fora: 'cw', golsCasa: 7, golsFora: 1 },
  { id: 'E2', grupo: 'E', rodada: 1, data: '14/06', cidade: 'Atlanta', casa: 'ci', fora: 'ec', golsCasa: 1, golsFora: 0 },
  { id: 'E3', grupo: 'E', rodada: 2, data: '20/06', cidade: 'Toronto', casa: 'de', fora: 'ci', golsCasa: 2, golsFora: 1 },
  { id: 'E4', grupo: 'E', rodada: 2, data: '20/06', cidade: 'Kansas City', casa: 'ec', fora: 'cw', golsCasa: null, golsFora: null },
  { id: 'E5', grupo: 'E', rodada: 3, data: '25/06', cidade: 'Philadelphia', casa: 'cw', fora: 'ci', golsCasa: null, golsFora: null },
  { id: 'E6', grupo: 'E', rodada: 3, data: '25/06', cidade: 'East Rutherford', casa: 'ec', fora: 'de', golsCasa: null, golsFora: null },

  // Grupo F
  { id: 'F1', grupo: 'F', rodada: 1, data: '14/06', cidade: 'Seattle', casa: 'nl', fora: 'jp', golsCasa: 2, golsFora: 2 },
  { id: 'F2', grupo: 'F', rodada: 1, data: '14/06', cidade: 'Dallas', casa: 'se', fora: 'tn', golsCasa: 5, golsFora: 1 },
  { id: 'F3', grupo: 'F', rodada: 2, data: '20/06', cidade: 'Houston', casa: 'nl', fora: 'se', golsCasa: 5, golsFora: 1 },
  { id: 'F4', grupo: 'F', rodada: 2, data: '20/06', cidade: 'Monterrey', casa: 'tn', fora: 'jp', golsCasa: null, golsFora: null },
  { id: 'F5', grupo: 'F', rodada: 3, data: '25/06', cidade: 'Arlington', casa: 'jp', fora: 'se', golsCasa: null, golsFora: null },
  { id: 'F6', grupo: 'F', rodada: 3, data: '25/06', cidade: 'Kansas City', casa: 'tn', fora: 'nl', golsCasa: null, golsFora: null },

  // Grupo G
  { id: 'G1', grupo: 'G', rodada: 1, data: '15/06', cidade: 'Atlanta', casa: 'be', fora: 'eg', golsCasa: 1, golsFora: 1 },
  { id: 'G2', grupo: 'G', rodada: 1, data: '15/06', cidade: 'Vancouver', casa: 'ir', fora: 'nz', golsCasa: 2, golsFora: 2 },
  { id: 'G3', grupo: 'G', rodada: 2, data: '21/06', cidade: 'Inglewood', casa: 'be', fora: 'ir', golsCasa: null, golsFora: null },
  { id: 'G4', grupo: 'G', rodada: 2, data: '21/06', cidade: 'Vancouver', casa: 'nz', fora: 'eg', golsCasa: null, golsFora: null },
  { id: 'G5', grupo: 'G', rodada: 3, data: '26/06', cidade: 'Seattle', casa: 'eg', fora: 'ir', golsCasa: null, golsFora: null },
  { id: 'G6', grupo: 'G', rodada: 3, data: '26/06', cidade: 'Vancouver', casa: 'nz', fora: 'be', golsCasa: null, golsFora: null },

  // Grupo H
  { id: 'H1', grupo: 'H', rodada: 1, data: '15/06', cidade: 'Miami', casa: 'es', fora: 'cv', golsCasa: 0, golsFora: 0 },
  { id: 'H2', grupo: 'H', rodada: 1, data: '15/06', cidade: 'Dallas', casa: 'sa', fora: 'uy', golsCasa: 1, golsFora: 1 },
  { id: 'H3', grupo: 'H', rodada: 2, data: '21/06', cidade: 'Atlanta', casa: 'es', fora: 'sa', golsCasa: null, golsFora: null },
  { id: 'H4', grupo: 'H', rodada: 2, data: '21/06', cidade: 'Miami', casa: 'uy', fora: 'cv', golsCasa: null, golsFora: null },
  { id: 'H5', grupo: 'H', rodada: 3, data: '26/06', cidade: 'Houston', casa: 'cv', fora: 'sa', golsCasa: null, golsFora: null },
  { id: 'H6', grupo: 'H', rodada: 3, data: '26/06', cidade: 'Guadalajara', casa: 'uy', fora: 'es', golsCasa: null, golsFora: null },

  // Grupo I
  { id: 'I1', grupo: 'I', rodada: 1, data: '16/06', cidade: 'East Rutherford', casa: 'fr', fora: 'sn', golsCasa: 3, golsFora: 1 },
  { id: 'I2', grupo: 'I', rodada: 1, data: '16/06', cidade: 'Seattle', casa: 'no', fora: 'iq', golsCasa: 4, golsFora: 1 },
  { id: 'I3', grupo: 'I', rodada: 2, data: '22/06', cidade: 'Philadelphia', casa: 'fr', fora: 'iq', golsCasa: null, golsFora: null },
  { id: 'I4', grupo: 'I', rodada: 2, data: '22/06', cidade: 'East Rutherford', casa: 'no', fora: 'sn', golsCasa: null, golsFora: null },
  { id: 'I5', grupo: 'I', rodada: 3, data: '26/06', cidade: 'Foxborough', casa: 'no', fora: 'fr', golsCasa: null, golsFora: null },
  { id: 'I6', grupo: 'I', rodada: 3, data: '26/06', cidade: 'Toronto', casa: 'sn', fora: 'iq', golsCasa: null, golsFora: null },

  // Grupo J
  { id: 'J1', grupo: 'J', rodada: 1, data: '16/06', cidade: 'Kansas City', casa: 'ar', fora: 'dz', golsCasa: 3, golsFora: 0 },
  { id: 'J2', grupo: 'J', rodada: 1, data: '16/06', cidade: 'Inglewood', casa: 'at', fora: 'jo', golsCasa: 3, golsFora: 1 },
  { id: 'J3', grupo: 'J', rodada: 2, data: '22/06', cidade: 'Arlington', casa: 'ar', fora: 'at', golsCasa: null, golsFora: null },
  { id: 'J4', grupo: 'J', rodada: 2, data: '22/06', cidade: 'Inglewood', casa: 'dz', fora: 'jo', golsCasa: null, golsFora: null },
  { id: 'J5', grupo: 'J', rodada: 3, data: '27/06', cidade: 'Kansas City', casa: 'dz', fora: 'at', golsCasa: null, golsFora: null },
  { id: 'J6', grupo: 'J', rodada: 3, data: '27/06', cidade: 'Arlington', casa: 'jo', fora: 'ar', golsCasa: null, golsFora: null },

  // Grupo K
  { id: 'K1', grupo: 'K', rodada: 1, data: '17/06', cidade: 'Houston', casa: 'pt', fora: 'cd', golsCasa: 1, golsFora: 1 },
  { id: 'K2', grupo: 'K', rodada: 1, data: '17/06', cidade: 'Cidade do México', casa: 'co', fora: 'uz', golsCasa: 3, golsFora: 1 },
  { id: 'K3', grupo: 'K', rodada: 2, data: '23/06', cidade: 'Houston', casa: 'pt', fora: 'uz', golsCasa: null, golsFora: null },
  { id: 'K4', grupo: 'K', rodada: 2, data: '23/06', cidade: 'Guadalajara', casa: 'co', fora: 'cd', golsCasa: null, golsFora: null },
  { id: 'K5', grupo: 'K', rodada: 3, data: '27/06', cidade: 'Miami', casa: 'co', fora: 'pt', golsCasa: null, golsFora: null },
  { id: 'K6', grupo: 'K', rodada: 3, data: '27/06', cidade: 'Atlanta', casa: 'cd', fora: 'uz', golsCasa: null, golsFora: null },

  // Grupo L
  { id: 'L1', grupo: 'L', rodada: 1, data: '17/06', cidade: 'Arlington', casa: 'gb-eng', fora: 'hr', golsCasa: 4, golsFora: 2 },
  { id: 'L2', grupo: 'L', rodada: 1, data: '17/06', cidade: 'Toronto', casa: 'gh', fora: 'pa', golsCasa: 1, golsFora: 0 },
  { id: 'L3', grupo: 'L', rodada: 2, data: '23/06', cidade: 'Foxborough', casa: 'gb-eng', fora: 'gh', golsCasa: null, golsFora: null },
  { id: 'L4', grupo: 'L', rodada: 2, data: '23/06', cidade: 'Toronto', casa: 'pa', fora: 'hr', golsCasa: null, golsFora: null },
  { id: 'L5', grupo: 'L', rodada: 3, data: '27/06', cidade: 'East Rutherford', casa: 'pa', fora: 'gb-eng', golsCasa: null, golsFora: null },
  { id: 'L6', grupo: 'L', rodada: 3, data: '27/06', cidade: 'Philadelphia', casa: 'hr', fora: 'gh', golsCasa: null, golsFora: null },
];
