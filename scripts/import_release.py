#!/usr/bin/env python3
import os
import sys
import shutil
import hashlib
import json
import argparse
import re
from datetime import datetime

# Default paths
DEFAULT_SOURCE_MSI = r"C:\Users\Magsihim_AI\Documents\GitHub\powerful-project-collection\emploai\dist\EmploAI.msi"
SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSIONS_JSON_PATH = os.path.join(SITE_ROOT, "releases", "versions.json")
DOWNLOAD_HTML_PATH = os.path.join(SITE_ROOT, "download.html")

def calculate_sha256(filepath):
    print(f"Calculating SHA256 for: {filepath}...")
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest().upper()

def get_file_size_mib(filepath):
    size_bytes = os.path.getsize(filepath)
    size_mib = size_bytes / (1024 * 1024)
    return f"{int(round(size_mib))} MiB"

def increment_version(version_str):
    # Match standard beta versions like v0.3.0-beta or v0.3.0
    match = re.match(r"^v?(\d+)\.(\d+)\.(\d+)(-beta)?$", version_str)
    if match:
        major, minor, patch, suffix = match.groups()
        new_patch = int(patch) + 1
        suffix_str = suffix if suffix else ""
        return f"v{major}.{minor}.{new_patch}{suffix_str}"
    return version_str + "-next"

def main():
    parser = argparse.ArgumentParser(description="Import a new MSI build into the Kraitos Site releases.")
    parser.add_argument("--source", default=DEFAULT_SOURCE_MSI, help=f"Path to the source MSI installer (default: {DEFAULT_SOURCE_MSI})")
    parser.add_argument("--version", help="Explicit version tag for this release (e.g. v0.3.1-beta). If omitted, increments latest version in versions.json.")
    
    args = parser.parse_args()
    
    source_path = args.source
    if not os.path.exists(source_path):
        print(f"Error: Source MSI file not found at: {source_path}", file=sys.stderr)
        sys.exit(1)
        
    # Load existing versions
    if not os.path.exists(VERSIONS_JSON_PATH):
        print(f"Error: versions.json not found at: {VERSIONS_JSON_PATH}", file=sys.stderr)
        sys.exit(1)
        
    with open(VERSIONS_JSON_PATH, "r", encoding="utf-8") as f:
        versions = json.load(f)
        
    # Determine the version
    if args.version:
        version = args.version
        if not version.startswith("v"):
            version = "v" + version
    else:
        # Determine latest version and increment it
        latest_version = versions[0]["version"]
        version = increment_version(latest_version)
        print(f"Auto-detected latest version: {latest_version}. Incrementing to: {version}")
        
    # Determine the URL (Construct the GitHub Release download URL)
    release_url = args.url if hasattr(args, 'url') and args.url else f"https://github.com/mighty-epic/kraitos-site/releases/download/{version}/Kraitos-Desktop-Setup.msi"
    
    # Calculate checksum and size from the local source file
    sha256_hash = calculate_sha256(source_path)
    file_size = get_file_size_mib(source_path)
    
    print(f"Source details:")
    print(f"  Size: {file_size}")
    print(f"  SHA256: {sha256_hash}")
    print(f"  Target Download URL: {release_url}")
    
    # Update versions.json
    # 1. Update previous versions' statuses
    for v in versions:
        if v["status"] == "DOWNLOAD READY":
            v["status"] = "PREVIOUS"
            
    # 2. Add the new version at the beginning
    new_release = {
        "version": version,
        "date": datetime.today().strftime('%Y-%m-%d'),
        "size": file_size,
        "sha256": sha256_hash,
        "url": release_url,
        "status": "DOWNLOAD READY",
        "badgeColor": "#10b981",
        "badgeBg": "rgba(16, 185, 129, 0.15)",
        "badgeBorder": "rgba(16, 185, 129, 0.25)"
    }
    versions.insert(0, new_release)
    
    with open(VERSIONS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(versions, f, indent=2)
    print(f"Updated {VERSIONS_JSON_PATH} successfully.")
    
    # Statically update download.html as fallback / SEO
    if os.path.exists(DOWNLOAD_HTML_PATH):
        print(f"Statically updating {DOWNLOAD_HTML_PATH} fallback values...")
        with open(DOWNLOAD_HTML_PATH, "r", encoding="utf-8") as f:
            html_content = f.read()
            
        # 1. Replace download button href
        pattern_href = r'<!-- LATEST_LINK_START -->.*?<!-- LATEST_LINK_END -->'
        replacement_href = f'''<!-- LATEST_LINK_START -->
                <a
                  class="btn btn-primary"
                  id="current-download-btn"
                  href="{new_release["url"]}"
                  aria-label="Download Windows Installer MSI"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  Download MSI
                </a>
                <!-- LATEST_LINK_END -->'''
        html_content, count1 = re.subn(pattern_href, replacement_href, html_content, flags=re.DOTALL)
        
        # 2. Replace build info text
        pattern_info = r'<!-- LATEST_VERSION_START -->.*?<!-- LATEST_VERSION_END -->'
        replacement_info = f'<!-- LATEST_VERSION_START -->{version} &middot; {file_size} &middot; Windows 10/11<!-- LATEST_VERSION_END -->'
        html_content, count2 = re.subn(pattern_info, replacement_info, html_content)
        
        # 3. Replace checksum
        pattern_sha = r'<!-- LATEST_SHA_START -->.*?<!-- LATEST_SHA_END -->'
        replacement_sha = f'<!-- LATEST_SHA_START -->{sha256_hash}<!-- LATEST_SHA_END -->'
        html_content, count3 = re.subn(pattern_sha, replacement_sha, html_content)
        
        with open(DOWNLOAD_HTML_PATH, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        print(f"Statically updated download.html. Replacements: href={count1}, info={count2}, sha={count3}")
    else:
        print(f"Warning: download.html not found at {DOWNLOAD_HTML_PATH}", file=sys.stderr)

    print(f"\nSuccessfully imported Kraitos Desktop release {version}!")

if __name__ == "__main__":
    main()
