import COS from 'cos-nodejs-sdk-v5';

export class CIMediaService {
  bucket: string;
  region: string;
  cos: COS;
  constructor(bucket: string, region: string, cos: COS) {
    this.bucket = bucket;
    this.region = region;
    this.cos = cos;
  }

  async createMediaSmartCoverJob(objectKey: string) {
    try {
      var host = this.bucket + '.ci.' + this.region + '.myqcloud.com/jobs';
      var url = 'https://' + host;

      const lastDotIndex = objectKey.lastIndexOf('.');
      const base =
        lastDotIndex === -1 ? objectKey : objectKey.substring(0, lastDotIndex);

      const outPutObject = `${base}_\${jobid}_\${number}`;
      var body = COS.util.json2xml({
        Request: {
          Tag: 'SmartCover',
          Input: {
            Object: objectKey, // 存在cos里的路径
          },

          Operation: {
            Output: {
              Bucket: this.bucket,
              Region: this.region,
              Object: outPutObject, // 转码后存到cos的路径
            },
            SmartCover: {
              Count: 1,
            },
          },
        },
      });

      const createResult = await new Promise((resolve, reject) => {
        this.cos.request(
          {
            Key: 'jobs',
            Method: 'POST', // 固定值
            Url: url,
            Body: body,
            ContentType: 'application/xml',
          },
          (error, data) => (error ? reject(error) : resolve(data)),
        );
      });
      try {
        const jobsDetail = (createResult as any).Response.JobsDetail;
        const initialCode = jobsDetail.Code;
        const initialState = jobsDetail.State;

        if (initialCode == 'Failed') {
          return {
            isSuccess: false,
            message: '智能封面任务失败',
            data: createResult,
          };
        }
        if (initialState == 'Success') {
          return {
            isSuccess: true,
            message: '智能封面任务成功',
            data: createResult,
          };
        } else {
          const jobId = jobsDetail.JobId;

          // 开始轮询
          let pollResult: any;
          const maxAttempts = 10;
          const interval = 4000;
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // 首次立即执行，后续等待间隔
            if (attempt > 0) await new Promise((r) => setTimeout(r, interval));
            try {
              // 查询任务状态
              const { data: getResult } = await this.describeMediaJob(jobId);
              const describeJobsDetail = (getResult as any).Response.JobsDetail;
              const describeJobCode = describeJobsDetail.Code;
              const describeJobState = describeJobsDetail.State;
              // 处理终态
              if (
                describeJobCode === 'Success' &&
                describeJobState == 'Success'
              ) {
                pollResult = getResult;
                break;
              } else if (describeJobCode === 'Failed') {
                return {
                  isSuccess: false,
                  message: '智能封面任务失败',
                  data: getResult,
                };
              }
            } catch (err) {
              // lastError = err as Error; // 记录错误继续重试
            }
          }

          if (!pollResult) {
            return {
              isSuccess: false,
              message: `轮询超时（${maxAttempts}次未完成）`,
              data: createResult,
            };
          }

          return {
            isSuccess: true,
            message: '智能封面任务成功',
            data: pollResult,
          };
        }
      } catch (error) {
        return {
          isSuccess: false,
          message: '智能封面任务失败',
          data: error,
        };
      }
    } catch (error) {
      return {
        isSuccess: false,
        message: '智能封面任务失败',
        data: error,
      };
    }
  }

  async describeMediaJob(jobId: string) {
    try {
      let host = this.bucket + '.ci.' + this.region + '.myqcloud.com';
      let url = 'https://' + host + '/doc_jobs/' + jobId;
      const result = await new Promise((resolve, reject) => {
        this.cos.request(
          {
            Bucket: this.bucket, // Bucket 格式：test-1250000000
            Region: this.region,
            Method: 'GET',
            Key: 'doc_jobs/' + jobId,
            Url: url,
          },
          function (error, data) {
            if (error) {
              // 处理请求失败
              reject(error);
            } else {
              // 处理请求成功
              resolve(data);
              //获取返回的jobid， 去调查询任务接口， 返回具体信息
            }
          },
        );
      });

      return {
        isSuccess: true,
        message: '智能封面任务查询成功',
        data: result,
      };
    } catch (error) {
      return {
        isSuccess: false,
        message: '智能封面任务查询失败',
        data: error,
      };
    }
  }
}
