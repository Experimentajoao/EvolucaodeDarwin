/**
 * SIMULADOR DE EVOLUÇÃO DARWINIANA - script.js
 * Objetivo: Simular seleção natural baseada em cor, tamanho e formato.
 */

const canvas = document.getElementById('canvasEvolucao');
const ctx = canvas.getContext('2d');
const genDisplay = document.getElementById('gen-count');

// Configurações de escala do Canvas
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

const centroX = canvas.width / 2;
const centroY = canvas.height / 2;
const raioMundo = canvas.width / 2;

// Variáveis de Estado da Simulação
let populacao = [];
let predador;
let geracao = 1;
let emExecucao = true;
let velocidadeDupla = false; // <-- NOVA: Controle de velocidade
const tamanhoPopulacao = 45;

// Elementos de Interface
const sliderCorAmbiente = document.getElementById('corAmbiente');
const sliderMutacao = document.getElementById('taxaMutacao');
const btnPausar = document.getElementById('btnPausar');
const btnVelocidade = document.getElementById('btnVelocidade'); // <-- NOVO: Referência ao botão

/**
 * Calcula a diferença entre dois matizes (0-360) considerando a roda de cores.
 */
function diferencaCor(dna1, dna2) {
    let diff = Math.abs(dna1 - dna2);
    if (diff > 180) diff = 360 - diff;
    return diff;
}

// ----------------------------------------------------
// DNA MULTI-CARACTERÍSTICA (Presa)
// ----------------------------------------------------
class Organismo {
    constructor(x, y, corDna, tamanhoRaio, formato) {
        this.x = x;
        this.y = y;
        this.dna = corDna;
        this.cor = `hsl(${this.dna}, 90%, 50%)`;
        this.raio = tamanhoRaio; 
        this.formato = formato;  
        
        // Dinâmica: Organismos maiores são levemente mais lentos
        let pesoVelocidade = 30 / this.raio; 
        this.velocidadeX = (Math.random() - 0.5) * pesoVelocidade;
        this.velocidadeY = (Math.random() - 0.5) * pesoVelocidade;
    }

    desenhar() {
        ctx.fillStyle = this.cor;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.beginPath();

        if (this.formato === 'circulo') {
            ctx.arc(this.x, this.y, this.raio, 0, Math.PI * 2);
        } else if (this.formato === 'quadrado') {
            ctx.rect(this.x - this.raio, this.y - this.raio, this.raio * 2, this.raio * 2);
        } else if (this.formato === 'triangulo') {
            ctx.moveTo(this.x, this.y - this.raio);
            ctx.lineTo(this.x + this.raio, this.y + this.raio);
            ctx.lineTo(this.x - this.raio, this.y + this.raio);
            ctx.closePath();
        }

        ctx.fill();
        ctx.stroke();
    }

    atualizar() {
        this.x += this.velocidadeX;
        this.y += this.velocidadeY;

        // Colisão com as bordas do mundo circular (Placa de Petri)
        let distParaCentro = Math.hypot(this.x - centroX, this.y - centroY);
        if (distParaCentro > raioMundo - this.raio) {
            let angulo = Math.atan2(this.y - centroY, this.x - centroX);
            this.x = centroX + Math.cos(angulo) * (raioMundo - this.raio - 1);
            this.y = centroY + Math.sin(angulo) * (raioMundo - this.raio - 1);
            this.velocidadeX *= -1;
            this.velocidadeY *= -1;
        }
    }
}

// ----------------------------------------------------
// PREDADOR
// ----------------------------------------------------
class Predador {
    constructor() {
        this.x = centroX;
        this.y = centroY;
        this.raio = 25; 
        this.limiteBoca = 18; // Só come presas menores que 18
        this.velocidade = 1.2;
        this.anguloVisao = 0;
    }

    desenhar() {
        const tempo = Date.now() * 0.005;
        const aberturaBoca = Math.abs(Math.sin(tempo)) * 0.6; 

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.raio, this.anguloVisao + aberturaBoca, this.anguloVisao + Math.PI * 2 - aberturaBoca);
        ctx.lineTo(this.x, this.y);
        ctx.fillStyle = "#1e293b"; 
        ctx.fill();
        ctx.closePath();
    }

    atualizar(corFundo) {
        if (populacao.length === 0) return;

        let alvo = null;
        let maiorContraste = -1;

        for (let org of populacao) {
            if (org.raio > this.limiteBoca) continue; 

            let contraste = diferencaCor(org.dna, corFundo);
            if (contraste > maiorContraste) {
                maiorContraste = contraste;
                alvo = org;
            }
        }

        if (alvo) {
            let dx = alvo.x - this.x;
            let dy = alvo.y - this.y;
            let distancia = Math.hypot(dx, dy);

            this.anguloVisao = Math.atan2(dy, dx);

            if (distancia < this.raio + alvo.raio) {
                let index = populacao.indexOf(alvo);
                if (index > -1) populacao.splice(index, 1);
            } else {
                this.x += (dx / distancia) * this.velocidade;
                this.y += (dy / distancia) * this.velocidade;
            }
        }
    }
}

// ----------------------------------------------------
// LÓGICA DE EVOLUÇÃO E LOOP
// ----------------------------------------------------
const formasDisponiveis = ['circulo', 'quadrado', 'triangulo'];

function criarPopulacaoInicial() {
    populacao = [];
    predador = new Predador();
    for (let i = 0; i < tamanhoPopulacao; i++) {
        let dnaAleatorio = Math.floor(Math.random() * 360);
        populacao.push(new Organismo(
            centroX + (Math.random() - 0.5) * 100,
            centroY + (Math.random() - 0.5) * 100,
            dnaAleatorio,
            10, // Tamanho inicial
            'circulo'
        ));
    }
}

function evoluir() {
    const taxaMutacao = parseInt(sliderMutacao.value);
    if (populacao.length === 0) return criarPopulacaoInicial();

    const sobreviventes = [...populacao];
    const novaGeracao = [];

    while (novaGeracao.length < tamanhoPopulacao) {
        const pai = sobreviventes[Math.floor(Math.random() * sobreviventes.length)];
        
        let novoDna = pai.dna;
        let novoTamanho = pai.raio;
        let novoFormato = pai.formato;

        if (Math.random() * 100 < taxaMutacao) {
            novoDna += (Math.random() - 0.5) * 80; 
            if (novoDna < 0) novoDna += 360;
            if (novoDna > 360) novoDna -= 360;

            novoTamanho += (Math.random() - 0.2) * 8; 
            novoTamanho = Math.max(6, Math.min(25, novoTamanho));

            novoFormato = formasDisponiveis[Math.floor(Math.random() * formasDisponiveis.length)];
        }

        novaGeracao.push(new Organismo(
            pai.x + (Math.random() - 0.5) * 40, 
            pai.y + (Math.random() - 0.5) * 40,
            novoDna,
            novoTamanho,
            novoFormato
        ));
    }

    populacao = novaGeracao;
    geracao++;
    genDisplay.innerText = geracao;
}

function loop() {
    if (emExecucao) {
        const matizFundo = parseInt(sliderCorAmbiente.value);

        // Sub-stepping: Se a velocidade for dupla, processamos a lógica 2 vezes
        let passos = velocidadeDupla ? 2 : 1;
        for (let i = 0; i < passos; i++) {
            predador.atualizar(matizFundo);
            populacao.forEach(org => org.atualizar());
        }

        // Renderização (Desenho) - ocorre sempre 1 vez para performance
        ctx.fillStyle = `hsl(${matizFundo}, 70%, 65%)`; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        predador.desenhar();
        populacao.forEach(org => org.desenhar());
    }
    requestAnimationFrame(loop);
}

// ----------------------------------------------------
// LISTENERS (CONTROLES)
// ----------------------------------------------------
btnPausar.onclick = () => {
    emExecucao = !emExecucao;
    btnPausar.innerText = emExecucao ? "Pausar Simulação" : "Retomar Simulação";
    btnPausar.style.backgroundColor = emExecucao ? "var(--danger-color)" : "#f59e0b";
};

// Lógica do botão de Velocidade 2x
btnVelocidade.onclick = () => {
    velocidadeDupla = !velocidadeDupla;
    btnVelocidade.innerText = velocidadeDupla ? "Velocidade: 2x" : "Velocidade: 1x";
    btnVelocidade.style.backgroundColor = velocidadeDupla ? "#4f46e5" : "#1e293b";
};

document.getElementById('btnProximaGen').onclick = () => {
    evoluir(); 
};

document.getElementById('btnReiniciar').onclick = () => {
    geracao = 1;
    genDisplay.innerText = geracao;
    criarPopulacaoInicial();
};

// Inicialização
criarPopulacaoInicial();
loop();
