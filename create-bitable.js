
const fs = require('fs');
const { fetchWithAuth, getToken } = require('/root/.openclaw/workspace/skills/feishu-common/index.js');

process.env.FEISHU_APP_ID = 'cli_a9459e7c20799bc3';
process.env.FEISHU_APP_SECRET = 'wiembY4gfZ8NY8RWaVAmTgCH2YlZ2Xnc';

const APP_TOKEN = 'Vm4cbezEGaNOnts1SRUcDk5cnFf';

// 定义所有表格结构
const tables = [
  {
    name: '1-排放因子字典',
    fields: [
      { type: 1, name: '因子名称' },
      { type: 3, name: '类别', options: [{name: '燃料燃烧'}, {name: '过程排放'}, {name: '外购电力'}, {name: '外购热力'}] },
      { type: 3, name: '排放范围', options: [{name: '范围一'}, {name: '范围二'}] },
      { type: 2, name: '排放因子值' },
      { type: 3, name: '单位', options: [{name: 't'}, {name: '万m³'}, {name: 'MWh'}, {name: 'GJ'}] },
      { type: 2, name: '低位发热量' },
      { type: 2, name: '碳氧化率' },
      { type: 3, name: '数据来源', options: [{name: '国标缺省'}, {name: '企业实测'}, {name: '核查认定'}] },
      { type: 1, name: '依据标准' },
      { type: 5, name: '生效日期' },
      { type: 5, name: '失效日期' },
      { type: 1, name: '备注' },
    ]
  },
  {
    name: '2-生产工序字典',
    fields: [
      { type: 1, name: '工序编码' },
      { type: 1, name: '工序名称' },
      { type: 3, name: '所属产线', options: [{name: '一联'}, {name: '二联'}] },
      { type: 8, name: '主要排放类型' },
      { type: 2, name: '基准排放强度' },
    ]
  },
  {
    name: '3-月度能源消耗',
    fields: [
      { type: 3, name: '年份', options: [{name: '2024'}, {name: '2025'}, {name: '2026'}, {name: '2027'}] },
      { type: 3, name: '月份', options: [{name: '1'}, {name: '2'}, {name: '3'}, {name: '4'}, {name: '5'}, {name: '6'}, {name: '7'}, {name: '8'}, {name: '9'}, {name: '10'}, {name: '11'}, {name: '12'}] },
      { type: 5, name: '日期' },
      { type: 17, name: '工序', multiple: false },
      { type: 17, name: '燃料/能源', multiple: false },
      { type: 2, name: '消耗量' },
      { type: 1, name: '原始计量单编号' },
      { type: 1, name: '计量器具编号' },
      { type: 11, name: '数据填报人' },
      { type: 5, name: '填报时间' },
      { type: 3, name: '数据状态', options: [{name: '草稿'}, {name: '已提交'}, {name: '已审核'}] },
      { type: 14, name: '修改日志' },
    ]
  },
  {
    name: '4-月度产品产量',
    fields: [
      { type: 3, name: '年份', options: [{name: '2024'}, {name: '2025'}, {name: '2026'}, {name: '2027'}] },
      { type: 3, name: '月份', options: [{name: '1'}, {name: '2'}, {name: '3'}, {name: '4'}, {name: '5'}, {name: '6'}, {name: '7'}, {name: '8'}, {name: '9'}, {name: '10'}, {name: '11'}, {name: '12'}] },
      { type: 17, name: '工序', multiple: false },
      { type: 1, name: '产品名称' },
      { type: 2, name: '合格产品产量(吨)' },
      { type: 2, name: '不合格产品产量(吨)' },
      { type: 1, name: '原始计量单编号' },
      { type: 11, name: '填报人' },
      { type: 5, name: '填报时间' },
    ]
  },
  {
    name: '5-工序排放量计算',
    fields: [
      { type: 2, name: '年份' },
      { type: 2, name: '月份' },
      { type: 17, name: '工序', multiple: false },
      { type: 17, name: '能源/燃料', multiple: false },
      { type: 3, name: '排放范围', options: [{name: '范围一'}, {name: '范围二'}] },
      { type: 2, name: '消耗量' },
      { type: 2, name: '排放因子' },
      { type: 2, name: '计算排放量(tCO₂)' },
      { type: 5, name: '数据最后更新时间' },
    ]
  },
  {
    name: '6-月度企业排放汇总',
    fields: [
      { type: 3, name: '年份', options: [{name: '2024'}, {name: '2025'}, {name: '2026'}, {name: '2027'}] },
      { type: 3, name: '月份', options: [{name: '1'}, {name: '2'}, {name: '3'}, {name: '4'}, {name: '5'}, {name: '6'}, {name: '7'}, {name: '8'}, {name: '9'}, {name: '10'}, {name: '11'}, {name: '12'}] },
      { type: 2, name: '燃料燃烧排放(tCO₂)' },
      { type: 2, name: '过程排放(tCO₂)' },
      { type: 2, name: '外购电力排放(tCO₂)' },
      { type: 2, name: '外购热力排放(tCO₂)' },
      { type: 2, name: '范围一合计(tCO₂)' },
      { type: 2, name: '范围二合计(tCO₂)' },
      { type: 2, name: '固碳量(tCO₂)' },
      { type: 2, name: '企业总排放量(tCO₂)' },
      { type: 2, name: '合格产品总产量(吨)' },
      { type: 2, name: '排放强度(tCO₂/吨钢)' },
      { type: 2, name: '同比去年(%)' },
      { type: 2, name: '环比上月(%)' },
      { type: 2, name: '强度对比标杆(%)' },
      { type: 3, name: '异常标记', options: [{name: '正常'}, {name: '轻度异常'}, {name: '严重异常'}] },
      { type: 1, name: '异常说明' },
      { type: 17, name: '数据质量控制计划(DQC)', multiple: true },
      { type: 3, name: '数据状态', options: [{name: '草稿'}, {name: '已汇总'}, {name: '已审核'}, {name: '已申报'}] },
      { type: 11, name: '审核人' },
      { type: 5, name: '审核时间' },
    ]
  },
  {
    name: '7-碳配额与交易',
    fields: [
      { type: 3, name: '年份', options: [{name: '2024'}, {name: '2025'}, {name: '2026'}, {name: '2027'}] },
      { type: 2, name: '配额总量(tCO₂)' },
      { type: 2, name: '实际排放量(tCO₂)' },
      { type: 2, name: '结余/缺口(tCO₂)' },
      { type: 12, name: '本年交易记录' },
      { type: 3, name: '清缴完成状态', options: [{name: '未清缴'}, {name: '已完成清缴'}] },
    ]
  },
  {
    name: '8-申报审批',
    fields: [
      { type: 1, name: '申报编号' },
      { type: 3, name: '申报年度', options: [{name: '2024'}, {name: '2025'}, {name: '2026'}, {name: '2027'}] },
      { type: 3, name: '申报类型', options: [{name: '月度'}, {name: '季度'}, {name: '年度'}] },
      { type: 5, name: '申报期间起' },
      { type: 5, name: '申报期间止' },
      { type: 17, name: '汇总数据', multiple: false },
      { type: 11, name: '申报人' },
      { type: 5, name: '申报时间' },
      { type: 16, name: '年度排放报告PDF' },
      { type: 16, name: '数据质量控制计划PDF' },
      { type: 3, name: '审批流程状态', options: [{name: '待环保审核'}, {name: '待管理层审批'}, {name: '已完成'}] },
      { type: 5, name: '上报生态环境部日期' },
      { type: 1, name: '回执编号' },
    ]
  },
  {
    name: '9-第三方核查',
    fields: [
      { type: 3, name: '核查年度', options: [{name: '2024'}, {name: '2025'}, {name: '2026'}, {name: '2027'}] },
      { type: 1, name: '核查机构名称' },
      { type: 1, name: '核查组长' },
      { type: 5, name: '核查进场日期' },
      { type: 5, name: '核查完成日期' },
      { type: 16, name: '核查报告PDF' },
      { type: 3, name: '核查结论', options: [{name: '合格'}, {name: '有条件合格'}, {name: '不合格'}] },
      { type: 12, name: '发现问题清单' },
      { type: 3, name: '整改完成状态', options: [{name: '未整改'}, {name: '整改中'}, {name: '已闭环'}] },
      { type: 2, name: '最终确认排放量(tCO₂)' },
    ]
  },
  {
    name: '10-减排项目跟踪',
    fields: [
      { type: 1, name: '项目名称' },
      { type: 3, name: '项目类型', options: [{name: '节能技改'}, {name: '可再生能源替代'}, {name: '碳捕集'}, {name: '原料替换'}] },
      { type: 5, name: '开工时间' },
      { type: 5, name: '投产时间' },
      { type: 2, name: '预计年减排量(tCO₂/年)' },
      { type: 2, name: '实际年减排量(tCO₂/年)' },
      { type: 2, name: '项目投资(万元)' },
      { type: 2, name: '单位减排成本(元/tCO₂)' },
      { type: 3, name: '项目状态', options: [{name: '可研'}, {name: '建设'}, {name: '运行'}, {name: '退役'}] },
    ]
  }
];

async function createTable(accessToken, appToken, table) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`;
  const body = JSON.stringify({
    name: table.name,
    fields: table.fields.map(f => {
      let field = { name: f.name, type: f.type };
      if (f.options) field.property = { options: f.options };
      if (f.type === 17) field.property = { multiple: f.multiple };
      return field;
    })
  });
  const res = await fetchWithAuth(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: body
  });
  const data = await res.json();
  console.log(`Created table ${table.name}: code=${data.code}, msg=${data.msg || 'OK'}`);
  if (data.code === 0) {
    return data.data.table_id;
  }
  return null;
}

async function main() {
  console.log('Getting access token...');
  const accessToken = await getToken();
  console.log('Got access token, start creating 10 tables...');
  
  const tableIds = {};
  
  for (const table of tables) {
    const id = await createTable(accessToken, APP_TOKEN, table);
    if (id) tableIds[table.name] = id;
    await new Promise(r => setTimeout(r, 1000)); // avoid rate limit
  }
  
  console.log('\n=== ✅ All tables created successfully! ===');
  console.log('Table IDs:');
  console.log(JSON.stringify(tableIds, null, 2));
  
  console.log('\n📝 Next steps:');
  console.log('1. Go to "3-月度能源消耗" → edit field "工序" → set table to "2-生产工序字典"');
  console.log('2. Go to "3-月度能源消耗" → edit field "燃料/能源" → set table to "1-排放因子字典"');
  console.log('3. Do the same for all lookup fields in other tables');
  console.log('4. Import the base data CSV I gave you earlier');
}

main().catch(err => console.error('❌ Error:', err));
