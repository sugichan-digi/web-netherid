$(function () {

  /* お知らせ一覧データ（API から取得後に格納する） */
  var notifications = [];

  /* ===== 初期化 ===== */
  initNotificationPage();

  function initNotificationPage() {
    // セッション情報を取得してヘッダーを構築する（ログイン状態に関わらず実行）
    getSessionSilent()
      .done(function (data) {
        setupNotifPageHeader(data);
      });

    // お知らせ一覧を取得してリストを描画する
    fetchNotifications();
  }

  /* ===== API からお知らせデータを取得 ===== */

  function fetchNotifications() {
    api({
      method: 'GET',
      path: '/dashboard/init'
    })
      .done(function (data) {
        // API レスポンスを画面表示用の形式に変換して保持する
        notifications = (data.notifications || []).map(function(n) {
          return {
            id:            n.id,
            date:          n.published_at ? n.published_at.split(' ')[0] : '',
            service:       'ネザーID',
            serviceClass:  'badge-service-id',
            category:      'お知らせ',
            categoryClass: 'badge-cat-info',
            filterKey:     'all',
            title:         n.title,
            body:          n.content  // モーダルの本文に使用する（HTML を許容する）
          };
        });

        renderRows();
        // ヘッダーの通知ポップアップも更新する（fetchNotifications と setupNotifPageHeader の
        // どちらが先に完了するかは非同期のため、両方から updateHeaderNotifPopup を呼び出す）
        updateHeaderNotifPopup();
      })
      .fail(function () {
        $list.hide();
        $empty.show().text('お知らせの取得に失敗しました。');
      });
  }

  /* ===== ログイン状態確認・ヘッダー切り替え ===== */
  // このページは独自のヘッダーを持つため、common.js の initHeaderPopups() は使用せず
  // セッション情報を受け取ってヘッダーを動的に組み立てる

  function setupNotifPageHeader(sessionData) {
    var identity = sessionData.identity || {};
    var traits   = identity.traits || {};
    var uid      = identity.id || '';
    var email    = traits.email || '';

    var $actions = $('.header-actions');
    $actions.empty();

    /* 通知ボタン + ポップアップ */
    var $notifWrap = $('<div class="popup-wrap"></div>');
    var $notifBtn  = $(
      '<button class="header-icon-btn" id="js-nt-notif-btn" title="お知らせ" aria-expanded="false">' +
        '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor">' +
          '<path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880t42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80zM480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80M320-280h320v-280q0-66-47-113t-113-47-113 47-47 113z"/>' +
        '</svg>' +
      '</button>'
    );
    var $notifPopup = $('<div id="js-nt-notif-popup" class="popup-dropdown notif-dropdown" style="display:none;" role="dialog" aria-label="お知らせ"></div>');
    $notifWrap.append($notifBtn, $notifPopup);

    /* アカウントボタン + ポップアップ */
    var $userWrap = $('<div class="popup-wrap"></div>');
    var $userBtn  = $(
      '<button class="header-icon-btn" id="js-nt-user-btn" title="アカウント" aria-expanded="false">' +
        '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor">' +
          '<path d="M480-480q-66 0-113-47t-47-113 47-113 113-47 113 47 47 113-47 113-113 47M160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440t130 15.5T736-378q29 15 46.5 43.5T800-272v112z"/>' +
        '</svg>' +
      '</button>'
    );
    var $userPopup = $(buildHeaderUserMenuHtml(uid, email));
    $userWrap.append($userBtn, $userPopup);

    $actions.append($notifWrap, $userWrap);

    // ポップアップの初期描画（通知データが既に取得済みの場合は反映される）
    updateHeaderNotifPopup();

    /* 通知ポップアップの開閉 */
    $notifBtn.on('click', function (e) {
      e.stopPropagation();
      // 2つのポップアップは同時に開かないよう制御する
      $userPopup.hide();
      $userBtn.attr('aria-expanded', 'false');
      var isOpen = $notifPopup.is(':visible');
      $notifPopup.toggle(!isOpen);
      $(this).attr('aria-expanded', String(!isOpen));
    });

    /* アカウントポップアップの開閉 */
    $userBtn.on('click', function (e) {
      e.stopPropagation();
      // 2つのポップアップは同時に開かないよう制御する
      $notifPopup.hide();
      $notifBtn.attr('aria-expanded', 'false');
      var isOpen = $userPopup.is(':visible');
      $userPopup.toggle(!isOpen);
      $(this).attr('aria-expanded', String(!isOpen));
    });

    /* ログアウト */
    $userPopup.find('#js-nt-popup-logout').on('click', function () {
      performLogout(); // common.js の共通ログアウト処理
    });

    /* ポップアップ外クリックで閉じる */
    $(document).on('click.nt-popup', function (e) {
      if (!$(e.target).closest($notifWrap).length) { $notifPopup.hide(); $notifBtn.attr('aria-expanded', 'false'); }
      if (!$(e.target).closest($userWrap).length) { $userPopup.hide(); $userBtn.attr('aria-expanded', 'false'); }
    });
  }

  /**
   * ヘッダーの通知ポップアップを最新の notifications データで更新する
   * setupNotifPageHeader と fetchNotifications の両方から呼ばれる（どちらが先に完了するか不定のため）
   */
  function updateHeaderNotifPopup() {
    var $popup = $('#js-nt-notif-popup');
    if (!$popup.length) return;

    var itemsHtml = '';
    // ポップアップには最新5件のみ表示する
    $.each(notifications.slice(0, 5), function (i, n) {
      itemsHtml +=
        '<div class="notif-dropdown-item">' +
          '<div class="notif-dropdown-meta">' +
            '<span class="badge ' + n.serviceClass + '">' + escapeHtml(n.service) + '</span>' +
            '<span class="notif-dropdown-date">' + escapeHtml(n.date) + '</span>' +
          '</div>' +
          '<div class="notif-dropdown-title">' + escapeHtml(n.title) + '</div>' +
        '</div>';
    });

    $popup.html(
      '<div class="notif-dropdown-header">お知らせ</div>' +
      (itemsHtml || '<div class="notif-dropdown-empty">お知らせはありません</div>') +
      '<div class="notif-dropdown-footer"><a href="/notification/">全て表示</a></div>'
    );
  }

  /**
   * ヘッダーアカウントメニューの HTML を生成する
   * @param {string} uid   - Kratos identity ID
   * @param {string} email - ユーザーのメールアドレス
   * @returns {string} HTML 文字列
   */
  function buildHeaderUserMenuHtml(uid, email) {
    // UID は長いため先頭8文字のみ表示する
    var shortUid  = uid ? uid.slice(0, 8) + '…' : '---';
    var safeEmail = escapeHtml(email || '---');
    return (
      '<div id="js-nt-user-popup" class="popup-dropdown user-menu-dropdown" style="display:none;" role="dialog" aria-label="アカウントメニュー">' +
        '<div class="user-menu-dropdown-head">' +
          '<div class="user-menu-dropdown-info">' +
            '<div class="user-menu-dropdown-uid">ID: ' + escapeHtml(shortUid) + '</div>' +
            '<div class="user-menu-dropdown-email">' + safeEmail + '</div>' +
          '</div>' +
        '</div>' +
        '<ul class="user-menu-dropdown-nav">' +
          '<li><a href="/mypage/" class="user-menu-dropdown-nav-item"><span>マイページ</span></a></li>' +
          '<li><a href="/mypage/profile/" class="user-menu-dropdown-nav-item"><span>ユーザー情報</span></a></li>' +
          '<li><a href="/contact/" class="user-menu-dropdown-nav-item"><span>お問い合わせ</span></a></li>' +
          '<li><a href="/mypage/account/" class="user-menu-dropdown-nav-item user-menu-dropdown-nav-item--danger"><span>ネザーID退会</span></a></li>' +
        '</ul>' +
        '<div class="user-menu-dropdown-footer">' +
          '<button id="js-nt-popup-logout" class="user-menu-logout-btn">ログアウト</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* ===== リスト描画 ===== */
  // $list, $empty は fetchNotifications のコールバック内でも参照されるが、
  // var 宣言は巻き上げられるため非同期コールバックが実行される時点では初期化済みになっている
  var $list = $('#notif-list');
  var $empty = $('#notif-empty');

  /**
   * お知らせ行の HTML を生成する
   * @param {Object} item - お知らせオブジェクト
   * @returns {string} HTML 文字列
   */
  function buildRow(item) {
    return (
      '<div class="notif-row" data-id="' + item.id + '" data-service="' + item.filterKey + '" role="button" tabindex="0">' +
        '<span class="notif-date">' + item.date + '</span>' +
        '<span class="notif-badges">' +
          '<span class="badge ' + item.serviceClass + '">' + escapeHtml(item.service) + '</span>' +
          '<span class="badge ' + item.categoryClass + '">' + escapeHtml(item.category) + '</span>' +
        '</span>' +
        '<span class="notif-title">' + escapeHtml(item.title) + '</span>' +
        '<span class="notif-arrow">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>' +
        '</span>' +
      '</div>'
    );
  }

  /**
   * notifications データを元にリストを再描画する
   */
  function renderRows() {
    if (notifications.length === 0) {
      $list.hide();
      $empty.show();
      return;
    }
    var html = '';
    $.each(notifications, function(i, n) { html += buildRow(n); });
    $list.html(html).show();
    $empty.hide();
  }

  /* ===== フィルタータブ ===== */

  $('#notif-filters').on('click', '.filter-tab', function () {
    var $tab = $(this);
    var filter = $tab.data('filter');
    $('.filter-tab').removeClass('active');
    $tab.addClass('active');

    var $rows = $list.find('.notif-row');
    var visibleCount = 0;
    if (filter === 'all') {
      $rows.show(); visibleCount = $rows.length;
    } else {
      // data-service 属性が選択したフィルターキーに一致する行のみ表示する
      $rows.each(function () {
        if ($(this).data('service') === filter) { $(this).show(); visibleCount++; }
        else { $(this).hide(); }
      });
    }
    // 表示件数が0件になった場合は空状態メッセージを表示する
    if (visibleCount === 0) { $list.hide(); $empty.show(); }
    else { $list.show(); $empty.hide(); }
  });

  /* ===== 詳細モーダル ===== */

  var $overlay = $('#notif-modal-overlay');

  /**
   * ID からお知らせオブジェクトを検索する
   * @param {number} id - お知らせID
   * @returns {Object|undefined}
   */
  function findById(id) {
    return notifications.find(function(n) { return n.id === id; });
  }

  /**
   * 詳細モーダルを開く
   * @param {Object} item - お知らせオブジェクト
   */
  function openModal(item) {
    $('#modal-service-badge').attr('class', 'badge ' + item.serviceClass).text(item.service);
    $('#modal-category-badge').attr('class', 'badge ' + item.categoryClass).text(item.category);
    $('#modal-date').text(item.date);
    $('#notif-modal-title').text(item.title);
    // body は HTML を含む場合があるため innerHTML として挿入する
    $('#notif-modal-body').html(item.body);
    $overlay.addClass('is-open');
    $('body').addClass('modal-open');
  }

  // リスト行クリックでモーダルを開く
  $list.on('click', '.notif-row', function () {
    var id = parseInt($(this).data('id'), 10);
    var item = findById(id);
    if (item) openModal(item);
  });

  // モーダルを閉じる（× ボタンと「閉じる」ボタン）
  $('#notif-modal-close, #notif-modal-close-btn').on('click', function () {
    $overlay.removeClass('is-open');
    $('body').removeClass('modal-open');
  });

});
