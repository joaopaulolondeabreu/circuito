import { getEstado } from './estado.js';
import { renderizarResultados } from './telaResultados.js';
import { renderizarSimular } from './telaSimular.js';
import { renderizarMataMata } from './telaMataMata.js';

const ABAS = [
  { id: 'resultados', rotulo: 'Resultados anteriores' },
  { id: 'simular', rotulo: 'Simule um resultado' },
];

let abaAtual = 'resultados';

const navegacao = document.getElementById('navegacao');
const conteudo = document.getElementById('conteudo');

function renderizarNavegacao() {
  navegacao.innerHTML = '';
  ABAS.forEach((aba) => {
    const botao = document.createElement('button');
    botao.className = `aba${aba.id === abaAtual ? ' aba-ativa' : ''}`;
    botao.textContent = aba.rotulo;
    botao.addEventListener('click', () => {
      abaAtual = aba.id;
      renderizar();
    });
    navegacao.appendChild(botao);
  });
}

function renderizar() {
  renderizarNavegacao();
  conteudo.innerHTML = '';

  if (abaAtual === 'resultados') {
    renderizarResultados(conteudo);
    return;
  }

  const estado = getEstado();
  if (!estado.faseGruposConfirmada) {
    renderizarSimular(conteudo, renderizar);
  } else {
    renderizarMataMata(conteudo, renderizar);
  }
}

renderizar();
