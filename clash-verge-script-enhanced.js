/**
 * Clash Verge Rev 全局扩展脚本 - 完整版
 *
 * 更新日期: 2025-10-17
 * 基于: Sub-Store脚本逻辑改造为Clash Verge格式
 *
 * 功能：
 * 1. 动态生成地区节点策略组（自动伸缩）
 * 2. 自动过滤高倍率节点
 * 3. 条件式生成服务策略组
 * 4. 完整的分流规则设置
 * 5. 优化的 DNS 配置
 */

/**
 * 服务配置开关，控制是否生成对应的策略组和规则
 */
const ruleOptions = {
  openai: true,      // OpenAI/Claude等AI服务
  youtube: true,     // YouTube视频
  netflix: true,     // Netflix奈飞
  disney: true,      // Disney+迪士尼
  telegram: true,    // Telegram电报
  google: true,      // Google服务
  apple: true,       // Apple服务
  microsoft: true,   // 微软服务
  games: true,       // 游戏平台
  ads: true,         // 广告过滤
};

/**
 * 地区配置，通过regex匹配代理节点名称
 */
const regionOptions = {
  excludeHighPercentage: true,
  regions: [
    {
      name: "HK香港",
      regex: /(香港|HK|Hong Kong)/i,
      ratioLimit: 2,
    },
    {
      name: "JP日本", 
      regex: /(日本|川日|东京|大阪|泉日|埼玉|沪日|深日|[^-]日|JP|Japan)/i,
      ratioLimit: 2,
    },
    {
      name: "US美国",
      regex: /(美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|US|United States|us)/i,
      ratioLimit: 2,
    },
    {
      name: "TW台湾",
      regex: /(台|新北|彰化|TW|Taiwan)/i,
      ratioLimit: 2,
    },
    {
      name: "SG新加坡",
      regex: /(新加坡|坡|狮城|SG|Singapore)/i,
      ratioLimit: 2,
    },
    {
      name: "KR韩国",
      regex: /(KR|Korea|KOR|首尔|韩|韓)/i,
      ratioLimit: 2,
    },
  ],
};

/**
 * DNS配置
 */
const chinaDNS = ["119.29.29.29", "180.184.1.1"];
const foreignDNS = ["tls://8.8.8.8", "tls://1.1.1.1"];
const defaultDNS = ["tls://1.12.12.12", "tls://223.5.5.5"];

// 代理组通用配置
const groupBaseOption = {
  interval: 300,
  timeout: 3000,
  url: "http://cp.cloudflare.com/generate_204",
  lazy: true,
  "max-failed-times": 3,
  hidden: false,
};

// 程序入口
function main(config) {
  console.log('Clash Verge脚本开始执行...');
  
  const proxyCount = config?.proxies?.length ?? 0;
  console.log('输入配置节点数量:', proxyCount);
  
  if (proxyCount === 0) {
    console.warn('警告: 配置文件中未找到任何代理节点');
    return config;
  }

  // 规则累积数组
  const rules = [];
  
  // 地区节点分组
  let regionProxyGroups = [];
  let otherProxyGroups = config.proxies.map((proxy) => proxy.name);
  
  // 基础配置注入
  injectAdvancedConfig(config);
  
  // 处理地区节点分组
  regionOptions.regions.forEach((region) => {
    // 提取符合地区和倍率要求的节点
    let proxies = config.proxies
      .filter((proxy) => {
        const multiplier = /(?<=[xX✕✖⨉倍率])([1-9]+(\\.\\d+)*|0{1}\\.\\d+)(?=[xX✕✖⨉倍率])*/i.exec(proxy.name)?.[1];
        return (
          proxy.name.match(region.regex) &&
          parseFloat(multiplier || "0") <= region.ratioLimit
        );
      })
      .map((proxy) => proxy.name);

    // 如果有符合要求的节点，创建策略组
    if (proxies.length > 0) {
      regionProxyGroups.push({
        ...groupBaseOption,
        name: region.name,
        type: "url-test",
        tolerance: 50,
        proxies: proxies,
      });
    }

    // 从其他节点中移除已分类的节点
    otherProxyGroups = otherProxyGroups.filter((name) => !proxies.includes(name));
  });

  // 获取地区组名称列表
  const proxyGroupsRegionNames = regionProxyGroups.map((group) => group.name);
  
  // 如果还有未分类的节点，添加到地区列表
  if (otherProxyGroups.length > 0) {
    proxyGroupsRegionNames.push("其他节点");
  }

  // 初始化策略组
  config["proxy-groups"] = [
    {
      ...groupBaseOption,
      name: "默认节点",
      type: "select", 
      proxies: [...proxyGroupsRegionNames, "直连"],
    },
  ];

  // 添加直连节点
  config.proxies = config?.proxies || [];
  config.proxies.push({
    name: "直连",
    type: "direct",
    udp: true,
  });

  // 条件式生成AI服务
  if (ruleOptions.openai) {
    rules.push(
      "GEOSITE,openai,国外AI",
      "GEOSITE,claude,国外AI"
    );
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "国外AI",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
    });
  }

  // 条件式生成YouTube
  if (ruleOptions.youtube) {
    rules.push("GEOSITE,youtube,YouTube");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "YouTube",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
    });
  }

  // 条件式生成Netflix
  if (ruleOptions.netflix) {
    rules.push("GEOSITE,netflix,Netflix");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Netflix",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
    });
  }

  // 条件式生成Disney+
  if (ruleOptions.disney) {
    rules.push("GEOSITE,disney,Disney+");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Disney+",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
    });
  }

  // 条件式生成Telegram
  if (ruleOptions.telegram) {
    rules.push("GEOIP,telegram,Telegram");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Telegram",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
    });
  }

  // 条件式生成Google服务
  if (ruleOptions.google) {
    rules.push("GEOSITE,google,Google服务");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Google服务",
      type: "select", 
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
    });
  }

  // 条件式生成Apple服务
  if (ruleOptions.apple) {
    rules.push("GEOSITE,apple-cn,Apple服务");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Apple服务",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
    });
  }

  // 条件式生成微软服务
  if (ruleOptions.microsoft) {
    rules.push(
      "GEOSITE,microsoft@cn,国内网站", 
      "GEOSITE,microsoft,微软服务"
    );
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "微软服务",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
    });
  }

  // 条件式生成游戏平台
  if (ruleOptions.games) {
    rules.push(
      "GEOSITE,category-games@cn,国内网站",
      "GEOSITE,category-games,游戏专用"
    );
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "游戏专用",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
    });
  }

  // 条件式生成广告过滤
  if (ruleOptions.ads) {
    rules.push("GEOSITE,category-ads-all,广告过滤");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "广告过滤",
      type: "select",
      proxies: ["REJECT", "直连", "默认节点"],
    });
  }

  // 添加基础规则（必须的）
  rules.push(
    "GEOSITE,private,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",
    "GEOIP,CN,国内网站,no-resolve",
    "MATCH,其他外网"
  );

  // 添加系统策略组
  config["proxy-groups"].push(
    {
      ...groupBaseOption,
      name: "其他外网",
      type: "select",
      proxies: ["默认节点", "国内网站", ...proxyGroupsRegionNames],
    },
    {
      ...groupBaseOption,
      name: "国内网站",
      type: "select",
      proxies: ["直连", "默认节点", ...proxyGroupsRegionNames],
    }
  );

  // 添加地区节点组
  config["proxy-groups"] = config["proxy-groups"].concat(regionProxyGroups);

  // 如果有其他节点，添加"其他节点"组
  if (otherProxyGroups.length > 0) {
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "其他节点",
      type: "select",
      proxies: otherProxyGroups,
    });
  }

  // 最后统一应用规则
  config.rules = rules;
  
  console.log('策略组生成完成，共', config["proxy-groups"].length, '个');
  console.log('分流规则生成完成，共', rules.length, '条');
  
  return config;
}

// ===== 高级配置注入 =====

function injectAdvancedConfig(config) {
  // DNS配置
  const dnsConfig = {
    enable: true,
    listen: ":53",
    ipv6: true,
    "prefer-h3": true,
    "use-hosts": true,
    "use-system-hosts": true,
    "respect-rules": true,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": ["*", "+.lan", "+.local"],
    "default-nameserver": [...defaultDNS],
    nameserver: [...foreignDNS],
    "proxy-server-nameserver": [...foreignDNS],
    "nameserver-policy": {
      "geosite:private": "system",
      "geosite:cn,steam@cn,category-games@cn,microsoft@cn,apple@cn": chinaDNS,
    },
  };

  // 基础配置
  config["allow-lan"] = true;
  config["bind-address"] = "*";
  config["mode"] = "rule";
  config["dns"] = dnsConfig;
  config["profile"] = {
    "store-selected": true,
    "store-fake-ip": true,
  };
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;
  config["keep-alive-interval"] = 1800;
  config["find-process-mode"] = "strict";
  config["geodata-mode"] = true;
  config["geodata-loader"] = "memconservative";
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;

  // 流量嗅探配置
  config["sniffer"] = {
    enable: true,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "override-destination": false,
    sniff: {
      TLS: { ports: [443, 8443] },
      HTTP: { ports: [80, "8080-8880"] },
      QUIC: { ports: [443, 8443] },
    },
    "force-domain": [],
    "skip-domain": ["Mijia Cloud", "+.oray.com"],
  };

  // NTP配置
  config["ntp"] = {
    enable: true,
    "write-to-system": false,
    server: "cn.ntp.org.cn",
  };
  
  console.log('高级配置注入完成');
}