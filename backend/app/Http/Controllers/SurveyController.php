<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Models\SurveyResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SurveyController extends Controller
{
    // Создание опроса (только для авторов)
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'questions' => 'required|array|min:1',
            'questions.*.text' => 'required|string',
            'questions.*.type' => 'required|in:single,multiple',
            'questions.*.options' => 'required|array|min:2',
            'questions.*.options.*' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $survey = new Survey();
        $survey->user_id = Auth::id();
        $survey->title = $request->title;
        $survey->description = $request->description;
        $survey->questions = $request->questions;
        $survey->status = 'active';
        $survey->published_at = now();
        $survey->save();

        return response()->json([
            'message' => 'Опрос успешно создан',
            'survey' => $survey
        ], 201);
    }

    // Получение опросов автора
    public function getAuthorSurveys($authorId)
    {
        try {
            $surveys = Survey::where('user_id', $authorId)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($survey) {
                    // Получаем текущего пользователя (может быть null)
                    $user = auth()->user();
                    
                    // Проверяем доступность
                    $isAccessible = $survey->isAccessibleForUser($user);
                    
                    // Формируем ответ
                    $result = [
                        'id' => $survey->id,
                        'title' => $survey->title,
                        'description' => $survey->description,
                        'status' => $survey->status,
                        'created_at' => $survey->created_at,
                        'published_at' => $survey->published_at,
                        'is_early_access' => $survey->is_early_access,
                        'early_access_until' => $survey->early_access_until,
                        'is_accessible' => $isAccessible,
                    ];
                    
                    // Только если опрос доступен, показываем вопросы
                    if ($isAccessible || ($user && $user->id == $authorId)) {
                        $result['questions'] = $survey->questions;
                        $result['total_votes'] = $survey->responses()->count();
                        $result['has_voted'] = $user ? $survey->hasUserVoted($user->id) : false;
                    } else {
                        $result['questions'] = null;
                        $result['locked_message'] = 'Опрос доступен только по подписке Hype+';
                    }
                    
                    return $result;
                });
            
            return response()->json($surveys);
        } catch (\Exception $e) {
            \Log::error('Ошибка получения опросов: ' . $e->getMessage());
            return response()->json(['error' => 'Ошибка загрузки опросов'], 500);
        }
    }

    // Голосование в опросе
    public function vote(Request $request, $id)
    {
        $survey = Survey::findOrFail($id);
        
        // Проверка доступа
        if (!$survey->isAccessibleForUser()) {
            return response()->json(['error' => 'Опрос недоступен'], 403);
        }
        
        $user = Auth::user();
        
        // Проверка не голосовал ли уже
        if ($survey->hasUserVoted($user->id)) {
            return response()->json(['error' => 'Вы уже проголосовали'], 400);
        }
        
        $validator = Validator::make($request->all(), [
            'answers' => 'required|array',
            'answers.*.question_index' => 'required|integer',
            'answers.*.option_index' => 'required|array',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        // Создание ответа
        $response = new SurveyResponse();
        $response->survey_id = $survey->id;
        $response->user_id = $user->id;
        $response->answers = $request->answers;
        $response->save();
        
        // Обновление статистики опроса
        $results = $survey->getResultsWithPercentages();
        $survey->results = $results;
        $survey->save();
        
        return response()->json([
            'message' => 'Голос учтен',
            'results' => $results
        ]);
    }

    // Получение результатов опроса
    public function getResults($id)
    {
        $survey = Survey::findOrFail($id);
        
        // Проверка доступа
        if (!$survey->isAccessibleForUser() && $survey->user_id !== Auth::id()) {
            return response()->json(['error' => 'Результаты недоступны'], 403);
        }
        
        $results = $survey->getResultsWithPercentages();
        
        return response()->json([
            'survey' => $survey,
            'results' => $results,
            'has_voted' => Auth::check() ? $survey->hasUserVoted(Auth::id()) : false,
            'responses_count' => $survey->responses()->count()
        ]);
    }
}