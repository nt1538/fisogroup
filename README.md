🧭 Overall Workflow

    A[User submits application] --> B[Application stored in DB (application_life/annuity)]
    B --> C[Admin reviews application]
    C --> D[Admin marks application as 'completed']
    D --> E[Trigger handleCommissions()]
    E --> F[Commission distribution logic executes]
    F --> G[Insert commission records into commission_life/annuity table]
    G --> H[Move application to saved_life/annuity]
    H --> I[Agent and uplines receive commissions]
🧱 Step-by-Step Breakdown
1. User submits application
The frontend gathers data such as:

user_id, carrier_name, product_name, target_premium, initial_premium, etc.

Backend endpoint stores this into:

application_life or application_annuity table (depending on product type)

The application has status = 'in_progress' by default.

2. Admin reviews and completes the application
Admin visits the application management dashboard.

Reviews details and edits allowed fields (policy_effective_date, comment).

When ready, sets application_status = 'completed'.

3. Trigger commission distribution
Once admin sets status to 'completed', it calls handleCommissions(order, userId, table_type).

This function:

Calculates commissions.

Inserts multiple records.

Promotes user/upline if thresholds are crossed.

🧮 handleCommissions() Internal Logic
🗂️ Inputs:
order from application table.

userId: submitting agent's ID.

table_type: 'life' or 'annuity'.

🧊 Step 1: Base Setup

const chart = await getCommissionChart(); // Load commission levels.
const baseAmount = parseFloat(order.target_premium || 0);
const user = SELECT * FROM users WHERE id = userId;
📊 Step 2: Determine Commission Split Points (Optional)
Use checkSplitPoints() to detect if this one order will cause a level promotion (e.g., cross from Level A to Level B).

If yes, split the order into segments, to fairly assign different percentages per part.

➗ Step 3: For Each Segment
Loop over each segment between split points:

a. Calculate personal commission:

level = reconcileLevel(segProfit, user.hierarchy_level, chart);
percent = getLevelPercentByTitle(level, chart);
commission = segment_amount * (percent / 100);
b. Track:
totalPersonalCommission += ...

Add team_profit and profit to user.

Call updateTeamProfit(userId, segment_amount) to:

Add to all upstream introducers’ team_profit.

Promote hierarchy level if thresholds are crossed.

🧬 Step 4: Distribute Level Difference Commissions
Traverse upline chain.

For each, compare their percentage vs. downstream.

If uplines have higher level, they get the difference:

levelDiff = upliner_percent - downliner_percent;
amount = segment_amount * (levelDiff / 100);
Accumulated in levelDiffMap.

🌱 Step 5: Distribute Generation Override (3 generations max)
For uplines within 3 generations and in qualified levels (Agency1+, VP):

Generation 1 → 5%

Generation 2 → 3%

Generation 3 → 1%

override_amount = segment_amount * (overridePercent / 100);
Accumulated in genOverrideMap.

💾 Step 6: Save Commissions to DB
Call insertCommissionOrder() to store:

Type	Amount Source	Notes
Personal Commission	Agent %	Based on segment level
Level Difference	% diff per upliner	Only if upliner has higher %
Generation Override	5/3/1% for 3 gens	Limited to qualified uplines

Table used:

commission_life or commission_annuity

Also update:

users.total_earnings += amount (for each person)

📁 Step 7: Archive
After distribution:

UPDATE application_life/annuity SET status = 'distributed';
INSERT INTO saved_life/annuity SELECT * FROM application_life/annuity WHERE id = ?;
DELETE FROM application_life/annuity WHERE id = ?;
Application is moved to a historical table.

💵 Agent Commission Payout Example
Agent submits:

Target premium = $10,000

Level = Level A → 50%

Assume:
$10,000 * 50% = $5,000 personal

Upline has Level B → 60%

Level difference = 10% → $1,000 upline

Generation override = 5% → $500 upline

So this one application gives:

Agent: $5,000

Upline: $1,000 (level diff) + $500 (override)

📌 Summary Logic Points
Logic	Rule
Commission %	Based on level from commission_chart
Promotion	Triggered when team_profit crosses thresholds
Level Difference	Paid when upliner % > downliner %
Generation Override	Up to 3 generations, must be qualified levels
Split Logic	If level promotion occurs mid-order, the order is split
Data Movement	Completed orders → saved_orders table, marked as distributed

