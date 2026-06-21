import { SELECOES, urlBandeira } from './dados/selecoes.js';
import { dispararConfete } from './confete.js';

export function mostrarCelebracaoCampeao(idTime) {
  const time = SELECOES[idTime];

  const overlay = document.createElement('div');
  overlay.className = 'overlay-campeao';

  const bandeira = document.createElement('img');
  bandeira.src = urlBandeira(time.bandeira, 320);
  bandeira.alt = time.nome;
  bandeira.className = 'bandeira-campea';

  const titulo = document.createElement('h1');
  titulo.className = 'titulo-campeao';
  titulo.textContent = `${time.nome} campeão!`;

  const subtitulo = document.createElement('p');
  subtitulo.className = 'subtitulo-campeao';
  subtitulo.textContent = 'Campeão da Copa do Mundo FIFA 2026 (segundo a sua simulação)';

  const fechar = document.createElement('button');
  fechar.className = 'botao-fechar-celebracao';
  fechar.textContent = 'Fechar';
  fechar.addEventListener('click', () => overlay.remove());

  overlay.append(bandeira, titulo, subtitulo, fechar);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('ativo'));
  dispararConfete([time.cor1, time.cor2], 6000);
}
