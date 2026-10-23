<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** To the moderators: what needs a look. Internal, so in English like the admin. */
class ModerationAlert extends Notification
{
    /** @param list<string> $lines */
    public function __construct(private readonly array $lines) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)->subject('Princess moderation: something needs a look');
        foreach ($this->lines as $line) {
            $message->line($line);
        }

        return $message->action('Open the admin', url('/admin'));
    }
}
