// SubStore 脚本 - 对应 mihomo.yaml 的完整分流逻辑
// 基于 mihomo.yaml 转换，保持相同的规则分流逻辑
// 更新时间: 2025-09-30
// 版本: v1.0 - 完整复刻mihomo.yaml功能

const proxyName = "🚀 节点选择";

function main(params) {
    if (!params.proxies) return params;
    
    overwriteRules(params);
    overwriteProxyGroups(params);
    overwriteDns(params);
    
    return params;
}

// 地区节点配置（对应mihomo.yaml中的地区节点组）
const countryRegions = [
    { 
        code: "HK", 
        name: "香港节点", 
        emoji: "🇭🇰",
        icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/hk.svg", 
        // 修复过滤规则，排除高倍流量（同时匹配大小写x）
        regex: /^(?!.*([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)).*(香港|HK|Hong Kong).*$/i 
    },
    { 
        code: "TW", 
        name: "台湾节点", 
        emoji: "🇨🇳",
        icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/tw.svg", 
        regex: /^(?!.*([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)).*(台|新北|彰化|TW|Taiwan).*$/i 
    },
    { 
        code: "SG", 
        name: "狮城节点", 
        emoji: "🇸🇬",
        icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/sg.svg", 
        regex: /^(?!.*([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)).*(新加坡|坡|狮城|SG|Singapore).*$/i 
    },
    { 
        code: "JP", 
        name: "日本节点", 
        emoji: "🇯🇵",
        icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/jp.svg", 
        regex: /^(?!.*([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)).*(日本|川日|东京|大阪|泉日|埼玉|沪日|深日|[^-]日|JP|Japan).*$/i 
    },
    { 
        code: "US", 
        name: "美国节点", 
        emoji: "🇺🇲",
        icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/us.svg", 
        regex: /^(?!.*([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)).*(美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|US|United States|us).*$/i 
    },
    { 
        code: "KR", 
        name: "韩国节点", 
        emoji: "🇰🇷",
        icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/kr.svg", 
        regex: /^(?!.*([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)).*(KR|Korea|KOR|首尔|韩|韓).*$/i 
    }
];

// 特殊节点组配置
const specialGroups = {
    // 0.X 组 - 低倍率节点（修复过滤规则）
    lowMultiplier: {
        name: "0.X",
        regex: /(?=.*(0\.[0-9]+|直连|下载))(?!.*([2-9][Xx]|[1-9][0-9]+[Xx]|HOME))/i
    },
    // 公益节点
    freeNodes: {
        name: "🆓 公益",
        regex: /(Hax|hax|VC|Vc|vc|buyvm|BuyVM|BUYVM|鸡|Woiden|woiden|Euserv|Optimization|Akari|FREE|Oracle|oracle|Vult|advins|CF)/i
    },
    // 自建节点
    selfBuilt: {
        name: "🚁 自建节点",
        regex: /(自建|Oracle|oracle)/i
    },
    // 自动选择（屏蔽高倍流量和运营商节点）
    autoSelect: {
        name: "♻️ 自动选择",
        regex: /^(?!.*(电信|联通|移动|四川|广西|([2-9]|[1-9][0-9]+)[Xx]|HOME)).*$/i
    }
};

// 获取测试URL
function getTestUrlForGroup(groupName) {
    const testUrls = {
        "📲 电报消息": "https://web.telegram.org/",
        "🌍 OpenAI": "https://chat.openai.com/",
        "🌍 CleanIP": "http://www.gstatic.com/generate_204",
        "📹 油管视频": "https://www.youtube.com/",
        "🎥 奈飞视频": "https://www.netflix.com/",
        "🐹 DisneyPlus": "https://www.disneyplus.com/",
        "🎬 EMBY_proxy": "http://www.gstatic.com/generate_204",
        "🎬 EMBY_direct": "http://www.gstatic.com/generate_204",
        "🎦 HBO": "https://www.hbo.com/",
        "🎦 PrimeVideo": "https://www.primevideo.com/",
        "🍎 AppleTV": "https://tv.apple.com/",
        "📺 哔哩哔哩": "https://www.bilibili.com/",
        "📢 谷歌FCM": "https://fcm.googleapis.com/",
        "📢 谷歌": "https://www.google.com/",
        "🌍 国外媒体": "http://www.gstatic.com/generate_204",
        "🌏 国内媒体": "https://www.iqiyi.com/",
        "🍎 苹果服务": "https://www.apple.com/",
        "Ⓜ️ Bing": "https://www.bing.com/",
        "Ⓜ️ 微软云盘": "https://onedrive.live.com/",
        "Ⓜ️ 微软服务": "https://www.microsoft.com/",
        "🎮 游戏平台": "https://store.steampowered.com/"
    };
    return testUrls[groupName] || "http://www.gstatic.com/generate_204";
}

// 获取图标
function getIconForGroup(groupName) {
    const icons = {
        "🚀 节点选择": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/adjust.svg",
        "♻️ 自动选择": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/speed.svg",
        "✈️ 手动选择": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/link.svg",
        "📲 电报消息": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/telegram.svg",
        "🌍 OpenAI": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/chatgpt.svg",
        "📹 油管视频": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/youtube.svg",
        "🎥 奈飞视频": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/netflix.svg",
        "🐟 漏网之鱼": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/fish.svg",
        "🛑 广告拦截": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/block.svg",
        "🎯 全球直连": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/globe.svg"
    };
    return icons[groupName] || "";
}

// 重写规则（完全对应mihomo.yaml的rules部分）
function overwriteRules(params) {
    const customRules = [
        // 自定义规则可以在这里添加
    ];

    const rules = [
        ...customRules,
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
        "RULE-SET,ProxyGFWlist," + proxyName,
        
        // 直连规则
        "RULE-SET,ChinaDomain,🎯 全球直连",
        "RULE-SET,ChinaCompanyIp,🎯 全球直连",
        "RULE-SET,Download,🎯 全球直连",
        "RULE-SET,Custom_direct,🎯 全球直连",
        
        // 地理位置规则
        "GEOIP,CN,🎯 全球直连,no-resolve",
        "MATCH,🐟 漏网之鱼"
    ];

    // 规则集提供者（完全对应mihomo.yaml的rule-providers）
    const ruleProviders = {
        LocalAreaNetwork: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list",
            path: "./ruleset/LocalAreaNetwork.yaml",
            interval: 86400
        },
        UnBan: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list",
            path: "./ruleset/UnBan.yaml",
            interval: 86400
        },
        BanAD: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list",
            path: "./ruleset/BanAD.yaml",
            interval: 86400
        },
        BanProgramAD: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanProgramAD.list",
            path: "./ruleset/BanProgramAD.yaml",
            interval: 86400
        },
        openAI: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/openAI.list",
            path: "./ruleset/openAI.yaml",
            interval: 86400
        },
        OpenAI: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OpenAI/OpenAI.list",
            path: "./ruleset/OpenAI.yaml",
            interval: 86400
        },
        Claude: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Claude/Claude.list",
            path: "./ruleset/Claude.yaml",
            interval: 86400
        },
        CleanIP: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/qsd4014/ss_profile/refs/heads/main/Rules/CleanIP.list",
            path: "./ruleset/CleanIP.yaml",
            interval: 86400
        },
        YouTube: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/YouTube.list",
            path: "./ruleset/YouTube.yaml",
            interval: 86400
        },
        Netflix: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Netflix/Netflix.list",
            path: "./ruleset/Netflix.yaml",
            interval: 86400
        },
        AmazonIp: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/AmazonIp.list",
            path: "./ruleset/AmazonIp.yaml",
            interval: 86400
        },
        Disney: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Disney/Disney.list",
            path: "./ruleset/Disney.yaml",
            interval: 86400
        },
        HBO: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/HBO/HBO.list",
            path: "./ruleset/HBO.yaml",
            interval: 86400
        },
        HBOUSA: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/HBOUSA/HBOUSA.list",
            path: "./ruleset/HBOUSA.yaml",
            interval: 86400
        },
        AmazonPrimeVideo: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/AmazonPrimeVideo/AmazonPrimeVideo.list",
            path: "./ruleset/AmazonPrimeVideo.yaml",
            interval: 86400
        },
        AppleTV: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/AppleTV/AppleTV.list",
            path: "./ruleset/AppleTV.yaml",
            interval: 86400
        },
        GoogleFCM: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/GoogleFCM.list",
            path: "./ruleset/GoogleFCM.yaml",
            interval: 86400
        },
        Google: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Google.list",
            path: "./ruleset/Google.yaml",
            interval: 86400
        },
        GoogleCN: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/GoogleCN.list",
            path: "./ruleset/GoogleCN.yaml",
            interval: 86400
        },
        SteamCN: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/SteamCN.list",
            path: "./ruleset/SteamCN.yaml",
            interval: 86400
        },
        Bing: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Bing/Bing.list",
            path: "./ruleset/Bing.yaml",
            interval: 86400
        },
        OneDrive: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/OneDrive.list",
            path: "./ruleset/OneDrive.yaml",
            interval: 86400
        },
        Microsoft: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Microsoft.list",
            path: "./ruleset/Microsoft.yaml",
            interval: 86400
        },
        Apple: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Apple.list",
            path: "./ruleset/Apple.yaml",
            interval: 86400
        },
        Telegram: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list",
            path: "./ruleset/Telegram.yaml",
            interval: 86400
        },
        Epic: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Epic.list",
            path: "./ruleset/Epic.yaml",
            interval: 86400
        },
        Sony: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Sony.list",
            path: "./ruleset/Sony.yaml",
            interval: 86400
        },
        Steam: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Steam.list",
            path: "./ruleset/Steam.yaml",
            interval: 86400
        },
        Nintendo: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Nintendo.list",
            path: "./ruleset/Nintendo.yaml",
            interval: 86400
        },
        Emby_proxy: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/Emby_proxy.list",
            path: "./ruleset/Emby_proxy.yaml",
            interval: 86400
        },
        Emby_direct: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/Emby_direct.list",
            path: "./ruleset/Emby_direct.yaml",
            interval: 86400
        },
        BilibiliHMT: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/BilibiliHMT.list",
            path: "./ruleset/BilibiliHMT.yaml",
            interval: 86400
        },
        Bilibili: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Bilibili.list",
            path: "./ruleset/Bilibili.yaml",
            interval: 86400
        },
        ChinaMedia: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaMedia.list",
            path: "./ruleset/ChinaMedia.yaml",
            interval: 86400
        },
        ProxyMedia: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list",
            path: "./ruleset/ProxyMedia.yaml",
            interval: 86400
        },
        ProxyGFWlist: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyGFWlist.list",
            path: "./ruleset/ProxyGFWlist.yaml",
            interval: 86400
        },
        ChinaDomain: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list",
            path: "./ruleset/ChinaDomain.yaml",
            interval: 86400
        },
        ChinaCompanyIp: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaCompanyIp.list",
            path: "./ruleset/ChinaCompanyIp.yaml",
            interval: 86400
        },
        Download: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Download.list",
            path: "./ruleset/Download.yaml",
            interval: 86400
        },
        Custom_direct: {
            type: "http",
            behavior: "classical",
            url: "https://raw.githubusercontent.com/qsd4014/ss_profile/main/Rules/Custom_direct.list",
            path: "./ruleset/Custom_direct.yaml",
            interval: 86400
        }
    };

    params["rule-providers"] = ruleProviders;
    params["rules"] = rules;
}

// 重写代理组（完全对应mihomo.yaml的proxy-groups）
function overwriteProxyGroups(params) {
    const allProxies = params["proxies"].map((e) => e.name);
    
    // 地区节点自动选择组
    const autoProxyGroups = countryRegions
        .map((region) => ({
            name: `${region.emoji} ${region.name}`,
            type: "url-test",
            url: "http://www.gstatic.com/generate_204",
            interval: 300,
            tolerance: region.code === "US" ? 150 : 50,
            proxies: getProxiesByRegex(params, region.regex),
            icon: region.icon,
            hidden: false
        }))
        .filter((item) => item.proxies.length > 0);

    // 特殊节点组（对应mihomo.yaml中的特殊过滤组）
    const specialProxyGroups = [
        {
            name: specialGroups.lowMultiplier.name,
            type: "select",
            proxies: getProxiesByRegex(params, specialGroups.lowMultiplier.regex),
            hidden: false
        },
        {
            name: specialGroups.freeNodes.name,
            type: "select",
            url: "http://www.gstatic.com/generate_204",
            interval: 300,
            tolerance: 50,
            proxies: getProxiesByRegex(params, specialGroups.freeNodes.regex),
            hidden: false
        },
        {
            name: specialGroups.selfBuilt.name,
            type: "select",
            proxies: getProxiesByRegex(params, specialGroups.selfBuilt.regex),
            hidden: false
        },
        {
            name: specialGroups.autoSelect.name,
            type: "url-test",
            url: "http://www.gstatic.com/generate_204",
            interval: 300,
            tolerance: 50,
            proxies: getProxiesByRegex(params, specialGroups.autoSelect.regex),
            icon: getIconForGroup(specialGroups.autoSelect.name),
            hidden: false
        },
        {
            name: "🔯 故障转移",
            type: "fallback",
            url: "http://www.gstatic.com/generate_204",
            interval: 300,
            tolerance: 50,
            lazy: true,
            proxies: getProxiesByRegex(params, specialGroups.autoSelect.regex),
            hidden: false
        },
        {
            name: "🔮 负载均衡",
            type: "load-balance",
            url: "http://www.gstatic.com/generate_204",
            interval: 300,
            tolerance: 50,
            strategy: "round-robin",
            proxies: getProxiesByRegex(params, specialGroups.selfBuilt.regex),
            hidden: false
        }
    ].filter((item) => item.proxies.length > 0);

    // 主要策略组
    const mainGroups = [
        {
            name: proxyName,
            type: "select",
            url: "http://www.gstatic.com/generate_204",
            icon: getIconForGroup(proxyName),
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
        {
            name: "✈️ 手动选择",
            type: "select",
            icon: getIconForGroup("✈️ 手动选择"),
            proxies: allProxies
        },
        {
            name: "🛩️ 手动选择备用",
            type: "select",
            proxies: allProxies
        }
    ];

    // 应用服务策略组（完全对应mihomo.yaml）
    const serviceGroups = [
        {
            name: "📲 电报消息",
            type: "select",
            proxies: [
                proxyName,
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
            ],
            icon: getIconForGroup("📲 电报消息")
        },
        {
            name: "🌍 OpenAI",
            type: "select",
            proxies: allProxies,
            icon: getIconForGroup("🌍 OpenAI")
        },
        {
            name: "🌍 CleanIP",
            type: "select",
            proxies: allProxies
        },
        {
            name: "📹 油管视频",
            type: "select",
            proxies: [
                "🆓 公益",
                proxyName,
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
            ],
            icon: getIconForGroup("📹 油管视频")
        },
        {
            name: "🎥 奈飞视频",
            type: "select",
            // 使用地区过滤的节点（排除高倍流量）
            proxies: [
                "✈️ 手动选择",
                ...getProxiesByRegex(params, /^(?!.*([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)).*(新加坡|坡|狮城|SG|Singapore|美|US|us|香港|HK|台|TW|Taiwan).*$/i)
            ],
            icon: getIconForGroup("🎥 奈飞视频")
        },
        {
            name: "🐹 DisneyPlus",
            type: "select",
            proxies: [
                "✈️ 手动选择",
                "🛩️ 手动选择备用",
                "🚁 自建节点",
                ...getProxiesByRegex(params, /^(?!.*([2-9][Xx]|[1-9][0-9]+[Xx]|HOME)).*(新加坡|坡|狮城|SG|Singapore|美|US|us|香港|HK|台|TW|Taiwan).*$/i)
            ]
        },
        {
            name: "🎬 EMBY_proxy",
            type: "select",
            proxies: [
                "🆓 公益",
                "0.X",
                "🚁 自建节点",
                "🔮 负载均衡",
                "DIRECT",
                proxyName,
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
                proxyName,
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
        {
            name: "📺 哔哩哔哩",
            type: "select",
            proxies: [
                "🎯 全球直连",
                "🇨🇳 台湾节点",
                "🇭🇰 香港节点"
            ]
        },
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
        {
            name: "🌍 国外媒体",
            type: "select",
            proxies: [
                proxyName,
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
                proxyName,
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
                proxyName,
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
                proxyName,
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
                proxyName,
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
                proxyName,
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
                proxyName,
                "✈️ 手动选择",
                "🛩️ 手动选择备用",
                "🚁 自建节点",
                "🇺🇲 美国节点",
                "🇭🇰 香港节点",
                "🇨🇳 台湾节点",
                "🇸🇬 狮城节点",
                "🇯🇵 日本节点",
                "🇰🇷 韩国节点"
            ],
            icon: getIconForGroup("🎮 游戏平台")
        }
    ];

    // 系统策略组
    const systemGroups = [
        {
            name: "🎯 全球直连",
            type: "select",
            proxies: ["DIRECT", "♻️ 自动选择"],
            icon: getIconForGroup("🎯 全球直连")
        },
        {
            name: "🛑 广告拦截",
            type: "select",
            proxies: ["REJECT", "DIRECT"],
            icon: getIconForGroup("🛑 广告拦截")
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
                proxyName,
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
            ],
            icon: getIconForGroup("🐟 漏网之鱼")
        }
    ];

    // 合并所有策略组
    const groups = [
        ...mainGroups,
        ...serviceGroups,
        ...systemGroups,
        ...specialProxyGroups,
        ...autoProxyGroups
    ];

    params["proxy-groups"] = groups;
}

// 重写DNS配置（对应mihomo.yaml的dns部分）
function overwriteDns(params) {
    const cnDnsList = ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"];
    const trustDnsList = ["https://1.1.1.1/dns-query", "https://dns.google/dns-query", "https://dns.alidns.com/dns-query"];

    const dnsOptions = {
        enable: true,
        listen: "0.0.0.0:1053",
        ipv6: false,
        "prefer-h3": true,
        "respect-rules": true,
        "enhanced-mode": "fake-ip",
        "cache-algorithm": "arc",
        "cache-size": 2048,
        "fake-ip-range": "198.18.0.1/16",
        "default-nameserver": ["223.5.5.5", "1.1.1.1"],
        nameserver: trustDnsList,
        "nameserver-policy": {
            "geosite:cn,private": cnDnsList,
            "geosite:geolocation-!cn": trustDnsList
        },
        fallback: ["https://8.8.8.8/dns-query", "tls://1.0.0.1:853"],
        "fallback-filter": {
            geoip: true,
            "geoip-code": "CN",
            geosite: ["geolocation-!cn"]
        }
    };

    // GitHub 加速配置
    const githubPrefix = "https://fastgh.lainbo.com/";
    const rawGeoxURLs = {
        geoip: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat",
        geosite: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
        mmdb: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.metadb"
    };
    const accelURLs = Object.fromEntries(
        Object.entries(rawGeoxURLs).map(([key, githubUrl]) => [key, `${githubPrefix}${githubUrl}`])
    );

    // 其他配置选项
    const otherOptions = {
        "unified-delay": true,
        "tcp-concurrent": true,
        "global-client-fingerprint": "chrome",
        "keep-alive-idle": 600,
        "keep-alive-interval": 15,
        profile: { "store-selected": true, "store-fake-ip": true },
        sniffer: {
            enable: true,
            sniff: {
                TLS: { ports: [443, 8443] },
                HTTP: { ports: [80, "8080-8880"], "override-destination": true }
            },
            "force-domain": ["+.v2ex.com"],
            "skip-domain": ["+.baidu.com", "+.bilibili.com"]
        },
        "geodata-mode": true,
        "geodata-loader": "memconservative",
        "geo-auto-update": true,
        "geo-update-interval": 48,
        "geox-url": accelURLs,
        tun: {
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
        }
    };

    // 应用DNS配置
    params.dns = { ...params.dns, ...dnsOptions };
    
    // 应用其他配置选项
    Object.keys(otherOptions).forEach((key) => {
        params[key] = otherOptions[key];
    });
}

// 根据正则表达式获取匹配的代理节点
function getProxiesByRegex(params, regex) {
    const matchedProxies = params.proxies
        .filter((e) => regex.test(e.name))
        .map((e) => e.name);
    return matchedProxies.length > 0 ? matchedProxies : ["✈️ 手动选择"];
}

// 导出主函数
module.exports = { main };