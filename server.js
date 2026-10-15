const config = require('./src/config');
const { createApp } = require('./src/app');

const { app, firstAdmin } = createApp();
app.listen(config.PORT, () => {
  console.log(`ĐỦ WOW CHƯA đang chạy tại http://localhost:${config.PORT}`);
  if (firstAdmin) {
    console.log('==============================================================');
    console.log(' Tài khoản chủ Shop được tạo lần đầu (hãy ghi lại, chỉ hiện 1 lần):');
    console.log('   Tên đăng nhập: ' + firstAdmin.user);
    console.log('   Mật khẩu:      ' + firstAdmin.password);
    console.log(' Muốn tự đặt mật khẩu: đặt biến môi trường ADMIN_PASSWORD trước lần chạy đầu.');
    console.log('==============================================================');
  }
});
