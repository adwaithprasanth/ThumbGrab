document.addEventListener("DOMContentLoaded", () => {
    const videoUrlInput     = document.getElementById("videoUrl");
    const thumbnailsDisplay = document.getElementById("thumbnailsDisplay");
    const grabForm          = document.getElementById("grabForm");
    const submitBtn         = document.getElementById("getThumbnailsBtn");
    const submitBtnDefaultHTML = submitBtn.innerHTML;

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
            "Default"    : { file: "default.jpg",    dims: "120 × 90" },
            "Medium"     : { file: "mqdefault.jpg",   dims: "320 × 180" },
            "High"       : { file: "hqdefault.jpg",   dims: "480 × 360" },
            "SD"         : { file: "sddefault.jpg",   dims: "640 × 480" },
            "Max Res"    : { file: "maxresdefault.jpg", dims: "1280 × 720" }
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
        thumbnailsDisplay.classList.remove("filmstrip");

        if (!videoId) {
            thumbnailsDisplay.innerHTML = `
                <p class="status-message status-message--error">
                    That doesn't look like a YouTube link. Paste a video, shorts, or youtu.be URL.
                </p>`;
            return;
        }

        thumbnailsDisplay.innerHTML = `<p class="status-message">Reading frames…</p>`;

        const urls = generateThumbnailUrls(videoId);
        const labels = Object.keys(urls);

        // Probe every resolution in parallel instead of one-by-one.
        const results = await Promise.all(
            labels.map((label) => probeThumbnail(`https://img.youtube.com/vi/${videoId}/${urls[label].file}`))
        );

        thumbnailsDisplay.innerHTML = "";

        const found = labels
            .map((label, i) => ({ label, dims: urls[label].dims, url: results[i] }))
            .filter((f) => f.url);

        if (found.length === 0) {
            thumbnailsDisplay.innerHTML = `
                <p class="status-message status-message--error">
                    No frames found. The video might be private, deleted, or the link's wrong.
                </p>`;
            return;
        }

        thumbnailsDisplay.classList.add("filmstrip");

        found.forEach((f, idx) => {
            const num = String(idx + 1).padStart(2, "0");

            const frame = document.createElement("article");
            frame.className = "frame";
            frame.style.animationDelay = `${idx * 70}ms`;

            const figure = document.createElement("div");
            figure.className = "frame__figure";

            const img = document.createElement("img");
            img.src = f.url;
            img.alt = `${f.label} thumbnail, ${f.dims}`;
            img.loading = "lazy";
            img.onerror = () => { frame.style.display = "none"; };

            const number = document.createElement("span");
            number.className = "frame__number";
            number.textContent = num;

            figure.append(img, number);

            const meta = document.createElement("div");
            meta.className = "frame__meta";

            const text = document.createElement("div");
            text.className = "frame__text";

            const label = document.createElement("p");
            label.className = "frame__label";
            label.textContent = f.label;

            const dims = document.createElement("p");
            dims.className = "frame__dims";
            dims.textContent = f.dims;

            text.append(label, dims);

            const download = document.createElement("a");
            download.className = "frame__download";
            download.href = f.url;
            download.target = "_blank";
            download.rel = "noopener";
            download.download = `${videoId}_${f.label.replace(/[^\w]+/g, "_").toLowerCase()}.jpg`;
            download.setAttribute("aria-label", `Download ${f.label} thumbnail`);
            download.innerHTML = `<i class="fa-solid fa-arrow-down" aria-hidden="true"></i>`;

            meta.append(text, download);
            frame.append(figure, meta);
            thumbnailsDisplay.append(frame);
        });
    }

    /* ── Form Submission ──────────────────────────────────── */
    grabForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const url = videoUrlInput.value.trim();
        const videoId = getYouTubeVideoId(url);

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span class="btn__label">Grabbing</span>`;

        try {
            await displayThumbnails(videoId);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtnDefaultHTML;
        }
    });
});