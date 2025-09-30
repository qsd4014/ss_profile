/**
 * Sub-Store 脚本 - 完全复刻 mihomo.yaml 规则的 SingBox 版本
 *
 * 更新日期: 2025-09-30
 * 版本: 1.0.0
 * 适配: SingBox v1.11+
 *
 * 功能：
 * 1. 将 mihomo.yaml/clash.ini 的策略组逻辑完全转换为 SingBox 格式
 * 2. 自动过滤高倍率节点（同时匹配大小写 x）
 * 3. 实现与 Clash 完全一致的地区、流媒体、AI 服务分组
 * 4. 自动生成 SingBox 格式的路由规则和规则集
 * 5. 注入 SingBox 专用的网络和性能配置
 * 6. 保持与原配置文件相同的节点选择和过滤逻辑
 */

function main(params) {
  // 注入 SingBox 基础配置
  injectSingBoxConfig(params);
  
  // 生成 SingBox 出站配置（对应 Clash 的 proxy-groups）
  overwriteOutbounds(params);
  
  // 生成 SingBox 路由规则
  overwriteRoute(params);
  
  // 清理不需要的字段
  cleanupConfig(params);
  
  return params;
}

// ===== 节点过滤配置（与 Clash 版本保持一致） =====

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
  return proxies.filter(p => filterFn(p.name || p.tag)).map(p => p.tag || p.name);
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

// ===== SingBox 出站配置生成 =====

function overwriteOutbounds(params) {
  const { proxies } = params;
  
  // 基础节点池
  const allProxyTags = proxies.map(p => p.tag || p.name);
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
  
  // 将原有代理节点保留，并添加策略组出站
  const outbounds = [...proxies];
  
  // 添加策略组出站
  const policyGroups = [
    // 主要策略组
    {
      type: 'selector',
      tag: '🚀 节点选择',
      outbounds: [
        '♻️ 自动选择',
        '0.X',
        '🆓 公益',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        '🔯 故障转移',
        '🔮 负载均衡',
        ...Object.keys(REGIONS),
        'direct'
      ]
    },
    
    // 手动选择组
    { type: 'selector', tag: '✈️ 手动选择', outbounds: allProxyTags.length > 0 ? allProxyTags : ['direct'] },
    { type: 'selector', tag: '🛩️ 手动选择备用', outbounds: allProxyTags.length > 0 ? allProxyTags : ['direct'] },
    
    // 通讯服务
    {
      type: 'selector',
      tag: '📲 电报消息',
      outbounds: [
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
        'direct'
      ]
    },
    
    // AI 服务
    { 
      type: 'selector', 
      tag: '🌍 OpenAI', 
      outbounds: allProxyTags.length > 0 ? allProxyTags : ['direct']
    },
    { 
      type: 'selector', 
      tag: '🌍 CleanIP', 
      outbounds: allProxyTags.length > 0 ? allProxyTags : ['direct']
    },
    
    // 流媒体服务
    {
      type: 'selector',
      tag: '📹 油管视频',
      outbounds: [
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
        'direct'
      ]
    },
    
    {
      type: 'selector',
      tag: '🎥 奈飞视频',
      outbounds: streamingProxies.length > 0 ? ['✈️ 手动选择', ...streamingProxies] : ['✈️ 手动选择', 'direct']
    },
    
    {
      type: 'selector',
      tag: '🐹 DisneyPlus',
      outbounds: streamingProxies.length > 0 ? [
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点',
        ...streamingProxies
      ] : ['✈️ 手动选择', '🛩️ 手动选择备用', '🚁 自建节点', 'direct']
    },
    
    // EMBY 服务
    {
      type: 'selector',
      tag: '🎬 EMBY_proxy',
      outbounds: [
        '🆓 公益',
        '0.X',
        '🚁 自建节点',
        '🔮 负载均衡',
        'direct',
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用'
      ]
    },
    
    {
      type: 'selector',
      tag: '🎬 EMBY_direct',
      outbounds: [
        'direct',
        '🆓 公益',
        '0.X',
        '🚁 自建节点',
        '🚀 节点选择',
        '✈️ 手动选择',
        '🛩️ 手动选择备用'
      ]
    },
    
    {
      type: 'selector',
      tag: '🎦 HBO',
      outbounds: regionProxies['🇺🇲 美国节点'].length > 0 ? [
        '🇺🇲 美国节点',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点'
      ] : ['✈️ 手动选择', '🛩️ 手动选择备用', '🚁 自建节点', 'direct']
    },
    
    {
      type: 'selector',
      tag: '🎦 PrimeVideo',
      outbounds: regionProxies['🇺🇲 美国节点'].length > 0 ? [
        '🇺🇲 美国节点',
        '✈️ 手动选择',
        '🛩️ 手动选择备用',
        '🚁 自建节点'
      ] : ['✈️ 手动选择', '🛩️ 手动选择备用', '🚁 自建节点', 'direct']
    },
    
    {
      type: 'selector',
      tag: '🍎 AppleTV',
      outbounds: ['direct', '✈️ 手动选择', '🛩️ 手动选择备用', '🚁 自建节点']
    },
    
    // 哔哩哔哩
    {
      type: 'selector',
      tag: '📺 哔哩哔哩',
      outbounds: [
        'direct',
        ...(regionProxies['🇨🇳 台湾节点'].length > 0 ? ['🇨🇳 台湾节点'] : []),
        ...(regionProxies['🇭🇰 香港节点'].length > 0 ? ['🇭🇰 香港节点'] : [])
      ]
    },
    
    // 科技服务
    {
      type: 'selector',
      tag: '📢 谷歌FCM',
      outbounds: [
        'direct',
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
      type: 'selector',
      tag: '📢 谷歌',
      outbounds: [
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
      type: 'selector',
      tag: '🌍 国外媒体',
      outbounds: [
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
        'direct'
      ]
    },
    
    {
      type: 'selector',
      tag: '🌏 国内媒体',
      outbounds: [
        'direct',
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
      type: 'selector',
      tag: '🍎 苹果服务',
      outbounds: [
        'direct',
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
      type: 'selector',
      tag: 'Ⓜ️ Bing',
      outbounds: [
        '🇺🇲 美国节点',
        'direct',
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
      type: 'selector',
      tag: 'Ⓜ️ 微软云盘',
      outbounds: [
        'direct',
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
      type: 'selector',
      tag: 'Ⓜ️ 微软服务',
      outbounds: [
        'direct',
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
      type: 'selector',
      tag: '🎮 游戏平台',
      outbounds: [
        'direct',
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
      type: 'selector',
      tag: '🛑 广告拦截',
      outbounds: ['block', 'direct']
    },
    
    {
      type: 'selector',
      tag: '🍃 应用净化',
      outbounds: ['block', 'direct']
    },
    
    // 特殊节点组
    {
      type: 'selector',
      tag: '0.X',
      outbounds: lowRateProxies.length > 0 ? lowRateProxies : ['direct']
    },
    
    // 地区节点组
    ...Object.entries(REGIONS).map(([name, regex]) => ({
      type: regionProxies[name].length > 1 ? 'urltest' : 'selector',
      tag: name,
      outbounds: regionProxies[name].length > 0 ? regionProxies[name] : ['direct'],
      ...(regionProxies[name].length > 1 && {
        url: 'https://www.gstatic.com/generate_204',
        interval: '5m',
        tolerance: 50
      })
    })),
    
    // 公益节点
    {
      type: 'selector',
      tag: '🆓 公益',
      outbounds: freeProxies.length > 0 ? freeProxies : ['direct']
    },
    
    {
      type: 'selector',
      tag: '🚁 自建节点',
      outbounds: selfBuildProxies.length > 0 ? selfBuildProxies : ['direct']
    },
    
    // 自动策略
    {
      type: 'urltest',
      tag: '♻️ 自动选择',
      outbounds: validProxies.length > 0 ? validProxies : ['direct'],
      url: 'https://www.gstatic.com/generate_204',
      interval: '5m',
      tolerance: 50
    },
    
    {
      type: 'urltest',
      tag: '🔯 故障转移',
      outbounds: validProxies.length > 0 ? validProxies : ['direct'],
      url: 'https://www.gstatic.com/generate_204',
      interval: '5m',
      tolerance: 50,
      interrupt_exist_connections: false
    },
    
    {
      type: 'urltest',
      tag: '🔮 负载均衡',
      outbounds: selfBuildProxies.length > 0 ? selfBuildProxies : (validProxies.length > 0 ? validProxies : ['direct']),
      url: 'https://www.gstatic.com/generate_204',
      interval: '5m',
      tolerance: 50
    }
  ];
  
  // 添加必要的系统出站
  outbounds.push(
    { type: 'direct', tag: 'direct' },
    { type: 'block', tag: 'block' },
    { type: 'dns', tag: 'dns-out' }
  );
  
  // 将策略组添加到出站
  outbounds.push(...policyGroups);
  
  params.outbounds = outbounds;
}

// ===== SingBox 路由规则生成 =====

function overwriteRoute(params) {
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
  
  // 生成规则集
  const rule_set = Object.entries(ruleProviders).map(([name, url]) => ({
    type: 'remote',
    tag: name,
    format: 'source',
    url,
    download_detour: 'direct',
    update_interval: '24h'
  }));
  
  // SingBox 路由规则
  const rules = [
    // DNS 规则
    { protocol: 'dns', outbound: 'dns-out' },
    
    // 本地规则
    { rule_set: ['LocalAreaNetwork', 'UnBan'], outbound: 'direct' },
    
    // 广告拦截
    { rule_set: ['BanAD'], outbound: '🛑 广告拦截' },
    { rule_set: ['BanProgramAD'], outbound: '🍃 应用净化' },
    
    // AI 服务
    { rule_set: ['openAI', 'OpenAI', 'Claude'], outbound: '🌍 OpenAI' },
    { rule_set: ['CleanIP'], outbound: '🌍 CleanIP' },
    
    // 流媒体服务
    { rule_set: ['YouTube'], outbound: '📹 油管视频' },
    { rule_set: ['Netflix', 'AmazonIp'], outbound: '🎥 奈飞视频' },
    { rule_set: ['Disney'], outbound: '🐹 DisneyPlus' },
    { rule_set: ['HBO', 'HBOUSA'], outbound: '🎦 HBO' },
    { rule_set: ['AmazonPrimeVideo'], outbound: '🎦 PrimeVideo' },
    { rule_set: ['AppleTV'], outbound: '🍎 AppleTV' },
    
    // 谷歌服务
    { rule_set: ['GoogleFCM'], outbound: '📢 谷歌FCM' },
    { rule_set: ['Google'], outbound: '📢 谷歌' },
    
    // 国内谷歌服务直连
    { rule_set: ['GoogleCN', 'SteamCN'], outbound: 'direct' },
    
    // 微软服务
    { rule_set: ['Bing'], outbound: 'Ⓜ️ Bing' },
    { rule_set: ['OneDrive'], outbound: 'Ⓜ️ 微软云盘' },
    { rule_set: ['Microsoft'], outbound: 'Ⓜ️ 微软服务' },
    
    // 苹果服务
    { rule_set: ['Apple'], outbound: '🍎 苹果服务' },
    
    // 电报
    { rule_set: ['Telegram'], outbound: '📲 电报消息' },
    
    // 游戏平台
    { rule_set: ['Epic', 'Sony', 'Steam', 'Nintendo'], outbound: '🎮 游戏平台' },
    
    // EMBY 服务
    { rule_set: ['Emby_proxy'], outbound: '🎬 EMBY_proxy' },
    { rule_set: ['Emby_direct'], outbound: '🎬 EMBY_direct' },
    
    // 哔哩哔哩
    { rule_set: ['BilibiliHMT', 'Bilibili'], outbound: '📺 哔哩哔哩' },
    
    // 国内外媒体
    { rule_set: ['ChinaMedia'], outbound: '🌏 国内媒体' },
    { rule_set: ['ProxyMedia'], outbound: '🌍 国外媒体' },
    
    // 代理规则
    { rule_set: ['ProxyGFWlist'], outbound: '🚀 节点选择' },
    
    // 直连规则
    { rule_set: ['ChinaDomain', 'ChinaCompanyIp', 'Download', 'Custom_direct'], outbound: 'direct' },
    
    // 地理位置规则
    { geoip: ['cn'], outbound: 'direct' }
  ];
  
  params.route = {
    auto_detect_interface: true,
    final: '🚀 节点选择',
    rule_set,
    rules
  };
}

// ===== SingBox 配置注入 =====

function injectSingBoxConfig(params) {
  // 日志配置
  params.log = {
    disabled: false,
    level: 'info',
    timestamp: true
  };
  
  // DNS 配置（SingBox 格式）
  params.dns = {
    servers: [
      {
        tag: 'cloudflare',
        address: 'https://1.1.1.1/dns-query',
        address_resolver: 'dns_resolver',
        strategy: 'prefer_ipv4',
        detour: '🚀 节点选择'
      },
      {
        tag: 'google',
        address: 'https://8.8.8.8/dns-query',
        address_resolver: 'dns_resolver',
        strategy: 'prefer_ipv4',
        detour: '🚀 节点选择'
      },
      {
        tag: 'ali',
        address: 'https://223.5.5.5/dns-query',
        detour: 'direct'
      },
      {
        tag: 'dns_resolver',
        address: '223.5.5.5',
        detour: 'direct'
      },
      {
        tag: 'block',
        address: 'rcode://success'
      }
    ],
    rules: [
      {
        rule_set: ['geosite-cn'],
        server: 'ali'
      },
      {
        clash_mode: 'direct',
        server: 'ali'
      },
      {
        clash_mode: 'global',
        server: 'cloudflare'
      },
      {
        type: 'logical',
        mode: 'and',
        rules: [
          {
            rule_set: ['geosite-geolocation-!cn']
          },
          {
            rule_set: ['geoip-cn'],
            invert: true
          }
        ],
        server: 'cloudflare'
      }
    ],
    final: 'ali',
    strategy: 'prefer_ipv4',
    disable_cache: false,
    disable_expire: false,
    independent_cache: false,
    reverse_mapping: false,
    fakeip: {
      enabled: true,
      inet4_range: '198.18.0.1/15',
      inet6_range: 'fc00::/18'
    }
  };
  
  // 入站配置
  if (!params.inbounds) {
    params.inbounds = [
      {
        type: 'mixed',
        tag: 'mixed-in',
        listen: '127.0.0.1',
        listen_port: 2080,
        sniff: true,
        sniff_override_destination: true,
        domain_strategy: 'prefer_ipv4'
      },
      {
        type: 'tun',
        tag: 'tun-in',
        interface_name: 'tun0',
        inet4_address: '172.19.0.1/30',
        auto_route: true,
        strict_route: true,
        stack: 'mixed',
        sniff: true,
        sniff_override_destination: true
      }
    ];
  }
  
  // Clash API 配置
  params.experimental = {
    clash_api: {
      external_controller: '127.0.0.1:9090',
      external_ui: 'ui',
      external_ui_download_url: 'https://github.com/MetaCubeX/Yacd-meta/archive/gh-pages.zip',
      external_ui_download_detour: 'direct',
      secret: 'your-secret-key',
      default_mode: 'rule'
    },
    cache_file: {
      enabled: true,
      store_fakeip: true
    }
  };
}

// ===== 清理配置 =====

function cleanupConfig(params) {
  // 删除 Clash 特有的配置项
  delete params.proxies;
  delete params['proxy-groups'];
  delete params['proxy-providers'];
  delete params['rule-providers'];
  delete params.rules;
  delete params.port;
  delete params['socks-port'];
  delete params['mixed-port'];
  delete params['allow-lan'];
  delete params.mode;
  delete params['log-level'];
  delete params['find-process-mode'];
  delete params['unified-delay'];
  delete params['tcp-concurrent'];
  delete params['global-client-fingerprint'];
  delete params['keep-alive-idle'];
  delete params['keep-alive-interval'];
  delete params['external-controller'];
  delete params.secret;
  delete params['external-ui-url'];
  delete params['geodata-mode'];
  delete params['geodata-loader'];
  delete params['geo-auto-update'];
  delete params['geo-update-interval'];
  delete params['geox-url'];
  delete params.sniffer;
  delete params.tun;
  delete params.profile;
}

// ===== 修复说明 =====
/*
 * 2025-09-30 SingBox 适配版本
 * 
 * 新增内容：
 * 1. 完全基于 mihomo.yaml/clash.ini 的规则逻辑
 * 2. 将 Clash 的 proxy-groups 转换为 SingBox 的 outbounds
 * 3. 将 Clash 的 rules 和 rule-providers 转换为 SingBox 的 route
 * 4. 保持完全一致的节点过滤和选择逻辑
 * 5. 适配 SingBox v1.11+ 的配置格式
 * 6. 添加 SingBox 专用的 DNS、入站、实验性功能配置
 * 7. 自动清理 Clash 特有的配置项
 * 
 * 转换对照：
 * - Clash proxy-groups → SingBox outbounds (selector/urltest)
 * - Clash rules + rule-providers → SingBox route.rules + route.rule_set
 * - Clash dns → SingBox dns (格式调整)
 * - 新增 SingBox 专用的 inbounds, experimental 配置
 * 
 * 使用说明：
 * 1. 直接在 Sub-Store 中使用此脚本
 * 2. 脚本会自动转换为 SingBox 格式
 * 3. 生成的配置可直接用于 SingBox 核心
 * 4. 保持与 mihomo.yaml 相同的分流和节点选择逻辑
 */