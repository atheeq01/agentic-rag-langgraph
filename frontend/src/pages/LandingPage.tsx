import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ShieldAlert, Bot, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';
import BackgroundBlobs from '@/components/3d/BackgroundBlobs';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FileText className="w-8 h-8 text-blue-500" />,
      title: 'Automated Leave Management',
      description: 'Quickly draft and submit formal leave requests. The system automatically processes the necessary details and prepares the communications required for managerial approval.'
    },
    {
      icon: <ShieldAlert className="w-8 h-8 text-rose-500" />,
      title: 'Secure Complaint Filing',
      description: 'Report workplace issues or HR complaints through a secure, guided conversational interface, ensuring all necessary documentation is accurately captured.'
    },
    {
      icon: <Bot className="w-8 h-8 text-emerald-500" />,
      title: 'Intelligent AI Retrieval',
      description: 'Powered by an advanced multi-agent system, the assistant instantly retrieves exact company policies and HR guidelines to answer your questions accurately and in real-time.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-[#E2E8F0]/50 to-[#93C5FD]/30 pointer-events-none z-0" />
      <BackgroundBlobs />

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col">
        
        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-5xl mx-auto min-h-[70vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/80 text-blue-800 text-sm font-semibold mb-6 shadow-sm border border-blue-200 backdrop-blur-sm">
              <Bot className="w-4 h-4" />
              <span>Enterprise-grade HR Solution</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 drop-shadow-sm">
              APEX AI ASSISTANT
            </h1>
            
            <h2 className="text-2xl md:text-3xl font-medium text-slate-700 mb-8 max-w-3xl mx-auto leading-relaxed">
              Enterprise-grade AI for seamless HR operations.
            </h2>
            
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Streamline your workflow with intelligent, automated HR management. Apex AI Assistant helps employees effortlessly handle leave requests, file secure complaints, and navigate company policies through an advanced multi-agent conversational interface.
            </p>
            
            <button 
              className="inline-flex items-center justify-center text-white text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-blue-600 hover:bg-blue-700 font-semibold"
              onClick={() => navigate('/login')}
            >
              Log In with Google <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 bg-white/60 backdrop-blur-md border-y border-slate-200">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h3 className="text-3xl font-bold text-slate-900">Core Features</h3>
              <p className="text-slate-600 mt-4 text-lg max-w-2xl mx-auto">Designed to simplify and accelerate your daily HR interactions.</p>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-10">
              {features.map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 shadow-inner">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h4>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Data Usage / Trust Section */}
        <section className="py-24 px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-slate-900 text-white rounded-3xl p-10 md:p-16 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <ShieldCheck className="w-10 h-10 text-blue-400" />
                <h3 className="text-3xl md:text-4xl font-bold">Seamless & Secure Integration</h3>
              </div>
              
              <p className="text-lg text-slate-300 mb-10 leading-relaxed">
                To provide these automated HR services, APEX AI ASSISTANT requires secure access to your Google Account.
              </p>

              <div className="grid md:grid-cols-2 gap-8 mb-10">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Lock className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">Authentication</h4>
                    <p className="text-slate-400">We use Google OAuth to securely verify your identity without storing separate passwords.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Mail className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">Email Automation</h4>
                    <p className="text-slate-400">With your explicit permission, the assistant utilizes your Gmail account strictly to send drafted HR communications—such as official leave requests and internal complaints—directly to the relevant departments on your behalf.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <p className="text-sm text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Note:</strong> Your data is never used for marketing, and our system architecture strictly adheres to Google's API Services User Data Policy, including the Limited Use requirements.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/80 backdrop-blur-md py-8 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-slate-900 font-semibold mb-1">APEX AI ASSISTANT</p>
            <p className="text-sm text-slate-500">Developed by Mohamed Atheeq</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            <a href="mailto:mohamedatheeq0@gmail.com" className="text-slate-600 hover:text-blue-600 transition-colors">
              Contact Support
            </a>
            <Link to="/privacy" className="text-slate-600 hover:text-blue-600 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-slate-600 hover:text-blue-600 transition-colors">
              Terms of Service
            </Link>
          </div>
          
          <div className="text-sm text-slate-500 text-center md:text-right">
            © 2026 APEX AI ASSISTANT.<br className="hidden md:block" /> All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
