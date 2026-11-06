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

    /* Verhindert SVG-Baseline-Descent Verschiebung */
    [data-sileo-canvas] {
        position: absolute !important;
        top: 0 !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        line-height: 0 !important;
        pointer-events: none !important;
        contain: layout style !important;
    }

    [data-sileo-svg] {
        display: block !important;
        vertical-align: top !important;
        overflow: visible !important;
    }

    /* Toast Container Button Reset */
    [data-sileo-toast] {
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        filter: drop-shadow(0 10px 25px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 1px rgba(255, 255, 255, 0.2)) !important;
        cursor: pointer !important;
        line-height: 1 !important;
        height: var(--_h, var(--sileo-height, 42px)) !important;
    }

    /* Header exakt auf 42px Höhe, top: 0 und absolute vertikale Zentrierung */
    [data-sileo-header] {
        position: absolute !important;
        top: 0 !important;
        bottom: 0 !important;
        left: var(--_px, 0px) !important;
        height: var(--sileo-height, 42px) !important;
        max-height: var(--sileo-height, 42px) !important;
        box-sizing: border-box !important;
        padding: 0 12px !important;
        margin: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        max-width: var(--_pw, 100%) !important;
        overflow: hidden !important;
        line-height: 1 !important;
        transform: none !important;
    }

    [data-sileo-header-stack] {
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        line-height: 1 !important;
    }

    [data-sileo-header-inner] {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 100% !important;
        gap: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        white-space: nowrap !important;
        line-height: 1 !important;
    }

    /* Standard-Badge ausblenden, da wir ein perfekt integriertes Icon im Title-Node rendern */
    [data-sileo-badge] {
        display: none !important;
    }

    [data-sileo-title] {
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        line-height: 1 !important;
        text-transform: none !important;
    }

    /* Antworten-Button als hübsche Pill in der Toast-Leiste */
    .sileo-reply-pill {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: linear-gradient(135deg, #8b5cf6, #6d28d9) !important;
        color: #ffffff !important;
        font-size: 0.72rem !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        padding: 4px 10px !important;
        border-radius: 9999px !important;
        margin-left: 6px !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(109, 40, 217, 0.5) !important;
        transition: transform 0.15s ease, background 0.15s ease !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
    }
    .sileo-reply-pill:hover,
    .sileo-reply-pill:active {
        background: linear-gradient(135deg, #9333ea, #7c3aed) !important;
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
                fill: '#000000',
                roundness: 21
            }
        }));

        window.sileo = sileo;

        window.showSileoToast = function(titleText, description, actionCallback, actionLabel = 'Antworten', iconEmoji = '💬') {
            window._lastSileoAction = actionCallback;
            try {
                const raw = typeof titleText === 'string' ? titleText : 'Neue Nachricht';
                const cleanTitle = raw.replace(/^[💬🎮\s]+/, '').trim() || 'Neue Nachricht';
                const label = actionLabel || 'Antworten';
                const preview = typeof description === 'string' ? description.trim() : '';
                const shortPreview = preview.length > 28 ? preview.slice(0, 26) + '…' : preview;

                // Vollständig integrierter Title-Node mit Icon, Absender, Preview & Antworten-Button
                const toastContent = React.createElement('div', {
                    style: {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        lineHeight: '1',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        height: '100%'
                    }
                }, [
                    // 1. Icon Badge links
                    React.createElement('span', {
                        key: 'icon-badge',
                        style: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            minWidth: '24px',
                            minHeight: '24px',
                            borderRadius: '9999px',
                            background: 'rgba(139, 92, 246, 0.25)',
                            border: '1px solid rgba(167, 139, 250, 0.4)',
                            fontSize: '12px',
                            lineHeight: '1',
                            flexShrink: 0
                        }
                    }, iconEmoji || '💬'),

                    // 2. Sender Name + Preview
                    React.createElement('div', {
                        key: 'text-container',
                        style: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.82rem',
                            lineHeight: '1',
                            maxWidth: '190px',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                        }
                    }, [
                        React.createElement('span', {
                            key: 'sender-name',
                            style: {
                                fontWeight: '700',
                                color: '#ffffff',
                                whiteSpace: 'nowrap'
                            }
                        }, cleanTitle),
                        shortPreview ? React.createElement('span', {
                            key: 'preview-sep',
                            style: { color: '#94a3b8' }
                        }, ':') : null,
                        shortPreview ? React.createElement('span', {
                            key: 'preview-text',
                            style: {
                                color: '#cbd5e1',
                                fontWeight: '400',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }
                        }, shortPreview) : null
                    ]),

                    // 3. Antworten-Button
                    React.createElement('span', {
                        key: 'reply-pill',
                        className: 'sileo-reply-pill',
                        onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (typeof actionCallback === 'function') actionCallback();
                        }
                    }, `${label} ➔`)
                ]);

                return sileo.show({
                    title: toastContent,
                    fill: '#000000',
                    duration: 6500,
                    roundness: 21,
                    autopilot: false
                });
            } catch (err) {
                console.warn('Sileo action error:', err);
                try {
                    return sileo.info({ title: titleText, fill: '#000000', duration: 6500 });
                } catch (e2) {}
            }
        };

        // Klick auf den Toast selbst öffnet ebenfalls den Chat
        container.addEventListener('click', (e) => {
            const toastEl = e.target.closest('[data-sileo-toast]');
            if (toastEl && window._lastSileoAction) {
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
