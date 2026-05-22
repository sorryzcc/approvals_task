require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Supabase REST API 配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://opmnbkuvrvznfwneplcz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_Rzazc2Ho9N4OfE8Gmf22mA_ISdXL8lZ';

const API_VERSION = 'v1';

// 发送请求到 Supabase REST API
async function supabaseRequest(method, path, body = null) {
  const url = `${supabaseUrl}/rest/${API_VERSION}/${path}`;
  
  const options = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    // 获取响应内容
    const text = await response.text();
    
    if (!response.ok) {
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'API request failed');
      } catch {
        throw new Error(text || 'API request failed');
      }
    }

    // 如果响应为空，返回空数组或空对象
    if (!text || text.trim() === '') {
      return method === 'GET' ? [] : {};
    }

    return JSON.parse(text);
  } catch (error) {
    console.error('Supabase API 请求失败:', error.message);
    throw error;
  }
}

// 测试连接
async function testConnection() {
  try {
    // 尝试查询一条记录
    await supabaseRequest('GET', 'approvals?select=id&limit=1');
    console.log('✅ Supabase REST API 连接成功');
    return true;
  } catch (error) {
    // 如果表不存在，这是正常的，我们会在初始化时创建
    if (error.message.includes('Could not find the table')) {
      console.log('ℹ️  表不存在，将在初始化时创建');
      return true;
    }
    console.error('❌ Supabase 连接失败:', error.message);
    console.log('请检查 Supabase 配置是否正确');
    return false;
  }
}

// 初始化数据库（使用 SQL API）
async function initDatabase() {
  try {
    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, 'init_database.sql');
    const createTableSQL = fs.readFileSync(sqlFilePath, 'utf8');

    // 使用 SQL API 执行创建表
    const sqlUrl = `${supabaseUrl}/rest/${API_VERSION}/rpc/execute_sql`;
    const response = await fetch(sqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: createTableSQL })
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const error = JSON.parse(text);
        console.log('ℹ️  表创建结果:', error.message || '可能已存在');
      } catch {
        console.log('ℹ️  表创建结果:', text || '可能已存在');
      }
    } else {
      console.log('✅ 审批系统数据库初始化完成');
    }

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
  }
}

module.exports = {
  supabaseRequest,
  supabaseUrl,
  testConnection,
  initDatabase
};
