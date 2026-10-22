<?php

namespace App\Notifications;

use App\Models\User;
use App\Support\ArabicDigits;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The link to choose a new password. It opens the web app, which sends the token, the email and
 * the new password to POST /api/v1/password/reset.
 *
 * ARABIC COPY: DRAFT, NOT YET APPROVED.
 */
class ResetPasswordEmail extends Notification
{
    public function __construct(private readonly string $token) {}

    /** @return list<string> */
    public function via(User $user): array
    {
        return ['mail'];
    }

    public function toMail(User $user): MailMessage
    {
        $url = config('princess.web_url').'/reset-password?'.http_build_query([
            'token' => $this->token,
            'email' => $user->getEmailForPasswordReset(),
        ]);

        return (new MailMessage)
            ->subject('إعادة تعيين كلمة المرور في برينسيس')
            ->view(['mail.message', 'mail.message-text'], [
                'heading' => 'إعادة تعيين كلمة المرور',
                'lines' => ['وصلنا طلب لإعادة تعيين كلمة مرور حسابك في برينسيس.'],
                'button' => 'تعيين كلمة مرور جديدة',
                'url' => $url,
                'notes' => [
                    'الرابط صالح لمدة '.ArabicDigits::of(config('auth.passwords.users.expire')).' دقيقة.',
                    'إن لم تطلبي ذلك، تجاهلي هذه الرسالة؛ كلمة مرورك لن تتغير.',
                ],
            ]);
    }
}
