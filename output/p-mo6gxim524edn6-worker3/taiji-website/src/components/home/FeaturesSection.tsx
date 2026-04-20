import { motion } from 'framer-motion';
import { 
  Shield, 
  Zap, 
  Users, 
  Lock, 
  BarChart3, 
  Puzzle,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { TaijiCard } from '../ui/TaijiCard';

const features = [
  {
    icon: Shield,
    title: 'WFGY 防幻觉引擎',
    description: '符号层验证 + 自洽性检查 + 溯源索引，三重保障确保输出100%可验证，从根源杜绝大模型幻觉。',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Zap,
    title: '千级智能体调度',
    description: '基于八卦分治算法的智能任务调度器，支持1000+智能体并发协同，毫秒级响应。',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Users,
    title: '多租户原生架构',
    description: '企业级多租户隔离，数据权限、计算资源、成本核算独立可控，支撑规模化部署。',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Lock,
    title: '内生安全体系',
    description: '心跳守护、任务账本、操作审计三位一体，全链路可追溯，满足金融级安全要求。',
    color: 'from-red-500 to-rose-500',
  },
  {
    icon: Puzzle,
    title: '八大卦象能力',
    description: '乾=连接·坤=记忆·震=执行·巽=工具·坎=推理·离=生成·艮=存储·兑=交互，全能力覆盖。',
    color: 'from-purple-500 to-violet-500',
  },
  {
    icon: Cpu,
    title: '国产大模型适配',
    description: '统一接口层支持通义千问、文心一言、腾讯混元、字节豆包、讯飞星火等主流国产模型。',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    icon: BarChart3,
    title: '全链路可观测',
    description: '指标采集、日志聚合、链路追踪、健康检查四位一体，系统状态实时可视化。',
    color: 'from-cyan-500 to-teal-500',
  },
  {
    icon: RefreshCw,
    title: '技能热加载',
    description: '自定义技能库支持运行时动态加载，无需重启系统即可扩展能力边界。',
    color: 'from-pink-500 to-rose-500',
  },
];

export const FeaturesSection: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <section className="py-24 relative" id="features">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="taiji-gradient-text">八卦定乾坤</span>
            <br />
            <span className="text-taiji-ink">八大核心能力</span>
          </h2>
          <p className="text-xl text-taiji-ink/60 max-w-2xl mx-auto">
            以周易八卦为设计哲学，每一卦对应一项核心能力，
            构建完整的企业级AI基础设施
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <TaijiCard className="h-full">
                <div className="flex flex-col h-full">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-5`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-xl font-bold text-taiji-ink mb-3">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-taiji-ink/60 leading-relaxed flex-grow">
                    {feature.description}
                  </p>
                </div>
              </TaijiCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
