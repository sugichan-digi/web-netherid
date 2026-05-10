<?php

namespace App\Http\Controllers;

use App\Services\LinkedServiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * サービスコントローラ
 */
class ServiceController extends Controller
{
    public function __construct(
        private readonly LinkedServiceService $serviceService,
    ) {}

    /**
     * サービス一覧取得
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->attributes->get('authUser');

        Log::channel('access')->info('サービス一覧取得', [
            'user_id' => $user?->id,
        ]);

        $services = $this->serviceService->getAll($user?->id);

        return response()->json(['services' => $services]);
    }
}
