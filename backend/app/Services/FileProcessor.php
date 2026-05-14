<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use DOMDocument;

class FileProcessor
{
    
    const SUPPORTED_EXTENSIONS = [
        'html' => 'text/html',      
        'htm' => 'text/html',       
        'md' => 'text/markdown',
        'txt' => 'text/plain',
    ];

    // Разрешенные форматы для загрузки (только TXT и MD)
    const ALLOWED_UPLOAD_EXTENSIONS = ['txt', 'md'];

    // Максимальный размер файла (10MB)
    const MAX_FILE_SIZE = 10485760;

    protected $cloudStorage;

    public function __construct(CloudStorageService $cloudStorage)
    {
        $this->cloudStorage = $cloudStorage;
    }

    /**
     * Проверка файла - ТОЛЬКО TXT и MD
     */
    public function validateFile(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $mimeType = $file->getMimeType();
        
        // Проверяем только TXT и MD
        if (!in_array($extension, self::ALLOWED_UPLOAD_EXTENSIONS)) {
            return ['error' => 'Неподдерживаемый формат файла. Разрешены только TXT и MD файлы.'];
        }

        if ($file->getSize() > self::MAX_FILE_SIZE) {
            return ['error' => 'Файл слишком большой. Максимальный размер: 10MB'];
        }

        return [
            'valid' => true,
            'extension' => $extension,
            'mime_type' => $mimeType,
        ];
    }

    /**
     * Сохранение файла в облако
     */
    public function saveFileToCloud(UploadedFile $file, string $folder = 'fanfics'): array
    {
        $validation = $this->validateFile($file);
        if (isset($validation['error'])) {
            return $validation;
        }

        try {
            $originalName = $file->getClientOriginalName();
            
            // Генерируем уникальное имя файла
            $fileName = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $filePath = $folder . '/' . $fileName;

            // Сохраняем файл в облако
            $uploaded = Storage::disk('yandex')->put(
                $filePath,
                file_get_contents($file->getRealPath()),
                'public'
            );

            if (!$uploaded) {
                return ['error' => 'Не удалось сохранить файл'];
            }

            // Извлекаем текст для поиска
            $extractedText = $this->extractText($file, $filePath);
            $formattedHtml = $this->extractFormattedHtml($file, $filePath);
            
            return [
                'success' => true,
                'file_path' => $filePath,
                'file_name' => $fileName,
                'original_name' => $originalName,
                'file_type' => $validation['extension'],
                'file_size' => $file->getSize(),
                'extracted_text' => $extractedText,
                'formatted_html' => $formattedHtml,
            ];
        } catch (\Exception $e) {
            \Log::error('Ошибка сохранения файла в облако', [
                'error' => $e->getMessage(),
                'file' => $file->getClientOriginalName()
            ]);
            return ['error' => 'Ошибка при сохранении файла: ' . $e->getMessage()];
        }
    }

    /**
     * Удаление файла из облака
     */
    public function deleteFileFromCloud(string $filePath): bool
    {
        try {
            // Проверяем существование файла на диске 'yandex'
            if (Storage::disk('yandex')->exists($filePath)) {
                return Storage::disk('yandex')->delete($filePath);
            }
            
            // Если файл не найден на yandex, проверяем public (для обратной совместимости)
            if (Storage::disk('public')->exists($filePath)) {
                return Storage::disk('public')->delete($filePath);
            }
            
            return false;
        } catch (\Exception $e) {
            \Log::error('Ошибка удаления файла из облака', [
                'path' => $filePath,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Получение содержимого файла из облака (только для TXT/MD)
     */
    public function getFileContentFromCloud(string $filePath, string $fileType): string
    {
        try {
            // Проверяем существование файла в облаке
            if (!Storage::disk('yandex')->exists($filePath)) {
                return '<div class="file-error">Файл не найден в облаке</div>';
            }

            $content = Storage::disk('yandex')->get($filePath);

            switch ($fileType) {
                case 'md':
                    return $this->convertMarkdown($content);
                    
                case 'txt':
                    return nl2br(htmlspecialchars($content));
                    
                default:
                    return htmlspecialchars($content);
            }
        } catch (\Exception $e) {
            \Log::error('Ошибка чтения файла из облака', [
                'path' => $filePath,
                'type' => $fileType,
                'error' => $e->getMessage()
            ]);
            
            return '<div class="file-error">
                <p>Ошибка при чтении файла</p>
                <p>' . htmlspecialchars($e->getMessage()) . '</p>
            </div>';
        }
    }

    /**
     * Извлечение текста из файла (только для TXT/MD)
     */
    public function extractText(UploadedFile $file, string $filePath): string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        
        switch ($extension) {
            case 'md':
            case 'txt':
                return $this->extractFromText($file);
                
            default:
                return '';
        }
    }

    /**
     * Извлечение форматированного HTML из файла
     */
    public function extractFormattedHtml(UploadedFile $file, string $filePath): string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        
        switch ($extension) {
            case 'md':
                $content = file_get_contents($file->getPathname());
                return $this->convertMarkdown($content);
                
            case 'txt':
                $content = file_get_contents($file->getPathname());
                return nl2br(htmlspecialchars($content));
                
            default:
                return '';
        }
    }

    /**
     * Извлечение текста из текстовых файлов
     */
    private function extractFromText(UploadedFile $file): string
    {
        try {
            return file_get_contents($file->getPathname());
        } catch (\Exception $e) {
            \Log::error('Ошибка извлечения текста из текстового файла', ['error' => $e->getMessage()]);
            return '';
        }
    }

    /**
     * Конвертация Markdown в HTML
     */
    private function convertMarkdown(string $markdown): string
    {
        try {
            if (class_exists('\Parsedown')) {
                $parsedown = new \Parsedown();
                $parsedown->setSafeMode(true);
                return $parsedown->text($markdown);
            }
            return nl2br(htmlspecialchars($markdown));
        } catch (\Exception $e) {
            return nl2br(htmlspecialchars($markdown));
        }
    }

}