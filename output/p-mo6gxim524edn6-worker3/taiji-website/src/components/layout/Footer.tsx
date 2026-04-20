import { GitBranch, Mail, Heart } from 'lucide-react';
import { TaijiLogo } from '../icons/TaijiIcons';

const footerLinks = {
  product: [
    { name: '功能特性', href: '#features' },
    { name: '定价方案', href: '#pricing' },
    { name: '更新日志', href: '#changelog' },
    { name: '路线图', href: '#roadmap' },
  ],
  resources: [
    { name: '官方文档', href: '#docs' },
    { name: 'API参考', href: '#api' },
    { name: '示例项目', href: '#examples' },
    { name: '视频教程', href: '#tutorials' },
  ],
  community: [
    { name: 'GitHub', href: 'https://github.com' },
    { name: 'Discord', href: 'https://discord.com' },
    { name: '贡献指南', href: '#contributing' },
    { name: '行为准则', href: '#coc' },
  ],
  company: [
    { name: '关于我们', href: '#about' },
    { name: '博客', href: '#blog' },
    { name: '招贤纳士', href: '#careers' },
    { name: '联系我们', href: '#contact' },
  ],
};

export const Footer: React.FC = () => {
  return (
    <footer className="bg-taiji-yin text-white">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-3 mb-6">
              <TaijiLogo className="w-10 h-10" />
              <span className="text-xl font-bold text-white">Taiji</span>
            </a>
            <p className="text-white/60 mb-6 max-w-sm leading-relaxed">
              以道驭术，以简驭繁。构建企业级多智能体基础设施，
              让AI真正为企业创造价值。
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="mailto:hello@taiji.dev"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-bold text-white mb-4 uppercase text-sm tracking-wider">
                {category === 'product' && '产品'}
                {category === 'resources' && '资源'}
                {category === 'community' && '社区'}
                {category === 'company' && '公司'}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Taiji Framework. 保留所有权利。
          </p>
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <span>以</span>
            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
            <span>构建，开源永恒</span>
          </div>
          <div className="flex gap-6 text-sm text-white/40">
            <a href="#privacy" className="hover:text-white transition-colors">隐私政策</a>
            <a href="#terms" className="hover:text-white transition-colors">服务条款</a>
            <a href="#security" className="hover:text-white transition-colors">安全声明</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
