// app.js - VERSIÓN SIMPLIFICADA ES9
const APPSCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_RgGeCGzLZiDY75wUzSrAM6IKB42TmlgjI5LGtcp25SYOWHhwqnACLyMnu0gqnZoe6A/exec";
const GEMINI_KEY = "AIzaSyAFgRR7o4tPle3ERbVUCllRe3NeCjd1yMM";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("es9-form");
    const loader = document.getElementById("loader");
    const loaderText = document.getElementById("loader-text");
    const successBox = document.getElementById("success-message");
    const downloadBtn = document.getElementById("download-btn");

    // 1. Guardar progreso (Autoguardado)
    form.addEventListener("input", () => {
        const data = Object.fromEntries(new FormData(form));
        localStorage.setItem("es9_draft", JSON.stringify(data));
    });

    // 2. Cargar progreso al abrir
    const draft = JSON.parse(localStorage.getItem("es9_draft") || "{}");
    Object.entries(draft).forEach(([key, value]) => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) input.value = value;
    });

    // 3. Proceso de Envío
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        
        // Mostrar carga con lenguaje humano
        showLoader("Analizando tu propuesta para generar tus recomendaciones...");

        try {
            // A. Obtener Tips de Gemini (Llamada Directa)
            const tips = await obtenerTipsGemini(data);
            data.ia_feedback = tips;

            // B. Enviar a Excel (Segundo plano, sin esperar respuesta)
            fetch(APPSCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify({...data, action: 'submit'})
            });

            // C. Mostrar Éxito
            hideLoader();
            successBox.classList.remove("hidden");
            form.style.display = "none";
            localStorage.removeItem("es9_draft");

            // D. Configurar descarga (Aviso de envío por mail)
            downloadBtn.addEventListener("click", () => {
                alert("¡Excelente! Tus respuestas han sido enviadas. Idalí te enviará el PDF oficial con estos tips a tu correo en unos minutos.");
            });

        } catch (err) {
            console.error(err);
            alert("Hubo un error. Por favor intenta de nuevo.");
            hideLoader();
        }
    });

    async function obtenerTipsGemini(d) {
        const prompt = `Como mentor de emprendimiento social, da 3 tips cortos y accionables para este proyecto: ${d.nombre_proyecto}. Objetivo: ${d.objetivo}. Una recomendación debe ser hablar con expertos o beneficiarios. Tono inspirador.`;
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
            method: "POST",
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const resJson = await resp.json();
        return resJson.candidates[0].content.parts[0].text;
    }

    function showLoader(m) { loaderText.textContent = m; loader.classList.remove("hidden"); }
    function hideLoader() { loader.classList.add("hidden"); }
});
