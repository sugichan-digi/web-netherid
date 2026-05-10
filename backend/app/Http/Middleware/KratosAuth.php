<?php

namespace App\Http\Middleware;

use App\Models\UserModel;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Kratos認証必須ミドルウェア
 */
class KratosAuth
{
    public function __construct(
        private readonly UserModel $userModel,
    ) {}

    /**
     * リクエスト処理
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $cookieHeader = collect($request->cookies->all())
                ->map(fn ($value, $name) => "{$name}={$value}")
                ->implode('; ');

            // 受信したCookieのキー名だけをログに出力（値は伏せる）
            Log::channel('access')->info('Received Cookie Names:', [
                'names' => array_keys($request->cookies->all()),
                'has_ory_session' => $request->hasCookie('ory_kratos_session'),
                'raw_header_length' => strlen($cookieHeader)
            ]);

            $kratosUrl = rtrim(config('app.kratos_public_url'), '/');

            $response = Http::withHeaders(['Cookie' => $cookieHeader])
                ->get("{$kratosUrl}/sessions/whoami");

            if ($response->status() !== 200) {
                Log::channel('access')->warning('Kratos Auth Failed', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                    'url'    => "{$kratosUrl}/sessions/whoami",
                    'cookie_count' => count($request->cookies->all())
                ]);
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            $identityId = $response->json('identity.id');

            if (empty($identityId)) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            $user = $this->resolveUser($identityId);

            $request->attributes->set('authUser', $user);
            $request->attributes->set('kratosIdentityId', $identityId);

            Log::channel('access')->info('Kratos認証成功', [
                'kratos_identity_id' => $identityId,
                'user_id'            => $user->id,
            ]);

            return $next($request);

        } catch (\Throwable $e) {
            Log::channel('error')->error('Kratos認証エラー', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);

            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
    }

    /**
     * Kratos Identity IDによるユーザー解決（JITプロビジョニング）
     *
     * @param  string  $identityId  KratosのIdentity UUID
     * @return object
     */
    private function resolveUser(string $identityId): object
    {
        $user = $this->userModel->findByKratosId($identityId);

        if ($user !== null) {
            return $user;
        }

        try {
            DB::transaction(function () use ($identityId) {
                $this->userModel->insert($identityId);
            });
        } catch (\Throwable $e) {
            // 競合による重複挿入は無視して再取得
            Log::channel('error')->error('JITプロビジョニング競合', [
                'kratos_identity_id' => $identityId,
                'message'            => $e->getMessage(),
            ]);
        }

        return $this->userModel->findByKratosId($identityId);
    }
}
