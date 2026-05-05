<?php

namespace App\Console\Commands;

use App\Models\Fanfic;
use App\Services\CloudStorageService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateFanficsToCloud extends Command
{
    protected $signature = 'fanfics:migrate-to-cloud';
    protected $description = 'Migrate existing fanfic files to Yandex Cloud';

    public function handle(CloudStorageService $cloudService)
    {
        $fanfics = Fanfic::whereNotNull('file_path')->get();
        
        if ($fanfics->isEmpty()) {
            $this->info('Нет файлов для миграции');
            return 0;
        }

        $bar = $this->output->createProgressBar(count($fanfics));
        $bar->start();

        $migrated = 0;
        $failed = 0;

        foreach ($fanfics as $fanfic) {
            try {
                $filePath = $fanfic->file_path;
                
                // Проверяем полный путь к файлу
                $fullPath = storage_path('app/public/' . $filePath);
                
                $this->info("\nИщем файл: " . $fullPath);
                
                if (!file_exists($fullPath)) {
                    $this->error("\n❌ Файл не найден: " . $fullPath);
                    $failed++;
                    $bar->advance();
                    continue;
                }

                // Читаем содержимое файла
                $content = file_get_contents($fullPath);
                
                // Сохраняем в облако
                $uploaded = Storage::disk('yandex')->put($filePath, $content, 'public');

                if ($uploaded) {
                    $this->info("\n✅ Успешно загружен: " . $filePath);
                    
                    // Опционально: удаляем локальный файл после успешной загрузки
                    // unlink($fullPath);
                    
                    $migrated++;
                } else {
                    $this->error("\n❌ Ошибка загрузки в облако: " . $filePath);
                    $failed++;
                }

            } catch (\Exception $e) {
                $this->error("\n❌ Ошибка миграции ID {$fanfic->id}: " . $e->getMessage());
                $failed++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Миграция завершена! Успешно: {$migrated}, Ошибок: {$failed}");
        
        return 0;
    }
}