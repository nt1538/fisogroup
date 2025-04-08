'use strict'
const nodemailer = require('nodemailer')

// 使用async..await 创建执行函数
async function main() {
  let transporter = nodemailer.createTransport({
    host: 'smtp.163.com', // 第三方邮箱的主机地址
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'XX@xx.com', // 发送方邮箱的账号
      pass: 'xxxxxxxxx'  // 邮箱授权密码
    }
  })

  // 定义transport对象并发送邮件
  await transporter.sendMail({
    from: 'xxx@xx.com', // 发送方邮箱的账号
    to: 'xx@xxx.com', // 邮箱接受者的账号
    subject: 'xxx', // Subject line
    text: 'xxxxxx?', // 文本内容
    html: '<h1>xxx, 您的邮箱验证码是:<b>${emailCode}</b>' // html 内容, 如果设置了html内容, 将忽略text内容
  })
}

main().catch(console.error)
