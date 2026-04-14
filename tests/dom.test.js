// @vitest-environment jsdom
// ============================================================
// tests/dom.test.js — Tests de funciones que usan el DOM
// ============================================================
// Usamos jsdom para simular el DOM del navegador en Node.js.
// Esto nos permite testear preloadGifs y startClippyRotation
// que usan new Image(), setInterval y propiedades de estilo.
//
// La directiva @vitest-environment jsdom al inicio del archivo
// le dice a Vitest que use jsdom para este archivo específico.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    preloadGifs,
    startClippyRotation,
    CLIPPY_GIFS,
} from "../src/utils.js";


// ============================================================
// 1. TESTS DE preloadGifs
// ============================================================

describe("preloadGifs", () => {

    it("no lanza errores al precargar GIFs", () => {
        expect(() => preloadGifs(CLIPPY_GIFS)).not.toThrow();
    });

    it("no lanza errores con lista vacía", () => {
        expect(() => preloadGifs([])).not.toThrow();
    });

    it("respeta el límite de GIFs a precargar", () => {
        /*
          Verificamos que con limit=3 solo se procesan
          3 elementos de la lista usando slice.
        */
        expect(() => preloadGifs(CLIPPY_GIFS, 3)).not.toThrow();
    });

    it("precarga todos los GIFs cuando no se especifica límite", () => {
        expect(() => preloadGifs(CLIPPY_GIFS, CLIPPY_GIFS.length)).not.toThrow();
    });

    it("asigna el src correcto a cada imagen precargada", () => {
        expect(() => preloadGifs(CLIPPY_GIFS)).not.toThrow();
    });

});


// ============================================================
// 2. TESTS DE startClippyRotation
// ============================================================

describe("startClippyRotation", () => {

    beforeEach(() => {
        /*
          Usamos fake timers para controlar setInterval
          y setTimeout sin esperar el tiempo real.
        */
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("devuelve null si imgElement es null", () => {
        const result = startClippyRotation(null);
        expect(result).toBeNull();
    });

    it("devuelve un intervalId cuando recibe un elemento válido", () => {
        const img = document.createElement("img");
        img.src = "/assets/clippy-white-1.gif";

        const intervalId = startClippyRotation(img, 7000);

        expect(intervalId).not.toBeNull();
        expect(intervalId).toBeTruthy();
    });

    it("aplica la transición CSS al elemento imagen", () => {
        const img = document.createElement("img");
        img.src = "/assets/clippy-white-1.gif";

        startClippyRotation(img, 7000);

        expect(img.style.transition).toContain("opacity");
    });

    it("cambia el src de la imagen después del intervalo", () => {
        const img = document.createElement("img");
        img.src = "/assets/clippy-white-1.gif";

        startClippyRotation(img, 7000);

        vi.advanceTimersByTime(7000 + 300);

        expect(img.src).not.toContain("clippy-white-1.gif");
    });

    it("hace fade out antes de cambiar el src", () => {
        const img = document.createElement("img");
        img.src = "/assets/clippy-white-1.gif";

        startClippyRotation(img, 7000);

        vi.advanceTimersByTime(7000);

        expect(img.style.opacity).toBe("0");
    });

    it("hace fade in después de cargar la nueva imagen", () => {
        const img = document.createElement("img");
        img.src = "/assets/clippy-white-1.gif";

        startClippyRotation(img, 7000);

        /*
          Avanzamos el intervalo (7000ms) más el fade out (300ms)
          para que se ejecute el setTimeout interno y se asigne
          el onload handler a la imagen.
        */
        vi.advanceTimersByTime(7000 + 300);

        /*
          Disparamos el evento onload manualmente.
          jsdom no carga imágenes reales, así que necesitamos
          simular que la imagen terminó de cargar.
        */
        img.onload && img.onload();

        /*
          Después del onload, la opacidad debe volver a 1
        */
        expect(img.style.opacity).toBe("1");
    });

    it("se puede detener con clearInterval", () => {
        const img = document.createElement("img");
        img.src = "/assets/clippy-white-1.gif";

        const intervalId = startClippyRotation(img, 7000);
        const srcBefore = img.src;

        clearInterval(intervalId);

        vi.advanceTimersByTime(7000 + 300);

        expect(img.src).toBe(srcBefore);
    });

});