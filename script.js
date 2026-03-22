const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loadingMessage = document.getElementById('loading');

// Configuración de Botones Virtuales
let botones = [
    { id: "Modulo Movimiento", x: 30, y: 30, w: 250, h: 70, baseColor: "rgba(200, 100, 0, 0.7)", activeColor: "rgba(0, 200, 0, 0.7)", activo: false },
    { id: "Modulo Formas", x: 30, y: 120, w: 250, h: 70, baseColor: "rgba(200, 100, 0, 0.7)", activeColor: "rgba(0, 200, 0, 0.7)", activo: false }
];

let lastClickTime = 0; // Para evitar múltiples clics por segundo

// Función que se ejecuta cada vez que MediaPipe procesa un fotograma
function onResults(results) {
    loadingMessage.style.display = 'none';

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // 1. Dibujar el video con efecto espejo
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, -canvasElement.width, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore(); // Restaurar para que los textos y botones no queden al revés

    let interactuando = false;
    let dedoX = 0;
    let dedoY = 0;

    // 2. Dibujar las manos y obtener coordenadas del dedo
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            
            // Invertir la coordenada X de la mano para que coincida con el video en espejo
            dedoX = (1 - landmarks[8].x) * canvasElement.width;
            dedoY = landmarks[8].y * canvasElement.height;
            interactuando = true;

            // Dibujar el puntero (círculo) en la punta del dedo índice
            canvasCtx.beginPath();
            canvasCtx.arc(dedoX, dedoY, 15, 0, 2 * Math.PI);
            canvasCtx.fillStyle = "#FF00FF";
            canvasCtx.fill();
        }
    }

    // 3. Dibujar interfaz y detectar interacciones
    const currentTime = new Date().getTime();
    
    botones.forEach(btn => {
        // Detectar si el puntero está dentro del área del botón
        if (interactuando && dedoX > btn.x && dedoX < btn.x + btn.w && dedoY > btn.y && dedoY < btn.y + btn.h) {
            
            // Efecto Hover visual
            canvasCtx.fillStyle = "rgba(0, 255, 255, 0.5)";
            canvasCtx.fillRect(btn.x, btn.y, btn.w, btn.h);

            // Activar/Desactivar con un "cooldown" de 1 segundo
            if (currentTime - lastClickTime > 1000) {
                btn.activo = !btn.activo;
                lastClickTime = currentTime;
            }
        } else {
            // Dibujar color normal según su estado
            canvasCtx.fillStyle = btn.activo ? btn.activeColor : btn.baseColor;
            canvasCtx.fillRect(btn.x, btn.y, btn.w, btn.h);
        }

        // Borde y Texto del botón
        canvasCtx.strokeStyle = "white";
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(btn.x, btn.y, btn.w, btn.h);

        canvasCtx.fillStyle = "white";
        canvasCtx.font = "20px Arial";
        canvasCtx.fillText(btn.id, btn.x + 15, btn.y + 45);
    });

    // 4. Lógica de los Módulos Activos (Simulación UI)
    if (botones[0].activo) {
        canvasCtx.fillStyle = "white";
        canvasCtx.fillText("✅ Movimiento Activado (Listo para integrar OpenCV.js)", 300, 75);
    }
    if (botones[1].activo) {
        canvasCtx.fillStyle = "white";
        canvasCtx.fillText("✅ Formas Activado (Listo para integrar OpenCV.js)", 300, 165);
    }
}

// Inicializar MediaPipe Hands
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});
hands.onResults(onResults);

// Iniciar la cámara web
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 1280,
    height: 720
});
camera.start();
