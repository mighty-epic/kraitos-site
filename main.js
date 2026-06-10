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

  // Background Video Scroll Control
  const video = document.getElementById("bg-scroll-video");
  const sections = document.querySelectorAll(".panel-section");

  if (video) {
    let targetTime = 0;
    let currentTime = 0;
    const ease = 0.08; // Lerp smoothing factor

    // Pause video to ensure scroll controls current frame
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

    // Scroll listener
    window.addEventListener("scroll", updateTargetTime, { passive: true });
    window.addEventListener("resize", updateTargetTime, { passive: true });

    // Initial check in case page was reloaded down
    video.addEventListener("loadedmetadata", () => {
      updateTargetTime();
      currentTime = targetTime;
      video.currentTime = currentTime;
    });

    // Fallback if metadata is already loaded
    if (video.readyState >= 1) {
      updateTargetTime();
      currentTime = targetTime;
      video.currentTime = currentTime;
    }

    // Smooth video frame seek interpolation loop
    function animate() {
      if (video.duration) {
        // Linear interpolation formula: current = current + (target - current) * ease
        currentTime += (targetTime - currentTime) * ease;
        
        // Prevent floating seeks if difference is extremely small
        if (Math.abs(currentTime - video.currentTime) > 0.015) {
          video.currentTime = currentTime;
        }
      }
      requestAnimationFrame(animate);
    }
    
    // Start animation loop
    requestAnimationFrame(animate);
  }

  // Section Fade In/Out on Scroll
  function updateSectionFades() {
    const viewportHeight = window.innerHeight;
    const viewportCenter = viewportHeight / 2;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height / 2;

      // Calculate how close the section center is to the viewport center
      const distanceFromCenter = Math.abs(sectionCenter - viewportCenter);

      // If section center is within 45% of viewport height, mark active
      if (distanceFromCenter < viewportHeight * 0.45) {
        section.classList.add("active");
      } else {
        section.classList.remove("active");
      }
    });
  }

  window.addEventListener("scroll", updateSectionFades, { passive: true });
  window.addEventListener("resize", updateSectionFades, { passive: true });

  // Initial trigger
  updateSectionFades();
});
