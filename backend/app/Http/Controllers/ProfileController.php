<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Fanfic;
use App\Models\FanficLike;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    // Получить профиль текущего пользователя
    public function show()
    {
        $user = Auth::user();
        return response()->json([
            'user' => $user,
            'avatar_url' => $user->avatar_url,
        ]);
    }   

    // Обновить профиль
    public function update(Request $request)
    {
        $user = Auth::user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'bio' => 'nullable|string|max:1000',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'background' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120', 
            'background_opacity' => 'nullable|numeric|min:0.1|max:1',
            'remove_avatar' => 'sometimes|boolean',
            'remove_background' => 'sometimes|boolean',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $updateData = [];

        // Обновление фона сайта
        if ($request->hasFile('background')) {
            // Проверяем подписку (заглушка для будущей реализации)
            // if (!$user->hasPremiumSubscription()) {
            //     return response()->json(['error' => 'Для смены фона требуется премиум подписка'], 403);
            // }
            
            // Удаляем старый фон, если он существует
            if ($user->background_image) {
                Storage::disk('public')->delete($user->background_image);
            }
            
            // Сохраняем новый фон
            $path = $request->file('background')->store('backgrounds', 'public');
            $updateData['background_image'] = $path;
            
            // Устанавливаем прозрачность по умолчанию
            if (!$request->has('background_opacity')) {
                $updateData['background_opacity'] = 0.7;
            }
        }

        // Удаление фона
        if ($request->has('remove_background') && $request->input('remove_background')) {
            if ($user->background_image) {
                Storage::disk('public')->delete($user->background_image);
                $updateData['background_image'] = null;
                $updateData['background_opacity'] = null;
            }
        }

        // Обновление прозрачности фона
        if ($request->has('background_opacity')) {
            $updateData['background_opacity'] = $request->background_opacity;
        }

        // Обновление аватарки
        if ($request->hasFile('avatar')) {
            // Удаляем старую аватарку, если она существует
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            
            // Сохраняем новую аватарку
            $path = $request->file('avatar')->store('avatars', 'public');
            $updateData['avatar'] = $path;
        }

        // Удаление аватарки (если пришел запрос на удаление)
        if ($request->has('remove_avatar')) {
            // Проверяем как строку или булево значение
            $removeAvatar = $request->input('remove_avatar');
            if ($removeAvatar === 'true' || $removeAvatar === true || $removeAvatar === '1') {
                if ($user->avatar) {
                    Storage::disk('public')->delete($user->avatar);
                    $updateData['avatar'] = null;
                }
            }
        }

        // Добавляем остальные поля только если они есть в запросе
        if ($request->has('name')) {
            $updateData['name'] = $request->name;
        }
        
        if ($request->has('email')) {
            $updateData['email'] = $request->email;
        }
        
        if ($request->has('bio')) {
            $updateData['bio'] = $request->bio;
        }

        // Обновляем пользователя только если есть что обновлять
        if (!empty($updateData)) {
            $user->update($updateData);
        }

        // Загружаем обновленные данные
        $user->refresh();

        return response()->json([
            'message' => 'Профиль успешно обновлен',
            'user' => $user,
            'avatar_url' => $user->avatar_url,
            'background_url' => $user->background_url,
            'background_opacity' => $user->background_opacity,
        ]);
    }

    // Изменить пароль
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = Auth::user();

        // Проверяем текущий пароль
        if (!password_verify($request->current_password, $user->password)) {
            return response()->json(['error' => 'Текущий пароль неверен'], 401);
        }

        // Обновляем пароль
        $user->update([
            'password' => bcrypt($request->new_password)
        ]);

        return response()->json(['message' => 'Пароль успешно изменен']);
    }

    // Удалить аккаунт
    public function destroy()
    {
        $user = Auth::user();
        
        // Удаляем аватарку, если она есть
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }
        
        // Выходим из системы
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Аккаунт успешно удален']);
    }

     
    //Получить лайкнутые фанфики пользователя
    public function likedFanfics(Request $request)
    {
        $user = Auth::user();
        
        $perPage = $request->input('per_page', 6);
        
        $likedFanfics = $user->likedFanfics()
            ->with([
                'user',        // автор
                'tags',        // теги
                'rating'       // рейтинг
            ])
            ->withCount('likedByUsers as likes_count')
            ->orderBy('fanfic_likes.created_at', 'desc')
            ->paginate($perPage);
        
        return response()->json($likedFanfics);
    }
}