<?php

namespace App\Http\Controllers;

use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * お知らせコントローラ
 */
class NotificationController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * 公開済みお知らせ一覧取得
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->attributes->get('authUser');

        Log::channel('access')->info('お知らせ一覧取得', [
            'user_id' => $user?->id,
        ]);

        $notifications = $this->notificationService->getPublished();

        return response()->json(['notifications' => $notifications]);
    }
}
