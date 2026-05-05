<?php

namespace App\Http\Controllers;

use App\Models\Fanfic;
use App\Models\FanficLike;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LikeController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->except(['getLikesCount']);
    }

    // Поставить лайк с сохранением в таблицу
    public function like($id)
    {
        $fanfic = Fanfic::where('status', 'approved')->findOrFail($id);
        $user = Auth::user();
        
        // Проверяем, не лайкнул ли уже пользователь
        $existingLike = FanficLike::where('user_id', $user->id)
            ->where('fanfic_id', $id)
            ->first();
        
        if ($existingLike) {
            // Если лайк уже есть, возвращаем ошибку
            return response()->json([
                'message' => 'Вы уже поставили лайк этому фанфику',
                'likes' => $fanfic->likes,
                'liked' => true
            ], 400); // 400 Bad Request
        }
        
        // Создаем запись о лайке
        FanficLike::create([
            'user_id' => $user->id,
            'fanfic_id' => $id
        ]);
        
        // Обновляем счетчик лайков
        $fanfic->refresh(); // Получаем актуальные данные
        $likesCount = FanficLike::where('fanfic_id', $id)->count();
        $fanfic->likes = $likesCount;
        $fanfic->save();
        
        return response()->json([
            'message' => 'Лайк добавлен',
            'likes' => $fanfic->likes,
            'liked' => true
        ]);
    }

    // Убрать лайк с удалением из таблицы
    public function unlike($id)
    {
        $fanfic = Fanfic::where('status', 'approved')->findOrFail($id);
        $user = Auth::user();
        
        // Удаляем запись о лайке
        $deleted = FanficLike::where('user_id', $user->id)
            ->where('fanfic_id', $id)
            ->delete();
        
        // Обновляем счетчик лайков
        if ($deleted && $fanfic->likes > 0) {
            $fanfic->decrement('likes');
        }
        
        return response()->json([
            'message' => 'Лайк убран',
            'likes' => $fanfic->fresh()->likes,
            'liked' => false
        ]);
    }

    // Получить лайкнутые фанфики пользователя
    public function getLikedFanfics()
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['error' => 'Неавторизован'], 401);
        }
        
        // Получаем ID лайкнутых фанфиков
        $likedFanficIds = FanficLike::where('user_id', $user->id)
            ->pluck('fanfic_id');
        
        // Получаем полную информацию о фанфиках
        $fanfics = Fanfic::with(['user', 'rating', 'tags'])
            ->whereIn('id', $likedFanficIds)
            ->where('status', 'approved')
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($fanfics);
    }

    // Проверить, лайкнул ли пользователь фанфик
    public function checkLike($id)
    {
        $user = Auth::user();
        $liked = FanficLike::where('user_id', $user->id)
            ->where('fanfic_id', $id)
            ->exists();
        
        return response()->json(['liked' => $liked]);
    }

    // Получить количество лайков (публичный метод)
    public function getLikesCount($id)
    {
        $fanfic = Fanfic::find($id);
        
        if (!$fanfic) {
            return response()->json(['error' => 'Фанфик не найден'], 404);
        }
        
        return response()->json([
            'likes' => $fanfic->likes,
            'likers_count' => $fanfic->likers()->count()
        ]);
    }
}