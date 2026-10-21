/**
 * 工具 = 给模型的说明书（JSON Schema） + 你本地的真正实现。
 *
 * 关键认知：模型不会执行任何代码，它只输出「我想调 get_weather，参数是 { city: '北京' }」，
 * 真正跑代码的是下面的 toolImpls。所以工具是模型的手，而你是那只手的执行者。
 *
 * 经验：description 写得越准确，Agent 表现越好。
 * Agent 不干活时，90% 是这里写得烂，而不是模型不行。
 */

export const toolDefs = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '查询指定城市的当前天气。当用户询问天气、温度、湿度、是否下雨、穿什么衣服时使用。一次只能查一个城市。',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称，使用简体中文，例如：北京、上海、广州。不要带「市」字以外的多余描述。',
          },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: '获取当前时间',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      }
    }
  }
];

// 假数据：本 demo 不请求真实天气 API，避免增加依赖与密钥
const MOCK_DB = {
  北京: { city: '北京', weather: '晴', temperature: 31, humidity: 38, wind: '东南风 2 级' },
  上海: { city: '上海', weather: '多云', temperature: 27, humidity: 72, wind: '东风 3 级' },
  广州: { city: '广州', weather: '雷阵雨', temperature: 29, humidity: 85, wind: '南风 4 级' },
  深圳: { city: '深圳', weather: '阴', temperature: 28, humidity: 80, wind: '西南风 2 级' },
};

export const toolImpls = {
  async get_weather({ city }) {
    // 模拟网络耗时
    await new Promise((resolve) => setTimeout(resolve, 200));

    const key = String(city || '').replace(/市$/, '').trim();
    const record = MOCK_DB[key];

    // 故意保留「数据缺失」分支：用来演示错误回传模型后，模型会自己纠错
    if (!record) {
      throw new Error(`没有找到「${key}」的天气数据，目前只支持：${Object.keys(MOCK_DB).join('、')}`);
    }
    return record;
  },

  async get_time() {
    return new Date().toLocaleString()
  }
};

/**
 * 扩展新工具只需要两步：
 *   1. 在 toolDefs 里追加一段 JSON Schema 描述
 *   2. 在 toolImpls 里实现同名函数
 */
