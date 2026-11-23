import { Html } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { YouTubePlaybackController } from "../types/YouTube";
import { getYouTubeStartTime } from "../utils/videoSource";

interface YouTubePlayerApi {
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (time: number, allowSeekAhead: boolean) => void;
    setVolume: (volume: number) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    getPlayerState: () => number;
    destroy: () => void;
}

interface YouTubePlayerEvent {
    target: YouTubePlayerApi;
}

interface YouTubePlayerStateEvent extends YouTubePlayerEvent {
    data: number;
}

interface YouTubePlayerErrorEvent {
    data: number;
}

interface YouTubeApi {
    Player: new (
        element: HTMLElement,
        options: {
            width: string;
            height: string;
            videoId: string;
            playerVars: Record<string, string | number>;
            events: {
                onReady: (event: YouTubePlayerEvent) => void;
                onStateChange: (event: YouTubePlayerStateEvent) => void;
                onError: (event: YouTubePlayerErrorEvent) => void;
            };
        },
    ) => YouTubePlayerApi;
}

declare global {
    interface Window {
        YT?: YouTubeApi;
        onYouTubeIframeAPIReady?: () => void;
    }
}

let apiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;

    apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
        const previousCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previousCallback?.();
            if (window.YT?.Player) resolve(window.YT);
            else reject(new Error("YouTube player API did not initialize."));
        };

        let script = document.querySelector<HTMLScriptElement>(
            'script[src="https://www.youtube.com/iframe_api"]',
        );
        if (!script) {
            script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(script);
        }
        script.addEventListener(
            "error",
            () => reject(new Error("Unable to load YouTube player API.")),
            { once: true },
        );
    }).catch((error: unknown) => {
        apiPromise = null;
        throw error;
    });

    return apiPromise;
}

interface YouTubeScreenProps {
    videoId: string;
    sourceUrl: string;
    onReady: (player: YouTubePlaybackController | null) => void;
    onStateChange: (state: number) => void;
    onTimeUpdate: (currentTime: number, duration: number) => void;
    onError: (message: string) => void;
}

function getPlayerErrorMessage(code: number): string {
    if (code === 2) return "YouTube не розпізнав це посилання на відео.";
    if (code === 5) return "YouTube не зміг відтворити відео у вбудованому плеєрі.";
    if (code === 100) return "Відео видалене або доступне лише приватно.";
    if (code === 101 || code === 150) {
        return "Власник відео заборонив відтворення на зовнішніх сайтах.";
    }
    if (code === 153) {
        return "YouTube не отримав дані про сайт. Перевір Referrer-Policy або відкрий кімнату через localhost/HTTPS.";
    }
    return "YouTube не зміг завантажити це відео.";
}

export default function YouTubeScreen({
    videoId,
    sourceUrl,
    onReady,
    onStateChange,
    onTimeUpdate,
    onError,
}: YouTubeScreenProps) {
    const mountRef = useRef<HTMLDivElement>(null);
    const startTime = getYouTubeStartTime(sourceUrl);

    useEffect(() => {
        let cancelled = false;
        let player: YouTubePlayerApi | null = null;
        let timer = 0;

        void loadYouTubeApi()
            .then((api) => {
                const element = mountRef.current;
                if (cancelled || !element) return;

                player = new api.Player(element, {
                    width: "568",
                    height: "320",
                    videoId,
                    playerVars: {
                        autoplay: 0,
                        controls: 0,
                        disablekb: 1,
                        enablejsapi: 1,
                        fs: 0,
                        origin: window.location.origin,
                        playsinline: 1,
                        rel: 0,
                        start: startTime,
                    },
                    events: {
                        onReady: (event) => {
                            if (cancelled) return;
                            const target = event.target;
                            onReady({
                                play: () => target.playVideo(),
                                pause: () => target.pauseVideo(),
                                seek: (time) => target.seekTo(time, true),
                                setVolume: (volume) =>
                                    target.setVolume(Math.round(volume * 100)),
                                getCurrentTime: () => target.getCurrentTime(),
                                getDuration: () => target.getDuration(),
                                getState: () => target.getPlayerState(),
                            });
                            timer = window.setInterval(() => {
                                onTimeUpdate(
                                    target.getCurrentTime(),
                                    target.getDuration(),
                                );
                            }, 500);
                        },
                        onStateChange: (event) => {
                            if (!cancelled) onStateChange(event.data);
                        },
                        onError: (event) => {
                            if (!cancelled) onError(getPlayerErrorMessage(event.data));
                        },
                    },
                });
            })
            .catch(() => {
                if (!cancelled) {
                    onError("Не вдалося завантажити плеєр YouTube. Перевір з’єднання.");
                }
            });

        return () => {
            cancelled = true;
            window.clearInterval(timer);
            player?.destroy();
            onReady(null);
        };
    }, [onError, onReady, onStateChange, onTimeUpdate, startTime, videoId]);

    return (
        <Html
            transform
            distanceFactor={10}
            position={[0, 0, 0.2]}
            zIndexRange={[1, 0]}
            style={{ pointerEvents: "none" }}
        >
            <div
                ref={mountRef}
                aria-label="Відео YouTube"
                style={{
                    width: 568,
                    height: 320,
                    overflow: "hidden",
                    background: "#050608",
                    pointerEvents: "none",
                }}
            />
        </Html>
    );
}
