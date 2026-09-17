# Pocket Australia — Bo & Bon

Một hành trình pixel 15 ngày, khởi hành từ Sydney. Bo và chú bull Pháp Bon dẫn bạn qua bản đồ, rừng cột đá Pinnacles, hồ hồng Hutt Lagoon, Kalbarri và Shell Beach.

**Website tĩnh, chạy trực tiếp trên GitHub Pages. Không cần mua server, cơ sở dữ liệu, API key hoặc cài Node để đăng web.**

## Đăng lên GitHub Pages

1. Giải nén `pocket-australia-github-pages.zip`.
2. Tạo repository **Public** trên GitHub, ví dụ `pocket-australia`.
3. Chọn **Add file → Upload files**. Kéo các file và thư mục đã giải nén vào, rồi **Commit changes**. `index.html` phải nằm ngay ở ngoài cùng repository, cùng cấp với thư mục `assets` — không nằm trong một thư mục `pocket-australia` khác.
4. Vào **Settings → Pages**.
5. Ở **Source**, chọn **Deploy from a branch**. Chọn nhánh **main**, thư mục **/(root)**, rồi **Save**.
6. Khi GitHub hoàn tất, mở đường dẫn website mà trang Pages hiển thị. Mỗi lần sửa file và commit, GitHub sẽ cập nhật website.

Đường dẫn tương đối đã được dùng cho toàn bộ hình ảnh, font và mã nguồn, nên website hoạt động cả khi tên repository nằm trong URL. Không upload riêng file ZIP; cần giải nén và upload nội dung.

[Hướng dẫn chính thức của GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Cách xem

- **Bắt đầu khám phá:** vào hành trình.
- **Cuộn tự nhiên:** đổi ngày và chuyển cảnh, không khóa thao tác cuộn.
- **Đi tiếp / quay lại:** chuyển từng ngày.
- **Số ngày / 15 ngày rong chơi:** mở lịch trình và chọn thẳng một ngày.
- **Bản đồ:** chuyển giữa toàn nước Úc và Tây Úc, chạm điểm đến để đọc và đi đến ngày tương ứng.
- **Chi tiết:** đọc nơi nghỉ dự kiến, cách di chuyển và điều mong đợi.
- **Giảm chuyển động:** ở cuối trang; website cũng tự tôn trọng cài đặt Reduce Motion của thiết bị.

## Nội dung chuyến đi

Đây là **tuyến đề xuất**, chưa có ngày đi, vé máy bay hay đặt phòng xác nhận. Tuyến giả định bay Sydney–Perth và thuê xe ở Tây Úc; không phải 15 ngày lái xe vòng quanh toàn nước Úc.

| Ngày | Dự kiến |
| --- | --- |
| 1 | Bay Sydney → Perth |
| 2 | Perth, chuẩn bị xe và nghỉ sau chuyến bay |
| 3 | Pinnacles, nghỉ vùng Cervantes |
| 4 | Cervantes → Geraldton |
| 5 | Hutt Lagoon → Kalbarri |
| 6 | Kalbarri |
| 7 | Kalbarri → Denham / Shark Bay |
| 8 | Shell Beach |
| 9 | Shark Bay |
| 10 | Shark Bay, ngày linh hoạt |
| 11 | Denham → Geraldton |
| 12 | Geraldton → Perth |
| 13 | Perth, ngày linh hoạt |
| 14 | Perth, chuẩn bị trở về |
| 15 | Bay Perth → Sydney |

Bon là nhân vật hoạt hình trên website; hình minh họa không thể hiện quy định mang chó vào các điểm đến. Màu hồng của Hutt Lagoon và điều kiện tham quan ngoài đời có thể thay đổi. Bản đồ chỉ mô tả tuyến, không chỉ đường lái xe.

## Sửa nội dung

Chỉnh `data.js` để thay lịch trình, mô tả, nơi nghỉ, câu nói của Bon hoặc các điểm trên bản đồ. `index.html` chứa nội dung chung; `styles.css` chứa bố cục và màu sắc; `app.js` chứa tương tác. Hình, sprite, font và đường bờ biển nằm trong `assets/`.

Không cần chạy lệnh build khi chỉ sửa các file này rồi upload lên GitHub.

## Điện thoại và hiệu năng

- Bố cục riêng cho màn hình nhỏ; hỗ trợ vùng an toàn ở phía trên/dưới iPhone.
- Dùng chiều cao `svh` cho cảnh và `dvh` cho cửa sổ, hạn chế nhảy bố cục khi thanh Safari thay đổi.
- Không tắt pinch-to-zoom. Điều khiển chính có vùng bấm từ 44px trở lên.
- Hình WebP và font cục bộ; không gọi dịch vụ bản đồ, máy chủ ngoài hoặc thư viện khi người xem truy cập.
- Chuyển cảnh bằng opacity và transform; scroll được gom vào requestAnimationFrame. Không có video nền hoặc WebGL.
- Native dialog giữ focus, hỗ trợ phím Escape, và trả lại vị trí cuộn khi đóng.
- Đã kiểm tra trực quan ở khung 390 × 844, 375 × 667 và 844 × 390; kiểm tra chọn ngày, bản đồ → ngày, mở/đóng thông tin, ngày tiếp/trước và chế độ giảm chuyển động trong trình duyệt Chrome.
- Hướng tới Safari hiện đại trên iOS 16 trở lên. Cần thử lại trên iPhone thật sau khi đăng; kiểm tra bố cục trong trình duyệt không thay thế kiểm thử phần cứng.

## Xem trước dành cho người sửa mã

Các file `package.json`, `package-lock.json` và `vite.config.mjs` chỉ phục vụ xem trước khi phát triển. Chúng không cần thiết để GitHub Pages chạy.

Nếu có Node.js phù hợp với Vite 7: chạy `npm ci`, rồi `npm run dev`. Chạy `npm run check` để kiểm tra cú pháp JavaScript. Không upload `node_modules`.

## Nguồn và quyền sử dụng

Xem `CREDITS.md`. Website không dùng cookie theo dõi, không gửi thông tin cá nhân và chỉ lưu lựa chọn giảm chuyển động trong trình duyệt của người xem.
