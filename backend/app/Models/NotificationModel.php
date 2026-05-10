<?php

namespace App\Models;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * お知らせモデル
 */
class NotificationModel
{
    /** @var string テーブル名 */
    private const TABLE = 'notifications';

    /**
     * 公開済みお知らせ一覧取得
     *
     * @return Collection
     */
    public function findPublished(): Collection
    {
        return DB::table(self::TABLE)
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
            ->select(['id', 'title', 'content', 'service_id', 'url', 'published_at'])
            ->get();
    }
}
