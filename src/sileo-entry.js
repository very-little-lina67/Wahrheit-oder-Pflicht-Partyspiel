import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster, sileo } from 'sileo';
import 'sileo/styles.css';

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
            theme: 'dark'
        }));

        window.sileo = sileo;

        window.showSileoToast = function(title, description, actionCallback, actionLabel = 'Öffnen') {
            try {
                return sileo.action({
                    title: title || '💬 Neue Nachricht',
                    description: description || '',
                    button: {
                        title: actionLabel,
                        onClick: () => {
                            if (typeof actionCallback === 'function') actionCallback();
                        }
                    }
                });
            } catch (err) {
                console.warn('Sileo action error:', err);
                try {
                    return sileo.info({ title, description });
                } catch (e2) {}
            }
        };

        console.log('✨ Sileo Toast (React) erfolgreich geladen & initialisiert');
    } catch (e) {
        console.error('Fehler bei Sileo Initialisierung:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSileo);
} else {
    initSileo();
}

