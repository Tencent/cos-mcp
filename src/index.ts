#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCosMcpServer, startWithSSE } from './server.js';
import { config } from 'dotenv';
import { resolve } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { z } from 'zod';
import { maskSecret } from './server.js';
// COS配置验证Schema
export const cosConfigSchema = z.object({
  Region: z.string(),
  SecretId: z.string(),
  SecretKey: z.string(),
  Bucket: z.string(),
  DatasetName: z.string().optional(),
});

// 导出COS配置类型
export type CosConfig = z.infer<typeof cosConfigSchema>;

export interface ServerConfig {
  port: number;
  cosConfig: CosConfig;
  connectType: string;
}
// 加载当前工作目录中的.env文件
config({ path: resolve(process.cwd(), '.env') });

function getConfig() {
  const argv = yargs(hideBin(process.argv))
    .options({
      'cos-config': {
        type: 'string',
        description: 'COS配置的JSON',
      },
      port: {
        type: 'number',
        description: 'server运行端口',
      },
      connectType: {
        type: 'string',
        description: '连接类型',
        choices: ['stdio', 'sse'],
      },
    })
    .help()
    .version('0.0.1')
    .parseSync();

  // 首先从命令行中获取
  let config: ServerConfig = {
    connectType: 'stdio',
    port: 3001,
    cosConfig: {
      Region: '',
      SecretId: '',
      SecretKey: '',
      Bucket: '',
      DatasetName: '',
    },
  };
  // 必要参数
  // SecretId SecretKey bucket region connectType
  // 从环境变量中获取端口
  if (argv.port) {
    config.port = argv.port;
  } else if (process.env.port) {
    config.port = Number(process.env.port);
  }

  if (argv.connectType) {
    config.connectType = argv.connectType;
  } else if (process.env.connectType) {
    config.connectType = process.env.connectType;
  }

  // 从获取cos配置, 复杂获取
  if (argv['cos-config']) {
    config.cosConfig = JSON.parse(argv['cos-config'] as string);
  } else if (process.env.cosConfig) {
    config.cosConfig = JSON.parse(process.env.cosConfig);
  }
  // 从环境变量中获取cos配置， 简单获取
  (
    ['Region', 'SecretId', 'SecretKey', 'Bucket', 'DatasetName'] as const
  ).forEach((item) => {
    if (argv[item]) {
      config.cosConfig[item] = argv[item] as string;
    } else if (process.env[item]) {
      config.cosConfig[item] = process.env[item] as string;
    }
  });
  // 验证配置
  if (
    !config.cosConfig.SecretId ||
    !config.cosConfig.SecretKey ||
    !config.cosConfig.Bucket ||
    !config.cosConfig.Region
  ) {
    console.error('COS配置不全。请使用cos-config参数指定COS配置');
  }
  if (config.connectType !== 'stdio') {
    console.log('\nCOS配置信息:');
    console.log(`- 端口: ${config.port}`);
    console.log(`- 运行模式: ${config.connectType}`);
    console.log('- cos配置:');
    Object.keys(config.cosConfig).forEach((key) => {
      let value = config.cosConfig[key as keyof CosConfig];
      if (key === 'SecretId' || key === 'SecretKey') {
        value = maskSecret(value as string);
      }
      console.log(`  - ${key}: ${value}`);
    });
    console.log('\n');
  }

  return config;
}

async function startCOServer() {
  const config = getConfig();
  // 创建COS MCP
  const server = createCosMcpServer(config);
  if (config.connectType === 'stdio') {
    // 使用stdio:标准输入输出进行通信
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }

  // 使用SSE:Server-Sent Events进行通信
  startWithSSE(server, config.port || 3001);
}

startCOServer().catch((error) => {
  console.error('启动失败', error);
  process.exit(1);
});
