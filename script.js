const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const cursorVirtual = document.getElementById('virtual-cursor');

// Ajustar canvas al tamaño de la ventana
function redimensionarCanvas() {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}
window.addEventListener('resize', redimensionarCanvas);
redimensionarCanvas();

// Variables Lógicas de UI y Dibujo
let estadoModulos = {
    movimiento: false,
    formas: false
};

const botonesUI = [
    { el: document.getElementById('btn-movimiento'), id: 'movimiento', isToggle: true, progress: 0 },
    { el: document.getElementById('btn-formas'), id: 'formas', isToggle: true, progress: 0 },
    { el: document.getElementById('btn-borrar'), id: 'borrar', isToggle: false, progress: 0 }
];

let estelaMovimiento = [];
let formasGeneradas = [];
let lastActionTime = 0;

// Motor Principal
function onResults(results) {
    document.getElementById('loading').style.display = 'none';

    // 1. Dibujar Video Base
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.scale(-1, 1); // Espejo
    canvasCtx.drawImage(results.image, -canvasElement.width, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    let dedoX = 0, dedoY = 0, pulgarX = 0, pulgarY = 0;
    let haciendoPellizco = false;

    // 2. Procesamiento de Mano y Cursor DOM
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        dedoX = (1 - landmarks[8].x) * canvasElement.width;
        dedoY = landmarks[8].y * canvasElement.height;
        pulgarX = (1 - landmarks[4].x) * canvasElement.width;
        pulgarY = landmarks[4].y * canvasElement.height;

        const distanciaPellizco = Math.hypot(dedoX - pulgarX, dedoY - pulgarY);
        haciendoPellizco = distanciaPellizco < 40;

        // Mover el cursor HTML real en la pantalla
        cursorVirtual.style.left = `${dedoX}px`;
        cursorVirtual.style.top = `${dedoY}px`;
        
        if (haciendoPellizco) {
            cursorVirtual.classList.add('pellizcando');
        } else {
            cursorVirtual.classList.remove('pellizcando');
        }

        // Lógica: Generación
        const currentTime = new Date().getTime();
        if (estadoModulos.movimiento) {
            estelaMovimiento.push({x: dedoX, y: dedoY, vida: 1.0});
        }

        if (estadoModulos.formas && haciendoPellizco && (currentTime - lastActionTime > 150)) {
            const colores = ["#FF1744", "#00E676", "#2979FF", "#FFEA00", "#D500F9"];
            const color = colores[Math.floor(Math.random() * colores.length)];
            const size = Math.random() * 40 + 20;
            formasGeneradas.push({x: dedoX, y: dedoY, size: size, color: color});
            lastActionTime = currentTime;
        }

        // 3. Lógica de UI Profesional (Detección de Colisión DOM)
        botonesUI.forEach(btnInfo => {
            const rect = btnInfo.el.getBoundingClientRect();
            // ¿El cursor está tocando el botón HTML?
            const tocando = (dedoX >= rect.left && dedoX <= rect.right && dedoY >= rect.top && dedoY <= rect.bottom);

            if (tocando) {
                btnInfo.el.classList.add('hovering');
                btnInfo.progress += 1; // Barra de progreso invisible para el clic
                
                // Si mantiene la mano sobre el botón por ~30 frames (aprox 1 segundo)
                if (btnInfo.progress > 30) {
                    if (currentTime - lastActionTime > 1000) {
                        if (btnInfo.isToggle) {
                            estadoModulos[btnInfo.id] = !estadoModulos[btnInfo.id];
                            btnInfo.el.classList.toggle('active');
                        } else if (btnInfo.id === 'borrar') {
                            estelaMovimiento = [];
                            formasGeneradas = [];
                        }
                        lastActionTime = currentTime;
                        btnInfo.progress = 0; // Resetear después del clic
                    }
                }
            } else {
                btnInfo.el.classList.remove('hovering');
                btnInfo.progress = 0; // Se cancela si saca la mano
            }
        });
    }

    // 4. Renderizado en Canvas (Solo Estilos Visuales de Partículas)
    for (let i = estelaMovimiento.length - 1; i >= 0; i--) {
        let p = estelaMovimiento[i];
        canvasCtx.beginPath();
        canvasCtx.arc(p.x, p.y, 10 * p.vida, 0, 2 * Math.PI);
        canvasCtx.fillStyle = `rgba(0, 229, 255, ${p.vida})`;
        canvasCtx.fill();
        p.vida -= 0.03; 
        if (p.vida <= 0) estelaMovimiento.splice(i, 1);
    }

    formasGeneradas.forEach(forma => {
        canvasCtx.fillStyle = forma.color;
        canvasCtx.shadowBlur = 10;
        canvasCtx.shadowColor = forma.color;
        canvasCtx.fillRect(forma.x - forma.size/2, forma.y - forma.size/2, forma.size, forma.size);
        canvasCtx.strokeStyle = "#FFFFFF";
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(forma.x - forma.size/2, forma.y - forma.size/2, forma.size, forma.size);
        canvasCtx.shadowBlur = 0; 
    });
}

// Inicialización de MediaPipe
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 1280, height: 720
});
camera.start();
