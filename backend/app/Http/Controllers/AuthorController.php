<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Fanfic;

class AuthorController extends Controller
{
    
    public function show($id)
    {
        $user = User::findOrFail($id);
        
        // Получаем количество подписчиков
        $subscribersCount = $user->subscribers()->count();
        
        // Получаем общее количество лайков на всех работах автора
        $totalLikes = Fanfic::where('user_id', $id)
            ->withCount('likedByUsers')
            ->get()
            ->sum('liked_by_users_count');
        
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'avatar_url' => $user->avatar_url,
            'background_url' => $user->background_url,
            'bio' => $user->bio,
            'fanfics_count' => Fanfic::where('user_id', $id)
                ->where('work_status', '!=', 'draft')
                ->count(),
            'subscribers_count' => $subscribersCount,
            'total_likes' => $totalLikes
        ]);
    }

    public function fanfics($id)
    {
        $fanfics = Fanfic::where('user_id', $id)
            ->where('work_status', '!=', 'draft')
            ->get();

        return response()->json($fanfics);
    }

    public function extraContent($id)
    {
        return response()->json([]);
    }
}