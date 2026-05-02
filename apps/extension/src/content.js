(function () {
  const guess = {
    title: document.querySelector("h1")?.textContent?.trim() ?? "",
    company:
      document.querySelector('[data-testid="job-details-company-name"]')?.textContent?.trim() ??
      document.querySelector(".jobsearch-CompanyInfoContainer a")?.textContent?.trim() ??
      "",
    sourceUrl: window.location.href,
    capturedAt: new Date().toISOString(),
  };

  chrome.storage.local.set({ latestCapture: guess });
})();
