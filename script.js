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

    /* ── Probe a single thumbnail URL ─────────────────────── *
     * Loads the image directly (no CORS-restricted fetch needed).
     * YouTube doesn't 404 missing maxres/sd thumbnails — it serves
     * a 120×90 gray placeholder with HTTP 200 instead, so a plain
     * fetch/HEAD check can't tell real vs. missing apart. We load
     * the image and reject anything that comes back at exactly the
     * placeholder's dimensions. */
    function probeThumbnail(url) {
        return new Promise((resolve) => {
            const img = new Image();
            const timer = setTimeout(() => resolve(null), 6000); // don't hang forever

            img.onload = () => {
                clearTimeout(timer);
                const isPlaceholder = img.naturalWidth === 120 && img.naturalHeight === 90;
                resolve(isPlaceholder ? null : url);
            };
            img.onerror = () => {
                clearTimeout(timer);
                resolve(null);
            };
            img.src = url;
        });
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

        thumbnailsDisplay.innerHTML = `<p class="info-message">Fetching thumbnails…</p>`;

        const urls = generateThumbnailUrls(videoId);
        const labels = Object.keys(urls);

        // Probe every resolution in parallel instead of one-by-one.
        const results = await Promise.all(
            labels.map((label) => probeThumbnail(urls[label]))
        );

        thumbnailsDisplay.innerHTML = "";
        let idx = 0, shownAny = false;

        labels.forEach((label, i) => {
            const url = results[i];
            if (!url) return;

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
        });

        if (!shownAny) {
            thumbnailsDisplay.innerHTML = `
                <p class="info-message">
                    Could not retrieve thumbnails. The video might be private, deleted, or the URL is invalid.
                </p>`;
        }
    }

    /* ── Form Submission ──────────────────────────────────── */
    const submitBtn = document.getElementById("getThumbnailsBtn");
    const submitBtnDefaultHTML = submitBtn.innerHTML;

    grabForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const url = videoUrlInput.value.trim();
        const videoId = getYouTubeVideoId(url);

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>&nbsp;Grabbing…`;

        try {
            await displayThumbnails(videoId);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtnDefaultHTML;
        }
    });
});