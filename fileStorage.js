const fs = require('fs').promises;
const path = require('path');

// مسیر فایل ذخیره‌سازی
const STORAGE_DIR = path.join(__dirname, 'storage');
const BOT_CONFIG_FILE = path.join(STORAGE_DIR, 'bot_configs.json');

// اطمینان از وجود دایرکتوری ذخیره‌سازی
async function ensureStorageDirectory() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating storage directory:', error);
  }
}

// خواندن پیکربندی‌های بات
async function readBotConfigs() {
  try {
    await ensureStorageDirectory();
    const data = await fs.readFile(BOT_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // فایل وجود ندارد، ایجاد یک فایل خالی
      await fs.writeFile(BOT_CONFIG_FILE, JSON.stringify([], null, 2));
      return [];
    }
    console.error('Error reading bot configs:', error);
    return [];
  }
}

// ذخیره پیکربندی‌های بات
async function saveBotConfigs(configs) {
  try {
    await ensureStorageDirectory();
    await fs.writeFile(BOT_CONFIG_FILE, JSON.stringify(configs, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving bot configs:', error);
    return false;
  }
}

// کلاس جایگزین برای BotConfig
class FileBotConfig {
  // پیدا کردن همه پیکربندی‌ها با فیلتر اختیاری
  static async find(query = {}) {
    const configs = await readBotConfigs();
    
    // اگر query خالی باشد، همه پیکربندی‌ها را برگردان
    if (Object.keys(query).length === 0) {
      return {
        lean: function() {
          return configs;
        }
      };
    }
    
    // فیلتر پیکربندی‌ها براساس query
    const filteredConfigs = configs.filter(config => {
      for (const [key, value] of Object.entries(query)) {
        if (config[key] !== value) {
          return false;
        }
      }
      return true;
    });
    
    return {
      lean: function() {
        return filteredConfigs;
      }
    };
  }
  
  // پیدا کردن یک پیکربندی با ID
  static async findById(id) {
    const configs = await readBotConfigs();
    return configs.find(config => config.id === id) || null;
  }
  
  // پیدا کردن یک پیکربندی با query
  static async findOne(query) {
    const configs = await readBotConfigs();
    
    return configs.find(config => {
      for (const [key, value] of Object.entries(query)) {
        if (config[key] !== value) {
          return false;
        }
      }
      return true;
    }) || null;
  }
  
  // پیدا کردن و به‌روزرسانی یک پیکربندی
  static async findOneAndUpdate(query, updateData, options = {}) {
    const configs = await readBotConfigs();
    let found = false;
    let updatedConfig = null;
    
    const newConfigs = configs.map(config => {
      // بررسی تطابق با query
      let matches = true;
      for (const [key, value] of Object.entries(query)) {
        if (config[key] !== value) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        found = true;
        // به‌روزرسانی فیلدها
        updatedConfig = { ...config, ...updateData };
        return updatedConfig;
      }
      
      return config;
    });
    
    // اگر پیدا نشد و نیاز به ایجاد دارد
    if (!found && options.upsert) {
      updatedConfig = { ...query, ...updateData, id: Date.now().toString() };
      newConfigs.push(updatedConfig);
    }
    
    // ذخیره تغییرات
    await saveBotConfigs(newConfigs);
    return updatedConfig;
  }
  
  // ایجاد یک پیکربندی جدید
  static async create(data) {
    const configs = await readBotConfigs();
    const newConfig = { ...data, id: Date.now().toString() };
    
    configs.push(newConfig);
    await saveBotConfigs(configs);
    
    return newConfig;
  }
  
  // به‌روزرسانی یک پیکربندی با ID
  static async update(id, data) {
    const configs = await readBotConfigs();
    let updatedConfig = null;
    
    const newConfigs = configs.map(config => {
      if (config.id === id) {
        updatedConfig = { ...config, ...data };
        return updatedConfig;
      }
      return config;
    });
    
    await saveBotConfigs(newConfigs);
    return updatedConfig;
  }
  
  // حذف یک پیکربندی با ID
  static async delete(id) {
    const configs = await readBotConfigs();
    const newConfigs = configs.filter(config => config.id !== id);
    
    await saveBotConfigs(newConfigs);
    return true;
  }
  
  // حذف یک پیکربندی با query
  static async findOneAndDelete(query) {
    const configs = await readBotConfigs();
    let deletedConfig = null;
    
    // پیدا کردن پیکربندی مطابق با query
    const configToDelete = configs.find(config => {
      for (const [key, value] of Object.entries(query)) {
        if (config[key] !== value) {
          return false;
        }
      }
      return true;
    });
    
    if (configToDelete) {
      deletedConfig = configToDelete;
      // حذف از آرایه
      const newConfigs = configs.filter(config => config !== configToDelete);
      await saveBotConfigs(newConfigs);
    }
    
    return deletedConfig;
  }
}

module.exports = FileBotConfig; 