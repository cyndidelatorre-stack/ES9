// app.js

// CONFIGURACIÓN: Aquí debes colocar la URL web que te de Google Apps Script al hacer "Deploy as web app" (Ejecución como tú, acceso: cualquiera)
const APPSCRIPT_WEBHOOK_URL = "URL_APP_SCRIPT_AQUI";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("es9-form");
    const loader = document.getElementById("loader");
    const loaderText = document.getElementById("loader-text");
    const successBox = document.getElementById("success-message");
    const errorBox = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");
    const downloadBtn = document.getElementById("download-btn");

    // Lógica "Segunda Oportunidad": Autoguardado en LocalStorage (Navegador Seguro)
    const formKey = "es9_form_draft";
    
    // 1. Cargar datos si el usuario regresa
    const savedData = localStorage.getItem(formKey);
    if(savedData) {
        try {
            const parsed = JSON.parse(savedData);
            Object.keys(parsed).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = parsed[key];
            });
        } catch (e) {
            console.error("Error leyendo autoguardado");
        }
    }

    // 2. Guardar automáticamente mientras escribe
    form.addEventListener("input", () => {
        const formData = new FormData(form);
        const dataObj = {};
        formData.forEach((value, key) => dataObj[key] = value);
        localStorage.setItem(formKey, JSON.stringify(dataObj));
    });

    // Envío de Formulario
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (APPSCRIPT_WEBHOOK_URL === "URL_APP_SCRIPT_AQUI") {
            // MODO DEMO: Simular flujo porque no hay webhook real
            showLoader("Simulando envío a inteligencia artificial...");
            setTimeout(() => {
                hideLoader();
                successBox.classList.remove("hidden");
                errorBox.classList.add("hidden");
                form.querySelectorAll("input, textarea, button[type='submit']").forEach(el => el.disabled = true);
            }, 2000);
            return;
        }

        const formData = new FormData(form);
        const dataObj = {};
        formData.forEach((value, key) => dataObj[key] = value);
        dataObj.action = "submit";

        showLoader("Enviando proyecto y evaluando con Inteligencia Artificial... (Esto puede tomar unos segundos)");

        try {
            const respuesta = await fetch(APPSCRIPT_WEBHOOK_URL, {
                method: "POST",
                mode: "no-cors", 
                // Nota: Usar no-cors hace que no podamos leer el json de vuelta del Apps Script en muchos casos si no configuramos bien los headers allá. 
                // Lo recomendable con Fetch + AppsScript es usar text/plain en el contenido o x-www-form-urlencoded
                headers: {
                    "Content-Type": "text/plain",
                },
                body: JSON.stringify(dataObj)
            });

            // Si llegamos aquí sin excepción grave, asumimos éxito inicial (por limitantes de CORS con redirections de GAS)
            // Una mejor práctica sería que el backend retorne JSONP o usar x-www-form-urlencoded nativo para leer status 200 de pre-flight.

            hideLoader();
            successBox.classList.remove("hidden");
            errorBox.classList.add("hidden");
            // Ocultar acciones
            form.querySelectorAll("button[type='submit']").forEach(el => el.style.display = 'none');
            // Limpiar localStorage ya que se envió con éxito
            localStorage.removeItem(formKey);
            
            // Si el backend devolviera el link de PDF de forma síncrona aquí lo inyectaríamos
            // downloadBtn.href = data.pdfUrl;

        } catch (error) {
            console.error("Error submitting form:", error);
            hideLoader();
            errorBox.classList.remove("hidden");
            errorText.textContent = "Ocurrió un error al contactar el servidor. Por favor intenta de nuevo.";
        }
    });

    function showLoader(msg) {
        loaderText.textContent = msg;
        loader.classList.remove("hidden");
    }

    function hideLoader() {
        loader.classList.add("hidden");
    }
});
