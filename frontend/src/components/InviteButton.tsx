import { useState } from "react";

export default function InviteButton() {
    const [message, setMessage] = useState("");

    async function copyLink() {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(window.location.href);
            } else {
                const input = document.createElement("textarea");
                input.value = window.location.href;
                input.style.position = "fixed";
                input.style.opacity = "0";
                document.body.appendChild(input);
                input.select();
                if (!document.execCommand("copy")) throw new Error("Copy failed");
                input.remove();
            }
            setMessage("Скопійовано");
        } catch {
            setMessage("Не вдалося скопіювати");
        }
        window.setTimeout(() => setMessage(""), 1800);
    }

    return (
        <button className="secondary-button" type="button" onClick={copyLink}>
            {message || "Запросити друзів"}
        </button>
    );
}