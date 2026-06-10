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
  const unlockedContainer = document.getElementById("download-unlocked-container");
  const previousContainer = document.getElementById("previous-builds-container");
  const headerWaitlistBtn = document.getElementById("header-waitlist-btn");

  function unlockDownloads(isInstant) {
    if (!formContainer || !unlockedContainer || !previousContainer || !headerWaitlistBtn) return;

    if (isInstant) {
      formContainer.style.display = "none";
      unlockedContainer.style.display = "block";
      previousContainer.style.display = "block";
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
        
        unlockedContainer.style.display = "block";
        unlockedContainer.style.opacity = "0";
        unlockedContainer.style.transform = "translateY(10px)";
        
        previousContainer.style.display = "block";
        previousContainer.style.opacity = "0";
        
        // Force reflow
        unlockedContainer.offsetHeight;
        previousContainer.offsetHeight;
        
        unlockedContainer.style.transition = "opacity 300ms ease, transform 300ms ease";
        previousContainer.style.transition = "opacity 300ms ease";
        
        unlockedContainer.style.opacity = "1";
        unlockedContainer.style.transform = "translateY(0)";
        previousContainer.style.opacity = "1";
        
        headerWaitlistBtn.textContent = "Joined ✓";
        headerWaitlistBtn.classList.add("joined");
        headerWaitlistBtn.removeAttribute("href");
      }, 300);
    }
  }

  // Check initial state from LocalStorage
  const hasJoined = localStorage.getItem("kraitos_joined_waitlist");
  if (hasJoined === "true") {
    unlockDownloads(true);
  }

  // Handle Form Submission
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
      
      // Save state to LocalStorage
      localStorage.setItem("kraitos_joined_waitlist", "true");
      localStorage.setItem("kraitos_waitlist_email", email);
      
      // Trigger unlock transition
      unlockDownloads(false);
    });
  }

  // Background Video Scroll Control
  const video = document.getElementById("bg-scroll-video");
  const sections = document.querySelectorAll(".panel-section");

  if (video) {
    let targetTime = 0;
    let currentTime = 0;
    const ease = 0.08; // Lerp smoothing factor

    video.pause();

    function getScrollPercent() {
      const scrollY = window.scrollY || window.pageYOffset;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return 0;
      return Math.max(0, Math.min(1, scrollY / maxScroll));
    }

    function updateTargetTime() {
      if (video.duration) {
        targetTime = getScrollPercent() * video.duration;
      }
    }

    window.addEventListener("scroll", updateTargetTime, { passive: true });
    window.addEventListener("resize", updateTargetTime, { passive: true });

    video.addEventListener("loadedmetadata", () => {
      updateTargetTime();
      currentTime = targetTime;
      video.currentTime = currentTime;
    });

    if (video.readyState >= 1) {
      updateTargetTime();
      currentTime = targetTime;
      video.currentTime = currentTime;
    }

    function animate() {
      if (video.duration) {
        currentTime += (targetTime - currentTime) * ease;
        if (Math.abs(currentTime - video.currentTime) > 0.015) {
          video.currentTime = currentTime;
        }
      }
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

  updateSectionFades();
});
