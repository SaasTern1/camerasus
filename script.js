const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loadingMessage = document.getElementById('loading');

// -----------------------------------------
// VARIABLES DE LA INTERFAZ Y DIBUJO
// -----------------------------------------
let botones = [
    { id: "Movimiento (Estela)", x: 30, y: 30, w: 250, h: 70, baseColor: "rgba(200, 100, 0, 0.7)", activeColor: "rgba(0, 200, 0, 0.7)", activo: false },
    { id: "Formas (Pellizcar)", x: 30, y: 120, w: 250, h: 70, baseColor: "rgba(200, 100, 0, 0.7)", activeColor: "rgba(0, 200, 0, 0.7)", activo: false }
];

let lastClickTime = 0; 
let estelaMovimiento = []; // Guarda los puntos por donde pasa el dedo
let formasGeneradas = [];  // Guarda las figuras que vas creando

// -----------------------------------------
// FUNCIÓN PRINCIPAL DE PROCESAMIENTO
// -----------------------------------------
function onResults(results) {
    loadingMessage.style.display = 'none';

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // 1. Dibujar el video en modo espejo
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, -canvasElement.width, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    let interactuando = false;
    let dedoX = 0, dedoY = 0;
    let pulgarX = 0, pulgarY = 0;

    // 2. Rastrear la mano y detectar "Pellizco"
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0]; // Usar la primera mano detectada
        
        // Coordenadas del Dedo Índice (Punto 8)
        dedoX = (1 - landmarks[8].x) * canvasElement.width;
        dedoY = landmarks[8].y * canvasElement.height;
        
        // Coordenadas del Pulgar (Punto 4)
        pulgarX = (1 - landmarks[4].x) * canvasElement.width;
        pulgarY = landmarks[4].y * canvasElement.height;
        
        interactuando = true;

        // Calcular distancia entre índice y pulgar para el gesto de "clic/agarrar"
        const distanciaPellizco = Math.hypot(dedoX - pulgarX, dedoY - pulgarY);
        const haciendoPellizco = distanciaPellizco < 40; // Si están a menos de 40px, es un pellizco

        // Dibujar el cursor en el dedo índice
        canvasCtx.beginPath();
        canvasCtx.arc(dedoX, dedoY, haciendoPellizco ? 20 : 12, 0, 2 * Math.PI);
        canvasCtx.fillStyle = haciendoPellizco ? "#00FFFF" : "#FF00FF";
        canvasCtx.fill();

        // -----------------------------------------
        // LÓGICA DE LOS MÓDULOS
        // -----------------------------------------
        
        // MÓDULO 1: Movimiento (Dejar una estela brillante)
        if (botones[0].activo) {
            estelaMovimiento.push({x: dedoX, y: dedoY, vida: 1.0});
        }

        // MÓDULO 2: Formas (Generar cuadrados al pellizcar)
        if (botones[1].activo && haciendoPellizco) {
            // Solo añadir una forma cada cierto tiempo para no saturar
            const currentTime = new Date().getTime();
            if (currentTime - lastClickTime > 200) {
                // Generar color y tamaño aleatorio
                const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
                const size = Math.random() * 50 + 20;
                formasGeneradas.push({x: dedoX, y: dedoY, size: size, color: color});
                lastClickTime = currentTime;
            }
        }
    }

    // 3. Dibujar las estelas de movimiento
    for (let i = estelaMovimiento.length - 1; i >= 0; i--) {
        let p = estelaMovimiento[i];
        canvasCtx.beginPath();
        canvasCtx.arc(p.x, p.y, 8 * p.vida, 0, 2 * Math.PI);
        canvasCtx.fillStyle = `rgba(255, 255, 0, ${p.vida})`;
        canvasCtx.fill();
        
        p.vida -= 0.05; // La estela se desvanece
        if (p.vida <= 0) estelaMovimiento.splice(i, 1);
    }

    // 4. Dibujar las formas generadas
    formasGeneradas.forEach(forma => {
        canvasCtx.fillStyle = forma.color;
        // Dibujar un cuadrado centrado
        canvasCtx.fillRect(forma.x - forma.size/2, forma.y - forma.size/2, forma.size, forma.size);
        canvasCtx.strokeStyle = "white";
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(forma.x - forma.size/2, forma.y - forma.size/2, forma.size, forma.size);
    });

    // 5. Dibujar la Interfaz de Botones y detectar toques
    const currentTimeUI = new Date().getTime();
    botones.forEach(btn => {
        // ¿El dedo toca el botón?
        if (interactuando && dedoX > btn.x && dedoX < btn.x + btn.w && dedoY > btn.y && dedoY < btn.y + btn.h) {
            canvasCtx.fillStyle = "rgba(0, 255, 255, 0.5)";
            canvasCtx.fillRect(btn.x, btn.y, btn.w, btn.h);

            // Activar/Desactivar con cooldown
            if (currentTimeUI - lastClickTime > 1000) {
                btn.activo = !btn.activo;
                lastClickTime = currentTimeUI;
            }
        } else {
            canvasCtx.fillStyle = btn.activo ? btn.activeColor : btn.baseColor;
            canvasCtx.fillRect(btn.x, btn.y, btn.w, btn.h);
        }

        canvasCtx.strokeStyle = "white";
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        canvasCtx.fillStyle = "white";
        canvasCtx.font = "bold 18px Arial";
        canvasCtx.fillText(btn.id, btn.x + 15, btn.y + 40);
    });
}

// -----------------------------------------
// INICIALIZACIÓN DE MEDIAPIPE Y CÁMARA
// -----------------------------------------
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1, // Reducido a 1 mano para mayor rendimiento y facilidad de uso
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});
hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 1280,
    height: 720
});
camera.start();
