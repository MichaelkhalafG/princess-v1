<?php

namespace App\Notifications;

use App\Models\User;
use App\Support\ArabicDigits;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

/**
 * The link that proves the email is hers. It opens the web app, which passes its parameters to
 * GET /api/v1/email/verify/{id}/{hash}: the signature covers that path and the expiry, so the
 * link works only unchanged and only until it expires.
 *
 * ARABIC COPY: DRAFT, NOT YET APPROVED.
 */
class VerifyEmail extends Notification
{
    /** @return list<string> */
    public function via(User $user): array
    {
        return ['mail'];
    }

    public function toMail(User $user): MailMessage
    {
        return (new MailMessage)
            ->subject('تأكيد بريدك الإلكتروني في برينسيس')
            ->view(['mail.message', 'mail.message-text'], [
                'heading' => 'أكّدي بريدك الإلكتروني',
                'lines' => [
                    'شكرًا لتسجيلك في برينسيس. اضغطي الزر لتأكيد أن هذا بريدك.',
                    'بعد التأكيد يصلنا إعلانك لنراجعه قبل أن يظهر على اللوحة.',
                ],
                'button' => 'تأكيد البريد الإلكتروني',
                'url' => self::link($user),
                'notes' => [
                    'الرابط صالح لمدة '.ArabicDigits::of(config('princess.accounts.verification_link_hours')).' ساعة. إن انتهت صلاحيته، سجّلي الدخول واطلبي رابطًا جديدًا.',
                    'إن لم تسجّلي في برينسيس، تجاهلي هذه الرسالة.',
                ],
            ]);
    }

    /** The web app's verification page, carrying what the API needs to check the link. */
    public static function link(User $user): string
    {
        $signed = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addHours(config('princess.accounts.verification_link_hours')),
            ['id' => $user->getKey(), 'hash' => sha1($user->getEmailForVerification())],
            absolute: false,
        );
        parse_str((string) parse_url($signed, PHP_URL_QUERY), $query);

        return config('princess.web_url').'/verify-email?'.http_build_query([
            'id' => $user->getKey(),
            'hash' => sha1($user->getEmailForVerification()),
            ...$query,
        ]);
    }
}
