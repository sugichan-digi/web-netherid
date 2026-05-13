$(function () {
  /* セッションから取得したメールアドレスを保持する（退会確認の照合に使用） */
  var sessionEmail = '';

  /* ===== セッション取得 ===== */
  // 退会確認モーダルでのメール照合に使用するため、セッションから email を取得して保持する
  getSession()
    .done(function (data) {
      var traits = (data.identity || {}).traits || {};
      sessionEmail = traits.email || '';
    })
    .fail(function (xhr) {
      if (xhr.status !== 401) {
        showToast('セッション情報の取得に失敗しました', 'error');
      }
    });

  /* ===== 退会モーダル ===== */

  // モーダルを開く
  $('#js-deactivate-btn').on('click', function () {
    openModal();
  });

  // モーダルを閉じる（× ボタンとキャンセルボタン）
  $('#js-modal-close, #js-modal-cancel').on('click', function () {
    closeModal();
  });

  // オーバーレイ（背景）クリックで閉じる
  $('#js-deactivate-modal').on('click', function (e) {
    if ($(e.target).is('#js-deactivate-modal')) {
      closeModal();
    }
  });

  // Escape キーで閉じる
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  /**
   * 退会確認モーダルを開く
   * モーダル表示時に入力欄をリセットし、確認ボタンを無効化した状態にする。
   */
  function openModal() {
    $('#deactivate-email-confirm').val('');
    $('#js-modal-email-error').hide();
    // メールアドレスが一致するまで確認ボタンは押せない
    $('#js-modal-confirm').prop('disabled', true);
    $('#js-deactivate-modal').addClass('active');
    $('body').addClass('modal-open');
    // モーダルのアニメーション後にフォーカスを当てる（50ms 待機）
    setTimeout(function () {
      $('#deactivate-email-confirm').trigger('focus');
    }, 50);
  }

  /**
   * 退会確認モーダルを閉じる
   */
  function closeModal() {
    $('#js-deactivate-modal').removeClass('active');
    $('body').removeClass('modal-open');
  }

  /* ===== メール入力によるボタン活性化チェック ===== */
  // 入力値がセッションのメールアドレスと完全一致した場合にのみ確認ボタンを活性化する
  $('#deactivate-email-confirm').on('input', function () {
    var inputEmail = $(this).val().trim();
    var $btn       = $('#js-modal-confirm');
    var $err       = $('#js-modal-email-error');

    $err.hide();

    if (sessionEmail && inputEmail === sessionEmail) {
      $btn.prop('disabled', false);
    } else {
      $btn.prop('disabled', true);
    }
  });

  /* ===== 退会実行 ===== */
  $('#js-modal-confirm').on('click', function () {
    var inputEmail = $('#deactivate-email-confirm').val().trim();
    var $btn       = $(this);
    var $err       = $('#js-modal-email-error');

    $err.hide();

    // セッション取得が完了していない場合（getSession が非同期のため）
    if (!sessionEmail) {
      $err.text('セッション情報が取得できませんでした').show();
      return;
    }

    // メールアドレスの一致確認（二重チェック）
    if (inputEmail !== sessionEmail) {
      $err.text('メールアドレスが一致しません').show();
      $btn.prop('disabled', true);
      return;
    }

    $btn.prop('disabled', true).text('処理中...');

    // バックエンド API 経由で退会処理を実行する
    api({
      method: 'DELETE',
      path: '/account/deactivate',
      withAuth: true
    })
      .done(function () {
        // 退会成功後は Kratos のセッションを無効化してからトップへリダイレクトする
        // logout_url が取得できない場合は直接リダイレクトする（セッション切れと同等）
        kratosApi({ method: 'GET', path: '/self-service/logout/browser' })
          .always(function (logoutData) {
            var logoutUrl = (logoutData && logoutData.logout_url) ? logoutData.logout_url : null;
            if (logoutUrl) {
              // ?deactivated=1 でトップページに退会完了通知を表示させる
              window.location.href = logoutUrl + '&return_to=' + encodeURIComponent('/?deactivated=1');
            } else {
              window.location.href = '/?deactivated=1';
            }
          });
      })
      .fail(function (xhr) {
        closeModal();
        var json = xhr.responseJSON;
        var msg  = (json && json.message) ? json.message : '退会処理に失敗しました。お問い合わせください。';
        showToast(msg, 'error');
        // ボタンを元の状態（SVGアイコン付き）に戻す
        $btn.prop('disabled', false).html(
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">' +
          '<polyline points="3 6 5 6 21 6"/>' +
          '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
          '<path d="M10 11v6"/><path d="M14 11v6"/>' +
          '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>' +
          '</svg> 退会する'
        );
      });
  });

  /* ===== ログアウト ===== */

  $('#js-logout').on('click', function (e) {
    e.preventDefault();
    performLogout(); // common.js の共通ログアウト処理
  });
});
