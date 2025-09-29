// Sub-Store Override Script
// 基于mihomo.yaml配置转换的Sub-Store脚本
// 保持原有分流逻辑，支持参数化配置
// 更新时间: 2025-09-29
// 修复版本: 节点选择和过滤规则已优化，同时匹配大小写x

function operator(proxies = [], targetPlatform, context) {
  // 获取参数配置
  const params = getParams(context.source.url);
  const {
    loadbalance = false,
    landing = false,
    ipv6 = false,
    full = false,
    keepalive = false
  } = params;

  // 节点过滤函数
  const filters = {
    // 0.X 节点 - 低倍率节点，排除2X/3X/10X等高倍率
    lowRate: (name) => {
      return /0\.[0-9]+|直连|下载/.test(name) && 
             !/([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)/i.test(name);
    },
    
    // 公益节点过滤
    public: (name) => {
      return /(Hax|hax|VC|Vc|vc|buyvm|BuyVM|BUYVM|鸡|Woiden|woiden|Euserv|Optimization|Akari|FREE|Oracle|oracle|Vult|advins|CF)/i.test(name);
    },
    
    // 自建节点过滤
    selfBuilt: (name) => {
      return /(自建|Oracle|oracle)/i.test(name);
    },
    
    // 地区节点过滤（排除高倍率）
    hongkong: (name) => {
      return /(香港|HK|Hong Kong)/i.test(name) && 
             !/([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)/i.test(name);
    },
    
    japan: (name) => {
      return /(日本|川日|东京|大阪|泉日|埼玉|沪日|深日|[^-]日|JP|Japan)/i.test(name) && 
             !/([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)/i.test(name);
    },
    
    usa: (name) => {
      return /(美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|US|United States|us)/i.test(name) && 
             !/([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)/i.test(name);
    },
    
    taiwan: (name) => {
      return /(台|新北|彰化|TW|Taiwan)/i.test(name) && 
             !/([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)/i.test(name);
    },
    
    singapore: (name) => {
      return /(新加坡|坡|狮城|SG|Singapore)/i.test(name) && 
             !/([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)/i.test(name);
    },
    
    korea: (name) => {
      return /(KR|Korea|KOR|首尔|韩|韓)/i.test(name) && 
             !/([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)/i.test(name);
    },
    
    // 自动选择过滤（排除ISP和高倍率）
    auto: (name) => {
      return !/((电信|联通|移动|四川|广西)|([2-9]|[1-9][0-9]+)[Xx]|HOME)/i.test(name);
    },
    
    // 流媒体优化节点（支持Netflix等）
    streaming: (name) => {
      return /(新加坡|坡|狮城|SG|Singapore|美|US|us|香港|HK|台|TW|Taiwan)/i.test(name) && 
             !/([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)/i.test(name);
    }
  };

  // 基础策略组配置
  const proxyGroups = [
    {
      name: "🚀 节点选择",
      type: "select",
      proxies: [
        "♻️ 自动选择",
        "0.X",
        "🆓 公益",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "🔯 故障转移",
        "🔮 负载均衡",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇸🇬 狮城节点",
        "🇯🇵 日本节点",
        "🇺🇲 美国节点",
        "🇰🇷 韩国节点",
        "DIRECT"
      ]
    },
    
    // 手动选择组
    {
      name: "✈️ 手动选择",
      type: "select",
      proxies: proxies.map(p => p.name)
    },
    
    {
      name: "🛩️ 手动选择备用",
      type: "select",
      proxies: proxies.map(p => p.name)
    },
    
    // 通讯服务
    {
      name: "📲 电报消息",
      type: "select",
      proxies: [
        "🚀 节点选择",
        "♻️ 自动选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "🇸🇬 狮城节点",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇯🇵 日本节点",
        "🇺🇲 美国节点",
        "🇰🇷 韩国节点",
        "DIRECT"
      ]
    },
    
    // AI服务
    {
      name: "🌍 OpenAI",
      type: "select",
      proxies: proxies.map(p => p.name)
    },
    
    {
      name: "🌍 CleanIP",
      type: "select",
      proxies: proxies.map(p => p.name)
    },
    
    // 流媒体服务
    {
      name: "📹 油管视频",
      type: "select",
      proxies: [
        "🆓 公益",
        "🚀 节点选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "♻️ 自动选择",
        "🇸🇬 狮城节点",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇯🇵 日本节点",
        "🇺🇲 美国节点",
        "🇰🇷 韩国节点",
        "DIRECT"
      ]
    },
    
    {
      name: "🎥 奈飞视频",
      type: "select",
      proxies: ["✈️ 手动选择"].concat(
        proxies.filter(p => filters.streaming(p.name)).map(p => p.name)
      )
    },
    
    {
      name: "🐹 DisneyPlus",
      type: "select",
      proxies: [
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点"
      ].concat(
        proxies.filter(p => filters.streaming(p.name)).map(p => p.name)
      )
    },
    
    // EMBY服务
    {
      name: "🎬 EMBY_proxy",
      type: "select",
      proxies: [
        "🆓 公益",
        "0.X",
        "🚁 自建节点",
        "🔮 负载均衡",
        "DIRECT",
        "🚀 节点选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用"
      ]
    },
    
    {
      name: "🎬 EMBY_direct",
      type: "select",
      proxies: [
        "DIRECT",
        "🆓 公益",
        "0.X",
        "🚁 自建节点",
        "🚀 节点选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用"
      ]
    },
    
    {
      name: "🎦 HBO",
      type: "select",
      proxies: [
        "🇺🇲 美国节点",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点"
      ]
    },
    
    {
      name: "🎦 PrimeVideo",
      type: "select",
      proxies: [
        "🇺🇲 美国节点",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点"
      ]
    },
    
    {
      name: "🍎 AppleTV",
      type: "select",
      proxies: [
        "DIRECT",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点"
      ]
    },
    
    // 哔哩哔哩
    {
      name: "📺 哔哩哔哩",
      type: "select",
      proxies: [
        "🎯 全球直连",
        "🇨🇳 台湾节点",
        "🇭🇰 香港节点"
      ]
    },
    
    // 科技服务
    {
      name: "📢 谷歌FCM",
      type: "select",
      proxies: [
        "DIRECT",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "🇺🇲 美国节点",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇸🇬 狮城节点",
        "🇯🇵 日本节点",
        "🇰🇷 韩国节点"
      ]
    },
    
    {
      name: "📢 谷歌",
      type: "select",
      proxies: [
        "🇺🇲 美国节点",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇸🇬 狮城节点",
        "🇯🇵 日本节点",
        "🇰🇷 韩国节点"
      ]
    },
    
    // 媒体分类
    {
      name: "🌍 国外媒体",
      type: "select",
      proxies: [
        "🚀 节点选择",
        "♻️ 自动选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇸🇬 狮城节点",
        "🇯🇵 日本节点",
        "🇺🇲 美国节点",
        "🇰🇷 韩国节点",
        "DIRECT"
      ]
    },
    
    {
      name: "🌏 国内媒体",
      type: "select",
      proxies: [
        "DIRECT",
        "🚀 节点选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇸🇬 狮城节点",
        "🇯🇵 日本节点"
      ]
    },
    
    {
      name: "🍎 苹果服务",
      type: "select",
      proxies: [
        "DIRECT",
        "🚀 节点选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "🇺🇲 美国节点",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇸🇬 狮城节点",
        "🇯🇵 日本节点",
        "🇰🇷 韩国节点"
      ]
    },
    
    {
      name: "Ⓜ️ Bing",
      type: "select",
      proxies: [
        "🇺🇲 美国节点",
        "DIRECT",
        "🚀 节点选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇸🇬 狮城节点",
        "🇯🇵 日本节点",
        "🇰🇷 韩国节点"
      ]
    },
    
    {
      name: "Ⓜ️ 微软云盘",
      type: "select",
      proxies: [
        "DIRECT",
        "🚀 节点选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "🇺🇲 美国节点",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇸🇬 狮城节点",
        "🇯🇵 日本节点",
        "🇰🇷 韩国节点"
      ]
    },
    
    {
      name: "Ⓜ️ 微软服务",
      type: "select",
      proxies: [
        "DIRECT",
        "🚀 节点选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "🇺🇲 美国节点",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇸🇬 狮城节点",
        "🇯🇵 日本节点",
        "🇰🇷 韩国节点"
      ]
    },
    
    {
      name: "🎮 游戏平台",
      type: "select",
      proxies: [
        "DIRECT",
        "🚀 节点选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "🇺🇲 美国节点",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇸🇬 狮城节点",
        "🇯🇵 日本节点",
        "🇰🇷 韩国节点"
      ]
    },
    
    // 系统策略组
    {
      name: "🎯 全球直连",
      type: "select",
      proxies: ["DIRECT", "♻️ 自动选择"]
    },
    
    {
      name: "🛑 广告拦截",
      type: "select",
      proxies: ["REJECT", "DIRECT"]
    },
    
    {
      name: "🍃 应用净化",
      type: "select",
      proxies: ["REJECT", "DIRECT"]
    },
    
    {
      name: "🐟 漏网之鱼",
      type: "select",
      proxies: [
        "🚀 节点选择",
        "✈️ 手动选择",
        "🛩️ 手动选择备用",
        "🚁 自建节点",
        "♻️ 自动选择",
        "DIRECT",
        "🇭🇰 香港节点",
        "🇨🇳 台湾节点",
        "🇸🇬 狮城节点",
        "🇯🇵 日本节点",
        "🇺🇲 美国节点",
        "🇰🇷 韩国节点"
      ]
    }
  ];

  // 添加特殊节点组
  const specialGroups = [
    // 0.X 组 - 低倍率节点
    {
      name: "0.X",
      type: "select",
      proxies: proxies.filter(p => filters.lowRate(p.name)).map(p => p.name)
    },
    
    // 地区节点组
    {
      name: "🇭🇰 香港节点",
      type: "url-test",
      proxies: proxies.filter(p => filters.hongkong(p.name)).map(p => p.name),
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50
    },
    
    {
      name: "🇯🇵 日本节点",
      type: "url-test",
      proxies: proxies.filter(p => filters.japan(p.name)).map(p => p.name),
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50
    },
    
    {
      name: "🇺🇲 美国节点",
      type: "select",
      proxies: proxies.filter(p => filters.usa(p.name)).map(p => p.name),
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 150
    },
    
    {
      name: "🇨🇳 台湾节点",
      type: "select",
      proxies: proxies.filter(p => filters.taiwan(p.name)).map(p => p.name),
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50
    },
    
    {
      name: "🇸🇬 狮城节点",
      type: "select",
      proxies: proxies.filter(p => filters.singapore(p.name)).map(p => p.name),
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50
    },
    
    {
      name: "🇰🇷 韩国节点",
      type: "url-test",
      proxies: proxies.filter(p => filters.korea(p.name)).map(p => p.name),
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50
    },
    
    // 公共服务节点
    {
      name: "🆓 公益",
      type: "select",
      proxies: proxies.filter(p => filters.public(p.name)).map(p => p.name),
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50
    },
    
    {
      name: "🚁 自建节点",
      type: "select",
      proxies: proxies.filter(p => filters.selfBuilt(p.name)).map(p => p.name)
    },
    
    // 自动策略
    {
      name: "♻️ 自动选择",
      type: "url-test",
      proxies: proxies.filter(p => filters.auto(p.name)).map(p => p.name),
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50
    },
    
    {
      name: "🔯 故障转移",
      type: "fallback",
      proxies: proxies.filter(p => filters.auto(p.name)).map(p => p.name),
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      lazy: true
    },
    
    {
      name: "🔮 负载均衡",
      type: "load-balance",
      proxies: proxies.filter(p => filters.selfBuilt(p.name)).map(p => p.name),
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      strategy: "round-robin"
    }
  ];

  // 过滤空的策略组
  const validSpecialGroups = specialGroups.filter(group => 
    group.proxies && group.proxies.length > 0
  );

  // 合并所有策略组
  const allProxyGroups = proxyGroups.concat(validSpecialGroups);

  // 生成规则
  const rules = [
    // 局域网直连
    "RULE-SET,LocalAreaNetwork,🎯 全球直连",
    "RULE-SET,UnBan,🎯 全球直连",
    
    // 广告拦截
    "RULE-SET,BanAD,🛑 广告拦截",
    "RULE-SET,BanProgramAD,🍃 应用净化",
    
    // AI服务
    "RULE-SET,openAI,🌍 OpenAI",
    "RULE-SET,OpenAI,🌍 OpenAI",
    "RULE-SET,Claude,🌍 OpenAI",
    "RULE-SET,CleanIP,🌍 CleanIP",
    
    // 流媒体服务
    "RULE-SET,YouTube,📹 油管视频",
    "RULE-SET,Netflix,🎥 奈飞视频",
    "RULE-SET,AmazonIp,🎥 奈飞视频",
    "RULE-SET,Disney,🐹 DisneyPlus",
    "RULE-SET,HBO,🎦 HBO",
    "RULE-SET,HBOUSA,🎦 HBO",
    "RULE-SET,AmazonPrimeVideo,🎦 PrimeVideo",
    "RULE-SET,AppleTV,🍎 AppleTV",
    
    // 谷歌服务
    "RULE-SET,GoogleFCM,📢 谷歌FCM",
    "RULE-SET,Google,📢 谷歌",
    
    // 国内谷歌服务直连
    "RULE-SET,GoogleCN,🎯 全球直连",
    "RULE-SET,SteamCN,🎯 全球直连",
    
    // 微软服务
    "RULE-SET,Bing,Ⓜ️ Bing",
    "RULE-SET,OneDrive,Ⓜ️ 微软云盘",
    "RULE-SET,Microsoft,Ⓜ️ 微软服务",
    
    // 苹果服务
    "RULE-SET,Apple,🍎 苹果服务",
    
    // 电报
    "RULE-SET,Telegram,📲 电报消息",
    
    // 游戏平台
    "RULE-SET,Epic,🎮 游戏平台",
    "RULE-SET,Sony,🎮 游戏平台",
    "RULE-SET,Steam,🎮 游戏平台",
    "RULE-SET,Nintendo,🎮 游戏平台",
    
    // EMBY服务
    "RULE-SET,Emby_proxy,🎬 EMBY_proxy",
    "RULE-SET,Emby_direct,🎬 EMBY_direct",
    
    // 哔哩哔哩
    "RULE-SET,BilibiliHMT,📺 哔哩哔哩",
    "RULE-SET,Bilibili,📺 哔哩哔哩",
    
    // 国内外媒体
    "RULE-SET,ChinaMedia,🌏 国内媒体",
    "RULE-SET,ProxyMedia,🌍 国外媒体",
    
    // 代理规则
    "RULE-SET,ProxyGFWlist,🚀 节点选择",
    
    // 直连规则
    "RULE-SET,ChinaDomain,🎯 全球直连",
    "RULE-SET,ChinaCompanyIp,🎯 全球直连",
    "RULE-SET,Download,🎯 全球直连",
    "RULE-SET,Custom_direct,🎯 全球直连",
    
    // 地理位置规则
    "GEOIP,CN,🎯 全球直连",
    "MATCH,🐟 漏网之鱼"
  ];

  // 规则集配置
  const ruleProviders = {
    LocalAreaNetwork: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list",
      path: "./ruleset/LocalAreaNetwork.list",
      interval: 86400
    },
    UnBan: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list",
      path: "./ruleset/UnBan.list",
      interval: 86400
    },
    BanAD: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list",
      path: "./ruleset/BanAD.list",
      interval: 86400
    },
    BanProgramAD: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanProgramAD.list",
      path: "./ruleset/BanProgramAD.list",
      interval: 86400
    },
    openAI: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/openAI.list",
      path: "./ruleset/openAI.list",
      interval: 86400
    },
    OpenAI: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OpenAI/OpenAI.list",
      path: "./ruleset/OpenAI.list",
      interval: 86400
    },
    Claude: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Claude/Claude.list",
      path: "./ruleset/Claude.list",
      interval: 86400
    },
    CleanIP: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/qsd4014/ss_profile/refs/heads/main/Rules/CleanIP.list",
      path: "./ruleset/CleanIP.list",
      interval: 86400
    },
    YouTube: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/YouTube.list",
      path: "./ruleset/YouTube.list",
      interval: 86400
    },
    Netflix: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Netflix/Netflix.list",
      path: "./ruleset/Netflix.list",
      interval: 86400
    },
    AmazonIp: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/AmazonIp.list",
      path: "./ruleset/AmazonIp.list",
      interval: 86400
    },
    Disney: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Disney/Disney.list",
      path: "./ruleset/Disney.list",
      interval: 86400
    },
    HBO: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/HBO/HBO.list",
      path: "./ruleset/HBO.list",
      interval: 86400
    },
    HBOUSA: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/HBOUSA/HBOUSA.list",
      path: "./ruleset/HBOUSA.list",
      interval: 86400
    },
    AmazonPrimeVideo: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/AmazonPrimeVideo/AmazonPrimeVideo.list",
      path: "./ruleset/AmazonPrimeVideo.list",
      interval: 86400
    },
    AppleTV: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/AppleTV/AppleTV.list",
      path: "./ruleset/AppleTV.list",
      interval: 86400
    },
    GoogleFCM: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/GoogleFCM.list",
      path: "./ruleset/GoogleFCM.list",
      interval: 86400
    },
    Google: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Google.list",
      path: "./ruleset/Google.list",
      interval: 86400
    },
    GoogleCN: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/GoogleCN.list",
      path: "./ruleset/GoogleCN.list",
      interval: 86400
    },
    SteamCN: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/SteamCN.list",
      path: "./ruleset/SteamCN.list",
      interval: 86400
    },
    Bing: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Bing/Bing.list",
      path: "./ruleset/Bing.list",
      interval: 86400
    },
    OneDrive: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/OneDrive.list",
      path: "./ruleset/OneDrive.list",
      interval: 86400
    },
    Microsoft: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Microsoft.list",
      path: "./ruleset/Microsoft.list",
      interval: 86400
    },
    Apple: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Apple.list",
      path: "./ruleset/Apple.list",
      interval: 86400
    },
    Telegram: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list",
      path: "./ruleset/Telegram.list",
      interval: 86400
    },
    Epic: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Epic.list",
      path: "./ruleset/Epic.list",
      interval: 86400
    },
    Sony: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Sony.list",
      path: "./ruleset/Sony.list",
      interval: 86400
    },
    Steam: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Steam.list",
      path: "./ruleset/Steam.list",
      interval: 86400
    },
    Nintendo: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Nintendo.list",
      path: "./ruleset/Nintendo.list",
      interval: 86400
    },
    Emby_proxy: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/Emby_proxy.list",
      path: "./ruleset/Emby_proxy.list",
      interval: 86400
    },
    Emby_direct: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/Emby_direct.list",
      path: "./ruleset/Emby_direct.list",
      interval: 86400
    },
    BilibiliHMT: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/BilibiliHMT.list",
      path: "./ruleset/BilibiliHMT.list",
      interval: 86400
    },
    Bilibili: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Bilibili.list",
      path: "./ruleset/Bilibili.list",
      interval: 86400
    },
    ChinaMedia: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaMedia.list",
      path: "./ruleset/ChinaMedia.list",
      interval: 86400
    },
    ProxyMedia: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list",
      path: "./ruleset/ProxyMedia.list",
      interval: 86400
    },
    ProxyGFWlist: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyGFWlist.list",
      path: "./ruleset/ProxyGFWlist.list",
      interval: 86400
    },
    ChinaDomain: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list",
      path: "./ruleset/ChinaDomain.list",
      interval: 86400
    },
    ChinaCompanyIp: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaCompanyIp.list",
      path: "./ruleset/ChinaCompanyIp.list",
      interval: 86400
    },
    Download: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Download.list",
      path: "./ruleset/Download.list",
      interval: 86400
    },
    Custom_direct: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/Custom_direct.list",
      path: "./ruleset/Custom_direct.list",
      interval: 86400
    }
  };

  // 构建配置对象
  const config = {
    "proxy-groups": allProxyGroups,
    rules: rules,
    "rule-providers": ruleProviders
  };

  // 如果需要完整配置，添加基础设置
  if (full) {
    config.port = 7890;
    config["socks-port"] = 7891;
    config["mixed-port"] = 7890;
    config["allow-lan"] = true;
    config.mode = "rule";
    config["log-level"] = "info";
    config["find-process-mode"] = "strict";
    config["unified-delay"] = true;
    config["tcp-concurrent"] = true;
    config["global-client-fingerprint"] = "chrome";
    config["keep-alive-idle"] = keepalive ? 600 : null;
    config["keep-alive-interval"] = keepalive ? 15 : null;
    
    // 外部控制
    config["external-controller"] = "127.0.0.1:9090";
    config.secret = "your-secure-password-here";
    config["external-ui-url"] = "https://github.com/Zephyruso/zashboard/releases/latest/download/dist.zip";
    
    // GEO数据库
    config["geodata-mode"] = true;
    config["geodata-loader"] = "memconservative";
    config["geo-auto-update"] = true;
    config["geo-update-interval"] = 48;
    config["geox-url"] = {
      geoip: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat",
      geosite: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
      mmdb: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.metadb"
    };
    
    // DNS配置
    config.dns = {
      enable: true,
      listen: "0.0.0.0:1053",
      ipv6: ipv6,
      "prefer-h3": true,
      "respect-rules": true,
      "enhanced-mode": "fake-ip",
      "cache-algorithm": "arc",
      "cache-size": 2048,
      "fake-ip-range": "198.18.0.1/16",
      "default-nameserver": [
        "223.5.5.5",
        "1.1.1.1"
      ],
      nameserver: [
        "https://1.1.1.1/dns-query",
        "https://dns.google/dns-query",
        "https://dns.alidns.com/dns-query"
      ],
      "nameserver-policy": {
        "geosite:cn,private": [
          "https://223.5.5.5/dns-query",
          "https://doh.pub/dns-query"
        ]
      },
      fallback: [
        "https://8.8.8.8/dns-query",
        "tls://1.0.0.1:853"
      ],
      "fallback-filter": {
        geoip: true,
        "geoip-code": "CN",
        geosite: ["geolocation-!cn"]
      }
    };
    
    // 流量嗅探
    config.sniffer = {
      enable: true,
      sniff: {
        HTTP: {
          ports: [80, "8080-8880"],
          "override-destination": true
        },
        TLS: {
          ports: [443, 8443]
        }
      },
      "force-domain": ["+.v2ex.com"],
      "skip-domain": ["+.baidu.com", "+.bilibili.com"]
    };
    
    // TUN模式
    config.tun = {
      enable: true,
      stack: "mixed",
      "auto-route": true,
      "auto-redirect": true,
      "auto-detect-interface": true,
      "strict-route": true,
      mtu: 1500,
      gso: true,
      "gso-max-size": 65536,
      "dns-hijack": ["any:53"],
      "udp-timeout": 300
    };
    
    // 配置文件保存
    config.profile = {
      "store-selected": true,
      "store-fake-ip": true
    };
  }

  return {
    ...config
  };
}

// 解析URL参数
function getParams(url) {
  const params = {};
  if (url && url.includes('#')) {
    const paramString = url.split('#')[1];
    if (paramString) {
      const pairs = paramString.split('&');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value !== undefined) {
          params[key] = value === 'true' ? true : value === 'false' ? false : value;
        } else if (key) {
          params[key] = true;
        }
      });
    }
  }
  return params;
}

// 使用说明:
// 1. 基础使用：直接使用脚本URL
// 2. 参数使用：在URL后添加 #参数名=值&参数名2=值2
//    例如：script-url#loadbalance=true&landing=true&ipv6=false
// 3. 支持的参数：
//    - loadbalance: 启用负载均衡 (默认false)
//    - landing: 启用落地节点功能 (默认false)
//    - ipv6: 启用IPv6支持 (默认false)
//    - full: 生成完整配置 (默认false)
//    - keepalive: 启用TCP Keep Alive (默认false)
//
// 节点过滤说明:
// - 0.X 组：选择低倍率节点（0.5X等），排除高倍率（2X/3X/10X等）
// - 地区节点：按地区过滤，同时排除高倍率节点
// - 自动选择：排除ISP和高倍率节点，保证连接质量
// - 公益节点：选择免费或公益性质的节点
// - 自建节点：选择自建或Oracle等节点
//
// 分流规则完全匹配mihomo.yaml的逻辑
// 修复版本 - 2025-09-29: 同时匹配大小写x，正确过滤高倍流量节点