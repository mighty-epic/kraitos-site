import * as THREE from "./assets/vendor/three.module.js";
import { GLTFLoader } from "./assets/vendor/GLTFLoader.js";

const canvas = document.querySelector("[data-kraitos-scene]");
const experience = document.querySelector(".scroll-experience");
const loaderLabel = document.querySelector("[data-scene-loader]");
const sceneSticky = document.querySelector(".scene-sticky");
const screenTakeover = document.querySelector("[data-screen-takeover]");
const takeoverCanvas = document.querySelector("[data-takeover-canvas]");
const takeoverCtx = takeoverCanvas?.getContext("2d");

const COLORS = {
  frame: "#101719",
  frame2: "#172326",
  screen: "#061014",
  cyan: "#49f6dc",
  cyanDim: "rgba(73, 246, 220, 0.42)",
  cyanSoft: "rgba(73, 246, 220, 0.14)",
  amber: "#f7a945",
  blue: "#66c8ff",
  ink: "#e9fffb",
  muted: "rgba(220, 244, 240, 0.68)",
};

if (canvas && experience) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const studioBackground = new THREE.Color(0xf4f7f4);
  const screenBackground = new THREE.Color(0x061014);
  const sceneBackground = new THREE.Color();
  scene.background = studioBackground.clone();
  scene.fog = new THREE.Fog(0xf4f7f4, 9, 18);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.04, 80);
  const clock = new THREE.Clock();
  const model = new THREE.Group();
  scene.add(model);

  const state = {
    width: 0,
    height: 0,
    progress: 0,
    targetProgress: 0,
    ready: false,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  const surfaces = [];
  const focusFadeObjects = [];

  scene.add(new THREE.HemisphereLight(0xffffff, 0xdde6e1, 1.45));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
  keyLight.position.set(0, 6, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 18;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -5;
  scene.add(keyLight);

  const screenSpill = new THREE.PointLight(0x49f6dc, 2.0, 8);
  screenSpill.position.set(0, 2.45, 2.4);
  scene.add(screenSpill);

  const edgeLight = new THREE.PointLight(0xffb84d, 0.72, 8);
  edgeLight.position.set(-3.6, 2.4, 3.4);
  scene.add(edgeLight);

  const studioDust = createStudioParticles();
  scene.add(studioDust);

  new GLTFLoader().load(
    "/assets/models/kraitos-open-desk.v5.glb",
    (gltf) => {
      model.add(gltf.scene);
      gltf.scene.traverse((object) => {
        if (object.isLight) {
          object.intensity *= 0.2;
          return;
        }
        if (!object.isMesh) {
          return;
        }
        const name = object.name || "";
        object.frustumCulled = false;
        object.material = Array.isArray(object.material)
          ? object.material.map((mat) => mat?.clone?.() ?? mat)
          : object.material?.clone?.() ?? object.material;
        object.castShadow = !/(keyboard_key|screen|floor|grain|camera_dot|status_light|cable_port)/i.test(name);
        object.receiveShadow = /(floor|desk|wood|frame|stand|keyboard_deck)/i.test(name);
        if (!/^main_monitor_(rear_shell|screen_recess|top_bezel|bottom_bezel|left_bezel|right_bezel|inner_top_edge|inner_bottom_edge|inner_left_edge|inner_right_edge|bottom_status_light|camera_dot)$/i.test(name)) {
          focusFadeObjects.push(object);
        }

        const mats = Array.isArray(object.material) ? object.material : [object.material];
        mats.forEach((mat) => {
          if (!mat) {
            return;
          }
          if (/wood|walnut|grain/i.test(mat.name) || /wood|desktop|apron|leg|grain|cable_port/i.test(name)) {
            mat.roughness = Math.max(mat.roughness ?? 0.35, 0.38);
            mat.metalness = 0;
            mat.needsUpdate = true;
            return;
          }
          if (/frame|stand|keys|graphite|black/i.test(mat.name) || /frame|stand|key|mouse/i.test(name)) {
            mat.color?.set?.(/key|mouse/i.test(name) ? 0x0b1012 : 0x070b0c);
            mat.roughness = Math.min(mat.roughness ?? 0.3, 0.24);
            mat.metalness = Math.max(mat.metalness ?? 0.3, 0.58);
          }
          if (/floor|white/i.test(mat.name) || /floor/i.test(name)) {
            mat.color?.set?.(0xf6f7f4);
            mat.roughness = 0.44;
          }
          if (/screen/i.test(mat.name) || /screen_recess/i.test(name)) {
            mat.color?.set?.(0x061014);
            if (mat.emissive) {
              mat.emissive.set(0x073433);
              mat.emissiveIntensity = 0.45;
            }
          }
          mat.needsUpdate = true;
        });
      });

      createScreenSurfaces();
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

  function createScreenSurfaces() {
    surfaces.push(
      createScreen({
        name: "main",
        worldWidth: 4.54,
        worldHeight: 2.42,
        canvasWidth: 2048,
        canvasHeight: 1152,
        position: new THREE.Vector3(0, 2.48, 1.62),
      }),
    );
    surfaces.push(
      createScreen({
        name: "vertical",
        worldWidth: 1.07,
        worldHeight: 2.44,
        canvasWidth: 720,
        canvasHeight: 1440,
        position: new THREE.Vector3(-3.22, 2.36, 1.64),
      }),
    );
  }

  function createScreen({ name, worldWidth, worldHeight, canvasWidth, canvasHeight, position }) {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = canvasWidth;
    textureCanvas.height = canvasHeight;
    const ctx = textureCanvas.getContext("2d");
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldWidth, worldHeight), material);
    mesh.position.copy(position);
    mesh.renderOrder = 12;
    scene.add(mesh);

    return { name, ctx, canvas: textureCanvas, texture, mesh, lastTextureKey: "" };
  }

  function createStudioParticles() {
    const count = 320;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const random = seededRandom(19);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (random() - 0.5) * 10;
      positions[i * 3 + 1] = random() * 4.8 + 0.6;
      positions[i * 3 + 2] = random() * 5.4 + 0.4;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0x49f6dc,
        size: 0.012,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
  }

  function updateScreenTextures(elapsed, progress) {
    const loading = smoothstep(0.04, 0.82, progress);
    const loadingKey = Math.round(loading * 80);
    const motionKey = Math.floor(elapsed * 12);
    surfaces.forEach((surface) => {
      const textureKey = `${loadingKey}:${motionKey}`;
      if (surface.lastTextureKey === textureKey) {
        return;
      }
      surface.lastTextureKey = textureKey;
      if (surface.name === "main") {
        drawMainHud(surface.ctx, surface.canvas, elapsed, loading);
      } else {
        drawVerticalHud(surface.ctx, surface.canvas, elapsed, loading);
      }
      surface.texture.needsUpdate = true;
    });
  }

  function drawMainHud(ctx, canvasNode, elapsed, loading) {
    const { width, height } = canvasNode;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.screen;
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height, 64, "rgba(73, 246, 220, 0.07)");
    drawTopRail(ctx, width, "KRAITOS / DESKTOP OPERATOR");

    drawMetricPanel(ctx, 100, 215, 500, 360, "SYSTEM", [
      ["Kernel bridge", "loading"],
      ["Desktop view", "warming"],
      ["Memory lane", "indexing"],
      ["Human gate", "online"],
    ]);
    drawMetricPanel(ctx, width - 600, 215, 500, 360, "READINESS", [
      ["Browser state", "queued"],
      ["Terminal rail", "standby"],
      ["Vision model", "priming"],
      ["Release", "ready"],
    ]);

    drawCore(ctx, width / 2, height * 0.43, Math.min(width, height) * 0.24, elapsed);
    drawLoadingDock(ctx, width, height, loading, elapsed);
    drawPassiveTelemetry(ctx, width, height, elapsed);
  }

  function drawVerticalHud(ctx, canvasNode, elapsed, loading) {
    const { width, height } = canvasNode;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.screen;
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height, 56, "rgba(73, 246, 220, 0.08)");
    ctx.fillStyle = COLORS.cyan;
    ctx.font = "900 82px Segoe UI, Arial, sans-serif";
    ctx.fillText("KRAITOS", 86, 165);
    ctx.fillStyle = COLORS.muted;
    ctx.font = "650 34px Segoe UI, Arial, sans-serif";
    ctx.fillText("operator timeline", 88, 220);

    const rows = ["model runtime", "screen capture", "local memory", "operator controls", "release channel"];
    rows.forEach((step, index) => {
      const y = 375 + index * 185;
      ctx.fillStyle = "rgba(73, 246, 220, 0.1)";
      roundRect(ctx, 82, y - 54, width - 164, 92, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(73, 246, 220, 0.34)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = COLORS.cyan;
      ctx.font = "800 36px Segoe UI, Arial, sans-serif";
      ctx.fillText(String(index + 1).padStart(2, "0"), 112, y + 10);
      ctx.fillStyle = COLORS.muted;
      ctx.font = "650 32px Segoe UI, Arial, sans-serif";
      ctx.fillText(step, 200, y + 10);
      ctx.fillStyle = index === 4 ? COLORS.amber : COLORS.cyan;
      ctx.fillRect(200, y + 34, (width - 290) * clamp(loading - index * 0.08, 0.12, 0.98), 8);
    });

    const pulse = 0.5 + Math.sin(elapsed * 3) * 0.5;
    ctx.strokeStyle = `rgba(73, 246, 220, ${0.25 + pulse * 0.24})`;
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i += 1) {
      ctx.strokeRect(85 + i * 18, height - 240 + i * 22, width - 170 - i * 36, 118 - i * 12);
    }
  }

  function drawTopRail(ctx, width, title) {
    ctx.fillStyle = "rgba(73, 246, 220, 0.08)";
    ctx.fillRect(0, 0, width, 86);
    ctx.strokeStyle = COLORS.cyanDim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(42, 84);
    ctx.lineTo(width - 42, 84);
    ctx.stroke();
    ctx.fillStyle = COLORS.cyan;
    ctx.font = "900 42px Segoe UI, Arial, sans-serif";
    ctx.fillText(title, 76, 58);
    ctx.fillStyle = COLORS.muted;
    ctx.font = "700 24px Consolas, monospace";
    ctx.fillText("LIVE STATE / HUMAN OWNED / TOOL LOGGED", width - 650, 56);
  }

  function drawGrid(ctx, width, height, spacing, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawMetricPanel(ctx, x, y, width, height, title, rows) {
    ctx.save();
    ctx.fillStyle = "rgba(8, 22, 25, 0.74)";
    ctx.strokeStyle = "rgba(73, 246, 220, 0.34)";
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.cyan;
    ctx.font = "900 42px Segoe UI, Arial, sans-serif";
    ctx.fillText(title, x + 34, y + 62);
    rows.forEach(([label, value], index) => {
      const rowY = y + 122 + index * 66;
      ctx.fillStyle = COLORS.muted;
      ctx.font = "650 27px Segoe UI, Arial, sans-serif";
      ctx.fillText(label, x + 34, rowY);
      ctx.fillStyle = value === "ready" || value === "verified" ? COLORS.amber : COLORS.ink;
      ctx.font = "850 28px Segoe UI, Arial, sans-serif";
      ctx.fillText(value, x + width - 210, rowY);
      ctx.strokeStyle = "rgba(73, 246, 220, 0.13)";
      ctx.beginPath();
      ctx.moveTo(x + 34, rowY + 22);
      ctx.lineTo(x + width - 34, rowY + 22);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawCore(ctx, cx, cy, radius, elapsed) {
    ctx.save();
    ctx.translate(cx, cy);
    const spin = elapsed * 0.55;
    const glow = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius * 1.1);
    glow.addColorStop(0, "rgba(73, 246, 220, 0.78)");
    glow.addColorStop(0.35, "rgba(73, 246, 220, 0.2)");
    glow.addColorStop(1, "rgba(73, 246, 220, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.18, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 8; i += 1) {
      ctx.rotate(spin * (i % 2 === 0 ? 0.16 : -0.12));
      ctx.strokeStyle = i % 2 === 0 ? COLORS.cyan : "rgba(102, 200, 255, 0.6)";
      ctx.lineWidth = i % 3 === 0 ? 5 : 2;
      ctx.setLineDash(i % 2 === 0 ? [34, 20] : [10, 18]);
      ctx.beginPath();
      ctx.arc(0, 0, radius * (0.28 + i * 0.09), -Math.PI * 0.75, Math.PI * 1.2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2 + spin;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius * 0.72, Math.sin(angle) * radius * 0.72);
      ctx.lineTo(Math.cos(angle) * radius * 0.92, Math.sin(angle) * radius * 0.92);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(73, 246, 220, 0.18)";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.font = "900 38px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("KRAITOS", 0, radius * 0.58);
    ctx.font = "650 24px Segoe UI, Arial, sans-serif";
    ctx.fillText("observe / act / verify", 0, radius * 0.72);
    ctx.textAlign = "left";
    ctx.restore();
  }

  function drawLoadingDock(ctx, width, height, loading, elapsed) {
    const dockWidth = Math.min(width * 0.56, 950);
    const x = (width - dockWidth) / 2;
    const y = height * 0.68;
    const pulse = 0.5 + Math.sin(elapsed * 2.2) * 0.5;
    ctx.save();
    ctx.fillStyle = "rgba(4, 14, 17, 0.86)";
    ctx.strokeStyle = "rgba(73, 246, 220, 0.5)";
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, dockWidth, 198, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.cyan;
    ctx.font = "900 42px Segoe UI, Arial, sans-serif";
    ctx.fillText("LOADING OPERATOR WORKSPACE", x + 48, y + 62);
    ctx.fillStyle = COLORS.muted;
    ctx.font = "650 28px Consolas, monospace";
    ctx.fillText("preparing local desktop context", x + 50, y + 104);

    const barX = x + 48;
    const barY = y + 134;
    const barWidth = dockWidth - 96;
    ctx.strokeStyle = "rgba(73, 246, 220, 0.58)";
    ctx.lineWidth = 4;
    roundRect(ctx, barX, barY, barWidth, 28, 10);
    ctx.stroke();
    const progress = clamp(0.18 + loading * 0.74 + Math.sin(elapsed * 1.8) * 0.01, 0, 0.96);
    ctx.fillStyle = `rgba(73, 246, 220, ${0.24 + pulse * 0.12})`;
    roundRect(ctx, barX + 7, barY + 7, (barWidth - 14) * progress, 14, 6);
    ctx.fill();

    ctx.fillStyle = COLORS.ink;
    ctx.font = "800 26px Consolas, monospace";
    ctx.fillText(`${Math.round(progress * 100).toString().padStart(2, "0")}%`, barX + barWidth - 72, y + 104);
    ctx.restore();
  }

  function drawPassiveTelemetry(ctx, width, height, elapsed) {
    const y = height - 150;
    ctx.save();
    ctx.strokeStyle = "rgba(73, 246, 220, 0.22)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(96, y);
    for (let i = 0; i < 66; i += 1) {
      const x = 96 + i * ((width - 192) / 65);
      const wave = Math.sin(i * 0.42 + elapsed * 1.2) * 18 + Math.sin(i * 0.13) * 12;
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(73, 246, 220, 0.1)";
    for (let i = 0; i < 30; i += 1) {
      const barHeight = 18 + Math.abs(Math.sin(i * 0.73 + elapsed * 0.7)) * 62;
      ctx.fillRect(120 + i * 44, height - 76 - barHeight, 18, barHeight);
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === state.width && height === state.height) {
      return;
    }
    state.width = width;
    state.height = height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 760 ? 1.2 : 1.45));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.fov = width < 760 ? 50 : width < 1100 ? 44 : 40;
    camera.updateProjectionMatrix();
  }

  function updateScroll() {
    const start = experience.offsetTop;
    const distance = Math.max(experience.offsetHeight - window.innerHeight, 1);
    state.targetProgress = clamp((window.scrollY - start) / distance, 0, 1);
  }

  function updateTakeover(progress) {
    if (!sceneSticky || !screenTakeover) {
      return;
    }
    const screenFocus = smoothstep(0.52, 0.68, progress);
    const takeover = progress >= 0.835 ? 1 : 0;
    const overlayFade = Math.max(screenFocus, takeover);
    const scale = 1;
    const y = 0;

    sceneSticky.style.setProperty("--takeover-opacity", takeover.toFixed(3));
    sceneSticky.style.setProperty("--takeover-scale", scale.toFixed(4));
    sceneSticky.style.setProperty("--takeover-y", `${y.toFixed(2)}px`);
    sceneSticky.style.setProperty("--scene-canvas-opacity", (1 - takeover).toFixed(3));
    sceneSticky.style.setProperty("--scene-scanline-opacity", (0.13 * (1 - overlayFade)).toFixed(3));
    sceneSticky.style.setProperty("--scene-vignette-opacity", (1 - overlayFade).toFixed(3));
    screenTakeover.classList.toggle("is-active", takeover > 0.02);
  }

  function updateTakeoverCanvas(elapsed, progress) {
    if (!takeoverCanvas || !takeoverCtx || progress < 0.48) {
      return;
    }
    if (takeoverCanvas.width !== 2048 || takeoverCanvas.height !== 1152) {
      takeoverCanvas.width = 2048;
      takeoverCanvas.height = 1152;
    }
    drawMainHud(takeoverCtx, takeoverCanvas, elapsed, smoothstep(0.52, 0.82, progress));
  }

  function updateFocusFade(progress) {
    const focus = smoothstep(0.52, 0.68, progress);
    const opacity = 1 - focus;
    sceneBackground.copy(studioBackground).lerp(screenBackground, focus);
    scene.background = sceneBackground;
    scene.fog.color.copy(sceneBackground);
    focusFadeObjects.forEach((object) => {
      setObjectOpacity(object, opacity);
      object.visible = opacity > 0.012;
    });
    surfaces.forEach((surface) => {
      if (surface.name === "main") {
        return;
      }
      surface.mesh.material.opacity = opacity;
      surface.mesh.visible = opacity > 0.012;
    });
    studioDust.material.opacity = 0.28 * opacity;
  }

  function setObjectOpacity(object, opacity) {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((mat) => {
      if (!mat) {
        return;
      }
      mat.transparent = true;
      mat.opacity = opacity;
      mat.depthWrite = opacity > 0.98;
      mat.needsUpdate = true;
    });
  }

  function updateCamera(progress) {
    const mobile = state.width < 760;
    const start = mobile
      ? new THREE.Vector3(0.12, 2.25, 9.2)
      : new THREE.Vector3(0, 2.55, 11.2);
    const setup = mobile
      ? new THREE.Vector3(0.12, 2.25, 9.2)
      : new THREE.Vector3(0, 2.55, 11.2);
    const monitor = mobile
      ? new THREE.Vector3(0.08, 2.38, 5.25)
      : new THREE.Vector3(0, 2.42, 6.05);
    const screenFov = mobile ? 42 : 40;
    const closeViewHeight = mobile ? 3.14 : 2.96;
    const closeDistance = closeViewHeight / (2 * Math.tan((screenFov * Math.PI) / 360));
    const screenClose = mobile
      ? new THREE.Vector3(0, 2.5, 1.58 + closeDistance)
      : new THREE.Vector3(0, 2.52, 1.58 + closeDistance);

    const startLook = mobile
      ? new THREE.Vector3(0.08, 1.75, 1.45)
      : new THREE.Vector3(0, 1.62, 1.35);
    const setupLook = mobile
      ? new THREE.Vector3(0.08, 1.75, 1.45)
      : new THREE.Vector3(0, 1.62, 1.35);
    const monitorLook = new THREE.Vector3(0, 2.34, 1.5);
    const closeLook = mobile
      ? new THREE.Vector3(0, 2.5, 1.58)
      : new THREE.Vector3(0, 2.52, 1.58);

    let position;
    let lookAt;
    let closeT = 0;
    if (progress < 0.24) {
      position = start;
      lookAt = startLook;
    } else if (progress < 0.5) {
      const t = ease((progress - 0.24) / 0.26);
      position = setup.clone().lerp(monitor, t);
      lookAt = setupLook.clone().lerp(monitorLook, t);
    } else if (progress < 0.7) {
      closeT = ease((progress - 0.5) / 0.2);
      position = monitor.clone().lerp(screenClose, closeT);
      lookAt = monitorLook.clone().lerp(closeLook, closeT);
    } else {
      closeT = 1;
      position = screenClose;
      lookAt = closeLook;
    }

    const baseFov = state.width < 760 ? 50 : state.width < 1100 ? 44 : 40;
    const nextFov = baseFov + (screenFov - baseFov) * smoothstep(0.5, 0.7, progress);
    if (Math.abs(camera.fov - nextFov) > 0.01) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(position);
    camera.lookAt(lookAt);
  }

  function animate() {
    resize();
    updateScroll();

    const delta = Math.min(clock.getDelta(), 0.05);
    const smoothing = state.reducedMotion ? 1 : 1 - Math.pow(0.001, delta);
    state.progress += (state.targetProgress - state.progress) * smoothing;

    const elapsed = clock.elapsedTime;
    if (state.ready) {
      updateScreenTextures(elapsed, state.progress);
    }
    updateFocusFade(state.progress);
    updateTakeover(state.progress);
    updateTakeoverCanvas(elapsed, state.progress);
    updateCamera(state.progress);

    screenSpill.intensity = 1.7 + Math.sin(elapsed * 2) * 0.15;
    studioDust.rotation.y = elapsed * 0.008;
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
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

  function smoothstep(start, end, value) {
    return ease(clamp((value - start) / Math.max(end - start, 0.0001), 0, 1));
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", updateScroll, { passive: true });
  resize();
  updateScroll();
  animate();
}
