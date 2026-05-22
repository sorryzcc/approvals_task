const mysql = require('mysql2/promise');

// MySQL 连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'approvals_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL 数据库连接失败:', error.message);
    return false;
  }
}

// 初始化数据库表
async function initDatabase() {
  const connection = await pool.getConnection();
  
  try {
    // 创建审批表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL COMMENT '标题',
        applicant VARCHAR(100) NOT NULL COMMENT '申请人',
        department VARCHAR(100) NOT NULL COMMENT '部门',
        type VARCHAR(50) NOT NULL COMMENT '类型',
        amount DECIMAL(10, 2) DEFAULT 0 COMMENT '金额',
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '状态',
        description TEXT COMMENT '说明',
        approver VARCHAR(100) DEFAULT NULL COMMENT '审批人',
        approve_time DATETIME DEFAULT NULL COMMENT '审批时间',
        comment TEXT COMMENT '审批意见',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_status (status),
        INDEX idx_type (type),
        INDEX idx_applicant (applicant),
        INDEX idx_create_time (create_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审批记录表'
    `);

    console.log('✅ 数据库表初始化成功');

    // 检查是否有初始数据，如果没有则插入示例数据
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM approvals');
    
    if (rows[0].count === 0) {
      // 插入示例数据
      const sampleData = [
        {
          id: '1',
          title: '采购申请 - 办公用品',
          applicant: '张三',
          department: '技术部',
          type: '采购',
          amount: 5000,
          status: 'pending',
          description: '需要采购一批办公用品，包括笔记本电脑、显示器等',
          approver: null,
          approve_time: null,
          comment: '',
          create_time: '2026-05-15 10:30:00'
        },
        {
          id: '2',
          title: '请假申请 - 年假',
          applicant: '王五',
          department: '市场部',
          type: '请假',
          amount: 0,
          status: 'approved',
          description: '申请年假5天，从2026-05-20到2026-05-24',
          approver: '赵六',
          approve_time: '2026-05-14 14:30:00',
          comment: '同意',
          create_time: '2026-05-14 09:00:00'
        },
        {
          id: '3',
          title: '报销申请 - 差旅费',
          applicant: '孙七',
          department: '销售部',
          type: '报销',
          amount: 3200,
          status: 'rejected',
          description: '出差北京客户拜访，交通及住宿费用报销',
          approver: '周八',
          approve_time: '2026-05-14 10:00:00',
          comment: '缺少发票凭证，请补充后重新提交',
          create_time: '2026-05-13 16:20:00'
        }
      ];

      for (const data of sampleData) {
        await connection.query(
          `INSERT INTO approvals 
           (id, title, applicant, department, type, amount, status, description, 
            approver, approve_time, comment, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id,
            data.title,
            data.applicant,
            data.department,
            data.type,
            data.amount,
            data.status,
            data.description,
            data.approver,
            data.approve_time,
            data.comment,
            data.create_time
          ]
        );
      }

      console.log('✅ 示例数据插入成功');
    }

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// 导出连接池和初始化函数
module.exports = {
  pool,
  testConnection,
  initDatabase
};
