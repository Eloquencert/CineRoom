import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerState } from "../types/Cinema";
import type { YouTubePlaybackController } from "../types/YouTube";
import { getYouTubeStartTime, getYouTubeVideoId } from "../utils/videoSource";

const initialState: PlayerState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    sourceUrl: "",
};

export function useCinemaPlayer() {
    const videoElementRef = useRef<{ element: HTMLVideoElement | null }>({
        element: null,
    });
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const pendingSyncRef = useRef<PlayerState | null>(null);
    const youtubePlayerRef = useRef<{
        player: YouTubePlaybackController | null;
    }>({ player: null });
    const volumeRef = useRef({ value: initialState.volume });
    const sourceUrlRef = useRef(initialState.sourceUrl);
    const [state, setState] = useState(initialState);
    const [error, setError] = useState("");

    const attachVideo = useCallback((video: HTMLVideoElement | null) => {
        videoElementRef.current.element = video;
        setVideoElement(video);
    }, []);

    useEffect(() => {
        const video = videoElementRef.current.element;
        if (!video) return;

        const updateTime = () =>
            setState((current) => ({ ...current, currentTime: video.currentTime }));
        const updateDuration = () => {
            setState((current) => ({ ...current, duration: video.duration || 0 }));
            const pending = pendingSyncRef.current;
            if (!pending) return;
            pendingSyncRef.current = null;
            video.currentTime = Math.max(0, pending.currentTime);
            video.volume = pending.volume;
            if (pending.isPlaying) {
                void video.play().catch(() => {
                    setError("Натисни «Play», щоб дозволити браузеру відтворювати відео.");
                });
            }
        };
        const handleError = () => {
            const mediaError = video.error;
            const message = mediaError?.code === MediaError.MEDIA_ERR_DECODE
                ? "Браузер не підтримує кодек цього відео. Спробуй MP4 з H.264/AAC або WebM."
                : mediaError?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
                    ? "Посилання недоступне, формат не підтримується або сервер не дозволяє CORS. Потрібне пряме HTTP(S)-посилання на MP4, WebM чи Ogg із доступом для браузера."
                    : mediaError?.code === MediaError.MEDIA_ERR_NETWORK
                        ? "Не вдалося завантажити відео. Перевір посилання та доступ до джерела."
                        : "Завантаження відео перервано. Спробуй ще раз.";
            setError(message);
            setState((current) => ({ ...current, isPlaying: false }));
        };
        const clearError = () => setError("");
        const handleEnded = () =>
            setState((current) => ({ ...current, isPlaying: false }));

        video.addEventListener("timeupdate", updateTime);
        video.addEventListener("loadedmetadata", updateDuration);
        video.addEventListener("error", handleError);
        video.addEventListener("loadstart", clearError);
        video.addEventListener("ended", handleEnded);
        return () => {
            video.removeEventListener("timeupdate", updateTime);
            video.removeEventListener("loadedmetadata", updateDuration);
            video.removeEventListener("error", handleError);
            video.removeEventListener("loadstart", clearError);
            video.removeEventListener("ended", handleEnded);
            video.pause();
        };
    }, [videoElement]);

    useEffect(() => {
        const video = videoElementRef.current.element;
        if (!video) return;
        video.pause();
        if (getYouTubeVideoId(state.sourceUrl)) {
            video.removeAttribute("src");
            video.load();
            return;
        }
        if (state.sourceUrl) {
            video.crossOrigin = "anonymous";
            video.src = state.sourceUrl;
        }
        else video.removeAttribute("src");
        video.load();
    }, [videoElement, state.sourceUrl]);

    const togglePlay = useCallback(async () => {
        if (getYouTubeVideoId(state.sourceUrl)) {
            const player = youtubePlayerRef.current.player;
            if (!player) {
                setError("Плеєр YouTube ще завантажується. Спробуй за мить.");
                return false;
            }
            const isPlaying = player.getState() === 1;
            if (isPlaying) player.pause();
            else player.play();
            const currentTime = player.getCurrentTime();
            setState((current) => ({
                ...current,
                currentTime:
                    currentTime === 0 && current.currentTime > 0
                        ? current.currentTime
                        : currentTime,
                isPlaying: !isPlaying,
            }));
            setError("");
            return !isPlaying;
        }
        const video = videoElementRef.current.element;
        if (!video || !state.sourceUrl) {
            setError("Спочатку додай URL відео.");
            return false;
        }
        if (video.paused) {
            try {
                await video.play();
                setError("");
                setState((current) => ({ ...current, isPlaying: true }));
                return true;
            } catch (playError) {
                const errorName =
                    playError instanceof DOMException ? playError.name : "";
                setError(
                    errorName === "NotAllowedError"
                        ? "Браузер заблокував відтворення. Натисни «Play» ще раз або перевір налаштування звуку."
                        : errorName === "NotSupportedError" || video.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
                            ? "Це джерело не підтримується. Використай пряме посилання на MP4, WebM чи Ogg."
                            : "Відео не вдалося відтворити. Перевір, що посилання доступне.",
                );
                return false;
            }
        } else {
            video.pause();
            setState((current) => ({ ...current, isPlaying: false }));
            return false;
        }
    }, [state.sourceUrl]);

    const resumePlayback = useCallback(async () => {
        if (getYouTubeVideoId(state.sourceUrl)) {
            const player = youtubePlayerRef.current.player;
            if (!player) {
                setError("Плеєр YouTube ще завантажується. Спробуй за мить.");
                return false;
            }
            player.play();
            setError("");
            return true;
        }
        const video = videoElementRef.current.element;
        if (!video || !state.sourceUrl) return false;
        try {
            await video.play();
            setError("");
            setState((current) => ({ ...current, isPlaying: true }));
            return true;
        } catch {
            setError("Браузер заблокував відтворення. Перевір посилання або натисни ще раз.");
            return false;
        }
    }, [state.sourceUrl]);

    const seek = useCallback((time: number) => {
        const youtubePlayer = youtubePlayerRef.current.player;
        if (getYouTubeVideoId(state.sourceUrl) && youtubePlayer) {
            const target = Math.max(0, time);
            youtubePlayer.seek(target);
            setState((current) => ({ ...current, currentTime: target }));
            return;
        }
        const video = videoElementRef.current.element;
        if (!video || !Number.isFinite(time)) return;
        video.currentTime = Math.max(0, Math.min(time, video.duration || time));
        setState((current) => ({ ...current, currentTime: video.currentTime }));
    }, [state.sourceUrl]);

    const setVolume = useCallback((volume: number) => {
        const value = Math.max(0, Math.min(1, volume));
        volumeRef.current.value = value;
        const youtubePlayer = youtubePlayerRef.current.player;
        if (getYouTubeVideoId(state.sourceUrl) && youtubePlayer) {
            youtubePlayer.setVolume(value);
        }
        const video = videoElementRef.current.element;
        if (video) video.volume = value;
        setState((current) => ({ ...current, volume: value }));
    }, [state.sourceUrl]);

    const changeSource = useCallback((sourceUrl: string) => {
        pendingSyncRef.current = null;
        sourceUrlRef.current = sourceUrl;
        const youtubePlayer = youtubePlayerRef.current.player;
        if (youtubePlayer) youtubePlayer.pause();
        const video = videoElementRef.current.element;
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        setError("");
        setState({
            ...initialState,
            sourceUrl,
            currentTime: getYouTubeStartTime(sourceUrl),
        });
    }, []);

    const syncFromState = useCallback(
        (remote: PlayerState) => {
            sourceUrlRef.current = remote.sourceUrl;
            const isYouTube = getYouTubeVideoId(remote.sourceUrl) !== null;
            const youtubePlayer = youtubePlayerRef.current.player;
            if (remote.sourceUrl !== state.sourceUrl) {
                pendingSyncRef.current = remote;
                setState(remote);
                return;
            }
            if (isYouTube) {
                if (!youtubePlayer) {
                    pendingSyncRef.current = remote;
                    return;
                }
                if (Math.abs(youtubePlayer.getCurrentTime() - remote.currentTime) > 2) {
                    youtubePlayer.seek(remote.currentTime);
                }
                youtubePlayer.setVolume(remote.volume);
                if (remote.isPlaying && youtubePlayer.getState() !== 1) {
                    youtubePlayer.play();
                } else if (!remote.isPlaying && youtubePlayer.getState() === 1) {
                    youtubePlayer.pause();
                }
                setState(remote);
                return;
            }
            const video = videoElementRef.current.element;
            if (!video) return;
            if (Math.abs(video.currentTime - remote.currentTime) > 2) {
                video.currentTime = remote.currentTime;
            }
            video.volume = remote.volume;
            if (remote.isPlaying && video.paused) {
                void video.play().catch(() => {
                    setError("Браузер заблокував синхронізоване відтворення.");
                });
            }
            if (!remote.isPlaying && !video.paused) video.pause();
            setState(remote);
        },
        [state.sourceUrl],
    );

    const registerYouTubePlayer = useCallback(
        (player: YouTubePlaybackController | null) => {
            youtubePlayerRef.current.player = player;
            if (!player) return;
            const pending = pendingSyncRef.current;
            if (pending) {
                pendingSyncRef.current = null;
                player.setVolume(pending.volume);
                player.seek(pending.currentTime);
                if (pending.isPlaying) player.play();
                else player.pause();
            } else {
                player.setVolume(volumeRef.current.value);
                const startTime = getYouTubeStartTime(
                    sourceUrlRef.current,
                );
                if (startTime > 0) player.seek(startTime);
            }
        },
        [],
    );

    const updateYouTubeState = useCallback((playerState: number) => {
        if (playerState === 1) {
            setState((current) => ({ ...current, isPlaying: true }));
        } else if (playerState === 0 || playerState === 2) {
            setState((current) => ({ ...current, isPlaying: false }));
        }
    }, []);

    const updateYouTubeTime = useCallback(
        (currentTime: number, duration: number) => {
            if (!Number.isFinite(currentTime) || !Number.isFinite(duration)) return;
            setState((current) => ({
                ...current,
                currentTime:
                    currentTime === 0 && current.currentTime > 0
                        ? current.currentTime
                        : currentTime,
                duration,
            }));
        },
        [],
    );

    const handleYouTubeError = useCallback((message: string) => {
        setError(message);
        setState((current) => ({ ...current, isPlaying: false }));
    }, []);

    return {
        videoElement,
        attachVideo,
        state,
        error,
        setError,
        togglePlay,
        resumePlayback,
        seek,
        setVolume,
        changeSource,
        syncFromState,
        registerYouTubePlayer,
        updateYouTubeState,
        updateYouTubeTime,
        handleYouTubeError,
    };
}