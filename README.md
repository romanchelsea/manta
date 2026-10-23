# dota2-multi-account-panel

单文件网页,合并查看多个 Dota 2 账号的数据(数据来自 OpenDota 公开 API)。

用法:直接在浏览器中打开 index.html,点「账号 / 设置」,每行输入一个账号 ID(Steam64 / Steam32 / 个人主页链接)。

功能:
- 账号多选:点击账号卡片切换是否计入统计
- 筛选:时间范围、英雄、位置、游戏模式、大厅类型、单排/组队、胜负(可多选)
- 总览:合并 KPI、各账号对比、位置分布、单排/组队、常用英雄
- 英雄:合并英雄统计(可排序,显示各账号分布),点击查看该英雄的比赛
- 队友:合并所有账号的队友/对手统计,以及自有账号之间的同队/对阵记录
- 活跃度:近一年日历热力图、星期 × 时段热力图、当天第 N 场胜率
- 趋势:按日/周/月的胜率、KDA、GPM 等,每期场次,滚动 20 场胜率
- 比赛:所有账号的比赛列表,点击展开详情(双方阵容、物品、经济/经验曲线)

## 私密账号(Stratz)

关闭了「公开比赛数据」的账号在 OpenDota 上看不到数据。用该账号登录 stratz.com 生成的 API token 可以取回它自己的比赛数据(已验证)。

1. 复制 `tools/stratz-tokens.example.json` 为 `tools/stratz-tokens.json`,按「账号 ID: token」填写(每个 token 用对应账号登录 Stratz 生成)。
2. 运行本地代理:`node tools/stratz-proxy.mjs`(需要 Node 18+)。
3. 浏览器打开 http://127.0.0.1:8787 (不要直接打开 index.html 文件,否则不会使用 Stratz)。

有 token 的账号会显示「Stratz」标记,并且:比赛来自 Stratz(首次加载会拉取全部历史,之后增量更新);位置为精确值;队友按每场比赛的玩家列表统计,所有筛选都有效;比赛详情来自 Stratz,私密玩家不会显示为匿名。

token 只保存在本机的 `tools/stratz-tokens.json`(已加入 .gitignore),代理只监听 127.0.0.1,页面拿不到 token。
`tools/stratz-probe.mjs` 可用于单独测试 token。

说明:
- 比赛列表缓存在浏览器 IndexedDB 中,6 小时内不重复请求;「刷新数据」只增量拉取新比赛。
- 非 Stratz 账号的位置是根据分路与补刀估算的,只有被 OpenDota 解析过的比赛才有分路信息(其余显示为「未知」)。
- 非 Stratz 账号的队友数据由 OpenDota 服务端统计,位置、组队、英雄/模式多选等筛选无法应用,页面上会提示。
- 免费 API 每分钟约 60 次请求,可在设置中填入 OpenDota API Key。
