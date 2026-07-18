import * as THREE from "three";
import "./styles.css";

const nodes = [
  {
    id: "signal",
    title: "Сигнал",
    description: "Лонгриды, рецензии и события, заметные с обратной стороны.",
    x: -0.5,
    y: -0.28,
    size: 1.05,
    kind: "section",
  },
  {
    id: "flicker",
    title: "Мерцание",
    description: "Визуальные материалы, подборки, фрагменты и малые формы.",
    x: 0.54,
    y: -0.14,
    size: 1.02,
    kind: "section",
  },
  {
    id: "residents",
    title: "Жители",
    description: "Интервью, голоса и фигуры культурной среды.",
    x: -0.1,
    y: 0.23,
    size: 1,
    kind: "section",
  },
  {
    id: "showcase",
    title: "Витрина",
    description: "Книги, обложки и предметы, которые появятся в магазине.",
    x: 0.34,
    y: 0.24,
    size: 0.86,
    kind: "support",
  },
  {
    id: "word",
    title: "Слово дня",
    description: "Ежедневная словарная находка с коротким комментарием.",
    x: -0.39,
    y: 0.06,
    size: 0.78,
    kind: "micro",
  },
  {
    id: "day",
    title: "Рубрика дня",
    description: "Глаз дня, солнце дня, бортовой журнал дня и другие вспышки.",
    x: 0.1,
    y: -0.46,
    size: 0.82,
    kind: "micro",
  },
  {
    id: "archive",
    title: "Архив",
    description: "Следы, документы и будущие материалы издания.",
    x: -0.62,
    y: -0.05,
    size: 0.72,
    kind: "support",
  },
  {
    id: "about",
    title: "О медиа",
    description: "Издание о литературе, визуальном искусстве и скрытых процессах.",
    x: 0.7,
    y: 0.03,
    size: 0.74,
    kind: "support",
  },
  {
    id: "contact",
    title: "Контакты",
    description: "Почта редакции и социальные каналы. Скоро здесь появятся ссылки.",
    x: 0.18,
    y: 0.4,
    size: 0.68,
    kind: "support",
  },
];

const edges = [
  ["signal", "word"],
  ["signal", "archive"],
  ["signal", "residents"],
  ["flicker", "showcase"],
  ["flicker", "day"],
  ["flicker", "about"],
  ["residents", "word"],
  ["residents", "contact"],
  ["showcase", "about"],
  ["day", "word"],
  ["archive", "day"],
  ["about", "contact"],
];

const fallingObjectSpecs = [
  { type: "vangogh", label: "Картина Ван Гога", aspect: 1.28, size: 0.22, speed: 0.0032, angle: 0.35 },
  { type: "dostoevsky", label: "Портрет Достоевского", aspect: 0.72, size: 0.24, speed: 0.0028, angle: 1.85 },
  { type: "book", label: "Книга Достоевского", aspect: 0.68, size: 0.22, speed: 0.0025, angle: 3.05 },
  { type: "rodin", label: "Статуя Родена", aspect: 0.52, size: 0.27, speed: 0.0035, angle: 4.3 },
  { type: "times", label: "Газета The Times", aspect: 0.68, size: 0.24, speed: 0.0026, angle: 5.2 },
];

const assetPath = (path) => `${import.meta.env.BASE_URL}${path}`;

const root = document.querySelector("#app");
root.innerHTML = `
  <main class="shell">
    <canvas class="scene" aria-hidden="true"></canvas>
    <section class="intro" aria-labelledby="page-title">
      <p class="kicker">независимое медиа</p>
      <h1 id="page-title">Обратная сторона</h1>
      <p class="lede">Онлайн-издание о литературе, визуальном искусстве и культурных инициативах, видимых с затемненной стороны процессов.</p>
    </section>
    <nav class="node-layer" aria-label="Разделы сайта"></nav>
    <aside class="note" aria-live="polite">
      <span class="note-title">Скоро</span>
      <span class="note-copy">первый выпуск, витрина и редакционные рубрики</span>
    </aside>
    <footer class="footer">
      <a href="mailto:hello@obratnaya.media">hello@obratnaya.media</a>
      <span>запуск в процессе</span>
    </footer>
  </main>
`;

const canvas = document.querySelector(".scene");
const nodeLayer = document.querySelector(".node-layer");
const noteTitle = document.querySelector(".note-title");
const noteCopy = document.querySelector(".note-copy");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const textureLoader = new THREE.TextureLoader();
const imageTextures = {
  vangogh: loadTexture(assetPath("assets/vangogh-starry-night.jpg")),
  dostoevsky: loadTexture(assetPath("assets/dostoevsky-portrait.jpg")),
  rodin: loadTexture(assetPath("assets/rodin-cutout.png")),
};

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 3;

const pointer = new THREE.Vector2(0, 0);
let activeId = "signal";
let width = 1;
let height = 1;
let scale = 1;
let graphOffsetX = 0;

const nodeMap = new Map(nodes.map((node) => [node.id, node]));
const meshMap = new Map();
const lineMap = new Map();

const blackHole = createBlackHole();
scene.add(blackHole.group);

const edgeGroup = new THREE.Group();
const nodeGroup = new THREE.Group();
const particleGroup = new THREE.Group();
const objectGroup = new THREE.Group();
scene.add(objectGroup, edgeGroup, particleGroup, nodeGroup);

const nodeButtons = nodes.map((node, index) => {
  const button = document.createElement("button");
  button.className = `node-label is-${node.kind}`;
  button.type = "button";
  button.dataset.id = node.id;
  button.innerHTML = `<span class="node-dot"></span><span class="node-text">${node.title}</span>`;
  button.addEventListener("pointerenter", () => setActive(node.id));
  button.addEventListener("focus", () => setActive(node.id));
  button.addEventListener("click", () => setActive(node.id));
  nodeLayer.append(button);

  const mesh = createNodeMesh(node, index);
  nodeGroup.add(mesh);
  meshMap.set(node.id, mesh);

  return button;
});

edges.forEach(([from, to]) => {
  const line = createEdge();
  edgeGroup.add(line);
  lineMap.set(`${from}-${to}`, line);
});

const particles = Array.from({ length: 32 }, (_, index) => {
  const particle = createParticle(index);
  particleGroup.add(particle.mesh);
  return particle;
});

const fallingObjects = fallingObjectSpecs.map((spec, index) => {
  const object = createFallingObject(spec, index);
  objectGroup.add(object.mesh);
  return object;
});

setActive(activeId);
resize();
window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / width - 0.5) * 2;
  pointer.y = -(event.clientY / height - 0.5) * 2;
});

renderer.setAnimationLoop((time) => render(time * 0.001));

function createBlackHole() {
  const group = new THREE.Group();

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 160),
    new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.98 }),
  );
  group.add(disc);

  const rings = [0.56, 0.78, 1.08, 1.36].map((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.66, radius, 192),
      new THREE.MeshBasicMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.13 - index * 0.021,
        side: THREE.DoubleSide,
      }),
    );
    ring.scale.y = 0.78 + index * 0.07;
    group.add(ring);
    return ring;
  });

  group.position.set(0.02, -0.02, 0);
  return { group, disc, rings };
}

function createNodeMesh(node, index) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.014 * node.size, 32),
    new THREE.MeshBasicMaterial({ color: 0x1d1d1d, transparent: true, opacity: 0.74 }),
  );
  mesh.userData = { index, node, baseX: node.x, baseY: node.y };
  return mesh;
}

function createEdge() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x232323, transparent: true, opacity: 0.17 }),
  );
}

function createParticle(index) {
  const angle = (index / 32) * Math.PI * 2;
  const radius = 0.74 + (index % 7) * 0.038;
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.004 + (index % 4) * 0.0014, 16),
    new THREE.MeshBasicMaterial({ color: 0x2b2b2b, transparent: true, opacity: 0.18 }),
  );
  return {
    mesh,
    angle,
    radius,
    speed: 0.045 + (index % 5) * 0.012,
    phase: index * 0.73,
  };
}

function createFallingObject(spec, index) {
  const texture = imageTextures[spec.type] ?? createObjectTexture(spec.type);
  const height = spec.size;
  const width = height * spec.aspect;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: spec.type === "rodin" ? 0.08 : 0,
      opacity: 0.92,
      depthTest: false,
    }),
  );
  mesh.renderOrder = 4;

  const object = {
    mesh,
    spec,
    index,
    angle: spec.angle,
    radius: 0,
    spin: index % 2 === 0 ? 1 : -1,
    phase: index * 1.9,
  };
  resetFallingObject(object, 0.08 * index);
  return object;
}

function resetFallingObject(object, radiusOffset = 0) {
  object.radius = 1.28 + radiusOffset;
  object.angle += Math.PI * 0.48 + object.index * 0.21;
  object.mesh.rotation.z = object.angle * 0.35;
  object.mesh.material.opacity = 0;
}

function createObjectTexture(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const ink = "#141414";
  const charcoal = "#2f2f2d";
  const grey = "#76756f";
  const shade = "#c9c4ba";
  const paper = "#f7f3eb";

  ctx.save();
  ctx.translate(192, 240);
  ctx.rotate(objectTextureRotation(type));
  ctx.translate(-192, -240);
  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 14;
  ctx.shadowOffsetY = 18;

  if (type === "book") {
    ctx.fillStyle = charcoal;
    roundRect(ctx, 116, 64, 172, 314, 12);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#0f0f0f";
    ctx.beginPath();
    ctx.moveTo(288, 64);
    ctx.lineTo(320, 91);
    ctx.lineTo(320, 392);
    ctx.lineTo(288, 378);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ece6dc";
    roundRect(ctx, 139, 87, 128, 258, 5);
    ctx.fill();
    ctx.fillStyle = "#181818";
    ctx.fillRect(117, 64, 32, 314);
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.fillRect(154, 99, 7, 234);
    ctx.fillStyle = "#181818";
    ctx.font = "700 22px Georgia, Times New Roman, serif";
    ctx.textAlign = "center";
    ctx.fillText("ДОСТОЕВСКИЙ", 203, 151);
    ctx.font = "500 15px Georgia, Times New Roman, serif";
    ctx.fillText("БРАТЬЯ КАРАМАЗОВЫ", 203, 181);
    ctx.strokeStyle = grey;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(169, 215);
    ctx.lineTo(239, 215);
    ctx.moveTo(169, 294);
    ctx.lineTo(239, 294);
    ctx.stroke();
  }

  if (type === "times") {
    ctx.fillStyle = "#9f9b92";
    roundRect(ctx, 104, 62, 182, 318, 8);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#2b2b29";
    ctx.beginPath();
    ctx.moveTo(286, 62);
    ctx.lineTo(318, 86);
    ctx.lineTo(318, 395);
    ctx.lineTo(286, 380);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = paper;
    roundRect(ctx, 119, 80, 146, 276, 5);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 11;
    ctx.strokeRect(111, 70, 168, 298);
    ctx.fillStyle = ink;
    ctx.font = "700 23px Georgia, Times New Roman, serif";
    ctx.textAlign = "center";
    ctx.fillText("THE TIMES", 192, 119);
    ctx.fillRect(139, 145, 104, 7);
    ctx.fillRect(139, 319, 88, 9);
    const photo = ctx.createLinearGradient(144, 174, 238, 280);
    photo.addColorStop(0, "#d9d3c8");
    photo.addColorStop(1, "#aaa59c");
    ctx.fillStyle = photo;
    ctx.fillRect(143, 174, 98, 102);
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(192, 226, 34, 44, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(128, 88);
    ctx.lineTo(250, 88);
    ctx.stroke();
  }

  if (type === "person") {
    ctx.strokeStyle = "rgba(0,0,0,0.24)";
    ctx.lineWidth = 26;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(203, 176);
    ctx.lineTo(252, 260);
    ctx.moveTo(177, 177);
    ctx.lineTo(128, 260);
    ctx.moveTo(180, 320);
    ctx.lineTo(154, 417);
    ctx.moveTo(206, 320);
    ctx.lineTo(239, 415);
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(192, 88, 41, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(193, 134);
    ctx.quadraticCurveTo(139, 208, 159, 326);
    ctx.lineTo(229, 326);
    ctx.quadraticCurveTo(248, 208, 193, 134);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 25;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(174, 182);
    ctx.lineTo(124, 265);
    ctx.moveTo(211, 183);
    ctx.lineTo(263, 263);
    ctx.moveTo(179, 318);
    ctx.lineTo(153, 419);
    ctx.moveTo(207, 318);
    ctx.lineTo(240, 418);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.ellipse(178, 72, 11, 18, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function loadTexture(path) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function objectTextureRotation(type) {
  return {
    painting: -0.08,
    book: 0.12,
    statue: -0.03,
    magazine: 0.08,
    person: -0.04,
  }[type];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function setActive(id) {
  activeId = id;
  const node = nodeMap.get(id);
  noteTitle.textContent = node.title;
  noteCopy.textContent = node.description;
  nodeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.id === id));
}

function render(time) {
  const slowTime = prefersReducedMotion ? 0 : time;
  const activeConnections = new Set(
    edges
      .filter(([from, to]) => from === activeId || to === activeId)
      .flat(),
  );

  blackHole.group.rotation.z = slowTime * 0.05;
  blackHole.group.position.x = graphOffsetX + 0.02 + pointer.x * 0.012;
  blackHole.group.position.y = -0.02 + pointer.y * 0.012;
  blackHole.rings.forEach((ring, index) => {
    ring.rotation.z = slowTime * (0.05 + index * 0.025);
    ring.material.opacity = 0.055 + Math.sin(slowTime * 0.7 + index) * 0.012;
  });

  nodes.forEach((node) => {
    const mesh = meshMap.get(node.id);
    const isActive = node.id === activeId;
    const isConnected = activeConnections.has(node.id);
    const driftX = Math.sin(slowTime * 0.38 + mesh.userData.index) * 0.012;
    const driftY = Math.cos(slowTime * 0.31 + mesh.userData.index * 1.7) * 0.012;
    const pull = isActive ? 0.025 : isConnected ? 0.012 : 0;

    const baseX = node.x + graphOffsetX;
    mesh.position.x = baseX + driftX + (blackHole.group.position.x - baseX) * pull;
    mesh.position.y = node.y + driftY + (blackHole.group.position.y - node.y) * pull;
    mesh.scale.setScalar(isActive ? 1.7 : isConnected ? 1.22 : 1);
    mesh.material.opacity = isActive ? 0.98 : isConnected ? 0.66 : 0.34;
  });

  edges.forEach(([from, to]) => {
    const line = lineMap.get(`${from}-${to}`);
    const fromMesh = meshMap.get(from);
    const toMesh = meshMap.get(to);
    const position = line.geometry.attributes.position;
    const isLit = from === activeId || to === activeId;

    position.setXYZ(0, fromMesh.position.x, fromMesh.position.y, 0);
    position.setXYZ(1, toMesh.position.x, toMesh.position.y, 0);
    position.needsUpdate = true;
    line.material.opacity = isLit ? 0.42 : 0.12;
  });

  particles.forEach((particle) => {
    particle.angle -= particle.speed * (prefersReducedMotion ? 0.2 : 1);
    particle.radius -= 0.00034 * (prefersReducedMotion ? 0.2 : 1);
    if (particle.radius < 0.4) {
      particle.radius = 1.18;
      particle.angle += Math.PI * 0.37;
    }
    const wobble = Math.sin(slowTime * 0.9 + particle.phase) * 0.035;
    particle.mesh.position.x = blackHole.group.position.x + Math.cos(particle.angle + wobble) * particle.radius * scale;
    particle.mesh.position.y = blackHole.group.position.y + Math.sin(particle.angle) * particle.radius;
    const fade = Math.min(1, Math.max(0, (particle.radius - 0.4) / 0.72));
    particle.mesh.material.opacity = 0.05 + fade * 0.18;
    particle.mesh.scale.setScalar(0.55 + fade);
  });

  fallingObjects.forEach((object) => {
    const motionScale = prefersReducedMotion ? 0.15 : 1;
    object.radius -= object.spec.speed * motionScale;
    object.angle -= (0.006 + object.index * 0.0015) * motionScale;

    if (object.radius < 0.36) {
      resetFallingObject(object, 0.04 * object.index);
    }

    const progress = 1 - Math.min(1, Math.max(0, (object.radius - 0.36) / 1.02));
    const spiral = Math.sin(slowTime * 0.75 + object.phase) * (0.05 + progress * 0.08);
    const xRadius = object.radius * (width < 720 ? 0.78 : 1.04);
    const yRadius = object.radius * (width < 720 ? 0.82 : 0.74);
    object.mesh.position.x = blackHole.group.position.x + Math.cos(object.angle + spiral) * xRadius * scale;
    object.mesh.position.y = blackHole.group.position.y + Math.sin(object.angle) * yRadius;
    object.mesh.rotation.z += object.spin * (0.006 + progress * 0.03) * motionScale;
    object.mesh.rotation.y = Math.sin(slowTime * 0.9 + object.phase) * 0.18;

    const sinkFade = Math.min(1, Math.max(0, (object.radius - 0.34) / 0.24));
    const entranceFade = Math.min(1, Math.max(0, (1.36 - object.radius) / 0.18));
    const objectScale = 0.32 + (object.radius / 1.28) * 1.1;
    object.mesh.scale.set(objectScale * (1 + progress * 0.45), objectScale * sinkFade * (1 - progress * 0.22), 1);
    object.mesh.material.opacity = 0.94 * sinkFade * entranceFade;
  });

  layoutLabels();
  renderer.render(scene, camera);
}

function layoutLabels() {
  nodes.forEach((node, index) => {
    const mesh = meshMap.get(node.id);
    const button = nodeButtons[index];
    const x = (mesh.position.x * 0.5 + 0.5) * width;
    const y = (-mesh.position.y * 0.5 + 0.5) * height;
    button.style.transform = `translate(${x}px, ${y}px)`;
  });
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  scale = width < 720 ? 0.72 : 1;
  graphOffsetX = width > 1080 ? 0.18 : 0;
  renderer.setSize(width, height, true);
  camera.left = -scale;
  camera.right = scale;
  camera.top = scale * (height / width);
  camera.bottom = -scale * (height / width);
  camera.updateProjectionMatrix();
  layoutLabels();
}
