<?php

namespace App\Services;

use App\Data\NotificationDto;
use App\Models\NotificationModel;

/**
 * お知らせサービス
 */
class NotificationService
{
    public function __construct(
        private readonly NotificationModel $notificationModel,
    ) {}

    /**
     * 公開済みお知らせ一覧取得
     *
     * @return NotificationDto[]
     */
    public function getPublished(): array
    {
        return $this->notificationModel->findPublished()
            ->map(fn ($n) => new NotificationDto(
                id:           $n->id,
                title:        $n->title,
                content:      $n->content,
                service_id:   $n->service_id,
                url:          $n->url,
                published_at: $n->published_at,
            ))
            ->values()
            ->all();
    }
}
