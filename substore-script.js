/**
 * Sub-Store 脚本 - 完全复刻 clash.ini 逻辑 (已修复 validProxy_names 拼写错误)
 *
 * 更新日期: 2025-09-29
 * 修复内容: 修正了 "validProxy_names is not defined" 的错误。
 *
 * 功能：
 * 1.  动态生成与 clash.ini 完全一致的策略组。
 * 2.  自动过滤所有高倍率节点（2x, 2X, 10x, 10X...）及特定关键词。
 * 3.  实现 0.X 低倍率、地区、流媒体、AI 等所有精细化分组。
 * 4.  自动生成所有 rule-providers，引用 ACL4SSR 及自定义规则。
 * 5.  注入与 mihomo.yaml 一致的 DNS 和性能优化配置。
 */

function main(params) {
  // 注入DNS和基础优化配置
  injectAdvancedConfig(params);

  // 覆写规则集
  overwriteRuleProviders(params);
  
  // 覆写策略组
  overwriteProxyGroups(params);

  // 覆写规则
  overwriteRules(params);

  return params;
}

// 过滤高倍率和关键词的正则表达式
const HIGH_RATE_REGEX = /([2-9]|[1-9][0-9]+)[Xx]/;
const EXCLUDE_KEYWORDS_REGEX = /(HOME|电信|联通|移动|四川|广西)/i;

// 低倍率节点识别
const LOW_RATE_REGEX = /(0\.[0-9]|直连|下载|download)/i;

// 地区节点识别
const REGIONS = {
  '🇭🇰 香港节点': /(香港|港|hk|hong.?kong)/i,
  '🇯🇵 日本节点': /(日本|川日|东京|大阪|泉日|埼玉|沪日|深日|[^-]日|jp|japan)/i,
  '🇺🇲 美国节点': /(美|美国|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|us|united.?states|usa)/i,
  '🇨🇳 台湾节点': /(台|台湾|新北|彰化|tw|taiwan)/i,
  '🇸🇬 狮城节点': /(新加坡|坡|狮城|sg|singapore)/i,
  '🇰🇷 韩国节点': /(韩|韩国|首尔|kr|korea|kor)/i,
};

// 其他特殊分组
const SPECIAL_GROUPS = {
  '🆓 公益': /(hax|vc|buyvm|鸡|woiden|euserv|optimization|akari|free|oracle|vult|advins|cf)/i,
  '🚁 自建节点': /(自建|oracle)/i,
};

/**
 * 筛选符合条件的节点
 * @param {Array} proxies - 全部节点列表
 * @param {Function} filterFn - 过滤器函数
 * @returns {Array} - 符合条件的节点名称列表
 */
function filterProxies(proxies, filterFn) {
  return proxies.filter(p => filterFn(p.name)).map(p => p.name);
}

/**
 * 通用节点有效性检查（排除高倍率和关键词）
 * @param {string} name - 节点名称
 * @returns {boolean}
 */
function isNodeValid(name) {
  return !HIGH_RATE_REGEX.test(name) && !EXCLUDE_KEYWORDS_REGEX.test(name);
}

function overwriteProxyGroups(params) {
  const { proxies } = params;

  // 准备节点池
  const allProxyNames = proxies.map(p => p.name);
  const validProxyNames = filterProxies(proxies, (name) => isNodeValid(name));
  
  // 0.X 低倍率节点池
  const lowRateProxies = filterProxies(proxies, (name) => LOW_RATE_REGEX.test(name) && isNodeValid(name));
  
  // 按地区筛选节点池
  const regionProxies = {};
  for (const [name, regex] of Object.entries(REGIONS)) {
    regionProxies[name] = filterProxies(proxies, (nodeName) => regex.test(nodeName) && isNodeValid(nodeName));
  }

  // 其他特殊分组节点池
  const specialProxies = {};
  for (const [name, regex] of Object.entries(SPECIAL_GROUPS)) {
    specialProxies[name] = filterProxies(proxies, (nodeName) => regex.test(nodeName));
  }

  // 定义所有策略组
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
    // 手动选择
    { name: '✈️ 手动选择', type: 'select', proxies: allProxyNames },
    { name: '🛩️ 手动选择备用', type: 'select', proxies: allProxyNames },
    
    // AI 服务
    { name: '🌍 OpenAI', type: 'select', proxies: ['🚀 节点选择', ...validProxyNames] },
    { name: '🌍 CleanIP', type: 'select', proxies: ['🚀 节点选择', ...validProxyNames] },

    // 流媒体服务
    { name: '📹 油管视频', type: 'select', proxies: ['🚀 节点选择', ...Object.keys(REGIONS), ...validProxyNames] },
    { name: '🎥 奈飞视频', type: 'select', proxies: filterProxies(proxies, name => /(新加坡|坡|狮城|sg|singapore|美|美国|us|香港|港|hk|hong.?kong|台|台湾|tw|taiwan)/i.test(name) && isNodeValid(name))},
    { name: '🐹 DisneyPlus', type: 'select', proxies: filterProxies(proxies, name => /(新加坡|坡|狮城|sg|singapore|美|美国|us|香港|港|hk|hong.?kong|台|台湾|tw|taiwan)/i.test(name) && isNodeValid(name))},
    { name: '🎦 HBO', type: 'select', proxies: regionProxies['🇺🇲 美国节点'] },
    { name: '🎦 PrimeVideo', type: 'select', proxies: regionProxies['🇺🇲 美国节点'] },
    { name: '🍎 AppleTV', type: 'select', proxies: ['DIRECT', '✈️ 手动选择', '🛩️ 手动选择备用'] },
    
    // EMBY
    { name: '🎬 EMBY_proxy', type: 'select', proxies: ['DIRECT', '0.X', ...specialProxies['🚁 自建节点']] },
    { name: '🎬 EMBY_direct', type: 'select', proxies: ['DIRECT', '0.X'] },

    // 其他服务
    { name: '📲 电报消息', type: 'select', proxies: ['🚀 节点选择', ...validProxyNames] },
    { name: '📢 谷歌FCM', type: 'select', proxies: ['DIRECT', '🚀 节点选择', ...validProxyNames] },
    { name: '📢 谷歌', type: 'select', proxies: ['🚀 节点选择', ...validProxyNames] },
    { name: 'Ⓜ️ Bing', type: 'select', proxies: ['DIRECT', '🚀 节点选择', ...validProxyNames] },
    { name: 'Ⓜ️ 微软云盘', type: 'select', proxies: ['DIRECT', '🚀 节点选择', ...validProxyNames] },
    // ★★★ FIX: 修正此处的拼写错误 ★★★
    { name: 'Ⓜ️ 微软服务', type: 'select', proxies: ['DIRECT', '🚀 节点选择', ...validProxyNames] },
    { name: '🍎 苹果服务', type: 'select', proxies: ['DIRECT', '🚀 节点选择', ...validProxyNames] },
    { name: '🎮 游戏平台', type: 'select', proxies: ['DIRECT', '🚀 节点选择', ...validProxyNames] },
    { name: '📺 哔哩哔哩', type: 'select', proxies: ['🎯 全球直连', '🇭🇰 香港节点', '🇨🇳 台湾节点'] },
    { name: '🌍 国外媒体', type: 'select', proxies: ['🚀 节点选择', ...validProxyNames] },
    { name: '🌏 国内媒体', type: 'select', proxies: ['🎯 全球直连'] },

    // 系统策略组
    { name: '🎯 全球直连', type: 'select', proxies: ['DIRECT', '♻️ 自动选择'] },
    { name: '🛑 广告拦截', type: 'select', proxies: ['REJECT', 'DIRECT'] },
    { name: '🍃 应用净化', type: 'select', proxies: ['REJECT', 'DIRECT'] },
    { name: '🐟 漏网之鱼', type: 'select', proxies: ['🚀 节点选择', ...validProxyNames, 'DIRECT'] },

    // 功能性策略组
    { name: '0.X', type: 'select', proxies: lowRateProxies },
    ...Object.entries(REGIONS).map(([name, regex]) => ({
      name,
      type: 'url-test',
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      proxies: regionProxies[name],
    })),
    ...Object.entries(SPECIAL_GROUPS).map(([name, regex]) => ({
      name,
      type: 'select',
      proxies: specialProxies[name],
    })),
    {
      name: '♻️ 自动选择',
      type: 'url-test',
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      proxies: validProxyNames
    },
    {
      name: '🔯 故障转移',
      type: 'fallback',
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      proxies: validProxyNames
    },
    {
      name: '🔮 负载均衡',
      type: 'load-balance',
      strategy: 'round-robin',
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      proxies: specialProxies['🚁 自建节点']
    },
  ];
}

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
    'Custom_direct': 'https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/Custom_direct.list',
  };

  params['rule-providers'] = {};
  for (const [name, url] of Object.entries(ruleProviders)) {
    params['rule-providers'][name] = {
      type: 'http',
      behavior: 'classical',
      url,
      path: `./ruleset/${name}.list`,
      interval: 86400,
    };
  }
}

function injectAdvancedConfig(params) {
  const dnsConfig = {
    'enable': true,
    'listen': '0.0.0.0:1053',
    'ipv6': false,
    'prefer-h3': true,
    'respect-rules': true,
    'enhanced-mode': 'fake-ip',
    'cache-algorithm': 'arc',
    'cache-size': 2048,
    'fake-ip-range': '198.18.0.1/16',
    'default-nameserver': ['223.5.5.5', '1.1.1.1'],
    'nameserver': ['https://1.1.1.1/dns-query', 'https://dns.google/dns-query', 'https://dns.alidns.com/dns-query'],
    'nameserver-policy': { 'geosite:cn,private': ['https://223.5.5.5/dns-query', 'https://doh.pub/dns-query'] },
    'fallback': ['https://8.8.8.8/dns-query', 'tls://1.0.0.1:853'],
    'fallback-filter': { 'geoip': true, 'geoip-code': 'CN', 'geosite': ['geolocation-!cn'] }
  };

  const geoxConfig = {
    'geodata-mode': true,
    'geodata-loader': 'memconservative',
    'geo-auto-update': true,
    'geo-update-interval': 48,
    'geox-url': {
      'geoip': 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat',
      'geosite': 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat',
      'mmdb': 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.metadb'
    }
  };

  const snifferConfig = {
    'enable': true,
    'sniff': {
      'HTTP': { 'ports': [80, '8080-8880'], 'override-destination': true },
      'TLS': { 'ports': [443, 8443] }
    },
    'force-domain': ['+.v2ex.com'],
    'skip-domain': ['+.baidu.com', '+.bilibili.com']
  };

  params.dns = dnsConfig;
  Object.assign(params, geoxConfig);
  params.sniffer = snifferConfig;
  params['tcp-concurrent'] = true;
  params['unified-delay'] = true;
  params['global-client-fingerprint'] = 'chrome';
}
