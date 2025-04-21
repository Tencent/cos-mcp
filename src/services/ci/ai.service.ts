import COS from 'cos-nodejs-sdk-v5';
// import fs from 'fs';
import { generateOutPutFileId } from '../utils.js';
export class CIAIService {
  bucket: string;
  region: string;
  cos: COS;
  constructor(bucket: string, region: string, cos: COS) {
    this.bucket = bucket;
    this.region = region;
    this.cos = cos;
  }

  // 图片处理-图片超分-云上处理
  async aiSuperResolution(objectKey: string) {
    try {
      const result = await new Promise((resolve, reject) => {
        const outPutFileid = generateOutPutFileId(objectKey);
        this.cos.request(
          {
            Bucket: this.bucket, // 存储桶，必须字段
            Region: this.region, // 存储桶所在地域，必须字段 如 ap-beijing
            Key: objectKey, // 对象文件名，例如：folder/document.jpg。
            Method: 'POST', // 固定值
            Action: 'image_process', // 固定值
            Headers: {
              'Pic-Operations': JSON.stringify({
                rules: [
                  {
                    fileid: `${outPutFileid}`,
                    rule: 'ci-process=AISuperResolution',
                  },
                ],
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
        message: '图片超分成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '图片超分失败',
        data: error,
      };
    }
  }

  // 图片处理-图片质量评分
  async assessQuality(objectKey: string) {
    try {
      const result = await this.cos.request({
        Bucket: this.bucket,
        Region: this.region,
        Method: 'GET',
        Key: objectKey,
        Query: {
          'ci-process': 'AssessQuality',
        },
      });

      return {
        isSuccess: true,
        message: '图片处理成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '图片处理失败',
        data: error,
      };
    }
  }
  // 图片处理-抠图-云上处理
  async aiPicMatting(objectKey: string, width: string, height: string) {
    try {
      const result = await new Promise((resolve, reject) => {
        const outPutFileid = generateOutPutFileId(objectKey);
        this.cos.request(
          {
            Bucket: this.bucket, // 存储桶，必须字段
            Region: this.region, // 存储桶所在地域，必须字段 如 ap-beijing
            Key: objectKey, // 对象文件名，例如：folder/document.jpg。
            Method: 'POST', // 固定值
            Action: 'image_process', // 固定值
            Headers: {
              'Pic-Operations': JSON.stringify({
                rules: [
                  {
                    fileid: `${outPutFileid}`,
                    rule:
                      'ci-process=AIImageCrop&width=' +
                      width +
                      '&height=' +
                      height,
                  },
                ],
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

      // const localPath = "结果.png"; // 填写要写入的本地文件路径
      // if (result.Body) {
      //   fs.writeFileSync(localPath, result.Body); // 将图片内容保存本地路径
      // } else {
      //   throw new Error("Result body is undefined");
      // }
      // if (!result.Body) {
      //   throw new Error("Result body is undefined");
      // }
      // const base64Image = `data:image/jpeg;base64,${typeof result.Body === "string" ? Buffer.from(result.Body).toString("base64") : result.Body.toString("base64")}`;

      return {
        isSuccess: true,
        message: '图片处理成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '图片处理失败',
        data: error,
      };
    }
  }

  // 二维码识别-下载时识别
  async aiQrcode(objectKey: string) {
    try {
      const result = await new Promise((resolve, reject) => {
        this.cos.request(
          {
            Bucket: this.bucket, // 存储桶，必须字段
            Region: this.region, // 存储桶所在地域，必须字段 如 ap-beijing
            Method: 'GET',
            Key: objectKey,
            // Url: url,
            Query: {
              'ci-process': 'QRcode', // 数据万象处理能力，二维码识别固定为 QRcode,
              cover: 0,
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
        message: '二维码识别成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '二维码识别失败',
        data: error,
      };
    }
  }

  // 图片处理-二维码识别-上传时识别
  // async aiQrcode(filePath: string) {
  //   try {
  //     const result = await new Promise((resolve, reject) => {
  //       this.cos.putObject(
  //         {
  //           Bucket: this.bucket,
  //           Region: this.region,
  //           Key: "二维码.png", // 对象文件名，例如：folder/document.jpg
  //           Body: fs.createReadStream(filePath), // 上传文件对象，必填
  //           ContentLength: fs.statSync(filePath).size, // 上传文件对象大小，当上传Body为文件流且需要正确展示上传进度时必填
  //           Headers: {
  //             "Pic-Operations": JSON.stringify({
  //               is_pic_info: 1,
  //               rules: [{ fileid: generateCode(6), rule: "QRcode/cover/0" }],
  //             }),
  //           },
  //         },
  //         function (error, data) {
  //           if (error) {
  //             // 处理请求失败
  //             reject(error);
  //           } else {
  //             // 处理请求成功
  //             resolve(data);
  //           }
  //         }
  //       );
  //     });
  //     return {
  //       isSuccess: true,
  //       message: "二维码识别成功",
  //       data: result,
  //     };
  //   } catch (error) {
  //     return {
  //       isSuccess: false,
  //       message: "二维码识别失败",
  //       data: error,
  //     };
  //   }
  // }
}
