# Kraitos Site

Static landing page for `https://kraitos.app`, ready for Netlify.

## Netlify Settings

- Build command: leave blank
- Publish directory: `.`
- Base directory: leave blank

## Files

- `index.html` - landing page markup and metadata
- `styles.css` - responsive site styling
- `scene.js` - scroll-reactive Three.js workstation scene
- `assets/kraitos_launch_short.mp4` - launch short
- `assets/kraitos_launch_short_poster.jpg` - poster and social preview image
- `assets/vendor/three.module.js` - vendored Three.js runtime
- `netlify.toml` - Netlify publish directory, cache headers, and security headers

## Windows Installer

The current MSI is published as a GitHub release asset because the installer is too large for a normal static-site repository commit.

- Download URL: `https://github.com/mighty-epic/kraitos-site/releases/download/windows-current/Kraitos-Desktop-Setup.msi`
- Source file: `C:\Users\Magsihim_AI\Documents\GitHub\powerful-project-collection\emploai\dist\EmploAI.msi`
- SHA256: `617F478E17CF466E90C1D3E8CD69F93A29A7F7F0D31CE437424B22618AEBA7E5`

## Domain

After the repo is pushed to GitHub, import it in Netlify and add `kraitos.app` as a custom domain. Netlify will show the exact DNS records to add at the domain registrar.
