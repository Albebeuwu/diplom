<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected $commands = [
        \App\Console\Commands\MigrateFanficsToCloud::class,
    ];
    
    protected function schedule(Schedule $schedule): void
    {
        $schedule->command('fanfics:publish-expired-early-access')->everyMinute();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');
        

        require base_path('routes/console.php');
    }
}
