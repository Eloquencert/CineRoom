const YOUTUBE_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
]);

export function getYouTubeVideoId(sourceUrl: string): string | null {
    try {
        const url = new URL(sourceUrl);
        if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;

        const segments = url.pathname.split("/").filter(Boolean);
        const id =
            url.hostname.toLowerCase() === "youtu.be"
                ? segments[0]
                : url.pathname === "/watch"
                    ? url.searchParams.get("v")
                    : ["embed", "shorts", "live"].includes(segments[0] ?? "")
                        ? segments[1]
                        : null;

        return id && /^[\w-]{11}$/.test(id) ? id : null;
    } catch {
        return null;
    }
}

function parseTime(value: string | null): number {
    if (!value) return 0;
    if (/^\d+$/.test(value)) return Number(value);
    const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!match) return 0;
    return Number(match[1] ?? 0) * 3600 +
        Number(match[2] ?? 0) * 60 +
        Number(match[3] ?? 0);
}

export function getYouTubeStartTime(sourceUrl: string): number {
    if (!getYouTubeVideoId(sourceUrl)) return 0;
    const url = new URL(sourceUrl);
    return parseTime(url.searchParams.get("start") ?? url.searchParams.get("t"));
}
