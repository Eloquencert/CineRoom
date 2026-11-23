import { useState } from "react";
import { ArrowRight, Clapperboard, Film, Link2, Settings2 } from "lucide-react";

interface HomeScreenProps {
    onCreate: (roomName: string, sourceUrl: string) => void;
    onJoin: (roomId: string) => void;
}

export default function HomeScreen({ onCreate, onJoin }: HomeScreenProps) {
    const [roomName, setRoomName] = useState("");
    const [sourceUrl, setSourceUrl] = useState("");
    const [roomCode, setRoomCode] = useState("");
    const [showSettings, setShowSettings] = useState(false);

    return (
        <main className="home-screen">
            <div className="home-grain" />
            <header className="home-nav">
                <a className="brand-lockup" href="/" aria-label="CineRoom — головна">
                    <span className="brand-mark"><Clapperboard size={20} /></span>
                    <span>CineRoom</span>
                </a>
                <span className="nav-caption">WATCH TOGETHER, FEEL CLOSER</span>
            </header>

            <section className="home-content">
                <div className="home-copy">
                    <span className="section-kicker"><span /> YOUR PRIVATE CINEMA</span>
                    <h1>Вечір кіно.<br /><em>Ваша компанія.</em></h1>
                    <p className="home-description">
                        Створіть власний кінозал, запросіть друзів і дивіться разом —
                        де б ви не були.
                    </p>
                    <div className="home-features">
                        <span><Film size={16} /> Спільний перегляд</span>
                        <span><Link2 size={16} /> Одне посилання для друзів</span>
                    </div>
                </div>

                <section className="create-card" aria-labelledby="create-heading">
                    <div className="card-heading">
                        <div className="card-icon"><Clapperboard size={19} /></div>
                        <div>
                            <p className="card-eyebrow">ПОЧНІМО</p>
                            <h2 id="create-heading">Створити кімнату</h2>
                        </div>
                    </div>
                    <label className="field-label" htmlFor="room-name">Назва вечора</label>
                    <input
                        id="room-name"
                        className="text-field"
                        value={roomName}
                        onChange={(event) => setRoomName(event.target.value)}
                        maxLength={48}
                        placeholder="Наприклад, Кіно п'ятниці"
                    />
                    {showSettings && (
                        <div className="advanced-settings">
                            <label className="field-label" htmlFor="video-url">
                                Пряме посилання на відео <span>необов'язково</span>
                            </label>
                            <input
                                id="video-url"
                                className="text-field"
                                type="url"
                                value={sourceUrl}
                                onChange={(event) => setSourceUrl(event.target.value)}
                                placeholder="https://example.com/movie.mp4"
                            />
                            <p className="field-hint">
                                Підійде посилання на YouTube або пряме посилання на MP4, WebM чи Ogg.
                            </p>
                        </div>
                    )}
                    <button
                        className="settings-toggle"
                        type="button"
                        aria-expanded={showSettings}
                        onClick={() => setShowSettings((value) => !value)}
                    >
                        <Settings2 size={16} />
                        {showSettings ? "Приховати налаштування" : "Налаштування кімнати"}
                        <span>{showSettings ? "−" : "+"}</span>
                    </button>
                    <button
                        className="create-button"
                        type="button"
                        onClick={() => onCreate(roomName.trim() || "Кінозал друзів", sourceUrl.trim())}
                    >
                        Створити кінозал <ArrowRight size={18} />
                    </button>
                    <div className="join-divider"><span /> або приєднайтесь <span /></div>
                    <form
                        className="join-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (roomCode.trim()) onJoin(roomCode.trim());
                        }}
                    >
                        <input
                            className="text-field"
                            value={roomCode}
                            onChange={(event) => setRoomCode(event.target.value)}
                            placeholder="Введіть код кімнати"
                            aria-label="Код кімнати"
                        />
                        <button className="join-button" type="submit" aria-label="Приєднатися">
                            <ArrowRight size={18} />
                        </button>
                    </form>
                </section>
            </section>

            <footer className="home-footer">
                <span>ЗВУК. СВІТЛО. ВАШІ ЛЮДИ.</span>
                <span>Зроблено для спільних моментів</span>
            </footer>
        </main>
    );
}
