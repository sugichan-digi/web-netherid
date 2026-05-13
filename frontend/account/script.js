$(function () {

  getSession()
    .fail(function (xhr) {
      if (xhr.status !== 401) {
        showToast('セッション情報の取得に失敗しました', 'error');
      }
    });

  $('#js-logout').on('click', function (e) {
    e.preventDefault();
    performLogout();
  });
});
