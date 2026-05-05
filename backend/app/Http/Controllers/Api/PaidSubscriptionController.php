<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\PaidSubscription; 
use App\Mail\SubscriptionReceiptMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaidSubscriptionController extends Controller
{
    /**
     * Обработка покупки подписки
     */
    public function processPurchase(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|in:base,hype,chitun',
            'plan_name' => 'required|string',
            'price' => 'required|numeric|min:100|max:300',
            'card_number' => 'nullable|string',
            'card_expiry' => 'nullable|string',
            'card_cvv' => 'nullable|string',
        ]);

        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Пользователь не авторизован'
            ], 401);
        }

        // Генерация уникального ID транзакции
        $transactionId = 'FANLIT-' . strtoupper(Str::random(10)) . '-' . date('YmdHis');

        // Данные подписки
        $startDate = now();
        $endDate = now()->addDays(30);
        
        $subscriptionData = [
            'user_id' => $user->id,
            'plan_id' => $request->plan_id,
            'plan_name' => $request->plan_name,
            'price' => $request->price,
            'status' => 'active',
            'start_date' => $startDate,
            'end_date' => $endDate,
            'transaction_id' => $transactionId,
            'payment_method' => 'bank_card',
            'payment_details' => json_encode([
                'card_number' => $request->card_number ? substr($request->card_number, -4) : '****',
                'card_expiry' => $request->card_expiry,
            ])
        ];

        try {
            DB::beginTransaction();

            // Деактивируем старые подписки пользователя
            PaidSubscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->update(['status' => 'expired']);

            // Создаем новую подписку
            $subscription = PaidSubscription::create($subscriptionData);

            // Обновляем информацию о подписке у пользователя
            $user->subscription_plan = $request->plan_id;
            $user->subscription_until = $endDate;
            $user->save();

            // Отправляем чек на почту
            $emailData = [
                'plan_name' => $request->plan_name,
                'price' => $request->price,
                'payment_date' => $startDate->format('d.m.Y H:i:s'),
                'start_date' => $startDate->format('d.m.Y'),
                'end_date' => $endDate->format('d.m.Y'),
                'transaction_id' => $transactionId,
                'payment_method' => 'Банковская карта',
            ];

            Mail::to($user->email)->send(new SubscriptionReceiptMail($user, $emailData));

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Подписка успешно оформлена! Чек отправлен на вашу почту.',
                'subscription' => [
                    'id' => $subscription->id,
                    'plan_id' => $subscription->plan_id,
                    'plan_name' => $subscription->plan_name,
                    'price' => $subscription->price,
                    'start_date' => $subscription->start_date,
                    'end_date' => $subscription->end_date,
                    'status' => $subscription->status,
                ],
                'transaction_id' => $transactionId
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            \Log::error('Subscription purchase error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Произошла ошибка при оформлении подписки. Пожалуйста, попробуйте позже.'
            ], 500);
        }
    }

    /**
     * Получение информации о текущей подписке пользователя
     */
    public function getCurrentSubscription(Request $request)
    {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Пользователь не авторизован'
            ], 401);
        }

        $subscription = PaidSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->where('end_date', '>', now())
            ->first();

        if ($subscription) {
            return response()->json([
                'success' => true,
                'has_subscription' => true,
                'subscription' => [
                    'id' => $subscription->id,
                    'plan_id' => $subscription->plan_id,
                    'plan_name' => $subscription->plan_name,
                    'price' => $subscription->price,
                    'start_date' => $subscription->start_date,
                    'end_date' => $subscription->end_date,
                    'days_left' => now()->diffInDays($subscription->end_date, false)
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'has_subscription' => false,
            'subscription' => null
        ]);
    }

    /**
     * Повторная отправка чека на почту
     */
    public function resendReceipt(Request $request)
    {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Пользователь не авторизован'
            ], 401);
        }

        $subscription = PaidSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'Активная подписка не найдена'
            ], 404);
        }

        try {
            $emailData = [
                'plan_name' => $subscription->plan_name,
                'price' => $subscription->price,
                'payment_date' => $subscription->created_at->format('d.m.Y H:i:s'),
                'start_date' => $subscription->start_date->format('d.m.Y'),
                'end_date' => $subscription->end_date->format('d.m.Y'),
                'transaction_id' => $subscription->transaction_id,
                'payment_method' => 'Банковская карта',
            ];

            Mail::to($user->email)->send(new SubscriptionReceiptMail($user, $emailData));

            return response()->json([
                'success' => true,
                'message' => 'Чек повторно отправлен на вашу почту'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error resending receipt: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при отправке чека'
            ], 500);
        }
    }
}