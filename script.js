const CREDENTIALS = { user: "Ecedeño", pass: "1130" };

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    if (u === CREDENTIALS.user && p === CREDENTIALS.pass) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        localStorage.setItem('session', 'active');
    } else {
        alert("Credenciales incorrectas");
    }
}

// Simulación de "Aprendizaje y Programación"
async function iniciarGeneracion() {
    const prompt = document.getElementById('prompt').value;
    const status = document.getElementById('ia-status');
    const consoleOut = document.getElementById('output-console');

    status.innerText = "Buscando documentación en la red...";
    await wait(1500);
    
    status.innerText = "Escribiendo código y corrigiendo errores...";
    consoleOut.innerHTML += `<p>> Generando estructura de archivos para: ${prompt}</p>`;
    
    // Aquí es donde llamarías a una API para obtener el código real
    let codigoGenerado = "<html>...</html>"; 
    
    await wait(2000);
    status.innerText = "Validando funcionalidad...";
    consoleOut.innerHTML += `<p class="success">> Error detectado en línea 12: Corregido automáticamente.</p>`;
    consoleOut.innerHTML += `<p class="success">> Programa funcional generado con éxito.</p>`;
}

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }
