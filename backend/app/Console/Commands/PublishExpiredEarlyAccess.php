<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Fanfic;

class PublishExpiredEarlyAccess extends Command
{
    protected $signature = 'fanfics:publish-expired-early-access';
    protected $description = 'Публикует фанфики с истекшим ранним доступом';

    public function handle()
    {
        // Находим все фанфики с истекшим ранним доступом
        $fanfics = Fanfic::where('is_early_access', true)
            ->where('status', 'approved')
            ->where('early_access_until', '<', now())
            ->get();

        foreach ($fanfics as $fanfic) {
            // Отключаем ранний доступ
            $fanfic->is_early_access = false;
            $fanfic->early_access_until = null;
            
            // Устанавливаем дату публикации если её нет
            if (!$fanfic->published_at) {
                $fanfic->published_at = now();
            }
            
            $fanfic->save();
            
            $this->info("Опубликован фанфик #{$fanfic->id}: {$fanfic->title}");
        }
    }
}