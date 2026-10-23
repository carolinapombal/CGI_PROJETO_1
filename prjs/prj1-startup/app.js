import {
    loadShadersFromURLS,
    buildProgramFromSources,
    setupWebGL
} from "../../libs/utils.js";

const MAX_SITES = 32;

/** @type {HTMLCanvasElement} */
let canvas;

/** @type {WebGL2RenderingContext} */
let gl;

let program;
let siteProgram;

let quad_vao;
let site_vao;
let siteBuffer;
let siteColorBuffer;

// Pontos do diagrama.
let sites = [];

// Configurações de renderização.
let metric = 0;       // 0: Euclidiana, 1: Manhattan, 2: Chebyshev
let showBorders = true;
let renderMode = 0;

// Configurações da câmara.
let zoom = 1.0;
let panX = 0.0;
let panY = 0.0;

// Posição atual do rato.
let pointerX = 0;
let pointerY = 0;

// Controlo das interações com o rato.
let mouseDown = false;
let dragged = false;
let selectedSite = -1;

let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;

const DRAG_THRESHOLD = 4;
const SITE_PICK_RADIUS = 12;

// Cores dos pontos.
const palette = [
    [0.90, 0.22, 0.24],
    [0.20, 0.80, 0.42],
    [0.62, 0.24, 0.80],
    [0.95, 0.83, 0.20],
    [0.95, 0.48, 0.24],
    [0.20, 0.75, 0.85],
    [0.65, 0.25, 0.75],
    [0.35, 0.80, 0.25],
    [0.95, 0.25, 0.62],
    [0.25, 0.90, 0.70],
    [0.30, 0.45, 0.95],
    [0.75, 0.80, 0.25]
];

// ---------------------------------------------------------------------------
// Conversão entre coordenadas do ecrã e coordenadas do mundo.
// ---------------------------------------------------------------------------

function worldScale() {
    return Math.max(1, Math.min(canvas.width, canvas.height)) * zoom;
}

function screenToWorld(x, y) {
    const scale = worldScale();

    return {
        x: (x - canvas.width / 2) / scale + panX,
        y: (canvas.height / 2 - y) / scale + panY
    };
}

function worldToScreen(x, y) {
    const scale = worldScale();

    return {
        x: (x - panX) * scale + canvas.width / 2,
        y: canvas.height / 2 - (y - panY) * scale
    };
}

// ---------------------------------------------------------------------------

function distance(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);

    switch (metric) {
        case 1:
            return dx + dy;

        case 2:
            return Math.max(dx, dy);

        default:
            return Math.hypot(dx, dy);
    }
}

// Procura o ponto mais próximo do rato.
function findSiteAt(x, y) {
    let nearest = -1;
    let minDistance = SITE_PICK_RADIUS;

    for (let i = 0; i < sites.length; i++) {
        const p = worldToScreen(sites[i].x, sites[i].y);
        const d = Math.hypot(p.x - x, p.y - y);

        if (d < minDistance) {
            minDistance = d;
            nearest = i;
        }
    }

    return nearest;
}

// ---------------------------------------------------------------------------


function on_mouse_down(x, y) {
    pointerX = x;
    pointerY = y;

    mouseDown = true;
    dragged = false;

    selectedSite = findSiteAt(x, y);

    startX = x;
    startY = y;
    lastX = x;
    lastY = y;
}

function on_mouse_move(x, y) {
    pointerX = x;
    pointerY = y;

    if (!mouseDown) {
        return;
    }

    const totalMovement = Math.hypot(
        x - startX,
        y - startY
    );

    if (!dragged && totalMovement > DRAG_THRESHOLD) {
        dragged = true;
    }

    if (!dragged) {
        return;
    }

    if (selectedSite >= 0) {
        // Move o ponto selecionado.
        const p = screenToWorld(x, y);

        sites[selectedSite].x = p.x;
        sites[selectedSite].y = p.y;
    } else {
        // Move a área de visualização.
        const scale = worldScale();

        panX -= (x - lastX) / scale;
        panY += (y - lastY) / scale;
    }

    lastX = x;
    lastY = y;
}

function on_mouse_up(x, y) {
    pointerX = x;
    pointerY = y;

    if (!mouseDown) {
        return;
    }

    // Cria um ponto quando se clica numa zona vazia.
    if (!dragged && selectedSite < 0 && sites.length < MAX_SITES) {
        const p = screenToWorld(x, y);
        const color = palette[sites.length % palette.length];

        sites.push({
            x: p.x,
            y: p.y,
            color: [...color]
        });
    }

    mouseDown = false;
    dragged = false;
    selectedSite = -1;
}

// dy > 0 quando a roda do rato é deslocada para baixo.
function on_wheel(x, y, dy) {
    pointerX = x;
    pointerY = y;

    // Mantém a posição sob o rato durante o zoom.
    const before = screenToWorld(x, y);

    const factor = dy < 0 ? 1.15 : 1 / 1.15;

    zoom = Math.max(
        0.05,
        Math.min(zoom * factor, 100)
    );

    const after = screenToWorld(x, y);

    panX += before.x - after.x;
    panY += before.y - after.y;
}

// ---------------------------------------------------------------------------

function on_key(key) {
    switch (key) {
        case '1':
            // Distância Euclidiana.
            metric = 0;
            break;

        case '2':
            // Distância de Manhattan.
            metric = 1;
            break;

        case '3':
            // Distância de Chebyshev.
            metric = 2;
            break;

        case 'b':
            // Ativa ou desativa as fronteiras.
            showBorders = !showBorders;
            break;

        case 'x': {
            // Remove o ponto sob o rato.
            const index = findSiteAt(pointerX, pointerY);

            if (index >= 0) {
                sites.splice(index, 1);
            }

            break;
        }

        case 'm':
            // Mantém o modo Search até ser implementada
            // a técnica Surfaces + Depth Buffer.
            renderMode = 0;
            break;
    }
}

// ---------------------------------------------------------------------------

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);
}

// ---------------------------------------------------------------------------

function setup_input() {
    canvas.addEventListener("mousedown", (event) => on_mouse_down(event.offsetX, event.offsetY));
    canvas.addEventListener("mousemove", (event) => on_mouse_move(event.offsetX, event.offsetY));
    window.addEventListener("mouseup", (event) => on_mouse_up(event.offsetX, event.offsetY));
    canvas.addEventListener("wheel", (event) => {
        on_wheel(event.offsetX, event.offsetY, event.deltaY);
        event.preventDefault();     // don't let the page scroll as well
    });
    window.addEventListener("keydown", (event) => on_key(event.key));
}

// ---------------------------------------------------------------------------
// Criação do quadrilátero que ocupa todo o ecrã.
// ---------------------------------------------------------------------------

function createQuad() {
    const corners = new Float32Array([
        -1, -1,
         1, -1,
         1,  1,

        -1, -1,
         1,  1,
        -1,  1
    ]);

    quad_vao = gl.createVertexArray();
    gl.bindVertexArray(quad_vao);

    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(
        gl.ARRAY_BUFFER,
        corners,
        gl.STATIC_DRAW
    );

    const location = gl.getAttribLocation(
        program,
        "a_position"
    );

    gl.enableVertexAttribArray(location);

    gl.vertexAttribPointer(
        location,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.bindVertexArray(null);
}

// ---------------------------------------------------------------------------
// Criação dos buffers utilizados para desenhar os pontos.
// ---------------------------------------------------------------------------

function createSiteBuffers() {
    site_vao = gl.createVertexArray();
    gl.bindVertexArray(site_vao);

    // Buffer das posições.
    siteBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, siteBuffer);

    gl.bufferData(
        gl.ARRAY_BUFFER,
        MAX_SITES * 2 * 4,
        gl.DYNAMIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(
        siteProgram,
        "a_position"
    );

    gl.enableVertexAttribArray(positionLocation);

    gl.vertexAttribPointer(
        positionLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );

    // Buffer das cores.
    siteColorBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, siteColorBuffer);

    gl.bufferData(
        gl.ARRAY_BUFFER,
        MAX_SITES * 3 * 4,
        gl.DYNAMIC_DRAW
    );

    const colorLocation = gl.getAttribLocation(
        siteProgram,
        "a_color"
    );

    gl.enableVertexAttribArray(colorLocation);

    gl.vertexAttribPointer(
        colorLocation,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.bindVertexArray(null);
}

// Atualiza os buffers com as posições e cores dos pontos.
function updateSiteBuffers() {
    const positions = new Float32Array(MAX_SITES * 2);
    const colors = new Float32Array(MAX_SITES * 3);

    for (let i = 0; i < sites.length; i++) {
        positions[2 * i] = sites[i].x;
        positions[2 * i + 1] = sites[i].y;

        colors[3 * i] = sites[i].color[0];
        colors[3 * i + 1] = sites[i].color[1];
        colors[3 * i + 2] = sites[i].color[2];
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, siteBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);

    gl.bindBuffer(gl.ARRAY_BUFFER, siteColorBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors);
}

// ---------------------------------------------------------------------------
// Desenho do diagrama de Voronoi.
// ---------------------------------------------------------------------------

function drawDiagram() {
    gl.useProgram(program);

    gl.uniform2f(
        gl.getUniformLocation(program, "u_resolution"),
        canvas.width,
        canvas.height
    );

    gl.uniform2f(
        gl.getUniformLocation(program, "u_pan"),
        panX,
        panY
    );

    gl.uniform1f(
        gl.getUniformLocation(program, "u_zoom"),
        zoom
    );

    gl.uniform1i(
        gl.getUniformLocation(program, "u_metric"),
        metric
    );

    gl.uniform1i(
        gl.getUniformLocation(program, "u_n_sites"),
        sites.length
    );

    gl.uniform1i(
        gl.getUniformLocation(program, "u_show_borders"),
        showBorders ? 1 : 0
    );

    const positions = new Float32Array(MAX_SITES * 2);
    const colors = new Float32Array(MAX_SITES * 3);

    for (let i = 0; i < sites.length; i++) {
        positions[2 * i] = sites[i].x;
        positions[2 * i + 1] = sites[i].y;

        colors[3 * i] = sites[i].color[0];
        colors[3 * i + 1] = sites[i].color[1];
        colors[3 * i + 2] = sites[i].color[2];
    }

    gl.uniform2fv(
        gl.getUniformLocation(program, "u_site_position[0]"),
        positions
    );

    gl.uniform3fv(
        gl.getUniformLocation(program, "u_site_color[0]"),
        colors
    );

    gl.bindVertexArray(quad_vao);

    gl.drawArrays(
        gl.TRIANGLES,
        0,
        6
    );

    gl.bindVertexArray(null);
}

// ---------------------------------------------------------------------------
// Desenho dos pontos sobre o diagrama.
// ---------------------------------------------------------------------------

function drawSites() {
    if (sites.length === 0) {
        return;
    }

    updateSiteBuffers();

    gl.useProgram(siteProgram);

    gl.uniform2f(
        gl.getUniformLocation(siteProgram, "u_resolution"),
        canvas.width,
        canvas.height
    );

    gl.uniform2f(
        gl.getUniformLocation(siteProgram, "u_pan"),
        panX,
        panY
    );

    gl.uniform1f(
        gl.getUniformLocation(siteProgram, "u_zoom"),
        zoom
    );

    gl.bindVertexArray(site_vao);

    gl.drawArrays(
        gl.POINTS,
        0,
        sites.length
    );

    gl.bindVertexArray(null);
}

// ---------------------------------------------------------------------------

function setup(shaders) {
    canvas = document.getElementById("gl-canvas");
    gl = setupWebGL(canvas);

    program = buildProgramFromSources(
        gl,
        shaders["quad.vert"],
        shaders["quad.frag"]
    );

    siteProgram = buildProgramFromSources(
        gl,
        shaders["site.vert"],
        shaders["site.frag"]
    );

    createQuad();
    createSiteBuffers();

    resize();

    window.addEventListener("resize", resize);

    setup_input();

    gl.clearColor(
        0.0,
        0.0,
        0.0,
        1.0
    );

    window.requestAnimationFrame(animate);
}

// ---------------------------------------------------------------------------
// Ciclo de renderização.
// ---------------------------------------------------------------------------

function animate(timestamp) {
    window.requestAnimationFrame(animate);

    gl.clear(gl.COLOR_BUFFER_BIT);

    drawDiagram();
    drawSites();

    gl.bindVertexArray(null);
    gl.useProgram(null);
}

// Carrega os shaders e inicia a aplicação.
loadShadersFromURLS([
    "quad.vert",
    "quad.frag",
    "site.vert",
    "site.frag"
]).then(shaders => setup(shaders));