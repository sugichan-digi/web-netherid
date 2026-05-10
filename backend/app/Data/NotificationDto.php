<?php

namespace App\Data;

/**
 * お知らせ出力値オブジェクト
 */
readonly class NotificationDto
{
    /**
     * @param  int      $id           お知らせID
     * @param  string   $title        タイトル
     * @param  string   $content      本文
     * @param  int|null $service_id   連携サービスID
     * @param  string|null $url       関連URL
     * @param  string   $published_at 公開日時
     */
    public function __construct(
        public int     $id,
        public string  $title,
        public string  $content,
        public ?int    $service_id,
        public ?string $url,
        public string  $published_at,
    ) {}
}
