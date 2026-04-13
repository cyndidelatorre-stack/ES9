// app.js

// CONFIGURACIÓN: URL del Webhook "Deploy as web app"
// ID de Librería futura referencia: https://script.google.com/macros/library/d/1wiOg84nIthLICtC12y0uOdjSjpUbkATUwROgHykAUogvXTznv7XOXU2-/2
const APPSCRIPT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwlql4RHa3Fw1EAPk751Yk7qNKq-rS8JqLX2eFq2ywG1xJ_9mECBN6hzhFjXPuO2Yrxqw/exec";

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
        const modelName = "gemini-1.5-flash";
        
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
            let response;
            let retries = 3;
            for(let i=0; i<retries; i++) {
                response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                
                if (response.ok) break; // Exito
                
                if (response.status === 429 && i < retries - 1) {
                    // Esperar 2, 4 segundos... y reintentar
                    const waitTime = Math.pow(2, i + 1) * 1000;
                    console.warn(`Límite 429 de Gemini alcanzado. Reintentando en ${waitTime/1000}s...`);
                    await new Promise(r => setTimeout(r, waitTime));
                } else {
                    throw new Error("HTTP Status " + response.status);
                }
            }

            const result = await response.json();
            
            if (result.candidates && result.candidates[0].content.parts[0].text) {
                let rawText = result.candidates[0].content.parts[0].text;
                
                // Limpieza fuerte: buscar lo que esté entre las llaves { }
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No JSON object found");
                
                const parsed = JSON.parse(jsonMatch[0]);
                
                if (Array.isArray(parsed.feedbackEmprendedor)) {
                    parsed.feedbackEmprendedor = parsed.feedbackEmprendedor.map(v => "- " + v).join("\n");
                }
                
                return parsed;
            } else {
                throw new Error("Estructura de respuesta inválida");
            }
        } catch (e) {
            console.error("Error en Gemini Frontend:", e);
            // Fallback object con detalle del error
            return {
                score: 0,
                resumenTecnico: "Aviso: No pudimos conectar con la IA para la evaluación técnica. " + e.message,
                feedbackEmprendedor: "- Tuvimos un problema técnico evaluando tu propuesta.\n- Motivo del fallo: " + e.message + "\n- Tip: Revisa la consola (F12) o si el modelo/API Key de Gemini está activo.\n- Tu solicitud fue registrada con éxito."
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

        // FASE 1: Generación de Recomendaciones
        showLoader("Analizando tu propuesta para generar tus recomendaciones...");
        
        const iaResult = await evaluarConGeminiFrontend(dataObj);
        // Inject results into payload
        dataObj.ia_score = iaResult.score;
        dataObj.ia_resumenTecnico = iaResult.resumenTecnico;
        dataObj.ia_feedbackEmprendedor = iaResult.feedbackEmprendedor;

        // FASE 2: Enviar a Google Apps Script en silencio (CORS Bypass)
        showLoader("Guardando tu proyecto...");

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

            // No intentamos leer el servidor. Solo asumimos éxito al cabo de 2 segundos.
            await new Promise(resolve => setTimeout(resolve, 2000));

            hideLoader();

            // Renderizar los tips en el HTML
            const tipsDiv = document.getElementById("tips-content");
            if (tipsDiv) {
                tipsDiv.textContent = dataObj.ia_feedbackEmprendedor || "Idalí pronto se pondrá en contacto contigo.";
            }
            
            // Cambiar título principal a éxito
            const mainTitle = document.getElementById("main-title");
            if (mainTitle) {
                mainTitle.textContent = "¡Tu proyecto ha sido registrado con éxito!";
            }
            
            const mainSubtitle = document.getElementById("main-subtitle");
            if (mainSubtitle) {
                mainSubtitle.textContent = "Tu progreso se guarda automáticamente en este dispositivo para que puedas actualizar la información si decides usar tu segunda oportunidad. En tu email recibirás tu One-Pager con una pre-evaluación de Idalí para ayudarte a mejorar.";
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
