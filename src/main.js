import "./styles.css";

// The current labels describe sections of the future media site, not the
// publishing projects represented by this card. Keep the data ready for later
// work, but do not expose it until the client supplies the final project list.
const projectContentReady = false;

const objectSpecs = [
  { type: "vangogh", width: 0.72, height: 0.58, duration: 14.2 },
  { type: "writer", width: 0.52, height: 0.72, duration: 15.8 },
  { type: "rodin", width: 0.48, height: 0.76, duration: 16.9 },
  { type: "times", width: 0.58, height: 0.78, duration: 13.6 },
];

const assetPath = (path) => `${import.meta.env.BASE_URL}${path}`;
const assetUrls = {
  vangogh: assetPath("assets/vangogh-starry-night.webp"),
  writer: assetPath("assets/dostoevsky-portrait.webp"),
  rodin: assetPath("assets/rodin-cutout.webp"),
  times: assetPath("assets/times-masthead.webp"),
};

const nodes = [
  { id: "signal", title: "Сигнал", description: "Лонгриды, рецензии и события, заметные с обратной стороны.", kind: "section" },
  { id: "flicker", title: "Мерцание", description: "Визуальные материалы, подборки, фрагменты и малые формы.", kind: "section" },
  { id: "residents", title: "Жители", description: "Интервью, голоса и фигуры культурной среды.", kind: "section" },
  { id: "showcase", title: "Витрина", description: "Книги, обложки и предметы, которые появятся в магазине.", kind: "support" },
  { id: "word", title: "Слово дня", description: "Ежедневная словарная находка с коротким комментарием.", kind: "micro" },
  { id: "day", title: "Рубрика дня", description: "Глаз дня, солнце дня, бортовой журнал дня и другие вспышки.", kind: "micro" },
  { id: "archive", title: "Архив", description: "Следы, документы и будущие материалы издания.", kind: "support" },
  { id: "about", title: "О медиа", description: "Издание о литературе, визуальном искусстве и скрытых процессах.", kind: "support" },
  { id: "contact", title: "Контакты", description: "hello@obratnaya.media\nЗапуск в процессе. Скоро здесь появятся ссылки.", kind: "support" },
];

const edges = [
  ["signal", "word"], ["signal", "archive"], ["signal", "residents"],
  ["flicker", "showcase"], ["flicker", "day"], ["flicker", "about"],
  ["residents", "word"], ["residents", "contact"], ["showcase", "about"],
  ["day", "word"], ["archive", "day"], ["about", "contact"],
];

const desktopLayout = {
  signal: { x: 0.25, y: 0.64 }, flicker: { x: 0.77, y: 0.57 },
  residents: { x: 0.45, y: 0.385 }, showcase: { x: 0.67, y: 0.38 },
  word: { x: 0.305, y: 0.47 }, day: { x: 0.55, y: 0.435 },
  archive: { x: 0.19, y: 0.525 }, about: { x: 0.85, y: 0.485 },
  contact: { x: 0.59, y: 0.3 },
};

const compactLayout = {
  residents: { angle: -90, radius: 1 }, contact: { angle: -50, radius: 0.8 },
  flicker: { angle: -10, radius: 0.9 }, about: { angle: 30, radius: 0.8 },
  showcase: { angle: 58, radius: 0.78 }, word: { angle: 112, radius: 0.66 },
  day: { angle: 152, radius: 0.72 }, archive: { angle: 190, radius: 1 },
  signal: { angle: 230, radius: 1 },
};

// A very short phone cannot fit nine readable labels around a circle. Three
// staggered rows preserve the network character without forcing labels on top
// of one another; regular phones continue to use the radial layout above.
const shortPhoneLayout = {
  signal: { x: 0.25, y: 0.12 }, residents: { x: 0.49, y: 0.08 }, contact: { x: 0.69, y: 0.16 },
  archive: { x: 0.19, y: 0.45 }, day: { x: 0.39, y: 0.42 }, flicker: { x: 0.72, y: 0.46 },
  word: { x: 0.3, y: 0.8 }, showcase: { x: 0.53, y: 0.78 }, about: { x: 0.72, y: 0.82 },
};

const root = document.querySelector("#app");
root.innerHTML = `
  <main class="shell">
    <canvas class="scene" aria-hidden="true"></canvas>
    <section class="intro" aria-labelledby="page-title">
      <p class="kicker">независимое медиа</p>
      <h1 id="page-title">Обратная сторона</h1>
      <p class="lede">Онлайн-издание о литературе, визуальном искусстве и культурных инициативах, падающих в затемненную область процесса.</p>
    </section>
    <nav class="node-layer" aria-label="Проекты Обратной стороны">
      <svg class="constellation-points" aria-hidden="true"></svg>
      <svg class="node-lines" aria-hidden="true"></svg>
    </nav>
    <aside class="info-panel" aria-live="polite"${projectContentReady ? "" : " hidden"}>
      <span class="info-title"></span><span class="info-copy"></span>
    </aside>
  </main>`;

const canvas = document.querySelector(".scene");
let ctx = canvas.getContext("2d", { alpha: false });
const roomCanvas = document.createElement("canvas");
const cachedRoomCtx = roomCanvas.getContext("2d", { alpha: false });
const intro = document.querySelector(".intro");
const nodeLayer = document.querySelector(".node-layer");
const constellationPoints = document.querySelector(".constellation-points");
const nodeLines = document.querySelector(".node-lines");
const infoTitle = document.querySelector(".info-title");
const infoCopy = document.querySelector(".info-copy");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const images = Object.fromEntries(Object.entries(assetUrls).map(([key, url]) => {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  return [key, image];
}));

const pointer = { x: 0, y: 0, easedX: 0, easedY: 0 };
const mobileGraph = { offsetX: 0, offsetY: 0, scale: 1, pointers: new Map(), pinchDistance: 0, pinchScale: 1, lastGestureAt: 0 };
const particles = Array.from({ length: 74 }, (_, i) => ({
  angle: i * 2.399, radius: 0.16 + (i % 17) * 0.035,
  speed: 0.025 + (i % 6) * 0.007, size: 0.7 + (i % 4) * 0.55,
  height: (i % 9) / 10,
}));
const fallingObjects = objectSpecs.map((spec, index) => ({
  ...spec, index, offset: index * 0.23, direction: index % 2 ? -1 : 1,
}));

let width = 1;
let height = 1;
let ratio = 1;
let activeNodeId = "signal";
let startTime = performance.now();
let lastTick = startTime;
let frameAccumulator = 0;
const targetFrameDuration = 1000 / 60;

const nodeButtons = nodes.map((node, index) => {
  const button = document.createElement("button");
  button.className = `node-label is-${node.kind}`;
  button.type = "button";
  button.dataset.id = node.id;
  button.setAttribute("aria-label", projectContentReady ? node.title : `Проект ${index + 1}: название уточняется`);
  button.innerHTML = `<span class="node-dot"></span>${projectContentReady ? `<span class="node-text">${node.title}</span>` : ""}`;
  ["pointerenter", "focus", "click"].forEach((eventName) => button.addEventListener(eventName, () => {
    if (eventName === "click" && Date.now() - mobileGraph.lastGestureAt < 260) return;
    if (isCompact() && projectContentReady) document.body.classList.add("has-mobile-selection");
    setActiveNode(node.id);
  }));
  nodeLayer.append(button);
  return button;
});

setActiveNode(activeNodeId);
resize();
addEventListener("resize", resize);
addEventListener("pointermove", (event) => {
  if (!isCompact()) {
    pointer.x = event.clientX / width - 0.5;
    pointer.y = event.clientY / height - 0.5;
  }
  moveGraphGesture(event);
});
addEventListener("pointerdown", beginGraphGesture);
addEventListener("pointerup", endGraphGesture);
addEventListener("pointercancel", endGraphGesture);
requestAnimationFrame(render);

function resize() {
  width = innerWidth;
  height = innerHeight;
  const budget = width < 720 ? 3_000_000 : 5_000_000;
  ratio = Math.max(1, Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(budget / (width * height))));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  rebuildRoomCache();
  layoutGraph();
}

function rebuildRoomCache() {
  roomCanvas.width = canvas.width;
  roomCanvas.height = canvas.height;
  cachedRoomCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const liveCtx = ctx;
  ctx = cachedRoomCtx;
  drawRoom(0, true);
  ctx = liveCtx;
}

function render(now) {
  requestAnimationFrame(render);
  frameAccumulator += Math.min(now - lastTick, 50);
  lastTick = now;
  if (frameAccumulator < targetFrameDuration - 0.1) return;

  const elapsed = (now - startTime) / 1000;
  const delta = Math.min(frameAccumulator / 1000, 0.05);
  frameAccumulator = Math.max(0, frameAccumulator - targetFrameDuration);
  pointer.easedX += (pointer.x - pointer.easedX) * Math.min(1, delta * 3.3);
  pointer.easedY += (pointer.y - pointer.easedY) * Math.min(1, delta * 3.3);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(roomCanvas, 0, 0);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawScene(elapsed);
}

function sceneMetrics(staticScene = false) {
  const mobile = width < 640;
  const tablet = width >= 640 && width < 1100;
  const parallaxX = staticScene ? 0 : pointer.easedX;
  const parallaxY = staticScene ? 0 : pointer.easedY;
  const horizon = height * (mobile ? 0.52 : 0.47) + parallaxY * 8;
  const vanishingX = width * 0.5 + parallaxX * 25;

  // The hole uses a different visual budget at each breakpoint. In particular,
  // its outermost ring now stays close to the phone width instead of inheriting
  // the much larger desktop proportions.
  const holeW = mobile
    ? Math.min(width * 0.265, height * 0.19)
    : tablet
      ? Math.min(width * 0.23, height * 0.24)
      : Math.min(width * 0.19, height * 0.27);

  return {
    horizon,
    vanishingX,
    perspectiveEdgeY: horizon + (height - horizon) * 0.16,
    holeX: width * 0.5 + parallaxX * 20,
    holeY: height * (mobile ? 0.68 : 0.69),
    holeW,
  };
}

function drawRoom(time, staticScene = false) {
  const m = sceneMetrics(staticScene);
  ctx.fillStyle = "#fbfaf7";
  ctx.fillRect(0, 0, width, height);

  const wall = ctx.createLinearGradient(0, 0, 0, m.horizon);
  wall.addColorStop(0, "#fdfcf9");
  wall.addColorStop(0.72, "#f8f6f2");
  wall.addColorStop(1, "#eeebe5");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, width, m.horizon + 2);

  const vanishingX = m.vanishingX;
  const leftPlane = ctx.createLinearGradient(0, 0, vanishingX, 0);
  leftPlane.addColorStop(0, "rgba(221,216,207,.09)");
  leftPlane.addColorStop(0.7, "rgba(247,244,239,.025)");
  leftPlane.addColorStop(1, "rgba(255,255,255,.075)");
  ctx.fillStyle = leftPlane;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(vanishingX, 0); ctx.lineTo(vanishingX, m.horizon); ctx.lineTo(0, height); ctx.closePath();
  ctx.fill();

  const rightPlane = ctx.createLinearGradient(vanishingX, 0, width, 0);
  rightPlane.addColorStop(0, "rgba(255,255,255,.075)");
  rightPlane.addColorStop(0.72, "rgba(246,243,238,.02)");
  rightPlane.addColorStop(1, "rgba(218,213,204,.07)");
  ctx.fillStyle = rightPlane;
  ctx.beginPath();
  ctx.moveTo(width, 0); ctx.lineTo(vanishingX, 0); ctx.lineTo(vanishingX, m.horizon); ctx.lineTo(width, height); ctx.closePath();
  ctx.fill();

  const floor = ctx.createLinearGradient(0, m.horizon, 0, height);
  floor.addColorStop(0, "#ebe8e2");
  floor.addColorStop(0.56, "#f5f2ed");
  floor.addColorStop(1, "#faf8f4");
  ctx.fillStyle = floor;
  ctx.fillRect(0, m.horizon, width, height - m.horizon);

  // A soft tonal crease replaces the hard drawn corner from the first 2D
  // version. The old 3D room read as space because of light, not an outline.
  const creaseWidth = Math.max(18, width * 0.022);
  const cornerShade = ctx.createLinearGradient(vanishingX - creaseWidth, 0, vanishingX + creaseWidth, 0);
  cornerShade.addColorStop(0, "rgba(93,86,76,0)");
  cornerShade.addColorStop(0.46, "rgba(93,86,76,.018)");
  cornerShade.addColorStop(0.5, "rgba(93,86,76,.052)");
  cornerShade.addColorStop(0.54, "rgba(255,255,255,.055)");
  cornerShade.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = cornerShade;
  ctx.fillRect(vanishingX - creaseWidth, 0, creaseWidth * 2, m.horizon + 1);

  ctx.strokeStyle = `rgba(64,59,52,${width < 640 ? 0.085 : 0.11})`;
  ctx.lineWidth = width < 640 ? 0.55 : 0.7;
  ctx.beginPath(); ctx.moveTo(vanishingX, 0); ctx.lineTo(vanishingX, m.horizon); ctx.stroke();

  ctx.strokeStyle = `rgba(64,59,52,${width < 640 ? 0.12 : 0.16})`;
  ctx.lineWidth = width < 640 ? 0.65 : 0.85;
  ctx.beginPath();
  ctx.moveTo(0, m.perspectiveEdgeY);
  ctx.lineTo(vanishingX, m.horizon);
  ctx.lineTo(width, m.perspectiveEdgeY);
  ctx.stroke();

  const glow = ctx.createRadialGradient(width * 0.5, height * 0.3, 0, width * 0.5, height * 0.3, Math.max(width, height) * 0.7);
  glow.addColorStop(0, "rgba(255,255,255,.3)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  drawWallHatching(m, vanishingX);

  // Fine deterministic grain keeps the paper/concrete character without a GPU texture.
  ctx.fillStyle = "rgba(38,34,29,.022)";
  for (let i = 0; i < 130; i += 1) {
    const x = (i * 197 + 37) % Math.max(1, width);
    const y = (i * 83 + Math.floor(time * 0.05)) % Math.max(1, height);
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawWallHatching(m, vanishingX) {
  const halfWidth = Math.max(1, width * 0.5);
  const cornerGap = Math.max(30, width * 0.028);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, m.horizon);
  ctx.clip();
  ctx.strokeStyle = `rgba(58,54,48,${width < 640 ? 0.07 : width < 1100 ? 0.085 : 0.105})`;
  ctx.lineWidth = width < 640 ? 0.55 : 0.64;
  ctx.lineCap = "round";
  const hatchCount = width < 640 ? 38 : width < 1100 ? 50 : 64;

  const strokeOnWall = (startX, startY, endX, endY, side) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(side === 0 ? 0 : vanishingX, 0, side === 0 ? vanishingX : width - vanishingX, m.horizon);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
  };

  for (let side = 0; side < 2; side += 1) {
    for (let index = 0; index < hatchCount; index += 1) {
      const seed = index + side * 41;
      const localX = ((seed * 83 + 29) % 997) / 997;
      const depth = ((seed * 47 + 13) % 991) / 991;
      const x = side === 0
        ? localX * vanishingX
        : vanishingX + localX * (width - vanishingX);
      const y = m.horizon * (0.16 + depth * 0.78);
      const distanceFromCorner = Math.abs(x - vanishingX) / halfWidth;
      const length = 14 + distanceFromCorner * 38 + (seed % 5) * 2.8;
      const direction = side === 0 ? 1 : -1;
      const rise = (2.2 + depth * 4.4) * direction;
      const endX = x + length * direction;
      const endY = y - rise;
      const reachesCorner = side === 0
        ? endX >= vanishingX - cornerGap
        : endX <= vanishingX + cornerGap;
      if (reachesCorner) continue;

      ctx.globalAlpha = 0.48 + (seed % 4) * 0.09;
      strokeOnWall(x, y, endX, endY, side);

      if (index % 7 === 0) {
        ctx.globalAlpha *= 0.58;
        strokeOnWall(
          x + 3 * direction,
          y + 3,
          x + (length * 0.68 + 3) * direction,
          y + 3 - rise * 0.68,
          side,
        );
      }
    }
  }
  ctx.restore();
}

function drawScene(time) {
  const m = sceneMetrics();
  const motionTime = reduceMotion ? time * 0.18 : time;
  drawHole(m, motionTime);

  const states = fallingObjects.map((item) => getObjectState(item, motionTime, m));
  states.filter((state) => state.behind).sort((a, b) => a.y - b.y).forEach(drawObject);
  drawDust(motionTime, m, true);
  states.filter((state) => !state.behind).sort((a, b) => a.y - b.y).forEach(drawObject);
  drawDust(motionTime, m, false);
}

function drawHole(m, time) {
  const w = m.holeW;
  const h = w * 0.34;
  const breath = Math.sin(time * (Math.PI * 2 / 5.2));
  const flowSignal = (
    breath * 0.78
    + Math.sin(time * 1.73 + 1.4) * 0.14
    + Math.sin(time * 2.37 + 3.1) * 0.08
  );
  const horizons = [
    { scale: 1.78, alpha: 0.035, line: 0.13, phase: 0.4 },
    { scale: 1.52, alpha: 0.05, line: 0.12, phase: 1.7 },
    { scale: 1.3, alpha: 0.07, line: 0.095, phase: 2.8 },
    { scale: 1.16, alpha: 0.075, line: 0.052, phase: 4.1 },
  ];
  ctx.save();
  // The accretion rings belong to the floor plane. Clipping them to its
  // perspective polygon prevents the wide ellipses from climbing onto the
  // walls on narrow and short screens.
  ctx.beginPath();
  ctx.moveTo(0, m.perspectiveEdgeY);
  ctx.lineTo(m.vanishingX, m.horizon);
  ctx.lineTo(width, m.perspectiveEdgeY);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.clip();
  horizons.forEach((horizon) => {
    const densityWave = Math.sin(time * 0.9 + horizon.phase) * 0.008;
    const flowScale = 1 + breath * 0.035 + flowSignal * 0.008 + densityWave;
    const flowAlpha = horizon.alpha * (1 + flowSignal * 0.48);
    ctx.strokeStyle = `rgba(70,67,62,${flowAlpha})`;
    ctx.lineWidth = Math.max(2, w * horizon.line * (1 + flowSignal * 0.16));
    ellipse(
      m.holeX,
      m.holeY + w * (horizon.scale - 1) * 0.012,
      w * horizon.scale * flowScale,
      h * horizon.scale * flowScale,
      true,
    );
  });
  ctx.restore();

  // This is an apparent change of the optical shadow, not a literal expansion
  // of the event horizon. Keeping it small makes the breathing readable while
  // the larger wave remains in the variable accretion flow.
  const opticalW = w * (1 + breath * 0.018);
  const opticalH = opticalW * 0.34;
  const shadow = ctx.createRadialGradient(m.holeX, m.holeY, opticalW * 0.12, m.holeX, m.holeY, opticalW * 0.74);
  shadow.addColorStop(0, "rgba(0,0,0,.96)");
  shadow.addColorStop(0.58, "rgba(0,0,0,.82)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.translate(m.holeX, m.holeY);
  ctx.scale(1.42, 0.68);
  ctx.fillStyle = shadow;
  ctx.beginPath(); ctx.arc(0, 0, opticalW * 0.78, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#000";
  ellipse(m.holeX, m.holeY, opticalW * 0.68, opticalH * 0.68);
}

function getObjectState(item, time, m) {
  const cycle = ((time / item.duration + item.offset) % 1 + 1) % 1;
  // A Newtonian t² acceleration is smoothly capped by an exponential term.
  // To a distant observer this makes the final approach asymptotic: the body
  // appears to freeze just outside the event horizon instead of crossing it.
  const observedFall = 1 - Math.exp(-5 * cycle * cycle);
  const horizonRadius = m.holeW * 0.71;
  const radius = horizonRadius + m.holeW * 1.18 * Math.exp(-5 * cycle * cycle);
  const orbitalPhase = 1 - Math.exp(-3.8 * cycle * cycle);
  const angle = item.index * 1.62 + item.direction * orbitalPhase * Math.PI * 3.7;
  // Every new cycle starts above the viewport, so objects enter the room from
  // the top instead of materialising halfway down a wall.
  const altitude = height * 0.76 * (1 - observedFall);
  const groundX = m.holeX + Math.cos(angle) * radius;
  const groundY = m.holeY + Math.sin(angle) * radius * 0.32;
  const x = groundX + pointer.easedX * (20 + item.index * 3);
  const y = groundY - altitude;
  const redshift = smoothstep(0.9, 0.997, observedFall);
  const tumble = item.direction * (cycle * Math.PI * 4.2 + Math.sin(time * 0.7 + item.index) * 0.18);
  return {
    item, cycle, redshift, behind: Math.sin(angle) < 0,
    x, y,
    groundX, groundY, angle,
    rotation: tumble,
    scale: (0.8 - observedFall * 0.27) * (width < 640 ? 0.72 : 1),
    alpha: Math.exp(-4.8 * redshift * redshift),
  };
}

function drawObject(state) {
  const { item, x, y, groundX, groundY, rotation, scale, redshift, alpha } = state;
  if (alpha <= 0.01) return;
  const base = Math.min(width, height) * 0.19;
  const objectW = base * item.width * scale;
  const objectH = base * item.height * scale;

  ctx.save();
  ctx.globalAlpha = alpha * (0.1 + state.cycle * 0.9);
  ctx.fillStyle = "rgba(0,0,0,.1)";
  ellipse(groundX, groundY + 2, objectW * 0.42, objectH * 0.1);
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha * (1 - redshift * 0.28);
  drawSprite(item.type, objectW, objectH);
  ctx.restore();
}

function drawSprite(type, w, h) {
  const image = images[type];
  if (type === "vangogh") {
    ctx.fillStyle = "#4d4942"; ctx.fillRect(-w * 0.57, -h * 0.58, w * 1.14, h * 1.16);
    ctx.fillStyle = "#111"; ctx.fillRect(w * 0.48, -h * 0.54, w * 0.18, h * 1.14);
    if (image.complete && image.naturalWidth) ctx.drawImage(image, -w * 0.46, -h * 0.45, w * 0.92, h * 0.9);
  } else if (type === "writer") {
    ctx.fillStyle = "#ded8cc"; ctx.fillRect(-w * 0.56, -h * 0.55, w * 1.12, h * 1.1);
    ctx.fillStyle = "#24211d"; ctx.fillRect(w * 0.48, -h * 0.53, w * 0.17, h * 1.1);
    if (image.complete && image.naturalWidth) ctx.drawImage(image, -w * 0.46, -h * 0.45, w * 0.92, h * 0.9);
  } else if (type === "rodin") {
    if (image.complete && image.naturalWidth) ctx.drawImage(image, -w * 0.62, -h * 0.62, w * 1.24, h * 1.24);
  } else if (type === "times") {
    ctx.fillStyle = "#e7dfd2"; ctx.fillRect(-w * 0.6, -h * 0.56, w * 1.2, h * 1.12);
    ctx.strokeStyle = "rgba(0,0,0,.28)"; ctx.lineWidth = 1; ctx.strokeRect(-w * 0.6, -h * 0.56, w * 1.2, h * 1.12);

    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(5, h * 0.095)}px Georgia, "Times New Roman", serif`;
    ctx.fillText("THE TIMES", 0, -h * 0.42, w * 0.98);
    if (image.complete && image.naturalWidth) {
      ctx.globalAlpha *= 0.82;
      ctx.drawImage(image, -w * 0.18, -h * 0.49, w * 0.36, h * 0.07);
      ctx.globalAlpha /= 0.82;
    }

    ctx.strokeStyle = "rgba(0,0,0,.72)";
    ctx.lineWidth = Math.max(0.6, h * 0.008);
    ctx.beginPath();
    ctx.moveTo(-w * 0.51, -h * 0.345); ctx.lineTo(w * 0.51, -h * 0.345);
    ctx.moveTo(-w * 0.51, -h * 0.31); ctx.lineTo(w * 0.51, -h * 0.31);
    ctx.stroke();

    ctx.font = `600 ${Math.max(4, h * 0.045)}px Georgia, "Times New Roman", serif`;
    ctx.fillText("CULTURE  ·  BOOKS  ·  ART", 0, -h * 0.255, w * 0.96);
    ctx.fillStyle = "rgba(17,17,17,.88)";
    const columns = [-0.43, -0.13, 0.17].map((position) => position * w);
    columns.forEach((columnX, columnIndex) => {
      for (let row = 0; row < 12; row += 1) {
        if (columnIndex === 1 && row >= 3 && row <= 7) continue;
        const lineW = w * (0.2 + ((row + columnIndex) % 3) * 0.025);
        ctx.fillRect(columnX, -h * 0.19 + row * h * 0.052, lineW, Math.max(0.7, h * 0.008));
      }
    });
    ctx.fillStyle = "#aaa39a";
    ctx.fillRect(-w * 0.095, -h * 0.035, w * 0.25, h * 0.25);
    ctx.fillStyle = "#292724";
    ctx.beginPath(); ctx.ellipse(w * 0.03, h * 0.09, w * 0.065, h * 0.075, -0.18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.14)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -h * 0.55); ctx.lineTo(0, h * 0.55); ctx.stroke();
  }
}

function drawDust(time, m, behind) {
  ctx.fillStyle = "rgba(62,57,50,.18)";
  particles.forEach((particle, index) => {
    const angle = particle.angle + time * particle.speed;
    const radiusPhase = ((time * 0.016 + index / particles.length) % 1);
    const radius = m.holeW * (1.7 - radiusPhase * 1.45);
    if ((Math.sin(angle) < 0) !== behind) return;
    const x = m.holeX + Math.cos(angle) * radius;
    const y = m.holeY + Math.sin(angle) * radius * 0.31 - (1 - radiusPhase) * particle.height * height * 0.16;
    ctx.globalAlpha = (1 - radiusPhase) * 0.52;
    ctx.beginPath(); ctx.arc(x, y, particle.size, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function ellipse(x, y, rx, ry, stroke = false) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  stroke ? ctx.stroke() : ctx.fill();
}

function setActiveNode(id) {
  activeNodeId = id;
  const node = nodes.find((item) => item.id === id);
  infoTitle.textContent = node.title;
  infoCopy.textContent = node.description;
  nodeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.id === id));
  layoutGraph();
}

function layoutGraph() {
  if (!nodeButtons.length) return;
  const positions = new Map(nodes.map((node) => [node.id, graphPosition(node)]));
  const connected = new Set(edges.filter(([a, b]) => a === activeNodeId || b === activeNodeId).flat());
  nodes.forEach((node, index) => {
    const position = positions.get(node.id);
    nodeButtons[index].style.transform = `translate(${position.x}px, ${position.y}px)`;
    nodeButtons[index].classList.toggle("is-connected", connected.has(node.id));
  });

  nodeLines.setAttribute("viewBox", `0 0 ${width} ${height}`);
  nodeLines.replaceChildren(...edges.map(([from, to], index) => {
    const a = positions.get(from); const b = positions.get(to);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", a.x + 6); line.setAttribute("y1", a.y + 6);
    line.setAttribute("x2", b.x + 6); line.setAttribute("y2", b.y + 6);
    if (from === activeNodeId || to === activeNodeId) line.setAttribute("class", "is-lit");
    line.style.transitionDelay = isCompact() ? `${(index % 3) * 70}ms` : "0ms";
    return line;
  }));
  layoutDecorations();
}

function graphPosition(node) {
  if (width >= 1100) return { x: width * desktopLayout[node.id].x, y: height * desktopLayout[node.id].y };
  if (width >= 640) {
    const p = desktopLayout[node.id];
    const cx = width * 0.5; const cy = height * 0.46;
    return { x: cx + (width * p.x - cx) * mobileGraph.scale + mobileGraph.offsetX, y: cy + (height * (0.16 + p.y * 0.6) - cy) * mobileGraph.scale + mobileGraph.offsetY };
  }
  const zone = constellationZone();
  if (height < 700) {
    const p = shortPhoneLayout[node.id];
    const centerX = width * 0.5;
    const centerY = zone.safeTop + zone.zoneHeight * 0.5;
    const rawX = width * p.x;
    const rawY = zone.safeTop + zone.zoneHeight * p.y;
    return {
      x: centerX + (rawX - centerX) * mobileGraph.scale + mobileGraph.offsetX,
      y: centerY + (rawY - centerY) * mobileGraph.scale + mobileGraph.offsetY,
    };
  }
  const layout = compactLayout[node.id];
  const radiusX = zone.radiusX * layout.radius * mobileGraph.scale;
  const radiusY = zone.radiusY * layout.radius * mobileGraph.scale;
  const angle = layout.angle * Math.PI / 180;
  return {
    x: width * 0.5 + Math.cos(angle) * radiusX + mobileGraph.offsetX,
    y: zone.centerY + Math.sin(angle) * radiusY + mobileGraph.offsetY,
  };
}

function constellationZone() {
  const safeTop = intro.getBoundingClientRect().bottom + Math.max(16, height * 0.022);
  const floorBoundary = sceneMetrics(true).perspectiveEdgeY;
  const safeBottom = width < 640
    ? Math.min(height * 0.61, floorBoundary - 18)
    : height * 0.62 - 26;
  const zoneHeight = Math.max(60, safeBottom - safeTop);
  const radiusY = Math.max(32, Math.min(zoneHeight / 2, width * 0.4)) * 0.95;
  const radiusX = width < 640 && height < 700
    ? Math.min(width * 0.32, Math.max(radiusY * 2.25, width * 0.3))
    : radiusY;
  return {
    safeTop,
    zoneHeight,
    centerY: safeTop + zoneHeight / 2 + Math.min(12, height * 0.015),
    radiusX,
    radiusY,
  };
}

function layoutDecorations() {
  constellationPoints.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const elements = [];
  const zone = width < 640 ? constellationZone() : null;
  const center = zone
    ? { x: width * 0.5, y: zone.centerY, rx: zone.radiusX * 0.82, ry: zone.radiusY * 0.68 }
    : { x: width * 0.48, y: height * 0.52, rx: width * 0.29, ry: height * 0.18 };
  for (let i = 0; i < (width < 640 ? 34 : 42); i += 1) {
    const angle = -1.2 + i * 2.399963;
    const spread = 0.3 + (i % 8) / 10 + Math.sqrt((i + 1) / 42) * 0.32;
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", center.x + Math.cos(angle) * center.rx * spread);
    dot.setAttribute("cy", center.y + Math.sin(angle) * center.ry * spread);
    dot.setAttribute("r", 1 + (i % 4) * 0.35);
    dot.setAttribute("class", "constellation-dot"); elements.push(dot);
  }
  constellationPoints.replaceChildren(...elements);
}

function isCompact() { return width < 1100; }

function beginGraphGesture(event) {
  if (!isCompact() || event.pointerType !== "touch") return;
  mobileGraph.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (mobileGraph.pointers.size === 2) {
    const [a, b] = [...mobileGraph.pointers.values()];
    mobileGraph.pinchDistance = Math.hypot(b.x - a.x, b.y - a.y);
    mobileGraph.pinchScale = mobileGraph.scale;
  }
}

function moveGraphGesture(event) {
  const previous = mobileGraph.pointers.get(event.pointerId);
  if (!previous) return;
  const next = { x: event.clientX, y: event.clientY };
  mobileGraph.pointers.set(event.pointerId, next);
  if (mobileGraph.pointers.size === 1 && mobileGraph.scale > 1) {
    const limit = Math.min(width, height) * (mobileGraph.scale - 0.8) * 0.25;
    mobileGraph.offsetX = clamp(mobileGraph.offsetX + next.x - previous.x, -limit, limit);
    mobileGraph.offsetY = clamp(mobileGraph.offsetY + next.y - previous.y, -limit * 0.55, limit * 0.55);
  } else if (mobileGraph.pointers.size === 2) {
    const [a, b] = [...mobileGraph.pointers.values()];
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    mobileGraph.scale = clamp(mobileGraph.pinchScale * distance / Math.max(1, mobileGraph.pinchDistance), 1, 2.4);
  }
  mobileGraph.lastGestureAt = Date.now();
  layoutGraph();
}

function endGraphGesture(event) {
  mobileGraph.pointers.delete(event.pointerId);
  if (mobileGraph.pointers.size < 2) mobileGraph.pinchDistance = 0;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function smoothstep(min, max, value) {
  const x = clamp((value - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}
