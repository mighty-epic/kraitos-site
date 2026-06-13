const crypto = require("crypto");
const db = require("./db");

const WAITLIST_SECRET = process.env.WAITLIST_SECRET || "kraitos-default-development-secret-key-123456";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || "1x0000000000000000000000000000000AA"; // Default Turnstile test secret

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

    // 3. Store user in database directly as 'verified' (awaiting admin approval)
    await db.setUser(email, {
      status: "verified",
      timestamp: Date.now()
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Successfully registered on the waitlist! Your application is pending review."
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
