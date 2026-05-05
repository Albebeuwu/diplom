<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Добавляем поле для пути к фоновому изображению
            $table->string('background_image')->nullable()->after('bio');
            
            // Добавляем поле для прозрачности фона (0.1-1.0)
            $table->decimal('background_opacity', 2, 1)
                  ->default(0.7)
                  ->after('background_image')
                  ->comment('Прозрачность фона от 0.1 до 1.0');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['background_image', 'background_opacity']);
        });
    }
};  