import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, X, Github, BookOpen, Rocket } from 'lucide-react';
import { TaijiLogo } from '../icons/TaijiIcons';
import { TaijiButton } from '../ui/TaijiButton';

const navLinks = [
  { name: '首页', href: '#home' },
  { name: '特性', href: '#features' },
  { name: '文档', href: '#docs' },
  { name: '生态', href: '#ecosystem' },
  { name: '社区', href: '#community' },
];

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-lg shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3">
            <TaijiLogo className="w-10 h-10" />
            <span className="text-xl font-bold taiji-gradient-text">Taiji</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-taiji-ink/70 hover:text-taiji-primary transition-colors font-medium"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-taiji-ink/70 hover:text-taiji-primary transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <TaijiButton size="small" icon={<BookOpen className="w-4 h-4" />}>
              文档
            </TaijiButton>
            <TaijiButton size="small" variant="primary" icon={<Rocket className="w-4 h-4" />}>
              开始使用
            </TaijiButton>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-taiji-ink"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden bg-white/95 backdrop-blur-lg border-t border-taiji-primary/10"
        >
          <div className="container mx-auto px-6 py-6">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-lg text-taiji-ink/70 hover:text-taiji-primary py-2 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-taiji-primary/10">
                <TaijiButton size="medium" icon={<BookOpen className="w-4 h-4" />}>
                  查看文档
                </TaijiButton>
                <TaijiButton size="medium" variant="primary" icon={<Rocket className="w-4 h-4" />}>
                  开始使用
                </TaijiButton>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};
