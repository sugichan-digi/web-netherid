# ランチマップ Laravel バックエンド設計書

## ディレクトリ構成

```
backend/
└── app/
    ├── Http/
    │   └── Controllers/   # リクエスト受付・レスポンス返却
    ├── Models/            # DB クエリメソッド定義
    ├── Data/            # read only class, valueobjectなどのデータ
    └── Services/          # ビジネスロジック・ユーティリティ
```

依存方向は **Controller → Service → Model の一方向のみ**。逆方向の参照は禁止。

---

## 層の責務

### Controller（`app/Http/Controllers/`）
- HTTP リクエスト受け取りとレスポンス返却のみ
- ビジネスロジックは書かない
- Service / Model を呼び出す

### Model（`app/Models/`）
- `DB` ファサードを使ったクエリメソッドのみ定義
- Eloquent ORM は**絶対に使用しない**

### Service（`app/Services/`）
- ビジネスロジック記述
- 共通ユーティリティは `AppService` など単一クラスにまとめてよい

---

## 禁止事項

| 禁止 | 理由 |
|------|------|
| `User::find()` `User::create()` `$model->save()` など Eloquent 操作 | DB アクセスは DB ファサード経由に統一 |
| `DB::select('SELECT ...', [...])` などの生 SQL 文字列 | メソッドチェーンを必ず使う |
| Controller 内での DB 操作 | 層の責務を分離する |
| トランザクション外での書き込み操作（INSERT / UPDATE / DELETE） | 整合性保証のため |

---

## DB ファサード — メソッドチェーン規則

```php
use Illuminate\Support\Facades\DB;

// ✅ 正しい（メソッドチェーン）
DB::table('lunches')
    ->where('id', $id)
    ->where('status', 1)
    ->first();

DB::table('lunches')
    ->where('station_g_cd', $stationGCd)
    ->orderByDesc('created_at')
    ->paginate(10);

// ❌ 禁止（生 SQL）
DB::select('SELECT * FROM lunches WHERE id = ?', [$id]);

// ❌ 禁止（Eloquent）
Lunch::find($id);
```

### 主要クエリメソッド早見表

| 操作 | メソッド |
|------|---------|
| 全件取得 | `->get()` |
| 1件取得 | `->first()` / `->find($id)` |
| 件数 | `->count()` |
| 挿入 | `->insert([...])` |
| 挿入＋ID取得 | `->insertGetId([...])` |
| 更新 | `->where(...)->update([...])` |
| 削除（物理） | `->where(...)->delete()` |
| 論理削除 | `->where(...)->update(['status' => 0])` |
| 結合 | `->join(...)` / `->leftJoin(...)` |
| 絞り込み | `->where(...)` / `->whereIn(...)` / `->whereNull(...)` |
| ソート | `->orderBy(...)` / `->orderByDesc(...)` |
| ページング | `->paginate($n)` / `->offset()->limit()` |

---

## トランザクション・エラーハンドリング

- **INSERT / UPDATE / DELETE を含む処理は必ず `DB::transaction()` 内に書く**
- 例外は `try/catch (\Throwable $e)` で捕捉し `Log::error()` で記録
- `catch` ブロックでは必ず例外を再スローする

```php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

try {
    DB::transaction(function () use ($input) {
        $lunchId = DB::table('lunches')->insertGetId([
            'user_id'      => $input->userId,
            'station_g_cd' => $input->stationGCd,
            'category_id'  => $input->categoryId,
            'shop_name'    => $input->shopName,
            'menu_name'    => $input->menuName,
            'price'        => $input->price,
            'image_url'    => $input->imageUrl,
            'latitude'     => $input->latitude,
            'longitude'    => $input->longitude,
            'comment'      => $input->comment,
            'status'       => 1,
            'created_at'   => now(),
        ]);

        return $lunchId;
    });
} catch (\Throwable $e) {
    Log::channel('error')->error('ランチ投稿失敗', [
        'message' => $e->getMessage(),
        'trace'   => $e->getTraceAsString(),
    ]);
    throw $e;
}
```

---

## ログ設定

### access.log / error.log の分離

`config/logging.php` に以下の 2 チャンネルを追加する。

```php
'channels' => [
    // アクセスログ（API リクエスト記録）
    'access' => [
        'driver' => 'daily',
        'path'   => storage_path('logs/access.log'),
        'level'  => 'info',
        'days'   => 30,
    ],

    // エラーログ（例外・DB エラー記録）
    'error' => [
        'driver' => 'daily',
        'path'   => storage_path('logs/error.log'),
        'level'  => 'error',
        'days'   => 60,
    ],
],
```

### 使い分け

```php
// アクセスログ（Controller でリクエスト記録）
Log::channel('access')->info('ランチ一覧取得', [
    'station_g_cd' => $request->station_g_cd,
    'user_id'      => $request->user()?->id,
]);

// エラーログ（catch ブロックで例外記録）
Log::channel('error')->error('ランチ投稿失敗', [
    'message' => $e->getMessage(),
    'trace'   => $e->getTraceAsString(),
]);
```

---

## 画像ストレージ

- アップロード画像は `storage/app/public/images/` に保存
- シンボリックリンク: `php artisan storage:link` で `public/storage` に公開
- ファイル名は `uniqid()` + 拡張子でユニーク化

```php
use Illuminate\Support\Facades\Storage;

// 保存
$path = $request->file('image')->store('images', 'public');
// → storage/app/public/images/xxxxx.jpg

// 公開 URL
$url = Storage::url($path);
// → /storage/images/xxxxx.jpg
```

---

## PHPDoc コメント規約

- **全クラス・全メソッドに必ず付ける**
- **日本語で記載する**
- **体言止め**（「〜する」「〜します」は不可。「〜処理」「〜取得」「〜生成」など名詞形で終わる）
- 1行コメントを優先し、不要な詳細説明は省く

```php
/**
 * ランチ投稿モデル
 */
class LunchModel
{
    /**
     * station_g_cd によるランチ一覧取得
     *
     * @param  int  $stationGCd  駅グループコード
     * @param  int  $categoryId  カテゴリID（0 は絞り込みなし）
     * @param  string  $sort     ソートキー（new / popular / cheap）
     * @param  int  $page        ページ番号
     * @return \Illuminate\Support\Collection
     */
    public function findByStation(int $stationGCd, int $categoryId, string $sort, int $page): Collection
    {
        // ...
    }
}
```

### コメント体言止め例

| NG（動詞形） | OK（体言止め） |
|---|---|
| ランチを取得する | ランチ取得 |
| ユーザーを作成する | ユーザー作成 |
| いいねを追加する | いいね追加 |
| エラーを記録する | エラー記録 |
| バリデーションを行う | バリデーション |

---

## 値オブジェクト（`readonly class`）

Controller → Service 間のデータ受け渡しに使用する。配列の生渡しは禁止。

```php
/**
 * ランチ投稿入力値オブジェクト
 */
readonly class CreateLunchInput
{
    public function __construct(
        public ?int    $userId,
        public int     $stationGCd,
        public int     $categoryId,
        public string  $shopName,
        public string  $menuName,
        public int     $price,
        public string  $imageUrl,
        public float   $latitude,
        public float   $longitude,
        public ?string $externalMapUrl,
        public ?string $comment,
    ) {}
}
```

```php
/**
 * いいね追加入力値オブジェクト
 */
readonly class AddLikeInput
{
    public function __construct(
        public int     $lunchId,
        public ?int    $userId,
        public string  $ipAddress,
    ) {}
}
```

---

## API URI 設計

- **先頭に `/api` や `/v1` は付けない**（`api.lunchmap.jp` などのサブドメインで分離するため）
- Route ファイルは `routes/api.php` を使用する

```php
// routes/api.php

Route::get('/health', [HealthController::class, 'index']);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
    Route::post('/logout',   [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

Route::get('/categories',  [CategoryController::class, 'index']);
Route::get('/prefectures', [PrefectureController::class, 'index']);
Route::get('/lines',       [LineController::class, 'index']);
Route::get('/stations',    [StationController::class, 'index']);

Route::get('/lunches',     [LunchController::class, 'index']);
Route::post('/lunches',    [LunchController::class, 'store']);
Route::get('/lunches/{id}',    [LunchController::class, 'show']);
Route::delete('/lunches/{id}', [LunchController::class, 'destroy'])->middleware('auth:sanctum');
Route::post('/lunches/{id}/likes', [LikeController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/mypage/lunches', [MypageController::class, 'lunches']);
});

Route::get('/users/{id}', [UserController::class, 'show']);
```

### CORS 設定（`config/cors.php`）

```php
'allowed_origins' => ['https://lunchmap.jp', 'http://localhost:3000'],
```

---

## .env 設定

```dotenv
# アプリ
APP_NAME=LunchMap
APP_ENV=local
APP_KEY=          # php artisan key:generate で生成
APP_DEBUG=true
APP_URL=http://localhost

# データベース（MySQL）
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=lunchmap
DB_USERNAME=root
DB_PASSWORD=

# セッション（ファイル保存）
SESSION_DRIVER=file
SESSION_LIFETIME=120

# キャッシュ（ファイル保存）
CACHE_DRIVER=file

# キュー（同期処理）
QUEUE_CONNECTION=sync

# ログ
LOG_CHANNEL=stack
LOG_LEVEL=debug

# ファイルストレージ
FILESYSTEM_DISK=public
```

> `SESSION_DRIVER=file` / `CACHE_DRIVER=file` により、セッション・キャッシュは
> `storage/framework/sessions` / `storage/framework/cache` にファイル保存される。
> データベースには依頼したテーブル以外保存しない。

---

## 必須インポート一覧

| 用途 | use 文 |
|------|--------|
| DB 操作 | `use Illuminate\Support\Facades\DB;` |
| ログ記録 | `use Illuminate\Support\Facades\Log;` |
| ファイルストレージ | `use Illuminate\Support\Facades\Storage;` |
| HTTP レスポンス | `use Illuminate\Http\JsonResponse;` |
| リクエスト | `use Illuminate\Http\Request;` |

---

## コーディングテンプレート

### Controller

```php
<?php

namespace App\Http\Controllers;

use App\Services\LunchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * ランチ投稿コントローラ
 */
class LunchController extends Controller
{
    public function __construct(
        private readonly LunchService $lunchService,
    ) {}

    /**
     * ランチ一覧取得
     */
    public function index(Request $request): JsonResponse
    {
        Log::channel('access')->info('ランチ一覧取得', $request->only(['station_g_cd', 'category_id', 'sort', 'page']));

        $result = $this->lunchService->getLunches(
            stationGCd: (int)$request->get('station_g_cd', 0),
            categoryId: (int)$request->get('category_id', 0),
            sort:       $request->get('sort', 'new'),
            page:       (int)$request->get('page', 1),
        );

        return response()->json($result);
    }
}
```

### Service

```php
<?php

namespace App\Services;

use App\Models\LunchModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ランチ投稿サービス
 */
class LunchService
{
    public function __construct(
        private readonly LunchModel $lunchModel,
    ) {}

    /**
     * ランチ一覧取得
     */
    public function getLunches(int $stationGCd, int $categoryId, string $sort, int $page): array
    {
        return $this->lunchModel->findByStation($stationGCd, $categoryId, $sort, $page);
    }

    /**
     * ランチ投稿作成
     *
     * @throws \Throwable
     */
    public function createLunch(CreateLunchInput $input): int
    {
        try {
            return DB::transaction(function () use ($input) {
                return $this->lunchModel->insert($input);
            });
        } catch (\Throwable $e) {
            Log::channel('error')->error('ランチ投稿失敗', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}
```

### Model

```php
<?php

namespace App\Models;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

/**
 * ランチ投稿モデル
 */
class LunchModel
{
    /** @var string テーブル名 */
    private const TABLE = 'lunches';

    /**
     * station_g_cd によるランチ一覧取得
     *
     * @param  int     $stationGCd  駅グループコード
     * @param  int     $categoryId  カテゴリID（0 は絞り込みなし）
     * @param  string  $sort        ソートキー
     * @param  int     $page        ページ番号
     * @return array{data: Collection, total: int}
     */
    public function findByStation(int $stationGCd, int $categoryId, string $sort, int $page): array
    {
        $query = DB::table(self::TABLE)
            ->where('status', 1);

        if ($stationGCd > 0) {
            $query->where('station_g_cd', $stationGCd);
        }
        if ($categoryId > 0) {
            $query->where('category_id', $categoryId);
        }

        $query = match ($sort) {
            'popular' => $query->orderByDesc('likes_count'),
            'cheap'   => $query->orderBy('price'),
            default   => $query->orderByDesc('created_at'),
        };

        $total = (clone $query)->count();
        $data  = $query->offset(($page - 1) * 10)->limit(10)->get();

        return ['data' => $data, 'total' => $total];
    }

    /**
     * ランチ投稿挿入
     *
     * @param  CreateLunchInput  $input  入力値オブジェクト
     * @return int 採番された ID
     */
    public function insert(CreateLunchInput $input): int
    {
        return DB::table(self::TABLE)->insertGetId([
            'user_id'          => $input->userId,
            'station_g_cd'     => $input->stationGCd,
            'category_id'      => $input->categoryId,
            'shop_name'        => $input->shopName,
            'menu_name'        => $input->menuName,
            'price'            => $input->price,
            'image_url'        => $input->imageUrl,
            'latitude'         => $input->latitude,
            'longitude'        => $input->longitude,
            'external_map_url' => $input->externalMapUrl,
            'comment'          => $input->comment,
            'status'           => 1,
            'created_at'       => now(),
        ]);
    }
}
```
