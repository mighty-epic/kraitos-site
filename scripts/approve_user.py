#!/usr/bin/env python3
import os
import sys
import hmac
import hashlib
import time
import base64
import argparse
import urllib.request
import urllib.error
import json

# Setup standard path checks for .env files
SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARENT_ROOT = os.path.dirname(SITE_ROOT)

def load_env():
    """Custom parser for .env files to avoid external dependencies like python-dotenv."""
    env_vars = {}
    # Check current directory, site root, and parent directory (emploai folder)
    env_paths = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(SITE_ROOT, ".env"),
        os.path.join(PARENT_ROOT, "emploai", ".env"),
    ]
    
    for path in env_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            key, val = line.split("=", 1)
                            # Remove surrounding quotes if present
                            val = val.strip().strip("'").strip('"')
                            env_vars[key.strip()] = val
                print(f"Loaded environment variables from: {path}")
                break
            except Exception as e:
                print(f"Warning: Failed to read .env at {path}: {e}")
                
    return env_vars

def main():
    parser = argparse.ArgumentParser(description="Approve a waitlist user and send them a signed download link.")
    parser.add_argument("email", help="The email address of the user to approve.")
    parser.add_argument("--domain", default="https://kraitos.app", help="Domain of the live site (default: https://kraitos.app)")
    parser.add_argument("--secret", help="Cryptographic signing secret. If omitted, reads WAITLIST_SECRET from environment/.env")
    parser.add_argument("--api-key", help="Resend API Key. If omitted, reads RESEND_API_KEY from environment/.env")
    parser.add_argument("--dev", action="store_true", help="Simulate approval: generate and print the link without sending an email.")

    args = parser.parse_args()
    email = args.email.strip().lower()

    # Load environment variables
    env = load_env()
    
    # Resolve secrets
    secret = args.secret or env.get("WAITLIST_SECRET") or os.environ.get("WAITLIST_SECRET") or "kraitos-default-development-secret-key-123456"
    resend_key = args.api_key or env.get("RESEND_API_KEY") or os.environ.get("RESEND_API_KEY")
    
    # Generate Token
    timestamp = int(time.time() * 1000)
    token_data = f"approve:{email}:{timestamp}"
    
    # Compute signature
    sig = hmac.new(
        secret.encode("utf-8"),
        token_data.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    # Encode as Base64url
    full_token_str = f"approve:{email}:{timestamp}:{sig}"
    token_bytes = full_token_str.encode("utf-8")
    base64url_token = base64.urlsafe_b64encode(token_bytes).decode("utf-8").replace("=", "")
    
    # Construct Link
    approval_url = f"{args.domain}/api/approve?token={base64url_token}"
    
    print("\n==================================================")
    print(f"Approval generated for: {email}")
    print(f"Link: {approval_url}")
    print("==================================================\n")
    
    if args.dev or not resend_key:
        if not resend_key:
            print("Notice: RESEND_API_KEY not found. Simulating approval only (dev mode).")
        else:
            print("Simulating approval (dev mode flag active).")
        sys.exit(0)

    # Dispatch email using Resend API
    print("Dispatching approval email via Resend...")
    email_body = f"""
      <div style="background-color: #04080a; color: #f8fafc; font-family: sans-serif; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(73, 246, 220, 0.2);">
        <h1 style="color: #49f6dc; font-size: 24px; margin-bottom: 20px;">Beta Access Approved</h1>
        <p style="color: #94a3b8; font-size: 16px; line-height: 1.6;">Great news! Your application for Kraitos has been approved. You can now access the secure download portal and get the latest desktop installer by clicking the button below:</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="{approval_url}" style="background-color: #49f6dc; color: #04080a; padding: 12px 28px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 16px;">Download Kraitos Installer</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">This approval link is valid for 30 days. If you experience any issues, please reply to this email.</p>
      </div>
    """
    
    resend_url = "https://api.resend.com/emails"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {resend_key}"
    }
    payload = {
        "from": "Kraitos Access <waitlist@kraitos.app>",
        "to": email,
        "subject": "Your Kraitos Beta Access is Approved!",
        "html": email_body
    }
    
    req = urllib.request.Request(
        resend_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            print(f"Email sent successfully! Resend ID: {res_json.get('id')}")
    except urllib.error.HTTPError as e:
        print(f"Error: Resend API returned status code {e.code}", file=sys.stderr)
        print(e.read().decode("utf-8"), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: Failed to send email: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
