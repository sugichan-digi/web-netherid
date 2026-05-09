$(function () {

  // ----- お知らせデータ（API 実装前の仮データ） -----
  var NOTIFICATIONS = [
    { date: '2026-05-09', filterKey: 'nether-id',      badgeClass: 'mp-notif-badge-id', badge: 'ネザーID',     title: '【重要】メンテナンスのお知らせ（5/15 2:00〜5:00）',                  body: 'いつもネザーIDをご利用いただきありがとうございます。システムメンテナンスのため、2026年5月15日（金）午前2:00〜5:00の間サービスを一時停止します。' },
    { date: '2026-05-01', filterKey: 'nether-ma',      badgeClass: 'mp-notif-badge-ma', badge: 'ネザーM&A',    title: 'ネザーM&A — 売買契約書テンプレートをリニューアルしました',              body: '売買契約書のひな型を全面リニューアルしました。新テンプレートはマイページのM&Aセクションからダウンロードいただけます。' },
    { date: '2026-04-25', filterKey: 'nether-keyword', badgeClass: 'mp-notif-badge-kw', badge: 'ネザーキーワード', title: 'ネザーキーワード — サジェスト件数が最大500件に拡張されました',        body: 'キーワードリサーチの精度向上のため、サジェスト最大件数を200件から500件に拡張しました。' },
    { date: '2026-04-20', filterKey: 'nether-server',  badgeClass: 'mp-notif-badge-sv', badge: 'ネザーサーバー', title: 'ネザーサーバー — PHP 8.4 対応完了のお知らせ',                        body: 'ネザーサーバー全プランにてPHP 8.4が利用可能になりました。コントロールパネルよりPHPバージョンを変更できます。' },
    { date: '2026-04-15', filterKey: 'nether-domain',  badgeClass: 'mp-notif-badge-dm', badge: 'ネザードメイン', title: 'ネザードメイン — .shop ドメインが特価キャンペーン中！',               body: '.shopドメインが通常価格より70%オフの特価でご提供中です。キャンペーンは2026年4月30日まで。' },
    { date: '2026-04-10', filterKey: 'nether-id',      badgeClass: 'mp-notif-badge-id', badge: 'ネザーID',     title: 'ネザーID — パスキー（Passkey）ログインに対応しました',               body: 'パスキーを使ったパスワードレスログインが利用可能になりました。セキュリティ設定ページよりご登録いただけます。' },
    { date: '2026-04-01', filterKey: 'cd-domain',      badgeClass: 'mp-notif-badge-cd', badge: '中古ドメイン',  title: '中古ドメイン販売屋さん — 新着高品質ドメイン200件を追加しました',        body: 'DA 40以上の高品質オールドドメインを200件追加しました。ぜひドメイン一覧よりご確認ください。' },
    { date: '2026-03-28', filterKey: 'nether-ma',      badgeClass: 'mp-notif-badge-ma', badge: 'ネザーM&A',    title: 'ネザーM&A — 無料弁護士相談サービスの提供開始',                         body: '売買成立後のトラブルに備え、弁護士への無料相談サービスの提供を開始しました。' },
    { date: '2026-03-20', filterKey: 'nether-id',      badgeClass: 'mp-notif-badge-id', badge: 'ネザーID',     title: 'ネザーID — プライバシーポリシーを改定しました（2026/4/1 施行）',        body: '2026年4月1日よりプライバシーポリシーを改定します。主な変更点は本文をご確認ください。' },
    { date: '2026-03-10', filterKey: 'nether-server',  badgeClass: 'mp-notif-badge-sv', badge: 'ネザーサーバー', title: 'ネザーサーバー — 無料 SSL 証明書の自動更新に対応しました',              body: 'Let\'s Encrypt による SSL 証明書の自動更新機能を全プランに追加しました。手動更新は不要になります。' },
  ];

  var currentFilter = 'all';

  // ----- セッション取得 -----

  getSession()
    .done(function (data) {
      var identity  = data.identity || {};
      var traits    = identity.traits || {};
      var email     = traits.email || '';
      var firstName = (traits.name && traits.name.first) || '';
      var lastName  = (traits.name && traits.name.last)  || '';
      var display   = (lastName + ' ' + firstName).trim() || email || 'ゲスト';
      $('#js-username').text(display);

    })
    .fail(function () {
      // 401 なら getSession() 内でリダイレクト済み
    });

  // ----- タブ切り替え -----

  $(document).on('click', '.mp-notif-tab', function () {
    $('.mp-notif-tab').removeClass('mp-notif-tab--active');
    $(this).addClass('mp-notif-tab--active');
    currentFilter = $(this).data('filter');
    renderNotifications();
  });

  // ----- お知らせ描画 -----

  function escapeHtml(str) {
    return $('<div>').text(String(str)).html();
  }

  function renderNotifications() {
    var $list = $('#js-notif-list');
    $list.empty();

    var items = currentFilter === 'all'
      ? NOTIFICATIONS
      : NOTIFICATIONS.filter(function (n) { return n.filterKey === currentFilter; });

    if (items.length === 0) {
      $list.append('<div class="mp-notif-empty">お知らせはありません</div>');
      return;
    }

    $.each(items, function (i, item) {
      var $row = $(
        '<div class="mp-notif-row">' +
          '<span class="mp-notif-date">' + escapeHtml(item.date) + '</span>' +
          '<span class="mp-notif-badge ' + escapeHtml(item.badgeClass) + '">' + escapeHtml(item.badge) + '</span>' +
          '<span class="mp-notif-title">' + escapeHtml(item.title) + '</span>' +
        '</div>'
      );
      $row.data('item', item);
      $list.append($row);
    });
  }

  renderNotifications();

});
