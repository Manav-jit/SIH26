import React, { useState, useEffect, useCallback } from 'react';

let toastId = 0;
const listeners = new Set();
let toasts = [];

function notify(message, type = 'info') {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    listeners.forEach(fn => fn(toasts));
    setTimeout(() => {
        toasts = toasts.filter(t => t.id !== id);
        listeners.forEach(fn => fn(toasts));
    }, 4000);
}

export const toast = {
    success: (msg) => notify(msg, 'success'),
    error: (msg) => notify(msg, 'error'),
    info: (msg) => notify(msg, 'info'),
};

export default function ToastContainer() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        listeners.add(setItems);
        return () => listeners.delete(setItems);
    }, []);

    if (items.length === 0) return null;

    return (
        <div className="toast-container">
            {items.map(t => (
                <div key={t.id} className={`toast ${t.type}`}>
                    {t.message}
                </div>
            ))}
        </div>
    );
}
