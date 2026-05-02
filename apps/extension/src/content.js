(function () {
  function detectChannel() {
    const host = window.location.hostname;
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("indeed.com")) return "Indeed";
    if (host.includes("glassdoor.com")) return "Glassdoor";
    return "Other";
  }

  function extractLinkedIn() {
    return {
      title:
        document.querySelector(".job-details-jobs-unified-top-card__job-title")?.textContent?.trim() ??
        document.querySelector("h1")?.textContent?.trim() ?? "",
      company:
        document.querySelector('[data-testid="job-details-company-name"]')?.textContent?.trim() ??
        document.querySelector(".job-details-jobs-unified-top-card__company-name")?.textContent?.trim() ?? "",
    };
  }

  function extractIndeed() {
    return {
      title:
        document.querySelector(".jobsearch-JobInfoHeader-title")?.textContent?.trim() ??
        document.querySelector("h1")?.textContent?.trim() ?? "",
      company:
        document.querySelector(".jobsearch-CompanyInfoContainer a")?.textContent?.trim() ??
        document.querySelector("[data-company-name]")?.textContent?.trim() ?? "",
    };
  }

  function extractGlassdoor() {
    return {
      title: document.querySelector("h1")?.textContent?.trim() ?? "",
      company:
        document.querySelector("[data-test='employer-name']")?.textContent?.trim() ??
        document.querySelector(".css-87uc0g")?.textContent?.trim() ?? "",
    };
  }

  const channel = detectChannel();
  let extracted;
  if (channel === "LinkedIn") extracted = extractLinkedIn();
  else if (channel === "Indeed") extracted = extractIndeed();
  else if (channel === "Glassdoor") extracted = extractGlassdoor();
  else extracted = { title: document.querySelector("h1")?.textContent?.trim() ?? "", company: "" };

  const capture = {
    title: extracted.title,
    company: extracted.company,
    sourceUrl: window.location.href,
    channel: channel,
    capturedAt: new Date().toISOString(),
  };

  chrome.storage.local.set({ latestCapture: capture });
})();
