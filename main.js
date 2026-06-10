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
});
