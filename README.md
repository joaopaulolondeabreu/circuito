# Simulador de Circuitos — ITA

Um simulador interativo de circuitos elétricos, feito para estudar para o
vestibular do **ITA**. Roda inteiramente no navegador (não precisa instalar
nada nem pagar nada) e é publicado de graça pelo **GitHub Pages**.

## O que ele faz

- Monte circuitos em **série, paralelo, misto, ponte (Wheatstone)** e associações
  quaisquer, clicando para posicionar os componentes.
- Componentes disponíveis: **resistor**, **fio ideal**, **fio real** (ρ, L, A → R),
  **gerador** (FEM ε e resistência interna r), **receptor** (FCEM ε′ e r),
  **capacitor**, **indutor**, **voltímetro**, **amperímetro** e **galvanômetro**
  (ideais ou reais).
- Calcula automaticamente: **diferenças de potencial, correntes, potências,
  resistência equivalente, força eletromotriz, carga e energia de capacitores,
  constante de tempo τ (carga/descarga)** e muito mais.
- **Trabalha com incógnitas:** você pode usar letras como valor (ex.: `R`, `E`,
  `R1`) tanto na calculadora quanto no próprio circuito, e os resultados saem
  **em função delas** (ex.: dois `R` em série com `E` → corrente `E/2R`).
- **Calculadora avulsa**: quando a questão dá só alguns valores soltos de um
  componente, você digita o que sabe e ela deduz o resto — mostrando as fórmulas.

A física por trás é a **Análise Nodal Modificada**, que aplica as Leis de Ohm e
de Kirchhoff de forma geral, resolvendo um sistema de equações para qualquer
circuito.

## Como usar (resumo)

1. Escolha um componente na barra da esquerda.
2. Clique em **dois pontos** do quadro (os dois terminais). Terminais no mesmo
   ponto se conectam — assim você cria nós e monta série/paralelo.
3. Clique em **“Selecionar / mover”**, depois clique num componente para editar
   seus valores no painel da direita.
4. Clique em **“Resolver circuito”**. Pronto: aparecem corrente, tensão e potência
   em cada componente.

Dica: nos campos de valor você pode usar prefixos — `1u` = 1 µF, `4k7` = 4700 Ω,
`2m` = 0,002.

## Onde fica o site publicado

Depois que a publicação automática roda (aba **Actions** do repositório no
GitHub), o endereço do site aparece como:

```
https://joaopaulolondeabreu.github.io/circuito/
```

## Estrutura do projeto (para quem tiver curiosidade)

| Arquivo | O que faz |
|---|---|
| `index.html` | A página em si (estrutura). |
| `css/styles.css` | A aparência (cores, layout). |
| `js/solver.js` | Resolve sistemas de equações lineares. |
| `js/engine.js` | O “cérebro”: monta e resolve o circuito (física). |
| `js/components.js` | Os componentes: símbolos e parâmetros. |
| `js/calculator.js` | A calculadora avulsa. |
| `js/ui.js` | A interface: desenhar, selecionar, mostrar resultados. |
| `js/app.js` | Liga tudo quando a página abre. |
| `tests/` | Testes automáticos que conferem se as contas estão certas. |

## Rodar e testar localmente (opcional)

```bash
# pré-visualizar o site
python3 -m http.server 8000
# depois abra http://localhost:8000 no navegador

# rodar os testes (precisa do Node.js)
node tests/engine.test.js
```
