import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
    Cpu, Database, Server, Network, Workflow, BrainCircuit, Sparkles, ArrowRight,
    Table, Cloud, BarChart3, Binary, HardDrive, Share2, Box,
    Terminal, Activity, Infinity as InfinityIcon, Zap, ShieldCheck,
    Component, Microscope, Settings, Target, Rocket
} from 'lucide-react';

const DataPacket = ({ delay, duration, path }: { delay: number; duration: number; path: { x: number[]; y: number[] } }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5],
            x: path.x,
            y: path.y
        }}
        transition={{
            duration: duration,
            repeat: Infinity,
            delay: delay,
            ease: "linear"
        }}
        className="absolute w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
    />
);

const ConnectionLine = ({ top, left, width, rotate, delay }: { top: string; left: string; width: string; rotate: string; delay: number }) => (
    <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 0.15, scaleX: 1 }}
        transition={{ delay, duration: 1.5 }}
        className="absolute h-[1px] bg-indigo-300 origin-left"
        style={{ top, left, width, transform: `rotate(${rotate})` }}
    />
);

const FloatingNode = ({ icon: Icon, delay, x, y, color, size = 32 }: { icon: any; delay: number; x: string; y: string; color: string; size?: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
            opacity: [0.3, 0.6, 0.3],
            y: [0, -20, 0],
            rotate: [0, 5, 0],
            scale: [0.8, 1, 0.8]
        }}
        transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: delay,
            ease: "easeInOut"
        }}
        className={`absolute ${color} z-0`}
        style={{ top: x, left: y }}
    >
        <div className="p-3 bg-white/60 backdrop-blur-xl rounded-2xl border border-indigo-100/50 shadow-xl shadow-indigo-100/20 hover:scale-110 transition-transform cursor-pointer group">
            <Icon size={size} className="group-hover:rotate-12 transition-transform" />
        </div>
    </motion.div>
);

const GalaxySpiral = ({ top, left, size, duration, color }: { top: string, left: string, size: number, duration: number, color: string }) => (
    <div
        className="absolute pointer-events-none overflow-visible"
        style={{ top, left, width: size, height: size }}
    >
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration, repeat: Infinity, ease: "linear" }}
            className={`w-full h-full relative opacity-10 ${color}`}
        >
            <div className="absolute inset-0 border-[20px] border-dashed border-current rounded-full blur-[2px]" />
            <div className="absolute inset-0 scale-[0.7] border-[40px] border-dotted border-current rounded-full blur-[4px]" />
            <div className="absolute inset-0 scale-[0.4] bg-current rounded-full blur-[60px]" />
        </motion.div>
    </div>
);

const OrbitIcon = ({ icon: Icon, radius, duration, delay, color }: { icon: any, radius: number, duration: number, delay: number, color: string }) => (
    <motion.div
        className={`absolute ${color} opacity-20`}
        animate={{
            rotate: 360
        }}
        transition={{
            duration,
            repeat: Infinity,
            delay,
            ease: "linear"
        }}
        style={{
            width: radius * 2,
            height: radius * 2,
            top: `calc(50% - ${radius}px)`,
            left: `calc(50% - ${radius}px)`,
        }}
    >
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '10px',
                borderRadius: '50%',
                background: 'white',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)'
            }}
        >
            <Icon size={18} />
        </div>
    </motion.div>
);

export default function Home() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "5%"]);

    return (
        <div ref={containerRef} className="relative min-h-screen bg-[#f8fafc] text-slate-900 overflow-hidden -m-10 p-10 select-none">
            {/* Rich Cosmic Data Processing Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Complex Light Gradient Background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05)_0%,rgba(248,250,252,1)_70%)]" />

                {/* Galactic Blur Orbs */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-20%] left-[-10%] w-[1200px] h-[1200px] bg-indigo-100/40 blur-[180px] rounded-full"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        rotate: [0, -60, 0]
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[1000px] h-[1000px] bg-sky-50/50 blur-[150px] rounded-full"
                />

                {/* Star Point Field */}
                <div className="absolute inset-0 opacity-[0.4]">
                    {[...Array(100)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute bg-indigo-400 rounded-full"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 2 + 1}px`,
                                height: `${Math.random() * 2 + 1}px`,
                                opacity: Math.random() * 0.5 + 0.2
                            }}
                        />
                    ))}
                </div>

                {/* Galaxy Spirals (Subtle Light Theme Style) */}
                <GalaxySpiral top="10%" left="5%" size={500} duration={60} color="text-indigo-200" />
                <GalaxySpiral top="60%" left="75%" size={600} duration={80} color="text-blue-100" />
                <GalaxySpiral top="40%" left="40%" size={400} duration={45} color="text-violet-100" />

                {/* Connection Mesh */}
                <ConnectionLine top="12%" left="5%" width="450px" rotate="12deg" delay={0.1} />
                <ConnectionLine top="35%" left="55%" width="500px" rotate="-15deg" delay={0.3} />
                <ConnectionLine top="75%" left="15%" width="650px" rotate="5deg" delay={0.5} />
                <ConnectionLine top="30%" left="25%" width="300px" rotate="115deg" delay={0.7} />
                <ConnectionLine top="55%" left="80%" width="400px" rotate="-40deg" delay={1.1} />

                {/* Data Packets */}
                {[...Array(18)].map((_, i) => (
                    <DataPacket
                        key={i}
                        delay={i * 1.3}
                        duration={Math.random() * 2 + 4}
                        path={{
                            x: [-100 + i * 100, 600 + i * 50, 1400],
                            y: [100 + i * 30, 400 - i * 20, 200 + i * 40]
                        }}
                    />
                ))}

                {/* Holographic Infrastructure Nodes */}
                <FloatingNode icon={Database} delay={0} x="10%" y="8%" color="text-indigo-600" size={36} />
                <FloatingNode icon={Table} delay={1.5} x="16%" y="18%" color="text-blue-500" size={24} />
                <FloatingNode icon={HardDrive} delay={3} x="5%" y="28%" color="text-slate-500" size={20} />
                <FloatingNode icon={Rocket} delay={0.8} x="28%" y="4%" color="text-indigo-400" size={22} />

                <FloatingNode icon={Server} delay={2} x="72%" y="90%" color="text-blue-600" size={36} />
                <FloatingNode icon={Cloud} delay={4.5} x="65%" y="82%" color="text-indigo-400" size={24} />
                <FloatingNode icon={Box} delay={1} x="85%" y="88%" color="text-sky-500" size={20} />
                <FloatingNode icon={ShieldCheck} delay={2.2} x="92%" y="75%" color="text-emerald-500" size={22} />

                <FloatingNode icon={BrainCircuit} delay={0.5} x="22%" y="88%" color="text-violet-600" size={40} />
                <FloatingNode icon={Binary} delay={2.5} x="32%" y="94%" color="text-indigo-500" size={22} />
                <FloatingNode icon={Sparkles} delay={5} x="12%" y="78%" color="text-amber-500" size={28} />
                <FloatingNode icon={Microscope} delay={1.8} x="4%" y="88%" color="text-rose-500" size={24} />

                <FloatingNode icon={Network} delay={1.2} x="88%" y="10%" color="text-sky-600" size={36} />
                <FloatingNode icon={Workflow} delay={3.2} x="78%" y="18%" color="text-violet-500" size={24} />
                <FloatingNode icon={Component} delay={5.2} x="82%" y="30%" color="text-indigo-500" size={20} />
                <FloatingNode icon={InfinityIcon} delay={0.4} x="68%" y="5%" color="text-blue-400" size={22} />

                <FloatingNode icon={BarChart3} delay={2} x="45%" y="10%" color="text-emerald-500" size={28} />
                <FloatingNode icon={Share2} delay={4} x="52%" y="92%" color="text-indigo-400" size={24} />
                <FloatingNode icon={Target} delay={1.5} x="58%" y="8%" color="text-slate-600" size={20} />
                <FloatingNode icon={Settings} delay={3.5} x="40%" y="92%" color="text-orange-500" size={24} />
            </div>

            {/* Main Content */}
            <motion.div
                style={{ y: contentY }}
                className="relative z-10 flex flex-col items-center pt-12 pb-32"
            >
                {/* Cinematic Title System */}
                <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] pointer-events-none hidden lg:block">
                    <OrbitIcon icon={Activity} radius={420} duration={50} delay={2} color="text-indigo-300" />
                    <OrbitIcon icon={Terminal} radius={320} duration={35} delay={0} color="text-blue-300" />
                    <OrbitIcon icon={Zap} radius={380} duration={40} delay={7} color="text-sky-300" />
                </div>

                <div className="text-center space-y-12 max-w-7xl px-4 relative">
                    {/* Floating Brand Label */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-4 px-8 py-3 rounded-2xl bg-white/80 shadow-2xl shadow-indigo-100/50 border border-indigo-100 backdrop-blur-md group mb-6"
                    >
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30">
                            <BrainCircuit className="text-white" size={20} />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                            <span className="text-slate-900 text-[14px] font-black tracking-widest uppercase">
                                DataUniverse Engine
                            </span>
                            <span className="text-indigo-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">
                                Next Gen Data Processing Engine
                            </span>
                        </div>
                    </motion.div>

                    <h1 className="text-6xl md:text-[7rem] font-black tracking-tighter leading-[0.8] text-slate-900">
                        DATA<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-indigo-400 to-indigo-700 animate-gradient-half drop-shadow-sm">
                            UNIVERSE
                        </span>
                    </h1>

                    <div className="flex flex-col items-center gap-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-2xl md:text-3xl font-black text-indigo-600 flex items-center gap-6 bg-white/40 px-10 py-5 rounded-[2.5rem] border border-white/60 shadow-xl shadow-indigo-50 backdrop-blur-xl relative group overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            <Sparkles className="text-indigo-400 animate-pulse" />
                            <span>High Precision Data Engineering</span>
                            <Sparkles className="text-indigo-400 animate-pulse" />
                        </motion.div>

                        <div className="space-y-6 max-w-4xl">
                            <p className="text-2xl md:text-3xl text-slate-600 leading-tight font-black">
                                Command the Gravitational Pull of Your Data Stack.
                            </p>
                            <p className="text-xl text-slate-500 font-medium leading-relaxed">
                                DataUniverse represents the culmination of advanced ETL logic and Big Data orchestration.
                                We provide the industrial-strength platform needed to transform disparate silos into a high-governance Processing Universe.
                                Scale your pipelines with the power of modern AI and distributed compute engines.
                            </p>
                        </div>
                    </div>

                    <div className="pt-10 flex flex-wrap justify-center gap-8">
                        <motion.button
                            whileHover={{ scale: 1.05, y: -4, boxShadow: "0 20px 40px rgba(79, 70, 229, 0.3)" }}
                            whileTap={{ scale: 0.95 }}
                            className="px-14 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center gap-4 group"
                        >
                            Explore Universe
                            <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform duration-300" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05, y: -4, backgroundColor: "#f1f5f9" }}
                            whileTap={{ scale: 0.95 }}
                            className="px-14 py-6 bg-white text-slate-900 border-2 border-slate-100 rounded-[2rem] font-black text-xl shadow-xl shadow-slate-200 transition-all"
                        >
                            Technical Specs
                        </motion.button>
                    </div>
                </div>

                {/* Industrial Capabilities Matrix */}
                <div className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl w-full px-4 mb-24">
                    {[
                        {
                            title: 'Hyper-ETL',
                            icon: Workflow,
                            color: 'text-indigo-600',
                            bg: 'bg-indigo-50/50',
                            desc: 'Multi-threaded extraction architecture designed for petabyte-scale throughput and sub-second latency.'
                        },
                        {
                            title: 'Compute Cluster',
                            icon: Cpu,
                            color: 'text-indigo-500',
                            bg: 'bg-sky-50/50',
                            desc: 'Orchestration for Spark, Dask, and Hadoop nodes. Real-time resource scaling and job optimization.'
                        },
                        {
                            title: 'AI Governance',
                            icon: BrainCircuit,
                            color: 'text-indigo-700',
                            bg: 'bg-violet-50/50',
                            desc: 'Neural-mapping algorithms that automatically resolve schema conflicts and enforce data quality.'
                        }
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15, duration: 0.6 }}
                            className="group bg-white/70 backdrop-blur-2xl p-12 rounded-[3.5rem] border border-white shadow-2xl hover:shadow-indigo-200 transition-all duration-700 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/50 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-indigo-100 transition-colors duration-700" />

                            <div className={`p-6 rounded-[2rem] ${item.bg} ${item.color} w-fit mb-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-xl shadow-indigo-100`}>
                                <item.icon size={42} />
                            </div>

                            <h3 className="text-3xl font-black text-slate-800 mb-6 tracking-tighter uppercase">{item.title}</h3>
                            <p className="text-slate-600 font-bold leading-relaxed text-lg">{item.desc}</p>

                            <div className="mt-10 flex items-center gap-3 text-indigo-600 font-black text-base group/btn cursor-pointer">
                                Open Services <ArrowRight size={20} className="group-hover/btn:translate-x-2 transition-transform" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes gradient-half {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                }
                .animate-gradient-half {
                    background-size: 200% 200%;
                    animation: gradient-half 4s ease infinite alternate;
                }
            `}} />
        </div>
    );
}
