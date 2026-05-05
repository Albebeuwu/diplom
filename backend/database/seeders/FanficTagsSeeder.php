<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\FanficTag;

class FanficTagsSeeder extends Seeder
{
    public function run()
    {
        $tags = [
            // Жанры
            ['name' => 'Романтика', 'slug' => 'romance', 'category' => 'genre'],
            ['name' => 'Приключения', 'slug' => 'adventure', 'category' => 'genre'],
            ['name' => 'Драма', 'slug' => 'drama', 'category' => 'genre'],
            ['name' => 'Фэнтези', 'slug' => 'fantasy', 'category' => 'genre'],
            ['name' => 'Научная фантастика', 'slug' => 'sci-fi', 'category' => 'genre'],
            ['name' => 'Хоррор', 'slug' => 'horror', 'category' => 'genre'],
            ['name' => 'Мистика', 'slug' => 'mystery', 'category' => 'genre'],
            ['name' => 'Комедия', 'slug' => 'comedy', 'category' => 'genre'],
            ['name' => 'Трагедия', 'slug' => 'tragedy', 'category' => 'genre'],
            ['name' => 'Альтернативная история', 'slug' => 'alternate-history', 'category' => 'genre'],
            
            // Темы
            ['name' => 'Дружба', 'slug' => 'friendship', 'category' => 'theme'],
            ['name' => 'Любовь', 'slug' => 'love', 'category' => 'theme'],
            ['name' => 'Война', 'slug' => 'war', 'category' => 'theme'],
            ['name' => 'Магия', 'slug' => 'magic', 'category' => 'theme'],
            ['name' => 'Технологии', 'slug' => 'technology', 'category' => 'theme'],
            ['name' => 'Космос', 'slug' => 'space', 'category' => 'theme'],
            ['name' => 'Супергерои', 'slug' => 'superheroes', 'category' => 'theme'],
            ['name' => 'Школа/Университет', 'slug' => 'school', 'category' => 'theme'],
            ['name' => 'Работа', 'slug' => 'work', 'category' => 'theme'],
            ['name' => 'Семья', 'slug' => 'family', 'category' => 'theme'],
            
            // Предупреждения о контенте
            ['name' => 'Насилие', 'slug' => 'violence', 'category' => 'content_warning'],
            ['name' => 'Смерть', 'slug' => 'death', 'category' => 'content_warning'],
            ['name' => 'Кровь', 'slug' => 'blood', 'category' => 'content_warning'],
            ['name' => 'Ненормативная лексика', 'slug' => 'profanity', 'category' => 'content_warning'],
            ['name' => 'Откровенные сцены', 'slug' => 'explicit-scenes', 'category' => 'content_warning'],
            ['name' => 'Психологические травмы', 'slug' => 'psychological-trauma', 'category' => 'content_warning'],
            ['name' => 'Токсичные отношения', 'slug' => 'toxic-relationships', 'category' => 'content_warning'],
        ];

        foreach ($tags as $tag) {
            FanficTag::create($tag);
        }
    }
}