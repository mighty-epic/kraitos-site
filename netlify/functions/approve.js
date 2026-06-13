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
    
    if (parts.length !== 4) {
      throw new Error("Invalid token format");
    }

    const [type, email, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Verify token type is indeed approval
    if (type !== "approve") {
      throw new Error("Invalid token type");
    }

    // Verify 30-day expiration for manual approvals
    if (Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000) {
      throw new Error("Token expired");
    }

    // Recompute HMAC to verify signature matches
    const tokenData = `approve:${email}:${timestamp}`;
    const expectedSignature = crypto.createHmac("sha256", WAITLIST_SECRET).update(tokenData).digest("hex");

    if (signature !== expectedSignature) {
      throw new Error("Invalid signature match");
    }

    // 2. Redirect user to download page with success parameters
    return {
      statusCode: 302,
      headers: {
        Location: `/download.html?verified=true&email=${encodeURIComponent(email)}`
      }
    };
  } catch (err) {
    console.error("Manual approval verification failed:", err.message);
    return {
      statusCode: 302,
      headers: {
        Location: `/index.html?verify_error=invalid_or_expired#download`
      }
    };
  }
};
