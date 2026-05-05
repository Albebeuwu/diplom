<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Fanfic;

class FanficLike extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'fanfic_id'];

    protected static function boot()
    {
        parent::boot();

        // При создании лайка
        static::created(function ($like) {
            // Обновляем счетчик лайков в таблице fanfics
            $fanfic = Fanfic::find($like->fanfic_id);
            if ($fanfic) {
                // Получаем актуальное количество лайков из таблицы fanfic_likes
                $likesCount = FanficLike::where('fanfic_id', $fanfic->id)->count();
                $fanfic->likes = $likesCount;
                $fanfic->save();
            }
        });

        // При удалении лайка
        static::deleted(function ($like) {
            // Обновляем счетчик лайков в таблице fanfics
            $fanfic = Fanfic::find($like->fanfic_id);
            if ($fanfic) {
                // Получаем актуальное количество лайков из таблицы fanfic_likes
                $likesCount = FanficLike::where('fanfic_id', $fanfic->id)->count();
                $fanfic->likes = $likesCount;
                $fanfic->save();
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function fanfic()
    {
        return $this->belongsTo(Fanfic::class);
    }
}