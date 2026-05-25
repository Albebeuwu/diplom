<?php

namespace App\Http\Controllers;

use App\Models\Fanfic;
use App\Models\FanficRating;
use App\Models\FanficTag;
use App\Models\FanficLike;
use App\Models\ReadingProgress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Services\FileProcessor;


class FanficController extends Controller
{
    private function splitContentIntoChapters($content, $fileType)
    {
        // 🔥 Маркер должен точно совпадать с тем, что используется в update():
        // "\n\n--- НОВАЯ ЧАСТЬ ---\n\n"
        $chapters = preg_split('/\n\s*---\s*НОВАЯ ЧАСТЬ\s*---\s*\n/i', $content);
        
        // Убираем пустые элементы и триммим
        $chapters = array_values(array_filter(array_map('trim', $chapters)));
        
        // Если ничего не разбилось — возвращаем как одну главу
        if (empty($chapters)) {
            $chapters = [$content];
        }
        
        // Форматируем каждую главу
        $formattedChapters = [];
        foreach ($chapters as $index => $chapter) {
            if ($fileType === 'md') {
                $parsedown = new \Parsedown();
                $chapter = $parsedown->text($chapter);
            } else {
                $chapter = nl2br(htmlspecialchars($chapter));
            }
            $formattedChapters[] = [
                'index' => $index + 1,
                'content' => $chapter,
                'word_count' => str_word_count(strip_tags($chapter))
            ];
        }
        
        return $formattedChapters;
    }

    private function applyEarlyAccessFilter($query)
    {
        $user = Auth::user();
        $hasHypeAccess = $user && $user->hasHypeOrHigherSubscription();
        
        if (!$hasHypeAccess) {
            // Если у пользователя нет подписки Hype+, исключаем фанфики с ранним доступом
            $query->where(function($q) {
                $q->where('is_early_access', false)
                  ->orWhere('early_access_until', '<', now());
            });
        }
        // Если есть подписка Hype+, показываем все фанфики (включая ранний доступ)
        
        return $query;
    }

    // Получить все рейтинги
    public function getRatings()
    {
        $ratings = FanficRating::all();
        return response()->json($ratings);
    }

    // Получить все теги
    public function getTags()
    {
        $tags = FanficTag::all();
        return response()->json($tags);
    }

    public function getContent($id)
    {
        $fanfic = Fanfic::with(['user', 'rating', 'tags'])->find($id);
        
        if (!$fanfic) {
            return response()->json(['error' => 'Фанфик не найден'], 404);
        }

        // Получаем текущего пользователя
        $user = Auth::user();
        
        if ($fanfic->status !== 'approved' && 
            $fanfic->user_id !== $user->id && 
            $user->role !== 'admin') {
            return response()->json(['error' => 'Доступ запрещен'], 403);
        }

        // Для автора или админа используем extracted_text
        if ($fanfic->extracted_text) {
            $content = $fanfic->extracted_text;
            
            // Форматируем в зависимости от типа файла
            if ($fanfic->file_type === 'md') {
                $parsedown = new \Parsedown();
                $content = $parsedown->text($content);
            } else {
                $content = nl2br(htmlspecialchars($content));
            }
            
            return response()->json([
                'content' => $content,
                'file_type' => $fanfic->file_type,
                'file_url' => $fanfic->file_url,
                'requires_download' => false
            ]);
        }

        // Если нет extracted_text, пробуем получить из файла
        if ($fanfic->file_path) {
            try {
                $fileProcessor = app(\App\Services\FileProcessor::class);
                $content = $fileProcessor->getFileContentFromCloud($fanfic->file_path, $fanfic->file_type);
                
                return response()->json([
                    'content' => $content,
                    'file_type' => $fanfic->file_type,
                    'file_url' => $fanfic->file_url,
                    'requires_download' => in_array($fanfic->file_type, ['pdf', 'docx', 'doc'])
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'error' => 'Ошибка чтения файла',
                    'message' => $e->getMessage()
                ], 500);
            }
        }

        return response()->json([
            'content' => '<p>Контент не найден</p>',
            'file_type' => null,
            'file_url' => null
        ]);
    }

    // Создать новый фанфик
    public function store(Request $request)
    {
        
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:2000',
            'content_file' => 'required|file|max:10240',
            'rating_id' => 'required|exists:fanfic_ratings,id',
            'fandom' => 'nullable|string|max:100',
            'work_status' => 'required|in:in_progress,completed,abandoned',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:fanfic_tags,id',
            'cover_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'status' => 'nullable|in:draft,pending',
            'is_early_access' => 'boolean',
            'days_early_access' => 'nullable|integer|min:1|max:30',
            'is_exclusive' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Обработка файла с текстом
            $fileProcessor = app(\App\Services\FileProcessor::class);
            $fileResult = $fileProcessor->saveFileToCloud($request->file('content_file'));
            
            if (isset($fileResult['error'])) {
                return response()->json(['errors' => ['content_file' => [$fileResult['error']]]], 422);
            }

            // Подсчет слов из извлеченного текста
            $wordsCount = str_word_count(strip_tags($fileResult['extracted_text']));

            // Обработка обложки
            $coverImagePath = null;
            if ($request->hasFile('cover_image')) {
                $coverImagePath = $request->file('cover_image')->store('covers', 'public');
            }

            // Определяем статус
            $status = $request->status ?: 'draft';
            
            // Обработка раннего доступа (только для авторов с подпиской Hype+)
            $isEarlyAccess = false;
            $earlyAccessUntil = null;
            
            if ($request->is_early_access && auth()->user()->hasHypeOrHigherSubscription()) {
                $isEarlyAccess = true;
                $daysEarlyAccess = $request->days_early_access ?? 7;
                $earlyAccessUntil = now()->addDays($daysEarlyAccess);
            }
            
            $isExclusive = $request->is_exclusive ?? false;

            // Создание фанфика
            $fanfic = Fanfic::create([
                'title' => $request->title,
                'description' => $request->description,
                'file_path' => $fileResult['file_path'],
                'file_name' => $fileResult['file_name'],
                'original_file_name' => $fileResult['original_name'],
                'file_type' => $fileResult['file_type'],
                'file_size' => $fileResult['file_size'],
                'extracted_text' => $fileResult['extracted_text'],
                'user_id' => Auth::id(),
                'rating_id' => $request->rating_id,
                'fandom' => $request->fandom,
                'work_status' => $request->work_status,
                'words_count' => $wordsCount,
                'cover_image' => $coverImagePath,
                'status' => $status,
                'is_early_access' => $isEarlyAccess,
                'early_access_until' => $earlyAccessUntil,
                'is_exclusive' => $isExclusive,
            ]);

            // Прикрепление тегов
            if ($request->has('tags')) {
                $fanfic->tags()->attach($request->tags);
            }

            return response()->json([
                'message' => $status === 'pending' 
                    ? 'Фанфик отправлен на модерацию!' 
                    : 'Фанфик успешно создан!',
                'fanfic' => $fanfic->load('rating', 'tags'),
                'id' => $fanfic->id,
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Error creating fanfic: ' . $e->getMessage());
            return response()->json([
                'error' => 'Ошибка при сохранении файла: ' . $e->getMessage()
            ], 500);
        }
    }
    

    // Метод для получения дополнительного контента автора
    public function getExtraContent($authorId)
    {
        $user = Auth::user();
        $hasAccess = $user && $user->hasHypeOrHigherSubscription();
        
        $extraContent = [];
        
        // Фанфики с ранним доступом
        $earlyAccessFanfics = Fanfic::where('user_id', $authorId)
            ->where('is_early_access', true)
            ->where('early_access_until', '>', now())
            ->where('status', 'approved')
            ->get();
        
        foreach ($earlyAccessFanfics as $fanfic) {
            $extraContent[] = [
                'id' => $fanfic->id,
                'type' => 'early_access',
                'title' => $fanfic->title,
                'description' => $fanfic->description,
                'content' => $hasAccess ? $fanfic->extracted_text : null,
                'available_from' => $fanfic->early_access_until,
                'created_at' => $fanfic->created_at,
            ];
        }
        
        // Эксклюзивные фанфики
        if ($hasAccess) {
            $exclusiveFanfics = Fanfic::where('user_id', $authorId)
                ->where('is_exclusive', true)
                ->where('status', 'approved')
                ->get();
            
            foreach ($exclusiveFanfics as $fanfic) {
                $extraContent[] = [
                    'id' => $fanfic->id,
                    'type' => 'exclusive',
                    'title' => $fanfic->title,
                    'description' => $fanfic->description,
                    'content' => $fanfic->extracted_text,
                    'created_at' => $fanfic->created_at,
                ];
            }
        }
        
        return response()->json($extraContent);
    }

    // Отправить на модерацию
    public function submitForReview($id)
    {
        $fanfic = Fanfic::where('user_id', Auth::id())
            ->whereIn('status', ['draft', 'rejected']) // Можно отправлять как черновики, так и отклоненные
            ->findOrFail($id);

        $fanfic->update(['status' => 'pending']);

        return response()->json([
            'message' => 'Фанфик отправлен на модерацию',
            'fanfic' => $fanfic,
        ]);
    }

    // Получить мои фанфики
    public function myFanfics(Request $request)
    {
        $status = $request->query('status');
        $perPage = (int) $request->query('per_page', 6);
        
        $query = Fanfic::with(['rating', 'tags'])
            ->where('user_id', Auth::id())
            ->orderBy('created_at', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        $fanfics = $query->paginate($perPage);

        return response()->json($fanfics);
    }

    public function show($id)
    {
        $fanfic = Fanfic::with(['user', 'rating', 'tags'])->find($id);
        
        if (!$fanfic) {
            return response()->json(['error' => 'Фанфик не найден'], 404);
        }

        $user = Auth::user();

        // Увеличиваем счетчик просмотров для опубликованных работ
        if ($fanfic->status === 'approved') {
            $fanfic->increment('views');
        }

        // Для неопубликованных работ проверяем автора ИЛИ админа
        if ($fanfic->status !== 'approved') {
            if (!$user || ($fanfic->user_id !== $user->id && $user->role !== 'admin')) {
                return response()->json(['error' => 'Доступ запрещен'], 403);
            }
        }

        return response()->json($fanfic);
    }

    // Обновить фанфик
    public function update(Request $request, $id)
    {
        $fanfic = Fanfic::findOrFail($id);

        // Проверка владельца
        if ($fanfic->user_id !== auth()->id()) {
            return response()->json(['error' => 'Нет доступа'], 403);
        }

        // Валидация
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'rating_id' => 'required|exists:fanfic_ratings,id',
            'fandom' => 'nullable|string|max:100',
            'work_status' => 'required|string',
            'content_file' => 'nullable|file|mimes:txt,doc,docx,pdf,md,rtf,html,htm',
            'cover_image' => 'nullable|image|max:2048',
            'tags' => 'array',
            'append_to_content' => 'nullable|in:0,1,true,false',
            'remove_cover' => 'nullable|in:true,false',
        ]);

        // Обновление основных полей
        $fanfic->update([
            'title' => $validated['title'],
            'description' => $validated['description'],
            'rating_id' => $validated['rating_id'],
            'fandom' => $validated['fandom'] ?? null,
            'work_status' => $validated['work_status'],
        ]);

        // Сохраняем старый текст ДО обработки файла
        $oldExtractedText = $fanfic->extracted_text;
        $oldFilePath = $fanfic->file_path;
        
        // -------------------------
        // 📄 ОБРАБОТКА ФАЙЛА
        // -------------------------
        $fileChanged = false;
        
        if ($request->hasFile('content_file')) {
            $fileProcessor = app(\App\Services\FileProcessor::class);
            $newFile = $request->file('content_file');
            
            $newResult = $fileProcessor->saveFileToCloud($newFile);
            
            if (isset($newResult['error'])) {
                return response()->json([
                    'error' => $newResult['error']
                ], 500);
            }
            
            
            // Определяем, нужно ли добавлять текст или заменять
            $append = filter_var($request->input('append_to_content', false), FILTER_VALIDATE_BOOLEAN);
            
            
            if ($append && $oldExtractedText) {
                // Добавляем новый текст к существующему
                $finalText = $oldExtractedText . "\n\n--- НОВАЯ ЧАСТЬ ---\n\n" . $newResult['extracted_text'];
                
                // Обновляем extracted_text с объединенным текстом
                $fanfic->extracted_text = $finalText;
                $fanfic->words_count = str_word_count(strip_tags($finalText));
                
                // Обновляем информацию о файле на новый
                $fanfic->file_path = $newResult['file_path'];
                $fanfic->file_name = $newResult['file_name'];
                $fanfic->original_file_name = $newResult['original_name'];
                $fanfic->file_type = $newResult['file_type'];
                $fanfic->file_size = $newResult['file_size'];
                
                $fileChanged = true;
            } else {
                // Заменяем текст полностью
                $finalText = $newResult['extracted_text'];
                
                // Обновляем все данные фанфика
                $fanfic->file_path = $newResult['file_path'];
                $fanfic->file_name = $newResult['file_name'];
                $fanfic->original_file_name = $newResult['original_name'];
                $fanfic->file_type = $newResult['file_type'];
                $fanfic->file_size = $newResult['file_size'];
                $fanfic->extracted_text = $finalText;
                $fanfic->words_count = str_word_count(strip_tags($finalText));
                
                $fileChanged = true;
                
                // Удаляем старый файл только если это была полная замена
                if ($oldFilePath) {
                    try {
                        $fileProcessor->deleteFileFromCloud($oldFilePath);
                    } catch (\Exception $e) {
                    }
                }
            }
        }
        
        // -------------------------
        // ОБЛОЖКА
        // -------------------------
        if ($request->hasFile('cover_image')) {
            if ($fanfic->cover_image) {
                Storage::disk('public')->delete($fanfic->cover_image);
            }
            
            $coverPath = $request->file('cover_image')->store('covers', 'public');
            $fanfic->cover_image = $coverPath;
        }
        
        if ($request->input('remove_cover') === 'true') {
            if ($fanfic->cover_image) {
                Storage::disk('public')->delete($fanfic->cover_image);
            }
            $fanfic->cover_image = null;
        }
        
        // Сохраняем изменения
        $fanfic->save();
        
        // -------------------------
        // 🏷 ТЕГИ
        // -------------------------
        if ($request->has('tags')) {
            $fanfic->tags()->sync($request->tags);
        }
        
        // -------------------------
        // 🔄 ПОВТОРНАЯ МОДЕРАЦИЯ
        // -------------------------
        $wasPublished = in_array($fanfic->getOriginal('status'), ['approved', 'published']);
        
        if ($wasPublished && $fileChanged) {
            $fanfic->previously_approved = true;
            $fanfic->status = 'pending';
            $fanfic->published_at = null;
            $fanfic->save();
            
            $message = $request->hasFile('content_file') && $request->input('append_to_content') 
                ? 'Новая часть добавлена к фанфику. Фанфик отправлен на повторную модерацию. После одобрения изменения станут доступны читателям.'
                : 'Фанфик обновлен и отправлен на повторную модерацию. После одобрения изменения станут доступны читателям.';
            
            return response()->json([
                'message' => $message,
                'fanfic' => $fanfic,
                'requires_moderation' => true
            ]);
        }
        
        $message = '';
        if ($request->hasFile('content_file') && $request->input('append_to_content')) {
            $message = 'Новая часть добавлена к фанфику. Вы можете отправить обновленный фанфик на модерацию.';
        } elseif ($request->hasFile('content_file')) {
            $message = 'Файл фанфика заменен. Вы можете отправить обновленный фанфик на модерацию.';
        } else {
            $message = 'Фанфик обновлен успешно.';
        }
        
        return response()->json([
            'message' => $message,
            'fanfic' => $fanfic,
            'requires_moderation' => false
        ]);
    }

    // Удалить фанфик
    public function destroy($id)
    {
        $fanfic = Fanfic::findOrFail($id);
        $user = Auth::user();
        
        // Проверка прав: автор или админ
        $isOwner = $fanfic->user_id === $user->id;
        $isAdmin = $user->role === 'admin';
        
        if (!$isOwner && !$isAdmin) {
            return response()->json(['error' => 'Нет прав для удаления'], 403);
        }
        
        // Удаляем обложку
        if ($fanfic->cover_image) {
            Storage::disk('public')->delete($fanfic->cover_image);
        }
        
        // Удаляем файл контента
        if ($fanfic->file_path) {
            try {
                $fileProcessor = app(\App\Services\FileProcessor::class);
                $fileProcessor->deleteFileFromCloud($fanfic->file_path);
            } catch (\Exception $e) {
                \Log::warning("Не удалось удалить файл: " . $e->getMessage());
            }
        }
        
        $fanfic->delete();
        
        return response()->json(['message' => 'Фанфик удалён']);
    }


    // Получить опубликованные фанфики для главной страницы
    public function index(Request $request)
    {
        $query = Fanfic::with(['user', 'rating', 'tags'])
            ->where('status', 'approved')
            ->whereNotNull('published_at');
        
        // ПРИМЕНЯЕМ ФИЛЬТР РАННЕГО ДОСТУПА
        $query = $this->applyEarlyAccessFilter($query);

        // Поиск
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($sub) use ($q) {
                $sub->where('title', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%")
                    ->orWhere('fandom', 'like', "%{$q}%")
                    ->orWhereHas('user', fn ($u) =>
                        $u->where('name', 'like', "%{$q}%")
                    );
            });
        }

        // Фильтр по рейтингу
        if ($request->filled('rating')) {
            $query->where('rating_id', $request->rating);
        }

        // Фильтр по статусу работы
        if ($request->filled('status')) {
            $query->where('work_status', $request->status);
        }

        // Фильтр по тегам
        if ($request->has('tags')) {
            $tags = $request->input('tags');
            $query->whereHas('tags', function ($q) use ($tags) {
                $q->whereIn('fanfic_tags.id', $tags);
            });
        }

        // Сортировка
        $sort = $request->input('sort', 'published_at');
        $order = $request->input('order', 'desc');

        $allowedSorts = ['published_at', 'created_at', 'title', 'likes', 'views'];

        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $order === 'asc' ? 'asc' : 'desc');
        }

        // Пагинация
        $perPage = (int) $request->input('per_page', 16);

        return response()->json(
            $query->paginate($perPage)
        );
    }

    // Получить популярные фанфики
    public function popular(Request $request)
    {
        $query = Fanfic::with(['user', 'rating', 'tags'])
            ->where('status', 'approved')
            ->whereNotNull('published_at')
            ->orderBy('likes', 'desc')
            ->orderBy('views', 'desc');
        
        // ПРИМЕНЯЕМ ФИЛЬТР РАННЕГО ДОСТУПА
        $query = $this->applyEarlyAccessFilter($query);

        if ($request->has('limit')) {
            $query->limit($request->limit);
        }

        $fanfics = $query->get();

        return response()->json($fanfics);
    }

    // Получить "огненные" работы (топовые)
    public function fire(Request $request)
    {
        $query = Fanfic::with(['user', 'rating', 'tags'])
            ->where('status', 'approved')
            ->where(function($q) {
                $q->where('likes', '>', 1)
                  ->orWhere('views', '>', 1);
            })
            ->orderBy('likes', 'desc')
            ->orderBy('views', 'desc');
        
        // ПРИМЕНЯЕМ ФИЛЬТР РАННЕГО ДОСТУПА
        $query = $this->applyEarlyAccessFilter($query);

        if ($request->has('limit')) {
            $query->limit($request->limit);
        }

        $fanfics = $query->get();

        // Если нет фанфиков по критериям, покажем просто популярные
        if ($fanfics->isEmpty()) {
            $query = Fanfic::with(['user', 'rating', 'tags'])
                ->where('status', 'approved')
                ->orderBy('likes', 'desc')
                ->orderBy('views', 'desc')
                ->limit($request->input('limit', 4));
            
            $query = $this->applyEarlyAccessFilter($query);
            $fanfics = $query->get();
        }

        return response()->json($fanfics);
    }

    // Получить рекомендованные фанфики
    public function recommended(Request $request)
    {
        $query = Fanfic::with(['user', 'rating', 'tags'])
            ->where('status', 'approved')
            ->whereNotNull('published_at')
            ->orderBy('created_at', 'desc');
        
        // ПРИМЕНЯЕМ ФИЛЬТР РАННЕГО ДОСТУПА
        $query = $this->applyEarlyAccessFilter($query);

        if ($request->has('limit')) {
            $query->limit($request->limit);
        }

        $fanfics = $query->get();

        return response()->json($fanfics);
    }

    // Публичный метод для просмотра фанфика (для читателей)
    public function showPublished($id, Request $request)
    {
        $fanfic = Fanfic::with(['user', 'rating', 'tags'])->find($id);
        
        if (!$fanfic) {
            return response()->json(['error' => 'Фанфик не найден'], 404);
        }

        $user = Auth::user();
        $isAdmin = $user && $user->role === 'admin';
        $isAuthor = $user && $fanfic->user_id === $user->id;

        // Автор и админ могут видеть фанфики в любом статусе
        if ($isAuthor || $isAdmin) {
            // Не увеличиваем просмотры для неопубликованных работ
            if ($fanfic->status === 'approved' && !$request->has('no_increment')) {
                $fanfic->increment('views');
            }
            return response()->json($fanfic);
        }

        // Для остальных пользователей - обычная проверка
        $allowedStatuses = ['approved'];
        if ($fanfic->is_early_access || $fanfic->is_exclusive) {
            $allowedStatuses[] = 'pending'; 
        }

        if (!in_array($fanfic->status, $allowedStatuses)) {
            return response()->json(['error' => 'Фанфик не опубликован'], 403);
        }

        $hasHypeAccess = $user?->hasHypeOrHigherSubscription() ?? false;

        // Эксклюзивный контент
        if ($fanfic->is_exclusive && !$hasHypeAccess) {
            return response()->json([
                'error' => 'Эксклюзивный контент. Требуется подписка "Хайп"',
                'requires_subscription' => true,
                'is_exclusive' => true
            ], 403);
        }

        // Ранний доступ
        if ($fanfic->is_early_access && $fanfic->early_access_until > now() && !$hasHypeAccess) {
            return response()->json([
                'error' => 'Этот фанфик доступен только по подписке "Хайп" и выше',
                'requires_subscription' => true,
                'early_access_until' => $fanfic->early_access_until
            ], 403);
        }

        // Увеличиваем просмотры
        if (!$request->has('no_increment')) {
            $fanfic->increment('views');
        }

        return response()->json($fanfic);
    }

    // Публичный метод для получения контента
    public function getPublishedContent($id)
    {
        $fanfic = Fanfic::find($id);
        $user = Auth::user();

        if (!$fanfic) {
            return response()->json(['error' => 'Фанфик не найден'], 404);
        }

        // Разрешаем доступ админам и авторам к любым статусам
        $isAdmin = $user && $user->role === 'admin';
        $isAuthor = $user && $fanfic->user_id === $user->id;
        
        if ($fanfic->status !== 'approved' && $fanfic->status !== 'pending' && !$isAdmin && !$isAuthor) {
            return response()->json(['error' => 'Фанфик не опубликован'], 403);
        }

        // Проверка эксклюзивного контента (пропускаем для админов и авторов)
        if (!$isAdmin && !$isAuthor) {
            $hasHypeAccess = $user?->hasHypeOrHigherSubscription() ?? false;

            // Проверка эксклюзивного контента
            if ($fanfic->is_exclusive && !$hasHypeAccess) {
                return response()->json([
                    'error' => 'Этот фанфик является эксклюзивным и доступен только по подписке "Хайп"',
                    'requires_subscription' => true,
                    'is_exclusive' => true
                ], 403);
            }

            // Проверка раннего доступа
            if ($fanfic->is_early_access && $fanfic->early_access_until > now() && !$hasHypeAccess) {
                return response()->json([
                    'error' => 'Этот фанфик доступен только по подписке "Хайп" и выше',
                    'requires_subscription' => true,
                    'early_access_until' => $fanfic->early_access_until
                ], 403);
            }
        }

        // Получаем контент
        $content = '';
        
        if ($fanfic->extracted_text) {
            $content = $fanfic->extracted_text;
        } elseif ($fanfic->file_path) {
            try {
                $fileProcessor = app(\App\Services\FileProcessor::class);
                $content = $fileProcessor->getFileContentFromCloud($fanfic->file_path, $fanfic->file_type);
            } catch (\Exception $e) {
                return response()->json(['error' => 'Ошибка чтения файла'], 500);
            }
        }

        // Разбиваем на главы
        $chapters = $this->splitContentIntoChapters($content, $fanfic->file_type);

        return response()->json([
            'chapters' => $chapters,
            'total_chapters' => count($chapters),
            'file_type' => $fanfic->file_type,
            'file_url' => $fanfic->file_url,
            'requires_download' => in_array($fanfic->file_type, ['pdf', 'docx', 'doc']),
            'total_words' => $fanfic->words_count
        ]);
    }
    
    public function myFanficsByStatus($status)
    {
        $validStatuses = ['draft', 'pending', 'approved', 'rejected', 'published'];
        
        if (!in_array($status, $validStatuses)) {
            return response()->json(['error' => 'Неверный статус'], 400);
        }
        
        $fanfics = Fanfic::with(['rating', 'tags', 'user'])
            ->where('user_id', Auth::id())
            ->where('status', $status)
            ->orderBy('created_at', 'desc')
            ->paginate(10);
        
        return response()->json($fanfics);
    }

    // Сохранить прогресс чтения
    public function saveReadingProgress(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Не авторизован'], 401);
        }
        
        $validator = Validator::make($request->all(), [
            'last_position' => 'required|integer|min:0',
            'progress_percent' => 'required|integer|min:0|max:100',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        $progress = ReadingProgress::updateOrCreate(
            [
                'user_id' => $user->id,
                'fanfic_id' => $id
            ],
            [
                'last_position' => $request->last_position,
                'progress_percent' => $request->progress_percent,
                'last_read_at' => now()
            ]
        );
        
        return response()->json($progress);
    }

    // Получить историю чтения пользователя
    public function getReadingHistory(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Не авторизован'], 401);
        }
        
        $history = ReadingProgress::with(['fanfic' => function($query) {
                $query->with(['user', 'rating', 'tags']);
            }])
            ->where('user_id', $user->id)
            ->orderBy('last_read_at', 'desc')
            ->take(20)
            ->get()
            ->map(function($progress) {
                $fanfic = $progress->fanfic;
                
                // 🔥 ПРОВЕРКА: если фанфик удален, пропускаем запись
                if (!$fanfic) {
                    return null;
                }
                
                // Фильтруем фанфики с ранним доступом
                $hasHypeAccess = Auth::user()?->hasHypeOrHigherSubscription() ?? false;
                
                if ($fanfic->is_early_access && $fanfic->early_access_until > now() && !$hasHypeAccess) {
                    return null;
                }
                
                if ($fanfic->is_exclusive && !$hasHypeAccess) {
                    return null;
                }
                
                return [
                    'id' => $fanfic->id,
                    'title' => $fanfic->title,
                    'description' => $fanfic->description,
                    'likes' => $fanfic->likedByUsers()->count(),
                    'progress' => $progress->progress_percent,
                    'last_position' => $progress->last_position,
                    'last_read_at' => $progress->last_read_at,
                    'author' => [
                        'id' => $fanfic->user->id ?? null,
                        'name' => $fanfic->user->name ?? 'Неизвестный автор'
                    ]
                ];
            })
            ->filter(); // Убираем null значения
        
        return response()->json($history->values()); // values() для сброса ключей
    }

    // Удалить из истории чтения
    public function removeFromHistory($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Не авторизован'], 401);
        }
        
        $deleted = ReadingProgress::where('user_id', $user->id)
            ->where('fanfic_id', $id)
            ->delete();
        
        return response()->json(['success' => true, 'deleted' => $deleted]);
    }

    // Синхронизировать локальную историю с сервером
    public function syncReadingHistory(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Не авторизован'], 401);
        }
        
        $localHistory = $request->input('history', []);
        
        foreach ($localHistory as $item) {
            ReadingProgress::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'fanfic_id' => $item['fanfic_id']
                ],
                [
                    'last_position' => $item['last_position'],
                    'progress_percent' => $item['progress_percent'],
                    'last_read_at' => now()
                ]
            );
        }
        
        return response()->json(['success' => true]);
    }
}