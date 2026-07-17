import * as THREE from "three";
import "./styles.css";

const objectSpecs = [
  { type: "vangogh", label: "Картина Ван Гога", width: 0.72, height: 0.58, speed: 0.0068 },
  { type: "writer", label: "Писатель", width: 0.52, height: 0.72, speed: 0.006 },
  { type: "rodin", label: "Статуя Родена", width: 0.48, height: 0.76, speed: 0.0056 },
  { type: "times", label: "The Times", width: 0.34, height: 0.78, speed: 0.0072 },
];

const assetPath = (path) => `${import.meta.env.BASE_URL}${path}`;
const assetUrls = {
  vangogh: assetPath("assets/vangogh-starry-night.jpg"),
  writer: assetPath("assets/dostoevsky-portrait.jpg"),
  rodin: assetPath("assets/rodin-cutout.png"),
  times: assetPath("assets/times-masthead.png"),
};

const nodes = [
  {
    id: "signal",
    title: "Сигнал",
    description: "Лонгриды, рецензии и события, заметные с обратной стороны.",
    ringAngle: 120,
    kind: "section",
  },
  {
    id: "flicker",
    title: "Мерцание",
    description: "Визуальные материалы, подборки, фрагменты и малые формы.",
    ringAngle: 55,
    kind: "section",
  },
  {
    id: "residents",
    title: "Жители",
    description: "Интервью, голоса и фигуры культурной среды.",
    apex: true,
    kind: "section",
  },
  {
    id: "showcase",
    title: "Витрина",
    description: "Книги, обложки и предметы, которые появятся в магазине.",
    ringAngle: 20,
    kind: "support",
  },
  {
    id: "word",
    title: "Слово дня",
    description: "Ежедневная словарная находка с коротким комментарием.",
    ringAngle: 90,
    kind: "micro",
  },
  {
    id: "archive",
    title: "Архив",
    description: "Следы, документы и будущие материалы издания.",
    ringAngle: 160,
    kind: "support",
  },
];

const edges = [
  ["signal", "archive"],
  ["signal", "word"],
  ["signal", "residents"],
  ["archive", "residents"],
  ["archive", "word"],
  ["word", "residents"],
  ["word", "flicker"],
  ["flicker", "residents"],
  ["flicker", "showcase"],
  ["showcase", "word"],
  ["showcase", "residents"],
];

const constellationLayout = {
  residents: { x: 0.5, y: 0.36 },
  flicker: { x: 0.79, y: 0.44 },
  signal: { x: 0.22, y: 0.5 },
  word: { x: 0.52, y: 0.55 },
  showcase: { x: 0.82, y: 0.56 },
  archive: { x: 0.18, y: 0.61 },
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
    <nav class="node-layer" aria-label="Разделы сайта">
      <svg class="node-lines" aria-hidden="true"></svg>
    </nav>
    <aside class="info-panel" aria-live="polite">
      <span class="info-title"></span>
      <span class="info-copy"></span>
    </aside>
    <footer class="footer">
      <a href="mailto:hello@obratnaya.media">hello@obratnaya.media</a>
      <span>запуск в процессе</span>
    </footer>
  </main>
`;

const canvas = document.querySelector(".scene");
const nodeLayer = document.querySelector(".node-layer");
const nodeLines = document.querySelector(".node-lines");
const infoTitle = document.querySelector(".info-title");
const infoCopy = document.querySelector(".info-copy");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pointer = new THREE.Vector2(0, 0);
const mobileGraph = {
  expanded: false,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  pointers: new Map(),
  pinchDistance: 0,
  pinchScale: 1,
  lastGestureAt: 0,
};
let activeNodeId = "signal";

const nodeButtons = nodes.map((node) => {
  const button = document.createElement("button");
  button.className = `node-label is-${node.kind}`;
  button.type = "button";
  button.dataset.id = node.id;
  button.innerHTML = `<span class="node-dot"></span><span class="node-text">${node.title}</span>`;
  button.addEventListener("pointerenter", () => setActiveNode(node.id));
  button.addEventListener("focus", () => setActiveNode(node.id));
  button.addEventListener("click", () => {
    if (Date.now() - mobileGraph.lastGestureAt < 260) return;
    if (isConstellationViewport() && !mobileGraph.expanded) {
      expandMobileGraph();
    }
    setActiveNode(node.id);
  });
  nodeLayer.append(button);
  return button;
});

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: false,
  antialias: false,
  failIfMajorPerformanceCaveat: false,
  powerPreference: "default",
});
renderer.setClearColor(0xfbfaf7, 1);

const textureLoader = new THREE.TextureLoader();
const imageAssets = {
  vangogh: loadAssetTexture(assetUrls.vangogh),
  writer: loadAssetTexture(assetUrls.writer),
  rodin: loadAssetTexture(assetUrls.rodin),
  times: loadAssetTexture(assetUrls.times),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfbfaf7);
scene.fog = new THREE.FogExp2(0xfbfaf7, 0.04);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
camera.position.set(0, 3.15, 7.2);
camera.lookAt(0, 0.68, -1.05);

const ambient = new THREE.HemisphereLight(0xffffff, 0x8d877c, 1.85);
scene.add(ambient);

const keyLight = new THREE.PointLight(0xffffff, 22, 9, 1.5);
keyLight.position.set(0, 3.65, 0.85);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.9);
rimLight.position.set(-2.7, 4.2, 2.8);
scene.add(rimLight);

const room = createRoom();
scene.add(room.group);

const blackHole = createFloorHole();
scene.add(blackHole.group);

const fallingObjects = objectSpecs.map((spec, index) => {
  const item = createFallingObject(spec, index);
  scene.add(item.group);
  return item;
});

const dust = Array.from({ length: 70 }, (_, index) => {
  const particle = createDust(index);
  scene.add(particle.mesh);
  return particle;
});

let previousTime = 0;

setActiveNode(activeNodeId);
resize();
window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
});
window.addEventListener("pointerdown", beginMobileGraphGesture);
window.addEventListener("pointermove", moveMobileGraphGesture);
window.addEventListener("pointerup", endMobileGraphGesture);
window.addEventListener("pointercancel", endMobileGraphGesture);

renderer.setAnimationLoop((time) => render(time * 0.001));

function createRoom() {
  const group = new THREE.Group();
  const concrete = createConcreteTexture();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(9.4, 8.2, 1, 1),
    new THREE.MeshStandardMaterial({
      map: concrete,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.18,
      roughness: 0.92,
      metalness: 0,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.02, 0.15);
  floor.receiveShadow = true;
  group.add(floor);

  const wallMaterial = new THREE.MeshBasicMaterial({
    map: concrete,
    color: 0xffffff,
    side: THREE.DoubleSide,
  });

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 4.8), wallMaterial);
  leftWall.position.set(-2.2, 2.25, -3.0);
  leftWall.rotation.y = Math.PI / 4;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 4.8), wallMaterial);
  rightWall.position.set(2.2, 2.25, -3.0);
  rightWall.rotation.y = -Math.PI / 4;
  group.add(rightWall);

  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 4.7, 0.018),
    new THREE.MeshBasicMaterial({ color: 0xcfc9bf, transparent: true, opacity: 0.22 }),
  );
  seam.position.set(0, 2.2, -3.0);
  group.add(seam);

  return { group };
}

function createFloorHole() {
  const group = new THREE.Group();

  const outerShadow = new THREE.Mesh(
    new THREE.RingGeometry(1.22, 2.08, 160),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
  );
  outerShadow.rotation.x = -Math.PI / 2;
  outerShadow.scale.set(1.35, 0.7, 1);
  outerShadow.position.set(0, 0.012, 0.55);
  group.add(outerShadow);

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(1.28, 1.44, 160),
    new THREE.MeshBasicMaterial({ color: 0x3f3b35, transparent: true, opacity: 0.26, side: THREE.DoubleSide }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.scale.set(1.36, 0.72, 1);
  rim.position.set(0, 0.018, 0.55);
  rim.renderOrder = 12;
  rim.material.depthTest = false;
  group.add(rim);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.32, 192),
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.scale.set(1.38, 0.72, 1);
  disc.position.set(0, 0.022, 0.55);
  disc.renderOrder = 11;
  disc.material.depthTest = false;
  group.add(disc);

  return { group, disc, rim, outerShadow };
}

function createFallingObject(spec, index) {
  const body = createObjectModel(spec.type);
  body.scale.setScalar(Math.max(spec.width, spec.height));

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }),
  );
  shadow.rotation.x = -Math.PI / 2;

  const group = new THREE.Group();
  group.add(body);
  group.add(shadow);

  const item = {
    group,
    body,
    shadow,
    spec,
    index,
    baseScale: Math.max(spec.width, spec.height),
    fallSpeed: spec.speed,
    spin: index % 2 === 0 ? 1 : -1,
    phase: index * 1.57,
    startDelay: index * 0.5,
  };
  resetObject(item, index * 0.72);
  return item;
}

function createObjectModel(type) {
  const group = new THREE.Group();
  const dark = createMaterial(0x111111, 0.74);
  const graphite = createMaterial(0x4b4944, 0.88);
  const paper = createMaterial(0xded8cc, 0.92);

  if (type === "vangogh") {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.62, 0.08), graphite);
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.58, 0.14), dark);
    const painting = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.47),
      createImageMaterial(imageAssets.vangogh),
    );
    side.position.set(0.44, 0, -0.015);
    painting.position.z = 0.052;
    group.add(frame, side, painting);
  }

  if (type === "writer") {
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.055), paper);
    const portrait = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.58),
      createImageMaterial(imageAssets.writer),
    );
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.72, 0.09), dark);
    portrait.position.set(0, 0.02, 0.039);
    side.position.set(0.285, 0, -0.005);
    group.add(card, side, portrait);
  }

  if (type === "rodin") {
    const silhouette = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.92),
      createCutoutMaterial(imageAssets.rodin),
    );
    const depth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.92),
      new THREE.MeshBasicMaterial({
        map: imageAssets.rodin,
        color: 0x000000,
        transparent: true,
        opacity: 0.28,
        alphaTest: 0.08,
        side: THREE.DoubleSide,
      }),
    );
    depth.position.set(0.035, -0.025, -0.035);
    group.add(depth, silhouette);
  }

  if (type === "times") {
    const newspaperTexture = createTimesTexture();
    const newspaperMaterial = createImageMaterial(newspaperTexture);
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.74, 0.035), paper);
    const masthead = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.62), newspaperMaterial);
    const backMasthead = masthead.clone();
    masthead.position.set(0, 0, 0.03);
    backMasthead.position.set(0, 0, -0.03);
    backMasthead.rotation.y = Math.PI;
    group.add(sheet, masthead, backMasthead);
  }

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  return group;
}

function loadAssetTexture(path) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createImageMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xf0e8dc,
    emissive: 0x181511,
    emissiveIntensity: 0.16,
    roughness: 0.84,
    metalness: 0,
    side: THREE.DoubleSide,
  });
}

function createCutoutMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xf0e8dc,
    emissive: 0x15120e,
    emissiveIntensity: 0.14,
    roughness: 0.86,
    metalness: 0,
    transparent: true,
    alphaTest: 0.08,
    side: THREE.DoubleSide,
  });
}

function createTimesTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e7dfd2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.font = "700 92px Georgia, Times New Roman, serif";
  ctx.fillText("THE TIMES", canvas.width / 2, 126);

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(80, 158);
  ctx.lineTo(canvas.width - 80, 158);
  ctx.moveTo(80, 184);
  ctx.lineTo(canvas.width - 80, 184);
  ctx.stroke();

  ctx.font = "500 34px Georgia, Times New Roman, serif";
  ctx.fillText("CULTURE / BOOKS / ART", canvas.width / 2, 236);

  ctx.fillStyle = "#1a1a1a";
  const columns = [92, 292, 492];
  for (const [columnIndex, x] of columns.entries()) {
    for (let i = 0; i < 14; i += 1) {
      const width = 132 + ((i + columnIndex) % 4) * 18;
      ctx.fillRect(x, 296 + i * 39, width, 9);
    }
  }

  ctx.fillStyle = "#b5ada1";
  ctx.fillRect(292, 618, 176, 138);
  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.ellipse(380, 688, 48, 38, -0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, canvas.width - 76, canvas.height - 76);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createMaterial(color, roughness) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
  });
}

function resetObject(item, delay = 0) {
  const startHeights = [4.45, 3.85, 3.25, 2.65, 4.15];
  item.y = startHeights[item.index] + (delay % 0.55);
  item.angle = item.phase + delay * 0.8;
  item.radius = 2.65 + (item.index % 3) * 0.46;
  item.orbitSpeed = 0.009 + item.index * 0.0018;
  item.x = Math.cos(item.angle) * item.radius;
  item.z = 0.55 + Math.sin(item.angle) * item.radius * 0.48;
  item.roll = item.phase;
  item.tilt = (item.index % 2 === 0 ? -1 : 1) * (0.28 + item.index * 0.03);
  item.body.rotation.set(0, 0, item.roll);
  item.group.visible = false;
}

function createDust(index) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.011 + (index % 4) * 0.004, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x5c564d, transparent: true, opacity: 0.12 }),
  );
  return {
    mesh,
    angle: index * 1.9,
    radius: 0.75 + (index % 13) * 0.12,
    y: 0.12 + (index % 9) * 0.22,
    speed: 0.16 + (index % 5) * 0.035,
  };
}

function render(time) {
  const delta = previousTime ? Math.min(time - previousTime, 0.05) : 0.016;
  previousTime = time;
  const motion = (prefersReducedMotion ? 0.18 : 1) * delta * 60;
  const cameraTargetX = pointer.x * 0.18;
  camera.position.x += (cameraTargetX - camera.position.x) * 0.035;
  camera.position.y += (3.15 + pointer.y * 0.08 - camera.position.y) * 0.035;
  camera.lookAt(0, 0.72, -0.98);

  blackHole.group.position.x = Math.sin(time * 0.32) * 0.025;
  blackHole.rim.material.opacity = 0.19 + Math.sin(time * 1.1) * 0.035;
  blackHole.outerShadow.material.opacity = 0.22 + Math.sin(time * 0.7) * 0.04;

  fallingObjects.forEach((item) => {
    item.group.visible = true;
    const horizon = THREE.MathUtils.clamp(1 - item.radius / 1.08, 0, 1);
    const horizonEase = horizon * horizon * (3 - 2 * horizon);

    item.y -= item.fallSpeed * (1 + horizonEase * 1.8) * motion;
    item.angle += item.orbitSpeed * (1 + horizonEase * 3.4) * motion;
    item.radius -= (0.0017 + item.fallSpeed * 0.11 + horizonEase * 0.012) * motion;
    item.x = Math.cos(item.angle) * item.radius + Math.sin(time * 0.62 + item.phase) * 0.07;
    item.z = 0.55 + Math.sin(item.angle) * item.radius * 0.58;

    const distanceToHole = Math.hypot(item.x, item.z - 0.55);
    const swallow = THREE.MathUtils.clamp(1 - distanceToHole / 1.12, 0, 1);
    const fallProgress = THREE.MathUtils.clamp(1 - (item.y - 0.18) / 5.2, 0, 1);
    const sink = Math.max(swallow, fallProgress * 0.36, horizonEase);
    const submerge = THREE.MathUtils.smoothstep(sink, 0.62, 1);
    const tangentStretch = 1 + submerge * 1.45;
    const radialSqueeze = 1 - submerge * 0.72;

    item.group.position.set(item.x, item.y - submerge * 0.5, item.z);
    item.body.lookAt(camera.position);
    item.body.rotateZ(item.roll + submerge * item.spin * 0.45);
    item.body.rotateX(item.tilt * 0.12);
    item.roll += (0.012 + sink * 0.046 + submerge * 0.045) * item.spin * motion;

    const scale = 1 - sink * 0.44;
    item.body.scale.set(
      item.baseScale * scale * tangentStretch,
      item.baseScale * scale * radialSqueeze,
      item.baseScale * (1 - submerge * 0.35),
    );
    const altitudeFade = THREE.MathUtils.clamp((item.y - 0.08) / 1.1, 0, 1);
    const eventFade = 1 - THREE.MathUtils.smoothstep(sink, 0.78, 1);
    setModelMaterialState(item.body, altitudeFade * eventFade, submerge);

    item.shadow.position.set(0, -item.y + 0.028, 0);
    item.shadow.scale.set(
      THREE.MathUtils.clamp(1.2 - item.y * 0.14, 0.2, 1.15) * (1 + submerge * 0.8),
      THREE.MathUtils.clamp(1.2 - item.y * 0.14, 0.2, 1.15) * (1 - submerge * 0.4),
      1,
    );
    item.shadow.material.opacity = THREE.MathUtils.clamp(0.34 - item.y * 0.04, 0, 0.22) * (1 - submerge * 0.8);

    if (item.y < -0.4 || item.radius < 0.18 || distanceToHole < 0.2 || eventFade <= 0.02) {
      resetObject(item, 0.4 + item.index * 0.1);
    }
  });

  dust.forEach((particle) => {
    particle.angle += particle.speed * 0.01 * motion;
    particle.radius -= 0.0015 * motion;
    if (particle.radius < 0.42) {
      particle.radius = 2.2;
      particle.y = 0.18 + ((particle.angle * 10) % 1.8);
    }
    particle.mesh.position.set(
      Math.cos(particle.angle) * particle.radius,
      particle.y,
      0.55 + Math.sin(particle.angle) * particle.radius * 0.45,
    );
    particle.mesh.material.opacity = THREE.MathUtils.clamp((particle.radius - 0.42) / 2.2, 0, 1) * 0.16;
  });

  layoutGraph();
  renderer.render(scene, camera);
}

function setModelMaterialState(model, opacity, horizon) {
  model.traverse((child) => {
    if (child.material) {
      if (!child.material.userData.baseColor && child.material.color) {
        child.material.userData.baseColor = child.material.color.clone();
      }
      if (child.material.emissive && child.material.userData.baseEmissiveIntensity === undefined) {
        child.material.userData.baseEmissiveIntensity = child.material.emissiveIntensity || 0;
      }
      child.material.opacity = opacity;
      if (child.material.color) {
        const baseColor = child.material.userData.baseColor;
        const dim = 1 - horizon * 0.58;
        child.material.color.setRGB(
          baseColor.r * dim,
          baseColor.g * dim * (1 - horizon * 0.16),
          baseColor.b * dim * (1 - horizon * 0.28),
        );
      }
      if (child.material.emissive) {
        child.material.emissiveIntensity = Math.max(
          0,
          child.material.userData.baseEmissiveIntensity * (1 - horizon * 0.9),
        );
      }
    }
  });
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(getSafePixelRatio(width, height));
  renderer.setSize(width, height, true);
  camera.aspect = width / height;
  camera.fov = width < 720 ? 52 : 42;
  camera.position.z = width < 720 ? 7.8 : 7.2;
  camera.updateProjectionMatrix();
  layoutGraph();
}

function isConstellationViewport() {
  return window.innerWidth < 1100;
}

function isMobileGraphGesture(event) {
  return isConstellationViewport()
    && event.pointerType === "touch"
    && event.clientY > window.innerHeight * 0.24
    && event.clientY < window.innerHeight * 0.84;
}

function beginMobileGraphGesture(event) {
  if (!isMobileGraphGesture(event)) return;

  mobileGraph.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (mobileGraph.pointers.size === 2) {
    const [first, second] = [...mobileGraph.pointers.values()];
    mobileGraph.pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
    mobileGraph.pinchScale = mobileGraph.scale;
  }
}

function moveMobileGraphGesture(event) {
  const previous = mobileGraph.pointers.get(event.pointerId);
  if (!previous) return;

  const next = { x: event.clientX, y: event.clientY };
  mobileGraph.pointers.set(event.pointerId, next);

  if (mobileGraph.pointers.size === 1) {
    const deltaX = next.x - previous.x;
    const deltaY = next.y - previous.y;
    if (Math.hypot(deltaX, deltaY) < 1) return;

    mobileGraph.offsetX = clampMobileGraphOffset(
      mobileGraph.offsetX + deltaX,
      window.innerWidth * (mobileGraph.expanded ? 0.36 : 0.24),
    );
    mobileGraph.offsetY = clampMobileGraphOffset(
      mobileGraph.offsetY + deltaY,
      window.innerHeight * (mobileGraph.expanded ? 0.28 : 0.18),
    );
  } else {
    const [first, second] = [...mobileGraph.pointers.values()];
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    if (mobileGraph.pinchDistance) {
      mobileGraph.scale = THREE.MathUtils.clamp(
        mobileGraph.pinchScale * (distance / mobileGraph.pinchDistance),
        0.82,
        1.42,
      );
    }
  }

  mobileGraph.lastGestureAt = Date.now();
  layoutGraph();
  if (mobileGraph.expanded) activateNearestMobileNode();
}

function endMobileGraphGesture(event) {
  if (!mobileGraph.pointers.delete(event.pointerId)) return;
  if (mobileGraph.pointers.size < 2) mobileGraph.pinchDistance = 0;
}

function clampMobileGraphOffset(value, limit) {
  return THREE.MathUtils.clamp(value, -limit, limit);
}

function expandMobileGraph() {
  mobileGraph.expanded = true;
  mobileGraph.offsetX = 0;
  mobileGraph.offsetY = 0;
  mobileGraph.scale = 1.45;
  document.body.classList.add("mobile-graph-expanded");
  layoutGraph();
}

function activateNearestMobileNode() {
  const focusX = window.innerWidth * 0.5;
  const focusY = window.innerHeight * 0.5;
  const nearest = nodes.reduce((closest, node) => {
    const position = getGraphPosition(node, window.innerWidth, window.innerHeight);
    const distance = Math.hypot(position.x - focusX, position.y - focusY);
    return distance < closest.distance ? { node, distance } : closest;
  }, { node: null, distance: Infinity });

  if (nearest.node && nearest.node.id !== activeNodeId) setActiveNode(nearest.node.id);
}

function getSafePixelRatio(width, height) {
  const pixelBudget = width < 720 ? 2_200_000 : 5_000_000;
  const deviceRatio = window.devicePixelRatio || 1;
  const ratioForBudget = Math.sqrt(pixelBudget / (width * height));
  return Math.max(1, Math.min(deviceRatio, 1.5, ratioForBudget));
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

  const width = window.innerWidth;
  const height = window.innerHeight;
  const graphPositions = new Map(nodes.map((node) => [node.id, getGraphPosition(node, width, height)]));
  const activeConnections = new Set(
    edges.filter(([from, to]) => from === activeNodeId || to === activeNodeId).flat(),
  );

  nodes.forEach((node, index) => {
    const button = nodeButtons[index];
    const position = graphPositions.get(node.id);
    button.style.transform = `translate(${position.x}px, ${position.y}px)`;
    button.classList.toggle("is-connected", activeConnections.has(node.id));
  });

  nodeLines.setAttribute("viewBox", `0 0 ${width} ${height}`);
  nodeLines.replaceChildren(
    ...edges.map(([from, to]) => {
      const fromNode = nodes.find((node) => node.id === from);
      const toNode = nodes.find((node) => node.id === to);
      const isLit = from === activeNodeId || to === activeNodeId;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const fromPosition = graphPositions.get(fromNode.id);
      const toPosition = graphPositions.get(toNode.id);
      const x1 = fromPosition.x + 6;
      const y1 = fromPosition.y + 6;
      const x2 = toPosition.x + 6;
      const y2 = toPosition.y + 6;
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("class", isLit ? "is-lit" : "");
      return line;
    }),
  );
}

function getGraphPosition(node, width, height) {
  const isMobile = width < 640;
  const isCompact = width < 1100;

  if (isCompact) {
    return getConstellationPosition(node, width, height);
  }

  const centerX = width * 0.5;
  const centerY = height * 0.69;
  const radiusX = Math.min(width * 0.36, 520);
  const radiusY = height * 0.09;

  if (node.apex) {
    return {
      x: centerX,
      y: Math.max(height * 0.2, centerY - height * 0.5),
    };
  }

  const angle = THREE.MathUtils.degToRad(node.ringAngle);
  return {
    x: centerX + Math.cos(angle) * radiusX,
    y: centerY - Math.sin(angle) * radiusY,
  };
}

function getConstellationPosition(node, width, height) {
  const anchor = constellationLayout[node.id];
  const focusX = width * 0.5;
  const focusY = height * (mobileGraph.expanded ? 0.5 : 0.52);
  const baseX = anchor.x * width;
  const baseY = anchor.y * height;
  const scale = mobileGraph.expanded ? mobileGraph.scale : 1;

  return {
    x: focusX + (baseX - focusX) * scale + mobileGraph.offsetX,
    y: focusY + (baseY - focusY) * scale + mobileGraph.offsetY,
  };
}

function createConcreteTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f8f7f3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 3600; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const alpha = Math.random() * 0.026;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  ctx.strokeStyle = "rgba(28, 27, 25, 0.035)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 34; i += 1) {
    ctx.beginPath();
    const startX = Math.random() * canvas.width;
    const startY = Math.random() * canvas.height;
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX + Math.random() * 120 - 60,
      startY + Math.random() * 80 - 40,
      startX + Math.random() * 180 - 90,
      startY + Math.random() * 180 - 90,
      startX + Math.random() * 240 - 120,
      startY + Math.random() * 240 - 120,
    );
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 2.2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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

  if (type === "painting") {
    ctx.fillStyle = grey;
    roundRect(ctx, 92, 74, 214, 284, 8);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = charcoal;
    ctx.beginPath();
    ctx.moveTo(306, 74);
    ctx.lineTo(332, 98);
    ctx.lineTo(332, 377);
    ctx.lineTo(306, 358);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = paper;
    roundRect(ctx, 109, 94, 176, 238, 4);
    ctx.fill();
    const picture = ctx.createLinearGradient(118, 104, 278, 322);
    picture.addColorStop(0, "#e6e0d6");
    picture.addColorStop(0.58, "#b8b2a8");
    picture.addColorStop(1, "#f2eee7");
    ctx.fillStyle = picture;
    ctx.fillRect(124, 113, 146, 200);
    ctx.fillStyle = "#171717";
    ctx.beginPath();
    ctx.ellipse(197, 211, 58, 72, -0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 13;
    ctx.strokeRect(98, 81, 199, 266);
  }

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
    ctx.strokeStyle = grey;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(179, 129);
    ctx.lineTo(239, 129);
    ctx.moveTo(176, 161);
    ctx.lineTo(250, 161);
    ctx.moveTo(177, 303);
    ctx.lineTo(233, 303);
    ctx.stroke();
    ctx.fillStyle = "#161616";
    ctx.beginPath();
    ctx.ellipse(213, 231, 38, 50, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  if (type === "statue") {
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(194, 108, 52, 58, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    const bust = ctx.createLinearGradient(124, 150, 275, 360);
    bust.addColorStop(0, "#e6e1d7");
    bust.addColorStop(0.45, "#b9b5ad");
    bust.addColorStop(1, "#77756f");
    ctx.fillStyle = bust;
    ctx.beginPath();
    ctx.moveTo(139, 197);
    ctx.quadraticCurveTo(191, 143, 245, 198);
    ctx.lineTo(272, 342);
    ctx.lineTo(111, 342);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.moveTo(219, 159);
    ctx.quadraticCurveTo(251, 217, 238, 329);
    ctx.lineTo(274, 343);
    ctx.lineTo(246, 198);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(173, 106, 7, 0, Math.PI * 2);
    ctx.arc(213, 107, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  if (type === "magazine") {
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
    ctx.fillRect(139, 110, 102, 16);
    ctx.fillRect(139, 145, 82, 8);
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
  }

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
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
