<?php

namespace App\Services;

use App\Models\NotificationModel;
use App\Models\ServiceModel;
use App\Models\UserLinkedServiceModel;
use App\Models\UserModel;

/**
 * ダッシュボードサービス
 */
class DashboardService
{
    public function __construct(
        private readonly UserModel              $userModel,
        private readonly NotificationModel      $notificationModel,
        private readonly ServiceModel           $serviceModel,
        private readonly UserLinkedServiceModel $userLinkedServiceModel,
    ) {}

    /**
     * ダッシュボード初期情報取得
     *
     * @param  int  $userId  内部ユーザーID
     * @return array
     */
    public function getInitialData(int $userId): array
    {
        $user          = $this->userModel->findById($userId);
        $notifications = $this->notificationModel->findPublished();
        $services      = $this->serviceModel->findAll();
        $linkMap       = $this->userLinkedServiceModel->findMapByUserId($userId);

        $mergedServices = $services->map(function ($service) use ($linkMap) {
            return [
                'id'          => $service->id,
                'name'        => $service->name,
                'description' => $service->description,
                'sso_url'     => $service->sso_url,
                'icon_url'    => $service->icon_url,
                'is_active'   => (bool) $service->is_active,
                'is_linked'   => isset($linkMap[$service->id]),
                'linked_at'   => $linkMap[$service->id] ?? null,
            ];
        })->values()->all();

        return [
            'user'          => [
                'id'                 => $user->id,
                'kratos_identity_id' => $user->kratos_identity_id,
            ],
            'notifications' => $notifications->map(fn ($n) => [
                'id'           => $n->id,
                'title'        => $n->title,
                'content'      => $n->content,
                'url'          => $n->url,
                'published_at' => $n->published_at,
            ])->values()->all(),
            'services'      => $mergedServices,
        ];
    }
}
