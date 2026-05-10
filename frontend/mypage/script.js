$(function () {

  /* 現在選択されているフィルター（'all' または各サービスキー） */
  var currentFilter = 'all';

  /* ===== セッション取得・ユーザー名表示 ===== */

  getSession()
    .done(function (data) {
      var identity  = data.identity || {};
      var traits    = identity.traits || {};
      var email     = traits.email || '';
      var firstName = (traits.name && traits.name.first) || '';
      var lastName  = (traits.name && traits.name.last)  || '';
      // 姓名が両方ある場合は結合して表示、なければメールアドレスにフォールバック
      var display   = (lastName + ' ' + firstName).trim() || email || 'ゲスト';
      $('#js-username').text(display);

    })
    .fail(function () {
      // 401 なら getSession() 内でログインページへリダイレクト済み
    });

  /* ===== タブ切り替え（お知らせフィルター） ===== */

  $(document).on('click', '.mp-notif-tab', function () {
    $('.mp-notif-tab').removeClass('mp-notif-tab--active');
    $(this).addClass('mp-notif-tab--active');
    currentFilter = $(this).data('filter');
    renderNotifications();
  });

  /* ===== お知らせ描画 ===== */
  // NOTIFICATIONS は common.js でグローバルに定義されたお知らせデータ配列

  function renderNotifications() {
    var $list = $('#js-notif-list');
    $list.empty();

    // 'all' 以外のフィルターが選択されている場合は filterKey で絞り込む
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

  // 初回描画（デフォルトは全件表示）
  renderNotifications();

});
