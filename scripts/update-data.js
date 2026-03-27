const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ==================== 完整股票池 ====================
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

// ==================== 【修复】东方财富稳定K线接口 + MA120计算 ====================
async function fetchAndCalculateMA120(stockCode) {
  try {
    const pureCode = stockCode.replace(/\D/g, '');
    // 东方财富接口secid规则：沪市=1.代码，深市=0.代码
    const secid = pureCode.startsWith('6') ? `1.${pureCode}` : `0.${pureCode}`;
    
    // 东方财富K线接口：拉取最近200天前复权日K线，稳定无鉴权
    const klineUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&beg=0&end=20500101&lmt=200`;
    
    console.log(`【${pureCode}】正在拉取K线数据，接口地址：${klineUrl}`);
    const response = await axios.get(klineUrl, { timeout: 15000 });
    
    // 校验接口返回
    if (response.data?.data?.klines?.length < 120) {
      console.log(`【${pureCode}】K线数据不足，仅${response.data?.data?.klines?.length || 0}天，无法计算MA120`);
      return null;
    }

    // 提取K线收盘价：东方财富K线格式 日期,开盘,收盘,最高,最低,成交量,成交额,...
    const klines = response.data.data.klines;
    const last120Closes = klines.slice(-120).map(k => parseFloat(k.split(',')[2]));
    
    // 计算MA120
    const sum = last120Closes.reduce((acc, curr) => acc + curr, 0);
    const ma120 = sum / 120;
    const ma120Fixed = parseFloat(ma120.toFixed(3));
    
    console.log(`【${pureCode}】MA120计算完成：${ma120Fixed}，最新收盘价：${last120Closes[last120Closes.length-1]}`);
    return ma120Fixed;

  } catch (error) {
    console.log(`【${stockCode}】MA120计算异常：${error.message}`);
    return null;
  }
}

// 拉取单只股票实时行情数据
async function fetchStockRealData(stock) {
  try {
    const fullCode = formatStockCode(stock.code);
    const url = `https://qt.gtimg.cn/q=${fullCode}`;
    const response = await axios.get(url, { timeout: 10000 });
    
    // 解析腾讯财经实时行情
    const dataMatch = response.data.match(/v_([a-z0-9]+)="([^"]+)"/);
    if (!dataMatch) throw new Error('行情数据解析失败');
    
    const dataArr = dataMatch[2].split('~');
    return {
      name: dataArr[1],
      price: parseFloat(dataArr[3]) || 0,
      yesterdayClose: parseFloat(dataArr[4]) || 0,
      pe: parseFloat(dataArr[39]) || 0,
      pb: parseFloat(dataArr[46]) || 0,
      marketCap: dataArr[45] ? (parseFloat(dataArr[45]) / 100000000).toFixed(2) : '未知'
    };
  } catch (error) {
    console.log(`【${stock.name}】行情数据拉取失败:`, error.message);
    return { price: 0, pe: 0, pb: 0, marketCap: '未知', error: error.message };
  }
}

// 拉取单只股票完整数据
async function fetchStockFullData(stock) {
  console.log(`==================== 开始处理【${stock.name}】====================`);
  // 并行拉取行情和K线，提升速度
  const [realData, ma120] = await Promise.all([
    fetchStockRealData(stock),
    fetchAndCalculateMA120(stock.code)
  ]);

  return {
    ...stock,
    ...realData,
    ma120: ma120,
    updateTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
  };
}

// 主函数
async function main() {
  console.log('开始拉取股票完整数据（含MA120计算）...');
  const result = [];
  
  // 逐只处理，避免接口限流
  for (const stock of stockPool) {
    const fullData = await fetchStockFullData(stock);
    result.push(fullData);
    // 每只股票间隔800ms，避免被东方财富接口限流
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  // 兼容GitHub Actions路径
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

  console.log(`\n==================== 全部处理完成 ====================`);
  console.log(`共处理${result.length}只股票，MA120计算成功${result.filter(s => s.ma120).length}只`);
  console.log(`数据已保存到${outputPath}`);
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
