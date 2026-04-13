// ============================================================
// app.js — Routing principal de la SPA
// ============================================================
// Este archivo se encarga de toda la navegación de la app.
// Usa la History API del navegador para cambiar la URL sin
// recargar la página, y muestra/oculta las vistas según
// la ruta actual.
//
// Conceptos clave:
//   - pushState: cambia la URL sin recargar la página
//   - popstate: evento que se dispara cuando el usuario
//               presiona los botones back/forward del navegador
//   - data-view: atributo HTML que identifica cada vista
//   - data-link: atributo HTML que identifica los links de nav
// ============================================================

import { startClippyRotation } from "./utils.js";


// ============================================================
// 1. CONFIGURACIÓN DE RUTAS
// ============================================================

/*
  ROUTES es un objeto que mapea cada ruta URL a su vista.
  La clave es la ruta (lo que aparece en la URL).
  El valor es el nombre del data-view correspondiente.

  Ejemplo: si la URL es "/chat", mostramos la sección
  que tiene data-view="chat"
*/
const ROUTES = {
    "/": "home",
    "/home": "home",
    "/chat": "chat",
    "/about": "about",
    "/404": "404",
};

/*
  Ruta por defecto: si el usuario ingresa una URL que no existe,
  lo mandamos a home.
*/
const DEFAULT_ROUTE = "/home";


// ============================================================
// 2. FUNCIÓN PRINCIPAL: navigateTo
// ============================================================

/*
  navigateTo(path)
  ----------------
  Esta es la función central del router.
  Cambia la URL y muestra la vista correspondiente.

  Parámetros:
    path: string — la ruta a navegar. Ej: "/chat", "/home"

  ¿Cómo funciona?
  1. Busca en ROUTES qué vista corresponde a esa ruta
  2. Usa pushState para cambiar la URL sin recargar
  3. Llama a renderView para mostrar la vista correcta
*/
function navigateTo(path) {
    /*
      Si la ruta existe en ROUTES la usamos.
      Si no existe, mostramos la vista 404.
    */
    const viewName = ROUTES[path] !== undefined
        ? ROUTES[path]
        : "404";

    // Actualizamos la URL (aunque sea una ruta inválida)
    history.pushState({ view: viewName }, "", path);

    // Mostramos la vista correspondiente
    renderView(viewName);
}

/*
  Exponemos navigateTo en window para que el botón del Home
  pueda llamarla con onclick="window.navigateTo('/chat')"
*/
window.navigateTo = navigateTo;


// ============================================================
// 3. FUNCIÓN: renderView
// ============================================================

/*
  renderView(viewName)
  --------------------
  Muestra la vista indicada y oculta todas las demás.
  También actualiza el link activo en la navegación y
  el texto del statusbar.

  Parámetros:
    viewName: string — el nombre de la vista. Ej: "home", "chat"
*/
function renderView(viewName) {
    // --- 3a. Mostrar/ocultar vistas ---

    /*
      Obtenemos todas las secciones con atributo data-view.
      Recorremos cada una: si su data-view coincide con viewName,
      la mostramos; si no, la ocultamos con la clase "hidden".
    */
    const views = document.querySelectorAll("section[data-view]");

    views.forEach((section) => {
        if (section.dataset.view === viewName) {
            section.classList.remove("hidden"); // Mostrar
        } else {
            section.classList.add("hidden");    // Ocultar
        }
    });

    // --- 3b. Actualizar el link activo en la navegación ---

    /*
      Recorremos todos los links de la nav y les agregamos o
      quitamos la clase "active" según corresponda.
      La clase "active" hace que el botón se vea "presionado".
    */
    const navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach((link) => {
        /*
          link.getAttribute("href") devuelve la ruta del link.
          Ej: "/chat", "/home", "/about"
          La comparamos con la ruta en ROUTES para saber si coincide.
        */
        const linkPath = link.getAttribute("href");
        const linkView = ROUTES[linkPath];

        if (linkView === viewName) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    // --- 3c. Actualizar el texto del statusbar ---

    /*
      Cambiamos el texto de la barra de estado según la vista activa.
      Esto le da un toque extra al estilo Windows 98.
    */
    const statusMessages = {
        home: "Listo",
        chat: "Conectado con Clippy 📎",
        about: "Acerca de Clippy AI",
        "404": "Error 404 — Página no encontrada",
    };

    const statusbar = document.getElementById("statusbar-text");
    if (statusbar) {
        statusbar.textContent = statusMessages[viewName] || "Listo";
    }

    // --- 3d. Actualizar el título de la pestaña del navegador ---

    const pageTitles = {
        home: "Clippy AI",
        chat: "Clippy AI — Chat",
        about: "Clippy AI — Acerca de",
        "404": "Clippy AI — Página no encontrada",
    };

    document.title = pageTitles[viewName] || "Clippy AI";

    // --- 3e. Iniciar rotación de GIFs si estamos en Home o About ---

    /*
      Cuando navegamos a Home, iniciamos la rotación de GIFs.
      Guardamos el ID del intervalo para poder detenerlo si
      el usuario navega a otra vista (evita memory leaks).
    */
    if (viewName === "home") {
        const clippyImg = document.getElementById("clippy-gif");
        startClippyRotation(clippyImg, 4000);
    }

    if (viewName === "about") {
        const clippyImgAbout = document.getElementById("clippy-gif-about");
        startClippyRotation(clippyImgAbout, 4000);
    }
}


// ============================================================
// 4. MANEJO DE LINKS DE NAVEGACIÓN
// ============================================================

/*
  Interceptamos los clicks en todos los links que tienen
  el atributo "data-link". En lugar de dejar que el navegador
  recargue la página, usamos navigateTo para navegar sin recarga.
*/
function setupNavLinks() {
    /*
      Usamos "delegación de eventos": en lugar de agregar un
      listener a cada link por separado, escuchamos todos los
      clicks en el documento y filtramos los que nos interesan.
  
      Ventaja: funciona aunque los links se agreguen dinámicamente.
    */
    document.addEventListener("click", (event) => {
        /*
          event.target es el elemento que recibió el click.
          closest("[data-link]") busca el ancestro más cercano
          (o el mismo elemento) que tenga el atributo data-link.
        */
        const link = event.target.closest("[data-link]");

        // Si el click no fue en un link de navegación, ignoramos
        if (!link) return;

        /*
          Si el usuario hizo Ctrl+click (Windows/Linux) o
          Cmd+click (Mac) o Shift+click o click con el botón del medio,
          dejamos que el navegador abra el link en una nueva pestaña
          con su comportamiento por defecto. NO prevenimos el evento.
        */
        if (
            event.ctrlKey ||  // Ctrl+click en Windows/Linux
            event.metaKey ||  // Cmd+click en Mac
            event.shiftKey ||  // Shift+click (nueva pestaña/ventana)
            event.button === 1 // Click con botón del medio del mouse
        ) {
            return; // Dejamos que el navegador maneje el click normalmente
        }

        /*
          Prevenimos el comportamiento por defecto del navegador
          (que sería recargar la página o cambiar la URL de forma
          tradicional).
        */
        event.preventDefault();

        // Obtenemos la ruta del atributo href del link
        const path = link.getAttribute("href");

        // Navegamos a esa ruta
        if (path) navigateTo(path);
    });
}


// ============================================================
// 5. MANEJO DEL BOTÓN BACK/FORWARD DEL NAVEGADOR
// ============================================================

/*
  El evento "popstate" se dispara cuando el usuario presiona
  los botones de retroceso o avance del navegador.

  Sin esto, los botones back/forward NO funcionarían en la SPA
  (la URL cambiaría pero la vista no se actualizaría).

  event.state contiene el objeto que pasamos a pushState.
  Si no hay estado (por ejemplo, al cargar la página por primera
  vez), usamos la URL actual para determinar la vista.
*/
window.addEventListener("popstate", (event) => {
    if (event.state && event.state.view) {
        // Tenemos el nombre de la vista guardado en el estado
        renderView(event.state.view);
    } else {
        // No hay estado: determinamos la vista por la URL actual
        const path = window.location.pathname;
        const viewName = ROUTES[path] || ROUTES[DEFAULT_ROUTE];
        renderView(viewName);
    }
});


// ============================================================
// 6. INICIALIZACIÓN DE LA APP
// ============================================================

/*
  init()
  ------
  Función que se ejecuta cuando la página termina de cargar.
  Se encarga de:
  1. Configurar los listeners de los links
  2. Mostrar la vista correcta según la URL actual
*/
function init() {
    // Configuramos la navegación por links
    setupNavLinks();

    /*
      Determinamos qué vista mostrar al cargar la página.
  
      window.location.pathname es la parte de la URL después
      del dominio. Ejemplos:
        https://clippy-ai.vercel.app/       → pathname = "/"
        https://clippy-ai.vercel.app/chat   → pathname = "/chat"
        https://clippy-ai.vercel.app/about  → pathname = "/about"
  
      Buscamos esa ruta en ROUTES. Si no la encontramos,
      usamos la ruta por defecto (home).
    */
    const currentPath = window.location.pathname;

    /*
      Si la ruta existe en ROUTES la usamos.
      Si no existe (ej: /nonexistent), mostramos la vista 404.
    */
    const initialView = ROUTES[currentPath] !== undefined
        ? ROUTES[currentPath]
        : "404";

    /*
      Reemplazamos el estado actual del historial con la vista
      inicial. Usamos replaceState (no pushState) para no agregar
      una entrada extra al historial del navegador.
    */
    history.replaceState({ view: initialView }, "", currentPath);

    // Mostramos la vista inicial
    renderView(initialView);
}

/*
  DOMContentLoaded se dispara cuando el HTML terminó de cargarse
  y el DOM está listo para ser manipulado.
  Recién ahí llamamos a init().
*/
document.addEventListener("DOMContentLoaded", init);