/**
 * Sub-Store 脚本 - 完全复刻 mihomo.yaml 逻辑
 *
 * 更新日期: 2025-09-30
 * 修复内容: 重写节点过滤逻辑，完全匹配 mihomo.yaml 的规则
 *
 * 功能：
 * 1. 动态生成与 mihomo.yaml 完全一致的策略组
 * 2. 自动过滤高倍率节点（同时匹配大小写 x）
 * 3. 实现精确的地区、流媒体、AI 服务分组
 * 4. 自动生成完整的 rule-providers
 * 5. 注入优化的 DNS 和性能配置
 */

function main(params) {
  // 注入基础配置
  injectAdvancedConfig(params);
  
  // 生成规则集
  overwriteRuleProviders(params);
  
  // 生成策略组
  overwriteProxyGroups(params);
  
  // 生成分流规则
  overwriteRules(params);
  
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
  
  // 地区节点池
  const regionProxies = {};
  Object.entries(REGIONS).forEach(([name, regex]) => {
    regionProxies[name] = getRegionProxies(proxies, regex);
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
}

// ===== 分流规则生成 =====

function overwriteRules(params) {
  params.rules = [
    'RULE-SET,LocalAreaNetwork,🎯 全球直连',
    'RULE-SET,UnBan,🎯 全球直连',
    'RULE-SET,BanAD,🛑 广告拦截',
    'RULE-SET,BanProgramAD,🍃 应用净化',
    'RULE-SET,openAI,🌍 OpenAI',
    'RULE-SET,OpenAI,🌍 OpenAI',
    'RULE-SET,Claude,🌍 OpenAI',
    'RULE-SET,CleanIP,🌍 CleanIP',
    'RULE-SET,YouTube,📹 油管视频',
    'RULE-SET,Netflix,🎥 奈飞视频',
    'RULE-SET,AmazonIp,🎥 奈飞视频',
    'RULE-SET,Disney,🐹 DisneyPlus',
    'RULE-SET,HBO,🎦 HBO',
    'RULE-SET,HBOUSA,🎦 HBO',
    'RULE-SET,AmazonPrimeVideo,🎦 PrimeVideo',
    'RULE-SET,AppleTV,🍎 AppleTV',
    'RULE-SET,GoogleFCM,📢 谷歌FCM',
    'RULE-SET,Google,📢 谷歌',
    'RULE-SET,GoogleCN,🎯 全球直连',
    'RULE-SET,SteamCN,🎯 全球直连',
    'RULE-SET,Bing,Ⓜ️ Bing',
    'RULE-SET,OneDrive,Ⓜ️ 微软云盘',
    'RULE-SET,Microsoft,Ⓜ️ 微软服务',
    'RULE-SET,Apple,🍎 苹果服务',
    'RULE-SET,Telegram,📲 电报消息',
    'RULE-SET,Epic,🎮 游戏平台',
    'RULE-SET,Sony,🎮 游戏平台',
    'RULE-SET,Steam,🎮 游戏平台',
    'RULE-SET,Nintendo,🎮 游戏平台',
    'RULE-SET,Emby_proxy,🎬 EMBY_proxy',
    'RULE-SET,Emby_direct,🎬 EMBY_direct',
    'RULE-SET,BilibiliHMT,📺 哔哩哔哩',
    'RULE-SET,Bilibili,📺 哔哩哔哩',
    'RULE-SET,ChinaMedia,🌏 国内媒体',
    'RULE-SET,ProxyMedia,🌍 国外媒体',
    'RULE-SET,ProxyGFWlist,🚀 节点选择',
    'RULE-SET,ChinaDomain,🎯 全球直连',
    'RULE-SET,ChinaCompanyIp,🎯 全球直连',
    'RULE-SET,Download,🎯 全球直连',
    'RULE-SET,Custom_direct,🎯 全球直连',
    'GEOIP,CN,🎯 全球直连',
    'MATCH,🐟 漏网之鱼'
  ];
}

// ===== 规则集生成 =====

function overwriteRuleProviders(params) {
  const ruleProviders = {
    'LocalAreaNetwork': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list',
    'UnBan': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list',
    'BanAD': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list',
    'BanProgramAD': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanProgramAD.list',
    'openAI': 'https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/openAI.list',
    'OpenAI': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OpenAI/OpenAI.list',
    'Claude': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Claude/Claude.list',
    'CleanIP': 'https://raw.githubusercontent.com/qsd4014/ss_profile/refs/heads/main/Rules/CleanIP.list',
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
  
  params['rule-providers'] = {};
  Object.entries(ruleProviders).forEach(([name, url]) => {
    params['rule-providers'][name] = {
      type: 'http',
      behavior: 'classical',
      url,
      path: `./ruleset/${name}.list`,
      interval: 86400
    };
  });
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
}

// ===== 修复说明 =====
/*
 * 2025-09-30 重构版本
 * 
 * 修复内容：
 * 1. 完全重写节点过滤逻辑，精确匹配 mihomo.yaml 的规则
 * 2. 修复高倍率节点过滤（同时匹配大小写 x）
 * 3. 实现精确的地区节点识别和分组
 * 4. 完善流媒体服务的节点选择逻辑
 * 5. 添加容错处理，避免空节点组导致的错误
 * 6. 保持与 mihomo.yaml 完全一致的策略组结构
 * 7. 优化 DNS 和性能配置
 * 
 * 使用说明：
 * 1. 直接在 Sub-Store 中使用此脚本
 * 2. 脚本会自动识别和过滤节点
 * 3. 生成的配置与 mihomo.yaml 规则完全一致
 * 4. 支持所有主流代理客户端
 */