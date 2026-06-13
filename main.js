document.addEventListener("DOMContentLoaded", () => {
  // Force page scroll to top on landing or refreshing
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  
  // Showcase spacer height adjustment
  const showcaseSpacer = document.querySelector(".showcase-spacer");
  const contentWrapper = document.querySelector(".content-wrapper");

  function adjustSpacerHeight() {
    if (window.innerWidth <= 768) {
      if (showcaseSpacer) showcaseSpacer.style.height = "0px";
      return;
    }
    if (!showcaseSpacer || !contentWrapper) return;
    
    const contentHeight = contentWrapper.offsetHeight;
    const viewportHeight = window.innerHeight;
    const computedHeight = Math.max(viewportHeight, 1.5 * (contentHeight - viewportHeight));
    showcaseSpacer.style.height = `${computedHeight}px`;
  }

  // Adjust on load and resize
  adjustSpacerHeight();
  window.addEventListener("resize", adjustSpacerHeight);
  window.addEventListener("load", adjustSpacerHeight);
  window.addEventListener("load", () => {
    window.scrollTo(0, 0);
  });

  // Mobile viewport optimization: remove video sources to save bandwidth/CPU
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    const videoBgContainer = document.querySelector(".video-bg-container");
    if (videoBgContainer) {
      videoBgContainer.innerHTML = "";
    }
  }

  // Scroll theme switcher (applies to all viewports)
  function updateThemeOnScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = maxScroll > 0 ? Math.max(0, Math.min(1, scrollY / maxScroll)) : 0;

    // Watermark opacity scroll-controller
    const watermarkContainer = document.querySelector(".bg-watermark-container");
    if (watermarkContainer) {
      let watermarkOpacity = 0;
      if (scrollPercent <= 0.25) {
        watermarkOpacity = 1 - (scrollPercent / 0.25);
      } else if (scrollPercent >= 0.60) {
        watermarkOpacity = 1;
      } else {
        watermarkOpacity = 0;
      }
      watermarkContainer.style.opacity = watermarkOpacity;
    }

    if (window.innerWidth <= 768) {
      document.body.classList.add("light-theme");
      return;
    }
    
    if (scrollPercent >= 0.60) {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
  }

  window.addEventListener("scroll", updateThemeOnScroll, { passive: true });
  window.addEventListener("resize", updateThemeOnScroll, { passive: true });
  updateThemeOnScroll();

  // Checksum copy to clipboard
  const checksumVal = document.getElementById("checksum-val");
  const copyFeedback = document.getElementById("copy-feedback");

  if (checksumVal && copyFeedback) {
    checksumVal.addEventListener("click", async () => {
      const shaText = checksumVal.textContent.trim();
      try {
        await navigator.clipboard.writeText(shaText);
        copyFeedback.textContent = "Copied to clipboard!";
        copyFeedback.classList.add("visible");
        
        setTimeout(() => {
          copyFeedback.classList.remove("visible");
        }, 2000);
      } catch (err) {
        console.error("Failed to copy checksum:", err);
        copyFeedback.textContent = "Click to copy";
      }
    });
  }

  // Waitlist Gate State Machine
  const waitlistForm = document.getElementById("waitlist-form");
  const waitlistEmailInput = document.getElementById("waitlist-email");
  const waitlistError = document.getElementById("waitlist-error");
  const formContainer = document.getElementById("waitlist-form-container");
  const successContainer = document.getElementById("waitlist-success-container");
  const headerWaitlistBtn = document.getElementById("header-waitlist-btn");

  function showWaitlistSuccess(isInstant) {
    if (!formContainer || !successContainer || !headerWaitlistBtn) return;

    if (isInstant) {
      formContainer.style.display = "none";
      successContainer.style.display = "block";
      headerWaitlistBtn.textContent = "Joined ✓";
      headerWaitlistBtn.classList.add("joined");
      headerWaitlistBtn.removeAttribute("href");
      adjustSpacerHeight();
    } else {
      // Sleek animated transition
      formContainer.style.transition = "opacity 300ms ease, transform 300ms ease";
      formContainer.style.opacity = "0";
      formContainer.style.transform = "translateY(-10px)";
      
      setTimeout(() => {
        formContainer.style.display = "none";
        
        successContainer.style.display = "block";
        successContainer.style.opacity = "0";
        successContainer.style.transform = "translateY(10px)";
        
        // Force reflow
        successContainer.offsetHeight;
        
        successContainer.style.transition = "opacity 300ms ease, transform 300ms ease";
        
        successContainer.style.opacity = "1";
        successContainer.style.transform = "translateY(0)";
        
        headerWaitlistBtn.textContent = "Joined ✓";
        headerWaitlistBtn.classList.add("joined");
        headerWaitlistBtn.removeAttribute("href");
        
        adjustSpacerHeight();
      }, 300);
    }
  }

  function showEmailVerifiedSuccess(isInstant) {
    if (!formContainer || !successContainer || !headerWaitlistBtn) return;

    successContainer.innerHTML = `
      <span class="badge" style="color: #10b981; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.25);">EMAIL VERIFIED</span>
      <h3 class="build-title">Email Verified!</h3>
      <p class="build-info" style="line-height: 1.6; margin-bottom: 0; color: var(--text-muted);">
        Your email has been verified. Your application is now pending review. We will email you with download instructions once your beta access is approved by our team.
      </p>
    `;

    if (isInstant) {
      formContainer.style.display = "none";
      successContainer.style.display = "block";
      headerWaitlistBtn.textContent = "Verified ✓";
      headerWaitlistBtn.classList.add("joined");
      headerWaitlistBtn.removeAttribute("href");
      adjustSpacerHeight();
    } else {
      // Sleek animated transition
      formContainer.style.transition = "opacity 300ms ease, transform 300ms ease";
      formContainer.style.opacity = "0";
      formContainer.style.transform = "translateY(-10px)";
      
      setTimeout(() => {
        formContainer.style.display = "none";
        
        successContainer.style.display = "block";
        successContainer.style.opacity = "0";
        successContainer.style.transform = "translateY(10px)";
        
        // Force reflow
        successContainer.offsetHeight;
        
        successContainer.style.transition = "opacity 300ms ease, transform 300ms ease";
        successContainer.style.opacity = "1";
        successContainer.style.transform = "translateY(0)";
        
        headerWaitlistBtn.textContent = "Verified ✓";
        headerWaitlistBtn.classList.add("joined");
        headerWaitlistBtn.removeAttribute("href");
        
        adjustSpacerHeight();
      }, 300);
    }
  }

  // Check URL query parameters for verification responses
  const urlParams = new URLSearchParams(window.location.search);
  const isVerified = urlParams.get("verified");
  const isEmailVerified = urlParams.get("email_verified");
  const verifiedEmail = urlParams.get("email");
  const verifyError = urlParams.get("verify_error");

  if (isVerified === "true" && verifiedEmail) {
    try {
      localStorage.setItem("kraitos_joined_waitlist", "true");
      localStorage.setItem("kraitos_waitlist_email", verifiedEmail);
    } catch (err) {
      console.warn("Storage not available to save verification state:", err);
    }
    // Clean URL query parameters for a cleaner browser address bar
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (isEmailVerified === "true" && verifiedEmail) {
    try {
      localStorage.setItem("kraitos_email_verified", "true");
      localStorage.setItem("kraitos_waitlist_email", verifiedEmail);
    } catch (err) {
      console.warn("Storage not available to save verification state:", err);
    }
    showEmailVerifiedSuccess(false);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (verifyError && waitlistError) {
    if (verifyError === "invalid_or_expired") {
      waitlistError.textContent = "The verification link is invalid or has expired. Please sign up again.";
    } else {
      waitlistError.textContent = "Email verification failed. Please try again.";
    }
    
    // Smooth scroll to the waitlist section if there's an error
    const waitlistGatePanel = document.getElementById("waitlist-gate-panel");
    if (waitlistGatePanel) {
      setTimeout(() => {
        waitlistGatePanel.scrollIntoView({ behavior: "smooth" });
      }, 500);
    }
  }

  // Check initial state from LocalStorage
  const hasJoined = localStorage.getItem("kraitos_joined_waitlist");
  const emailVerified = localStorage.getItem("kraitos_email_verified");

  if (hasJoined === "true") {
    showWaitlistSuccess(true);
  } else if (emailVerified === "true") {
    showEmailVerifiedSuccess(true);
  }

  // Handle Form Submission (AJAX integration for Netlify Forms)
  if (waitlistForm) {
    waitlistForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const email = waitlistEmailInput.value.trim().toLowerCase();
      // Strict regex matching standard characters to prevent invalid formats and SQL injection payloads
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
      
      if (!email) {
        waitlistError.textContent = "Please enter your email address.";
        waitlistEmailInput.focus();
        return;
      }
      
      if (email.length > 100) {
        waitlistError.textContent = "Email address must be 100 characters or less.";
        waitlistEmailInput.focus();
        return;
      }
      
      if (!emailRegex.test(email)) {
        waitlistError.textContent = "Please enter a valid email address.";
        waitlistEmailInput.focus();
        return;
      }
      
      // Client-side rate-limiting (max 3 submissions within a 5-minute sliding window)
      const now = Date.now();
      const limitWindow = 5 * 60 * 1000; // 5 minutes
      const maxAttempts = 3;
      
      let attempts = [];
      try {
        attempts = JSON.parse(localStorage.getItem("kraitos_waitlist_attempts") || "[]");
        if (!Array.isArray(attempts)) attempts = [];
      } catch (err) {
        attempts = [];
      }
      
      // Filter out old attempts
      attempts = attempts.filter(t => typeof t === "number" && now - t < limitWindow);
      
      if (attempts.length >= maxAttempts) {
        waitlistError.textContent = "Too many waitlist requests. Please try again later.";
        return;
      }
      
      // Record submission attempt
      try {
        attempts.push(now);
        localStorage.setItem("kraitos_waitlist_attempts", JSON.stringify(attempts));
      } catch (err) {
        console.warn("Storage not available for rate limiting:", err);
      }
      
      // Clear errors
      waitlistError.textContent = "";
      
      // Disable button and show loading state
      const submitBtn = document.getElementById("waitlist-submit-btn");
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = "Joining...";
      submitBtn.disabled = true;

      // Pack Form Data
      const formData = new FormData(waitlistForm);
      const turnstileToken = formData.get("cf-turnstile-response");

      if (!turnstileToken) {
        waitlistError.textContent = "Please complete the spam verification challenge.";
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      }

      // Submit to Serverless endpoint
      fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, token: turnstileToken })
      })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Form submission response not OK");
        }
        
        // Show Verification Sent confirmation message inside the waitlist form card
        formContainer.style.transition = "opacity 300ms ease, transform 300ms ease";
        formContainer.style.opacity = "0";
        formContainer.style.transform = "translateY(-10px)";
        
        setTimeout(() => {
          formContainer.innerHTML = `
            <span class="badge" style="color: var(--cyan); background: var(--cyan-dim); border: 1px solid var(--cyan-border);">VERIFICATION SENT</span>
            <h3 class="build-title">Check your inbox</h3>
            <p class="build-info" style="line-height: 1.6; margin-bottom: 0; color: var(--text-muted);">
              We've sent a verification link to <strong style="color: var(--text-main);">${email}</strong>. Please click the link in your email to complete your registration and unlock your download.
            </p>
          `;
          formContainer.style.opacity = "1";
          formContainer.style.transform = "translateY(0)";
          adjustSpacerHeight();
        }, 300);
      })
      .catch((err) => {
        console.error("Join Waitlist submission error:", err);
        waitlistError.textContent = err.message || "Something went wrong. Please try again.";
        // Reset turnstile challenge so they can solve it again
        if (typeof window !== "undefined" && window.turnstile) {
          window.turnstile.reset();
        }
      })
      .finally(() => {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      });
    });
  }

  // Background Video Scroll Control (Multi-Video Segment Scrubbing)
  const videos = [
    document.getElementById("bg-video-1"),
    document.getElementById("bg-video-2"),
    document.getElementById("bg-video-3"),
    document.getElementById("bg-video-4")
  ].filter(Boolean);
  const sections = document.querySelectorAll(".panel-section");

  if (videos.length > 0) {
    let activeIndex = 0;
    const videoStates = videos.map(() => ({
      targetTime: 0,
      currentTime: 0
    }));
    const ease = 0.15; // Lerp smoothing factor

    // Ensure all videos are paused so scroll manages frame rendering
    videos.forEach(v => v.pause());

    function getScrollPercent() {
      const scrollY = window.scrollY || window.pageYOffset;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return 0;
      return Math.max(0, Math.min(1, scrollY / maxScroll));
    }

    function updateVideoTimes() {
      const scrollPercent = getScrollPercent();
      const numVideos = videos.length;

      // Define custom boundaries within 0 - 0.60 for each video segment (first 2 fast, last 2 slow)
      const boundaries = [
        { start: 0.0,  end: 0.09 }, // Video 1 (initial_scene_4.mp4)
        { start: 0.09, end: 0.18 }, // Video 2 (initial_scene_2.mp4)
        { start: 0.18, end: 0.39 }, // Video 3 (voice_agent_youtube.mp4)
        { start: 0.39, end: 0.60 }  // Video 4 (voice_agent_restaurant.mp4)
      ];

      // Find the active index based on scrollPercent
      activeIndex = 0;
      let isPastScrubbing = false;

      if (scrollPercent >= 0.60) {
        activeIndex = boundaries.length - 1; // Last video remains active
        isPastScrubbing = true;
      } else {
        for (let i = 0; i < boundaries.length; i++) {
          if (scrollPercent >= boundaries[i].start && scrollPercent <= boundaries[i].end) {
            activeIndex = i;
            break;
          }
        }
      }

      // Calculate local percent within that segment
      let localPercent = 0;
      if (isPastScrubbing) {
        localPercent = 1.0; // Stay at end frame
      } else {
        const bounds = boundaries[activeIndex];
        const segmentLength = bounds.end - bounds.start;
        localPercent = segmentLength > 0 ? (scrollPercent - bounds.start) / segmentLength : 0;
        localPercent = Math.max(0, Math.min(1, localPercent));
      }

      // Update active video target time
      const activeVideo = videos[activeIndex];
      if (activeVideo && activeVideo.duration) {
        videoStates[activeIndex].targetTime = localPercent * activeVideo.duration;
      }

      // Configure boundary targets for inactive videos
      for (let i = 0; i < numVideos; i++) {
        if (i < activeIndex) {
          if (videos[i].duration) {
            videoStates[i].targetTime = videos[i].duration;
          }
        } else if (i > activeIndex) {
          videoStates[i].targetTime = 0;
        }
      }

      // Swap active class for opacity transitions
      videos.forEach((v, idx) => {
        if (idx === activeIndex) {
          v.classList.add("active");
        } else {
          v.classList.remove("active");
        }
      });
    }

    // Initialize/unlock video decoders on first user interaction (forces metadata load in Chrome/Safari)
    let initialized = false;
    function initVideos() {
      if (initialized) return;

      const playPromises = videos.map(v => {
        return v.play()
          .then(() => {
            v.pause();
            return true;
          })
          .catch(err => {
            console.warn("Video decoding init deferred/blocked:", err.message);
            return false;
          });
      });

      Promise.all(playPromises).then(results => {
        if (results.some(r => r === true)) {
          initialized = true;
          // Clean up the listeners since we've successfully initialized at least one video
          window.removeEventListener("touchstart", initVideos);
          window.removeEventListener("mousedown", initVideos);
          window.removeEventListener("click", initVideos);
        }
        updateVideoTimes();
      });
    }

    window.addEventListener("touchstart", initVideos, { passive: true });
    window.addEventListener("mousedown", initVideos, { passive: true });
    window.addEventListener("click", initVideos, { passive: true });

    window.addEventListener("scroll", updateVideoTimes, { passive: true });
    window.addEventListener("resize", updateVideoTimes, { passive: true });

    // Initialize triggers
    videos.forEach((v, idx) => {
      v.addEventListener("loadedmetadata", updateVideoTimes);
      if (v.readyState >= 1) {
        updateVideoTimes();
        // Sync initial frames instantly
        videoStates[idx].currentTime = videoStates[idx].targetTime;
        v.currentTime = videoStates[idx].currentTime;
      } else {
        // Force preload of resource
        v.load();
      }
    });

    // Unified animation frame seek loop
    function animate(timestamp) {
      videos.forEach((v, idx) => {
        if (v.duration) {
          const state = videoStates[idx];
          state.currentTime += (state.targetTime - state.currentTime) * ease;
          // Throttled seek updates (every 30ms / ~30fps) to ensure responsive rendering
          // bypassing the browser's slow and asynchronous 'seeking' state checks
          if (timestamp - (state.lastSeekTime || 0) > 30) {
            if (Math.abs(state.currentTime - v.currentTime) > 0.002) {
              v.currentTime = state.currentTime;
              state.lastSeekTime = timestamp;
            }
          }
        }
      });
      requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
  }

  // Section Fade In/Out on Scroll
  function updateSectionFades() {
    const viewportHeight = window.innerHeight;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      
      // Reveal when top enters the viewport (at 85% depth) and hide only when it fully exits the top (at 0 depth)
      const isVisible = rect.top < viewportHeight * 0.85 && rect.bottom > 0;

      if (isVisible) {
        section.classList.add("active");
      } else {
        section.classList.remove("active");
      }
    });
  }

  window.addEventListener("scroll", updateSectionFades, { passive: true });
  window.addEventListener("resize", updateSectionFades, { passive: true });

  // Smooth scroll to anchor links with offset for floating header
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId === "#") return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    });
  });

  // 3D Watermark Tilt Effect
  const watermark = document.querySelector(".bg-watermark");
  if (watermark) {
    let lastMoveTime = 0;
    const throttleDelay = 16; // Throttle to ~60fps for performance
    
    window.addEventListener("mousemove", (e) => {
      const now = performance.now();
      if (now - lastMoveTime < throttleDelay) return;
      lastMoveTime = now;

      // Only calculate and apply transform if light theme is active
      if (!document.body.classList.contains("light-theme")) {
        if (watermark.style.transform) {
          watermark.style.transform = "";
        }
        return;
      }

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      // Normalize coordinates (-1 to 1)
      const percentX = dx / cx;
      const percentY = dy / cy;

      // Max rotation angles (degrees)
      const maxRotateX = 12;
      const maxRotateY = 12;

      const rotateX = -percentY * maxRotateX;
      const rotateY = percentX * maxRotateY;

      watermark.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    });

    // Reset when mouse leaves window
    document.addEventListener("mouseleave", () => {
      if (document.body.classList.contains("light-theme")) {
        watermark.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
      }
    });
  }

  // Dynamic release versions loading on download page
  function initDynamicReleases() {
    const currentBuildInfo = document.getElementById("current-build-info");
    const currentDownloadBtn = document.getElementById("current-download-btn");
    const checksumVal = document.getElementById("checksum-val");
    const previousVersionsList = document.getElementById("previous-versions-list");

    // Exit early if not on download page
    if (!currentBuildInfo && !currentDownloadBtn && !checksumVal && !previousVersionsList) {
      return;
    }

    fetch("/releases/versions.json")
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to fetch versions.json");
        }
        return response.json();
      })
      .then(versions => {
        if (!versions || versions.length === 0) return;

        // 1. Populate current build
        const latest = versions[0];
        if (currentBuildInfo) {
          currentBuildInfo.innerHTML = `${latest.version} &middot; ${latest.size} &middot; Windows 10/11`;
        }
        if (currentDownloadBtn) {
          currentDownloadBtn.setAttribute("href", latest.url);
        }
        if (checksumVal) {
          checksumVal.textContent = latest.sha256;
        }

        // 2. Populate previous builds
        if (previousVersionsList) {
          previousVersionsList.innerHTML = "";
          for (let i = 1; i < versions.length; i++) {
            const v = versions[i];
            const li = document.createElement("li");
            li.innerHTML = `
              <span class="version-tag">${v.version}</span>
              <a class="version-link" href="${v.url}">
                Download MSI
              </a>
            `;
            previousVersionsList.appendChild(li);
          }
        }
      })
      .catch(err => {
        console.error("Error loading release versions dynamically:", err);
      });
  }

  initDynamicReleases();

  updateSectionFades();
});
