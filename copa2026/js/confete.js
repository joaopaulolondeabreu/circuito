// Efeito de confetes simples em canvas, sem dependências externas.
export function dispararConfete(cores, duracaoMs = 4500) {
  const canvas = document.createElement('canvas');
  canvas.className = 'tela-confete';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const total = 160;
  const particulas = Array.from({ length: total }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.5,
    largura: 6 + Math.random() * 6,
    altura: 8 + Math.random() * 8,
    cor: cores[Math.floor(Math.random() * cores.length)],
    velocidadeY: 2 + Math.random() * 3,
    velocidadeX: -1.5 + Math.random() * 3,
    rotacao: Math.random() * Math.PI,
    velocidadeRotacao: -0.15 + Math.random() * 0.3,
  }));

  let ativo = true;
  function quadro() {
    if (!ativo) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particulas.forEach((p) => {
      p.x += p.velocidadeX;
      p.y += p.velocidadeY;
      p.rotacao += p.velocidadeRotacao;
      if (p.y > canvas.height + 20) p.y = -20;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotacao);
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.largura / 2, -p.altura / 2, p.largura, p.altura);
      ctx.restore();
    });
    requestAnimationFrame(quadro);
  }
  quadro();

  setTimeout(() => {
    ativo = false;
    canvas.remove();
  }, duracaoMs);
}
