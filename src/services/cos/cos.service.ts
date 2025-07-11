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

export class CosService {
  bucket: string;
  region: string;
  cos: COS;
  constructor(bucket: string, region: string, cos: COS) {
    this.bucket = bucket;
    this.region = region;
    this.cos = cos;
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

      // 构建COS路径，确保正斜杠格式
      let cosPath = actualFileName;
      if (targetDir) {
        // 规范化目标目录：移除头尾斜杠，然后加上结尾斜杠
        const normalizedDir = targetDir.replace(/^\/+|\/+$/g, '');
        cosPath = normalizedDir
          ? `${normalizedDir}/${actualFileName}`
          : actualFileName;
      }

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
      let cosPath = actualFileName;
      if (targetDir) {
        // 规范化目标目录：移除头尾斜杠，然后加上结尾斜杠
        const normalizedDir = targetDir.replace(/^\/+|\/+$/g, '');
        cosPath = normalizedDir
          ? `${normalizedDir}/${actualFileName}`
          : actualFileName;
      }
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
