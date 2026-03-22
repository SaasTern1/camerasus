const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const loadingMessage = document.getElementById('loading');

// -----------------------------------------
// UI DINÁMICA: CONFIGURACIÓN DE BOTONES
// -----------------------------------------
let botones = [
    { id: "Estela de Luz", x: 30, y: 30, w: 220, h: 65, baseColor: "rgba(30, 136, 229, 0.6)", activeColor: "rgba(0, 200, 83, 0.8)", hoverColor: "rgba(100, 181, 246, 0.8)", activo: false, tipo: "toggle" },
    { id: "Crear Formas", x: 30, y: 115, w: 220, h: 65, baseColor: "rgba(142, 36, 170, 0.6)", activeColor: "rgba(0, 200, 83, 0.8)", hoverColor: "rgba(186, 104, 200, 0.8)", activo: false, tipo: "toggle" },
    { id: "Borrar Todo", x: 30, y: 200, w: 220, h: 65, baseColor: "rgba(229, 57, 53, 0.6)", activeColor: "rgba(255, 82, 82, 0.9)", hoverColor: "rgba(239, 154, 154, 0.8)", activo: false, tipo: "action" }
];

let lastClickTime = 0; 
let estelaMovimiento = []; 
let formasGeneradas = [];  

// -----------------------------------------
// MOTOR DE RENDERIZADO E INTERACCIÓN
// -----------------------------------------
function onResults(results) {
    loadingMessage.style.display = 'none';

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // 1. Efecto Espejo para el video base
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, -canvasElement.width, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    let interactuando = false;
    let dedoX = 0, dedoY = 0, pulgarX = 0, pulgarY = 0;

    // 2. Rastreo Esquelético
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        dedoX = (1 - landmarks[8].x) * canvasElement.width;
        dedoY = landmarks[8].y * canvasElement.height;
        pulgarX = (1 - landmarks[4].x) * canvasElement.width;
        pulgarY = landmarks[4].y * canvasElement.height;
        
        interactuando = true;

        const distanciaPellizco = Math.hypot(dedoX - pulgarX, dedoY - pulgarY);
        const haciendoPellizco = distanciaPellizco < 40; 

        // 3. Dibujar el cursor dinámico en el dedo
        canvasCtx.beginPath();
        canvasCtx.arc(dedoX, dedoY, haciendoPellizco ? 18 : 10, 0, 2 * Math.PI);
        canvasCtx.fillStyle = haciendoPellizco ? "#00E5FF" : "#E040FB";
        canvasCtx.shadowBlur = 15;
        canvasCtx.shadowColor = canvasCtx.fillStyle;
        canvasCtx.fill();
        canvasCtx.shadowBlur = 0; // Resetear sombra para el resto

        // Lógica: Estela
        if (botones[0].activo) {
            estelaMovimiento.push({x: dedoX, y: dedoY, vida: 1.0});
        }

        // Lógica: Generar Formas con Pellizco
        if (botones[1].activo && haciendoPellizco) {
            const currentTime = new Date().getTime();
            if (currentTime - lastClickTime > 150) { // Velocidad de creación
                const colores = ["#FF1744", "#00E676", "#2979FF", "#FFEA00", "#D500F9"];
                const color = colores[Math.floor(Math.random() * colores.length)];
                const size = Math.random() * 40 + 20;
                formasGeneradas.push({x: dedoX, y: dedoY, size: size, color: color});
                lastClickTime = currentTime;
            }
        }
    }

    // 4. Renderizar Estelas
    for (let i = estelaMovimiento.length - 1; i >= 0; i--) {
        let p = estelaMovimiento[i];
        canvasCtx.beginPath();
        canvasCtx.arc(p.x, p.y, 10 * p.vida, 0, 2 * Math.PI);
        canvasCtx.fillStyle = `rgba(0, 229, 255, ${p.vida})`;
        canvasCtx.fill();
        
        p.vida -= 0.03; 
        if (p.vida <= 0) estelaMovimiento.splice(i, 1);
    }

    // 5. Renderizar Formas
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

    // 6. Motor de la Interfaz (UI)
    const currentTimeUI = new Date().getTime();
    
    botones.forEach(btn => {
        let hover = interactuando && dedoX > btn.x && dedoX < btn.x + btn.w && dedoY > btn.y && dedoY < btn.y + btn.h;

        // Determinar el color del botón
        if (hover) {
            canvasCtx.fillStyle = btn.hoverColor;
            
            // Lógica de "Clic"
            if (currentTimeUI - lastClickTime > 600) { // Cooldown para no hacer múltiples clics
                if (btn.tipo === "toggle") {
                    btn.activo = !btn.activo;
                } else if (btn.tipo === "action" && btn.id === "Borrar Todo") {
                    formasGeneradas = [];
                    estelaMovimiento = [];
                    // El botón parpadea en rojo brillante al usarlo
                    canvasCtx.fillStyle = btn.activeColor; 
                }
                lastClickTime = currentTimeUI;
            }
        } else {
            canvasCtx.fillStyle = btn.activo ? btn.activeColor : btn.baseColor;
        }

        // Dibujar Botón
        canvasCtx.fillRect(btn.x, btn.y, btn.w, btn.h);

        // Borde dinámico (más grueso si está activo o en hover)
        canvasCtx.strokeStyle = (hover || btn.activo) ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)";
        canvasCtx.lineWidth = (hover || btn.activo) ? 3 : 1;
        canvasCtx.strokeRect(btn.x, btn.y, btn.w, btn.h);

        // Texto del Botón
        canvasCtx.fillStyle = "#FFFFFF";
        canvasCtx.font = "bold 18px 'Segoe UI', sans-serif";
        // Centrar texto verticalmente
        canvasCtx.fillText(btn.id, btn.x + 20, btn.y + 38);
    });
}

// -----------------------------------------
// INICIALIZACIÓN
// -----------------------------------------
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1, 
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
