import { motion } from 'framer-motion';
import { GitBranch, Rocket, BookOpen } from 'lucide-react';
import { TaijiLogo } from '../icons/TaijiIcons';
import { TaijiButton } from '../ui/TaijiButton';

export const HeroSection: React.FC = () => {
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-taiji-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-80 h-80 bg-taiji-accent/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-taiji-primary/10 to-taiji-accent/10 rounded-full mb-6"
            >
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-taiji-ink/80">v2.0 正式发布 · 生产级可用</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-5xl lg:text-7xl font-bold mb-6 leading-tight"
            >
              <span className="taiji-gradient-text">太极 ·</span>
              <br />
              <span className="text-taiji-ink">企业级多智能体框架</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-xl text-taiji-ink/70 mb-10 leading-relaxed max-w-xl"
            >
              以道驭术，以简驭繁。WFGY防幻觉核心 + 八大卦象能力模块，
              构建千级规模智能体协同的企业级AI基础设施。
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-wrap gap-4 justify-center lg:justify-start"
            >
              <TaijiButton size="large" icon={<Rocket className="w-5 h-5" />}>
                快速开始
              </TaijiButton>
              <TaijiButton variant="outline" size="large" icon={<BookOpen className="w-5 h-5" />}>
                查看文档
              </TaijiButton>
              <TaijiButton variant="ghost" size="large" icon={<GitBranch className="w-5 h-5" />}>
                GitHub
              </TaijiButton>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-taiji-primary/10"
            >
              {[
                { value: '50K+', label: 'GitHub Stars' },
                { value: '99.9%', label: '生产可用性' },
                { value: '1000+', label: '企业部署' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold taiji-gradient-text">{stat.value}</div>
                  <div className="text-sm text-taiji-ink/60">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Content - 3D Taiji Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex justify-center items-center"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="relative"
              >
                <TaijiLogo className="w-80 h-80 lg:w-96 lg:h-96 drop-shadow-2xl" />
              </motion.div>
              
              {/* Glow Effect */}
              <motion.div
                className="absolute inset-0 -z-10"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-taiji-primary/30 to-taiji-accent/30 blur-3xl rounded-full scale-125" />
              </motion.div>

              {/* Orbiting Trigrams */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
                const angle = (index * 45) * (Math.PI / 180);
                const radius = 200;
                return (
                  <motion.div
                    key={index}
                    className="absolute w-12 h-12 text-taiji-primary/60"
                    style={{
                      left: `calc(50% + ${Math.cos(angle) * radius}px - 24px)`,
                      top: `calc(50% + ${Math.sin(angle) * radius}px - 24px)`,
                    }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 3, delay: index * 0.2, repeat: Infinity }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="4" width="20" height="2" rx="1" />
                      <rect x="2" y="8" width="20" height="2" rx="1" />
                      <rect x="2" y="12" width="20" height="2" rx="1" />
                    </svg>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
