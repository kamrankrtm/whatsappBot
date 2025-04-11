# ربات واتس‌اپ (WhatsApp Bot)

این پروژه یک ربات واتس‌اپ با API های متنوع برای ارسال پیام‌ها، فایل‌ها و مدیریت چت‌ها است. این ربات از کتابخانه whatsapp-web.js استفاده می‌کند و قابلیت‌های زیر را دارد:

<div dir="rtl">

## قابلیت‌ها
- ارسال پیام متنی به شماره‌های واتس‌اپ
- ارسال تصاویر و فایل‌ها
- ارسال پیام‌های گروهی به چندین شماره
- پاسخ خودکار به پیام‌های خاص
- دریافت تاریخچه چت با یک مخاطب
- اتصال به Headless Chrome روی Liara

## شروع کار

### پیش‌نیازها
- Node.js (نسخه 14 یا بالاتر)
- NPM (نسخه 6 یا بالاتر)
- دسترسی به اینترنت برای اتصال به واتس‌اپ وب
- (اختیاری) سرویس Headless Chrome روی Liara

### نصب و راه‌اندازی
1. کلون یا دانلود پروژه:
```bash
git clone <آدرس مخزن>
cd whatsapp-bot
```

2. نصب وابستگی‌ها:
```bash
npm install
```

3. تنظیم فایل .env:
فایل `.env.example` را به `.env` کپی کنید و مقادیر مورد نیاز را تنظیم کنید.
```bash
cp .env.example .env
```

4. برای استفاده از Headless Chrome روی Liara، موارد زیر را در فایل `.env` تنظیم کنید:
```
USE_REMOTE_CHROME=true
CHROME_WS_ENDPOINT=wss://<liara-chrome-app-url>
CHROME_TOKEN=<your-env-token>
```
توکن مورد نیاز را از بخش تنظیمات متغیرهای محیطی برنامه Headless Chrome در داشبورد Liara می‌توانید پیدا کنید.

5. اجرای ربات:
```bash
npm start
```

6. یک کد QR در ترمینال نمایش داده می‌شود. با استفاده از برنامه واتس‌اپ گوشی خود، به بخش تنظیمات رفته و گزینه «واتس‌اپ وب» را انتخاب کنید و کد QR را اسکن کنید.

### نحوه استفاده از API ها

#### ارسال پیام متنی
```http
POST /send-message
Content-Type: application/json

{
  "number": "989123456789",
  "message": "سلام، این یک پیام تست است."
}
```

#### ارسال فایل
```http
POST /send-file
Content-Type: application/json

{
  "number": "989123456789",
  "caption": "فایل مهم",
  "file_url": "https://example.com/file.pdf"
}
```

#### ارسال پیام به چند نفر
```http
POST /send-bulk
Content-Type: application/json

{
  "numbers": ["989123456789", "989198765432"],
  "message": "سلام به همه!"
}
```

#### دریافت تاریخچه چت
```http
GET /chat-history/989123456789?limit=50
```

## پاسخ‌های خودکار
این ربات به صورت خودکار به برخی کلمات کلیدی پاسخ می‌دهد، مانند:
- سلام
- چطوری
- ساعت چنده
- hello

برای اضافه کردن یا تغییر پاسخ‌های خودکار، متغیر `autoReplies` را در فایل `index.js` ویرایش کنید.

## استفاده از Headless Chrome روی Liara
برای بهبود عملکرد و کاهش مصرف منابع در سرور، می‌توانید از سرویس Headless Chrome در Liara استفاده کنید. این روش به خصوص برای اجرا روی سرورهای با منابع محدود بسیار مفید است.

1. ابتدا یک برنامه Headless Chrome در Liara ایجاد کنید.
2. متغیرهای محیطی زیر را در فایل `.env` تنظیم کنید:
   - `USE_REMOTE_CHROME=true`
   - `CHROME_WS_ENDPOINT=wss://your-chrome-app-url.liara.run`
   - `CHROME_TOKEN=token-from-liara-dashboard`

</div>

---

# WhatsApp Bot

This project is a WhatsApp bot with various APIs for sending messages, files, and managing chats. It uses the whatsapp-web.js library and has the following capabilities:

## Features
- Send text messages to WhatsApp numbers
- Send images and files
- Send bulk messages to multiple recipients
- Auto-reply to specific messages
- Get chat history with a contact
- Connect to Headless Chrome on Liara

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- NPM (version 6 or higher)
- Internet access to connect to WhatsApp Web
- (Optional) Headless Chrome service on Liara

### Installation and Setup
1. Clone or download the project:
```bash
git clone <repository-url>
cd whatsapp-bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure the .env file:
Copy the `.env.example` file to `.env` and configure the required values.
```bash
cp .env.example .env
```

4. To use Headless Chrome on Liara, set the following in your `.env` file:
```
USE_REMOTE_CHROME=true
CHROME_WS_ENDPOINT=wss://<liara-chrome-app-url>
CHROME_TOKEN=<your-env-token>
```
You can find the token from the Liara dashboard in your Headless Chrome app's environment variables settings.

5. Run the bot:
```bash
npm start
```

6. A QR code will be displayed in the terminal. Using your phone's WhatsApp app, go to settings and select "WhatsApp Web" option, then scan the QR code.

### How to Use the APIs

#### Send a Text Message
```http
POST /send-message
Content-Type: application/json

{
  "number": "989123456789",
  "message": "Hello, this is a test message."
}
```

#### Send a File
```http
POST /send-file
Content-Type: application/json

{
  "number": "989123456789",
  "caption": "Important file",
  "file_url": "https://example.com/file.pdf"
}
```

#### Send Bulk Messages
```http
POST /send-bulk
Content-Type: application/json

{
  "numbers": ["989123456789", "989198765432"],
  "message": "Hello everyone!"
}
```

#### Get Chat History
```http
GET /chat-history/989123456789?limit=50
```

## Auto-Replies
This bot automatically responds to certain keywords, such as:
- سلام (Hello in Persian)
- چطوری (How are you in Persian)
- ساعت چنده (What time is it in Persian)
- hello

To add or change auto-replies, edit the `autoReplies` variable in the `index.js` file.

## Using Headless Chrome on Liara
To improve performance and reduce resource usage on your server, you can use Liara's Headless Chrome service. This is particularly useful for deployment on servers with limited resources.

1. First, create a Headless Chrome app on Liara.
2. Set the following environment variables in your `.env` file:
   - `USE_REMOTE_CHROME=true`
   - `CHROME_WS_ENDPOINT=wss://your-chrome-app-url.liara.run`
   - `CHROME_TOKEN=token-from-liara-dashboard` 