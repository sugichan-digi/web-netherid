<?php

namespace App\Data;

/**
 * お問い合わせ作成入力値オブジェクト
 */
readonly class CreateInquiryInput
{
    /**
     * @param  int|null  $userId   ログインユーザーの内部ID（未ログイン時はnull）
     * @param  string    $email    返信用メールアドレス
     * @param  string    $type     問い合わせ種別
     * @param  string    $subject  件名
     * @param  string    $body     本文
     */
    public function __construct(
        public ?int   $userId,
        public string $email,
        public string $type,
        public string $subject,
        public string $body,
    ) {}
}
