import { motion } from 'framer-motion';
import type { Easing } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ShieldAlert, Bot, ArrowRight, ShieldCheck, Mail, Lock, Shield } from 'lucide-react';

const EASE: Easing = 'easeOut';
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: EASE },
});

const features = [
  {
    icon: FileText,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    title: 'Automated Leave Management',
    description: 'Quickly draft and submit formal leave requests. The system automatically processes details and prepares communications for managerial approval.',
  },
  {
    icon: ShieldAlert,
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    title: 'Secure Complaint Filing',
    description: 'Report workplace issues through a secure, guided conversational interface, ensuring all documentation is accurately captured.',
  },
  {
    icon: Bot,
    color: 'text-primary',
    bg: 'bg-primary/10',
    title: 'Intelligent AI Retrieval',
    description: 'Powered by an advanced multi-agent system, the assistant instantly retrieves exact company policies to answer your questions in real-time.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Nav */}
      <header className="h-14 px-6 md:px-10 flex items-center justify-between border-b border-border bg-card sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">Apex HR</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block">Privacy</Link>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            Sign in <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 py-24 text-center">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6 border border-primary/20">
              <Bot className="w-3.5 h-3.5" />
              Enterprise-grade HR Solution
            </div>
          </motion.div>

          <motion.h1 {...fadeUp(0.1)} className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-5">
            Apex HR
          </motion.h1>

          <motion.p {...fadeUp(0.15)} className="text-xl md:text-2xl font-medium text-muted-foreground mb-4 max-w-2xl mx-auto">
            Enterprise-grade AI for seamless HR operations.
          </motion.p>

          <motion.p {...fadeUp(0.2)} className="text-base text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Streamline your workflow with intelligent, automated HR management. Handle leave requests, file secure complaints, and navigate company policies through an advanced multi-agent interface.
          </motion.p>

          <motion.div {...fadeUp(0.25)} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary px-8 py-3 text-base"
            >
              Get started <ArrowRight className="w-5 h-5" />
            </button>
            <Link to="/privacy" className="btn-ghost px-8 py-3 text-base">
              Learn more
            </Link>
          </motion.div>
        </section>

        {/* Features */}
        <section className="py-20 px-6 bg-card border-y border-border">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-foreground mb-3">Core Features</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Designed to simplify and accelerate your daily HR interactions.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="card p-6 hover:shadow-card-md transition-shadow"
                >
                  <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="card p-10 md:p-14"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Seamless &amp; Secure Integration</h2>
              </div>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                To provide these automated HR services, Apex HR requires secure access to your Google Account.
              </p>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {[
                  { icon: Lock, title: 'Authentication', desc: 'We use Google OAuth to securely verify your identity without storing separate passwords.' },
                  { icon: Mail, title: 'Email Automation', desc: 'With your explicit permission, the assistant uses your Gmail strictly to send drafted HR communications on your behalf.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-secondary border border-border">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Note:</strong> Your data is never used for marketing. Our architecture strictly adheres to Google's API Services User Data Policy, including Limited Use requirements.
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white">
              <Shield className="w-3 h-3" />
            </div>
            <span className="text-sm font-semibold text-foreground">Apex HR</span>
            <span className="text-xs text-muted-foreground ml-1">by Mohamed Atheeq</span>
          </div>
          <div className="flex gap-5 text-sm text-muted-foreground">
            <a href="mailto:mohamedatheeq0@gmail.com" className="hover:text-foreground transition-colors">Support</a>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Apex HR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
