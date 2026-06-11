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

  // Check initial state from LocalStorage
  const hasJoined = localStorage.getItem("kraitos_joined_waitlist");
  if (hasJoined === "true") {
    showWaitlistSuccess(true);
  }

  // Handle Form Submission (AJAX integration for Netlify Forms)
  if (waitlistForm) {
    waitlistForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const email = waitlistEmailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!email) {
        waitlistError.textContent = "Please enter your email address.";
        waitlistEmailInput.focus();
        return;
      }
      
      if (!emailRegex.test(email)) {
        waitlistError.textContent = "Please enter a valid email address.";
        waitlistEmailInput.focus();
        return;
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

      // Submit to Netlify
      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData).toString()
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Form submission response not OK");
        }
        // Save state to LocalStorage
        localStorage.setItem("kraitos_joined_waitlist", "true");
        localStorage.setItem("kraitos_waitlist_email", email);
        
        // Trigger unlock transition
        showWaitlistSuccess(false);
      })
      .catch((err) => {
        console.error("Netlify form submission error:", err);
        waitlistError.textContent = "Something went wrong. Please try again.";
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
    const ease = 0.08; // Lerp smoothing factor

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
    function animate() {
      videos.forEach((v, idx) => {
        if (v.duration) {
          const state = videoStates[idx];
          state.currentTime += (state.targetTime - state.currentTime) * ease;
          // Prevent seek flooding by checking !v.seeking before updating currentTime
          if (!v.seeking && Math.abs(state.currentTime - v.currentTime) > 0.015) {
            v.currentTime = state.currentTime;
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

  updateSectionFades();
});
