import { SELECOES, urlBandeira } from './dados/selecoes.js';

export function criar(tag, propriedades = {}, filhos = []) {
  const el = document.createElement(tag);
  Object.entries(propriedades).forEach(([chave, valor]) => {
    if (chave === 'class') el.className = valor;
    else if (chave === 'texto') el.textContent = valor;
    else if (chave.startsWith('on') && typeof valor === 'function') el.addEventListener(chave.slice(2), valor);
    else el.setAttribute(chave, valor);
  });
  filhos.forEach((filho) => {
    if (filho) el.appendChild(typeof filho === 'string' ? document.createTextNode(filho) : filho);
  });
  return el;
}

export function bandeiraImg(idTime, tamanho = 36) {
  const time = SELECOES[idTime];
  return criar('img', {
    class: 'bandeira',
    src: urlBandeira(time.bandeira, 80),
    alt: `Bandeira: ${time.nome}`,
    style: `width:${tamanho}px;height:${Math.round(tamanho * 0.7)}px`,
    loading: 'lazy',
  });
}

export function blocoTime(idTime, tamanho = 36) {
  const time = SELECOES[idTime];
  return criar('div', { class: 'time' }, [
    bandeiraImg(idTime, tamanho),
    criar('span', { class: 'nome-time', texto: time.nome }),
  ]);
}

export function blocoPlaceholder(texto) {
  return criar('div', { class: 'time time-indefinido' }, [
    criar('span', { class: 'bandeira bandeira-vazia' }),
    criar('span', { class: 'nome-time nome-indefinido', texto }),
  ]);
}

export function descricaoMelhorTerceiro(grupos) {
  return `Melhor 3º colocado entre os grupos ${grupos.join(', ')}`;
}

export function inputPlacar(valorInicial) {
  return criar('input', {
    type: 'number',
    min: '0',
    max: '99',
    inputmode: 'numeric',
    class: 'input-placar',
    value: valorInicial != null ? String(valorInicial) : '',
    placeholder: '-',
  });
}
