const mysql = require('mysql2/promise');

const commonPasswords = ['', 'root', 'password', '123456', 'admin', 'root123456'];

async function testPasswords() {
  for (const password of commonPasswords) {
    try {
      console.log(`尝试密码: "${password}"`);
      const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: password
      });
      
      console.log('✅ 密码正确！');
      
      // 检查数据库是否存在
      const [rows] = await connection.execute('SHOW DATABASES LIKE "approvals_db"');
      
      if (rows.length === 0) {
        console.log('创建数据库 approvals_db...');
        await connection.execute('CREATE DATABASE approvals_db DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci');
        console.log('✅ 数据库创建成功');
      } else {
        console.log('✅ 数据库已存在');
      }
      
      await connection.end();
      
      // 更新 .env 文件
      const fs = require('fs');
      const envContent = `DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=${password}
DB_NAME=approvals_db
PORT=3001
`;
      fs.writeFileSync('/Users/cong/Desktop/approvals/backend/.env', envContent);
      console.log('✅ .env 文件已更新');
      
      return password;
      
    } catch (error) {
      console.log(`❌ 密码错误: ${error.message}`);
    }
  }
  
  console.log('\n❌ 无法找到正确的密码');
  return null;
}

testPasswords();
