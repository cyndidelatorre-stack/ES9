// app.js

// CONFIGURACIÓN: URL del Webhook "Deploy as web app"
// ID de Librería futura referencia: https://script.google.com/macros/library/d/1wiOg84nIthLICtC12y0uOdjSjpUbkATUwROgHykAUogvXTznv7XOXU2-/2
const APPSCRIPT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbx_RgGeCGzLZiDY75wUzSrAM6IKB42TmlgjI5LGtcp25SYOWHhwqnACLyMnu0gqnZoe6A/exec";

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

    // Función para evaluar con Gemini directamente desde el Frontend
    async function evaluarConGeminiFrontend(data) {
        const apiKey = "AIzaSyAFgRR7o4tPle3ERbVUCllRe3NeCjd1yMM"; // GEMINI API KEY
        const modelName = "gemini-2.0-flash";
        
        const promptText = `Actúa como un Evaluador Experto de Negocios Sociales e Innovación. Evalúa el siguiente proyecto registrado para "Emprende por un Cambio Social".

PROYECTO:
- Nombre: ${data.nombre_proyecto}
- Objetivo: ${data.objetivo}
- Problema: ${data.q1_1} | Evidencia: ${data.q1_2}
- Propuesta D.: ${data.q2_1} | Solución: ${data.q2_2}
- Innovación: ${data.q3_1} | ${data.q3_2}
- Beneficiarios: ${data.q4_1} | Ingresos/Costos: ${data.q7_2} | ${data.q7_1}
- Sostenibilidad: ${data.q8_1} | Sueño: ${data.q8_4}

TAREAS:
1. Genera un "feedbackEmprendedor" en tono INSPIRADOR de 3 a 4 viñetas accionables (COMO UN ARREGLO DE STRINGS). OBLIGATORIO: Una viñeta debe sugerir salir a hablar con beneficiarios o expertos del problema y por qué.
2. Evalúa y genera un score (0-100) basado en 4 pilares: Claridad del Problema (25), Innovación (25), Viabilidad (25), Resultados (25).
3. Genera un "resumenTecnico" (1 párrafo) para el equipo evaluador justificando el score.

REGLA: Tu respuesta DEBE ser estrictamente un objeto JSON válido (sin sintaxis extra de markdown).
Estructura deseada:
{
  "score": 85,
  "resumenTecnico": "El proyecto demuestra excelente claridad pero falla en X...",
  "feedbackEmprendedor": [
    "Viñeta 1",
    "Viñeta 2",
    "Viñeta 3 (Ve a hablar con tus usuarios sobre...)"
  ]
}`;

        const payload = {
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json"
            }
        };

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("HTTP Status " + response.status);
            }

            const result = await response.json();
            
            if (result.candidates && result.candidates[0].content.parts[0].text) {
                let rawText = result.candidates[0].content.parts[0].text;
                rawText = rawText.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
                
                const parsed = JSON.parse(rawText);
                
                if (Array.isArray(parsed.feedbackEmprendedor)) {
                    parsed.feedbackEmprendedor = parsed.feedbackEmprendedor.map(v => "- " + v).join("\n");
                }
                
                return parsed;
            } else {
                throw new Error("Estructura de respuesta inválida");
            }
        } catch (e) {
            console.error("Error en Gemini Frontend:", e);
            // Fallback object
            return {
                score: 0,
                resumenTecnico: "Aviso: No pudimos conectar con la IA para la evaluación técnica. " + e.message,
                feedbackEmprendedor: "- Tuvimos un problema técnico evaluando tu propuesta.\n- Sin embargo, tu solicitud fue guardada con éxito.\n- Te informaremos de tus resultados en breve."
            };
        }
    }

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

        // FASE 1: Gemini en Web
        showLoader("Evaluando tu propuesta con Inteligencia Artificial...");
        
        const iaResult = await evaluarConGeminiFrontend(dataObj);
        // Inject results into payload
        dataObj.ia_score = iaResult.score;
        dataObj.ia_resumenTecnico = iaResult.resumenTecnico;
        dataObj.ia_feedbackEmprendedor = iaResult.feedbackEmprendedor;

        // FASE 2: Enviar a Google Apps Script
        showLoader("Generando One-Pager y guardando registro...");

        try {
            const respuesta = await fetch(APPSCRIPT_WEBHOOK_URL, {
                method: "POST",
                body: JSON.stringify(dataObj)
            });

            // Leer respuesta
            const data = await respuesta.json();

            hideLoader();

            if (data && data.status === "error") {
                // Backend tuvo problema
                errorBox.classList.remove("hidden");
                errorText.textContent = "⚙️ Error en proceso: " + (data.message || "Por favor revisa la consola o permisos de Apps Script.");
                // REACTIVAR EL FORMULARIO YA QUE NO TUVO EXITO
                form.querySelectorAll("input, textarea, button[type='submit']").forEach(el => el.disabled = false);
            } else if (data && data.status === "success") {
                successBox.classList.remove("hidden");
                errorBox.classList.add("hidden");
                form.querySelectorAll("button[type='submit']").forEach(el => el.style.display = 'none');
                
                // Limpiar localStorage SOLAMENTE SI FUE EXITOSO
                localStorage.removeItem(formKey);
                
                // Asignar PDF dinámico
                if(data.pdfUrl && data.pdfUrl !== "Error generando documento PDF") {
                    downloadBtn.href = data.pdfUrl;
                } else {
                    downloadBtn.style.display = "none";
                }
            } else {
                throw new Error("Respuesta inválida del servidor");
            }

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
