<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminController extends Controller
{
    // Просмотр всех пользователей (только для админов)
    public function index(Request $request)
    {
        // Проверка прав администратора
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'message' => 'Доступ запрещен. Требуются права администратора.'
            ], 403);
        }

        // Получаем всех пользователей, включая заблокированных
        $users = User::withCount(['fanfics', 'comments'])->get();
        
        return response()->json([
            'users' => $users,
            'total' => $users->count()
        ]);
    }

    // Изменение роли пользователя
    public function updateRole(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'message' => 'Доступ запрещен. Требуются права администратора.'
            ], 403);
        }

        $request->validate([
            'role' => 'required|in:user,admin'
        ]);

        $user = User::findOrFail($id);
        
        // Нельзя изменить роль заблокированного пользователя?
        if ($user->is_blocked) {
            return response()->json([
                'message' => 'Нельзя изменить роль заблокированного пользователя'
            ], 400);
        }

        $user->role = $request->role;
        $user->save();

        Log::info('Роль пользователя изменена', [
            'admin_id' => $request->user()->id,
            'user_id' => $user->id,
            'new_role' => $request->role
        ]);

        return response()->json([
            'message' => 'Роль пользователя успешно изменена',
            'user' => $user
        ]);
    }

    // Блокировка пользователя (вместо удаления)
    public function block(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'message' => 'Доступ запрещен. Требуются права администратора.'
            ], 403);
        }

        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        // Нельзя заблокировать самого себя
        if ($request->user()->id == $id) {
            return response()->json([
                'message' => 'Нельзя заблокировать свой аккаунт'
            ], 400);
        }

        $user = User::findOrFail($id);
        
        // Нельзя заблокировать уже заблокированного
        if ($user->is_blocked) {
            return response()->json([
                'message' => 'Пользователь уже заблокирован'
            ], 400);
        }

        $user->blocked_at = now();
        $user->block_reason = $request->reason;
        $user->save();

        $user->tokens()->delete();

        Log::info('Пользователь заблокирован', [
            'admin_id' => $request->user()->id,
            'blocked_user_id' => $user->id,
            'reason' => $request->reason
        ]);

        return response()->json([
            'message' => 'Пользователь успешно заблокирован',
            'user' => $user
        ]);
    }

    // Разблокировка пользователя
    public function unblock(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'message' => 'Доступ запрещен. Требуются права администратора.'
            ], 403);
        }

        $user = User::findOrFail($id);
        
        if (!$user->is_blocked) {
            return response()->json([
                'message' => 'Пользователь не заблокирован'
            ], 400);
        }

        $user->blocked_at = null;
        $user->block_reason = null;
        $user->save();

        Log::info('Пользователь разблокирован', [
            'admin_id' => $request->user()->id,
            'unblocked_user_id' => $user->id,
        ]);

        return response()->json([
            'message' => 'Пользователь успешно разблокирован',
            'user' => $user
        ]);
    }

    // Получить статистику
    public function stats(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'message' => 'Доступ запрещен. Требуются права администратора.'
            ], 403);
        }

        $totalUsers = User::count(); // Всего пользователей (включая заблокированных)
        $activeUsers = User::active()->count(); // Активные (не заблокированные)
        $blockedUsers = User::blocked()->count(); // Заблокированные
        $adminCount = User::where('role', 'admin')->active()->count(); // Активные админы
        $userCount = User::where('role', 'user')->active()->count(); // Активные пользователи

        return response()->json([
            'stats' => [
                'total_users' => $totalUsers,
                'active_users' => $activeUsers,
                'blocked_users' => $blockedUsers,
                'admins' => $adminCount,
                'users' => $userCount
            ]
        ]);
    }

    // Удаление пользователя (оставим на случай реального удаления, 
    // но лучше использовать блокировку)
    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'message' => 'Доступ запрещен. Требуются права администратора.'
            ], 403);
        }

        // Нельзя удалить самого себя
        if ($request->user()->id == $id) {
            return response()->json([
                'message' => 'Нельзя удалить свой аккаунт'
            ], 400);
        }

        $user = User::findOrFail($id);
        
        // Проверяем, есть ли у пользователя контент
        if ($user->fanfics()->count() > 0 || $user->comments()->count() > 0) {
            return response()->json([
                'message' => 'Невозможно удалить пользователя с контентом. Используйте блокировку.'
            ], 400);
        }

        $user->delete();

        Log::info('Пользователь удален', [
            'admin_id' => $request->user()->id,
            'deleted_user_id' => $id
        ]);

        return response()->json([
            'message' => 'Пользователь успешно удален'
        ]);
    }
}