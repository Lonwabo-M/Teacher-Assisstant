import React, { useRef, useEffect, useState } from 'react';
import { CheckIcon } from './icons/CheckIcon';
import { LightningIcon } from './icons/LightningIcon';
import { TargetIcon } from './icons/TargetIcon';
import { EditIcon } from './icons/EditIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { PresentationIcon } from './icons/PresentationIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import LatexRenderer from './LatexRenderer';


interface HomePageProps {
    onStartCreating: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onStartCreating }) => {
    const navLinks = [
        { name: 'Features', href: '#features' },
        { name: 'How It Works', href: '#how-it-works' },
    ];
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // State for animations
    const [lessonPlanTitle, setLessonPlanTitle] = useState('');
    const [lessonPlanLine1, setLessonPlanLine1] = useState('');
    const [lessonPlanLine2, setLessonPlanLine2] = useState('');
    const [lessonPlanProgress, setLessonPlanProgress] = useState(0);

    const [slideTitle, setSlideTitle] = useState('');
    const [slideLine1, setSlideLine1] = useState('');
    const [slideLine2, setSlideLine2] = useState('');
    const [slideLine3, setSlideLine3] = useState('');

    const [worksheetTitle, setWorksheetTitle] = useState('');
    const [worksheetLine1, setWorksheetLine1] = useState('');
    const [worksheetBoxHeight, setWorksheetBoxHeight] = useState(0);

    const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      event.preventDefault();
      const id = href.substring(1); // remove '#'
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    useEffect(() => {
        // FIX: Replaced `NodeJS.Timeout` with `number` for browser compatibility. `setTimeout` and `setInterval` in a browser environment return a numeric ID.
        const timeoutIds: number[] = [];
        const intervalIds: number[] = [];

        const typeWriter = (setter: React.Dispatch<React.SetStateAction<string>>, text: string, speed: number) => {
            let i = 0;
            const interval = setInterval(() => {
                if (i < text.length) {
                    setter(text.substring(0, i + 1));
                    i++;
                } else {
                    clearInterval(interval);
                }
            }, speed);
            intervalIds.push(interval);
        };
        
        // Reset state on mount
        setLessonPlanTitle(''); setLessonPlanLine1(''); setLessonPlanLine2(''); setLessonPlanProgress(0);
        setSlideTitle(''); setSlideLine1(''); setSlideLine2(''); setSlideLine3('');
        setWorksheetTitle(''); setWorksheetLine1(''); setWorksheetBoxHeight(0);

        // Animation for Card 1 (Lesson Plan)
        timeoutIds.push(setTimeout(() => typeWriter(setLessonPlanTitle, 'Lesson Plan', 50), 500));
        timeoutIds.push(setTimeout(() => typeWriter(setLessonPlanLine1, '1. Introduction (10 mins)', 40), 1000));
        timeoutIds.push(setTimeout(() => typeWriter(setLessonPlanLine2, '- Hook: Real-world example...', 40), 2000));
        timeoutIds.push(setTimeout(() => {
            const interval = setInterval(() => {
                setLessonPlanProgress(prev => {
                    if (prev >= 20) {
                        clearInterval(interval);
                        return 20;
                    }
                    return prev + 1;
                });
            }, 20);
            intervalIds.push(interval);
        }, 2800));

        // Animation for Card 2 (Slides)
        timeoutIds.push(setTimeout(() => typeWriter(setSlideTitle, 'Presentation Slide', 50), 1200));
        timeoutIds.push(setTimeout(() => typeWriter(setSlideLine1, "Newton's Second Law", 50), 2000));
        timeoutIds.push(setTimeout(() => typeWriter(setSlideLine2, 'Force equals mass times acceleration', 40), 2800));
        timeoutIds.push(setTimeout(() => setSlideLine3('\\(F = ma\\)'), 4200));

        // Animation for Card 3 (Worksheet)
        timeoutIds.push(setTimeout(() => typeWriter(setWorksheetTitle, 'Worksheet', 50), 1800));
        timeoutIds.push(setTimeout(() => typeWriter(setWorksheetLine1, 'Q1. Calculate the force...', 40), 2600));
        timeoutIds.push(setTimeout(() => {
            const interval = setInterval(() => {
                setWorksheetBoxHeight(prev => {
                    if (prev >= 32) { // h-8 is 2rem = 32px
                        clearInterval(interval);
                        return 32;
                    }
                    return prev + 2;
                });
            }, 20);
            intervalIds.push(interval);
        }, 3400));
        
        // Background canvas animation
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: Particle[];
        const particleCount = window.innerWidth > 768 ? 80 : 40;

        const setCanvasSize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.offsetWidth;
                canvas.height = parent.offsetHeight;
            }
        };

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;

            constructor(x: number, y: number, speedX: number, speedY: number) {
                this.x = x;
                this.y = y;
                this.size = Math.random() * 1.5 + 1;
                this.speedX = speedX;
                this.speedY = speedY;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > canvas.width + 10 || this.x < -10) this.speedX *= -1;
                if (this.y > canvas.height + 10 || this.y < -10) this.speedY *= -1;
            }

            draw() {
                ctx!.fillStyle = 'rgba(148, 163, 184, 0.6)'; // slate-400 with opacity
                ctx!.beginPath();
                ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx!.fill();
            }
        }

        const init = () => {
            setCanvasSize();
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const speedX = (Math.random() - 0.5) * 0.3;
                const speedY = (Math.random() - 0.5) * 0.3;
                particles.push(new Particle(x, y, speedX, speedY));
            }
        };

        const connect = () => {
            let opacityValue = 1;
            const connectDistance = Math.min(canvas.width, canvas.height) / 5;
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const distance = Math.sqrt(
                        Math.pow(particles[a].x - particles[b].x, 2) +
                        Math.pow(particles[a].y - particles[b].y, 2)
                    );

                    if (distance < connectDistance) {
                        opacityValue = 1 - (distance / connectDistance);
                        ctx!.strokeStyle = `rgba(186, 230, 253, ${opacityValue})`; // sky-200 with opacity
                        ctx!.lineWidth = 1;
                        ctx!.beginPath();
                        ctx!.moveTo(particles[a].x, particles[a].y);
                        ctx!.lineTo(particles[b].x, particles[b].y);
                        ctx!.stroke();
                    }
                }
            }
        };
        
        let animationFrameId: number;
        const animate = () => {
            ctx!.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            connect();
            animationFrameId = requestAnimationFrame(animate);
        };

        init();
        animate();

        const handleResize = () => {
            init();
        };

        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            timeoutIds.forEach(clearTimeout);
            intervalIds.forEach(clearInterval);
        };

    }, []);


    return (
        <div className="bg-white text-slate-800 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/80">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <a href="#" className="flex items-center" aria-label="LessonLab Homepage">
                         <svg aria-label="LessonLab Logo" role="img" viewBox="0 0 185 32" className="h-8 w-auto">
                            <g fill="#0000FF">
                                <circle cx="8" cy="8" r="6" />
                                <circle cx="26" cy="24" r="8" />
                            </g>
                            <text
                                x="42"
                                y="25"
                                fontFamily="sans-serif"
                                fontSize="24"
                                fontWeight="500"
                                fill="black"
                            >
                                LessonLab
                            </text>
                        </svg>
                    </a>
                    <nav className="hidden md:flex items-center space-x-8">
                        {navLinks.map(link => (
                            <a 
                                key={link.name} 
                                href={link.href} 
                                onClick={(e) => handleNavClick(e, link.href)}
                                className="text-slate-600 hover:text-sky-600 font-medium transition-colors"
                            >
                                {link.name}
                            </a>
                        ))}
                    </nav>
                    <button onClick={onStartCreating} className="hidden md:inline-block bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-sky-700 transition-colors shadow-sm hover:shadow-md">
                        Start Creating
                    </button>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 bg-slate-50">
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="text-center lg:text-left">
                                <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight tracking-tighter">
                                    Your AI Co-pilot for the Classroom
                                </h1>
                                <p className="mt-6 text-lg text-slate-600 max-w-xl mx-auto lg:mx-0">
                                    From curriculum goals to ready-to-teach materials in minutes. Generate complete lesson plans, slides, worksheets, and exam papers with ease.
                                </p>
                                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                    <button onClick={onStartCreating} className="inline-flex items-center justify-center bg-sky-600 text-white font-bold px-8 py-4 rounded-lg shadow-lg hover:bg-sky-700 transition-all duration-300 transform hover:scale-105">
                                        Get Started For Free
                                    </button>
                                </div>
                                <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-slate-500 text-sm">
                                    <span className="flex items-center"><CheckIcon className="h-4 w-4 mr-1.5 text-green-500" /> CAPS Aligned</span>
                                    <span className="flex items-center"><CheckIcon className="h-4 w-4 mr-1.5 text-green-500" /> Export to PDF & Word</span>
                                    <span className="flex items-center"><CheckIcon className="h-4 w-4 mr-1.5 text-green-500" /> Save Hours Weekly</span>
                                </div>
                            </div>
                            
                            {/* Product Showcase Tile */}
                            <div className="relative h-96 lg:h-auto lg:aspect-[4/3]">
                                <div className="absolute w-full h-full flex items-center justify-center">
                                    {/* Card 1: Lesson Plan */}
                                    <div className="absolute w-[80%] max-w-sm bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-slate-200/80 transform rotate-[-6deg] transition-transform duration-300 hover:rotate-[-8deg] hover:scale-105">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center bg-teal-100 text-teal-600 rounded-md"><BookOpenIcon/></div>
                                            <h4 className="font-bold text-slate-800 min-h-[24px]">{lessonPlanTitle}</h4>
                                        </div>
                                        <p className="text-sm text-slate-600 font-semibold min-h-[20px]">{lessonPlanLine1 || <>&nbsp;</>}</p>
                                        <p className="text-xs text-slate-500 pl-4 min-h-[16px]">{lessonPlanLine2 || <>&nbsp;</>}</p>
                                        <div className="w-full h-1 bg-slate-200 rounded-full my-2">
                                            <div className="h-1 bg-teal-500 rounded-full transition-all" style={{width: `${lessonPlanProgress}%`}}></div>
                                        </div>
                                    </div>
                                    {/* Card 2: Slides */}
                                    <div className="absolute w-[85%] max-w-md bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-slate-200/80 transform rotate-[4deg] transition-transform duration-300 hover:rotate-[6deg] hover:scale-105 z-10">
                                         <div className="flex items-center gap-3 mb-3">
                                            <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-md"><PresentationIcon/></div>
                                            <h4 className="font-bold text-slate-800 min-h-[24px]">{slideTitle}</h4>
                                        </div>
                                        <h5 className="text-xl font-bold text-sky-700 min-h-[32px]">{slideLine1}</h5>
                                        <ul className="list-disc list-outside pl-5 text-sm text-slate-700 space-y-1 mt-2 min-h-[48px]">
                                            <li>{slideLine2 || <>&nbsp;</>}</li>
                                            <li>{slideLine3 ? <LatexRenderer as="span" content={slideLine3} /> : <>&nbsp;</>}</li>
                                        </ul>
                                    </div>
                                    {/* Card 3: Worksheet */}
                                    <div className="absolute w-[75%] max-w-xs bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-slate-200/80 transform translate-y-24 rotate-[10deg] transition-transform duration-300 hover:rotate-[12deg] hover:scale-105">
                                         <div className="flex items-center gap-3 mb-3">
                                            <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center bg-amber-100 text-amber-600 rounded-md"><ClipboardListIcon/></div>
                                            <h4 className="font-bold text-slate-800 min-h-[24px]">{worksheetTitle}</h4>
                                        </div>
                                        <p className="text-sm text-slate-600 font-semibold min-h-[20px]">{worksheetLine1 || <>&nbsp;</>}</p>
                                        <div className="mt-2 border border-dashed border-slate-300 rounded-md transition-all" style={{height: `${worksheetBoxHeight}px`}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section id="how-it-works" className="py-20 md:py-28 scroll-m-20">
                    <div className="container mx-auto px-6 text-center">
                        <span className="text-sky-600 font-semibold">How It Works</span>
                        <h2 className="text-4xl font-bold text-slate-900 mt-2">A new standard for lesson preparation</h2>
                        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">Generate professional educational content in three simple steps.</p>
                        <div className="mt-16 grid md:grid-cols-3 gap-8 text-left relative">
                            {/* Connecting Line */}
                            <div className="absolute top-1/2 left-0 w-full h-px bg-slate-200 hidden md:block"></div>
                            
                            <div className="relative bg-white p-8 rounded-2xl border border-slate-200 shadow-sm z-10">
                                <div className="absolute -top-6 -left-6 bg-sky-500 text-white h-12 w-12 flex items-center justify-center rounded-full text-2xl font-bold border-4 border-white">1</div>
                                <div className="mb-4"><DocumentTextIcon className="h-10 w-10 text-sky-500"/></div>
                                <h3 className="text-xl font-bold text-slate-800">Provide Your Prompt</h3>
                                <p className="mt-2 text-slate-600">Input your curriculum goals, topics, or even upload existing documents to get started.</p>
                            </div>
                            <div className="relative bg-white p-8 rounded-2xl border border-slate-200 shadow-sm z-10">
                                <div className="absolute -top-6 -left-6 bg-sky-500 text-white h-12 w-12 flex items-center justify-center rounded-full text-2xl font-bold border-4 border-white">2</div>
                                <div className="mb-4"><LightningIcon /></div>
                                <h3 className="text-xl font-bold text-slate-800">Generate Instantly</h3>
                                <p className="mt-2 text-slate-600">Our AI crafts a complete, structured set of materials aligned with your needs.</p>
                            </div>
                            <div className="relative bg-white p-8 rounded-2xl border border-slate-200 shadow-sm z-10">
                                 <div className="absolute -top-6 -left-6 bg-sky-500 text-white h-12 w-12 flex items-center justify-center rounded-full text-2xl font-bold border-4 border-white">3</div>
                                <div className="mb-4"><DocumentIcon className="h-10 w-10 text-sky-500"/></div>
                                <h3 className="text-xl font-bold text-slate-800">Export and Teach</h3>
                                <p className="mt-2 text-slate-600">Review the content, make edits to diagrams, and download in your preferred format.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-20 md:py-28 bg-slate-900 text-white scroll-m-20">
                    <div className="container mx-auto px-6 text-center">
                        <span className="text-sky-400 font-semibold">Features</span>
                        <h2 className="text-4xl font-bold mt-2">A Complete Toolkit for Educators</h2>
                        <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">Everything you need to create engaging and effective learning experiences, faster.</p>
                        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-2 gap-8 text-left">
                            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
                                <div className="bg-blue-500/10 text-blue-400 h-12 w-12 flex items-center justify-center rounded-xl mb-6"><DocumentTextIcon /></div>
                                <h3 className="text-xl font-bold text-white">Comprehensive Lesson Packages</h3>
                                <p className="mt-2 text-slate-300">Generate a cohesive set of materials including lesson plans, presentation slides with speaker notes, and student worksheets.</p>
                            </div>
                            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
                                <div className="bg-green-500/10 text-green-400 h-12 w-12 flex items-center justify-center rounded-xl mb-6"><CheckCircleIcon /></div>
                                <h3 className="text-xl font-bold text-white">Exam Papers & Memos</h3>
                                <p className="mt-2 text-slate-300">Create CAPS-compliant exam papers with varied question types and a complete, detailed marking memorandum.</p>
                            </div>
                             <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
                                <div className="bg-purple-500/10 text-purple-400 h-12 w-12 flex items-center justify-center rounded-xl mb-6"><TargetIcon /></div>
                                <h3 className="text-xl font-bold text-white">Curriculum-Aware AI</h3>
                                <p className="mt-2 text-slate-300">Content is generated with a deep understanding of South African CAPS and Cambridge standards to ensure relevance.</p>
                            </div>
                             <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
                                <div className="bg-amber-500/10 text-amber-400 h-12 w-12 flex items-center justify-center rounded-xl mb-6"><EditIcon /></div>
                                <h3 className="text-xl font-bold text-white">Editable & Exportable</h3>
                                <p className="mt-2 text-slate-300">Fine-tune diagrams with our interactive editor and download materials as PDF or Word documents to fit your workflow.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="bg-white">
                    <div className="container mx-auto px-6 py-20 text-center">
                        <h2 className="text-4xl font-bold text-slate-900">Ready to revolutionize your prep time?</h2>
                        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">Join educators who are saving hours of preparation and creating more impactful lessons with LessonLab.</p>
                        <div className="mt-8">
                            <button onClick={onStartCreating} className="bg-slate-900 text-white font-bold px-8 py-4 rounded-lg hover:bg-slate-800 transition-colors transform hover:scale-105 shadow-lg">
                                Start Creating Now &rarr;
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default HomePage;