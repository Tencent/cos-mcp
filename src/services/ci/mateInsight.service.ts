import COS from 'cos-nodejs-sdk-v5';
import { z } from 'zod';

export const ImageSearchPicParamsSchema = z.object({
  uri: z.string(),
});
export type ImageSearchPicParams = z.infer<typeof ImageSearchPicParamsSchema>;

export const ImageSearchTextParamsSchema = z.object({
  text: z.string(),
});
export type ImageSearchTextParams = z.infer<typeof ImageSearchTextParamsSchema>;

export class CIMateInsightService {
  bucket: string;
  region: string;
  cos: COS;
  datasetName: string;
  constructor(bucket: string, region: string, datasetName: string, cos: COS) {
    this.bucket = bucket;
    this.region = region;
    this.datasetName = datasetName;
    this.cos = cos;
  }

  async imageSearchPic(params: ImageSearchPicParams) {
    // 验证并解析参数
    const validParams = ImageSearchPicParamsSchema.parse(params);
    const { uri } = validParams;

    try {
      const key = 'datasetquery/imagesearch'; // 固定值
      const appid = this.bucket.split('-').pop();
      const host = `${appid}.ci.${this.region}.myqcloud.com`;
      const url = `https://${host}/${key}`;
      const body = JSON.stringify({
        DatasetName: this.datasetName,
        Mode: 'pic',
        URI: uri,
      });

      const result = await this.cos.request({
        Method: 'POST', // 固定值，必须
        Key: key, // 必须
        Url: url, // 请求的url，必须
        Body: body, // 请求体参数，必须
        Headers: {
          // 设置请求体为 json，固定值，必须
          'Content-Type': 'application/json',
          // 设置响应体为json，固定值，必须
          Accept: 'application/json',
        },
      });

      return {
        success: true,
        message: '图像检索成功',
        // data: result.Body.toString()
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '图像检索失败',
        data: error,
      };
    }
  }

  async imageSearchText(params: ImageSearchTextParams) {
    // 验证并解析参数
    const validParams = ImageSearchTextParamsSchema.parse(params);
    const { text } = validParams;

    try {
      const key = 'datasetquery/imagesearch'; // 固定值
      const appid = this.bucket.split('-').pop();

      const host = `${appid}.ci.${this.region}.myqcloud.com`;
      const url = `https://${host}/${key}`;
      const body = JSON.stringify({
        DatasetName: this.datasetName,
        Mode: 'text',
        Text: text,
      });

      const result = await this.cos.request({
        Method: 'POST', // 固定值，必须
        Key: key, // 必须
        Url: url, // 请求的url，必须
        Body: body, // 请求体参数，必须
        Headers: {
          // 设置请求体为 json，固定值，必须
          'Content-Type': 'application/json',
          // 设置响应体为json，固定值，必须
          Accept: 'application/json',
        },
      });

      return {
        isSuccess: true,
        message: '图像检索成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '请求异常: ${error.message}',
        data: error,
      };
    }
  }
}
