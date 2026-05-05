<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SubscriptionReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public $subscriptionData;
    public $user;

    public function __construct($user, $subscriptionData)
    {
        $this->user = $user;
        $this->subscriptionData = $subscriptionData;
    }

    public function build()
    {
        return $this->from(config('mail.from.address'), config('mail.from.name'))
                    ->subject('Чек об оплате подписки на ФанЛит')
                    ->view('emails.subscription-receipt')
                    ->with([
                        'userName' => $this->user->name,
                        'userEmail' => $this->user->email,
                        'planName' => $this->subscriptionData['plan_name'],
                        'planPrice' => $this->subscriptionData['price'],
                        'paymentDate' => $this->subscriptionData['payment_date'],
                        'startDate' => $this->subscriptionData['start_date'],
                        'endDate' => $this->subscriptionData['end_date'],
                        'transactionId' => $this->subscriptionData['transaction_id'],
                        'paymentMethod' => $this->subscriptionData['payment_method'] ?? 'Банковская карта',
                    ]);
    }
}