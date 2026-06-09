import * as THREE from "./assets/vendor/three.module.js";
import { GLTFLoader } from "./assets/vendor/GLTFLoader.js";

const canvas = document.querySelector("[data-kraitos-scene]");
const experience = document.querySelector(".scroll-experience");
const loaderLabel = document.querySelector("[data-scene-loader]");

if (canvas && experience) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.55;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030708);
  scene.fog = new THREE.FogExp2(0x030708, 0.028);

  const camera = new THREE.PerspectiveCamera(44, 1, 0.05, 90);
  const clock = new THREE.Clock();
  const room = new THREE.Group();
  scene.add(room);

  const state = {
    width: 0,
    height: 0,
    progress: 0,
    targetProgress: 0,
    ready: false,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  const animated = {
    core: null,
    orbits: [],
    panels: [],
    storyPanels: [],
    materials: [],
  };

  scene.add(new THREE.HemisphereLight(0x73fff0, 0x020405, 0.08));

  const cyanKey = new THREE.PointLight(0x49f6dc, 2.8, 15);
  cyanKey.position.set(0, 2.35, 2.5);
  scene.add(cyanKey);

  const amberEdge = new THREE.PointLight(0xffb84d, 1.4, 12);
  amberEdge.position.set(-4.4, 3.2, -2.5);
  scene.add(amberEdge);

  const rim = new THREE.DirectionalLight(0xcffff8, 0.38);
  rim.position.set(4, 6, 5);
  scene.add(rim);

  const dust = createDustField();
  scene.add(dust);

  new GLTFLoader().load(
    "/assets/models/kraitos-command-room.glb",
    (gltf) => {
      room.add(gltf.scene);
      gltf.scene.traverse((object) => {
        if (object.isLight) {
          object.intensity *= 0.18;
          return;
        }
        if (!object.isMesh) {
          return;
        }
        const objectName = object.name || "";
        object.frustumCulled = false;
        object.castShadow = false;
        object.receiveShadow = true;

        if (
          /(monitor_kraitos|monitor_operator|monitor_stack|_title|_body|_signal_|hero_room|hero_spatial_panel|observe_panel|act_panel|verify_panel|download_panel)/i.test(
            objectName,
          )
        ) {
          object.visible = false;
          return;
        }

        const mats = Array.isArray(object.material) ? object.material : [object.material];
        mats.forEach((mat) => {
          if (!mat) {
            return;
          }
          animated.materials.push(mat);
          if (/hologram|glass/i.test(mat.name)) {
            mat.color?.set?.(0x0b9c91);
            mat.transparent = true;
            mat.depthWrite = false;
            mat.opacity = Math.min(mat.opacity || 0.16, objectName.includes("_glass") ? 0.12 : 0.055);
            if (mat.emissive) {
              mat.emissive.set(0x0bbdad);
              mat.emissiveIntensity = objectName.includes("_glass") ? 0.24 : 0.08;
            }
          }
          if (/wall|floor|desk|key|black/i.test(mat.name)) {
            mat.color?.multiplyScalar?.(0.12);
            if (mat.emissive) {
              mat.emissive.multiplyScalar(0.25);
            }
          }
          if (/screen/i.test(mat.name)) {
            mat.color?.set?.(0x051a18);
            if (mat.emissive) {
              mat.emissive.set(0x13d8c6);
              mat.emissiveIntensity = 0.55;
            }
          }
          if (/type|cyan|amber/i.test(mat.name)) {
            mat.transparent = false;
            mat.opacity = 1;
            if (mat.emissive) {
              mat.emissiveIntensity = /type/i.test(mat.name) ? 1.65 : 1.35;
            }
          }
          if (/emission|screen|cyan|amber|type/i.test(mat.name)) {
            mat.needsUpdate = true;
          }
        });

        if (/(floor|wall|ceiling|main_desk|desk_left|desk_right|keyboard|mouse|monitor_shell|monitor_base|monitor_stem)/i.test(objectName)) {
          const matsForObject = Array.isArray(object.material) ? object.material : [object.material];
          matsForObject.forEach((mat) => {
            mat.color?.multiplyScalar?.(0.55);
            mat.needsUpdate = true;
          });
        }

        if (object.name === "agent_core") {
          animated.core = object;
        }
        if (object.name.startsWith("agent_orbit")) {
          animated.orbits.push(object);
        }
        if (object.name.includes("_glass")) {
          animated.panels.push(object);
        }
      });

      createStoryPanels();

      state.ready = true;
      loaderLabel?.classList.add("is-hidden");
    },
    undefined,
    () => {
      if (loaderLabel) {
        loaderLabel.textContent = "3D scene failed to load";
      }
    },
  );

  function createDustField() {
    const count = 900;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const random = seededRandom(73);

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (random() - 0.5) * 18;
      positions[i * 3 + 1] = random() * 5.2 + 0.15;
      positions[i * 3 + 2] = (random() - 0.5) * 13;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0x49f6dc,
        size: 0.018,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
  }

  function createStoryPanels() {
    const panels = [
      {
        title: "KRAITOS",
        body: ["Desktop AI operator", "Observe. Act. Verify.", "Windows MSI ready"],
        position: new THREE.Vector3(-3.05, 2.78, 3.55),
        mobilePosition: new THREE.Vector3(-2.22, 2.72, 3.65),
        mobileScale: 0.72,
        width: 3.15,
        height: 1.22,
        accent: "#49f6dc",
        range: [0.0, 0.36],
      },
      {
        title: "OBSERVE",
        body: ["Screenshots + OCR", "Browser state + memory", "Runtime logs"],
        position: new THREE.Vector3(1.78, 2.66, 2.86),
        mobilePosition: new THREE.Vector3(1.22, 2.6, 3.02),
        mobileScale: 0.52,
        width: 2.42,
        height: 1.02,
        accent: "#49f6dc",
        range: [0.14, 0.55],
      },
      {
        title: "ACT",
        body: ["Chrome bridge", "Files + terminal", "Desktop input"],
        position: new THREE.Vector3(-1.76, 2.28, 3.2),
        mobilePosition: new THREE.Vector3(0.98, 2.4, 3.12),
        mobileScale: 0.52,
        width: 2.36,
        height: 1.0,
        accent: "#ffb84d",
        range: [0.32, 0.72],
      },
      {
        title: "VERIFY",
        body: ["Logs + screenshots", "Recover paths", "Readable result"],
        position: new THREE.Vector3(0.95, 2.26, 2.82),
        mobilePosition: new THREE.Vector3(0.84, 2.34, 3.02),
        mobileScale: 0.52,
        width: 2.02,
        height: 0.86,
        accent: "#49f6dc",
        range: [0.5, 0.88],
      },
      {
        title: "DOWNLOAD",
        body: ["Kraitos Desktop Setup", "585 MiB Windows MSI", "SHA256 verified"],
        position: new THREE.Vector3(0.45, 2.48, 3.85),
        mobilePosition: new THREE.Vector3(0.4, 2.48, 3.82),
        mobileScale: 0.54,
        width: 2.12,
        height: 0.84,
        accent: "#ffb84d",
        range: [0.74, 1.0],
      },
    ];

    panels.forEach((config, index) => {
      const mesh = makeTextPanel(config);
      mesh.userData.range = config.range;
      mesh.userData.floatPhase = index * 0.9;
      mesh.userData.basePosition = config.position.clone();
      mesh.userData.mobilePosition = config.mobilePosition.clone();
      mesh.userData.mobileScale = config.mobileScale;
      animated.storyPanels.push(mesh);
      scene.add(mesh);
    });
  }

  function makeTextPanel({ title, body, position, width, height, accent }) {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 1400;
    textureCanvas.height = 560;
    const ctx = textureCanvas.getContext("2d");
    ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);

    const gradient = ctx.createLinearGradient(0, 0, textureCanvas.width, textureCanvas.height);
    gradient.addColorStop(0, "rgba(2, 14, 15, 0.92)");
    gradient.addColorStop(0.55, "rgba(6, 25, 27, 0.72)");
    gradient.addColorStop(1, "rgba(2, 9, 10, 0.88)");
    ctx.fillStyle = gradient;
    roundRect(ctx, 22, 22, textureCanvas.width - 44, textureCanvas.height - 44, 28);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.92;
    ctx.lineWidth = 5;
    roundRect(ctx, 36, 36, textureCanvas.width - 72, textureCanvas.height - 72, 24);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = accent;
    ctx.font = title === "KRAITOS" ? "900 138px Segoe UI, Arial, sans-serif" : "900 86px Segoe UI, Arial, sans-serif";
    ctx.fillText(title, 92, title === "KRAITOS" ? 178 : 138);

    ctx.fillStyle = "rgba(235, 255, 251, 0.96)";
    ctx.font = "760 46px Segoe UI, Arial, sans-serif";
    const startY = title === "KRAITOS" ? 260 : 228;
    body.forEach((line, index) => {
      ctx.fillText(line, 96, startY + index * 68);
    });

    ctx.fillStyle = accent;
    for (let i = 0; i < 4; i += 1) {
      ctx.globalAlpha = 0.46 - i * 0.06;
      ctx.fillRect(92, textureCanvas.height - 82 - i * 26, 260 + i * 95, 8);
    }
    ctx.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.copy(position);
    mesh.renderOrder = 22;
    return mesh;
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

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

  function ease(value) {
    return value * value * (3 - 2 * value);
  }

  function panelAlpha(progress, start, end) {
    const fade = 0.08;
    const inAmount = start <= 0 ? 1 : clamp((progress - start) / fade, 0, 1);
    const outAmount = clamp((end - progress) / fade, 0, 1);
    return ease(Math.min(inAmount, outAmount));
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === state.width && height === state.height) {
      return;
    }
    state.width = width;
    state.height = height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.fov = width < 760 ? 60 : width < 1100 ? 50 : 44;
    camera.updateProjectionMatrix();
  }

  function updateScroll() {
    const start = experience.offsetTop;
    const distance = Math.max(experience.offsetHeight - window.innerHeight, 1);
    state.targetProgress = clamp((window.scrollY - start) / distance, 0, 1);
  }

  function interpolatePath(points, progress) {
    const scaled = clamp(progress, 0, 0.999) * (points.length - 1);
    const index = Math.floor(scaled);
    const local = ease(scaled - index);
    return points[index].clone().lerp(points[index + 1], local);
  }

  function updateCamera(progress) {
    const mobile = state.width < 760;
    const cameraPath = mobile
      ? [
          new THREE.Vector3(-4.35, 3.05, 6.2),
          new THREE.Vector3(-2.1, 2.72, 5.05),
          new THREE.Vector3(0.25, 2.48, 4.65),
          new THREE.Vector3(1.8, 2.35, 4.8),
          new THREE.Vector3(0.12, 2.18, 5.65),
        ]
      : [
          new THREE.Vector3(-5.75, 3.16, 6.35),
          new THREE.Vector3(-2.4, 2.72, 5.05),
          new THREE.Vector3(0.55, 2.46, 4.7),
          new THREE.Vector3(3.05, 2.34, 4.75),
          new THREE.Vector3(0.08, 2.12, 5.75),
        ];
    const lookPath = [
      new THREE.Vector3(-2.78, 2.62, 3.18),
      new THREE.Vector3(0.15, 2.34, 2.45),
      new THREE.Vector3(1.1, 2.28, 2.38),
      new THREE.Vector3(0.8, 2.15, 2.92),
      new THREE.Vector3(0.0, 2.34, 4.04),
    ];

    camera.position.copy(interpolatePath(cameraPath, progress));
    camera.lookAt(interpolatePath(lookPath, progress));
  }

  function animate() {
    resize();
    updateScroll();

    const delta = Math.min(clock.getDelta(), 0.05);
    const smoothing = state.reducedMotion ? 1 : 1 - Math.pow(0.001, delta);
    state.progress += (state.targetProgress - state.progress) * smoothing;

    const elapsed = clock.elapsedTime;
    updateCamera(state.progress);

    room.rotation.y = Math.sin(state.progress * Math.PI) * 0.025;
    dust.rotation.y = elapsed * 0.01;
    dust.position.z = Math.sin(elapsed * 0.12) * 0.25;

    if (animated.core) {
      animated.core.rotation.y = elapsed * 0.55;
      animated.core.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.035);
    }
    animated.orbits.forEach((orbit, index) => {
      orbit.rotation.y += delta * (0.18 + index * 0.045);
      orbit.rotation.z += delta * (0.12 + index * 0.035);
    });
    animated.panels.forEach((panel, index) => {
      panel.position.y += Math.sin(elapsed * 1.15 + index) * 0.0009;
    });
    animated.storyPanels.forEach((panel) => {
      const [start, end] = panel.userData.range;
      const opacity = panelAlpha(state.progress, start, end);
      const basePosition = state.width < 760 ? panel.userData.mobilePosition : panel.userData.basePosition;
      const baseScale = state.width < 760 ? panel.userData.mobileScale : 1;
      panel.position.copy(basePosition);
      panel.position.y += Math.sin(elapsed * 1.1 + panel.userData.floatPhase) * 0.018;
      panel.scale.setScalar(baseScale);
      panel.visible = opacity > 0.01;
      panel.material.opacity = opacity;
      panel.lookAt(camera.position);
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
