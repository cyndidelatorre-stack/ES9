// app.js
// CONFIGURACIÓN: URL de la Aplicación Web de Google Apps Script
const APPSCRIPT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbx5CZAhUkna6qWF6x7IxXgt6DyrYX-I4oI-bP4PTq7Y5xEAhYCh-zN01uZGbqOv66Dusw/exec";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("es9-form");
    const loader = document.getElementById("loader");
    const loaderText = document.getElementById("loader-text");
    const successBox = document.getElementById("success-message");
    const errorBox = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");
    const downloadBtn = document.getElementById("download-btn");
    const formActions = document.querySelector(".form-actions");

    // Lógica "Segunda Oportunidad": Autoguardado en el Navegador
    const formKey = "es9_form_draft";

    // 1. Recuperar información si el usuario refresca la página
    const savedData = localStorage.getItem(formKey);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            Object.keys(parsed).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = parsed[key];
            });
        } catch (e) {
            console.error("Error recuperando autoguardado");
        }
    }

    // 2. Guardar automáticamente mientras el emprendedor escribe
    form.addEventListener("input", () => {
        const formData = new FormData(form);
        const dataObj = {};
        formData.forEach((value, key) => dataObj[key] = value);
        localStorage.setItem(formKey, JSON.stringify(dataObj));
    });

    // 3. Envío de Formulario
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const dataObj = {};
        formData.forEach((value, key) => dataObj[key] = value);
        dataObj.action = "submit";

        // MENSAJE EMPÁTICO (Sin mencionar IA)
        showLoader("Preparando tus recomendaciones y generando tu One-Pager...");

        try {
            // Enviamos con 'no-cors' para asegurar que los datos lleguen a Google Sheets
            await fetch(APPSCRIPT_WEBHOOK_URL, {
                method: "POST",
                mode: "no-cors", 
                headers: {
                    "Content-Type": "text/plain",
                },
                body: JSON.stringify(dataObj)
            });

            // Simulamos un breve tiempo de procesamiento para el PDF
            setTimeout(() => {
                hideLoader();
                successBox.classList.remove("hidden");
                errorBox.classList.add("hidden");
                
                // Ocultamos los botones de envío originales
                if (formActions) formActions.classList.add("hidden");
                
                // Limpiar el borrador local tras el envío exitoso
                localStorage.removeItem(formKey);

                // Configuración del botón de descarga empático
                downloadBtn.addEventListener("click", (event) => {
                    event.preventDefault();
                    alert("¡Proyecto recibido! Tu One-Pager se está terminando de procesar. En un par de minutos lo recibirás en tu correo con las recomendaciones de Idalí.");
                });
            }, 4000);

        } catch (error) {
            console.error("Error en el envío:", error);
            hideLoader();
            errorBox.classList.remove("hidden");
            errorText.textContent = "Hubo un problema al conectar con el servidor. Por favor, intenta de nuevo.";
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
