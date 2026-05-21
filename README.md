# onetricks-client

Cliente de escritorio premium inspirado en Blitz / OP.GG para [onetricks.gg](https://www.onetricks.gg/es). Importa de manera 100% automática las runas y hechizos de los mejores One-tricks del mundo directamente a tu cliente de League of Legends en tiempo real.

## Características Principales

*   **Importación 100% Automática (Auto-Apply)**: Detecta al instante cuando estás en Selección de Campeón, lee tu personaje seleccionado (ya sea hover o pick) y configura tus runas y hechizos sin que tengas que hacer un solo clic.
*   **Bypass Seguro de Cloudflare**: Utiliza un navegador Chromium "offscreen" (fuera de pantalla) para simular navegación humana real, lo que le permite obtener la información de `onetricks.gg` de forma fiable y segura sin bloqueos de red (`403` / `429`).
*   **Autodetección LCU Resiliente**: Busca automáticamente tu ruta de League of Legends escaneando los procesos activos del sistema (`LeagueClientUx` y `LeagueClient`), dando soporte inmediato a instalaciones personalizadas en discos alternativos (`D:`, `E:`, `F:`, etc.).
*   **Alineación Heurística con Data Dragon**: Almacena en caché los assets de Riot Games oficiales. Si la estructura visual de la web de Onetricks cambia, el motor decodifica y empareja las runas basándose en heurísticas visuales de imágenes oficiales.
*   **Diseño Interfaz Ultra Premium**: Interfaz glassmorphism oscura con sutiles microanimaciones CSS, colores HSL harmonizados, tipografía Outfit e indicadores palpitantes de estado en tiempo real.
*   **Simulador Completo Integrado (`mock-lcu.js`)**: Entorno de pruebas offline idéntico a la LCU de Riot Games para probar la funcionalidad completa del cliente sin necesidad de abrir el juego.

---

## ⚡ Requisitos Previos

*   [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada).
*   [Git](https://git-scm.com/) (Instalado y configurado en tu consola).

---

## 🚀 Instalación y Uso

1.  **Clona el repositorio**:
    ```bash
    git clone https://github.com/Triboott/onetricks-client.git
    cd onetricks-client
    ```

2.  **Instala las dependencias**:
    ```bash
    npm install
    ```

3.  **Ejecuta la aplicación**:
    *   **Con el juego abierto**: Simplemente abre tu League of Legends y ejecuta el programa:
        ```bash
        npm start
        ```
    *   **Prueba Offline (Sin abrir el juego)**:
        *   Abre una terminal y ejecuta el simulador de Riot:
            ```bash
            node mock-lcu.js
            ```
        *   Abre otra terminal y ejecuta el cliente:
            ```bash
            npm start
            ```
        *   En el cliente de Onetricks, ve a **Ajustes** (engranaje), pon la ruta de la carpeta del proyecto (`c:\Users\helic\Desktop\onetricks cliente`), haz clic en **Guardar** y cierra los ajustes. ¡Verás cómo se conecta al instante y simula la importación en tiempo real!

---

## 🛠️ Tecnologías

*   **Core**: Electron, JavaScript ES6+, HTML5
*   **Estilos (CSS)**: Vanilla CSS (Glassmorphic Dark Mode, CSS Transitions, Grid Layout)
*   **Comunicación LCU**: HTTPS local (bypassing SSL self-signed certificates) & WebSocket persistente.
