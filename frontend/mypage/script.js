$(function () {

  /* お知らせデータ（API取得後に格納する） */
  var notifications = [];

  /* 現在選択されているフィルター */
  var currentFilter = 'all';

  /* ===== セッション取得・ユーザー名表示 ===== */

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
      // 401 なら getSession() 内でログインページへリダイレクト済み
    });

  /* ===== お知らせ取得 ===== */

  api({ method: 'GET', path: '/notifications' })
    .done(function (data) {
      var SERVICE_META = {
        'subscr_optimizer': { label: 'サブスク管理人', cls: 'badge-service-sm', filterKey: 'subsuku' },
        'lunchmap':         { label: 'ランチマップ',   cls: 'badge-service-lm', filterKey: 'lunchmap' },
      };
      notifications = (data.notifications || []).map(function (n) {
        var svc = SERVICE_META[n.service_id] || { label: 'ネザーID', cls: 'badge-service-id', filterKey: 'all' };
        return {
          id:         n.id,
          date:       n.published_at ? n.published_at.split('T')[0] : '',
          filterKey:  svc.filterKey,
          badge:      svc.label,
          badgeClass: svc.cls,
          title:      n.title,
          body:       n.content
        };
      });
      renderNotifications();
    })
    .fail(function () {
      $('#js-notif-list').html('<div class="mp-notif-empty">お知らせの取得に失敗しました。</div>');
    });

  /* ===== タブ切り替え ===== */

  $(document).on('click', '.mp-notif-tab', function () {
    $('.mp-notif-tab').removeClass('mp-notif-tab--active');
    $(this).addClass('mp-notif-tab--active');
    currentFilter = $(this).data('filter');
    renderNotifications();
  });

  /* ===== お知らせ描画 ===== */

  function renderNotifications() {
    var $list = $('#js-notif-list');
    $list.empty();

    var items = currentFilter === 'all'
      ? notifications
      : notifications.filter(function (n) { return n.filterKey === currentFilter; });

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

  /* ===== サービス一覧取得 ===== */

  api({ method: 'GET', path: '/services' })
    .done(function (data) {
      renderServices(data.services || []);
    })
    .fail(function () {
      $('#js-services-grid').html('<p class="mp-service-error">サービス情報の取得に失敗しました。</p>');
    });

  /* ===== サービス一覧描画 ===== */

  function renderServices(services) {
    var $grid = $('#js-services-grid');
    $grid.empty();

    if (services.length === 0) {
      $grid.html('<p class="mp-service-error">現在ご利用可能なサービスはありません。</p>');
      return;
    }

    $.each(services, function (i, svc) {
      var isActive   = svc.is_active;
      var grayClass  = isActive ? '' : ' card--grayout';
      var grayBadge  = isActive ? '' : '<div class="grayout-badge">開発中</div>';
      var iconHtml   = svc.icon_url
        ? '<img src="' + escapeHtml(svc.icon_url) + '" alt="" class="mp-service-icon-img">'
        : escapeHtml(svc.name.slice(0, 2));
      var iconStyle  = svc.icon_url ? '' : ' style="background:#6b7280;"';

      var inner =
        grayBadge +
        '<div class="mp-service-icon"' + iconStyle + '>' + iconHtml + '</div>' +
        '<div class="mp-service-body">' +
          '<div class="mp-service-name">' + escapeHtml(svc.name) + '</div>' +
          '<p class="mp-service-desc">' + escapeHtml(svc.description || '') + '</p>' +
        '</div>';

      var $li;
      if (svc.sso_url && isActive) {
        $li = $('<li class="mp-service-card' + grayClass + '"><a href="' + escapeHtml(svc.sso_url) + '" class="mp-service-card-link" target="_blank" rel="noopener noreferrer">' + inner + '</a></li>');
      } else {
        $li = $('<li class="mp-service-card' + grayClass + '">' + inner + '</li>');
      }

      $grid.append($li);
    });
  }

});
