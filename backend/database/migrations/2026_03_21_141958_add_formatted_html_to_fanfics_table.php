<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('fanfics', function (Blueprint $table) {
            // Добавляем новое поле
            $table->longText('formatted_html')->nullable()->after('extracted_text');
        });
    }

    public function down()
    {
        Schema::table('fanfics', function (Blueprint $table) {
            $table->dropColumn('formatted_html');
        });
    }
};