<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * ダッシュボードコントローラ
 */
class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {}

    /**
     * ダッシュボード初期情報取得
     */
    public function init(Request $request): JsonResponse
    {
        $user = $request->attributes->get('authUser');

        Log::channel('access')->info('ダッシュボード初期取得', [
            'user_id' => $user->id,
        ]);

        $result = $this->dashboardService->getInitialData($user->id);

        return response()->json($result);
    }
}
