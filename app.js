// app.js

// CONFIGURACIÓN: URL del Webhook "Deploy as web app"
// ID de Librería futura referencia: https://script.google.com/macros/library/d/1wiOg84nIthLICtC12y0uOdjSjpUbkATUwROgHykAUogvXTznv7XOXU2-/2
const APPSCRIPT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwaM9Qu8TcppFQPH5ZrJFhkhY4EhdG4zpUfHbK9tR6EhV751j4sMSOfio1cmIwb06RemQ/exec";

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
    if (savedData) {
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

    // La evaluación con Gemini ha sido movida al Backend (Google Sheets) para soportar alto volumen.

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

        // EVITAR DOBLE SUBMIT Y BLOQUEAR PANTALLA MIENTRAS CARGA (Después de extraer datos)
        form.querySelectorAll("input, textarea, button[type='submit']").forEach(el => el.disabled = true);
        errorBox.classList.add("hidden");

        // Enviar a Google Apps Script en silencio (CORS Bypass)
        showLoader("Enviando tu proyecto de forma segura...");

        try {
            // Se envía en silencio con mode: 'no-cors' para brincar la seguridad abusiva de CORS
            fetch(APPSCRIPT_WEBHOOK_URL, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "text/plain"
                },
                body: JSON.stringify(dataObj)
            }).catch(e => console.error("Fetch background warning:", e));

            // No intentamos leer el servidor. Solo asumimos éxito al cabo de 1.5 segundos.
            await new Promise(resolve => setTimeout(resolve, 1500));

            hideLoader();

            // Cambiar título principal a éxito
            const mainTitle = document.getElementById("main-title");
            if (mainTitle) {
                mainTitle.textContent = "¡Tu proyecto ha sido registrado!";
            }
            
            const mainSubtitle = document.getElementById("main-subtitle");
            if (mainSubtitle) {
                mainSubtitle.textContent = "Idalí recibirá tu información y generará tu One-Pager. Recibirás un correo cuando tu evaluación esté lista.";
            }

            // Mostrar el cuadro de éxito
            successBox.classList.remove("hidden");
            errorBox.classList.add("hidden");
            
            // Ocultar por completo el formulario para que no genere confusión
            form.style.display = 'none';
            
            // Ya NO limpiamos el localStorage para permitir la "Segunda Oportunidad"
            // localStorage.removeItem(formKey);

        } catch (error) {
            console.error("Error submitting form:", error);
            hideLoader();
            errorBox.classList.remove("hidden");
            errorText.textContent = "Ocurrió un error al guardar tu proyecto (Red o permisos denegados).";
            form.querySelectorAll("input, textarea, button[type='submit']").forEach(el => el.disabled = false);
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
