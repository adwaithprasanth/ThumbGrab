document.addEventListener("DOMContentLoaded", () => {
    const videoUrlInput     = document.getElementById("videoUrl");
    const thumbnailsDisplay = document.getElementById("thumbnailsDisplay");
    const grabForm          = document.getElementById("grabForm");

    /* ── Extract YouTube Video ID ─────────────────────────── */
    function getYouTubeVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|watch\?.*v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/, // watch, share
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,   // shorts
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/     // embed
        ];
        for (const rx of patterns) {
            const match = url.match(rx);
            if (match && match[1]) return match[1];
        }
        return null;
    }

    /* ── Generate Thumbnail URLs ──────────────────────────── */
    function generateThumbnailUrls(videoId) {
        if (!videoId) return {};
        const base = `https://img.youtube.com/vi/${videoId}/`;
        return {
            "Default (120×90)"           : base + "default.jpg",
            "Medium Quality (320×180)"   : base + "mqdefault.jpg",
            "High Quality (480×360)"     : base + "hqdefault.jpg",
            "SD (640×480)"               : base + "sddefault.jpg",
            "Max Res (1280×720)"         : base + "maxresdefault.jpg"
        };
    }

    /* ── Display Thumbnails ───────────────────────────────── */
    async function displayThumbnails(videoId) {
        thumbnailsDisplay.innerHTML = "";

        if (!videoId) {
            thumbnailsDisplay.innerHTML = `
                <p class="error-message">
                    Please enter a valid YouTube video URL.
                </p>`;
            return;
        }

        const urls = generateThumbnailUrls(videoId);
        let idx = 0, shownAny = false;

        for (const label in urls) {
            const url = urls[label];

            try {
                const res = await fetch(url, { method: "HEAD" });
                if (!res.ok || Number(res.headers.get("Content-Length") || 0) === 0) {
                    continue;
                }
            } catch {
                console.warn(`HEAD request failed for: ${url}`);
                continue;
            }

            shownAny = true;

            const card = document.createElement("div");
            card.className = "thumbnail-item";
            card.style.animationDelay = `${idx * 60}ms`;
            idx++;

            const img = document.createElement("img");
            img.src = url;
            img.alt = `${label} thumbnail`;
            img.onerror = () => {
                card.style.display = "none";
                console.warn(`Image failed to load: ${url}`);
            };

            const info = document.createElement("div");
            info.className = "thumb-info";

            const p = document.createElement("p");
            p.textContent = label;

            const a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.download = `${videoId}_${label.replace(/[^\w]+/g, "_").toLowerCase()}.jpg`;
            a.textContent = "Download";

            info.append(p, a);
            card.append(img, info);
            thumbnailsDisplay.append(card);
        }

        if (!shownAny) {
            thumbnailsDisplay.innerHTML = `
                <p class="info-message">
                    Could not retrieve thumbnails. The video might be private, deleted, or the URL is invalid.
                </p>`;
        }
    }

    /* ── Form Submission ──────────────────────────────────── */
    grabForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const url = videoUrlInput.value.trim();
        const videoId = getYouTubeVideoId(url);
        displayThumbnails(videoId);
    });
});
