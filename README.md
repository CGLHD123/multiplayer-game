# 🎮 Party Games Hub

Nền tảng chơi game multiplayer real-time với 3 trò chơi vui nhộn cho 6-8 người chơi!

## 🎯 Các trò chơi

### 🎨 Quick Draw
Vẽ và đoán từ - người chơi lần lượt vẽ từ ngẫu nhiên, những người khác đoán để ghi điểm!

### 🧠 Trivia Battle
Đố vui kiến thức - trả lời 10 câu hỏi nhanh nhất để giành chiến thắng!

### 🃏 Spy Hunt
Tìm điệp viên - thảo luận để tìm ra ai là điệp viên giữa các bạn!

## 🚀 Cài đặt và Chạy Local

### Yêu cầu
- Node.js (phiên bản 14 trở lên)
- npm hoặc yarn

### Các bước

1. **Clone repository**
```bash
git clone <your-repo-url>
cd party-games-hub
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Chạy server**
```bash
npm start
```

4. **Mở trình duyệt**
```
http://localhost:3000
```

5. **Mở nhiều tab/thiết bị** để test multiplayer!

## 📦 Deploy lên Production

### Deploy Frontend (GitHub Pages)

1. Push code lên GitHub repository
2. Vào Settings → Pages
3. Chọn branch main và folder root
4. GitHub Pages sẽ host các file static

**LƯU Ý:** Frontend sẽ cần update URL của server trong file `script.js`:
```javascript
// Thay đổi dòng này
const socket = io();

// Thành
const socket = io('https://your-backend-url.com');
```

### Deploy Backend (Render.com - FREE)

1. **Tạo tài khoản tại** [render.com](https://render.com)

2. **Tạo Web Service mới:**
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Chọn repository của bạn

3. **Cấu hình:**
   - **Name:** party-games-backend
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

4. **Deploy!** Render sẽ tự động build và deploy

5. **Lấy URL** của server (vd: `https://party-games-backend.onrender.com`)

6. **Update frontend** để kết nối đến backend URL này

### Các nền tảng deploy khác

#### Railway.app (Miễn phí với giới hạn)
```bash
# Cài Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

#### Heroku
```bash
# Tạo app
heroku create party-games-app

# Push code
git push heroku main

# Mở app
heroku open
```

#### Vercel (Cho frontend)
```bash
# Cài Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 🌐 Cấu trúc dự án

```
party-games-hub/
├── index.html          # Giao diện chính
├── style.css           # Styling hiện đại với animations
├── script.js           # Client-side logic + Socket.IO
├── server.js           # Node.js server + game logic
├── package.json        # Dependencies
└── README.md          # Tài liệu này
```

## 🎮 Cách chơi

1. **Mở game** trên nhiều thiết bị/tab
2. **Nhập tên** và tham gia
3. **Host** (người đầu tiên) chọn game
4. **Tối thiểu 3 người** để bắt đầu
5. **Chơi và vui vẻ!** 🎉

## 🛠️ Công nghệ sử dụng

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Node.js, Express
- **Real-time:** Socket.IO
- **Design:** Modern UI với gradients, animations, responsive

## 🐛 Debug & Testing

### Test local với nhiều người chơi:
1. Mở nhiều tab trong trình duyệt
2. Hoặc mở trên nhiều thiết bị trong cùng mạng WiFi
3. Truy cập: `http://[YOUR-LOCAL-IP]:3000`

### Tìm local IP:
- **Windows:** `ipconfig`
- **Mac/Linux:** `ifconfig` hoặc `ip addr`

### Xem logs:
```bash
# Server logs
npm start

# Hoặc với auto-reload
npm run dev
```

## 📝 Tính năng

✅ Real-time multiplayer (6-8 người)  
✅ 3 mini-games khác nhau  
✅ Responsive design (mobile, tablet, desktop)  
✅ Giao diện đẹp với animations  
✅ Scoreboard real-time  
✅ Chat trong game  
✅ Canvas drawing với touch support  

## 🔮 Tính năng tương lai

- [ ] Thêm nhiều trò chơi mới
- [ ] Room system (nhiều phòng cùng lúc)
- [ ] Avatar tùy chỉnh
- [ ] Sound effects
- [ ] Leaderboard toàn server
- [ ] Private rooms với mã code
- [ ] Replays

## 📄 License

MIT License - Tự do sử dụng và chỉnh sửa!

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Tạo Pull Request hoặc mở Issue nếu bạn có ý tưởng!

---

**Chúc bạn chơi vui! 🎮🎉**