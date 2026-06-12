const crypto = require("crypto");

const WAITLIST_SECRET = process.env.WAITLIST_SECRET || "kraitos-default-development-secret-key-123456";

exports.handler = async (event, context) => {
  const queryParams = event.queryStringParameters || {};
  const token = queryParams.token;

  const protocol = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers["host"] || "kraitos.app";

  if (!token) {
    return {
      statusCode: 302,
      headers: {
        Location: `${protocol}://${host}/#download?verify_error=missing_token`
      }
    };
  }

  try {
    // 1. Decrypt and verify cryptographic token signature
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    const [email, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Verify 24-hour expiration
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      throw new Error("Token expired");
    }

    // Recompute HMAC to verify signature matches
    const tokenData = `${email}:${timestamp}`;
    const expectedSignature = crypto.createHmac("sha256", WAITLIST_SECRET).update(tokenData).digest("hex");

    if (signature !== expectedSignature) {
      throw new Error("Invalid signature match");
    }

    // 2. Submit to Netlify Forms server-side
    // This logs the email in Netlify Forms submissions dashboard
    const formParams = new URLSearchParams({
      "form-name": "waitlist",
      "email": email
    });

    const submitUrl = `${protocol}://${host}/`;
    const formResponse = await fetch(submitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formParams.toString()
    });

    if (!formResponse.ok) {
      console.warn("Netlify Forms submission warning:", formResponse.statusText);
    }

    // 3. Redirect user to download page with success params
    return {
      statusCode: 302,
      headers: {
        Location: `/download.html?verified=true&email=${encodeURIComponent(email)}`
      }
    };
  } catch (err) {
    console.error("Verification failed error:", err.message);
    return {
      statusCode: 302,
      headers: {
        Location: `/index.html?verify_error=invalid_or_expired#download`
      }
    };
  }
};
