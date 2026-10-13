# 苔光来信 · Mosslight Post — 正式实现接口

2026-10-13：前两轮失败原型保留在研究目录，本接口取代旧 CONTRACT.md 的三资源/战斗/离线生产草稿。产品定位是**有限故事的轻探索与小屋养成**，不宣传无限肉鸽策略深度。

## 已选范围

- 3 张已枚举的路线图（雨谷6 / 山坡7 / 暮林9精力），9封有首尾的信，6位真实动物伙伴。
- 行囊4格，5工具：basket2格、map/cape/tea/lantern各1格；删除没有永久结果价值的rope及其重复捷径。
- 3–6段确定旅途，代价与结果提前可见。safeAvailable检查完整送达+归家后继，不能让玩家因为只付得起眼前路段陷入死路。随时退回上一路口，奖励只在归家结算一次。
- 会客给伙伴记忆/对应陈设；采集得“枝叶”用于购置另一组陈设。首次送达每封信额外2枝叶；重访可以采集，但没有重复首通奖励或虚假的新物品。
- 12种同素材陈设，拥有后可在8个明确庭院位置自由摆放/重复使用，不按每次移动收费。已通过故事解锁的3主题可切换；没有现实时间或喂养机制。
- 本地每步保存，JSON导入/导出；浏览器保存不可用时告知并允许导出。没有账号云同步。

## 文件分工

- model/content代理：src/content.js、src/model.js、tests/model.test.mjs。
- scene代理：src/scene.js、src/assets/art/*、src/assets/asset-map.json、ASSET-CREDITS.md和许可。不得更改model/content/app。
- root：src/index.html、src/styles.css、src/app.js、build/README/设计报告、浏览器整体验证、部署与MyWeb接入。

## content.js 导出约定

- TOOLS: {id,name,slots,description}，以上五个id。
- REGIONS: {id,name,description,theme,energy,nodes,edges}，id沿用rain-valley/hill-post/dusk-woods；节点含id,name,kind,collection,guestId,keepsake,x,y，x/y为0–288虚拟地图坐标（沿故事布局分层，最小间隔36）。边沿用原型id,from,to,baseCost,terrain,requires。保留V3已验证数值，剔除rope边。
- FRIENDS: {id,name,species,role,gift,memory}，memory为3段短记忆。carpenter=dog阿木→bench；herbalist=frog苔生→whiteflowers；beekeeper=chicken米粒→lantern；teacher=cat小满→table；ranger=racoon栗子→log；astronomer=pig桃子→tent。
- DECOR: {id,name,sprite,cost,friendId,description}。好友赠品以上6种cost0且需对应会客解锁；可购置 firepit8/backpack3/barrel5/bowls3/stump2/pinktree6。sprite使用素材表真实键，不凭空画新物品。场景代理协调准确sprite键。
- LETTERS: 9项 {id,title,regionId,recipient,body,reply,chapter,reward,themeUnlock}。id letter-1..9，region每三封循环一次；reward2；第三封解锁blossom，第六封解锁riverside。第一封引入小屋，末封有小型结尾。不增加只有重复计数才解锁的阶段。每段文字1–2句。
- THEMES: {id,name} 三项 evergreen/blossom/riverside。
- PLOTS: 8项 {id,x,y,label}，由场景代理提供与小屋真实可布置地面吻合的坐标（需协调）。

## model.js 导出约定（纯函数）

createState() 返回版本1状态：

```
{version:1,revision:0,savedAt:0,materials:0,completedLetters:[],friendVisits:{},
 unlockedDecor:[],plots:Array(8).fill(null),theme:'evergreen',
 unlockedThemes:['evergreen'],pack:['basket','map','tea'],trip:null,lastTrip:null,
 journeys:0,settings:{music:false,sound:true,motion:true}}
```

trip沿用原型结构并附letterId、regionId；lastTrip含letterId、delivered、guestId、collection、newDecor、newThemes、firstDelivery、journeyNo，用于一次结算页。永久增长发生在归家时，撤销旅途不能复制赠品/枝叶。

- availableLetters(state)：已完成信与下一封可用信。
- setPack(state, toolIds)：校验4格，不改正在旅行的包。
- beginTrip(state, letterId, toolIds=state.pack)。
- getRoutes(trip)：返回所有当前位置出边与原型cost/reward/reason/safeAvailable，unsafeReason明确全程不足。
- getReachableOutcomes(regionId,toolIds)：出发预览{deliverable,visitorIds,collectionMax}，全程枚举，不把不同路线的最大值误说成能同时拿到。
- stepTrip(state, edgeId)：必须safeAvailable；到home时原子结算、trip=null、lastTrip赋值；重复调用不能重复获奖。
- rewindTrip(state)：回退一段，恢复同一工具状态、奖励及精力。
- abandonTrip(state)：只丢弃未结算旅途，已保存家园不变。
- buyDecor(state,decorId)：只扣首次购置；已拥有无副作用；非法id/不足资源/好友锁定报中文错误。
- placeDecor(state,plotIndex,decorIdOrNull)：已拥有物件可重复摆/挪，0–7有效。
- setTheme(state,themeId)、setSetting(state,key,value)。
- serializeState(state)：JSON；parseState(text)：严格验证体量/结构/枚举/范围，重放合法旅途校验，不任意信任导入的派生值；不吞损坏数据冒充正常空存档。
- getProgress(state)：适合UI的汇总，如已送/9、已见/6、陈设/12。

每次有效修改revision+1；savedAt由root持久化时填入当前时间，只作保存记录，不影响玩法。纯函数不访问DOM/localStorage/网络/真实时钟。错误抛简短中文Error，root显示状态。

## scene.js 导出约定

createScene(canvas) 为async，加载相对本模块的同源精选资源，返回：

- render({mode:'home'|'route',theme,plots,residents,region,trip,selectedPlot})：home按8个位置画已解锁/摆放陈设，residents为species数组；route画同素材林间地图、道路和节点角色，强调当前/已走/可行方向，不绘制文本操作按钮。
- setMotion(enabled)、advanceTime(ms)、destroy()、toDataURL()。
- getHitTargets()：返回{kind:'plot'|'friend'|'node',id,x,y,label}；root用HTML按钮覆盖，保持可访问和≥44px，避免canvas唯一输入。

虚拟画布288×288，真实分辨率≥864×864，CSS按宽高自适应；尽量只在需要时更新，页面隐藏/减少动态效果时停止持续动画。两帧动物只做轻微状态变化，不假称四向走路。旧art-study场景中固定木凳/提灯等“奖励陈设”应移除，只有实际拥有并摆放才显示。

## 完成标准

玩法/保存测试、9信完整推进与返程、两类准备对照、赠品和购置/布置可见变化、存档恢复/损坏/导入导出/多标签、320/390/1440真实浏览器、减少动态效果、音频主动播放和后台暂停、公开Sites无登录可玩、MyWeb真实入口上线。禁止在达到这些之前把goal置complete。
