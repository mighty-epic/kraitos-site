const crypto = require("crypto");
const db = require("./db");

const WAITLIST_SECRET = process.env.WAITLIST_SECRET || "kraitos-default-development-secret-key-123456";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "kraitos-admin-2026";

exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // 1. Authenticate Request
  const clientPassword = event.headers["x-admin-password"] || "";
  if (clientPassword !== ADMIN_PASSWORD) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized: Invalid admin password" })
    };
  }

  try {
    // 2. Handle GET (List waitlist users)
    if (event.httpMethod === "GET") {
      const users = await db.listUsers();
      // Sort by timestamp descending (newest first)
      users.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, users })
      };
    }

    // 3. Handle POST (Approve user)
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const emailInput = body.email;

      if (!emailInput) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Email address is required for approval." })
        };
      }

      const email = emailInput.trim().toLowerCase();
      const user = await db.getUser(email);

      if (!user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "User not found in waitlist database." })
        };
      }

      // Generate signed approval token
      const timestamp = Date.now();
      const tokenData = `approve:${email}:${timestamp}`;
      const signature = crypto.createHmac("sha256", WAITLIST_SECRET).update(tokenData).digest("hex");
      const signedToken = Buffer.from(`approve:${email}:${timestamp}:${signature}`).toString("base64url");

      const protocol = event.headers["x-forwarded-proto"] || "https";
      const host = event.headers["host"] || "kraitos.app";
      const approvalUrl = `${protocol}://${host}/api/approve?token=${signedToken}`;

      // Update user status in database
      await db.setUser(email, {
        status: "approved",
        approvedAt: timestamp,
        approvalLink: approvalUrl // Save approval link for convenience
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          approvalLink: approvalUrl
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  } catch (err) {
    console.error("Admin API error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};

function printDevApproval(email, link) {
  console.log(`DEV MODE: Approval issued for: ${email}`);
  console.log(`Approval Link: ${link}`);
}
