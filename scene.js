import * as THREE from "./assets/vendor/three.module.js";

const canvas = document.querySelector("[data-kraitos-scene]");
const experience = document.querySelector(".scroll-experience");

if (canvas && experience) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030708, 0.035);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const clock = new THREE.Clock();

  const state = {
    width: 0,
    height: 0,
    progress: 0,
    targetProgress: 0,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  const materials = {
    desk: new THREE.MeshStandardMaterial({
      color: 0x151b1b,
      roughness: 0.72,
      metalness: 0.28,
    }),
    black: new THREE.MeshStandardMaterial({
      color: 0x050808,
      roughness: 0.5,
      metalness: 0.58,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x102422,
      roughness: 0.18,
      metalness: 0.45,
      transparent: true,
      opacity: 0.62,
      emissive: 0x0a4d45,
      emissiveIntensity: 0.45,
    }),
    cyan: new THREE.MeshStandardMaterial({
      color: 0x49f6dc,
      roughness: 0.22,
      metalness: 0.35,
      emissive: 0x1ad8c3,
      emissiveIntensity: 1.4,
    }),
    amber: new THREE.MeshStandardMaterial({
      color: 0xffb84d,
      roughness: 0.28,
      metalness: 0.3,
      emissive: 0xff8f21,
      emissiveIntensity: 0.7,
    }),
    key: new THREE.MeshStandardMaterial({
      color: 0x0a1112,
      roughness: 0.64,
      metalness: 0.2,
    }),
  };

  const root = new THREE.Group();
  scene.add(root);

  const desk = new THREE.Mesh(new THREE.BoxGeometry(15, 0.32, 9), materials.desk);
  desk.position.set(0, -1.55, 0);
  root.add(desk);

  const monitor = new THREE.Group();
  monitor.position.set(0, 0.15, -2.3);
  root.add(monitor);

  const screenShell = new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.05, 0.16), materials.black);
  monitor.add(screenShell);

  const screenGlow = new THREE.Mesh(new THREE.PlaneGeometry(4.95, 2.62), materials.glass);
  screenGlow.position.set(0, 0, 0.091);
  monitor.add(screenGlow);

  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.35, 0.26), materials.black);
  stand.position.set(0, -2.04, 0.05);
  monitor.add(stand);

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 1.05), materials.black);
  base.position.set(0, -2.78, 0.42);
  monitor.add(base);

  const uiGroup = new THREE.Group();
  uiGroup.position.set(-2.15, 0.98, 0.11);
  monitor.add(uiGroup);

  for (let i = 0; i < 9; i += 1) {
    const width = 0.55 + ((i * 37) % 90) / 100;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, 0.02), i % 3 === 0 ? materials.amber : materials.cyan);
    bar.position.set(width / 2, -i * 0.23, 0);
    uiGroup.add(bar);
  }

  const keyboard = new THREE.Group();
  keyboard.position.set(0, -1.18, 1.55);
  root.add(keyboard);

  const keyboardDeck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.15, 1.32), materials.black);
  keyboard.add(keyboardDeck);

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 14; col += 1) {
      const key = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.18), materials.key);
      key.position.set(-2.05 + col * 0.31 + (row % 2) * 0.08, 0.12, -0.44 + row * 0.28);
      keyboard.add(key);
    }
  }

  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 18), materials.black);
  mouse.scale.set(0.78, 0.2, 1.18);
  mouse.position.set(3.1, -1.2, 1.3);
  root.add(mouse);

  const agentCore = new THREE.Group();
  agentCore.position.set(0, 0.03, 0.85);
  root.add(agentCore);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), materials.cyan);
  agentCore.add(core);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x49f6dc,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8 + i * 0.27, 0.009, 8, 96), ringMaterial);
    ring.rotation.x = Math.PI / 2 + i * 0.38;
    ring.rotation.y = i * 0.62;
    agentCore.add(ring);
  }

  const holoGroup = new THREE.Group();
  holoGroup.position.set(0, 0.2, 0.2);
  root.add(holoGroup);

  for (let i = 0; i < 5; i += 1) {
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0x49f6dc : 0xffb84d,
      transparent: true,
      opacity: i % 2 === 0 ? 0.18 : 0.14,
      side: THREE.DoubleSide,
    });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.72), panelMaterial);
    const angle = -0.95 + i * 0.48;
    panel.position.set(Math.sin(angle) * 2.45, 0.65 + (i % 2) * 0.36, -0.2 + Math.cos(angle) * 1.05);
    panel.rotation.y = -angle + 0.25;
    panel.rotation.x = -0.18;
    holoGroup.add(panel);
  }

  const pathMaterial = new THREE.LineBasicMaterial({
    color: 0x49f6dc,
    transparent: true,
    opacity: 0.45,
  });
  const pathPoints = [
    new THREE.Vector3(-4.8, -1.32, 2.7),
    new THREE.Vector3(-2.4, -1.18, 1.8),
    new THREE.Vector3(0, -0.95, 0.85),
    new THREE.Vector3(2.2, -0.78, -0.65),
    new THREE.Vector3(4.4, -0.7, -2.2),
  ];
  const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pathPoints), pathMaterial);
  root.add(path);

  const particleGeometry = new THREE.BufferGeometry();
  const particleCount = 780;
  const positions = new Float32Array(particleCount * 3);
  const random = seededRandom(11);
  for (let i = 0; i < particleCount; i += 1) {
    positions[i * 3] = (random() - 0.5) * 22;
    positions[i * 3 + 1] = random() * 6 - 1.8;
    positions[i * 3 + 2] = (random() - 0.5) * 14;
  }
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0x49f6dc,
      size: 0.025,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
  );
  scene.add(particles);

  const ambient = new THREE.AmbientLight(0x8fded4, 0.32);
  scene.add(ambient);

  const cyanLight = new THREE.PointLight(0x49f6dc, 11, 12);
  cyanLight.position.set(0, 1.0, 1.0);
  scene.add(cyanLight);

  const amberLight = new THREE.PointLight(0xffb84d, 4, 10);
  amberLight.position.set(-3.7, 1.4, -1.5);
  scene.add(amberLight);

  const rimLight = new THREE.DirectionalLight(0xd9fffa, 1.7);
  rimLight.position.set(3, 5, 4);
  scene.add(rimLight);

  function seededRandom(seed) {
    let value = seed;
    return () => {
      value |= 0;
      value = (value + 0x6d2b79f5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === state.width && height === state.height) {
      return;
    }
    state.width = width;
    state.height = height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  function updateScroll() {
    const start = experience.offsetTop;
    const distance = Math.max(experience.offsetHeight - window.innerHeight, 1);
    state.targetProgress = clamp((window.scrollY - start) / distance, 0, 1);
  }

  function updateCamera(progress) {
    const mobile = state.width < 760;
    const p1 = clamp(progress / 0.34, 0, 1);
    const p2 = clamp((progress - 0.25) / 0.38, 0, 1);
    const p3 = clamp((progress - 0.58) / 0.42, 0, 1);

    const startX = mobile ? -3.2 : -5.2;
    const startY = mobile ? 2.15 : 2.55;
    const startZ = mobile ? 8.2 : 7.2;

    camera.position.x = lerp(startX, lerp(-1.2, 3.5, p3), Math.max(p1, p2 * 0.55));
    camera.position.y = lerp(startY, lerp(1.25, 0.76, p3), Math.max(p1 * 0.65, p2));
    camera.position.z = lerp(startZ, lerp(3.1, 1.7, p3), Math.max(p1, p2));

    const look = new THREE.Vector3(
      lerp(-0.45, 0.45, p3),
      lerp(0.0, 0.25, p2),
      lerp(0.25, -1.3, p3),
    );
    camera.lookAt(look);
  }

  function animate() {
    resize();
    updateScroll();

    const delta = Math.min(clock.getDelta(), 0.05);
    const easing = state.reducedMotion ? 1 : 1 - Math.pow(0.001, delta);
    state.progress += (state.targetProgress - state.progress) * easing;

    const elapsed = clock.elapsedTime;
    updateCamera(state.progress);

    root.rotation.y = Math.sin(state.progress * Math.PI * 1.25) * 0.11;
    agentCore.rotation.y = elapsed * 0.45 + state.progress * 1.8;
    agentCore.rotation.x = Math.sin(elapsed * 0.55) * 0.08;
    core.scale.setScalar(1 + Math.sin(elapsed * 2.2) * 0.045);
    holoGroup.rotation.y = -0.28 + state.progress * 0.72;
    particles.rotation.y = elapsed * 0.014;
    particles.position.z = state.progress * 1.2;

    uiGroup.children.forEach((child, index) => {
      child.scale.x = 0.72 + Math.sin(elapsed * 1.6 + index) * 0.08 + state.progress * 0.18;
    });

    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", updateScroll, { passive: true });
  resize();
  updateScroll();
  animate();
}
