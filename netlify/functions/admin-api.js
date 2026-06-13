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

      let emailSent = false;
      let debugMode = false;

      if (!RESEND_API_KEY) {
        // Local/Dev Mode Fallback: log link and return it in response so owner can copy it
        console.log("\n==================================================");
        printDevApproval(email, approvalUrl);
        console.log("==================================================\n");
        debugMode = true;
      } else {
        // Send email via Resend API
        const emailBody = `
          <div style="background-color: #04080a; color: #f8fafc; font-family: sans-serif; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(73, 246, 220, 0.2);">
            <h1 style="color: #49f6dc; font-size: 24px; margin-bottom: 20px;">Beta Access Approved</h1>
            <p style="color: #94a3b8; font-size: 16px; line-height: 1.6;">Great news! Your application for Kraitos has been approved. You can now access the secure download portal and get the latest desktop installer by clicking the button below:</p>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${approvalUrl}" style="background-color: #49f6dc; color: #04080a; padding: 12px 28px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 16px;">Download Kraitos Installer</a>
            </div>
            <p style="color: #64748b; font-size: 12px;">This approval link is valid for 30 days. If you experience any issues, please reply to this email.</p>
          </div>
        `;

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: "Kraitos Access <waitlist@kraitos.app>",
            to: email,
            subject: "Your Kraitos Beta Access is Approved!",
            html: emailBody
          })
        });

        const resendResult = await resendResponse.json();
        if (resendResponse.ok) {
          emailSent = true;
        } else {
          console.error("Resend API failed to send approval:", resendResult);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Failed to send approval email via Resend API." })
          };
        }
      }

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
          emailSent,
          debugMode,
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
