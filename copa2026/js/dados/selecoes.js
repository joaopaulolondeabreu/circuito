// Dados das 48 seleções: grupo, bandeira (código usado pela flagcdn.com) e
// cores principais (usadas na animação de campeão / confetes).
export const SELECOES = {
  // Grupo A
  mx: { nome: 'México', grupo: 'A', bandeira: 'mx', cor1: '#006847', cor2: '#CE1126' },
  za: { nome: 'África do Sul', grupo: 'A', bandeira: 'za', cor1: '#007A4D', cor2: '#FFB81C' },
  kr: { nome: 'Coreia do Sul', grupo: 'A', bandeira: 'kr', cor1: '#CD2E3A', cor2: '#0047A0' },
  cz: { nome: 'Tchéquia', grupo: 'A', bandeira: 'cz', cor1: '#D7141A', cor2: '#11457E' },

  // Grupo B
  ca: { nome: 'Canadá', grupo: 'B', bandeira: 'ca', cor1: '#D80621', cor2: '#FFFFFF' },
  ba: { nome: 'Bósnia e Herzegovina', grupo: 'B', bandeira: 'ba', cor1: '#002395', cor2: '#FECB00' },
  qa: { nome: 'Catar', grupo: 'B', bandeira: 'qa', cor1: '#8A1538', cor2: '#FFFFFF' },
  ch: { nome: 'Suíça', grupo: 'B', bandeira: 'ch', cor1: '#D52B1E', cor2: '#FFFFFF' },

  // Grupo C
  br: { nome: 'Brasil', grupo: 'C', bandeira: 'br', cor1: '#009C3B', cor2: '#FFDF00' },
  ma: { nome: 'Marrocos', grupo: 'C', bandeira: 'ma', cor1: '#C1272D', cor2: '#006233' },
  ht: { nome: 'Haiti', grupo: 'C', bandeira: 'ht', cor1: '#00209F', cor2: '#D21034' },
  'gb-sct': { nome: 'Escócia', grupo: 'C', bandeira: 'gb-sct', cor1: '#005EB8', cor2: '#FFFFFF' },

  // Grupo D
  us: { nome: 'Estados Unidos', grupo: 'D', bandeira: 'us', cor1: '#B31942', cor2: '#0A3161' },
  py: { nome: 'Paraguai', grupo: 'D', bandeira: 'py', cor1: '#D52B1E', cor2: '#0038A8' },
  au: { nome: 'Austrália', grupo: 'D', bandeira: 'au', cor1: '#012169', cor2: '#E4002B' },
  tr: { nome: 'Turquia', grupo: 'D', bandeira: 'tr', cor1: '#E30A17', cor2: '#FFFFFF' },

  // Grupo E
  de: { nome: 'Alemanha', grupo: 'E', bandeira: 'de', cor1: '#000000', cor2: '#DD0000' },
  cw: { nome: 'Curaçao', grupo: 'E', bandeira: 'cw', cor1: '#002B7F', cor2: '#FCD116' },
  ci: { nome: 'Costa do Marfim', grupo: 'E', bandeira: 'ci', cor1: '#F77F00', cor2: '#009E60' },
  ec: { nome: 'Equador', grupo: 'E', bandeira: 'ec', cor1: '#FFDD00', cor2: '#0038A8' },

  // Grupo F
  nl: { nome: 'Holanda', grupo: 'F', bandeira: 'nl', cor1: '#AE1C28', cor2: '#21468B' },
  jp: { nome: 'Japão', grupo: 'F', bandeira: 'jp', cor1: '#BC002D', cor2: '#FFFFFF' },
  se: { nome: 'Suécia', grupo: 'F', bandeira: 'se', cor1: '#006AA7', cor2: '#FECC02' },
  tn: { nome: 'Tunísia', grupo: 'F', bandeira: 'tn', cor1: '#E70013', cor2: '#FFFFFF' },

  // Grupo G
  be: { nome: 'Bélgica', grupo: 'G', bandeira: 'be', cor1: '#000000', cor2: '#FAE042' },
  eg: { nome: 'Egito', grupo: 'G', bandeira: 'eg', cor1: '#CE1126', cor2: '#000000' },
  ir: { nome: 'Irã', grupo: 'G', bandeira: 'ir', cor1: '#239F40', cor2: '#DA0000' },
  nz: { nome: 'Nova Zelândia', grupo: 'G', bandeira: 'nz', cor1: '#00247D', cor2: '#CC142B' },

  // Grupo H
  es: { nome: 'Espanha', grupo: 'H', bandeira: 'es', cor1: '#FFC400', cor2: '#AA151B' },
  cv: { nome: 'Cabo Verde', grupo: 'H', bandeira: 'cv', cor1: '#003893', cor2: '#CF2027' },
  sa: { nome: 'Arábia Saudita', grupo: 'H', bandeira: 'sa', cor1: '#006C35', cor2: '#FFFFFF' },
  uy: { nome: 'Uruguai', grupo: 'H', bandeira: 'uy', cor1: '#5C9DD5', cor2: '#FCD116' },

  // Grupo I
  fr: { nome: 'França', grupo: 'I', bandeira: 'fr', cor1: '#0055A4', cor2: '#EF4135' },
  sn: { nome: 'Senegal', grupo: 'I', bandeira: 'sn', cor1: '#00853F', cor2: '#FDEF42' },
  iq: { nome: 'Iraque', grupo: 'I', bandeira: 'iq', cor1: '#CE1126', cor2: '#000000' },
  no: { nome: 'Noruega', grupo: 'I', bandeira: 'no', cor1: '#BA0C2F', cor2: '#00205B' },

  // Grupo J
  ar: { nome: 'Argentina', grupo: 'J', bandeira: 'ar', cor1: '#75AADB', cor2: '#FCBF49' },
  dz: { nome: 'Argélia', grupo: 'J', bandeira: 'dz', cor1: '#006233', cor2: '#D21034' },
  at: { nome: 'Áustria', grupo: 'J', bandeira: 'at', cor1: '#ED2939', cor2: '#FFFFFF' },
  jo: { nome: 'Jordânia', grupo: 'J', bandeira: 'jo', cor1: '#000000', cor2: '#007A3D' },

  // Grupo K
  pt: { nome: 'Portugal', grupo: 'K', bandeira: 'pt', cor1: '#DA291C', cor2: '#006233' },
  cd: { nome: 'RD Congo', grupo: 'K', bandeira: 'cd', cor1: '#007FFF', cor2: '#F7D618' },
  uz: { nome: 'Uzbequistão', grupo: 'K', bandeira: 'uz', cor1: '#0099B5', cor2: '#1EB53A' },
  co: { nome: 'Colômbia', grupo: 'K', bandeira: 'co', cor1: '#FCD116', cor2: '#003893' },

  // Grupo L
  'gb-eng': { nome: 'Inglaterra', grupo: 'L', bandeira: 'gb-eng', cor1: '#CE1124', cor2: '#FFFFFF' },
  hr: { nome: 'Croácia', grupo: 'L', bandeira: 'hr', cor1: '#FF0000', cor2: '#171796' },
  gh: { nome: 'Gana', grupo: 'L', bandeira: 'gh', cor1: '#CE1126', cor2: '#006B3F' },
  pa: { nome: 'Panamá', grupo: 'L', bandeira: 'pa', cor1: '#DA121A', cor2: '#072357' },
};

export const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export function timesDoGrupo(grupo) {
  return Object.entries(SELECOES)
    .filter(([, t]) => t.grupo === grupo)
    .map(([id, t]) => ({ id, ...t }));
}

export function urlBandeira(codigo, largura = 80) {
  return `https://flagcdn.com/w${largura}/${codigo}.png`;
}
