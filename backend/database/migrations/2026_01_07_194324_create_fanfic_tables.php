<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. Таблица рейтингов
        if (!Schema::hasTable('fanfic_ratings')) {
            Schema::create('fanfic_ratings', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('name');
                $table->text('description');
                $table->integer('min_age')->nullable();
                $table->string('color')->default('#000000');
                $table->timestamps();
            });
        }

        // 2. Таблица тегов
        if (!Schema::hasTable('fanfic_tags')) {
            Schema::create('fanfic_tags', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('slug')->unique();
                $table->string('category')->nullable();
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }

        // 3. Основная таблица фанфиков
        if (!Schema::hasTable('fanfics')) {
            Schema::create('fanfics', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->longText('content')->nullable();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('rating_id')->constrained('fanfic_ratings');
                $table->string('status')->default('draft');
                $table->string('work_status')->default('in_progress');
                $table->string('fandom')->nullable();
                $table->string('language')->default('ru');
                $table->integer('words_count')->default(0);
                $table->integer('chapters_count')->default(1);
                $table->integer('views')->default(0);
                $table->integer('likes')->default(0);
                $table->integer('comments_count')->default(0);
                $table->text('cover_image')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->softDeletes();
                $table->timestamps();
                
                $table->index('status');
                $table->index('user_id');
                $table->index(['status', 'published_at']);
                
            });
        }

        // 4. Связующая таблица (последней!)
        if (!Schema::hasTable('fanfic_tag')) {
            Schema::create('fanfic_tag', function (Blueprint $table) {
                $table->id();
                $table->foreignId('fanfic_id')->constrained()->onDelete('cascade');
                $table->foreignId('fanfic_tag_id')->constrained()->onDelete('cascade');
                $table->timestamps();
                
                $table->unique(['fanfic_id', 'fanfic_tag_id']);
            });
        }
    }

    public function down()
    {
        // Удаляем в обратном порядке
        Schema::dropIfExists('fanfic_tag');
        Schema::dropIfExists('fanfics');
        Schema::dropIfExists('fanfic_tags');
        Schema::dropIfExists('fanfic_ratings');
    }
};