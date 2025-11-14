import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import axios from 'axios';
import { PassThrough } from 'stream';
import { generateOutPutFileId } from '../utils.js';
import { TEXT_TYPES } from '../constant.js';

export const UploadFileParamsSchema = z.object({
  filePath: z.string().optional(),
  targetDir: z.string().optional(),
  fileName: z.string().optional(),
  sourceUrl: z.string().optional()
});
export type UploadFileParams = z.infer<typeof UploadFileParamsSchema>;

export const UploadStringParamsSchema = z.object({
  content: z.string(),
  fileName: z.string(),
  targetDir: z.string().optional(),
  contentType: z.string().optional()
});
export type UploadStringParams = z.infer<typeof UploadStringParamsSchema>;

export const UploadBase64ParamsSchema = z.object({
  base64Content: z.string(),
  fileName: z.string(),
  targetDir: z.string().optional(),
  contentType: z.string().optional()
});
export type UploadBase64Params = z.infer<typeof UploadBase64ParamsSchema>;

export const UploadBufferParamsSchema = z.object({
  content: z.string(),
  fileName: z.string(),
  targetDir: z.string().optional(),
  contentType: z.string().optional(),
  encoding: z.enum(['hex', 'base64', 'utf8', 'ascii', 'binary']).optional()
});
export type UploadBufferParams = z.infer<typeof UploadBufferParamsSchema>;

export class CosService {
  bucket: string;
  region: string;
  cos: COS;
  constructor(bucket: string, region: string, cos: COS) {
    this.bucket = bucket;
    this.region = region;
    this.cos = cos;
  }


  private processBase64(base64 = '', contentType = '') {
  // 基础验证
  if (typeof base64 !== 'string') {
    throw new Error('base64参数必须是字符串');
  }
  
  if (typeof contentType !== 'string') {
    throw new Error('contentType参数必须是字符串');
  }
  
  let base64Data = base64;
  let finalContentType = contentType;
  
  // 检查base64是否包含数据头
  const dataUriRegex = /^data:([^;]+);base64,/;
  const match = base64.match(dataUriRegex);
  
  if (match) {
    // 如果base64有数据头，提取纯数据和contentType
    const headerEndIndex = base64.indexOf(',') + 1;
    base64Data = base64.substring(headerEndIndex);
    
    // 如果没有传递contentType，则从base64头中提取
    if (!contentType.trim()) {
      finalContentType = match[1];
    }
  }
  
  return {
    base64Data: base64Data.trim(),
    contentType: finalContentType.trim()
  };
}

  /**
   * 构建COS路径
   * @param fileName 文件名
   * @param targetDir 目标目录
   * @returns COS路径
   */
  private buildCosPath(fileName: string, targetDir?: string): string {
    if (!targetDir) {
      return fileName;
    }
    
    // 规范化目标目录：移除头尾斜杠
    const normalizedDir = targetDir.replace(/^\/+|\/+$/g, '');
    return normalizedDir ? `${normalizedDir}/${fileName}` : fileName;
  }

  //   /**
  //  * 上传文件到COS
  //  * @param params 上传参数
  //  * @returns 上传结果
  //  */
  async uploadFile(params: UploadFileParams) {
    // 验证并解析参数
    const validParams = UploadFileParamsSchema.parse(params);
    const { filePath, targetDir = '', fileName } = validParams;
    try {
      // 检查文件是否存在
      if (!filePath || !fs.existsSync(filePath)) {
        return {
          isSuccess: false,
          message: '此路径上文件不存在',
          data: '此路径上文件不存在: ' + filePath,
        };
      }
      // 确定文件名
      const actualFileName = fileName || path.basename(filePath);

      // 构建COS路径
      const cosPath = this.buildCosPath(actualFileName, targetDir);

      // 上传文件
      const cosParams: COS.UploadFileParams = {
        Bucket: this.bucket,
        Region: this.region,
        Key: cosPath,
        FilePath: filePath,
      };

      const result = await this.cos.uploadFile(cosParams);

      return {
        isSuccess: true,
        message: '上传成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '上传失败',
        data: error,
      };
    }
  }

  /**
   * 上传字符串内容到COS
   * @param params 上传参数
   * @returns 上传结果
   */
  async uploadString(params: UploadStringParams) {
    const validParams = UploadStringParamsSchema.parse(params);
    const { content, fileName, targetDir = '', contentType = 'text/plain' } = validParams;
    
    try {
      // 构建COS路径
      const cosPath = this.buildCosPath(fileName, targetDir);

      // 上传字符串内容
      const cosParams: COS.PutObjectParams = {
        Bucket: this.bucket,
        Region: this.region,
        Key: cosPath,
        Body: content,
        ContentType: contentType,
      };

      const result = await this.cos.putObject(cosParams);

      return {
        isSuccess: true,
        message: '上传成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '上传失败',
        data: error,
      };
    }
  }

  /**
   * 上传base64内容到COS
   * @param params 上传参数
   * @returns 上传结果
   */
  async uploadBase64(params: UploadBase64Params) {
    const validParams = UploadBase64ParamsSchema.parse(params);
    let { base64Content, fileName, targetDir = '' } = validParams;
    
    try {
      // 构建COS路径
      const cosPath = this.buildCosPath(fileName, targetDir);

      // 处理base64
      let { base64Data, contentType } = this.processBase64(base64Content, validParams.contentType);

      // 将base64转换为Buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // 上传buffer内容
      const cosParams: COS.PutObjectParams = {
        Bucket: this.bucket,
        Region: this.region,
        Key: cosPath,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
      };

      const result = await this.cos.putObject(cosParams);

      return {
        isSuccess: true,
        message: '上传成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '上传失败',
        data: error,
      };
    }
  }

  /**
   * 上传buffer内容到COS
   * @param params 上传参数
   * @returns 上传结果
   */
  async uploadBuffer(params: UploadBufferParams) {
    const validParams = UploadBufferParamsSchema.parse(params);
    const { content, fileName, targetDir = '', contentType = 'application/octet-stream', encoding } = validParams;
    
    try {
      // 构建COS路径
      const cosPath = this.buildCosPath(fileName, targetDir);

      // 根据编码类型转换为Buffer
      const buffer = encoding ? Buffer.from(content, encoding) : Buffer.from(content);

      // 上传buffer内容
      const cosParams: COS.PutObjectParams = {
        Bucket: this.bucket,
        Region: this.region,
        Key: cosPath,
        Body: buffer,
        ContentType: contentType,
      };

      const result = await this.cos.putObject(cosParams);

      return {
        isSuccess: true,
        message: '上传成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '上传失败',
        data: error,
      };
    }
  }
  

  //   /**
  //  * 上传文件到COS
  //  * @param params 上传参数
  //  * @returns 上传结果
  //  */
  async uploadFileSourceUrl(params: UploadFileParams) {
    // 验证并解析参数
    const validParams = UploadFileParamsSchema.parse(params);
    const { targetDir = '', fileName, sourceUrl } = validParams;
    try {
      const response = await axios({
        method: 'get',
        url: sourceUrl,
        responseType: 'stream'
      });
      const actualFileName = fileName ? fileName : generateOutPutFileId('');
      const cosPath = this.buildCosPath(actualFileName, targetDir);
      const req = response.data;
      const passThrough = new PassThrough();
      const result = await this.cos.putObject({
        Bucket: this.bucket,
        Region:this.region,
        Key: cosPath,
        Body: req.pipe(passThrough),
      });
      return {
        isSuccess: true,
        message: '上传成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '上传失败',
        data: error,
      };
    }
  }

  async getObject(objectKey = '/') {
    try {
      // 下载文件
      const cosParams: COS.GetObjectParams = {
        Bucket: this.bucket,
        Region: this.region,
        Key: objectKey,
      };
      const result = await this.cos.getObject(cosParams);

      // 统一处理 buffer
      const buffer = Buffer.isBuffer(result.Body) ? result.Body : Buffer.from(result.Body ?? '');

      // 获取 Content-Type，统一小写
      let contentType = result.headers && (result.headers['content-type'] || result.headers['Content-Type']);
      contentType = typeof contentType === 'string' ? contentType.toLowerCase() : '';

      let mcpData;
      if (contentType.startsWith('image/')) {
        mcpData = { type: 'image', data: buffer.toString('base64'), mimeType: contentType };
      } else if (contentType.startsWith('audio/')) {
        mcpData = { type: 'audio', data: buffer.toString('base64'), mimeType: contentType };
      } else if (contentType.startsWith('text/') || TEXT_TYPES.includes(contentType)) {
        mcpData = { type: 'text', text: buffer.toString('utf-8') };
      } else {
        mcpData = { type: 'text', text: buffer.toString('base64') };
      }
      
      return {
        isSuccess: true,
        message: '下载文件成功',
        data: mcpData,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '下载文件失败',
        data: error instanceof Error ? error.message : error,
      };
    }
  }

  // 获取文件列表
  async getBucket(Prefix = '') {
    try {
      const result = await this.cos.getBucket({
        Bucket: this.bucket,
        Region: this.region,
        Prefix,
        Delimiter: '',
      });
      return {
        isSuccess: true,
        message: '获取列表成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '获取列表失败',
        data: error,
      };
    }
  }

  //获取带签名的objecturl
  async getObjectUrl(ObjectKey: string) {
    try {
      const result = await new Promise((resolve, reject) => {
        this.cos.getObjectUrl(
          {
            Bucket: this.bucket,
            Region: this.region,
            Key: ObjectKey,
          },
          (error, data) => (error ? reject(error) : resolve(data)),
        );
      });

      return {
        isSuccess: true,
        message: '获取带签名 ObjectUrl 成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '获取带签名 ObjectUrl 失败',
        data: error,
      };
    }
  }
}
