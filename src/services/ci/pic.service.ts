import COS from 'cos-nodejs-sdk-v5';
import { z } from 'zod';
import { generateOutPutFileId } from '../utils.js';

export const WaterMarkFontParamsSchema = z.object({
  objectKey: z.string(),
  text: z.string(),
});
export type WaterMarkFontParams = z.infer<typeof WaterMarkFontParamsSchema>;

export class CIPicService {
  bucket: string;
  region: string;
  cos: COS;
  constructor(bucket: string, region: string, cos: COS) {
    this.bucket = bucket;
    this.region = region;
    this.cos = cos;
  }

  // 图片信息
  async imageInfo(objectKey: string) {
    try {
      const result = await this.cos.request({
        Bucket: this.bucket,
        Region: this.region,
        Method: 'GET',
        Key: objectKey,
        Action: 'imageInfo',
        RawBody: false,
      });
      return {
        isSuccess: true,
        message: '获取图片信息成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '获取图片信息失败',
        data: error,
      };
    }
  }

  async waterMarkFont(params: WaterMarkFontParams) {
    // 验证并解析参数
    const validParams = WaterMarkFontParamsSchema.parse(params);
    const { objectKey, text } = validParams;
    const encodedText = Buffer.from(text)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    try {
      const imageProcessParams = [
        'watermark/2', // 水印类型2表示文字水印
        `text/${encodedText}`, // 使用动态文本
        'scatype/3',
        'spcent/20',
      ].join('/');

      const outPutFileid = generateOutPutFileId(objectKey);

      const result = await new Promise((resolve, reject) => {
        this.cos.request(
          {
            Bucket: this.bucket, // 存储桶，必须字段
            Region: this.region, // 存储桶所在地域，必须字段 如 ap-beijing
            Key: objectKey, // 对象文件名，例如：folder/document.jpg。
            Method: 'POST', // 固定值
            Action: 'image_process', // 固定值
            Headers: {
              'Pic-Operations': JSON.stringify({
                rules: [{ fileid: outPutFileid, rule: imageProcessParams }],
              }),
            },
          },
          function (error, data) {
            if (error) {
              // 处理请求失败
              reject(error);
            } else {
              // 处理请求成功
              resolve(data);
            }
          },
        );
      });
      return {
        isSuccess: true,
        message: '添加水印成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '添加水印失败',
        data: error,
      };
    }
  }
}
