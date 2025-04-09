# WhatsApp Messenger for Liara

این پروژه یک سرویس ارسال پیام واتس‌اپ است که بر روی پلتفرم لیارا اجرا می‌شود.

## ویژگی‌ها

- ارسال پیام متنی
- ارسال تصویر با کپشن
- پشتیبانی از شماره‌های ایرانی
- امنیت بالا با استفاده از LocalAuth

## نحوه استفاده

1. ابتدا پروژه را در لیارا دیپلوی کنید
2. پس از دیپلوی، کد QR در لاگ‌های برنامه نمایش داده می‌شود
3. کد QR را با واتس‌اپ موبایل خود اسکن کنید
4. از API زیر برای ارسال پیام استفاده کنید:

```bash
POST /send-message
Content-Type: application/json

{
    "number": "09123456789",  // شماره بدون صفر
    "message": "سلام، این یک پیام تست است",
    "image_url": "https://example.com/image.jpg"  // اختیاری
}
```

## نکات مهم

- این پروژه از `whatsapp-web.js` استفاده می‌کند که نیاز به مرورگر دارد
- در لیارا، مرورگر به صورت headless اجرا می‌شود
- برای امنیت بیشتر، از LocalAuth استفاده شده است
- شماره‌ها باید بدون صفر وارد شوند (مثلاً 9123456789)

## نصب و راه‌اندازی

1. کلون کردن پروژه:
```bash
git clone [آدرس ریپوزیتوری]
```

2. نصب وابستگی‌ها:
```bash
npm install
```

3. اجرای پروژه:
```bash
npm start
``` 