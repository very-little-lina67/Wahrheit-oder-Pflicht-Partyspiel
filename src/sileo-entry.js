import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster, sileo } from 'sileo';
import 'sileo/styles.css';

// Tiefschwarzer Hintergrund, pixel-perfekte vertikale Zentrierung & markanter Antworten-Button
const customStyles = document.createElement('style');
customStyles.textContent = `
    /* Universal Box-Sizing & Reset für den gesamten Sileo Viewport */
    [data-sileo-viewport],
    [data-sileo-viewport] *,
    [data-sileo-viewport] *::before,
    [data-sileo-viewport] *::after {
        box-sizing: border-box !important;
        margin: 0 !important;
    }

    [data-sileo-viewport] {
        z-index: 100050 !important;
        padding-top: max(14px, env(safe-area-inset-top, 14px)) !important;
    }

    /* Tiefschwarzer Hintergrund für alle SVG-Pills und Shapes */
    [data-sileo-svg] rect,
    [data-sileo-svg] path {
        fill: #000000 !important;
    }

    /* Toast Container Button Reset */
    [data-sileo-toast] {
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        filter: drop-shadow(0 14px 35px rgba(0, 0, 0, 0.95)) !important;
        cursor: pointer !important;
        line-height: 1 !important;
    }

    /* Header sauber vertikal zentriert (verhindert Verschiebung nach unten auf Android/Mobile) */
    [data-sileo-header] {
        box-sizing: border-box !important;
        padding: 0 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        max-width: 100% !important;
    }

    [data-sileo-header-stack],
    [data-sileo-header-inner] {
        box-sizing: border-box !important;
        display: flex !important;
        align-items: center !important;
        height: 100% !important;
        gap: 8px !important;
        padding: 0 !important;
        margin: 0 !important;
    }

    [data-sileo-badge] {
        box-sizing: border-box !important;
        margin: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
        width: 24px !important;
        height: 24px !important;
        border-radius: 9999px !important;
        background-color: rgba(139, 92, 246, 0.25) !important;
        color: #a78bfa !important;
    }

    [data-sileo-badge] svg {
        width: 14px !important;
        height: 14px !important;
        display: block !important;
    }

    [data-sileo-title] {
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        font-size: 0.85rem !important;
        line-height: 1.2 !important;
    }

    /* Antworten-Button direkt in der Toast-Pill */
    .sileo-reply-btn {
        appearance: none !important;
        -webkit-appearance: none !important;
        background: linear-gradient(135deg, #8b5cf6, #6d28d9) !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        font-size: 0.72rem !important;
        border: none !important;
        border-radius: 9999px !important;
        padding: 4px 10px !important;
        margin-left: 8px !important;
        height: 22px !important;
        min-height: 22px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(109, 40, 217, 0.5) !important;
        transition: transform 0.15s ease, background 0.15s ease !important;
        line-height: 1 !important;
        white-space: nowrap !important;
    }
    .sileo-reply-btn:hover {
        background: linear-gradient(135deg, #7c3aed, #5b21b6) !important;
        transform: scale(1.05) !important;
    }

    [data-sileo-description] {
        color: #cbd5e1 !important;
        font-size: 0.825rem !important;
        padding: 0.85rem 1rem !important;
    }

    /* Antworten-Button im erweiterten Body */
    [data-sileo-button] {
        background: linear-gradient(135deg, #8b5cf6, #6d28d9) !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        border-radius: 9999px !important;
        padding: 5px 14px !important;
        height: auto !important;
        min-height: 26px !important;
        box-shadow: 0 2px 10px rgba(109, 40, 217, 0.5) !important;
        cursor: pointer !important;
        transition: transform 0.15s ease, background 0.15s ease !important;
    }
    [data-sileo-button]:hover {
        background: linear-gradient(135deg, #7c3aed, #5b21b6) !important;
        transform: scale(1.05) !important;
    }
`;
document.head.appendChild(customStyles);

function initSileo() {
    let container = document.getElementById('sileo-root');
    if (!container) {
        container = document.createElement('div');
        container.id = 'sileo-root';
        document.body.appendChild(container);
    }

    try {
        const root = ReactDOM.createRoot(container);
        root.render(React.createElement(Toaster, {
            position: 'top-center',
            theme: 'dark',
            options: {
                fill: '#000000'
            }
        }));

        window.sileo = sileo;

        window.showSileoToast = function(titleText, description, actionCallback, actionLabel = 'Antworten') {
            window._lastSileoAction = actionCallback;
            try {
                const titleStr = typeof titleText === 'string' ? titleText : '💬 Neue Nachricht';
                const labelStr = actionLabel || 'Antworten';
                const pillTitle = `${titleStr}  ➔  ${labelStr}`;

                return sileo.action({
                    title: pillTitle,
                    description: description || '',
                    fill: '#000000',
                    duration: 6500,
                    button: {
                        title: labelStr,
                        onClick: () => {
                            if (typeof actionCallback === 'function') actionCallback();
                        }
                    }
                });
            } catch (err) {
                console.warn('Sileo action error:', err);
                try {
                    return sileo.info({ title: titleText, description, fill: '#000000', duration: 6500 });
                } catch (e2) {}
            }
        };

        // Klick auf den Toast selbst öffnet ebenfalls den Chat
        container.addEventListener('click', (e) => {
            const toastEl = e.target.closest('[data-sileo-toast]');
            if (toastEl && !e.target.closest('.sileo-reply-btn') && !e.target.closest('[data-sileo-button]') && window._lastSileoAction) {
                try { window._lastSileoAction(); } catch (err) {}
            }
        });

        console.log('✨ Sileo Toast (React) in tiefem Schwarz mit zentriertem Layout & Antworten-Button initialisiert');
    } catch (e) {
        console.error('Fehler bei Sileo Initialisierung:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSileo);
} else {
    initSileo();
}
