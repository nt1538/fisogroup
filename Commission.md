🧠 分佣逻辑总览（概括）
当管理员将某一订单 application_status 设置为 'completed' 时，系统将触发：

确认订单字段（金额、所属用户、产品）

计算用户等级佣金（个人提成）

查找上级与上上级用户

判断是否触发级差佣金

判断是否触发代际佣金

生成佣金记录（写入 commission 表）

更新用户的 profit、team_profit、total_earnings

将订单移动到 saved_orders 表

📊 1. 确认订单核心字段
系统会从 application_life 或 application_annuity 中取出以下字段：

字段	说明
user_id	当前订单归属用户（代理人）
target_premium	作为佣金计算基数
commission_from_carrier	可选：保险公司给的总佣金
application_date, product_name, carrier_name 等	会一起传入 commission 表，供记录

💰 2. 计算个人佣金（Level-based）
系统查找该用户的 hierarchy_level，映射至 commission_chart 表：

假设该用户是 Level B，其对应 percent = 75%

若 target_premium = 1000，则该用户提成 = 1000 * 75% = 750

前10000保费是按70%算

超出部分按75%算

这部分会按“税阶”方式分段计算总金额。

📈 3. 查找上下级成员
系统根据 users.introducer_id 向上递归获取：

parent = user.introducer_id → 查找上级

grandparent = parent.introducer_id → 查找上上级

📐 4. 级差佣金（Level Difference Commission）
如果上级存在，系统对比两者等级百分比：

代理人是 Level B = 75%

上级是 Level C = 80%

差值为 5% → 上级可以获得 10000 * 5% = 500 的 级差佣金

⚠️ 若差值 <= 0（如同级或下级），则不上级差佣金。

🧬 5. 代际佣金（Generation Override）
代际逻辑你系统设置如下：

如果该用户及上级不是 Agent1 或更高级别 → 不触发

如果上级是 Agent1 或更高 → 可对其“下三代”成员获得代际提成

逻辑如下：

系统向上追踪最近的 Agent1+

向下追踪其三代以内成员中是否包含该下单用户

如果包含，则该 Agent1+ 可以获得代际佣金，比例 5,3,1%

🧾 6. 写入佣金记录（插入 commission 表）
系统为每条有效佣金写入一条记录：

字段	示例
user_id	获佣金者ID（包括本人、上级、祖父级）
commission_type	Personal, Level Difference, Generation Override
commission_amount	计算值
commission_percent	对应百分比
hierarchy_level	获佣人等级
product_name_carrier, policy_number, application_date, ...	订单信息

✍️ 插入表：commission_life 或 commission_annuity，根据订单类型

🔁 7. 更新用户状态
系统将同步更新：

字段	操作
users.total_earnings	增加对应用户的佣金金额
users.profit	仅当为 个人佣金 时才计入
users.team_profit	向上级别层层累加（常用于晋升判断）

📦 8. 移动订单至归档表
订单完成后，原始记录从：

application_life ➜ saved_life

application_annuity ➜ saved_annuity

并设置状态为 distributed