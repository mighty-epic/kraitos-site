import * as THREE from "./assets/vendor/three.module.js";
import { GLTFLoader } from "./assets/vendor/GLTFLoader.js";

const canvas = document.querySelector("[data-kraitos-scene]");
const experience = document.querySelector(".scroll-experience");
const loaderLabel = document.querySelector("[data-scene-loader]");

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
  scene.background = new THREE.Color(0xf4f7f4);
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
    "/assets/models/kraitos-open-desk.glb",
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
        object.castShadow = !/(keyboard_key|laptop_key|screen|floor|grain|camera_dot|status_light|cable_port)/i.test(name);
        object.receiveShadow = /(floor|desk|wood|frame|stand|keyboard_deck|laptop_base)/i.test(name);

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
    surfaces.push(
      createScreen({
        name: "laptop",
        worldWidth: 1.84,
        worldHeight: 0.96,
        canvasWidth: 1280,
        canvasHeight: 720,
        position: new THREE.Vector3(2.85, 1.78, 1.73),
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
      transparent: false,
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
    const action = smoothstep(0.52, 0.82, progress);
    const actionKey = Math.round(action * 72);
    const motionKey = action > 0.04 && action < 0.96 ? Math.floor(elapsed * 16) : 0;
    surfaces.forEach((surface) => {
      const textureKey = surface.name === "vertical" ? `${actionKey}` : `${actionKey}:${motionKey}`;
      if (surface.lastTextureKey === textureKey) {
        return;
      }
      surface.lastTextureKey = textureKey;
      if (surface.name === "main") {
        drawMainHud(surface.ctx, surface.canvas, elapsed, action);
      } else if (surface.name === "vertical") {
        drawVerticalHud(surface.ctx, surface.canvas, elapsed, action);
      } else {
        drawLaptopConsole(surface.ctx, surface.canvas, elapsed, action);
      }
      surface.texture.needsUpdate = true;
    });
  }

  function drawMainHud(ctx, canvasNode, elapsed, action) {
    const { width, height } = canvasNode;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.screen;
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height, 64, "rgba(73, 246, 220, 0.07)");
    drawTopRail(ctx, width, "KRAITOS / DESKTOP OPERATOR");

    drawMetricPanel(ctx, 90, 190, 520, 420, "OBSERVE", [
      ["Screen capture", "live"],
      ["OCR confidence", "97.4%"],
      ["Browser state", "indexed"],
      ["Memory lane", "ready"],
    ]);
    drawMetricPanel(ctx, 90, 675, 520, 430, "CONTROL SURFACES", [
      ["Chrome bridge", "connected"],
      ["Desktop input", "armed"],
      ["Terminal", "sandboxed"],
      ["Files", "scoped"],
    ]);
    drawMetricPanel(ctx, width - 610, 190, 520, 420, "VERIFY", [
      ["Step log", "writing"],
      ["Screenshots", "attached"],
      ["Recovery path", "available"],
      ["Result packet", "clean"],
    ]);
    drawMetricPanel(ctx, width - 610, 675, 520, 430, "RELEASE", [
      ["Kraitos MSI", "ready"],
      ["Size", "585 MiB"],
      ["SHA256", "verified"],
      ["Install target", "Windows"],
    ]);

    drawCore(ctx, width / 2, height * 0.47, Math.min(width, height) * 0.23, elapsed);
    drawBottomTelemetry(ctx, width, height, elapsed);
    drawActionWindows(ctx, width, height, action, elapsed);
    drawCursor(ctx, width, height, action, elapsed);
  }

  function drawVerticalHud(ctx, canvasNode, elapsed, action) {
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

    const steps = ["observe workstation", "plan action", "move cursor", "open terminal", "write memory", "verify output"];
    steps.forEach((step, index) => {
      const y = 350 + index * 210;
      const active = action * steps.length > index;
      ctx.strokeStyle = active ? COLORS.cyan : "rgba(220, 244, 240, 0.18)";
      ctx.fillStyle = active ? COLORS.cyan : "rgba(220, 244, 240, 0.36)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(120, y, 28, 0, Math.PI * 2);
      ctx.stroke();
      if (index < steps.length - 1) {
        ctx.beginPath();
        ctx.moveTo(120, y + 42);
        ctx.lineTo(120, y + 160);
        ctx.stroke();
      }
      ctx.font = "800 40px Segoe UI, Arial, sans-serif";
      ctx.fillText(String(index + 1).padStart(2, "0"), 185, y + 13);
      ctx.font = "650 34px Segoe UI, Arial, sans-serif";
      ctx.fillText(step, 185, y + 66);
    });

    const pulse = 0.5 + Math.sin(elapsed * 3) * 0.5;
    ctx.strokeStyle = `rgba(73, 246, 220, ${0.25 + pulse * 0.24})`;
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i += 1) {
      ctx.strokeRect(85 + i * 18, height - 240 + i * 22, width - 170 - i * 36, 118 - i * 12);
    }
  }

  function drawLaptopConsole(ctx, canvasNode, elapsed, action) {
    const { width, height } = canvasNode;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#071114";
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height, 42, "rgba(73, 246, 220, 0.06)");
    ctx.fillStyle = COLORS.cyan;
    ctx.font = "900 62px Segoe UI, Arial, sans-serif";
    ctx.fillText("OPERATOR CONSOLE", 72, 116);
    ctx.fillStyle = COLORS.muted;
    ctx.font = "650 30px Consolas, monospace";
    const logs = [
      "[observe] captured desktop frame",
      "[memory] loaded task context",
      "[browser] attached chrome bridge",
      "[input] cursor path calculated",
      "[terminal] command staged",
      "[verify] screenshot checkpoint saved",
    ];
    logs.forEach((line, index) => {
      const visible = action * logs.length + 1.2 > index;
      ctx.globalAlpha = visible ? 1 : 0.22;
      ctx.fillText(line, 78, 210 + index * 78);
    });
    ctx.globalAlpha = 1;
    const bar = 0.22 + action * 0.68 + Math.sin(elapsed * 2.5) * 0.015;
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 5;
    roundRect(ctx, 76, height - 145, width - 152, 54, 16);
    ctx.stroke();
    ctx.fillStyle = "rgba(73, 246, 220, 0.28)";
    roundRect(ctx, 88, height - 133, (width - 176) * clamp(bar, 0, 1), 30, 10);
    ctx.fill();
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

  function drawBottomTelemetry(ctx, width, height, elapsed) {
    const y = height - 230;
    ctx.save();
    ctx.strokeStyle = "rgba(73, 246, 220, 0.22)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(80, y);
    for (let i = 0; i < 70; i += 1) {
      const x = 80 + i * ((width - 160) / 69);
      const wave = Math.sin(i * 0.43 + elapsed * 2.1) * 28 + Math.sin(i * 0.12) * 18;
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(73, 246, 220, 0.12)";
    for (let i = 0; i < 28; i += 1) {
      const barHeight = 18 + Math.abs(Math.sin(i * 0.73 + elapsed)) * 96;
      ctx.fillRect(90 + i * 42, height - 96 - barHeight, 18, barHeight);
    }
    ctx.restore();
  }

  function drawActionWindows(ctx, width, height, action, elapsed) {
    const windows = [
      {
        title: "Browser Snapshot",
        x: 670,
        y: 170,
        w: 640,
        h: 310,
        start: 0.06,
        lines: ["DOM state captured", "session refs stable", "vision fallback ready"],
      },
      {
        title: "Desktop Input",
        x: 420,
        y: 820,
        w: 620,
        h: 280,
        start: 0.28,
        lines: ["cursor path resolved", "click target bounded", "human control retained"],
      },
      {
        title: "Terminal Command",
        x: 1250,
        y: 790,
        w: 660,
        h: 300,
        start: 0.46,
        lines: ["cwd verified", "command staged", "stdout checkpoint saved"],
      },
      {
        title: "Verification Packet",
        x: 1280,
        y: 260,
        w: 620,
        h: 300,
        start: 0.64,
        lines: ["screenshot attached", "log hash recorded", "next action approved"],
      },
    ];

    windows.forEach((item) => {
      const open = smoothstep(item.start, item.start + 0.18, action);
      if (open <= 0.01) {
        return;
      }
      ctx.save();
      ctx.globalAlpha = open;
      drawFloatingWindow(ctx, item.x, item.y + (1 - open) * 34, item.w, item.h, item.title, item.lines, elapsed);
      ctx.restore();
    });
  }

  function drawFloatingWindow(ctx, x, y, width, height, title, lines, elapsed) {
    ctx.fillStyle = "rgba(3, 12, 15, 0.88)";
    ctx.strokeStyle = "rgba(73, 246, 220, 0.66)";
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, width, height, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(73, 246, 220, 0.16)";
    ctx.fillRect(x, y, width, 64);
    ctx.fillStyle = COLORS.cyan;
    ctx.font = "900 34px Segoe UI, Arial, sans-serif";
    ctx.fillText(title, x + 30, y + 43);
    lines.forEach((line, index) => {
      const rowY = y + 118 + index * 52;
      ctx.fillStyle = COLORS.ink;
      ctx.font = "650 28px Segoe UI, Arial, sans-serif";
      ctx.fillText(line, x + 34, rowY);
      ctx.fillStyle = index === lines.length - 1 ? COLORS.amber : COLORS.cyan;
      ctx.fillRect(x + width - 160, rowY - 24, 92 + Math.sin(elapsed * 2 + index) * 18, 8);
    });
  }

  function drawCursor(ctx, width, height, action, elapsed) {
    if (action <= 0.04) {
      return;
    }

    const path = [
      [width * 0.47, height * 0.36],
      [width * 0.56, height * 0.26],
      [width * 0.32, height * 0.66],
      [width * 0.67, height * 0.68],
      [width * 0.74, height * 0.33],
    ];
    const scaled = clamp(action * (path.length - 1), 0, path.length - 1.001);
    const index = Math.floor(scaled);
    const local = ease(scaled - index);
    const current = path[index];
    const next = path[index + 1] || current;
    const x = current[0] + (next[0] - current[0]) * local;
    const y = current[1] + (next[1] - current[1]) * local;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(244, 255, 252, 0.95)";
    ctx.strokeStyle = "rgba(5, 16, 18, 0.95)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 92);
    ctx.lineTo(26, 70);
    ctx.lineTo(43, 112);
    ctx.lineTo(72, 100);
    ctx.lineTo(53, 60);
    ctx.lineTo(91, 58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const clickPhase = Math.abs(Math.sin((action * 4.1 + elapsed * 0.035) * Math.PI));
    if (action > 0.08 && action < 0.95) {
      ctx.strokeStyle = `rgba(73, 246, 220, ${0.55 * (1 - clickPhase)})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x + 18, y + 24, 28 + clickPhase * 62, 0, Math.PI * 2);
      ctx.stroke();
    }
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
    const exit = mobile
      ? new THREE.Vector3(0.16, 1.18, 4.15)
      : new THREE.Vector3(0, 1.12, 3.95);

    const startLook = mobile
      ? new THREE.Vector3(0.08, 1.75, 1.45)
      : new THREE.Vector3(0, 1.62, 1.35);
    const setupLook = mobile
      ? new THREE.Vector3(0.08, 1.75, 1.45)
      : new THREE.Vector3(0, 1.62, 1.35);
    const monitorLook = new THREE.Vector3(0, 2.34, 1.5);
    const exitLook = mobile
      ? new THREE.Vector3(0.05, 1.0, 1.55)
      : new THREE.Vector3(0, 0.9, 1.5);

    let position;
    let lookAt;
    if (progress < 0.24) {
      position = start;
      lookAt = startLook;
    } else if (progress < 0.5) {
      const t = ease((progress - 0.24) / 0.26);
      position = setup.clone().lerp(monitor, t);
      lookAt = setupLook.clone().lerp(monitorLook, t);
    } else if (progress < 0.82) {
      position = monitor;
      lookAt = monitorLook;
    } else {
      const t = ease((progress - 0.82) / 0.18);
      position = monitor.clone().lerp(exit, t);
      lookAt = monitorLook.clone().lerp(exitLook, t);
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
