export type EventCategory = 'war' | 'politics' | 'economy' | 'disaster';

export interface FinancialImpact {
  sectors: string[];
  positiveCompanies: string[];
  negativeCompanies: string[];
}

export interface GlobeEvent {
  id: string;
  lat: number;
  lng: number;
  category: EventCategory;
  title: string;
  summary: string;
  latestUpdates: string;
  impact: FinancialImpact;
  date: string;
}

export const categoryIcons: Record<EventCategory, string> = {
  war: '🔥',
  politics: '🗳️',
  economy: '📉', // Or 📈
  disaster: '🌪️',
};

export const mockEvents: GlobeEvent[] = [
  {
    id: 'e1',
    lat: 31.5204,
    lng: 34.4668,
    category: 'war',
    title: '中东地缘政治局势升级',
    summary: '中东地区紧张局势和军事活动加剧，导致供应链中断。',
    latestUpdates: '多家航运公司改变航线，绕道好望角。',
    impact: {
      sectors: ['航运', '能源', '国防'],
      positiveCompanies: ['洛克希德·马丁 (LMT)', '埃克森美孚 (XOM)', '马士基 (MAERSK-B.CO)'],
      negativeCompanies: ['达美航空 (DAL)', '亚马逊 (AMZN)'],
    },
    date: '2023-10-15',
  },
  {
    id: 'e2',
    lat: 38.9072,
    lng: -77.0369,
    category: 'economy',
    title: '美联储利率决议',
    summary: '美联储宣布了出乎意料的鸽派政策，暗示未来可能降息。',
    latestUpdates: '鲍威尔表示通胀降温速度快于预期。',
    impact: {
      sectors: ['房地产', '科技', '银行业'],
      positiveCompanies: ['莱纳建筑 (LEN)', '苹果 (AAPL)', 'Block (SQ)'],
      negativeCompanies: ['摩根大通 (JPM)', '美国银行 (BAC)'],
    },
    date: '2023-11-01',
  },
  {
    id: 'e3',
    lat: 35.6762,
    lng: 139.6503,
    category: 'politics',
    title: '日本央行收益率曲线控制 (YCC) 政策调整',
    summary: '日本央行调整其 YCC 政策，允许长期收益率更自由地上升。',
    latestUpdates: '公告发布后，日元兑美元大幅升值。',
    impact: {
      sectors: ['日本金融业', '出口制造业'],
      positiveCompanies: ['三菱日联金融 (MUFG)', '三井住友金融 (SMFG)'],
      negativeCompanies: ['丰田 (TM)', '索尼 (SONY)'],
    },
    date: '2023-10-31',
  },
  {
    id: 'e4',
    lat: -23.5505,
    lng: -46.6333,
    category: 'disaster',
    title: '南美遭受严重干旱',
    summary: '史无前例的干旱天气影响了巴西和阿根廷的主要农业产区。',
    latestUpdates: '大豆和玉米的产量预估被下调了 15%。',
    impact: {
      sectors: ['农业', '食品加工'],
      positiveCompanies: ['约翰迪尔 (DE)', '阿彻丹尼尔斯米德兰 (ADM)'],
      negativeCompanies: ['泰森食品 (TSN)', '卡夫亨氏 (KHC)'],
    },
    date: '2023-09-20',
  },
  {
    id: 'e5',
    lat: 51.5074,
    lng: -0.1278,
    category: 'politics',
    title: '英国宣布举行大选',
    summary: '首相宣布提前举行大选，引发市场波动。',
    latestUpdates: '民调显示议会多数席位可能发生重大变化。',
    impact: {
      sectors: ['公用事业', '基础设施', '英国零售业'],
      positiveCompanies: ['乐购 (TSCO.L)', '阿斯利康 (AZN)'],
      negativeCompanies: ['英国国家电网 (NG.L)', '塞文特伦特 (SVT.L)'],
    },
    date: '2024-05-22',
  },
  {
    id: 'e6',
    lat: 25.0330,
    lng: 121.5654,
    category: 'economy',
    title: '半导体供应链中断',
    summary: '一场大地震导致主要半导体晶圆厂短暂停止生产。',
    latestUpdates: '运营正在恢复，但预计将出现2周的积压，从而限制全球芯片供应。',
    impact: {
      sectors: ['半导体', '消费电子', '汽车'],
      positiveCompanies: ['英特尔 (INTC)', '三星电子 (005930.KS)'],
      negativeCompanies: ['苹果 (AAPL)', '特斯拉 (TSLA)', '英伟达 (NVDA)'],
    },
    date: '2024-04-03',
  }
];