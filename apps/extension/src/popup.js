const payloadEl = document.getElementById("payload");
const buttonEl = document.getElementById("save");

chrome.storage.local.get(["latestCapture", "captureQueue"], (result) => {
  const capture = result.latestCapture ?? {};
  payloadEl.textContent = JSON.stringify(capture, null, 2);
});

buttonEl.addEventListener("click", () => {
  chrome.storage.local.get(["latestCapture", "captureQueue"], (result) => {
    const queue = result.captureQueue ?? [];
    const nextQueue = [...queue, result.latestCapture];
    chrome.storage.local.set({ captureQueue: nextQueue }, () => {
      buttonEl.textContent = "Saved";
    });
  });
});
