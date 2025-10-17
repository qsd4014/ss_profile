/**
 * Clash Verge Rev 全局扩展脚本 - 基于Sub-Store脚本改造
 *
 * 更新日期: 2025-10-17
 * 修复内容: 将Sub-Store脚本适配为Clash Verge格式
 *
 * 功能：
 * 1. 动态生成地区节点策略组
 * 2. 自动过滤高倍率节点（同时匹配大小写 x）
 * 3. 实现精确的地区、流媒体、AI 服务分组
 * 4. 完整的分流规则设置
 * 5. 优化的 DNS 和性能配置
 */

// 程序入口 - Clash Verge使用config参数
function main(config) {
  console.log('Clash Verge脚本开始执行...');
  console.log('输入配置节点数量:', config.proxies ? config.proxies.length : 0);
  
  try {
    // 注入基础配置
    console.log('开始注入基础配置...');
    injectAdvancedConfig(config);
    
    // 生成策略组
    console.log('开始生成策略组...');
    overwriteProxyGroups(config);
    
    // 生成分流规则
    console.log('开始生成分流规则...');
    overwriteRules(config);
    
    // 验证配置
    console.log('开始验证配置...');
    validateConfig(config);
    
    console.log('Clash Verge脚本执行完成');
    
  } catch (error) {
    console.error('Clash Verge脚本执行出错:', error);
    console.error('错误堆栈:', error.stack);
  }
  
  return config;
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

// 地区节点识别（适配Clash Verge格式）
const REGIONS = {
  'HK香港': /(香港|HK|Hong Kong)/i,
  'JP日本': /(日本|川日|东京|大阪|泉日|埼玉|沪日|深日|[^-]日|JP|Japan)/i,
  'US美国': /(美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|US|United States|us)/i,
  'TW台湾': /(台|新北|彰化|TW|Taiwan)/i,
  'SG新加坡': /(新加坡|坡|狮城|SG|Singapore)/i,
  'KR韩国': /(KR|Korea|KOR|首尔|韩|韓)/i
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

function overwriteProxyGroups(config) {
  const proxies = config.proxies || [];
  
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
  
  // 生成策略组（适配Clash Verge）
  const newProxyGroups = [
    // 主要策略组
    {
      name: '默认节点',
      type: 'select',
      proxies: [
        '自动选择',
        '低倍率节点',
        '公益节点',
        '手动选择',
        '故障转移',
        '负载均衡',
        ...Object.keys(REGIONS),
        'DIRECT'
      ]
    },
    
    // 手动选择组
    { 
      name: '手动选择', 
      type: 'select', 
      proxies: allProxyNames.length > 0 ? allProxyNames : ['DIRECT']
    },
    
    // AI 服务
    { 
      name: '国外AI', 
      type: 'select', 
      proxies: allProxyNames.length > 0 ? ['默认节点', ...allProxyNames, 'DIRECT'] : ['DIRECT']
    },
    
    // 流媒体服务
    {
      name: 'YouTube',
      type: 'select',
      proxies: [
        '公益节点',
        '默认节点',
        '手动选择',
        '自动选择',
        ...Object.keys(REGIONS),
        'DIRECT'
      ]
    },
    
    {
      name: 'Netflix',
      type: 'select',
      proxies: streamingProxies.length > 0 ? ['手动选择', ...streamingProxies, 'DIRECT'] : ['手动选择', 'DIRECT']
    },
    
    // 系统策略组
    {
      name: '国内网站',
      type: 'select',
      proxies: ['DIRECT', '默认节点']
    },
    
    {
      name: '广告过滤',
      type: 'select',
      proxies: ['REJECT', 'DIRECT']
    },
    
    {
      name: '其他外网',
      type: 'select',
      proxies: [
        '默认节点',
        '手动选择',
        '自动选择',
        'DIRECT',
        ...Object.keys(REGIONS)
      ]
    },
    
    // 特殊节点组
    {
      name: '低倍率节点',
      type: 'select',
      proxies: lowRateProxies.length > 0 ? lowRateProxies : ['DIRECT']
    },
    
    // 地区节点组（适配Clash格式）
    ...Object.entries(REGIONS).map(([name, regex]) => ({
      name,
      type: regionProxies[name].length > 1 ? 'url-test' : 'select',
      url: 'http://cp.cloudflare.com/generate_204',
      interval: 300,
      tolerance: 50,
      proxies: regionProxies[name].length > 0 ? regionProxies[name] : ['DIRECT']
    })),
    
    // 公益节点
    {
      name: '公益节点',
      type: 'select',
      proxies: freeProxies.length > 0 ? freeProxies : ['DIRECT']
    },
    
    {
      name: '自建节点',
      type: 'select',
      proxies: selfBuildProxies.length > 0 ? selfBuildProxies : ['DIRECT']
    },
    
    // 自动策略
    {
      name: '自动选择',
      type: 'url-test',
      url: 'http://cp.cloudflare.com/generate_204',
      interval: 300,
      tolerance: 50,
      proxies: validProxies.length > 0 ? validProxies : ['DIRECT']
    },
    
    {
      name: '故障转移',
      type: 'fallback',
      url: 'http://cp.cloudflare.com/generate_204',
      interval: 300,
      tolerance: 50,
      lazy: true,
      proxies: validProxies.length > 0 ? validProxies : ['DIRECT']
    },
    
    {
      name: '负载均衡',
      type: 'load-balance',
      url: 'http://cp.cloudflare.com/generate_204',
      interval: 300,
      tolerance: 50,
      strategy: 'round-robin',
      proxies: selfBuildProxies.length > 0 ? selfBuildProxies : (validProxies.length > 0 ? validProxies : ['DIRECT'])
    }
  ];
  
  config['proxy-groups'] = newProxyGroups;
  console.log('策略组生成完成，共', newProxyGroups.length, '个策略组');
}

// ===== 分流规则生成 =====

function overwriteRules(config) {
  // 使用GEOSITE格式（Clash Verge适配）
  const newRules = [
    // 本地和私有规则
    'GEOSITE,private,DIRECT',
    'GEOIP,private,DIRECT,no-resolve',
    
    // 广告拦截规则
    'GEOSITE,category-ads-all,广告过滤',
    
    // AI服务规则
    'GEOSITE,openai,国外AI',
    'GEOSITE,claude,国外AI',
    
    // 流媒体和服务规则
    'GEOSITE,youtube,YouTube',
    'GEOSITE,netflix,Netflix',
    'GEOSITE,disney,Netflix',
    
    // 通讯服务
    'GEOIP,telegram,默认节点,no-resolve',
    
    // 科技服务
    'GEOSITE,google,默认节点',
    'GEOSITE,github,默认节点',
    
    // 国内服务规则
    'GEOSITE,apple-cn,国内网站',
    'GEOSITE,microsoft@cn,国内网站',
    'GEOSITE,category-games@cn,国内网站',
    
    // 代理规则
    'GEOSITE,gfw,默认节点',
    'GEOSITE,greatfire,默认节点',
    
    // 国内规则
    'GEOSITE,cn,国内网站',
    'GEOIP,CN,国内网站,no-resolve',
    
    // 兜底规则
    'MATCH,其他外网'
  ];
  
  config.rules = newRules;
  console.log('分流规则配置完成，共', newRules.length, '条规则');
  
  // 输出规则详细信息 (调试用)
  newRules.forEach((rule, index) => {
    console.log(`规则 ${index + 1}: ${rule}`);
  });
}

// ===== 配置验证函数 =====

function validateConfig(config) {
  const issues = [];
  
  // 检查必要的策略组是否存在
  const requiredGroups = ['国内网站', '广告过滤', '国外AI', '其他外网'];
  const existingGroups = (config['proxy-groups'] || []).map(g => g.name);
  
  requiredGroups.forEach(group => {
    if (!existingGroups.includes(group)) {
      issues.push(`缺少必要的策略组: ${group}`);
    }
  });
  
  // 检查规则顺序
  const ruleTexts = config.rules || [];
  const geoipIndex = ruleTexts.findIndex(rule => rule.startsWith('GEOIP,CN'));
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

function injectAdvancedConfig(config) {
  // DNS 配置（Clash格式）
  const dnsConfig = {
    enable: true,
    listen: ':53',
    ipv6: true,
    'prefer-h3': true,
    'use-hosts': true,
    'use-system-hosts': true,
    'respect-rules': true,
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/16',
    'fake-ip-filter': ['*', '+.lan', '+.local'],
    'default-nameserver': ['tls://1.12.12.12', 'tls://223.5.5.5'],
    nameserver: ['tls://8.8.8.8', 'tls://1.1.1.1', 'tls://9.9.9.9'],
    'proxy-server-nameserver': ['tls://8.8.8.8', 'tls://1.1.1.1'],
    'nameserver-policy': {
      'geosite:private': 'system',
      'geosite:cn,steam@cn,category-games@cn,microsoft@cn,apple@cn': ['119.29.29.29', '180.184.1.1']
    }
  };
  
  // 基础配置
  config['allow-lan'] = true;
  config['bind-address'] = '*';
  config['mode'] = 'rule';
  config.dns = dnsConfig;
  
  config.profile = {
    'store-selected': true,
    'store-fake-ip': true
  };
  
  config['unified-delay'] = true;
  config['tcp-concurrent'] = true;
  config['keep-alive-interval'] = 1800;
  config['find-process-mode'] = 'strict';
  config['geodata-mode'] = true;
  config['geodata-loader'] = 'memconservative';
  config['geo-auto-update'] = true;
  config['geo-update-interval'] = 24;
  
  // 流量嗅探配置
  config.sniffer = {
    enable: true,
    'force-dns-mapping': true,
    'parse-pure-ip': true,
    'override-destination': false,
    sniff: {
      TLS: { ports: [443, 8443] },
      HTTP: { ports: [80, '8080-8880'] },
      QUIC: { ports: [443, 8443] }
    },
    'force-domain': [],
    'skip-domain': ['Mijia Cloud', '+.oray.com']
  };
  
  // NTP配置
  config.ntp = {
    enable: true,
    'write-to-system': false,
    server: 'cn.ntp.org.cn'
  };
  
  console.log('高级配置注入完成');
}

// ===== 修复说明 =====
/*
 * 2025-10-17 Clash Verge适配版本
 * 
 * 主要适配内容：
 * 1. 修改主函数参数从params改为config
 * 2. 调整规则格式从RULE-SET改为GEOSITE
 * 3. 适配Clash Verge的策略组命名风格
 * 4. 使用Clash格式的DNS配置
 * 5. 调整测速URL为Cloudflare格式
 * 6. 简化策略组emoji使用
 * 7. 优化地区节点识别正则
 * 
 * 使用说明：
 * 1. 直接在 Clash Verge Rev 全局扩展脚本中使用
 * 2. 脚本会自动识别和过滤节点
 * 3. 生成适合Clash Verge的配置格式
 * 4. 查看浏览器控制台获取详细日志
 */