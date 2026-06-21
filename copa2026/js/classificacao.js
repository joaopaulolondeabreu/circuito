// Cálculo da classificação de um grupo, seguindo os critérios de
// desempate da Copa do Mundo 2026: 1) pontos, 2) confronto direto entre
// empatados (pontos, saldo, gols), 3) saldo de gols geral, 4) gols
// marcados geral, 5) ordem alfabética (critério final estável, já que não
// há dados de cartões/ranking FIFA nesta simulação).

function tabelaVazia(id) {
  return { id, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0 };
}

function aplicarResultado(tabela, time, marcou, sofreu) {
  tabela.jogos += 1;
  tabela.golsPro += marcou;
  tabela.golsContra += sofreu;
  tabela.saldo = tabela.golsPro - tabela.golsContra;
  if (marcou > sofreu) { tabela.vitorias += 1; tabela.pontos += 3; }
  else if (marcou === sofreu) { tabela.empates += 1; tabela.pontos += 1; }
  else { tabela.derrotas += 1; }
}

// Calcula a tabela de um grupo a partir dos jogos (alguns podem não ter
// gols ainda, nesse caso simplesmente não contam para a tabela).
export function calcularTabelaGrupo(idsTimes, jogos) {
  const tabela = {};
  idsTimes.forEach((id) => { tabela[id] = tabelaVazia(id); });

  const jogosComResultado = jogos.filter((j) => j.golsCasa != null && j.golsFora != null);
  jogosComResultado.forEach((j) => {
    aplicarResultado(tabela[j.casa], j.casa, j.golsCasa, j.golsFora);
    aplicarResultado(tabela[j.fora], j.fora, j.golsFora, j.golsCasa);
  });

  function confrontoDireto(empatados) {
    const mini = {};
    empatados.forEach((id) => { mini[id] = tabelaVazia(id); });
    jogosComResultado
      .filter((j) => empatados.includes(j.casa) && empatados.includes(j.fora))
      .forEach((j) => {
        aplicarResultado(mini[j.casa], j.casa, j.golsCasa, j.golsFora);
        aplicarResultado(mini[j.fora], j.fora, j.golsFora, j.golsCasa);
      });
    return mini;
  }

  const lista = Object.values(tabela);
  lista.sort((a, b) => {
    if (a.pontos !== b.pontos) return b.pontos - a.pontos;
    const empatados = lista.filter((t) => t.pontos === a.pontos).map((t) => t.id);
    if (empatados.length > 1) {
      const mini = confrontoDireto(empatados);
      const ma = mini[a.id];
      const mb = mini[b.id];
      if (ma.pontos !== mb.pontos) return mb.pontos - ma.pontos;
      if (ma.saldo !== mb.saldo) return mb.saldo - ma.saldo;
      if (ma.golsPro !== mb.golsPro) return mb.golsPro - ma.golsPro;
    }
    if (a.saldo !== b.saldo) return b.saldo - a.saldo;
    if (a.golsPro !== b.golsPro) return b.golsPro - a.golsPro;
    return a.id.localeCompare(b.id);
  });

  return lista;
}

// Critério oficial para ordenar os 12 terceiros colocados entre si (sem
// confronto direto, pois vêm de grupos diferentes): pontos, saldo, gols
// marcados, ordem alfabética.
export function compararTerceiros(a, b) {
  if (a.pontos !== b.pontos) return b.pontos - a.pontos;
  if (a.saldo !== b.saldo) return b.saldo - a.saldo;
  if (a.golsPro !== b.golsPro) return b.golsPro - a.golsPro;
  return a.id.localeCompare(b.id);
}
