const crypto = require("crypto");
const db = require("./db");

const WAITLIST_SECRET = process.env.WAITLIST_SECRET || "kraitos-default-development-secret-key-123456";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || "1x00000000000000000000000000000000"; // Default Turnstile test secret

// Extremely basic in-memory IP rate limiter for serverless container reuse
// Note: In serverless, container state resets. This is a best-effort edge shield.
const ipCache = {};
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS = 5;

exports.handler = async (event, context) => {
  // Enforce POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  // Basic Server-Side IP Rate Limiting
  const clientIp = event.headers["x-nf-client-connection-ip"] || event.headers["client-ip"] || "unknown-ip";
  const now = Date.now();
  
  if (!ipCache[clientIp]) {
    ipCache[clientIp] = [];
  }
  // Clear old timestamps
  ipCache[clientIp] = ipCache[clientIp].filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (ipCache[clientIp].length >= MAX_REQUESTS) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: "Too many requests. Please try again in a few minutes." })
    };
  }
  ipCache[clientIp].push(now);

  try {
    const body = JSON.parse(event.body || "{}");
    const emailInput = body.email;
    const turnstileToken = body.token;

    // 1. Validation & Sanitization
    if (!emailInput) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email address is required." })
      };
    }

    const email = emailInput.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;

    if (email.length > 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email address must be 100 characters or less." })
      };
    }

    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Please enter a valid email address." })
      };
    }

    // 2. Cloudflare Turnstile Verification
    if (!turnstileToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Spam verification failed. Missing Turnstile token." })
      };
    }

    // Call Cloudflare Siteverify API
    const verifyBody = new URLSearchParams({
      secret: TURNSTILE_SECRET,
      response: turnstileToken,
      remoteip: clientIp
    });

    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: verifyBody,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const verifyResult = await verifyResponse.json();
    if (!verifyResult.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Spam verification failed. Please try completing the challenge again." })
      };
    }

    // 3. Generate Secure Cryptographic Token (expires in 24 hours)
    const timestamp = Date.now();
    const tokenData = `${email}:${timestamp}`;
    const signature = crypto.createHmac("sha256", WAITLIST_SECRET).update(tokenData).digest("hex");
    const signedToken = Buffer.from(`${tokenData}:${signature}`).toString("base64url");

    // Resolve site host dynamically
    const protocol = event.headers["x-forwarded-proto"] || "https";
    const host = event.headers["host"] || "kraitos.app";
    const verifyLink = `${protocol}://${host}/api/verify?token=${signedToken}`;

    // 3.5 Store user in database as pending_verification
    await db.setUser(email, {
      status: "pending_verification",
      timestamp: Date.now()
    });

    // 4. Send Double Opt-in Email via Resend
    if (!RESEND_API_KEY) {
      // Local dev mode fallback: log link to terminal and return it to client for testing
      console.log("\n==================================================");
      console.log(`DEV MODE: Waitlist request received for: ${email}`);
      console.log(`Verification Link: ${verifyLink}`);
      console.log("==================================================\n");

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          debug: true,
          message: "Dev Mode: Verification email simulated. Link logged to console.",
          devLink: `/api/verify?token=${signedToken}`
        })
      };
    }

    // Call Resend API to dispatch email
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "Kraitos Waitlist <waitlist@kraitos.app>",
        to: email,
        subject: "Verify your email for Kraitos Beta Access",
        html: `
          <div style="background-color: #04080a; color: #f8fafc; font-family: sans-serif; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(73, 246, 220, 0.2);">
            <h1 style="color: #49f6dc; font-size: 24px; margin-bottom: 20px;">Join Kraitos Waitlist</h1>
            <p style="color: #94a3b8; font-size: 16px; line-height: 1.6;">Thank you for requesting beta access to Kraitos. To complete your waitlist registration and unlock the installer download, please verify your email address by clicking the link below:</p>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${verifyLink}" style="background-color: #49f6dc; color: #04080a; padding: 12px 28px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 16px;">Verify Email Address</a>
            </div>
            <p style="color: #64748b; font-size: 12px;">This link will expire in 24 hours. If you did not request this, you can safely ignore this email.</p>
          </div>
        `
      })
    });

    const resendResult = await resendResponse.json();
    if (!resendResponse.ok) {
      console.error("Resend API error:", resendResult);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to dispatch verification email. Please try again later." })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Verification email sent. Please check your inbox!"
      })
    };
  } catch (err) {
    console.error("Join Waitlist handler error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
