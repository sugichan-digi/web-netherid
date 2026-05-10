<?php

namespace App\Services;

use App\Models\ServiceModel;
use App\Models\UserLinkedServiceModel;

/**
 * サービスサービス
 */
class ServiceService
{
    public function __construct(
        private readonly ServiceModel           $serviceModel,
        private readonly UserLinkedServiceModel $userLinkedServiceModel,
    ) {}

    /**
     * サービス一覧取得（連携状態付き）
     *
     * @param  int|null  $userId  内部ユーザーID（未ログイン時はnull）
     * @return array
     */
    public function getAll(?int $userId): array
    {
        $services = $this->serviceModel->findAll();
        $linkMap  = $userId !== null
            ? $this->userLinkedServiceModel->findMapByUserId($userId)
            : [];

        return $services->map(fn ($service) => [
            'id'          => $service->id,
            'name'        => $service->name,
            'description' => $service->description,
            'sso_url'     => $service->sso_url,
            'icon_url'    => $service->icon_url,
            'is_active'   => (bool) $service->is_active,
            'is_linked'   => isset($linkMap[$service->id]),
            'linked_at'   => $linkMap[$service->id] ?? null,
        ])->values()->all();
    }
}
