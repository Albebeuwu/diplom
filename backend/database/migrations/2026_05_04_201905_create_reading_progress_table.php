<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateReadingProgressTable extends Migration
{
    public function up()
    {
        Schema::create('reading_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('fanfic_id')->constrained()->onDelete('cascade');
            $table->integer('last_position')->default(0);
            $table->integer('progress_percent')->default(0);
            $table->timestamp('last_read_at')->useCurrent();
            $table->unique(['user_id', 'fanfic_id']);
            $table->timestamps();
        });
    }
    
    public function down()
    {
        Schema::dropIfExists('reading_progress');
    }
}