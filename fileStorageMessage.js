const fs = require('fs').promises;
const path = require('path');

// مسیر فایل ذخیره‌سازی
const STORAGE_DIR = path.join(__dirname, 'storage');
const MESSAGE_FILE = path.join(STORAGE_DIR, 'messages.json');

// اطمینان از وجود دایرکتوری ذخیره‌سازی
async function ensureStorageDirectory() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating storage directory:', error);
  }
}

// خواندن پیام‌ها
async function readMessages() {
  try {
    await ensureStorageDirectory();
    const data = await fs.readFile(MESSAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // فایل وجود ندارد، ایجاد یک فایل خالی
      await fs.writeFile(MESSAGE_FILE, JSON.stringify([], null, 2));
      return [];
    }
    console.error('Error reading messages:', error);
    return [];
  }
}

// ذخیره پیام‌ها
async function saveMessages(messages) {
  try {
    await ensureStorageDirectory();
    await fs.writeFile(MESSAGE_FILE, JSON.stringify(messages, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving messages:', error);
    return false;
  }
}

// کلاس جایگزین برای Message
class FileMessage {
  constructor(data) {
    Object.assign(this, data);
    this.id = Date.now().toString();
    this.timestamp = this.timestamp || new Date();
  }

  // ایجاد جدول (برای سازگاری با کد قبلی)
  static async createTable() {
    // در اینجا نیازی به ایجاد جدول نیست، چون از فایل استفاده می‌کنیم
    return true;
  }

  // ذخیره پیام جدید
  async save() {
    try {
      const messages = await readMessages();
      messages.push(this);
      await saveMessages(messages);
      return this;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  // پیدا کردن پیام‌ها با فیلتر
  static async find(query = {}) {
    const messages = await readMessages();
    
    // ساخت شرط‌های مختلف برای فیلتر
    const filteredMessages = messages.filter(message => {
      // بررسی $or
      if (query.$or) {
        return query.$or.some(orCondition => {
          return Object.entries(orCondition).every(([key, value]) => {
            return message[key] === value;
          });
        });
      }
      
      // بررسی شرط‌های معمولی
      return Object.entries(query).every(([key, value]) => {
        // اگر شرط عملگر خاصی دارد (مثل $lt)
        if (key !== '$or' && typeof value === 'object') {
          if (value.$lt) return message[key] < value.$lt;
          // می‌توان عملگرهای دیگر را نیز اضافه کرد
        }
        
        return message[key] === value;
      });
    });
    
    // برای سازگاری با API مونگوس/mysql
    return {
      sort: (sortCriteria) => {
        // پیاده‌سازی مرتب‌سازی
        const [field, order] = Object.entries(sortCriteria)[0];
        const sortedMessages = [...filteredMessages].sort((a, b) => {
          if (order === 1 || order === 'asc') {
            return a[field] > b[field] ? 1 : -1;
          } else {
            return a[field] < b[field] ? 1 : -1;
          }
        });
        
        return {
          limit: (limit) => {
            // اعمال محدودیت تعداد
            const limitedMessages = sortedMessages.slice(0, limit);
            
            return {
              lean: () => {
                // برگرداندن داده‌ها بدون متدها
                return limitedMessages;
              }
            };
          },
          lean: () => {
            // بدون محدودیت تعداد
            return sortedMessages;
          }
        };
      },
      lean: () => {
        // بدون مرتب‌سازی
        return filteredMessages;
      },
      limit: (limit) => {
        const limitedMessages = filteredMessages.slice(0, limit);
        return {
          lean: () => limitedMessages
        };
      }
    };
  }
}

module.exports = FileMessage; 