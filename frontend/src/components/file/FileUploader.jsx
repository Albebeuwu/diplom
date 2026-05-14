import React, { useState, useRef } from 'react';
import './FileUploader.css';

function FileUploader({ onFileSelect, initialFile = null, error = '' }) {
    const [file, setFile] = useState(initialFile);
    const [preview, setPreview] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);
    
    // Только TXT и MD форматы
    const ACCEPTED_TYPES = {
        'text/plain': '.txt',
        'text/markdown': '.md',
    };

    const formatLabels = {
        'text/plain': 'TXT',
        'text/markdown': 'MD',
    };

    const supportedFormats = {
        'Text': ['.txt'],
        'Markdown': ['.md']
    };

    const maxSize = 10 * 1024 * 1024; // 10MB

    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;

        // Проверка размера
        if (selectedFile.size > maxSize) {
            alert('Файл слишком большой. Максимальный размер: 10MB');
            return;
        }

        // Проверка формата - ТОЛЬКО TXT и MD
        const extension = selectedFile.name.split('.').pop().toLowerCase();
        const isValidFormat = extension === 'txt' || extension === 'md';

        if (!isValidFormat) {
            alert('Неподдерживаемый формат. Разрешенные форматы: TXT, MD');
            return;
        }

        setFile(selectedFile);
        
        // Создаем предпросмотр для текстовых файлов
        if (extension === 'txt' || extension === 'md') {
            const reader = new FileReader();
            reader.onload = (e) => {
                let content = e.target.result;
                // Для Markdown можно добавить предпросмотр в формате HTML
                if (extension === 'md') {
                    setPreview({
                        type: 'markdown',
                        content: content,
                        preview: content.substring(0, 500) + (content.length > 500 ? '...' : '')
                    });
                } else {
                    setPreview({
                        type: 'text',
                        content: content.substring(0, 1000) + (content.length > 1000 ? '...' : '')
                    });
                }
            };
            reader.readAsText(selectedFile);
        }

        // Передаем файл родительскому компоненту
        if (onFileSelect) {
            onFileSelect(selectedFile);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleFileSelect(files[0]);
        }
    };

    const handleClick = () => {
        fileInputRef.current.click();
    };

    const removeFile = () => {
        setFile(null);
        setPreview(null);
        if (onFileSelect) {
            onFileSelect(null);
        }
    };

    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        
        const iconMap = {
            'md': '📝',
            'txt': '📄',
        };
        
        return iconMap[extension] || '📁';
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getSupportedFormatsText = () => {
        return 'TXT (.txt), Markdown (.md)';
    };

    return (
        <div className="file-uploader">
            <div className="uploader-header">
                <h3>Файл с текстом фанфика</h3>
                <p className="uploader-subtitle">
                    Загрузите файл с текстом вашего произведения
                </p>
            </div>

            {error && <div className="uploader-error">{error}</div>}

            <div 
                className={`upload-area ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    accept=".txt,.md"
                    className="hidden-input"
                />
                
                {file ? (
                    <div className="file-preview">
                        <div className="file-info">
                            <span className="file-icon">
                                {getFileIcon(file.name)}
                            </span>
                            <div className="file-details">
                                <h4 className="file-name">{file.name}</h4>
                                <p className="file-size">{formatFileSize(file.size)}</p>
                                <span className="file-type-badge">
                                    {formatLabels[file.type] || file.name.split('.').pop().toUpperCase()}
                                </span>
                            </div>
                        </div>
                        
                        {preview && (preview.type === 'text' || preview.type === 'markdown') && (
                            <div className="text-preview">
                                <h5>Предпросмотр:</h5>
                                <pre className="preview-content">
                                    {preview.type === 'markdown' ? preview.preview : preview.content}
                                </pre>
                                {preview.type === 'markdown' && preview.content.length > 500 && (
                                    <p className="preview-note">... (отображена первая часть текста)</p>
                                )}
                            </div>
                        )}

                        <div className="file-actions">
                            <button 
                                type="button" 
                                className="change-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClick();
                                }}
                            >
                                Заменить файл
                            </button>
                            <button 
                                type="button" 
                                className="remove-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile();
                                }}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="upload-placeholder">
                        <div className="upload-icon">📁</div>
                        <div className="upload-text">
                            <p className="drag-text">
                                Перетащите файл сюда или нажмите для выбора
                            </p>
                            <p className="formats-text">
                                Поддерживаемые форматы: {getSupportedFormatsText()}
                            </p>
                            <p className="size-text">
                                Максимальный размер: 10MB
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="uploader-help">
                <h4>Рекомендации по форматам:</h4>
                <ul className="help-list">
                    <li>
                        <strong>Markdown (.md)</strong> — рекомендуется для текстов с базовым форматированием (заголовки, списки, ссылки)
                    </li>
                    <li>
                        <strong>Текстовые файлы (.txt)</strong> — простой текст без форматирования
                    </li>
                </ul>
                
                <div className="format-tips">
                    <p><strong>💡 Совет:</strong> Для лучшего отображения используйте Markdown</p>
                    <p>📝 Markdown поддерживает: заголовки, списки, ссылки, изображения и базовое форматирование</p>
                    <p>📄 TXT файлы отображаются как обычный текст</p>
                </div>
            </div>
        </div>
    );
}

export default FileUploader;