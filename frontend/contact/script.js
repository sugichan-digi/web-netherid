$(function () {

  // セッション確認
  getSession()
    .fail(function (xhr) {
      if (xhr.status !== 401) {
        showToast('セッション情報の取得に失敗しました', 'error');
      }
    });

  // ===== タブ切り替え =====

  $(document).on('click', '.mp-tab', function () {
    var tab = $(this).data('tab');
    $('.mp-tab').removeClass('mp-tab--active').attr('aria-selected', 'false');
    $(this).addClass('mp-tab--active').attr('aria-selected', 'true');
    $('.mp-tab-panel').removeClass('mp-tab-panel--active');
    $('.mp-tab-panel[data-panel="' + tab + '"]').addClass('mp-tab-panel--active');

    if (tab === 'list') {
      fetchInquiryList();
    }
  });

  // ===== お問い合わせ送信 =====

  $('#js-contact-form').on('submit', function (e) {
    e.preventDefault();

    var $btn     = $('#js-contact-submit-btn');
    var $formErr = $('#js-contact-form-error');
    var service  = $('#contact-service').val();
    var subject  = $('#contact-subject').val().trim();
    var body     = $('#contact-body').val().trim();

    $('#js-service-error, #js-subject-error, #js-body-error').hide();
    $formErr.hide();

    var hasError = false;
    if (!service) {
      $('#js-service-error').text('対象サービスを選択してください').show();
      hasError = true;
    }
    if (!subject) {
      $('#js-subject-error').text('件名を入力してください').show();
      hasError = true;
    }
    if (!body) {
      $('#js-body-error').text('お問い合わせ内容を入力してください').show();
      hasError = true;
    }
    if (hasError) return;

    $btn.prop('disabled', true).text('送信中...');

    // セッションからメールアドレスを取得
    getSessionSilent()
      .done(function(sessionData) {
        var email = (sessionData.identity && sessionData.identity.traits && sessionData.identity.traits.email) ? sessionData.identity.traits.email : '';
        
        if (!email) {
          showToast('メールアドレスが取得できません。ログインし直してください', 'error');
          $btn.prop('disabled', false).text('送信する');
          return;
        }

        api({
          method: 'POST',
          path: '/inquiries',
          data: { email: email, type: service, subject: subject, body: body },
          withAuth: true
        })
          .done(function () {
            showToast('お問い合わせを送信しました。回答をお待ちください', 'success');
            $('#js-contact-form')[0].reset();
          })
          .fail(function () {
            $formErr.text('送信に失敗しました。しばらく経ってから再度お試しください').show();
          })
          .always(function () {
            $btn.prop('disabled', false).text('送信する');
          });
      })
      .fail(function() {
        showToast('セッションの確認に失敗しました。ログインし直してください', 'error');
        $btn.prop('disabled', false).text('送信する');
      });
  });

  // ===== お問い合わせ一覧取得 =====

  function fetchInquiryList() {
    var $wrap = $('#js-contact-list-wrap');
    $wrap.html('<div class="mp-contact-loading">読み込み中...</div>');

    api({
      method: 'GET',
      path: '/inquiries',
      withAuth: true
    })
      .done(function (data) {
        var list = data.inquiries || [];
        if (list.length === 0) {
          $wrap.html(
            '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-dark,#d1d5db)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
            '</svg>' +
            '<span>お問い合わせ履歴はありません</span>'
          ).addClass('mp-contact-empty');
          return;
        }

        $wrap.removeClass('mp-contact-empty').empty();
        var $table = $('<table class="mp-contact-table"><thead><tr><th>送信日</th><th>サービス</th><th>件名</th><th>状況</th></tr></thead><tbody></tbody></table>');
        var $tbody = $table.find('tbody');

        $.each(list, function (i, item) {
          var date = item.created_at ? item.created_at.split('T')[0].replace(/-/g, '/') : '---';
          var statusText = (item.status === 'open') ? '受付中' : (item.status === 'closed' ? '完了' : item.status);
          var statusClass = 'status-' + item.status;
          
          var $tr = $(
            '<tr>' +
              '<td class="col-date">' + date + '</td>' +
              '<td class="col-service">' + escapeHtml(getServiceName(item.type)) + '</td>' +
              '<td class="col-subject">' + escapeHtml(item.subject) + '</td>' +
              '<td class="col-status"><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
            '</tr>'
          );
          $tbody.append($tr);
        });

        $wrap.append($table);
      })
      .fail(function () {
        $wrap.html('<div class="alert alert-danger">履歴の取得に失敗しました</div>');
      });
  }

  function getServiceName(key) {
    var services = {
      'nether-id': 'ネザーID',
      'nether-ma': 'ネザーM&A',
      'nether-site-market': 'ネザーサイトマーケット',
      'nether-keyword': 'ネザーキーワード',
      'nether-server': 'ネザーサーバー',
      'nether-domain': 'ネザードメイン',
      'nether-domain-market': 'ネザードメインマーケット',
      'cd-domain': '中古ドメイン販売屋さん',
      'nether-affiliate': 'ネザーIDアフィリエイト',
      'nether-tools': 'ネザーツールズ',
      'other': 'その他'
    };
    return services[key] || key;
  }

  function escapeHtml(str) {
    return $('<div>').text(String(str)).html();
  }

});
