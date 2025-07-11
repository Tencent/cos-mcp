import express, { Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import COS from 'cos-nodejs-sdk-v5';
import { z } from 'zod';
import { ServerConfig } from './index.js';
import { CosService } from './services/cos/cos.service.js';
import { CIPicService } from './services/ci/pic.service.js';
import { CIMediaService } from './services/ci/media.service.js';
import { CIAIService } from './services/ci/ai.service.js';
import { CIMateInsightService } from './services/ci/mateInsight.service.js';
import { CIDocService } from './services/ci/doc.service.js';

export function maskSecret(secret: string): string {
  secret = String(secret);
  if (secret.length <= 4) return '****';
  return `${secret.substring(0, 4)}****${secret.slice(-4)}`;
}

export const Logger = {
  log: (...args: any[]) => {
    console.log(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  },
};

const USER_AGENT = 'modelcontextprotocol/servers/cos';
export function createCosMcpServer(config: ServerConfig) {
  const cos = new COS({
    SecretId: config.cosConfig?.SecretId || '',
    SecretKey: config.cosConfig?.SecretKey || '',
    UserAgent: USER_AGENT,
  });

  const bucket = config.cosConfig.Bucket;
  const region = config.cosConfig.Region;
  const datasetName = config.cosConfig.DatasetName;

  const COSInstance = new CosService(bucket, region, cos);
  const CIPicInstance = new CIPicService(bucket, region, cos);
  const CIMediaInstance = new CIMediaService(bucket, region, cos);
  const CIAIInstance = new CIAIService(bucket, region, cos);
  const CIMateInsightInstance = new CIMateInsightService(
    bucket,
    region,
    datasetName || '',
    cos,
  );
  const CIDocInstance = new CIDocService(bucket, region, cos);

  const server = new McpServer(
    {
      name: 'COS MCP Server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: { listChanged: true },
        // resources: { listChanged: true },
        // prompts: { listChanged: true },
        // logging: {},
      },
    },
  );

  server.tool('getCosConfig', '获取COS配置, 腾讯云配置', {}, async () => {
    if (config.cosConfig) {
      config.cosConfig.SecretId = maskSecret(config.cosConfig.SecretId);
      config.cosConfig.SecretKey = maskSecret(config.cosConfig.SecretKey);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(config, null, 2),
        },
      ],
    };
  });

  server.tool(
    'putObject',
    '上传本地文件到存储桶',
    {
      filePath: z.string().describe('文件路径 (包含文件名)'),
      fileName: z.string().optional().describe('文件名 （存在存储桶里的名称）'),
      targetDir: z
        .string()
        .optional()
        .describe('目标目录 （存在存储桶的哪个目录）'),
    },
    async ({ fileName, filePath, targetDir }) => {
      const res = await COSInstance.uploadFile({
        fileName,
        filePath,
        targetDir,
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  server.tool(
    'putObjectSourceUrl',
    '通过 url下载文件并将文件上传到存储桶',
    {
      sourceUrl: z.string().describe('可下载的文件 url'),
      fileName: z.string().optional().describe('文件名 （存在存储桶里的名称）'),
      targetDir: z
        .string()
        .optional()
        .describe('目标目录 （存在存储桶的哪个目录）'),
    },
    async ({ sourceUrl, fileName, targetDir}) => {
      const res = await COSInstance.uploadFileSourceUrl({
        targetDir,
        fileName,
        sourceUrl,
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );


  server.tool(
    'getObjectUrl',
    '获取存储桶内的文件的带签名的下载链接',
    {
      objectKey: z.string().describe('文件的路径'),
    },
    async ({ objectKey = '/' }) => {
      const res = await COSInstance.getObjectUrl(objectKey);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
            },
          ],
          isError: !res.isSuccess,
        };
    },
  );

  
  server.tool(
    'getObject',
    '下载存储桶内的文件',
    {
      objectKey: z.string().describe('文件的路径'),
    },
    async ({ objectKey = '/' }) => {
      const res = await COSInstance.getObject(objectKey);
      if (!res.isSuccess) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
            },
          ],
          isError: true
        };
      }
      return {
        content: [res.data] as any,
        isError: false,
      };
    },
  );
  server.tool(
    'getBucket',
    '查询存储桶内的文件列表',
    {
      Prefix: z.string().optional().describe('文件列表的路径前缀,默认根路径'),
    },
    async ({ Prefix = '' }) => {
      const res = await COSInstance.getBucket(Prefix);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  // --CI--

  server.tool(
    'imageInfo',
    '图片处理-获取图片信息',
    {
      objectKey: z.string().describe('图片在存储桶里的路径'),
    },
    async ({ objectKey }) => {
      const res = await CIPicInstance.imageInfo(objectKey);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  server.tool(
    'assessQuality',
    '图片处理-图片质量评估',
    {
      objectKey: z.string().describe('图片在存储桶里的路径'),
    },
    async ({ objectKey }) => {
      const res = await CIAIInstance.assessQuality(objectKey);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  server.tool(
    'aiSuperResolution',
    '图片处理-超分辨率',
    {
      objectKey: z.string().describe('图片在存储桶里的路径'),
    },
    async ({ objectKey }) => {
      const res = await CIAIInstance.aiSuperResolution(objectKey);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  server.tool(
    'aiPicMatting',
    '图片处理-抠图',
    {
      objectKey: z.string().describe('图片在存储桶里的路径'),
      width: z.string().optional().describe('宽度'),
      height: z.string().optional().describe('高度'),
    },
    async ({ objectKey, width = '5', height = '5' }) => {
      const res = await CIAIInstance.aiPicMatting(objectKey, width, height);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  server.tool(
    'aiQrcode',
    '图片处理-二维码识别-识别存储桶内二维码图片内容',
    {
      objectKey: z
        .string()
        .describe('COS对象键（完整路径）示例: images/qrcode.jpg'),
    },
    async ({ objectKey }) => {
      const res = await CIAIInstance.aiQrcode(objectKey);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  server.tool(
    'waterMarkFont',
    '生成带文字水印的图片',
    {
      objectKey: z
        .string()
        .describe('COS对象键（完整路径）示例: images/photo.jpg'),
      text: z.string().describe('水印文字内容（支持中文）').default('test'),
    },
    async ({ objectKey, text }) => {
      const res = await CIPicInstance.waterMarkFont({ objectKey, text });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  // --MEDIA--

  server.tool(
    'createMediaSmartCoverJob',
    '创建媒体智能封面任务',
    {
      objectKey: z.string().describe('对象在存储桶里的路径'),
    },
    async ({ objectKey }) => {
      const res = await CIMediaInstance.createMediaSmartCoverJob(objectKey);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );
  server.tool(
    'describeMediaJob',
    '根据 jobid 查询指定的媒体智能封面任务结果',
    {
      jobId: z
        .string()
        .describe('要查询的任务ID，可通过提交智能封面任务的响应中获取。'),
    },
    async ({ jobId }) => {
      const res = await CIMediaInstance.describeMediaJob(jobId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  // --METAINSIGHT--

  server.tool(
    'imageSearchPic',
    '根据输入的图片，从数据集中检索出与输入的图片内容相似的图片',
    {
      uri: z.string().describe('图片地址'),
    },
    async ({ uri }) => {
      const res = await CIMateInsightInstance.imageSearchPic({ uri });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  server.tool(
    'imageSearchText',
    '根据输入的文本内容，从数据集中检索出与输入的文本内容相符的图片',
    {
      text: z.string().describe('检索的文本'),
    },
    async ({ text }) => {
      const res = await CIMateInsightInstance.imageSearchText({ text });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  // --DOCMENT--
  server.tool(
    'createDocToPdfJob',
    '创建文档转 pdf 处理任务',
    {
      objectKey: z.string().describe('对象在存储桶里的路径'),
    },
    async ({ objectKey }) => {
      const res = await CIDocInstance.createDocToPdfJobs(objectKey);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );
  server.tool(
    'describeDocProcessJob',
    '根据 jobid 查询指定的文档转码任务结果',
    {
      jobId: z
        .string()
        .describe('要查询的任务ID，可通过提交文档任务的响应中获取。'),
    },
    async ({ jobId }) => {
      const res = await CIDocInstance.describeDocProcessJob(jobId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res.data, null, 2),
          },
        ],
        isError: !res.isSuccess,
      };
    },
  );

  return server;
}

export function startWithSSE(server: McpServer, port: number = 3001) {
  const app = express();
  // to support multiple simultaneous connections we have a lookup object from
  // sessionId to transport
  const transports: { [sessionId: string]: SSEServerTransport } = {};

  app.get('/sse', async (_: Request, res: Response) => {
    const transport = new SSEServerTransport('/messages', res);
    transports[transport.sessionId] = transport;
    res.on('close', () => {
      delete transports[transport.sessionId];
    });
    await server.connect(transport);
  });

  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send('No transport found for sessionId');
    }
  });

  app.listen(port, () => {
    Logger.log = console.log;
    Logger.error = console.error;

    Logger.log(`SSE模式监听端口: ${port}`);
    Logger.log(`SSE: http://localhost:${port}/sse`);
    Logger.log(`消息: http://localhost:${port}/messages`);
  });
}
