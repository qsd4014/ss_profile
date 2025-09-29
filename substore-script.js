// 与示例保持一致的总入口
const proxyName = "代理模式";

// 关键正则：大小写x均可匹配
const HIGH_MULT = /([2-9]|[1-9][0-9]+)[Xx]/;           // 2x/2X、10x/10X 等
const ISP_EXCLUDE = /(电信|联通|移动|四川|广西)/;        // 自动选择时排除（按你此前需求）
const HOME_EXCLUDE = /HOME/i;                           // 排除 HOME
const LOW_RATE_INCLUDE = /(0\.[0-9]+|直连|下载)/i;       // 0.x、直连、下载
const META_OTHERS_EXCLUDE = /( 剩余 | 到期 | 主页 | 官网 | 游戏 | 关注)/; // 其它-自动选择时

const countryRegions = [
  { code: "HK", name: "香港", icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/hk.svg", regex: /(香港|HK|Hong\s*Kong|🇭🇰)/i },
  { code: "TW", name: "台湾", icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/tw.svg", regex: /(台湾|TW|Taiwan|🇹🇼)/i },
  { code: "SG", name: "新加坡", icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/sg.svg", regex: /(新加坡|狮城|SG|Singapore|🇸🇬)/i },
  { code: "JP", name: "日本", icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/jp.svg", regex: /(日本|JP|Japan|🇯🇵)/i },
  { code: "US", name: "美国", icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/us.svg", regex: /(美国|US|USA|United\s*States|America|🇺🇸)/i },
  { code: "KR", name: "韩国", icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/kr.svg", regex: /(韩国|KR|Korea|South\s*Korea|🇰🇷)/i },
];

function main(params) {
  if (!params || !params.proxies) return params;

  overwriteRules(params);
  overwriteProxyGroups(params);
  overwriteDnsAndMisc(params);

  return params;
}

/* 规则与规则集：按你示例的写法，若 clash.ini 有差异可再对齐 */
function overwriteRules(params) {
  const customRules = [
    "DOMAIN-SUFFIX,linux.do,Linux Do",
    "DOMAIN-SUFFIX,shared.oaifree.com,Shared Chat",
  ];

  const rules = [
    ...customRules,
    "RULE-SET,steam,Steam",
    "RULE-SET,private,DIRECT",
    "RULE-SET,lancidr,DIRECT",
    "GEOIP,LAN,DIRECT,no-resolve",
    "RULE-SET,cncidr,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",
    "RULE-SET,direct,DIRECT",
    "RULE-SET,applications,DIRECT",
    "RULE-SET,openai,ChatGPT",
    "RULE-SET,claude,Claude",
    "RULE-SET,spotify,Spotify",
    "RULE-SET,telegramcidr,Telegram,no-resolve",
    "RULE-SET,apple," + proxyName,
    "RULE-SET,icloud," + proxyName,
    "RULE-SET,google," + proxyName,
    "RULE-SET,greatfire," + proxyName,
    "RULE-SET,reject,广告拦截",
    "RULE-SET,gfw," + proxyName,
    "RULE-SET,proxy," + proxyName,
    "RULE-SET,tld-not-cn," + proxyName,
    "MATCH,漏网之鱼",
  ];

  const ruleProviders = {
    steam: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/yangtb2024/Steam-Clash/refs/heads/main/Steam.txt",
      path: "./ruleset/steam.yaml",
      interval: 86400,
    },
    reject: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt",
      path: "./ruleset/reject.yaml",
      interval: 86400,
    },
    icloud: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/icloud.txt",
      path: "./ruleset/icloud.yaml",
      interval: 86400,
    },
    apple: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/apple.txt",
      path: "./ruleset/apple.yaml",
      interval: 86400,
    },
    google: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/google.txt",
      path: "./ruleset/google.yaml",
      interval: 86400,
    },
    proxy: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/proxy.txt",
      path: "./ruleset/proxy.yaml",
      interval: 86400,
    },
    openai: {
      type: "http",
      behavior: "classical",
      url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/OpenAI/OpenAI.yaml",
      path: "./ruleset/custom/openai.yaml",
      interval: 86400,
    },
    claude: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Claude/Claude.yaml",
      path: "./ruleset/custom/Claude.yaml",
      interval: 86400,
    },
    spotify: {
      type: "http",
      behavior: "classical",
      url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Spotify/Spotify.yaml",
      path: "./ruleset/custom/Spotify.yaml",
      interval: 86400,
    },
    telegramcidr: {
      type: "http",
      behavior: "ipcidr",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/telegramcidr.txt",
      path: "./ruleset/telegramcidr.yaml",
      interval: 86400,
    },
    direct: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt",
      path: "./ruleset/direct.yaml",
      interval: 86400,
    },
    private: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/private.txt",
      path: "./ruleset/private.yaml",
      interval: 86400,
    },
    gfw: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt",
      path: "./ruleset/gfw.yaml",
      interval: 86400,
    },
    greatfire: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/greatfire.txt",
      path: "./ruleset/greatfire.yaml",
      interval: 86400,
    },
    "tld-not-cn": {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/tld-not-cn.txt",
      path: "./ruleset/tld-not-cn.yaml",
      interval: 86400,
    },
    cncidr: {
      type: "http",
      behavior: "ipcidr",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/cncidr.txt",
      path: "./ruleset/cncidr.yaml",
      interval: 86400,
    },
    lancidr: {
      type: "http",
      behavior: "ipcidr",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/lancidr.txt",
      path: "./ruleset/lancidr.yaml",
      interval: 86400,
    },
    applications: {
      type: "http",
      behavior: "classical",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/applications.txt",
      path: "./ruleset/applications.yaml",
      interval: 86400,
    },
  };

  params["rule-providers"] = ruleProviders;
  params["rules"] = rules;
}

function overwriteProxyGroups(params) {
  const allProxyObjs = params.proxies || [];
  const allNames = allProxyObjs.map(p => p.name);

  // 通用过滤器
  const notHighMult = (name) => !HIGH_MULT.test(name) && !HOME_EXCLUDE.test(name);
  const notAutoExclude = (name) => !ISP_EXCLUDE.test(name) && notHighMult(name);
  const lowRate = (name) => LOW_RATE_INCLUDE.test(name) && notHighMult(name);

  // 地区自动选择组（隐藏），排除高倍和HOME
  const autoRegionGroups = countryRegions.map(region => {
    const regionNames = allNames.filter(n => region.regex.test(n) && notHighMult(n));
    return {
      name: `${region.code} - 自动选择`,
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: regionNames.length ? regionNames : ["手动选择"],
      hidden: true,
    };
  }).filter(g => g.proxies && g.proxies.length);

  // 地区手动选择组（可见），不排除 ISP 词，仅排除高倍/HOME（与此前地区组逻辑一致）
  const manualRegionGroups = countryRegions.map(region => {
    const regionNames = allNames.filter(n => region.regex.test(n) && notHighMult(n));
    return {
      name: `${region.code} - 手动选择`,
      type: "select",
      proxies: regionNames.length ? regionNames : ["DIRECT", "手动选择", proxyName],
      icon: region.icon,
      hidden: false,
    };
  }).filter(g => g.proxies && g.proxies.length);

  // 0.X 低倍率组
  const lowRateNames = allNames.filter(lowRate);

  // ALL - 自动选择：用于测速，排除 ISP 关键词、高倍/HOME
  const allAutoNames = allNames.filter(notAutoExclude);

  // 其它 - 自动选择：排除元信息与高倍/HOME
  const otherAutoNames = allNames.filter(n => !META_OTHERS_EXCLUDE.test(n) && notHighMult(n));

  const groups = [
    {
      name: proxyName,
      type: "select",
      url: "http://www.gstatic.com/generate_204",
      icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/adjust.svg",
      proxies: ["自动选择", "手动选择", "负载均衡 (散列)", "负载均衡 (轮询)", "DIRECT"],
    },
    {
      name: "手动选择",
      type: "select",
      icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/link.svg",
      proxies: allNames.length ? allNames : ["DIRECT"],
    },
    {
      name: "自动选择",
      type: "select",
      icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/speed.svg",
      proxies: ["ALL - 自动选择", ...autoRegionGroups.map(g => g.name)],
    },
    {
      name: "负载均衡 (散列)",
      type: "load-balance",
      url: "http://www.gstatic.com/generate_204",
      icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/balance.svg",
      interval: 300,
      "max-failed-times": 3,
      strategy: "consistent-hashing",
      lazy: true,
      proxies: allNames.length ? allNames : ["DIRECT"],
    },
    {
      name: "负载均衡 (轮询)",
      type: "load-balance",
      url: "http://www.gstatic.com/generate_204",
      icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/merry_go.svg",
      interval: 300,
      "max-failed-times": 3,
      strategy: "round-robin",
      lazy: true,
      proxies: allNames.length ? allNames : ["DIRECT"],
    },
    {
      name: "ALL - 自动选择",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: allAutoNames.length ? allAutoNames : ["手动选择"],
      hidden: true,
    },
    {
      name: "0.X",
      type: "select",
      proxies: lowRateNames.length ? lowRateNames : ["DIRECT", "手动选择", proxyName],
    },
    // 业务策略组：按你的示例
    ...["Linux Do", "Shared Chat", "Steam", "Telegram", "ChatGPT", "Claude", "Spotify"].map(groupName => ({
      name: groupName,
      type: "url-test",
      url: getTestUrlForGroup(groupName),
      interval: 300,
      tolerance: 50,
      proxies: [
        proxyName,
        ...countryRegions.flatMap(region => [
          `${region.code} - 自动选择`,
          `${region.code} - 手动选择`,
        ]),
        "其它 - 自动选择",
        "DIRECT",
      ],
      icon: getIconForGroup(groupName),
    })),
    {
      name: "漏网之鱼",
      type: "select",
      proxies: ["DIRECT", proxyName],
      icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/fish.svg",
    },
    {
      name: "广告拦截",
      type: "select",
      proxies: ["REJECT", "DIRECT", proxyName],
      icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/block.svg",
    },
    // 其它 - 自动选择（隐藏）
    {
      name: "其它 - 自动选择",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: otherAutoNames.length ? otherAutoNames : ["手动选择"],
      hidden: true,
    },
    // 地区自动+手动
    ...autoRegionGroups,
    ...manualRegionGroups,
  ];

  params["proxy-groups"] = groups;
}

function overwriteDnsAndMisc(params) {
  const cnDnsList = ["https://223.5.5.5/dns-query", "https://1.12.12.12/dns-query"];
  const trustDnsList = ["quic://dns.cooluc.com", "https://1.0.0.1/dns-query", "https://1.1.1.1/dns-query"];

  const dnsOptions = {
    enable: true,
    "prefer-h3": true,
    "default-nameserver": cnDnsList,
    nameserver: trustDnsList,
    "nameserver-policy": {
      "geosite:cn": cnDnsList,
      "geosite:geolocation-!cn": trustDnsList,
      "domain:google.com,facebook.com,youtube.com,twitter.com,github.com,cloudflare.com,jsdelivr.net,hf.space": trustDnsList,
    },
    fallback: trustDnsList,
    "fallback-filter": { geoip: true, "geoip-code": "CN", ipcidr: ["240.0.0.0/4"] },
  };

  const githubPrefix = "https://fastgh.lainbo.com/";
  const rawGeoxURLs = {
    geoip: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.dat",
    geosite: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
    mmdb: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country-lite.mmdb",
  };
  const accelURLs = Object.fromEntries(Object.entries(rawGeoxURLs).map(([key, githubUrl]) => [key, `${githubPrefix}${githubUrl}`]));

  const otherOptions = {
    "unified-delay": false,
    "tcp-concurrent": true,
    profile: { "store-selected": true, "store-fake-ip": true },
    sniffer: { enable: true, sniff: { TLS: { ports: [443, 8443] }, HTTP: { ports: [80, "8080-8880"], "override-destination": true } } },
    "geodata-mode": true,
    "geox-url": accelURLs,
  };

  params.dns = { ...params.dns, ...dnsOptions };
  Object.assign(params, otherOptions);
}

// 工具：测试地址与图标（与你示例一致）
function getTestUrlForGroup(groupName) {
  switch (groupName) {
    case "Shared Chat": return "https://shared.oaifree.com/";
    case "Steam": return "https://store.steampowered.com/";
    case "Telegram": return "https://web.telegram.org/";
    case "ChatGPT": return "https://chat.openai.com/";
    case "Claude": return "https://claude.ai/";
    case "Spotify": return "https://www.spotify.com/";
    default: return "http://www.gstatic.com/generate_204";
  }
}

function getIconForGroup(groupName) {
  switch (groupName) {
    case "Shared Chat": return "https://linux.do/user_avatar/linux.do/neo/144/12_2.png";
    case "Linux Do": return "https://linux.do/uploads/default/original/3X/9/d/9dd49731091ce8656e94433a26a3ef36062b3994.png";
    case "Steam": return "https://store.steampowered.com/favicon.ico";
    case "Telegram": return "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/telegram.svg";
    case "ChatGPT": return "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/chatgpt.svg";
    case "Claude": return "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/claude.svg";
    case "Spotify": return "https://storage.googleapis.com/spotifynewsroom-jp.appspot.com/1/2020/12/Spotify_Icon_CMYK_Green.png";
    case "漏网之鱼": return "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/fish.svg";
    case "广告拦截": return "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/block.svg";
    default: return "";
  }
}
