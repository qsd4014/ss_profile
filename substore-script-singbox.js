/**
 * Sub-Store 脚本 - SingBox 版本
 * 适用于 SingBox v1.11+
 * 基于 mihomo.yaml/clash.ini 规则
 * 
 * 更新日期: 2025-09-30
 * 版本: 1.0.1 (修复版)
 */

function main(params) {
  try {
    // 确保有基础的 proxies 数组
    if (!params.proxies || !Array.isArray(params.proxies)) {
      params.proxies = [];
    }
    
    // 生成 SingBox 配置
    generateSingBoxConfig(params);
    
    return params;
  } catch (error) {
    console.log('Error in SingBox script:', error);
    return params;
  }
}

function generateSingBoxConfig(params) {
  const { proxies } = params;
  
  // 节点过滤逻辑
  const HIGH_RATE_REGEX = /([2-9]|[1-9][0-9]+)[Xx]/;
  const EXCLUDE_KEYWORDS = /(HOME|电信|联通|移动|四川|广西)/i;
  const isValidNode = (name) => !HIGH_RATE_REGEX.test(name) && !EXCLUDE_KEYWORDS.test(name);
  
  // 获取节点标签
  const allTags = proxies.map(p => p.tag || p.name || '').filter(Boolean);
  const validTags = allTags.filter(isValidNode);
  
  // 地区节点过滤
  const getRegionNodes = (regex) => allTags.filter(name => regex.test(name) && isValidNode(name));
  
  const hkNodes = getRegionNodes(/(香港|HK|Hong Kong)/i);
  const jpNodes = getRegionNodes(/(日本|川日|东京|大阪|JP|Japan)/i);
  const usNodes = getRegionNodes(/(美|波特兰|达拉斯|俄勒冈|US|United States|us)/i);
  const twNodes = getRegionNodes(/(台|新北|彰化|TW|Taiwan)/i);
  const sgNodes = getRegionNodes(/(新加坡|坡|狮城|SG|Singapore)/i);
  const krNodes = getRegionNodes(/(KR|Korea|首尔|韩)/i);
  
  // 特殊节点过滤
  const lowRateNodes = allTags.filter(name => /(0\.[0-9]+|直连|下载)/i.test(name) && isValidNode(name));
  const freeNodes = allTags.filter(name => /(Hax|hax|Oracle|oracle|FREE|CF)/i.test(name));
  const selfBuildNodes = allTags.filter(name => /(自建|Oracle|oracle)/i.test(name));
  
  // 流媒体适用节点
  const streamingNodes = allTags.filter(name => 
    /(新加坡|坡|狮城|SG|Singapore|美|US|us|香港|HK|台|TW|Taiwan)/i.test(name) && isValidNode(name)
  );
  
  // 生成出站配置
  const outbounds = [...proxies];
  
  // 添加系统出站
  outbounds.push(
    { type: 'direct', tag: 'direct' },
    { type: 'block', tag: 'block' },
    { type: 'dns', tag: 'dns-out' }
  );
  
  // 添加策略组出站
  const policyGroups = [
    // 主策略组
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
        '🇭🇰 香港节点',
        '🇯🇵 日本节点',
        '🇺🇲 美国节点',
        '🇨🇳 台湾节点',
        '🇸🇬 狮城节点',
        '🇰🇷 韩国节点',
        'direct'
      ].filter(Boolean)
    },
    
    // 手动选择
    {
      type: 'selector',
      tag: '✈️ 手动选择',
      outbounds: allTags.length > 0 ? allTags : ['direct']
    },
    
    {
      type: 'selector',
      tag: '🛩️ 手动选择备用',
      outbounds: allTags.length > 0 ? allTags : ['direct']
    },
    
    // AI 服务
    {
      type: 'selector',
      tag: '🌍 OpenAI',
      outbounds: allTags.length > 0 ? allTags : ['direct']
    },
    
    {
      type: 'selector',
      tag: '🌍 CleanIP',
      outbounds: allTags.length > 0 ? allTags : ['direct']
    },
    
    // 流媒体
    {
      type: 'selector',
      tag: '📹 油管视频',
      outbounds: ['🚀 节点选择', '✈️ 手动选择', 'direct']
    },
    
    {
      type: 'selector',
      tag: '🎥 奈飞视频',
      outbounds: streamingNodes.length > 0 ? streamingNodes : ['✈️ 手动选择', 'direct']
    },
    
    {
      type: 'selector',
      tag: '🐹 DisneyPlus',
      outbounds: streamingNodes.length > 0 ? streamingNodes : ['✈️ 手动选择', 'direct']
    },
    
    // 通讯
    {
      type: 'selector',
      tag: '📲 电报消息',
      outbounds: ['🚀 节点选择', '✈️ 手动选择', 'direct']
    },
    
    // 媒体
    {
      type: 'selector',
      tag: '🌍 国外媒体',
      outbounds: ['🚀 节点选择', '✈️ 手动选择', 'direct']
    },
    
    {
      type: 'selector',
      tag: '🌏 国内媒体',
      outbounds: ['direct', '🚀 节点选择']
    },
    
    // 科技服务
    {
      type: 'selector',
      tag: '🍎 苹果服务',
      outbounds: ['direct', '🚀 节点选择']
    },
    
    {
      type: 'selector',
      tag: 'Ⓜ️ 微软服务',
      outbounds: ['direct', '🚀 节点选择']
    },
    
    // 系统
    {
      type: 'selector',
      tag: '🛑 广告拦截',
      outbounds: ['block', 'direct']
    },
    
    {
      type: 'selector',
      tag: '🍃 应用净化',
      outbounds: ['block', 'direct']
    }
  ];
  
  // 添加特殊节点组
  if (lowRateNodes.length > 0) {
    policyGroups.push({
      type: 'selector',
      tag: '0.X',
      outbounds: lowRateNodes
    });
  } else {
    policyGroups.push({
      type: 'selector',
      tag: '0.X',
      outbounds: ['direct']
    });
  }
  
  if (freeNodes.length > 0) {
    policyGroups.push({
      type: 'selector',
      tag: '🆓 公益',
      outbounds: freeNodes
    });
  } else {
    policyGroups.push({
      type: 'selector',
      tag: '🆓 公益',
      outbounds: ['direct']
    });
  }
  
  if (selfBuildNodes.length > 0) {
    policyGroups.push({
      type: 'selector',
      tag: '🚁 自建节点',
      outbounds: selfBuildNodes
    });
  } else {
    policyGroups.push({
      type: 'selector',
      tag: '🚁 自建节点',
      outbounds: ['direct']
    });
  }
  
  // 添加地区节点组
  const regionGroups = [
    { tag: '🇭🇰 香港节点', nodes: hkNodes },
    { tag: '🇯🇵 日本节点', nodes: jpNodes },
    { tag: '🇺🇲 美国节点', nodes: usNodes },
    { tag: '🇨🇳 台湾节点', nodes: twNodes },
    { tag: '🇸🇬 狮城节点', nodes: sgNodes },
    { tag: '🇰🇷 韩国节点', nodes: krNodes }
  ];
  
  regionGroups.forEach(({ tag, nodes }) => {
    if (nodes.length > 1) {
      policyGroups.push({
        type: 'urltest',
        tag,
        outbounds: nodes,
        url: 'https://www.gstatic.com/generate_204',
        interval: '5m',
        tolerance: 50
      });
    } else if (nodes.length === 1) {
      policyGroups.push({
        type: 'selector',
        tag,
        outbounds: nodes
      });
    } else {
      policyGroups.push({
        type: 'selector',
        tag,
        outbounds: ['direct']
      });
    }
  });
  
  // 添加自动选择
  if (validTags.length > 0) {
    policyGroups.push({
      type: 'urltest',
      tag: '♻️ 自动选择',
      outbounds: validTags,
      url: 'https://www.gstatic.com/generate_204',
      interval: '5m',
      tolerance: 50
    });
  } else {
    policyGroups.push({
      type: 'selector',
      tag: '♻️ 自动选择',
      outbounds: ['direct']
    });
  }
  
  // 将策略组添加到出站
  outbounds.push(...policyGroups);
  
  // 设置出站
  params.outbounds = outbounds;
  
  // 生成路由规则
  generateRoute(params);
  
  // 生成其他配置
  generateOtherConfigs(params);
  
  // 清理 Clash 配置
  cleanupClashConfig(params);
}

function generateRoute(params) {
  // 规则集定义
  const ruleProviders = {
    'LocalAreaNetwork': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list',
    'UnBan': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list',
    'BanAD': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list',
    'BanProgramAD': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanProgramAD.list',
    'OpenAI': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OpenAI/OpenAI.list',
    'YouTube': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/YouTube.list',
    'Netflix': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Netflix/Netflix.list',
    'Disney': 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Disney/Disney.list',
    'Telegram': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list',
    'Apple': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Apple.list',
    'Microsoft': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Microsoft.list',
    'ProxyMedia': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list',
    'ChinaMedia': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaMedia.list',
    'ProxyGFWlist': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyGFWlist.list',
    'ChinaDomain': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list',
    'ChinaCompanyIp': 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaCompanyIp.list'
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
  
  // 路由规则
  const rules = [
    // DNS
    { protocol: 'dns', outbound: 'dns-out' },
    
    // 本地和广告
    { rule_set: ['LocalAreaNetwork', 'UnBan'], outbound: 'direct' },
    { rule_set: ['BanAD'], outbound: '🛑 广告拦截' },
    { rule_set: ['BanProgramAD'], outbound: '🍃 应用净化' },
    
    // AI 和流媒体
    { rule_set: ['OpenAI'], outbound: '🌍 OpenAI' },
    { rule_set: ['YouTube'], outbound: '📹 油管视频' },
    { rule_set: ['Netflix'], outbound: '🎥 奈飞视频' },
    { rule_set: ['Disney'], outbound: '🐹 DisneyPlus' },
    
    // 通讯和服务
    { rule_set: ['Telegram'], outbound: '📲 电报消息' },
    { rule_set: ['Apple'], outbound: '🍎 苹果服务' },
    { rule_set: ['Microsoft'], outbound: 'Ⓜ️ 微软服务' },
    
    // 媒体分类
    { rule_set: ['ProxyMedia'], outbound: '🌍 国外媒体' },
    { rule_set: ['ChinaMedia'], outbound: '🌏 国内媒体' },
    
    // 代理和直连
    { rule_set: ['ProxyGFWlist'], outbound: '🚀 节点选择' },
    { rule_set: ['ChinaDomain', 'ChinaCompanyIp'], outbound: 'direct' },
    
    // 地理位置
    { geoip: ['cn'], outbound: 'direct' }
  ];
  
  params.route = {
    auto_detect_interface: true,
    final: '🚀 节点选择',
    rule_set,
    rules
  };
}

function generateOtherConfigs(params) {
  // 日志配置
  params.log = {
    disabled: false,
    level: 'info',
    timestamp: true
  };
  
  // DNS 配置
  params.dns = {
    servers: [
      {
        tag: 'cloudflare',
        address: 'https://1.1.1.1/dns-query',
        detour: '🚀 节点选择'
      },
      {
        tag: 'ali',
        address: 'https://223.5.5.5/dns-query',
        detour: 'direct'
      }
    ],
    rules: [
      {
        geosite: ['cn'],
        server: 'ali'
      }
    ],
    final: 'cloudflare',
    strategy: 'prefer_ipv4'
  };
  
  // 入站配置
  if (!params.inbounds) {
    params.inbounds = [
      {
        type: 'mixed',
        tag: 'mixed-in',
        listen: '127.0.0.1',
        listen_port: 2080
      },
      {
        type: 'tun',
        tag: 'tun-in',
        interface_name: 'tun0',
        inet4_address: '172.19.0.1/30',
        auto_route: true,
        strict_route: true,
        stack: 'mixed'
      }
    ];
  }
  
  // 实验性配置
  params.experimental = {
    clash_api: {
      external_controller: '127.0.0.1:9090',
      external_ui_download_url: 'https://github.com/MetaCubeX/Yacd-meta/archive/gh-pages.zip',
      default_mode: 'rule'
    }
  };
}

function cleanupClashConfig(params) {
  // 删除 Clash 特有字段
  const clashFields = [
    'proxies', 'proxy-groups', 'proxy-providers', 'rule-providers', 'rules',
    'port', 'socks-port', 'mixed-port', 'allow-lan', 'mode', 'log-level',
    'find-process-mode', 'unified-delay', 'tcp-concurrent', 'global-client-fingerprint',
    'keep-alive-idle', 'keep-alive-interval', 'external-controller', 'secret',
    'external-ui-url', 'geodata-mode', 'geodata-loader', 'geo-auto-update',
    'geo-update-interval', 'geox-url', 'sniffer', 'tun', 'profile'
  ];
  
  clashFields.forEach(field => {
    delete params[field];
  });
}