<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateSubscriptionsTable extends Migration
{
    public function up()
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('author_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('created_at')->useCurrent();
            
            // Уникальная комбинация, чтобы не было дубликатов
            $table->unique(['user_id', 'author_id']);
            
            // Индексы для быстрого поиска
            $table->index('user_id');
            $table->index('author_id');
        });
    }
    
    public function down()
    {
        Schema::dropIfExists('subscriptions');
    }
}