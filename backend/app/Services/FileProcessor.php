<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Smalot\PdfParser\Parser as PdfParser;
use PhpOffice\PhpWord\IOFactory;
use DOMDocument;

class FileProcessor
{
    // Поддерживаемые форматы
    const SUPPORTED_EXTENSIONS = [
        'html' => 'text/html',
        'htm' => 'text/html',
        'md' => 'text/markdown',
        'txt' => 'text/plain',
        'pdf' => 'application/pdf',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc' => 'application/msword',
        'rtf' => 'application/rtf',
    ];

    // Максимальный размер файла (10MB)
    const MAX_FILE_SIZE = 10485760;

    protected $cloudStorage;

    public function __construct(CloudStorageService $cloudStorage)
    {
        $this->cloudStorage = $cloudStorage;
    }

    /**
     * Проверка файла
     */
    public function validateFile(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $mimeType = $file->getMimeType();
        
        if (!array_key_exists($extension, self::SUPPORTED_EXTENSIONS)) {
            return ['error' => 'Неподдерживаемый формат файла'];
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

            // Извлекаем текст для поиска и HTML для отображения
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
     * Использует правильный диск 'yandex' для облачного хранилища
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
     * Получение содержимого файла из облака
     */
    public function getFileContentFromCloud(string $filePath, string $fileType): string
    {
        try {
            // Проверяем существование файла в облаке
            if (!Storage::disk('yandex')->exists($filePath)) {
                return '<div class="file-error">Файл не найден в облаке</div>';
            }

            switch ($fileType) {
                case 'html':
                case 'htm':
                    $content = Storage::disk('yandex')->get($filePath);
                    return $this->sanitizeHtml($content);
                    
                case 'md':
                    $content = Storage::disk('yandex')->get($filePath);
                    return $this->convertMarkdown($content);
                    
                case 'txt':
                case 'rtf':
                    $content = Storage::disk('yandex')->get($filePath);
                    return nl2br(htmlspecialchars($content));
                    
                case 'pdf':
                    return $this->getPdfHtml($filePath);
                    
                case 'docx':
                case 'doc':
                    return $this->getWordHtml($filePath);
                    
                default:
                    $content = Storage::disk('yandex')->get($filePath);
                    return htmlspecialchars($content);
            }
        } catch (\Exception $e) {
            \Log::error('Ошибка чтения файла из облака', [
                'path' => $filePath,
                'type' => $fileType,
                'error' => $e->getMessage()
            ]);
            
            return '<div class="file-error">
                <p>Ошибка при чтении файла из облака</p>
                <p>' . htmlspecialchars($e->getMessage()) . '</p>
            </div>';
        }
    }

    /**
     * Получение HTML из PDF (с помощью pdf.js или ссылка)
     */
    private function getPdfHtml(string $filePath): string
    {
        $url = Storage::disk('yandex')->url($filePath);
        return '<div class="pdf-viewer-container">
            <div class="pdf-info">
                <p>📄 PDF документ</p>
                <p>Для просмотра PDF используйте встроенный просмотрщик</p>
            </div>
            <iframe 
                src="https://docs.google.com/viewer?url=' . urlencode($url) . '&embedded=true" 
                style="width:100%; height:600px; border:none;"
                frameborder="0"
            ></iframe>
            <div class="download-link-container">
                <a href="' . $url . '" class="download-btn" target="_blank" download>
                    📥 Скачать PDF файл
                </a>
            </div>
        </div>';
    }

    /**
     * Получение HTML из Word документа с сохранением форматирования
     */
    private function getWordHtml(string $filePath): string
    {
        try {
            // Получаем файл из облака
            $fileContent = Storage::disk('yandex')->get($filePath);
            
            // Сохраняем во временный файл
            $tempPath = storage_path('app/temp_' . uniqid() . '.docx');
            file_put_contents($tempPath, $fileContent);
            
            // Загружаем документ
            $phpWord = IOFactory::load($tempPath);
            
            // Создаем HTML из документа
            $html = $this->convertWordToHtml($phpWord);
            
            // Удаляем временный файл
            unlink($tempPath);
            
            return $html;
            
        } catch (\Exception $e) {
            \Log::error('Ошибка конвертации Word в HTML', [
                'path' => $filePath,
                'error' => $e->getMessage()
            ]);
            
            $url = Storage::disk('yandex')->url($filePath);
            return '<div class="file-download">
                <p>Не удалось отобразить содержимое документа</p>
                <p>Пожалуйста, скачайте файл для чтения</p>
                <a href="' . $url . '" class="download-btn" target="_blank" download>
                    📥 Скачать Word документ
                </a>
            </div>';
        }
    }

    /**
     * Конвертация Word документа в HTML с сохранением форматирования
     */
    private function convertWordToHtml($phpWord): string
    {
        $html = '<div class="word-content">';
        
        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                $html .= $this->convertWordElementToHtml($element);
            }
        }
        
        $html .= '</div>';
        
        return $html;
    }

    /**
     * Конвертация элемента Word в HTML
     */
    private function convertWordElementToHtml($element): string
    {
        $html = '';
        
        if (method_exists($element, 'getElements')) {
            foreach ($element->getElements() as $child) {
                $html .= $this->convertWordElementToHtml($child);
            }
        } elseif (method_exists($element, 'getText')) {
            $text = $element->getText();
            $fontStyle = $element->getFontStyle();
            
            if ($fontStyle) {
                if ($fontStyle->isBold()) {
                    $text = '<strong>' . $text . '</strong>';
                }
                if ($fontStyle->isItalic()) {
                    $text = '<em>' . $text . '</em>';
                }
                if ($fontStyle->isUnderline()) {
                    $text = '<u>' . $text . '</u>';
                }
            }
            
            $html .= $text . ' ';
        } elseif ($element instanceof \PhpOffice\PhpWord\Element\Title) {
            $level = $element->getDepth();
            $text = $element->getText();
            $tag = 'h' . min($level + 1, 6);
            $html .= "<{$tag}>" . htmlspecialchars($text) . "</{$tag}>";
        } elseif ($element instanceof \PhpOffice\PhpWord\Element\ListItem) {
            $text = $element->getText();
            $html .= "<li>" . htmlspecialchars($text) . "</li>";
        } elseif ($element instanceof \PhpOffice\PhpWord\Element\Table) {
            $html .= '<table class="word-table" border="1" cellpadding="5" cellspacing="0">';
            $rows = $element->getRows();
            foreach ($rows as $row) {
                $html .= '<tr>';
                $cells = $row->getCells();
                foreach ($cells as $cell) {
                    $html .= '得到';
                    foreach ($cell->getElements() as $cellElement) {
                        $html .= $this->convertWordElementToHtml($cellElement);
                    }
                    $html .= '得到';
                }
                $html .= '</tr>';
            }
            $html .= '</table>';
        }
        
        return $html;
    }

    /**
     * Извлечение текста из файла (для поиска)
     */
    public function extractText(UploadedFile $file, string $filePath): string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        
        switch ($extension) {
            case 'pdf':
                return $this->extractFromPdf($filePath);
                
            case 'docx':
            case 'doc':
                return $this->extractFromDocx($file);
                
            case 'html':
            case 'htm':
                return $this->extractFromHtml($file);
                
            case 'md':
            case 'txt':
            case 'rtf':
                return $this->extractFromText($file);
                
            default:
                return '';
        }
    }

    /**
     * Извлечение форматированного HTML из файла (для отображения)
     */
    public function extractFormattedHtml(UploadedFile $file, string $filePath): string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        
        switch ($extension) {
            case 'html':
            case 'htm':
                $content = file_get_contents($file->getPathname());
                return $this->sanitizeHtml($content);
                
            case 'md':
                $content = file_get_contents($file->getPathname());
                return $this->convertMarkdown($content);
                
            case 'docx':
            case 'doc':
                try {
                    $phpWord = IOFactory::load($file->getPathname());
                    return $this->convertWordToHtml($phpWord);
                } catch (\Exception $e) {
                    \Log::error('Ошибка конвертации Word в HTML при сохранении', [
                        'error' => $e->getMessage()
                    ]);
                    return $this->extractFromDocx($file);
                }
                
            case 'txt':
            case 'rtf':
                $content = file_get_contents($file->getPathname());
                return nl2br(htmlspecialchars($content));
                
            case 'pdf':
                return '<div class="pdf-info">PDF документ, требуется просмотр через встроенный просмотрщик</div>';
                
            default:
                return '';
        }
    }

    /**
     * Извлечение текста из PDF
     */
    private function extractFromPdf(string $filePath): string
    {
        try {
            $parser = new PdfParser();
            $content = Storage::disk('yandex')->get($filePath);

            $tempPath = storage_path('app/temp.pdf');
            file_put_contents($tempPath, $content);

            $pdf = $parser->parseFile($tempPath);

            unlink($tempPath);

            return $pdf->getText();
        } catch (\Exception $e) {
            \Log::error('Ошибка извлечения текста из PDF', ['error' => $e->getMessage()]);
            return '';
        }
    }

    /**
     * Извлечение текста из DOCX/DOC (для поиска)
     */
    private function extractFromDocx(UploadedFile $file): string
    {
        try {
            $phpWord = IOFactory::load($file->getPathname());
            $text = '';
            
            foreach ($phpWord->getSections() as $section) {
                foreach ($section->getElements() as $element) {
                    $text .= $this->extractTextFromWordElement($element);
                }
            }
            
            return strip_tags($text);
        } catch (\Exception $e) {
            \Log::error('Ошибка извлечения текста из DOCX', ['error' => $e->getMessage()]);
            return '';
        }
    }

    /**
     * Рекурсивное извлечение текста из элементов Word
     */
    private function extractTextFromWordElement($element): string
    {
        $text = '';
        
        if (method_exists($element, 'getElements')) {
            foreach ($element->getElements() as $child) {
                $text .= $this->extractTextFromWordElement($child);
            }
        } elseif (method_exists($element, 'getText')) {
            $text .= $element->getText() . ' ';
        } elseif ($element instanceof \PhpOffice\PhpWord\Element\Title) {
            $text .= $element->getText() . ' ';
        } elseif ($element instanceof \PhpOffice\PhpWord\Element\ListItem) {
            $text .= $element->getText() . ' ';
        }
        
        return $text;
    }

    /**
     * Извлечение текста из HTML
     */
    private function extractFromHtml(UploadedFile $file): string
    {
        try {
            $html = file_get_contents($file->getPathname());
            return strip_tags($html);
        } catch (\Exception $e) {
            \Log::error('Ошибка извлечения текста из HTML', ['error' => $e->getMessage()]);
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
     * Очистка HTML
     */
    private function sanitizeHtml(string $html): string
    {
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'), LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        
        // Удаляем скрипты
        $scripts = $dom->getElementsByTagName('script');
        foreach ($scripts as $script) {
            $script->parentNode->removeChild($script);
        }
        
        // Удаляем опасные атрибуты
        $xpath = new \DOMXPath($dom);
        $nodes = $xpath->query('//@*[starts-with(name(), "on")]');
        foreach ($nodes as $node) {
            $node->parentNode->removeAttribute($node->nodeName);
        }

        return $dom->saveHTML();
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