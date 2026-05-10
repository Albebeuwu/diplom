<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\FanficController;
use App\Http\Controllers\AdminFanficController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\LikeController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AdminReportController;
use App\Http\Controllers\AuthorController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\Api\PaidSubscriptionController;
use App\Http\Controllers\SurveyController;
use App\Http\Controllers\AdminTagController;

// =======================
// Публичные маршруты
// =======================
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::post('/auth/resend-registration-code', [AuthController::class, 'resendRegistrationCode']);
Route::post('/send-registration-code', [AuthController::class, 'sendRegistrationCode']);
Route::post('/verify-and-register', [AuthController::class, 'verifyAndRegister']);
Route::post('/send-password-reset-code', [AuthController::class, 'sendPasswordResetCode']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// =======================
// Публичные маршруты для фанфиков (без авторизации)
// =======================
Route::prefix('fanfics')->group(function () {
    // Конкретные маршруты без параметров
    Route::get('/', [FanficController::class, 'index']);
    Route::get('/popular', [FanficController::class, 'popular']);
    Route::get('/new', [FanficController::class, 'new']);
    Route::get('/search', [FanficController::class, 'search']);
    Route::get('/recommended', [FanficController::class, 'recommended']);
    Route::get('/fire', [FanficController::class, 'fire']);
    Route::get('/ratings', [FanficController::class, 'getRatings']);
    Route::get('/tags', [FanficController::class, 'getTags']);
    Route::get('/published', [FanficController::class, 'index']);

    

    // Общие маршруты с параметрами - в самом конце
    Route::get('/{id}/similar', [FanficController::class, 'similar']);
    Route::get('/{id}/download', [FanficController::class, 'download']);
    Route::get('/{fanficId}/comments', [CommentController::class, 'index']);
});

Route::prefix('authors')->group(function () {
    Route::get('/{id}', [AuthorController::class, 'show']);
    Route::get('/{id}/fanfics', [AuthorController::class, 'fanfics']);
    Route::get('/{id}/extra-content', [AuthorController::class, 'extraContent']);
});

// =======================
// Тестовый маршрут
// =======================
Route::get('/test', function () {
    return response()->json([
        'message' => 'API работает',
        'database' => \DB::connection()->getDatabaseName(),
        'users_table' => \Schema::hasTable('users') ? 'существует' : 'не существует',
        'fanfic_ratings' => \Schema::hasTable('fanfic_ratings') ? 'существует' : 'не существует',
        'fanfic_tags' => \Schema::hasTable('fanfic_tags') ? 'существует' : 'не существует',
        'fanfics' => \Schema::hasTable('fanfics') ? 'существует' : 'не существует',
    ]);
});

Route::prefix('surveys')->group(function () {
    Route::get('/author/{authorId}', [SurveyController::class, 'getAuthorSurveys']);
});

// =======================
// Защищенные маршруты (требуют авторизации)
// =======================
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/fanfics/{id}/progress', [FanficController::class, 'saveReadingProgress']);
    Route::get('/reading-history', [FanficController::class, 'getReadingHistory']);
    Route::delete('/reading-history/{id}', [FanficController::class, 'removeFromHistory']);
    Route::post('/reading-history/sync', [FanficController::class, 'syncReadingHistory']);

    Route::prefix('fanfics')->group(function () {
        // Маршруты с параметрами - конкретные пути перед общими
        Route::get('/published/{id}', [FanficController::class, 'showPublished']);
        Route::get('/published/{id}/content', [FanficController::class, 'getPublishedContent']);
    });

    Route::prefix('surveys')->group(function () {
        Route::post('/', [SurveyController::class, 'store']);
        Route::post('/{id}/vote', [SurveyController::class, 'vote']);
        Route::get('/{id}/results', [SurveyController::class, 'getResults']);
    });
    
    // Дополнительный контент автора
    Route::get('/authors/{authorId}/extra-content', [FanficController::class, 'getExtraContent']);

    // Маршруты для подписки
    Route::post('/subscription/purchase', [PaidSubscriptionController::class, 'processPurchase']);
    Route::get('/subscription/current', [PaidSubscriptionController::class, 'getCurrentSubscription']);
    Route::post('/subscription/resend-receipt', [PaidSubscriptionController::class, 'resendReceipt']);

    // =======================
    // МАРШРУТЫ ПОДПИСОК 
    // =======================
    Route::prefix('authors')->group(function () {
        Route::post('/{id}/subscribe', [SubscriptionController::class, 'subscribe']);
        Route::delete('/{id}/unsubscribe', [SubscriptionController::class, 'unsubscribe']);
        Route::get('/{id}/subscription-status', [SubscriptionController::class, 'checkSubscription']);
        Route::get('/{id}/early-access', [AuthController::class, 'getAuthorEarlyAccess']);
        Route::get('/{id}/exclusive', [AuthController::class, 'getAuthorExclusive']);
    });
    
    Route::get('/profile/subscriptions', [SubscriptionController::class, 'getSubscriptions']);

    // -----------------------
    // Аутентификация
    // -----------------------
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'user']);

    // -----------------------
    // Лайки 
    // -----------------------
    Route::post('/fanfics/{id}/like', [LikeController::class, 'like']);
    Route::post('/fanfics/{id}/unlike', [LikeController::class, 'unlike']);
    Route::get('/likes/{id}/check', [LikeController::class, 'checkLike']);
    Route::get('/user/liked-fanfics', [LikeController::class, 'getLikedFanfics']);

    // -----------------------
    // Профиль пользователя
    // -----------------------
    Route::prefix('profile')->group(function () {
        Route::get('/', [ProfileController::class, 'show']);
        Route::put('/', [ProfileController::class, 'update']);
        Route::post('/change-password', [ProfileController::class, 'changePassword']);
        Route::delete('/', [ProfileController::class, 'destroy']);

        // Маршрут для избранного (лайкнутых фанфиков)
        Route::get('/liked-fanfics', [ProfileController::class, 'likedFanfics']);
    });

    // -----------------------
    // Фанфики пользователя
    // -----------------------
    Route::prefix('my-fanfics')->group(function () { 
        Route::post('/', [FanficController::class, 'store']);
        Route::get('/', [FanficController::class, 'myFanfics']);
        Route::get('/{id}', [FanficController::class, 'show']);
        Route::get('/{id}/content', [FanficController::class, 'getContent']); 
        Route::match(['post', 'put', 'patch'], '/{id}', [FanficController::class, 'update']);
        Route::delete('/{id}', [FanficController::class, 'destroy']);
        Route::post('/{id}/submit', [FanficController::class, 'submitForReview']);
        Route::get('/filter/{status}', [FanficController::class, 'myFanficsByStatus']);
    });

    // -----------------------
    // Комментарии (требуют авторизации для изменений)
    // -----------------------
    Route::prefix('fanfics/{fanficId}')->group(function () {
        Route::post('/comments', [CommentController::class, 'store']);
    });
    
    Route::prefix('comments')->group(function () {
        Route::put('/{id}', [CommentController::class, 'update']);
        Route::delete('/{id}', [CommentController::class, 'destroy']);
    });

    // -----------------------
    // Жалобы для пользователей
    // -----------------------
    Route::prefix('fanfics/{fanficId}')->group(function () {
        Route::post('/reports', [ReportController::class, 'store']);
    });
    
    Route::prefix('my-reports')->group(function () {
        Route::get('/', [ReportController::class, 'myReports']);
        Route::get('/{id}', [ReportController::class, 'show']);
    });

    // -----------------------
    // Админские маршруты
    // -----------------------
    Route::prefix('admin')->middleware('admin')->group(function () {

        // Существующие админские маршруты
        Route::get('/users', [AdminController::class, 'index']);
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::put('/users/{id}/role', [AdminController::class, 'updateRole']);
        Route::post('/users/{id}/block', [AdminController::class, 'block']);
        Route::post('/users/{id}/unblock', [AdminController::class, 'unblock']);
        Route::delete('/users/{id}', [AdminController::class, 'destroy']);

        // Модерация фанфиков (существующие)
        Route::prefix('fanfics')->group(function () {
            Route::get('/pending', [AdminFanficController::class, 'pendingFanfics']);
            Route::post('/{id}/approve', [AdminFanficController::class, 'approve']);
            Route::post('/{id}/reject', [AdminFanficController::class, 'reject']);
            Route::get('/stats', [AdminFanficController::class, 'fanficStats']);
            Route::get('/', [AdminFanficController::class, 'index']);
            Route::get('/{id}', [AdminFanficController::class, 'show']);
            Route::put('/{id}/status', [AdminFanficController::class, 'updateStatus']);
            Route::delete('/{id}', [AdminFanficController::class, 'destroy']);
            Route::post('/{id}/restore', [AdminFanficController::class, 'restore']);
            Route::get('/{id}/comments', [AdminFanficController::class, 'comments']);
            Route::delete('/{id}/comments/{commentId}', [AdminFanficController::class, 'deleteComment']);
        });

        // =======================
        // Админские маршруты для управления жалобами
        // =======================
        Route::prefix('reports')->group(function () {
            Route::get('/', [AdminReportController::class, 'index']);
            Route::get('/stats', [AdminReportController::class, 'stats']);
            Route::get('/{id}', [AdminReportController::class, 'show']);
            Route::post('/{id}/approve', [AdminReportController::class, 'approve']);
            Route::post('/{id}/reject', [AdminReportController::class, 'reject']);
        });

        Route::prefix('tags')->group(function () {
            Route::get('/', [AdminTagController::class, 'index']);
            Route::post('/', [AdminTagController::class, 'store']);
            Route::put('/{id}', [AdminTagController::class, 'update']);
            Route::delete('/{id}', [AdminTagController::class, 'destroy']);
        });
    });
});

// =======================
// Fallback маршрут для проверки API
// =======================
Route::fallback(function () {
    return response()->json(['error' => 'Маршрут не найден'], 404);
});