const canvas = document.getElementById('canvasEvolucao');
const ctx = canvas.getContext('2d');
const genDisplay = document.getElementById('gen-count');

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

const centroX = canvas.width / 2;
const centroY = canvas.height / 2;
const raioMundo = canvas.width / 2;

let populacao = [];
let predador;
let geracao = 1;
let emExecucao = true;
const tamanhoPopulacao = 45;

const sliderCorAmbiente = document.getElementById('corAmbiente');
const sliderMutacao = document.getElementById('taxaMutacao');
const btnPausar = document.getElementById('btnPausar');

function diferencaCor(dna1, dna2) {
    let diff = Math.abs(dna1 - dna2);
    if (diff > 180) diff = 360 - diff;
    return diff;
}

// ----------------------------------------------------
// DNA MULTI-CARACTERÍSTICA (Presa)
// ----------------------------------------------------
class Organismo {
    // Agora o construtor recebe cor, tamanho e formato
    constructor(x, y, corDna, tamanhoRaio, formato) {
        this.x = x;
        this.y = y;
        this.dna = corDna;
        this.cor = `hsl(${this.dna}, 90%, 50%)`;
        this.raio = tamanhoRaio; // Tamanho determina se pode ser comido
        this.formato = formato;  // 'circulo', 'quadrado', 'triangulo'
        
        // Bichos maiores se movem um pouco mais devagar
        let pesoVelocidade = 30 / this.raio; 
        this.velocidadeX = (Math.random() - 0.5) * pesoVelocidade;
        this.velocidadeY = (Math.random() - 0.5) * pesoVelocidade;
    }

    desenhar() {
        ctx.fillStyle = this.cor;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.beginPath();

        // Desenha baseado no gene do formato
        if (this.formato === 'circulo') {
            ctx.arc(this.x, this.y, this.raio, 0, Math.PI * 2);
        } else if (this.formato === 'quadrado') {
            ctx.rect(this.x - this.raio, this.y - this.raio, this.raio * 2, this.raio * 2);
        } else if (this.formato === 'triangulo') {
            ctx.moveTo(this.x, this.y - this.raio); // Topo
            ctx.lineTo(this.x + this.raio, this.y + this.raio); // Baixo Direita
            ctx.lineTo(this.x - this.raio, this.y + this.raio); // Baixo Esquerda
            ctx.closePath();
        }

        ctx.fill();
        ctx.stroke();
    }

    atualizar() {
        this.x += this.velocidadeX;
        this.y += this.velocidadeY;

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
// PREDADOR COM LIMITE DE TAMANHO
// ----------------------------------------------------
class Predador {
    constructor() {
        this.x = centroX;
        this.y = centroY;
        this.raio = 25; // O Predador tem tamanho 25
        this.limiteBoca = 18; // REGRA: Não consegue comer presas com raio > 18
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
            // NOVA REGRA DE SOBREVIVÊNCIA: Se for muito grande, o predador ignora!
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
// LÓGICA DE EVOLUÇÃO E MUTAÇÕES ÓBVIAS
// ----------------------------------------------------
const formasDisponiveis = ['circulo', 'quadrado', 'triangulo'];

function criarPopulacaoInicial() {
    populacao = [];
    predador = new Predador();
    for (let i = 0; i < tamanhoPopulacao; i++) {
        let dnaAleatorio = Math.floor(Math.random() * 360);
        let tamanhoBase = 10; // Nascem pequenos inicialmente
        
        populacao.push(new Organismo(
            centroX + (Math.random() - 0.5) * 100,
            centroY + (Math.random() - 0.5) * 100,
            dnaAleatorio,
            tamanhoBase,
            'circulo' // Começam todos círculos
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
        
        // Herança de características
        let novoDna = pai.dna;
        let novoTamanho = pai.raio;
        let novoFormato = pai.formato;

        // Se houver mutação, alteramos as características de forma BEM visual
        if (Math.random() * 100 < taxaMutacao) {
            // 1. Mutação de Cor
            novoDna += (Math.random() - 0.5) * 80; 
            if (novoDna < 0) novoDna += 360;
            if (novoDna > 360) novoDna -= 360;

            // 2. Mutação de Tamanho (podem crescer ou encolher)
            novoTamanho += (Math.random() - 0.2) * 8; // Tende a variar, podendo crescer
            // Limita o tamanho entre 6 (minúsculo) e 25 (gigante)
            novoTamanho = Math.max(6, Math.min(25, novoTamanho));

            // 3. Mutação de Formato (muda a geometria)
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
        ctx.fillStyle = `hsl(${matizFundo}, 70%, 65%)`; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        predador.atualizar(matizFundo);
        predador.desenhar();

        populacao.forEach(org => {
            org.atualizar();
            org.desenhar();
        });
    }
    requestAnimationFrame(loop);
}

btnPausar.onclick = () => {
    emExecucao = !emExecucao;
    btnPausar.innerText = emExecucao ? "Pausar Simulação" : "Retomar Simulação";
    btnPausar.style.backgroundColor = emExecucao ? "var(--danger-color)" : "#f59e0b";
};

document.getElementById('btnProximaGen').onclick = () => {
    evoluir(); 
};

document.getElementById('btnReiniciar').onclick = () => {
    geracao = 1;
    genDisplay.innerText = geracao;
    criarPopulacaoInicial();
};

criarPopulacaoInicial();
loop();
