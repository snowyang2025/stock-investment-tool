const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ==================== 完整股票池（已补充所有股票TTM分红） ====================
const stockPool = [
  // 核1 核心仓位
  {
    category: '核1',
    name: '长江电力',
    code: '600900',
    lastYearDividend: 0.815,
    ttmDividend: 0.815,
    estimatedDividend: 0.855,
    longTermROE: 12.5,
    dividendPayoutRatio: 70,
    isStateOwned: true,
    positionRule: '单只≤体系1总仓位20%，3只合计60%-70%'
  },
  {
    category: '核1',
    name: '中国神华',
    code: '601088',
    lastYearDividend: 2.48,
    ttmDividend: 2.48,
    estimatedDividend: 2.56,
    longTermROE: 14.8,
    dividendPayoutRatio: 60,
    isStateOwned: true,
    positionRule: '单只≤体系1总仓位20%，3只合计60%-70%'
  },
  {
    category: '核1',
    name: '大秦铁路',
    code: '601006',
    lastYearDividend: 0.47,
    ttmDividend: 0.47,
    estimatedDividend: 0.48,
    longTermROE: 10.2,
    dividendPayoutRatio: 65,
    isStateOwned: true,
    positionRule: '单只≤体系1总仓位15%，3只合计60%-70%'
  },
  // 备1 备选仓位
  {
    category: '备1',
    name: '福耀玻璃',
    code: '600660',
    lastYearDividend: 1.90,
    ttmDividend: 1.90,
    estimatedDividend: 2.10,
    longTermROE: 18.5,
    dividendPayoutRatio: 55,
    isStateOwned: false,
    positionRule: '单只≤体系1总仓位10%，民企卫星仓≤20%'
  },
  {
    category: '备1',
    name: '伊利股份',
    code: '600887',
    lastYearDividend: 0.96,
    ttmDividend: 0.96,
    estimatedDividend: 1.06,
    longTermROE: 22.3,
    dividendPayoutRatio: 52,
    isStateOwned: false,
    positionRule: '单只≤体系1总仓位10%，民企卫星仓≤20%'
  },
  {
    category: '备1',
    name: '格力电器',
    code: '000651',
    lastYearDividend: 2.00,
    ttmDividend: 3.00,
    estimatedDividend: 3.20,
    longTermROE: 22.0,
    dividendPayoutRatio: 60,
    isStateOwned: false,
    positionRule: '单只≤体系1总仓位10%，民企卫星仓≤20%'
  },
  {
    category: '备1',
    name: '农业银行',
    code: '601288',
    lastYearDividend: 0.2222,
    ttmDividend: 0.2222,
    estimatedDividend: 0.23,
    longTermROE: 10.5,
    dividendPayoutRatio: 30,
    isStateOwned: true,
    positionRule: '单只≤总仓位5%，仅体系1卫星仓配置'
  },
  {
    category: '备1',
    name: '中国建筑',
    code: '601668',
    lastYearDividend: 0.255,
    ttmDividend: 0.255,
    estimatedDividend: 0.26,
    longTermROE: 12.0,
    dividendPayoutRatio: 20,
    isStateOwned: true,
    positionRule: '单只≤总仓位5%，仅体系1卫星仓配置'
  },
  {
    category: '备1',
    name: '中国铁建',
    code: '601186',
    lastYearDividend: 0.23,
    ttmDividend: 0.23,
    estimatedDividend: 0.24,
    longTermROE: 10.0,
    dividendPayoutRatio: 15,
    isStateOwned: true,
    positionRule: '单只≤总仓位5%，仅体系1卫星仓配置'
  },
  {
    category: '备1',
    name: '中国电建',
    code: '601669',
    lastYearDividend: 0.11,
    ttmDividend: 0.11,
    estimatedDividend: 0.12,
    longTermROE: 8.5,
    dividendPayoutRatio: 20,
    isStateOwned: true,
    positionRule: '不建议配置，估值泡沫化'
  },
  {
    category: '备1',
    name: '京沪高铁',
    code: '601816',
    lastYearDividend: 0.15,
    ttmDividend: 0.15,
    estimatedDividend: 0.18,
    longTermROE: 7.0,
    dividendPayoutRatio: 50,
    isStateOwned: true,
    positionRule: '单只≤体系1总仓位10%'
  },
  // 备2 备选仓位
  {
    category: '备2',
    name: '五粮液',
    code: '000858',
    lastYearDividend: 2.78,
    ttmDividend: 2.78,
    estimatedDividend: 2.90,
    longTermROE: 20.0,
    dividendPayoutRatio: 50,
    isStateOwned: false,
    positionRule: '单只≤总仓位10%，仅卫星仓配置'
  }
];

// 格式化股票代码
function formatStockCode(code) {
  code = code.replace(/\D/g, '');
  if (code.length === 6) {
    return code.startsWith('6') ? `sh${code}` : `sz${code}`;
  }
  return code;
}

// ==================== 【新增】拉取日K线并计算MA120 ====================
async function fetchAndCalculateMA120(fullCode) {
  try {
    // 腾讯财经日K线接口，拉取最近200天数据（足够计算MA120）
    const klineUrl = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?_var=kline_day&param=${fullCode},day,200`;
    const response = await axios.get(klineUrl, { timeout: 10000 });
    
    // 解析K线数据
    const dataMatch = response.data.match(/kline_day=(.+)/);
    if (!dataMatch) return null;
    
    const klineData = JSON.parse(dataMatch[1]);
    const klines = klineData.data?.[fullCode]?.day || klineData.data?.[fullCode]?.qfqday || [];
    
    if (klines.length < 120) {
      console.log(`【MA120计算失败】K线数据不足120天，仅${klines.length}天`);
      return null;
    }

    // 提取最近120天的收盘价
    const last120Closes = klines.slice(-120).map(k => parseFloat(k[2]));
    // 计算MA120
    const sum = last120Closes.reduce((acc, curr) => acc + curr, 0);
    const ma120 = sum / 120;
    
    return parseFloat(ma120.toFixed(3));
  } catch (error) {
    console.log(`【MA120计算异常】${error.message}`);
    return null;
  }
}

// 拉取单只股票数据
async function fetchStockData(stock) {
  try {
    const fullCode = formatStockCode(stock.code);
    const url = `https://qt.gtimg.cn/q=${fullCode}`;
    const response = await axios.get(url, { timeout: 10000 });
    
    // 解析腾讯财经返回的数据
    const dataMatch = response.data.match(/v_([a-z0-9]+)="([^"]+)"/);
    if (!dataMatch) throw new Error('数据解析失败');
    
    const dataArr = dataMatch[2].split('~');
    
    // 【新增】计算MA120
    const ma120 = await fetchAndCalculateMA120(fullCode);
    
    return {
      ...stock,
      fullCode: fullCode,
      price: parseFloat(dataArr[3]) || 0,
      yesterdayClose: parseFloat(dataArr[4]) || 0,
      pe: parseFloat(dataArr[39]) || 0,
      pb: parseFloat(dataArr[46]) || 0,
      marketCap: dataArr[45] ? (parseFloat(dataArr[45]) / 100000000).toFixed(2) : '未知',
      ma120: ma120, // 新增MA120字段
      updateTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    };
  } catch (error) {
    console.log(`【${stock.name}】数据拉取失败:`, error.message);
    return { ...stock, price: 0, pe: 0, pb: 0, ma120: null, error: error.message };
  }
}

// 主函数
async function main() {
  console.log('开始拉取股票数据...');
  const result = [];
  
  for (const stock of stockPool) {
    const data = await fetchStockData(stock);
    result.push(data);
    // 避免请求过快被拦截
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 兼容GitHub Actions路径，确保文件写入正确
  const dataDir = path.resolve(process.cwd(), 'data');
  const outputPath = path.join(dataDir, 'stock-data.json');
  
  // 确保data文件夹存在
  if (!fs.existsSync(dataDir)) {
    console.log('data文件夹不存在，已自动创建');
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 写入JSON文件
  const outputData = {
    updateTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    stockList: result
  };
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  console.log(`数据拉取完成，共${result.length}只股票，已保存到${outputPath}`);
  console.log('文件写入成功，准备提交到仓库');
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
