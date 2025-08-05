 1. users 表（用户信息表）
主体用途：
存储所有业务员/代理人/管理员等的基本资料

定义层级关系和佣金等级

主要字段：
字段名	类型	描述
id	SERIAL PRIMARY KEY	用户唯一ID
full_name	TEXT	用户全名
email	TEXT	邮箱
password	TEXT	哈希加密密码
national_producer_number	TEXT	生产者编号（保险业常见）
hierarchy_level	TEXT	层级头衔（Agent1, VP, etc.）
level_percent	REAL	用户自身佣金百分比（比如 50%）
introducer_id	INTEGER	上级引荐人ID（对应 users.id）
team_profit	REAL	团队累计利润（用于升级）
profit	REAL	个人累计利润（用于等级计算）
total_earnings	REAL	佣金总收入
is_admin	BOOLEAN	是否为管理员

🔗 与自身通过 introducer_id 建立 组织结构树形关系

📝 2. application_life / application_annuity 表（用户提交的订单）
一般称为“申请单”或“待审核订单”

主要字段：
字段名	类型	描述
id	SERIAL PRIMARY KEY	申请唯一ID
user_id	INTEGER	提交人ID（关联 users.id）
order_type	TEXT	life 或 annuity
carrier_name	TEXT	保险公司名称
product_name	TEXT	产品名
application_date	DATE	申请日期
policy_effective_date	DATE	保单生效日期
commission_distribution_date	DATE	佣金分发日期（用于展示）
policy_number	TEXT	保单号
face_amount	REAL	面额保额
target_premium	REAL	目标保费（用于佣金计算）
initial_premium	REAL	首期保费
commission_from_carrier	REAL	保险公司提供的佣金
comment	TEXT	管理员备注
application_status	TEXT	in_progress, completed, distributed, cancelled, rejected

✅ 一旦 application_status = 'completed'，系统将调用分佣逻辑，并移入已完成表。

💰 3. commission_life / commission_annuity 表（佣金记录表）
每个申请可生成 1+ 条佣金记录，分别给不同用户（自己/上级/上上级）

主要字段：
字段名	类型	描述
id	SERIAL PRIMARY KEY	佣金记录唯一ID
user_id	INTEGER	获得佣金的用户ID
commission_type	TEXT	Personal, Level Difference, Generation Override
commission_percent	REAL	对应佣金比例
commission_amount	REAL	实际获得佣金额
order_id	INTEGER	对应申请表的ID（原始单）
order_type	TEXT	life 或 annuity
carrier_name	TEXT	保险公司名称
product_name_carrier	TEXT	产品名
application_date	DATE	申请日期
policy_number	TEXT	保单号
face_amount	REAL	保额
target_premium	REAL	目标保费
initial_premium	REAL	首期保费
commission_from_carrier	REAL	来源总佣金（可选）
application_status	TEXT	状态
mra_status	TEXT	MRA状态（选填）
hierarchy_level	TEXT	获佣人层级

🔗 user_id 对应 users.id
🔗 order_id 对应 application_life.id 或 application_annuity.id

📁 4. saved_life / saved_annuity 表（已归档订单）
存储已完成并发放佣金的订单

字段结构和 application_life / application_annuity 完全一致。

原始订单完成后将从 application_* 删除并插入到 saved_*

📊 5. commission_chart 表（佣金等级表）
定义不同等级的 title → percent 映射关系

字段名	类型	描述
id	SERIAL PRIMARY KEY	ID
title	TEXT	如 Level A、Level B、VP
min_amount	REAL	对应升级区间起点
max_amount	REAL	区间终点
percent	REAL	佣金百分比（如 50%, 60%）

用于确定每位用户在某段利润范围内的对应 percent。

🔗 表与表之间的连接关系

graph TD
  A[users] -->|user_id| B[application_life/annuity]
  A -->|introducer_id (自关联)| A
  B -->|order_id| C[commission_life/annuity]
  C -->|user_id| A
  B --> D[saved_life/annuity]
  E[commission_chart] --> A
🧩 实际数据流逻辑：
用户 → 创建 application_life，状态 in_progress

管理员审核 → 修改 status = 'completed'

后端逻辑：

判断 target_premium 落入哪一等级（查 chart）

计算佣金 → 插入 commission_life

更新 users.total_earnings, profit, team_profit

将申请移入 saved_life


