<?php

namespace App\Http\Controllers;

use App\Models\Fanfic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminFanficController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('admin'); 
    }

    // Получить все фанфики на модерации
    public function pendingFanfics(Request $request)
    {
        $query = Fanfic::with(['user', 'rating', 'tags'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc'); // Сначала новые

        if ($request->has('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        $fanfics = $query->paginate(20);

        return response()->json($fanfics);
    }

    // Одобрить фанфик
    public function approve($id)
    {
        $fanfic = Fanfic::findOrFail($id);
        
        $fanfic->update([
            'status' => 'approved',
            'published_at' => $fanfic->published_at ?? now(),
        ]);

        // Здесь можно добавить отправку уведомления пользователю

        return response()->json([
            'message' => 'Фанфик одобрен и опубликован',
            'fanfic' => $fanfic,
        ]);
    }

    // Отклонить фанфик
    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $fanfic = Fanfic::findOrFail($id);
        
        $fanfic->update([
            'status' => 'rejected',
            'rejection_reason' => $request->reason,
        ]);

        // Здесь можно добавить отправку уведомления пользователю

        return response()->json([
            'message' => 'Фанфик отклонен',
            'fanfic' => $fanfic,
        ]);
    }

    // Получить статистику по фанфикам
    public function fanficStats()
    {
        $stats = [
            'total' => Fanfic::count(),
            'published' => Fanfic::where('status', 'published')->count(),
            'pending' => Fanfic::where('status', 'pending')->count(),
            'draft' => Fanfic::where('status', 'draft')->count(),
            'rejected' => Fanfic::where('status', 'rejected')->count(),
            'today_published' => Fanfic::where('status', 'published')
                ->whereDate('published_at', today())
                ->count(),
            'total_words' => Fanfic::where('status', 'published')->sum('words_count'),
            'total_likes' => Fanfic::where('status', 'published')->sum('likes'),
            'total_views' => Fanfic::where('status', 'published')->sum('views'),
        ];

        return response()->json($stats);
    }
}