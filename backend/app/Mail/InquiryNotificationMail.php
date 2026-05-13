<?php

namespace App\Mail;

use App\Data\CreateInquiryInput;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * お問い合わせ管理者通知メール
 */
class InquiryNotificationMail extends Mailable
{
    /**
     * コンストラクタ
     */
    public function __construct(
        private readonly CreateInquiryInput $input,
        private readonly int $inquiryId,
    ) {}

    /**
     * エンベロープ定義
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[NetherID] お問い合わせ: ' . $this->input->subject,
            replyTo: [$this->input->email],
        );
    }

    /**
     * コンテンツ定義
     */
    public function content(): Content
    {
        return new Content(
            view: 'mail.inquiry-notification',
            with: [
                'inquiryId'   => $this->inquiryId,
                'type'        => $this->input->type,
                'subject'     => $this->input->subject,
                'senderEmail' => $this->input->email,
                'userId'      => $this->input->userId,
                'body'        => $this->input->body,
            ],
        );
    }
}
