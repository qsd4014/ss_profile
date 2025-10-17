/**
 * Sub-Store 脚本 - 完全复刻 mihomo.yaml 逻辑
 *
 * 更新日期: 2025-10-17
 * 修复内容: 修复分流规则失效问题，优化规则顺序和调试功能
 *
 * 功能：
 * 1. 动态生成与 mihomo.yaml 完全一致的策略组
 * 2. 自动过滤高倍率节点（同时匹配大小写 x）
 * 3. 实现精确的地区、流媒体、AI 服务分组
 * 4. 自动生成完整的 rule-providers
 * 5. 注入优化的 DNS 和性能配置
 * 6. 添加详细调试日志和错误处理
 */

function main(params) {
  console.log('Sub-Store 脚本开始执行...');
  console.log('输入参数节点数量:', params.proxies ? params.proxies.length : 0);
  
  try {
    // 注入基础配置
    console.log('开始注入基础配置...');
    injectAdvancedConfig(params);
    
    // 生成规则集
    console.log('开始生成规则集...');
    overwriteRuleProviders(params);
    
    // 生成策略组
    console.log('开始生成策略组...');
    overwriteProxyGroups(params);
    
    // 生成分流规则
    console.log('开始生成分流规则...');
    overwriteRules(params);
    
    // 验证配置
    console.log('开始验证配置...');
    validateConfig(params);
    
    console.log('Sub-Store 脚本执行完成');
    
  } catch (error) {
    console.error('Sub-Store 脚本执行出错:', error);
    console.error('错误堆栈:', error.stack);
  }
  
  return params;
}

// ===== 节点过滤配置 =====

// 高倍率过滤（同时匹配大小写 x）
const HIGH_RATE_REGEX = /([2-9]|[1-9][0-9]+)[Xx]/;

// 排除关键词
const EXCLUDE_KEYWORDS_REGEX = /(HOME|电信|联通|移动|四川|广西)/i;

// 0.X 低倍率识别
const LOW_RATE_REGEX = /(0\.[0-9]+|直连|下载)/i;

// 公益节点识别
const FREE_NODE_REGEX = /(Hax|hax|VC|Vc|vc|buyvm|BuyVM|BUYVM|鸡|Woiden|woiden|Euserv|Optimization|Akari|FREE|Oracle|oracle|Vult|advins|CF)/i;

// 自建节点识别
const SELF_BUILD_REGEX = /(自建|Oracle|oracle)/i;

// 地区节点识别
const REGIONS = {
  '🇭🇰 香港节点': /(香港|HK|Hong Kong)/i,
  '🇯🇵 日本节点': /(日本|川日|东京|大阪|泉日|埼玉|沪日|深日|[^-]日|JP|Japan)/i,
  '🇺🇲 美国节点': /(美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|US|United States|us)/i,
  '🇨🇳 台湾节点': /(台|新北|彰化|TW|Taiwan)/i,
  '🇸🇬 狮城节点': /(新加坡|坡|狮城|SG|Singapore)/i,
  '🇰🇷 韩国节点': /(KR|Korea|KOR|首尔|韩|韓)/i
};

// 流媒体地区识别（奈飞、迪士尼适用）
const STREAMING_REGIONS = /(新加坡|坡|狮城|SG|Singapore|美|US|us|香港|HK|台|TW|Taiwan)/i;

// ===== 工具函数 =====

/**
 * 检查节点是否有效（排除高倍率和特定关键词）
 */
function isValidNode(name) {
  return !HIGH_RATE_REGEX.test(name) && !EXCLUDE_KEYWORDS_REGEX.test(name);
}

/**
 * 筛选符合条件的节点
 */
function filterProxies(proxies, filterFn) {
  return proxies.filter(p => filterFn(p.name)).map(p => p.name);
}

/**
 * 获取地区节点
 */
function getRegionProxies(proxies, regex) {
  return filterProxies(proxies, name => regex.test(name) && isValidNode(name));
}

/**
 * 获取流媒体适用的节点
 */
function getStreamingProxies(proxies) {
  return filterProxies(proxies, name => STREAMING_REGIONS.test(name) && isValidNode(name));
}

// ===== 策略组生成 =====

function overwriteProxyGroups(params) {
  const { proxies } = params;
  
  // 基础节点池
  const allProxyNames = proxies.map(p => p.name);
  const validProxies = filterProxies(proxies, name => isValidNode(name));
  
  // 特殊节点池
  const lowRateProxies = filterProxies(proxies, name => LOW_RATE_REGEX.test(name) && isValidNode(name));
  const freeProxies = filterProxies(proxies, name => FREE_NODE_REGEX.test(name));
  const selfBuildProxies = filterProxies(proxies, name => SELF_BUILD_REGEX.test(name));
  const streamingProxies = getStreamingProxies(proxies);
  
  console.log('节点统计: 总计', allProxyNames.length, '个，有效', validProxies.length, '个');
  console.log('特殊节点: 低倍率', lowRateProxies.length, '个，公益', freeProxies.length, '个，自建', selfBuildProxies.length, '个');
  
  // 地区节点池
  const regionProxies = {};
  Object.entries(REGIONS).forEach(([name, regex]) => {
    regionProxies[name] = getRegionProxies(proxies, regex);
    console.log('地区节点', name + ':', regionProxies[name].length, '个');
  });
  
  // 定义策略组
  params['proxy-groups'] = [
    // 主要策略组
    {
      name: '🚀 节点选择',
      type: 'select',
      proxies: [
        '♻️ 自动选择',
        '0.X',
        '🆓 公益',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🔯 故障转移',
        '🔮 负载均衡',
        ...Object.keys(REGIONS),
        'DIRECT'
      ]
    },
    
    // 手动选择组
    { name: '✈️ 手动选择', type: 'select', proxies: allProxyNames },
    { name: '🛩️ 手动选择备用', type: 'select', proxies: allProxyNames },
    
    // 通讯服务
    {
      name: '📲 电报消息',
      type: 'select',
      proxies: [
        '🚀 节点选择',
        '♻️ 自动选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🇸🇬 狮城节点',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇯🇵 日本节点',
        '🇺🇲 美国节点',
        '🇰🇷 韩国节点',
        'DIRECT'
      ]
    },
    
    // AI 服务
    { 
      name: '🌍 OpenAI', 
      type: 'select', 
      proxies: allProxyNames.length > 0 ? allProxyNames : ['DIRECT']
    },
    { 
      name: '🌍 CleanIP', 
      type: 'select', 
      proxies: allProxyNames.length > 0 ? allProxyNames : ['DIRECT']
    },
    
    // 流媒体服务
    {
      name: '📹 油管视频',
      type: 'select',
      proxies: [
        '🆓 公益',
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '♻️ 自动选择',
        '🇸🇬 狮城节点',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇯🇵 日本节点',
        '🇺🇲 美国节点',
        '🇰🇷 韩国节点',
        'DIRECT'
      ]
    },
    
    {
      name: '🎥 奈飞视频',
      type: 'select',
      proxies: streamingProxies.length > 0 ? ['✈️ 手动选择', ...streamingProxies] : ['✈️ 手动选择', 'DIRECT']
    },
    
    {
      name: '🐹 DisneyPlus',
      type: 'select',
      proxies: streamingProxies.length > 0 ? [
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        ...streamingProxies
      ] : ['✈️ 手动选择', '🛩️ 手动选择备用', '🚁 自建节点', 'DIRECT']
    },
    
    // EMBY 服务
    {
      name: '🎬 EMBY_proxy',
      type: 'select',
      proxies: [
        '🆓 公益',
        '0.X',
        '🚁 自建节点',
        '🔮 负载均衡',
        'DIRECT',
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用'
      ]
    },
    
    {
      name: '🎬 EMBY_direct',
      type: 'select',
      proxies: [
        'DIRECT',
        '🆓 公益',
        '0.X',
        '🚁 自建节点',
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用'
      ]
    },
    
    {
      name: '🎦 HBO',
      type: 'select',
      proxies: regionProxies['🇺🇲 美国节点'].length > 0 ? [
        '🇺🇲 美国节点',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点'
      ] : ['✈️ 手动选择', '🛩️ 手动选择备用', '🚁 自建节点', 'DIRECT']
    },
    
    {
      name: '🎦 PrimeVideo',
      type: 'select',
      proxies: regionProxies['🇺🇲 美国节点'].length > 0 ? [
        '🇺🇲 美国节点',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点'
      ] : ['✈️ 手动选择', '🛩️ 手动选择备用', '🚁 自建节点', 'DIRECT']
    },
    
    {
      name: '🍎 AppleTV',
      type: 'select',
      proxies: ['DIRECT', '✈️ 手动选择', '🛩️ 手动选择备用', '🚁 自建节点']
    },
    
    // 哔哩哔哩
    {
      name: '📺 哔哩哔哩',
      type: 'select',
      proxies: [
        '🎯 全球直连',
        ...(regionProxies['🇨🇳 台湾节点'].length > 0 ? ['🇨🇳 台湾节点'] : []),
        ...(regionProxies['🇭🇰 香港节点'].length > 0 ? ['🇭🇰 香港节点'] : [])
      ]
    },
    
    // 科技服务
    {
      name: '📢 谷歌FCM',
      type: 'select',
      proxies: [
        'DIRECT',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🇺🇲 美国节点',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇸🇬 狮城节点',
        '🇯🇵 日本节点',
        '🇰🇷 韩国节点'
      ]
    },
    
    {
      name: '📢 谷歌',
      type: 'select',
      proxies: [
        '🇺🇲 美国节点',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇸🇬 狮城节点',
        '🇯🇵 日本节点',
        '🇰🇷 韩国节点'
      ]
    },
    
    // 媒体分类
    {
      name: '🌍 国外媒体',
      type: 'select',
      proxies: [
        '🚀 节点选择',
        '♻️ 自动选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇸🇬 狮城节点',
        '🇯🇵 日本节点',
        '🇺🇲 美国节点',
        '🇰🇷 韩国节点',
        'DIRECT'
      ]
    },
    
    {
      name: '🌏 国内媒体',
      type: 'select',
      proxies: [
        'DIRECT',
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇸🇬 狮城节点',
        '🇯🇵 日本节点'
      ]
    },
    
    {
      name: '🍎 苹果服务',
      type: 'select',
      proxies: [
        'DIRECT',
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🇺🇲 美国节点',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇸🇬 狮城节点',
        '🇯🇵 日本节点',
        '🇰🇷 韩国节点'
      ]
    },
    
    {
      name: 'Ⓜ️ Bing',
      type: 'select',
      proxies: [
        '🇺🇲 美国节点',
        'DIRECT',
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇸🇬 狮城节点',
        '🇯🇵 日本节点',
        '🇰🇷 韩国节点'
      ]
    },
    
    {
      name: 'Ⓜ️ 微软云盘',
      type: 'select',
      proxies: [
        'DIRECT',
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🇺🇲 美国节点',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇸🇬 狮城节点',
        '🇯🇵 日本节点',
        '🇰🇷 韩国节点'
      ]
    },
    
    {
      name: 'Ⓜ️ 微软服务',
      type: 'select',
      proxies: [
        'DIRECT',
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🇺🇲 美国节点',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇸🇬 狮城节点',
        '🇯🇵 日本节点',
        '🇰🇷 韩国节点'
      ]
    },
    
    // 游戏平台
    {
      name: '🎮 游戏平台',
      type: 'select',
      proxies: [
        'DIRECT',
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🇺🇲 美国节点',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇸🇬 狮城节点',
        '🇯🇵 日本节点',
        '🇰🇷 韩国节点'
      ]
    },
    
    // 系统策略组
    {
      name: '🎯 全球直连',
      type: 'select',
      proxies: ['DIRECT', '♻️ 自动选择']
    },
    
    {
      name: '🛑 广告拦截',
      type: 'select',
      proxies: ['REJECT', 'DIRECT']
    },
    
    {
      name: '🍃 应用净化',
      type: 'select',
      proxies: ['REJECT', 'DIRECT']
    },
    
    {
      name: '🐟 漏网之鱼',
      type: 'select',
      proxies: [
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '♻️ 自动选择',
        'DIRECT',
        '🇭🇰 香港节点',
        '🇨🇳 台湾节点',
        '🇸🇬 狮城节点',
        '🇯🇵 日本节点',
        '🇺🇲 美国节点',
        '🇰🇷 韩国节点'
      ]
    },
    
    // 特殊节点组
    {
      name: '0.X',
      type: 'select',
      proxies: lowRateProxies.length > 0 ? lowRateProxies : ['DIRECT']
    },
    
    // 地区节点组
    ...Object.entries(REGIONS).map(([name, regex]) => ({
      name,
      type: regionProxies[name].length > 1 ? 'url-test' : 'select',
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      tolerance: 50,
      proxies: regionProxies[name].length > 0 ? regionProxies[name] : ['DIRECT']
    })),
    
    // 公益节点
    {
      name: '🆓 公益',
      type: 'select',
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      tolerance: 50,
      proxies: freeProxies.length > 0 ? freeProxies : ['DIRECT']
    },
    
    {
      name: '🚁 自建节点',
      type: 'select',
      proxies: selfBuildProxies.length > 0 ? selfBuildProxies : ['DIRECT']
    },
    
    // 自动策略
    {
      name: '♻️ 自动选择',
      type: 'url-test',
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      tolerance: 50,
      proxies: validProxies.length > 0 ? validProxies : ['DIRECT']
    },
    
    {
      name: '🔯 故障转移',
      type: 'fallback',
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      tolerance: 50,
      lazy: true,
      proxies: validProxies.length > 0 ? validProxies : ['DIRECT']
    },
    
    {
      name: '🔮 负载均衡',
      type: 'load-balance',
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      tolerance: 50,
      strategy: 'round-robin',
      proxies: selfBuildProxies.length > 0 ? selfBuildProxies : (validProxies.length > 0 ? validProxies : ['DIRECT'])
    }
  ];
  
  console.log('策略组生成完成，共', params['proxy-groups'].length, '个策略组');
}

// ===== 分流规则生成 =====

function overwriteRules(params) {
  params.rules = [
    // 本地和解锁规则 (最高优先级)
    'RULE-SET,LocalAreaNetwork,🎯 全球直连',
    'RULE-SET,UnBan,🎯 全球直连',
    
    // 广告拦截规则
    'RULE-SET,BanAD,🛑 广告拦截',
    'RULE-SET,BanProgramAD,🍃 应用净化',
    
    // AI服务规则 (修复：移除重复的openAI规则)
    'RULE-SET,OpenAI,🌍 OpenAI',
    'RULE-SET,Claude,🌍 OpenAI',
    'RULE-SET,CleanIP,🌍 CleanIP',
    
    // 流媒体和服务规则
    'RULE-SET,YouTube,📹 油管视频',
    'RULE-SET,Netflix,🎥 奈飞视频',
    'RULE-SET,AmazonIp,🎥 奈飞视频',
    'RULE-SET,Disney,🐹 DisneyPlus',
    'RULE-SET,HBO,🎦 HBO',
    'RULE-SET,HBOUSA,🎦 HBO',
    'RULE-SET,AmazonPrimeVideo,🎦 PrimeVideo',
    'RULE-SET,AppleTV,🍎 AppleTV',
    
    // 通讯和科技服务
    'RULE-SET,GoogleFCM,📢 谷歌FCM',
    'RULE-SET,Google,📢 谷歌',
    'RULE-SET,Telegram,📲 电报消息',
    
    // 国内服务规则
    'RULE-SET,GoogleCN,🎯 全球直连',
    'RULE-SET,SteamCN,🎯 全球直连',
    'RULE-SET,Bing,Ⓜ️ Bing',
    'RULE-SET,OneDrive,Ⓜ️ 微软云盘',
    'RULE-SET,Microsoft,Ⓜ️ 微软服务',
    'RULE-SET,Apple,🍎 苹果服务',
    
    // 游戏平台
    'RULE-SET,Epic,🎮 游戏平台',
    'RULE-SET,Sony,🎮 游戏平台',
    'RULE-SET,Steam,🎮 游戏平台',
    'RULE-SET,Nintendo,🎮 游戏平台',
    
    // EMBY和媒体服务
    'RULE-SET,Emby_proxy,🎬 EMBY_proxy',
    'RULE-SET,Emby_direct,🎬 EMBY_direct',
    'RULE-SET,BilibiliHMT,📺 哔哩哔哩',
    'RULE-SET,Bilibili,📺 哔哩哔哩',
    'RULE-SET,ChinaMedia,🌏 国内媒体',
    'RULE-SET,ProxyMedia,🌍 国外媒体',
    
    // 代理和国内规则
    'RULE-SET,ProxyGFWlist,🚀 节点选择',
    'RULE-SET,ChinaDomain,🎯 全球直连',
    'RULE-SET,ChinaCompanyIp,🎯 全球直连',
    'RULE-SET,Download,🎯 全球直连',
    'RULE-SET,Custom_direct,🎯 全球直连',
    
    // IP规则 (调整位置，确保在MATCH之前)
    'GEOIP,CN,🎯 全球直连',
    
    // 兜底规则 (必须在最后)
    'MATCH,🐟 漏网之鱼'
  ];
  
  console.log('分流规则配置完成，共', params.rules.length, '条规则');
  
  // 输出规则详细信息 (调试用)
  params.rules.forEach((rule, index) => {
    console.log(`规则 ${index + 1}: ${rule}`);
  });
}

// ===== 规则集生成 =====

function overwriteRuleProviders(params) {
  const ruleProviders = {
    'LocalAreaNetwork': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list',
    'UnBan': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list',
    'BanAD': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list',
    'BanProgramAD': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanProgramAD.list',
    
    // 修改：统一OpenAI规则，移除重复的openAI
    'OpenAI': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OpenAI/OpenAI.list',
    'Claude': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Claude/Claude.list',
    
    // 修改：统一使用main分支路径
    'CleanIP': 'https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/CleanIP.list',
    
    'YouTube': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/YouTube.list',
    'Netflix': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Netflix/Netflix.list',
    'AmazonIp': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/AmazonIp.list',
    'Disney': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Disney/Disney.list',
    'HBO': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/HBO/HBO.list',
    'HBOUSA': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/HBOUSA/HBOUSA.list',
    'AmazonPrimeVideo': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/AmazonPrimeVideo/AmazonPrimeVideo.list',
    'AppleTV': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/AppleTV/AppleTV.list',
    'GoogleFCM': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/GoogleFCM.list',
    'Google': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Google.list',
    'GoogleCN': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/GoogleCN.list',
    'SteamCN': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/SteamCN.list',
    'Bing': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Bing/Bing.list',
    'OneDrive': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/OneDrive.list',
    'Microsoft': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Microsoft.list',
    'Apple': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Apple.list',
    'Telegram': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list',
    'Epic': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Epic.list',
    'Sony': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Sony.list',
    'Steam': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Steam.list',
    'Nintendo': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Nintendo.list',
    'Emby_proxy': 'https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/Emby_proxy.list',
    'Emby_direct': 'https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/Emby_direct.list',
    'BilibiliHMT': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/BilibiliHMT.list',
    'Bilibili': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Bilibili.list',
    'ChinaMedia': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaMedia.list',
    'ProxyMedia': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list',
    'ProxyGFWlist': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyGFWlist.list',
    'ChinaDomain': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list',
    'ChinaCompanyIp': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaCompanyIp.list',
    'Download': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Download.list',
    'Custom_direct': 'https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/Custom_direct.list'
  };
  
  // 添加错误处理和日志输出
  params['rule-providers'] = {};
  Object.entries(ruleProviders).forEach(([name, url]) => {
    params['rule-providers'][name] = {
      type: 'http',
      behavior: 'classical',
      url,
      path: `./ruleset/${name}.list`,
      interval: 86400
    };
    
    console.log(`规则集 ${name} 已配置: ${url}`);
  });
  
  console.log('规则集配置完成，共', Object.keys(ruleProviders).length, '个规则集');
}

// ===== 配置验证函数 =====

function validateConfig(params) {
  const issues = [];
  
  // 检查必要的策略组是否存在
  const requiredGroups = ['🎯 全球直连', '🛑 广告拦截', '🍃 应用净化', '🌍 OpenAI', '🐟 漏网之鱼'];
  const existingGroups = (params['proxy-groups'] || []).map(g => g.name);
  
  requiredGroups.forEach(group => {
    if (!existingGroups.includes(group)) {
      issues.push(`缺少必要的策略组: ${group}`);
    }
  });
  
  // 检查规则集是否都有对应的定义
  const ruleSetNames = new Set();
  (params.rules || []).forEach(rule => {
    if (rule.startsWith('RULE-SET,')) {
      const ruleName = rule.split(',')[1];
      ruleSetNames.add(ruleName);
    }
  });
  
  const definedProviders = Object.keys(params['rule-providers'] || {});
  ruleSetNames.forEach(name => {
    if (!definedProviders.includes(name)) {
      issues.push(`规则集 ${name} 未在 rule-providers 中定义`);
    }
  });
  
  // 检查规则顺序
  const ruleTexts = params.rules || [];
  const geoipIndex = ruleTexts.findIndex(rule => rule.startsWith('GEOIP,'));
  const matchIndex = ruleTexts.findIndex(rule => rule.startsWith('MATCH,'));
  
  if (geoipIndex !== -1 && matchIndex !== -1 && geoipIndex >= matchIndex) {
    issues.push('GEOIP规则应该在MATCH规则之前');
  }
  
  if (issues.length > 0) {
    console.warn('配置验证发现问题:');
    issues.forEach(issue => console.warn(`- ${issue}`));
    return false;
  } else {
    console.log('配置验证通过');
    return true;
  }
}

// ===== 高级配置注入 =====

function injectAdvancedConfig(params) {
  // DNS 配置
  const dnsConfig = {
    enable: true,
    listen: '0.0.0.0:1053',
    ipv6: false,
    'prefer-h3': true,
    'respect-rules': true,
    'enhanced-mode': 'fake-ip',
    'cache-algorithm': 'arc',
    'cache-size': 2048,
    'fake-ip-range': '198.18.0.1/16',
    'default-nameserver': ['223.5.5.5', '1.1.1.1'],
    nameserver: [
      'https://1.1.1.1/dns-query',
      'https://dns.google/dns-query',
      'https://dns.alidns.com/dns-query'
    ],
    'nameserver-policy': {
      'geosite:cn,private': [
        'https://223.5.5.5/dns-query',
        'https://doh.pub/dns-query'
      ]
    },
    fallback: [
      'https://8.8.8.8/dns-query',
      'tls://1.0.0.1:853'
    ],
    'fallback-filter': {
      geoip: true,
      'geoip-code': 'CN',
      geosite: ['geolocation-!cn']
    }
  };
  
  // GEO 数据库配置
  const geoxConfig = {
    'geodata-mode': true,
    'geodata-loader': 'memconservative',
    'geo-auto-update': true,
    'geo-update-interval': 48,
    'geox-url': {
      geoip: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat',
      geosite: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat',
      mmdb: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.metadb'
    }
  };
  
  // 流量嗅探配置
  const snifferConfig = {
    enable: true,
    sniff: {
      HTTP: {
        ports: [80, '8080-8880'],
        'override-destination': true
      },
      TLS: {
        ports: [443, 8443]
      }
    },
    'force-domain': ['+.v2ex.com'],
    'skip-domain': ['+.baidu.com', '+.bilibili.com']
  };
  
  // 应用配置
  params.dns = dnsConfig;
  Object.assign(params, geoxConfig);
  params.sniffer = snifferConfig;
  params['tcp-concurrent'] = true;
  params['unified-delay'] = true;
  params['global-client-fingerprint'] = 'chrome';
  
  console.log('高级配置注入完成');
}

// ===== 修复说明 =====
/*
 * 2025-10-17 问题修复版本
 * 
 * 主要修复内容：
 * 1. 移除重复的openAI规则集定义和引用
 * 2. 统一规则集URL路径格式 (使用main而不是refs/heads/main)
 * 3. 优化规则顺序，确保特定规则在通用规则之前
 * 4. 添加详细的调试日志输出和错误处理
 * 5. 增加配置验证功能，检查策略组和规则集匹配性
 * 6. 确保GEOIP规则在MATCH规则之前
 * 7. 添加节点统计和分类信息输出
 * 
 * 调试功能：
 * 1. 详细的控制台日志输出
 * 2. 节点分类统计信息
 * 3. 规则顺序验证
 * 4. 配置完整性检查
 * 5. 错误处理和异常捕获
 * 
 * 使用说明：
 * 1. 直接在 Sub-Store 中使用此脚本
 * 2. 查看浏览器开发者工具控制台获取详细日志
 * 3. 脚本会自动验证配置完整性
 * 4. 生成的配置与 mihomo.yaml 规则完全一致
 */