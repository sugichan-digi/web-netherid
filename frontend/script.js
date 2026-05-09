$(function () {

  // URLパラメータ: ?deactivated=1 の場合、お知らせバナーを表示
  (function () {
    var params = new URLSearchParams(window.location.search);
    if (params.get('deactivated') === '1') {
      $('#lp-deactivated-notice').show();
    }
  })();

  // スムーススクロール（アンカーリンク）
  $('a[href^="#"]').on('click', function (e) {
    var href = $(this).attr('href');
    if (href === '#') return;
    var target = $(href);
    if (target.length) {
      e.preventDefault();
      $('html, body').animate({ scrollTop: target.offset().top - 72 }, 400);
    }
  });

  // ハンバーガーメニュー
  var $btn     = $('#hamburger-btn');
  var $nav     = $('#mobile-nav');
  var $overlay = $('#mobile-nav-overlay');

  function openMenu() {
    $btn.addClass('open').attr('aria-expanded', 'true');
    $nav.addClass('active').attr('aria-hidden', 'false');
    $overlay.addClass('active');
  }

  function closeMenu() {
    $btn.removeClass('open').attr('aria-expanded', 'false');
    $nav.removeClass('active').attr('aria-hidden', 'true');
    $overlay.removeClass('active');
  }

  $btn.on('click', function () {
    if ($btn.hasClass('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  $overlay.on('click', closeMenu);

  $nav.find('a').on('click', closeMenu);

  // ----- ログイン状態確認・ヘッダー切り替え -----

  var LP_NOTIFICATIONS = [
    { badge: 'ネザーID',       badgeCls: 'badge-service-id',      date: '2026-05-09', title: '【重要】メンテナンスのお知らせ（5/15 2:00〜5:00）' },
    { badge: 'ネザーM&A',     badgeCls: 'badge-service-ma',      date: '2026-05-01', title: 'ネザーM&A — 売買契約書テンプレートをリニューアルしました' },
    { badge: 'ネザーキーワード', badgeCls: 'badge-service-keyword', date: '2026-04-25', title: 'ネザーキーワード — サジェスト件数が最大500件に拡張されました' },
    { badge: 'ネザーサーバー',  badgeCls: 'badge-service-server',  date: '2026-04-20', title: 'ネザーサーバー — PHP 8.4 対応完了のお知らせ' },
    { badge: 'ネザードメイン',  badgeCls: 'badge-service-domain',  date: '2026-04-15', title: 'ネザードメイン — .shop ドメインが特価キャンペーン中！' }
  ];

  function escapeHtml(str) {
    return $('<div>').text(String(str)).html();
  }

  function buildNotifDropdownHtml() {
    var itemsHtml = '';
    $.each(LP_NOTIFICATIONS, function (i, n) {
      itemsHtml +=
        '<div class="notif-dropdown-item">' +
          '<div class="notif-dropdown-meta">' +
            '<span class="badge ' + escapeHtml(n.badgeCls) + '">' + escapeHtml(n.badge) + '</span>' +
            '<span class="notif-dropdown-date">' + escapeHtml(n.date) + '</span>' +
          '</div>' +
          '<div class="notif-dropdown-title">' + escapeHtml(n.title) + '</div>' +
        '</div>';
    });
    return (
      '<div id="js-lp-notif-popup" class="popup-dropdown notif-dropdown" style="display:none;" role="dialog" aria-label="お知らせ">' +
        '<div class="notif-dropdown-header">お知らせ</div>' +
        itemsHtml +
        '<div class="notif-dropdown-footer"><a href="/notification/">全て表示</a></div>' +
      '</div>'
    );
  }

  function buildUserMenuHtml(uid, email) {
    var shortUid  = uid ? uid.slice(0, 8) + '…' : '---';
    var safeEmail = escapeHtml(email || '---');
    return (
      '<div id="js-lp-user-popup" class="popup-dropdown user-menu-dropdown" style="display:none;" role="dialog" aria-label="アカウントメニュー">' +
        '<div class="user-menu-dropdown-head">' +
          '<div class="user-menu-dropdown-info">' +
            '<div class="user-menu-dropdown-uid">ID: ' + escapeHtml(shortUid) + '</div>' +
            '<div class="user-menu-dropdown-email">' + safeEmail + '</div>' +
          '</div>' +
          '<div class="user-menu-dropdown-rp">' +
            '<div style="display:flex;align-items:baseline;gap:3px;justify-content:flex-end;">' +
              '<span class="user-menu-dropdown-rp-val">0</span>' +
              '<span style="font-size:12px;">RP</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<ul class="user-menu-dropdown-nav">' +
          '<li><a href="/mypage/" class="user-menu-dropdown-nav-item">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 -960 960 960" width="20" height="20"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h167q11-35 43-57.5t70-22.5q40 0 71.5 22.5T594-840h166q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120zm0-80h560v-560h-80v120H280v-120h-80zm280-560q17 0 28.5-11.5T520-800t-11.5-28.5T480-840t-28.5 11.5T440-800t11.5 28.5T480-760"/></svg>' +
            '<span>マイページ</span></a></li>' +
          '<li><a href="/mypage/profile/" class="user-menu-dropdown-nav-item">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 -960 960 960" width="20" height="20"><path d="M480-480q-66 0-113-47t-47-113 47-113 113-47 113 47 47 113-47 113-113 47M160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440t130 15.5T736-378q29 15 46.5 43.5T800-272v112z"/></svg>' +
            '<span>ユーザー情報</span></a></li>' +
          '<li><a href="/notification/" class="user-menu-dropdown-nav-item">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 -960 960 960" width="20" height="20"><path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880t42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80zM480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80M320-280h320v-280q0-66-47-113t-113-47-113 47-47 113z"/></svg>' +
            '<span>お知らせ</span></a></li>' +
          '<li><a href="/contact/" class="user-menu-dropdown-nav-item">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="20" height="20"><path d="M10.597 16q0-2.024.362-2.912.363-.888 1.538-1.938 1.025-.9 1.562-1.562.538-.663.538-1.513 0-1.025-.688-1.7T11.997 5.7q-1.275 0-1.938.775-.662.776-.937 1.575l-2.575-1.1q.525-1.6 1.925-2.775T11.997 3q2.625 0 4.037 1.463 1.413 1.461 1.413 3.512 0 1.25-.538 2.138-.537.887-1.687 2.012-1.226 1.175-1.488 1.787-.262.614-.262 2.088zm1.4 6q-.825 0-1.413-.587A1.93 1.93 0 0 1 9.997 20q0-.824.587-1.413A1.93 1.93 0 0 1 11.997 18q.825 0 1.412.587.588.588.588 1.413 0 .824-.588 1.413a1.93 1.93 0 0 1-1.412.587"/></svg>' +
            '<span>お問い合わせ</span></a></li>' +
          '<li><a href="/mypage/account/" class="user-menu-dropdown-nav-item user-menu-dropdown-nav-item--danger">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 21 21" width="20" height="20"><path d="m18.775 20.122-2.625-2.625H3v-2.8q0-.85.438-1.563.437-.712 1.162-1.087a13.7 13.7 0 0 1 2.288-.925 16.4 16.4 0 0 1 2.362-.525L.375 1.722 1.8.297l18.4 18.4zM17.4 12.047q.725.35 1.15 1.062t.45 1.538l-3.35-3.35q.45.175.888.35.437.175.862.4m-4.2-3.2-5.55-5.55A4.1 4.1 0 0 1 9.1 1.972a3.9 3.9 0 0 1 1.9-.475q1.65 0 2.825 1.175T15 5.497q0 1.025-.475 1.9a4.1 4.1 0 0 1-1.325 1.45"/></svg>' +
            '<span>ネザーID退会</span></a></li>' +
        '</ul>' +
        '<div class="user-menu-dropdown-footer">' +
          '<button id="js-lp-popup-logout" class="user-menu-logout-btn">ログアウト</button>' +
        '</div>' +
      '</div>'
    );
  }

  function setupLoggedInHeader(sessionData) {
    var identity = sessionData.identity || {};
    var traits   = identity.traits || {};
    var uid      = identity.id || '';
    var email    = traits.email || '';

    var $actions = $('.header-actions');
    $actions.empty();

    // 通知ボタン
    var $notifWrap = $('<div class="popup-wrap"></div>');
    var $notifBtn  = $(
      '<button class="header-icon-btn" id="js-lp-notif-btn" title="お知らせ" aria-expanded="false">' +
        '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor">' +
          '<path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880t42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80zM480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80M320-280h320v-280q0-66-47-113t-113-47-113 47-47 113z"/>' +
        '</svg>' +
      '</button>'
    );
    var $notifPopup = $(buildNotifDropdownHtml());
    $notifWrap.append($notifBtn, $notifPopup);

    // アカウントボタン
    var $userWrap = $('<div class="popup-wrap"></div>');
    var $userBtn  = $(
      '<button class="header-icon-btn" id="js-lp-user-btn" title="アカウント" aria-expanded="false">' +
        '<svg width="22" height="22" viewBox="0 -960 960 960" fill="currentColor">' +
          '<path d="M480-480q-66 0-113-47t-47-113 47-113 113-47 113 47 47 113-47 113-113 47M160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440t130 15.5T736-378q29 15 46.5 43.5T800-272v112z"/>' +
        '</svg>' +
      '</button>'
    );
    var $userPopup = $(buildUserMenuHtml(uid, email));
    $userWrap.append($userBtn, $userPopup);

    $actions.append($notifWrap, $userWrap);

    // 通知ポップアップ開閉
    $notifBtn.on('click', function (e) {
      e.stopPropagation();
      $userPopup.hide();
      $userBtn.attr('aria-expanded', 'false');
      var isOpen = $notifPopup.is(':visible');
      $notifPopup.toggle(!isOpen);
      $(this).attr('aria-expanded', String(!isOpen));
    });

    // アカウントポップアップ開閉
    $userBtn.on('click', function (e) {
      e.stopPropagation();
      $notifPopup.hide();
      $notifBtn.attr('aria-expanded', 'false');
      var isOpen = $userPopup.is(':visible');
      $userPopup.toggle(!isOpen);
      $(this).attr('aria-expanded', String(!isOpen));
    });

    // 通知項目クリック → お知らせ一覧へ
    $notifPopup.on('click', '.notif-dropdown-item', function () {
      window.location.href = '/notification/';
    });

    // ログアウト
    $userPopup.find('#js-lp-popup-logout').on('click', function () {
      performLogout();
    });

    // ポップアップ外クリックで閉じる
    $(document).on('click.lp-popup', function (e) {
      if (!$(e.target).closest($notifWrap).length) {
        $notifPopup.hide();
        $notifBtn.attr('aria-expanded', 'false');
      }
      if (!$(e.target).closest($userWrap).length) {
        $userPopup.hide();
        $userBtn.attr('aria-expanded', 'false');
      }
    });

    // ESCキーで閉じる
    $(document).on('keydown.lp-popup', function (e) {
      if (e.key === 'Escape') {
        $notifPopup.hide();
        $userPopup.hide();
        $notifBtn.attr('aria-expanded', 'false');
        $userBtn.attr('aria-expanded', 'false');
      }
    });
  }

  getSessionSilent()
    .done(function (data) {
      setupLoggedInHeader(data);
    });
    // 未ログイン時はデフォルトのログイン/登録ボタンをそのまま表示

});
