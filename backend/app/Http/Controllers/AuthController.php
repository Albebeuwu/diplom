<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\VerificationCode;
use App\Mail\VerificationCodeMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;
use App\Models\Fanfic;

class AuthController extends Controller
{
     // Получить информацию об авторе
    public function show($id)
    {
        $author = User::withCount(['fanfics' => function($query) {
                $query->where('status', 'approved');
            }])
            ->findOrFail($id);
        
        // Добавляем дополнительные поля
        $author->fanfics_count = $author->fanfics_count ?? 0;
        $author->total_likes = Fanfic::where('user_id', $id)
            ->where('status', 'approved')
            ->sum('likes');
        
        return response()->json($author);
    }
    
    // Получить работы автора
    public function fanfics($id)
    {
        $query = Fanfic::where('user_id', $id)
            ->where('status', 'approved')
            ->with(['rating', 'tags'])
            ->orderBy('created_at', 'desc');
        
        // Применяем фильтр раннего доступа
        $user = Auth::user();
        $hasHypeAccess = $user && $user->hasHypeOrHigherSubscription();
        
        if (!$hasHypeAccess) {
            // Исключаем фанфики с ранним доступом
            $query->where(function($q) {
                $q->where('is_early_access', false)
                ->orWhere('early_access_until', '<', now());
            });
        }
        
        // Также исключаем эксклюзивные фанфики для пользователей без подписки
        if (!$hasHypeAccess) {
            $query->where('is_exclusive', false);
        }
        
        $fanfics = $query->get();
        
        return response()->json($fanfics);
    }
    
    // Получить дополнительный контент автора
    public function extraContent($id)
    {
        $user = Auth::user();
        $hasHypeAccess = $user && $user->hasHypeOrHigherSubscription();
        
        $extraContent = [];
        
        // Ранний доступ (виден всем с подпиской Hype+)
        $earlyAccess = Fanfic::where('user_id', $id)
            ->where('is_early_access', true)
            ->where('early_access_until', '>', now())
            ->where('status', 'approved')
            ->get();
        
        foreach ($earlyAccess as $item) {
            $extraContent[] = [
                'id' => $item->id,
                'type' => 'early_access',
                'title' => $item->title,
                'description' => $item->description,
                'early_access_until' => $item->early_access_until,
                'created_at' => $item->created_at,
            ];
        }
        
        // Эксклюзивный контент (только для подписчиков Hype+)
        if ($hasHypeAccess) {
            $exclusive = Fanfic::where('user_id', $id)
                ->where('is_exclusive', true)
                ->where('status', 'approved')
                ->get();
            
            foreach ($exclusive as $item) {
                $extraContent[] = [
                    'id' => $item->id,
                    'type' => 'exclusive',
                    'title' => $item->title,
                    'description' => $item->description,
                    'created_at' => $item->created_at,
                ];
            }
        }
        
        return response()->json($extraContent);
    }
    
    // Получить фанфики с ранним доступом
    public function getAuthorEarlyAccess($id)
    {
        // Проверяем подписку у авторизованного пользователя
        $user = Auth::user();
        if (!$user || !$user->hasHypeOrHigherSubscription()) {
            // Возвращаем пустой массив, но с правильным статусом
            return response()->json([]);
        }
        
        // Загружаем фанфики с ранним доступом
        $fanfics = Fanfic::where('user_id', $id)
            ->where('is_early_access', true)
            ->where('early_access_until', '>', now())
            ->where('status', 'approved')
            ->with(['rating', 'tags'])
            ->orderBy('created_at', 'desc')
            ->get();
        
        // Возвращаем полные данные фанфиков
        return response()->json($fanfics);
    }
    
    // Получить эксклюзивные фанфики
    public function getAuthorExclusive($id)
    {
        // Проверяем подписку у авторизованного пользователя
        $user = Auth::user();
        if (!$user || !$user->hasHypeOrHigherSubscription()) {
            // Возвращаем пустой массив, но с правильным статусом
            return response()->json([]);
        }
        
        // Загружаем эксклюзивные фанфики
        $fanfics = Fanfic::where('user_id', $id)
            ->where('is_exclusive', true)
            ->where('status', 'approved')
            ->with(['rating', 'tags'])
            ->orderBy('created_at', 'desc')
            ->get();
        
        // Возвращаем полные данные фанфиков
        return response()->json($fanfics);
    }

    // Отправка кода подтверждения для регистрации
    public function sendRegistrationCode(Request $request)
    {
        try {
            \Log::info('Попытка регистрации:', $request->all());
            
            $request->validate([
                'email' => [
                    'required',
                    'string',
                    'email:rfc,dns',
                    'max:255',
                    'unique:users,email',
                ],
                'email' => [
                    'required',
                    'string',
                    'email:rfc,dns',
                    'max:255',
                    'unique:users,email',
                ],
                'password' => [
                    'required',
                    'string',
                    'min:5',
                    'confirmed', // проверяет наличие password_confirmation
                    'regex:/^[a-zA-Z0-9]+$/'
                ],
            ], [
                'name.required' => 'Имя обязательно для заполнения',
                'name.regex' => 'Имя может содержать только буквы, пробелы, тире и точки',
                'password.confirmed' => 'Пароли не совпадают',
                'email.required' => 'Email обязателен для заполнения',
                'email.email' => 'Введите корректный email адрес',
                'email.unique' => 'Этот email уже зарегистрирован',
            ]);

            // Очистка от возможных XSS
            $name = htmlspecialchars($request->name, ENT_QUOTES, 'UTF-8');
            $email = filter_var($request->email, FILTER_SANITIZE_EMAIL);

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return response()->json([
                    'message' => 'Некорректный email адрес',
                    'errors' => ['email' => ['Введите корректный email адрес']]
                ], 422);
            }

            // Сохраняем данные в сессии
            $tempData = [
                'name' => $name,
                'email' => $email,
                'password' => $request->password,
                'password_confirmation' => $request->password_confirmation
            ];
            
            session(['registration_data' => $tempData]);
            \Log::info('Данные сохранены в сессию');

            // Генерируем и отправляем код
            $verificationCode = VerificationCode::generateCode($email, 'registration');
            \Log::info('Код подтверждения сгенерирован: ' . $verificationCode->code);
            
            try {
                Mail::to($email)->send(new VerificationCodeMail($verificationCode->code, 'registration'));
                \Log::info('Письмо отправлено на ' . $email);
            } catch (\Exception $mailError) {
                \Log::error('Ошибка отправки письма: ' . $mailError->getMessage());
                throw new \Exception('Не удалось отправить код подтверждения на email');
            }

            return response()->json([
                'message' => 'Код подтверждения отправлен на ваш email',
                'email' => $email
            ]);

        } catch (ValidationException $e) {
            \Log::error('Ошибка валидации:', $e->errors());
            throw $e;
        } catch (\Exception $e) {
            \Log::error('Ошибка отправки кода:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Ошибка при отправке кода подтверждения: ' . $e->getMessage()
            ], 500);
        }
    }

    // Подтверждение кода и завершение регистрации
    public function verifyAndRegister(Request $request)
    {
        try {
            \Log::info('Попытка подтверждения кода:', $request->all());
            
            $request->validate([
                'email' => 'required|email',
                'code' => 'required|string|size:6'
            ]);

            $verificationCode = VerificationCode::where('email', $request->email)
                ->where('code', $request->code)
                ->where('type', 'registration')
                ->first();

            if (!$verificationCode) {
                \Log::warning('Код не найден для email: ' . $request->email);
                return response()->json([
                    'message' => 'Неверный код подтверждения'
                ], 422);
            }

            if (!$verificationCode->isValid()) {
                \Log::warning('Код истек для email: ' . $request->email);
                return response()->json([
                    'message' => 'Срок действия кода истек'
                ], 422);
            }

            // Получаем данные из сессии
            $tempData = session('registration_data');
            \Log::info('Данные из сессии:', $tempData ?? []);
            
            if (!$tempData || $tempData['email'] !== $request->email) {
                return response()->json([
                    'message' => 'Данные регистрации не найдены. Пожалуйста, начните регистрацию заново.'
                ], 422);
            }

            // Первый пользователь становится админом
            $isFirstUser = User::count() === 0;
            $role = $isFirstUser ? 'admin' : 'user';

            $user = User::create([
                'name' => $tempData['name'],
                'email' => $tempData['email'],
                'password' => Hash::make($tempData['password']),
                'role' => $role,
            ]);

            \Log::info('Пользователь создан с ID: ' . $user->id);

            // Удаляем использованный код
            $verificationCode->delete();
            
            // Очищаем сессию
            session()->forget('registration_data');

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'user' => $user,
                'token' => $token,
                'role' => $role,
                'message' => 'Регистрация успешно завершена'
            ], 201);

        } catch (ValidationException $e) {
            \Log::error('Ошибка валидации при подтверждении:', $e->errors());
            throw $e;
        } catch (\Exception $e) {
            \Log::error('Ошибка подтверждения регистрации:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Ошибка при подтверждении регистрации'
            ], 500);
        }
    }

    public function resendRegistrationCode(Request $request)
    {
        $tempData = session('registration_data');

        if (!$tempData) {
            return response()->json([
                'message' => 'Данные регистрации не найдены'
            ], 422);
        }

        $verificationCode = VerificationCode::generateCode(
            $tempData['email'],
            'registration'
        );

        Mail::to($tempData['email'])
            ->send(new VerificationCodeMail($verificationCode->code, 'registration'));

        return response()->json([
            'message' => 'Код подтверждения отправлен повторно'
        ]);
    }


    // Отправка кода для восстановления пароля
    public function sendPasswordResetCode(Request $request)
    {
        try {
            $request->validate([
                'email' => [
                    'required',
                    'email',
                    'exists:users,email',
                    'regex:/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/'
                ]
            ], [
                'email.exists' => 'Пользователь с таким email не найден',
                'email.regex' => 'Введите корректный email адрес'
            ]);

            $email = filter_var($request->email, FILTER_SANITIZE_EMAIL);

            // Генерируем и отправляем код
            $verificationCode = VerificationCode::generateCode($email, 'password_reset');
            
            Mail::to($email)->send(new VerificationCodeMail($verificationCode->code, 'password_reset'));

            return response()->json([
                'message' => 'Код для восстановления пароля отправлен на ваш email',
                'email' => $email
            ]);

        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            \Log::error('Ошибка отправки кода восстановления:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Ошибка при отправке кода восстановления'
            ], 500);
        }
    }

    // Проверка кода и смена пароля
    public function resetPassword(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email|exists:users,email',
                'code' => 'required|string|size:6',
                'password' => [
                    'required',
                    'string',
                    'min:5',
                    'confirmed',
                    'regex:/^[a-zA-Z0-9]+$/'
                ],
            ], [
                'password.regex' => 'Пароль может содержать только английские буквы и цифры',
                'password.min' => 'Пароль должен быть не менее 5 символов',
                'password.confirmed' => 'Пароли не совпадают'
            ]);

            $verificationCode = VerificationCode::where('email', $request->email)
                ->where('code', $request->code)
                ->where('type', 'password_reset')
                ->first();

            if (!$verificationCode || !$verificationCode->isValid()) {
                return response()->json([
                    'message' => 'Неверный или истекший код подтверждения'
                ], 422);
            }

            $user = User::where('email', $request->email)->first();
            $user->password = Hash::make($request->password);
            $user->save();

            // Удаляем использованный код
            $verificationCode->delete();

            // Удаляем все токены пользователя (выход из всех устройств)
            $user->tokens()->delete();

            return response()->json([
                'message' => 'Пароль успешно изменен'
            ]);

        } catch (\Exception $e) {
            \Log::error('Ошибка сброса пароля:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Ошибка при сбросе пароля'
            ], 500);
        }
    }

    // Вход
    public function login(Request $request)
    {
        $request->validate([
            'email' => [
                'required',
                'email',
                'regex:/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/'
            ],
            'password' => [
                'required',
                'string',
                'min:5',
                'regex:/^[a-zA-Z0-9]+$/'
            ],
        ], [
            'email.regex' => 'Введите корректный email адрес',
            'password.regex' => 'Пароль может содержать только английские буквы и цифры',
            'password.min' => 'Пароль должен быть не менее 5 символов'
        ]);

        $email = filter_var($request->email, FILTER_SANITIZE_EMAIL);

        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Неверные учетные данные.'],
            ]);
        }

        // Проверяем, не заблокирован ли пользователь
        if ($user->blocked_at !== null) {
            return response()->json([
                'message' => 'Ваш аккаунт был заблокирован',
                'blocked' => true,
                'block_reason' => $user->block_reason ?? 'Причина не указана',
                'blocked_at' => $user->blocked_at,
                'user' => [
                    'name' => $user->name,
                    'email' => $user->email
                ]
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'role' => $user->role
        ]);
    }

    // Выход
     public function logout(Request $request)
    {
        try {
            if (!Auth::check()) {
                return response()->json([
                    'message' => 'Вы не авторизованы'
                ], 401);
            }

            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'message' => 'Пользователь не найден'
                ], 404);
            }

            $user->tokens()->delete();
            
            return response()->json([
                'message' => 'Вы успешно вышли из системы'
            ]);

        } catch (\Exception $e) {
            \Log::error('Ошибка при выходе: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Произошла ошибка при выходе'
            ], 500);
        }
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }
}