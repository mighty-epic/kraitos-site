document.addEventListener("DOMContentLoaded", () => {
  const authGate = document.getElementById("auth-gate");
  const consoleView = document.getElementById("console-view");
  const authForm = document.getElementById("auth-form");
  const adminPasswordInput = document.getElementById("admin-password");
  const authError = document.getElementById("auth-error");
  const logoutBtn = document.getElementById("logout-btn");

  const usersTableBody = document.getElementById("users-table-body");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const filterTabs = document.querySelectorAll(".filter-tab");

  const statTotal = document.getElementById("stat-total");
  const statVerified = document.getElementById("stat-verified");
  const statApproved = document.getElementById("stat-approved");
  const statPending = document.getElementById("stat-pending");

  let waitlistUsers = [];
  let currentFilter = "all";
  let searchQuery = "";

  // Safe SessionStorage Helpers
  function getSessionPassword() {
    try {
      return sessionStorage.getItem("kraitos_admin_password") || "";
    } catch (e) {
      return "";
    }
  }
  function setSessionPassword(pwd) {
    try {
      sessionStorage.setItem("kraitos_admin_password", pwd);
    } catch (e) {}
  }
  function removeSessionPassword() {
    try {
      sessionStorage.removeItem("kraitos_admin_password");
    } catch (e) {}
  }

  // Check for existing session token
  const savedPassword = getSessionPassword();
  if (savedPassword) {
    authenticate(savedPassword);
  }

  // Form Submit
  authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const pwd = adminPasswordInput.value.trim();
    authenticate(pwd);
  });

  // Sign Out
  logoutBtn.addEventListener("click", () => {
    removeSessionPassword();
    window.location.reload();
  });

  // Authenticate
  async function authenticate(password) {
    authError.textContent = "";
    try {
      const response = await fetch("/api/admin-api", {
        method: "GET",
        headers: {
          "X-Admin-Password": password
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Authentication failed");
      }

      const data = await response.json();
      setSessionPassword(password);
      
      // Transition UI
      authGate.style.display = "none";
      consoleView.style.display = "block";
      
      waitlistUsers = data.users || [];
      updateStats();
      renderTable();
    } catch (err) {
      authError.textContent = err.message;
      removeSessionPassword();
    }
  }

  // Update Stats Bar
  function updateStats() {
    statTotal.textContent = waitlistUsers.length;
    statVerified.textContent = waitlistUsers.filter(u => u.status === "verified").length;
    statApproved.textContent = waitlistUsers.filter(u => u.status === "approved").length;
    statPending.textContent = waitlistUsers.filter(u => u.status === "pending_verification").length;
  }

  // Search & Filters Toolbar handlers
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderTable();
  });

  filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      filterTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.getAttribute("data-filter");
      renderTable();
    });
  });

  // Render Table Body
  function renderTable() {
    usersTableBody.innerHTML = "";
    
    let filtered = waitlistUsers.filter(user => {
      // Filter by search query
      const matchesSearch = user.email.toLowerCase().includes(searchQuery);
      
      // Filter by tabs
      if (currentFilter === "all") return matchesSearch;
      if (currentFilter === "verified") return matchesSearch && user.status === "verified";
      if (currentFilter === "approved") return matchesSearch && user.status === "approved";
      if (currentFilter === "pending") return matchesSearch && user.status === "pending_verification";
      return false;
    });

    if (filtered.length === 0) {
      emptyState.style.display = "block";
      return;
    }
    
    emptyState.style.display = "none";

    filtered.forEach(user => {
      const tr = document.createElement("tr");

      // Email Cell
      const tdEmail = document.createElement("td");
      tdEmail.className = "email-cell";
      tdEmail.textContent = user.email;

      // Status Badge Cell
      const tdStatus = document.createElement("td");
      let badgeClass = "pending";
      let badgeText = "Pending Verification";
      if (user.status === "verified") {
        badgeClass = "verified";
        badgeText = "Verified";
      } else if (user.status === "approved") {
        badgeClass = "approved";
        badgeText = "Approved";
      }
      tdStatus.innerHTML = `<span class="status-badge ${badgeClass}">${badgeText}</span>`;

      // Date Cell
      const tdDate = document.createElement("td");
      tdDate.className = "date-cell";
      tdDate.textContent = user.timestamp ? new Date(user.timestamp).toLocaleString() : "Unknown";

      // Action Button Cell
      const tdAction = document.createElement("td");
      if (user.status === "approved") {
        // Already approved
        const mailtoSubject = encodeURIComponent("Your Kraitos Beta Access is Approved!");
        const mailtoBody = encodeURIComponent(
          `Hello,\n\nYour application for Kraitos has been approved!\n\nYou can access the secure download portal and get the latest desktop installer by clicking the link below:\n\n${user.approvalLink}\n\nThis link is valid for 30 days.\n\nBest regards,\nThe Kraitos Team`
        );
        const mailtoUrl = `mailto:${user.email}?subject=${mailtoSubject}&body=${mailtoBody}`;

        tdAction.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="font-size: 13px; color: #34d399; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                Approved ✓
              </span>
              <a class="action-btn" href="${mailtoUrl}" style="padding: 6px 12px; font-size: 12px; border-color: var(--cyan-border); color: var(--cyan); text-decoration: none; min-width: auto;">
                Send Email
              </a>
            </div>
            ${user.approvalLink ? `
              <div class="copy-link-container" style="margin-top: 0;">
                <span class="copy-link-text">${user.approvalLink}</span>
                <button class="copy-link-btn" onclick="copyText('${user.approvalLink}')">Copy Link</button>
              </div>
            ` : ""}
          </div>
        `;
      } else if (user.status === "verified" || user.status === "pending_verification") {
        // Allow approval (we also enable it for pending as a force-override measure)
        const approveBtn = document.createElement("button");
        approveBtn.className = "action-btn";
        approveBtn.textContent = "Approve Access";
        approveBtn.addEventListener("click", () => approveUser(user.email, approveBtn, tdAction));
        tdAction.appendChild(approveBtn);
      }

      tr.appendChild(tdEmail);
      tr.appendChild(tdStatus);
      tr.appendChild(tdDate);
      tr.appendChild(tdAction);

      usersTableBody.appendChild(tr);
    });
  }

  // Approve Waitlistee Action
  async function approveUser(email, button, actionCell) {
    button.classList.add("loading");
    button.disabled = true;

    const password = getSessionPassword();

    try {
      const response = await fetch("/api/admin-api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": password
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Approval request failed");
      }

      const data = await response.json();
      
      // Update local state
      const userIdx = waitlistUsers.findIndex(u => u.email === email);
      if (userIdx !== -1) {
        waitlistUsers[userIdx].status = "approved";
        waitlistUsers[userIdx].approvalLink = data.approvalLink;
      }
      
      // Re-render
      updateStats();
      renderTable();
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
      button.classList.remove("loading");
      button.disabled = false;
    }
  }
});

// Global copy text utility
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Approval link copied to clipboard!");
  } catch (err) {
    console.error("Copy failed:", err);
    alert("Failed to copy link. Please select and copy manually.");
  }
}
