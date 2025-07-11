export default {
    preset: 'ts-jest', // 使用 ts-jest 预设，支持 TypeScript 测试
    testEnvironment: 'node', // 指定测试运行的环境为 Node.js
    testMatch: ['**/__tests__/**/*.test.ts'], // 匹配测试文件的路径和文件名模式
};
