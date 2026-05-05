<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('report_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // pending, approved, rejected
            $table->string('label'); // На рассмотрении, Принята, Отклонена
            $table->string('color')->nullable(); // цвет для отображения
            $table->timestamps();
        });

        // Заполняем начальными статусами
        DB::table('report_statuses')->insert([
            ['name' => 'pending', 'label' => 'На рассмотрении', 'color' => '#f59e0b', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'approved', 'label' => 'Принята', 'color' => '#10b981', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'rejected', 'label' => 'Отклонена', 'color' => '#ef4444', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down()
    {
        Schema::dropIfExists('report_statuses');
    }
};