# راهنمای استقرار بات واتساپ در لیارا

این مستند نحوه استقرار برنامه مدیریت بات واتساپ در سرویس ابری لیارا را شرح می‌دهد.

## پیش‌نیازها

1. داشتن حساب کاربری در [لیارا](https://liara.ir)
2. نصب [Liara CLI](https://docs.liara.ir/cli/install)
3. لاگین کردن در CLI با دستور `liara login`

## مراحل استقرار

### 1. ایجاد دیتابیس MongoDB در لیارا

1. وارد داشبورد لیارا شوید
2. به بخش "دیتابیس‌ها" بروید
3. روی "ایجاد دیتابیس" کلیک کنید
4. نوع دیتابیس را "MongoDB" انتخاب کنید
5. پلن مناسب را انتخاب کنید (پیشنهاد: مریخ یا مشتری)
6. نام دلخواه برای دیتابیس وارد کنید (مثلاً: `whatsappbot-db`)
7. روی "ایجاد دیتابیس" کلیک کنید
8. پس از ایجاد، اطلاعات اتصال به دیتابیس را یادداشت کنید

### 2. ایجاد سرویس Chrome Headless

برای اجرای بات واتساپ، به یک سرویس Chrome Headless نیاز داریم:

1. به بخش "برنامه‌ها" بروید
2. روی "ایجاد برنامه" کلیک کنید
3. پلتفرم "Docker" را انتخاب کنید
4. یک نام برای برنامه وارد کنید (مثلاً: `chrome-headless`)
5. پلن مناسب را انتخاب کنید (پیشنهاد: مریخ یا مشتری)
6. پس از ایجاد برنامه، به بخش "تنظیمات" آن بروید
7. در قسمت "متغیرهای محیطی" متغیر `CHROME_OPTS` را با مقدار زیر اضافه کنید:
   ```
   --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-accelerated-2d-canvas --no-first-run --no-zygote --disable-gpu --window-size=1280,720
   ```
8. در تب "فایل‌ها" یک فایل `Dockerfile` با محتوای زیر ایجاد کنید:
   ```dockerfile
   FROM zenika/alpine-chrome:with-puppeteer
   
   ENV CONNECTION_TIMEOUT=60000
   ENV CHROME_PATH=/usr/bin/chromium-browser
   
   WORKDIR /app
   
   COPY . .
   
   RUN npm install
   
   EXPOSE 3000
   
   CMD ["node", "server.js"]
   ```
9. یک فایل `server.js` با محتوای زیر ایجاد کنید:
   ```javascript
   const puppeteer = require('puppeteer');
   const http = require('http');
   
   (async () => {
     try {
       const browser = await puppeteer.launch({
         headless: true,
         executablePath: process.env.CHROME_PATH || undefined,
         args: (process.env.CHROME_OPTS || '').split(' ').filter(Boolean),
       });
       
       const wsEndpoint = browser.wsEndpoint();
       console.log(`Chrome DevTools WebSocket endpoint: ${wsEndpoint}`);
       
       // Endpoint for health check and to retrieve the WebSocket URL
       const server = http.createServer((req, res) => {
         if (req.url === '/json/version') {
           res.writeHead(200, { 'Content-Type': 'application/json' });
           res.end(JSON.stringify({
             webSocketDebuggerUrl: wsEndpoint,
             status: 'ok'
           }));
         } else {
           res.writeHead(200, { 'Content-Type': 'text/plain' });
           res.end('Chrome Headless Server Running');
         }
       });
       
       const port = process.env.PORT || 3000;
       server.listen(port, () => {
         console.log(`Server listening on port ${port}`);
       });
       
       // Handle browser disconnection
       browser.on('disconnected', () => {
         console.log('Browser disconnected. Exiting...');
         process.exit(1);
       });
       
     } catch (error) {
       console.error('Error launching browser:', error);
       process.exit(1);
     }
   })();
   ```
10. یک فایل `package.json` با محتوای زیر ایجاد کنید:
    ```json
    {
      "name": "chrome-headless",
      "version": "1.0.0",
      "main": "server.js",
      "dependencies": {
        "puppeteer": "^13.0.0"
      }
    }
    ```
11. دستور `liara deploy` را اجرا کنید تا سرویس Chrome Headless استقرار یابد
12. پس از استقرار، URL سرویس را یادداشت کنید (مثلاً: `https://chrome-headless.liara.run`)

### 3. استقرار برنامه اصلی

1. فایل‌های پروژه را به لیارا دیپلوی کنید:
   ```bash
   liara deploy
   ```

2. پس از استقرار، متغیرهای محیطی زیر را در تنظیمات برنامه در داشبورد لیارا تنظیم کنید:
   
   - `USE_REMOTE_CHROME`: `true`
   - `CHROME_WS_ENDPOINT`: `wss://chrome-headless.liara.run` (آدرس سرویس Chrome Headless)
   - `CHROME_TOKEN`: (در صورت نیاز به توکن امنیتی، آن را اینجا وارد کنید)
   - `MONGODB_HOST`: (آدرس میزبان دیتابیس)
   - `MONGODB_PORT`: (پورت دیتابیس، معمولاً 27017)
   - `MONGODB_DATABASE`: (نام دیتابیس)
   - `MONGODB_USERNAME`: (نام کاربری دیتابیس)
   - `MONGODB_PASSWORD`: (رمز عبور دیتابیس)

3. برنامه را راه‌اندازی مجدد کنید تا تغییرات اعمال شود

### 4. بررسی وضعیت برنامه

پس از استقرار کامل، می‌توانید از طریق آدرس زیر به برنامه دسترسی داشته باشید:
```
https://whatsappbot.liara.run
```

برای بررسی وضعیت برنامه، به آدرس زیر مراجعه کنید:
```
https://whatsappbot.liara.run/health
```

## نکات مهم

1. اطمینان حاصل کنید که دیسک با نام `data` در برنامه شما ایجاد شده باشد
2. برای اتصال به واتساپ، به QR کد نیاز دارید که هنگام اولین راه‌اندازی در لاگ‌های برنامه نمایش داده می‌شود
3. برای استفاده از API، به مستندات API در فایل README.md مراجعه کنید 