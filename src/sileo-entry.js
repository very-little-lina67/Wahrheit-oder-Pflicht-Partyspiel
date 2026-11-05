import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster, sileo } from 'sileo';
import 'sileo/styles.css';

// Tiefschwarzer Hintergrund & markanter Antworten-Button
const customStyles = document.createElement('style');
customStyles.textContent = `
    [data-sileo-viewport] {
        z-index: 100050 !important;
    }
    [data-sileo-svg] path {
        fill: #000000 !important;
    }
    [data-sileo-toast] {
        filter: drop-shadow(0 14px 35px rgba(0, 0, 0, 0.95)) !important;
        cursor: pointer;
    }
    [data-sileo-title] {
        color: #ffffff !important;
        font-weight: 700 !important;
    }
    [data-sileo-description] {
        color: #cbd5e1 !important;
        font-size: 0.825rem !important;
    }
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

        window.showSileoToast = function(title, description, actionCallback, actionLabel = 'Antworten') {
            try {
                return sileo.action({
                    title: title || '💬 Neue Nachricht',
                    description: description || '',
                    fill: '#000000',
                    duration: 7000,
                    button: {
                        title: actionLabel || 'Antworten',
                        onClick: () => {
                            if (typeof actionCallback === 'function') actionCallback();
                        }
                    }
                });
            } catch (err) {
                console.warn('Sileo action error:', err);
                try {
                    return sileo.info({ title, description, fill: '#000000', duration: 7000 });
                } catch (e2) {}
            }
        };

        // Klick auf den Toast selbst öffnet ebenfalls den Chat
        container.addEventListener('click', (e) => {
            const toastEl = e.target.closest('[data-sileo-toast]');
            if (toastEl && !e.target.closest('[data-sileo-button]') && window._lastSileoAction) {
                try { window._lastSileoAction(); } catch (err) {}
            }
        });

        console.log('✨ Sileo Toast (React) in tiefem Schwarz mit Antworten-Button initialisiert');
    } catch (e) {
        console.error('Fehler bei Sileo Initialisierung:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSileo);
} else {
    initSileo();
}
