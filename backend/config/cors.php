<?php

return [

    'paths' => ['*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://netherid.com',
        'http://netherid-frontend.test',
        'http://api.netherid-frontend.test',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    /*
     * KratosセッションCookieを透過させるため true 必須
     * true の場合 allowed_origins に * は使用不可
     */
    'supports_credentials' => true,

];
