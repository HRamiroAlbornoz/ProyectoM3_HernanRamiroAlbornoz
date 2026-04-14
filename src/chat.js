// ============================================================
// chat.js — Lógica completa del chat
// ============================================================
// Este archivo se encarga de todo lo relacionado al chat:
//   - Manejar el envío de mensajes
//   - Mostrar mensajes en pantalla
//   - Comunicarse con la Serverless Function
//   - Manejar los estados: idle, loading, error
//   - Mantener el historial de conversación
//   - Scroll automático
//   - Botón de reintentar
// ============================================================

import {
  formatMessage,
  sanitizeText,
  isEmptyMessage,
  buildApiMessages,
} from "./utils.js";


// ============================================================
// 1. REFERENCIAS A ELEMENTOS DEL DOM
// ============================================================

/*
  Guardamos referencias a los elementos del HTML que vamos
  a usar frecuentemente. Es más eficiente hacerlo una vez
  acá que buscarlo con querySelector cada vez que lo usamos.
*/
const messagesPanel = document.getElementById("messages-panel");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");
const errorMessage = document.getElementById("error-message");
const errorText = document.getElementById("error-text");
const retryButton = document.getElementById("retry-button");
const emptyMessage = document.getElementById("empty-message");


// ============================================================
// 2. ESTADO DEL CHAT
// ============================================================

/*
  Estas variables guardan el estado actual del chat.
  Las declaramos acá arriba para que todas las funciones
  del archivo puedan accederlas.
*/

/*
  conversationHistory: array con todos los mensajes de la sesión.
  Cada mensaje tiene esta forma (definida en formatMessage):
    { role: "user" | "model", text: "...", timestamp: 123 }

  Este array se envía completo en cada llamada a la API para
  que Clippy recuerde toda la conversación.
*/
let conversationHistory = [];

/*
  lastUserMessage: guardamos el último mensaje del usuario
  para poder reenviarlo cuando el usuario hace click en "Reintentar".
*/
let lastUserMessage = "";

/*
  isSending: bandera que indica si hay un mensaje en curso.
  Evita que el usuario envíe múltiples mensajes al mismo tiempo.
*/
let isSending = false;


// ============================================================
// 3. MANEJO DE ESTADOS DE LA UI
// ============================================================

/*
  setState(state)
  ---------------
  Centraliza el manejo visual de los estados del chat.
  Un solo lugar donde se controla qué se muestra y qué no.

  Estados posibles:
    "idle"    → esperando input del usuario
    "loading" → esperando respuesta de Clippy
    "error"   → ocurrió un error
*/
function setState(state) {
  switch (state) {

    case "idle":
      /*
        Estado inicial y después de una respuesta exitosa.
        - Ocultamos el indicador de escritura
        - Ocultamos el mensaje de error
        - Ocultamos el mensaje de input vacío
        - Habilitamos el botón de enviar
        - Ponemos el foco en el input
      */
      typingIndicator.classList.add("hidden");
      errorMessage.classList.add("hidden");
      emptyMessage.classList.add("hidden");
      sendButton.disabled = false;
      messageInput.disabled = false;
      messageInput.focus();
      isSending = false;
      break;

    case "loading":
      /*
        Mientras esperamos la respuesta de Clippy.
        - Mostramos el indicador de escritura
        - Ocultamos el mensaje de error anterior
        - Ocultamos el mensaje de input vacío
        - Deshabilitamos el botón y el input para evitar
          envíos duplicados
      */
      typingIndicator.classList.remove("hidden");
      errorMessage.classList.add("hidden");
      emptyMessage.classList.add("hidden");
      sendButton.disabled = true;
      messageInput.disabled = true;
      isSending = true;
      break;

    case "error":
      /*
        Cuando ocurre un error.
        - Ocultamos el indicador de escritura
        - Mostramos el mensaje de error
        - Ocultamos el mensaje de input vacío
        - Habilitamos el botón y el input nuevamente
      */
      typingIndicator.classList.add("hidden");
      errorMessage.classList.remove("hidden");
      emptyMessage.classList.add("hidden");
      sendButton.disabled = false;
      messageInput.disabled = false;
      isSending = false;
      break;

    case "loading":
      /*
        Mientras esperamos la respuesta de Clippy.
        - Mostramos el indicador de escritura
        - Ocultamos el mensaje de error anterior
        - Deshabilitamos el botón y el input para evitar
          envíos duplicados
      */
      typingIndicator.classList.remove("hidden");
      errorMessage.classList.add("hidden");
      sendButton.disabled = true;
      messageInput.disabled = true;
      isSending = true;
      break;

    case "error":
      /*
        Cuando ocurre un error.
        - Ocultamos el indicador de escritura
        - Mostramos el mensaje de error
        - Habilitamos el botón y el input nuevamente
          para que el usuario pueda reintentar
      */
      typingIndicator.classList.add("hidden");
      errorMessage.classList.remove("hidden");
      sendButton.disabled = false;
      messageInput.disabled = false;
      isSending = false;
      break;
  }
}


// ============================================================
// 4. RENDERIZADO DE MENSAJES
// ============================================================

/*
  createMessageElement(role, text)
  ---------------------------------
  Crea y devuelve un elemento HTML para mostrar un mensaje.
  No lo agrega al DOM todavía, solo lo crea.

  Parámetros:
    role: "user" | "model" — quién envió el mensaje
    text: string — el contenido del mensaje

  Retorna:
    HTMLElement — el elemento listo para insertar en el DOM
*/
function createMessageElement(role, text) {
  /*
    Creamos el contenedor del mensaje.
    La clase CSS cambia según el rol:
      "user"  → message-user (alineado a la derecha, fondo azul)
      "model" → message-bot  (alineado a la izquierda, fondo blanco)
  */
  const messageDiv = document.createElement("div");
  messageDiv.classList.add(
    "message",
    role === "user" ? "message-user" : "message-bot"
  );

  // Creamos la burbuja del mensaje
  const bubbleDiv = document.createElement("div");
  bubbleDiv.classList.add("message-bubble");

  /*
    Convertimos saltos de línea (\n) en párrafos <p>.
    Así si Clippy responde con varias líneas, se ven bien.

    Ejemplo:
      "Hola\nCómo estás?" → <p>Hola</p><p>Cómo estás?</p>
  */
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  lines.forEach((line) => {
    const p = document.createElement("p");
    p.textContent = line; // textContent es seguro: evita XSS
    bubbleDiv.appendChild(p);
  });

  messageDiv.appendChild(bubbleDiv);
  return messageDiv;
}

/*
  appendMessage(role, text)
  --------------------------
  Crea un mensaje y lo agrega al panel de mensajes.
  También hace scroll automático hacia abajo.

  Parámetros:
    role: "user" | "model"
    text: string
*/
function appendMessage(role, text) {
  const messageElement = createMessageElement(role, text);
  messagesPanel.appendChild(messageElement);
  scrollToBottom();
}

/*
  scrollToBottom()
  ----------------
  Hace scroll automático hacia el último mensaje.
  Usamos "smooth" para que el scroll sea animado.
*/
function scrollToBottom() {
  messagesPanel.scrollTo({
    top: messagesPanel.scrollHeight,
    behavior: "smooth",
  });
}


// ============================================================
// 5. COMUNICACIÓN CON LA SERVERLESS FUNCTION
// ============================================================

/*
  fetchClippyResponse(messages)
  ------------------------------
  Llama a nuestra Serverless Function en /api/functions
  y devuelve la respuesta de Clippy.

  Parámetros:
    messages: array — el historial en formato Gemini

  Retorna:
    Promise<string> — el texto de la respuesta de Clippy

  Lanza:
    Error — si la respuesta no es ok o hay error de red
*/
async function fetchClippyResponse(messages) {
  /*
    Hacemos el fetch a nuestra Serverless Function.
    NUNCA llamamos a Gemini directamente desde acá,
    porque eso expondría la API key en el frontend.

    La Serverless Function vive en /api/functions.js
    y se encarga de llamar a Gemini de forma segura.
  */
  const response = await fetch("/api/functions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  /*
    IMPORTANTE: validamos response.ok ANTES de parsear.
    response.ok es true cuando el status HTTP es 200-299.
    Si es false (400, 404, 500, etc.), lanzamos un error
    con el código de estado para poder manejarlo después.
  */
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  /*
    Segundo await: parseamos el JSON de la respuesta.
    Solo llegamos acá si response.ok fue true.
  */
  const data = await response.json();

  /*
    Retornamos el texto de la respuesta de Clippy.
    La Serverless Function nos devuelve { reply: "..." }
  */
  return data.reply;
}


// ============================================================
// 6. FUNCIÓN PRINCIPAL: sendMessage
// ============================================================

/*
  sendMessage(userText)
  ----------------------
  Función principal que maneja el envío de un mensaje.
  Coordina todo el flujo: validación → UI → API → respuesta.

  Parámetros:
    userText: string — el mensaje del usuario.
                       Si no se pasa, usa el valor del input.
*/
async function sendMessage(userText) {
  /*
    Si no se pasó un texto (llamada normal desde el botón),
    tomamos el valor del textarea.
  */
  const text = userText ?? sanitizeText(messageInput.value);

  // Validamos que el mensaje no esté vacío
  if (isEmptyMessage(text)) {
    /*
      Mostramos el mensaje de input vacío brevemente.
      Después de 2 segundos lo ocultamos automáticamente.
    */
    emptyMessage.classList.remove("hidden");
    setTimeout(() => {
      emptyMessage.classList.add("hidden");
    }, 2000);
    messageInput.focus();
    return;
  }

  // Evitamos envíos duplicados mientras hay uno en curso
  if (isSending) return;

  // Guardamos el mensaje para el botón de reintentar
  lastUserMessage = text;

  // Limpiamos el input
  messageInput.value = "";

  // --- Paso 1: Mostrar el mensaje del usuario en pantalla ---
  appendMessage("user", text);

  // --- Paso 2: Agregar al historial ---
  conversationHistory.push(formatMessage("user", text));

  // --- Paso 3: Cambiar estado a loading ---
  setState("loading");
  scrollToBottom();

  try {
    // --- Paso 4: Llamar a la API ---
    /*
      Convertimos el historial al formato que espera Gemini
      y lo enviamos a la Serverless Function.
    */
    const apiMessages = buildApiMessages(conversationHistory);
    const reply = await fetchClippyResponse(apiMessages);

    // --- Paso 5: Mostrar la respuesta de Clippy ---
    appendMessage("model", reply);

    // --- Paso 6: Agregar respuesta al historial ---
    conversationHistory.push(formatMessage("model", reply));

    // --- Paso 7: Volver al estado idle ---
    setState("idle");

  } catch (error) {
    /*
      Manejo de errores diferenciado:
      - Si el error tiene "HTTP" es un error del servidor
      - Si no, es un error de red (sin conexión, timeout, etc.)
    */
    if (error.message.includes("HTTP")) {
      // Error del servidor (ej: 500 de Gemini, 404, etc.)
      errorText.textContent =
        `⚠️ Error del servidor (${error.message}). Intentá de nuevo.`;
    } else {
      // Error de red (sin conexión a internet)
      errorText.textContent =
        "⚠️ Sin conexión. Verificá tu internet e intentá de nuevo.";
    }

    /*
      IMPORTANTE: cuando hay un error, sacamos el último
      mensaje del usuario del historial. Así cuando el
      usuario reintente, no se duplicará en el historial.
    */
    conversationHistory.pop();

    // Cambiamos al estado de error
    setState("error");
  }
}


// ============================================================
// 7. EVENTOS DE LA INTERFAZ
// ============================================================

/*
  setupChatEvents()
  -----------------
  Configura todos los event listeners del chat.
  Se llama una sola vez cuando se inicializa el chat.
*/
function setupChatEvents() {

  // --- Botón de enviar ---
  sendButton.addEventListener("click", () => {
    sendMessage();
  });

  // --- Tecla Enter en el textarea ---
  /*
    Enter solo → envía el mensaje
    Shift+Enter → agrega un salto de línea (comportamiento normal)

    Esto es el estándar en apps de chat como WhatsApp o Slack.
  */
  messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // Evita el salto de línea
      sendMessage();
    }
  });

  // --- Auto-resize del textarea ---
  /*
    Hacemos que el textarea crezca automáticamente
    a medida que el usuario escribe más líneas.
    Se resetea a la altura mínima cuando se vacía.
  */
  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = messageInput.scrollHeight + "px";
  });

  // --- Botón de reintentar ---
  /*
    Cuando el usuario hace click en "Reintentar",
    reenviamos el último mensaje que falló.
    También ocultamos el error antes de reintentar.
  */
  retryButton.addEventListener("click", () => {
    if (lastUserMessage) {
      errorMessage.classList.add("hidden");
      sendMessage(lastUserMessage);
    }
  });
}


// ============================================================
// 8. INICIALIZACIÓN DEL CHAT
// ============================================================

/*
  initChat()
  ----------
  Inicializa el chat cuando el DOM está listo.
  Configura los eventos y deja el chat en estado idle.
*/
function initChat() {
  // Verificamos que los elementos del DOM existen
  // antes de intentar usarlos
  if (!messagesPanel || !messageInput || !sendButton) {
    console.error("chat.js: No se encontraron los elementos del chat en el DOM.");
    return;
  }

  // Configuramos los eventos
  setupChatEvents();

  // Estado inicial: idle
  setState("idle");
}

// Iniciamos el chat cuando el DOM está listo
document.addEventListener("DOMContentLoaded", initChat);