const { KunlunFramework } = require('./dist/core/KunlunFramework');

async function main() {
  console.log('=== 昆仑框架启动测试 ===');
  
  try {
    const framework = new KunlunFramework({
      name: 'test-instance',
      version: '1.0.0'
    });
    
    console.log('✅ KunlunFramework 实例化成功');
    
    // 测试初始化
    if (typeof framework.initialize === 'function') {
      await framework.initialize();
      console.log('✅ initialize() 方法存在');
    }
    
    // 测试启动
    if (typeof framework.start === 'function') {
      console.log('✅ start() 方法存在');
    }
    
    // 测试停止
    if (typeof framework.stop === 'function') {
      console.log('✅ stop() 方法存在');
    }
    
    console.log('\n=== 测试通过 ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

main();
