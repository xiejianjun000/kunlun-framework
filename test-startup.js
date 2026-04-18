const { KunlunFramework } = require('./dist/core/KunlunFramework');

async function test() {
  console.log('=== 昆仑框架启动测试 ===\n');
  
  try {
    const framework = new KunlunFramework();
    console.log('✅ KunlunFramework 实例化成功');
    
    await framework.initialize();
    console.log('✅ initialize() 完成');
    
    console.log('\n=== 测试通过 ===');
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
}

test();
