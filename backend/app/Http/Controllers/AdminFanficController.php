<?php

namespace App\Http\Controllers;

use App\Models\Fanfic;
use App\Models\FanficTag;  
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str; 

class AdminFanficController extends Controller
{
    public function index(Request $request)
    {
        $query = Fanfic::with(['user', 'rating', 'tags']);
        
        // Поиск по названию/автору/фэндому
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                ->orWhere('fandom', 'like', "%{$search}%")
                ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }
        
        // Фильтр по статусу
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        // Фильтр по рейтингу
        if ($request->filled('rating_id')) {
            $query->where('rating_id', $request->rating_id);
        }
        
        // Фильтр по тегам
        if ($request->has('tags') && is_array($request->tags)) {
            $query->whereHas('tags', function($q) use ($request) {
                $q->whereIn('id', $request->tags);
            });
        }
        
        // Сортировка
        $sort = $request->input('sort', 'created_at');
        $order = $request->input('order', 'desc');
        $allowedSorts = ['created_at', 'updated_at', 'title', 'views', 'likes', 'published_at'];
        
        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $order);
        }
        
        // Пагинация
        $perPage = (int) $request->input('per_page', 20);
        
        return response()->json($query->paginate($perPage));
    }

    public function destroy($id)
    {
        $fanfic = Fanfic::findOrFail($id);
        
        // Удаляем обложку
        if ($fanfic->cover_image) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($fanfic->cover_image);
        }
        
        // Удаляем файл контента
        if ($fanfic->file_path) {
            try {
                $fileProcessor = app(\App\Services\FileProcessor::class);
                $fileProcessor->deleteFileFromCloud($fanfic->file_path);
            } catch (\Exception $e) {
                \Log::warning("Не удалось удалить файл фанфика {$id}: " . $e->getMessage());
            }
        }
        
        $fanfic->delete();
        
        return response()->json(['message' => 'Фанфик успешно удалён']);
    }

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

    // Получить все теги 
    public function getTags(Request $request)
    {
        $query = FanficTag::orderBy('name', 'asc');
        
        // Поиск по названию
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }
        
        // Фильтр по категории
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        
        // Добавляем подсчёт использования тегов
        $tags = $query->withCount('fanfics')->paginate(
            $request->input('per_page', 20)
        );
        
        return response()->json($tags);
    }

    // Создать новый тег
    public function createTag(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:fanfic_tags,name',
            'slug' => 'nullable|string|max:100|unique:fanfic_tags,slug',
            'category' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500'
        ]);
        
        $tag = FanficTag::create([
            'name' => $request->name,
            'slug' => $request->slug ?? Str::slug($request->name),
            'category' => $request->category,
            'description' => $request->description
        ]);
        
        return response()->json(['message' => 'Тег создан', 'tag' => $tag], 201);
    }

    // Обновить тег
    public function updateTag(Request $request, $id)
    {
        $tag = FanficTag::findOrFail($id);
        
        $request->validate([
            'name' => 'required|string|max:100|unique:fanfic_tags,name,' . $id,
            'slug' => 'nullable|string|max:100|unique:fanfic_tags,slug,' . $id,
            'category' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500'
        ]);
        
        $tag->update([
            'name' => $request->name,
            'slug' => $request->slug ?? Str::slug($request->name),
            'category' => $request->category,
            'description' => $request->description
        ]);
        
        return response()->json(['message' => 'Тег обновлён', 'tag' => $tag]);
    }

    // Удалить тег (только если не используется)
    public function deleteTag($id)
    {
        $tag = FanficTag::findOrFail($id);
        
        if ($tag->fanfics()->count() > 0) {
            return response()->json([
                'error' => 'Нельзя удалить тег, который используется в фанфиках'
            ], 400);
        }
        
        $tag->delete();
        return response()->json(['message' => 'Тег удалён']);
    }
}