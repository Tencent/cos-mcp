import crypto from 'crypto';

export const generateOutPutFileId = (objectKey: string) => {
  const now = new Date();
  const formattedDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'), // 月份补零
    String(now.getDate()).padStart(2, '0'), // 日期补零
  ].join('');
  if (objectKey) {
    const lastDotIndex = objectKey.lastIndexOf('.');
    const base =
      lastDotIndex === -1 ? objectKey : objectKey.substring(0, lastDotIndex);
    const outPutFileid = `${formattedDate}_${base}_${generateCode()}`;
    return encodeURIComponent(outPutFileid);
  } else {
    const outPutFileid = `${formattedDate}_${generateCode()}`;
    return encodeURIComponent(outPutFileid);
  }
};

export const generateCode = (length = 6, useSecure = true) => {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZ' + // 大写字母（排除 I, O）
    'abcdefghjkmnpqrstuvwxyz' + // 小写字母（排除 i, l, o）
    '23456789'; // 数字（排除 0, 1）
  let code = '';

  if (useSecure) {
    // 使用加密安全的随机数
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      code += chars[randomBytes[i] % chars.length];
    }
  } else {
    // 使用普通随机数
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return code;
};
