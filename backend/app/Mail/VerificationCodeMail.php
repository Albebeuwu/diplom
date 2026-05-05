<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerificationCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public $code;
    public $type;

    public function __construct($code, $type = 'registration')
    {
        $this->code = $code;
        $this->type = $type;
    }

    public function envelope(): Envelope
    {
        $subject = $this->type === 'registration' 
            ? 'Код подтверждения регистрации' 
            : 'Восстановление пароля';
            
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.verification-code',
            with: [
                'code' => $this->code,
                'type' => $this->type,
            ]
        );
    }
}