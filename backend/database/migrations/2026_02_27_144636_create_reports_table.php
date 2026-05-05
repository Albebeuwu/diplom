<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('fanfic_id')->constrained()->onDelete('cascade');
            $table->foreignId('report_status_id')->default(1)->constrained();
            $table->text('reason');
            $table->text('admin_comment')->nullable(); // Комментарий админа при отклонении
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('reports');
    }
};