<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // Проверяем, авторизован ли пользователь
        if (!Auth::check()) {
            return response()->json([
                'message' => 'Неавторизованный доступ'
            ], 401);
        }

        // Получаем текущего пользователя
        $user = Auth::user();

        // Проверяем, является ли пользователь администратором
        if ($user->role !== 'admin') {
            return response()->json([
                'message' => 'Доступ запрещен. Требуются права администратора.'
            ], 403);
        }

        return $next($request);
    }
}