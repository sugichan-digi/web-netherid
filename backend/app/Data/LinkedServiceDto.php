<?php

namespace App\Data;

/**
 * 連携サービス出力値オブジェクト
 */
readonly class LinkedServiceDto
{
    /**
     * @param  int         $id          サービスID
     * @param  string      $name        サービス名
     * @param  string      $description 説明
     * @param  string|null $sso_url     SSOログインURL
     * @param  string|null $icon_url    アイコンURL
     * @param  bool        $is_active   有効フラグ
     * @param  bool        $is_linked   連携済みフラグ
     * @param  string|null $linked_at   連携日時
     */
    public function __construct(
        public int     $id,
        public string  $name,
        public string  $description,
        public ?string $sso_url,
        public ?string $icon_url,
        public bool    $is_active,
        public bool    $is_linked,
        public ?string $linked_at,
    ) {}
}
