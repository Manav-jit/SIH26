import React, { useRef, useState, useCallback } from 'react';
import { UploadCloud, CheckCircle, X } from 'lucide-react';

export default function UploadZone({ label, description, required, onFileSelect, file }) {
    const inputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState(null);

    const handleFile = useCallback((f) => {
        if (!f) return;
        onFileSelect(f);
        // Generate thumbnail preview
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(f);
    }, [onFileSelect]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        handleFile(f);
    }, [handleFile]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleClear = useCallback((e) => {
        e.stopPropagation();
        onFileSelect(null);
        setPreview(null);
        if (inputRef.current) inputRef.current.value = '';
    }, [onFileSelect]);

    const hasFile = !!file;

    return (
        <div
            className={`upload-zone ${isDragging ? 'active' : ''} ${hasFile ? 'has-file' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files[0])}
                style={{ display: 'none' }}
            />

            {hasFile && preview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                    <img
                        src={preview}
                        alt="Preview"
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '1px solid var(--border-light)'
                        }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--success)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <CheckCircle size={14} />
                            {label}
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: 'var(--text-tertiary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {file.name}
                        </div>
                    </div>
                    <button
                        onClick={handleClear}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-tertiary)',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <div style={{ padding: '8px 0' }}>
                    <UploadCloud
                        size={28}
                        style={{
                            color: isDragging ? 'var(--accent)' : 'var(--text-tertiary)',
                            marginBottom: '8px'
                        }}
                    />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {label} {required && <span style={{ color: 'var(--error)', fontWeight: 400 }}>*</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {description || 'Drag & drop or click to browse'}
                    </div>
                </div>
            )}
        </div>
    );
}
