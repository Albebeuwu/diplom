<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

class CloudStorageService
{
    /**
     * Получить публичную ссылку на файл
     */
    public function getPublicUrl(string $path): string
    {
        return Storage::disk('public')->url($path);
    }

    /**
     * Сгенерировать подписанную URL для временного доступа
     */
    public function getTemporaryUrl(string $path, int $minutes = 60): string
    {
        return Storage::disk('public')->temporaryUrl(
            $path, 
            now()->addMinutes($minutes)
        );
    }

    /**
     * Получить метаданные файла
     */
    public function getMetadata(string $path): array
    {
        if (!Storage::disk('public')->exists($path)) {
            return [];
        }

        return [
            'size' => Storage::disk('public')->size($path),
            'last_modified' => Storage::disk('public')->lastModified($path),
            'mime_type' => Storage::disk('public')->mimeType($path),
            'url' => $this->getPublicUrl($path),
        ];
    }

    /**
     * Скопировать файл из локального хранилища в облако
     */
    public function migrateToCloud(string $localPath, string $cloudPath): bool
    {
        if (!Storage::disk('local')->exists($localPath)) {
            return false;
        }

        $content = Storage::disk('local')->get($localPath);
        
        return Storage::disk('public')->put($cloudPath, $content, 'public');
    }

    /**
     * Проверить существование файла в облаке
     */
    public function exists(string $path): bool
    {
        return Storage::disk('public')->exists($path);
    }

    /**
     * Получить размер файла
     */
    public function getSize(string $path): ?int
    {
        if (!$this->exists($path)) {
            return null;
        }
        
        return Storage::disk('public')->size($path);
    }

    /**
     * Получить MIME тип файла
     */
    public function getMimeType(string $path): ?string
    {
        if (!$this->exists($path)) {
            return null;
        }
        
        return Storage::disk('public')->mimeType($path);
    }
}