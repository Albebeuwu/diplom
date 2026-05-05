<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('fanfics', function (Blueprint $table) {
            // Убираем поле content, теперь текст в файле
            $table->dropColumn('content');
            
            // Добавляем поля для файла
            $table->string('file_path')->nullable()->after('description');
            $table->string('file_name')->nullable()->after('file_path');
            $table->string('file_type')->nullable()->after('file_name'); // html, md, docx
            $table->integer('file_size')->nullable()->after('file_type');
            $table->string('original_file_name')->nullable()->after('file_size');
            
            // Добавляем поле для извлеченного текста (для поиска)
            $table->text('extracted_text')->nullable()->after('file_size');
        });
    }

    public function down()
    {
        Schema::table('fanfics', function (Blueprint $table) {
            // Восстанавливаем поле content
            $table->longText('content')->nullable();
            
            // Убираем файловые поля
            $table->dropColumn([
                'file_path',
                'file_name', 
                'file_type',
                'file_size',
                'original_file_name',
                'extracted_text'
            ]);
        });
    }
};