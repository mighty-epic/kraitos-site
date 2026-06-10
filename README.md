# Kraitos Site

Static landing page for `https://kraitos.app`, ready for Netlify.

## Netlify Settings

- Build command: leave blank
- Publish directory: `.`
- Base directory: leave blank

## Files

- `index.html` - landing page markup and metadata
- `kraitos-room.v3.css` - active responsive site styling
- `kraitos-room.v3.js` - active scroll-reactive Three.js workstation runtime
- `assets/models/kraitos-open-desk.v3.glb` - Blender-generated open white desk scene
- `assets/kraitos_launch_short.mp4` - launch short
- `assets/kraitos_launch_short_poster.jpg` - poster and social preview image
- `assets/vendor/three.module.js` - vendored Three.js runtime
- `assets/vendor/GLTFLoader.js` - vendored Three.js GLB loader
- `assets/vendor/BufferGeometryUtils.js` - vendored Three.js loader dependency
- `scripts/build_kraitos_open_desk.py` - active Blender scene generator
- `netlify.toml` - Netlify publish directory, cache headers, and security headers

Legacy `styles.css`, `scene.js`, and `kraitos-scene.v2.*` files remain in the repo for reference, but the live page loads the open-desk scene through the `kraitos-room.v3.*` assets.

## Blender Scene

Regenerate the active GLB from the repo root with Blender installed:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python scripts/build_kraitos_open_desk.py
```

The GLB contains the open white studio floor, wooden desk, laptop, vertical monitor, main monitor, keyboard, mouse, stands, bevelled frames, and lighting references. The browser runtime adds sharp high-resolution Kraitos/Jarvis-style interfaces as Three.js canvas textures on the monitors, then animates the on-screen windows and cursor during the fixed-camera action phase. Monitor textures are updated only on scroll/action buckets instead of every render frame to keep Chrome smooth.

## Windows Installer

The current MSI is published as a GitHub release asset because the installer is too large for a normal static-site repository commit.

- Download URL: `https://github.com/mighty-epic/kraitos-site/releases/download/windows-current/Kraitos-Desktop-Setup.msi`
- Source file: `C:\Users\Magsihim_AI\Documents\GitHub\powerful-project-collection\emploai\dist\EmploAI.msi`
- SHA256: `617F478E17CF466E90C1D3E8CD69F93A29A7F7F0D31CE437424B22618AEBA7E5`

## Domain

After the repo is pushed to GitHub, import it in Netlify and add `kraitos.app` as a custom domain. Netlify will show the exact DNS records to add at the domain registrar.
