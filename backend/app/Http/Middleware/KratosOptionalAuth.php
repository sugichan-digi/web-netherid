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
 * Kratos認証任意ミドルウェア（未ログイン許容）
 */
class KratosOptionalAuth
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

            if (empty(trim($cookieHeader))) {
                return $next($request);
            }

            $kratosUrl = rtrim(config('app.kratos_public_url', env('KRATOS_PUBLIC_URL', 'http://localhost:4433')), '/');

            $response = Http::withHeaders(['Cookie' => $cookieHeader])
                ->get("{$kratosUrl}/sessions/whoami");

            if ($response->status() !== 200) {
                return $next($request);
            }

            $identityId = $response->json('identity.id');

            if (empty($identityId)) {
                return $next($request);
            }

            $user = $this->resolveUser($identityId);
            $request->attributes->set('authUser', $user);

        } catch (\Throwable $e) {
            Log::channel('error')->error('Kratos任意認証エラー', [
                'message' => $e->getMessage(),
            ]);
        }

        return $next($request);
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
            Log::channel('error')->error('JITプロビジョニング競合（任意認証）', [
                'kratos_identity_id' => $identityId,
                'message'            => $e->getMessage(),
            ]);
        }

        return $this->userModel->findByKratosId($identityId);
    }
}
