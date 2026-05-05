<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SubscriptionController extends Controller
{
    /**
     * Подписаться на автора
     */
    public function subscribe($authorId)
    {
        $user = Auth::user();
        $author = User::findOrFail($authorId);
        
        // Нельзя подписаться на себя
        if ($user->id == $authorId) {
            return response()->json([
                'error' => 'Нельзя подписаться на самого себя'
            ], 400);
        }
        
        // Проверяем, не подписан ли уже
        $exists = Subscription::where('user_id', $user->id)
            ->where('author_id', $authorId)
            ->exists();
            
        if ($exists) {
            return response()->json([
                'error' => 'Вы уже подписаны на этого автора'
            ], 400);
        }
        
        // Создаем подписку
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'author_id' => $authorId,
            'created_at' => now()
        ]);
        
        return response()->json([
            'message' => 'Вы успешно подписались на автора',
            'subscription' => $subscription
        ], 201);
    }
    
    /**
     * Отписаться от автора
     */
    public function unsubscribe($authorId)
    {
        $user = Auth::user();
        
        $deleted = Subscription::where('user_id', $user->id)
            ->where('author_id', $authorId)
            ->delete();
            
        if ($deleted) {
            return response()->json([
                'message' => 'Вы отписались от автора'
            ]);
        }
        
        return response()->json([
            'error' => 'Вы не были подписаны на этого автора'
        ], 404);
    }
    
    /**
     * Проверить, подписан ли пользователь на автора
     */
    public function checkSubscription($authorId)
    {
        $user = Auth::user();
        
        $isSubscribed = Subscription::where('user_id', $user->id)
            ->where('author_id', $authorId)
            ->exists();
            
        return response()->json([
            'isSubscribed' => $isSubscribed
        ]);
    }
    
    /**
     * Получить список подписок текущего пользователя
     */
    public function getSubscriptions()
    {
        $user = Auth::user();
        
        $subscriptions = Subscription::where('user_id', $user->id)
            ->with('author')
            ->latest()
            ->get();
            
        // Форматируем ответ с данными авторов
        $formattedSubscriptions = $subscriptions->map(function($subscription) {
            $author = $subscription->author;
            return [
                'id' => $author->id,
                'name' => $author->name,
                'avatar_url' => $author->avatar_url,
                'bio' => $author->bio,
                'fanfics_count' => $author->fanfics()->count(),
                'total_likes' => $author->fanfics()->withCount('likedByUsers')->get()->sum('liked_by_users_count')
            ];
        });
        
        return response()->json($formattedSubscriptions);
    }
}