document.addEventListener("DOMContentLoaded", () => {
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

      const rawIndex = Math.floor(scrollPercent * numVideos);
      activeIndex = Math.max(0, Math.min(numVideos - 1, rawIndex));

      const segmentStart = activeIndex / numVideos;
      let localPercent = (scrollPercent - segmentStart) * numVideos;
      localPercent = Math.max(0, Math.min(1, localPercent));

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
      }
    });

    // Unified animation frame seek loop
    function animate() {
      videos.forEach((v, idx) => {
        if (v.duration) {
          const state = videoStates[idx];
          state.currentTime += (state.targetTime - state.currentTime) * ease;
          if (Math.abs(state.currentTime - v.currentTime) > 0.015) {
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
    const viewportCenter = viewportHeight / 2;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height / 2;
      const distanceFromCenter = Math.abs(sectionCenter - viewportCenter);

      if (distanceFromCenter < viewportHeight * 0.45) {
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

  updateSectionFades();
});
