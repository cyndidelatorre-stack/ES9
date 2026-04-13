// app.js

// CONFIGURACIÓN: Aquí debes colocar la URL web que te de Google Apps Script al hacer "Deploy as web app" (Ejecución como tú, acceso: cualquiera)
const APPSCRIPT_WEBHOOK_URL = "URL_APP_SCRIPT_AQUI";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("es9-form");
    const fetchBtn = document.getElementById("btn-fetch");
    const emailInput = document.getElementById("email");
    const loader = document.getElementById("loader");
    const loaderText = document.getElementById("loader-text");
    const successBox = document.getElementById("success-message");
    const errorBox = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");
    const downloadBtn = document.getElementById("download-btn");

    // Lógica "Segunda Oportunidad": Traer datos existentes por correo
    fetchBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        if (!email) {
            alert("Por favor ingresa un correo electrónico primero.");
            return;
        }

        if (APPSCRIPT_WEBHOOK_URL === "URL_APP_SCRIPT_AQUI") {
            alert("La URL de integración (Webhook) aún no está configurada.");
            return;
        }

        showLoader("Buscando tus respuestas anteriores...");
        
        try {
            const url = new URL(APPSCRIPT_WEBHOOK_URL);
            url.searchParams.append("action", "fetch");
            url.searchParams.append("email", email);

            const respuesta = await fetch(url);
            const data = await respuesta.json();
            
            if (data.status === "success" && data.data) {
                // Rellenar formulario
                fillForm(data.data);
                hideLoader();
                alert("¡Felicidades! Encontramos tu progreso. Puedes editar tus respuestas y enviar de nuevo.");
            } else {
                hideLoader();
                alert("No encontramos proyectos previos con este correo. Puedes continuar con tu registro nuevo.");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            hideLoader();
            alert("Error al intentar recuperar tu información.");
        }
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
            
            // Si el backend devolviera el link de PDF de forma síncrona aquí lo inyectaríamos
            // downloadBtn.href = data.pdfUrl;

        } catch (error) {
            console.error("Error submitting form:", error);
            hideLoader();
            errorBox.classList.remove("hidden");
            errorText.textContent = "Ocurrió un error al contactar el servidor. Por favor intenta de nuevo.";
        }
    });

    function fillForm(data) {
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = data[key];
            }
        });
    }

    function showLoader(msg) {
        loaderText.textContent = msg;
        loader.classList.remove("hidden");
    }

    function hideLoader() {
        loader.classList.add("hidden");
    }
});
