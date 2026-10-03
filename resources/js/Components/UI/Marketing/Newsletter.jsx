import { useState } from 'react';
import Button from '../Elements/Button';
import Input from '../Forms/Input';

export default function Newsletter({
    title = 'Dapatkan Berita & Pengumuman Terbaru',
    description = 'Berlangganan buletin resmi untuk jadwal undian bagan, perubahan jadwal, dan hasil kejuaraan langsung ke email Anda.',
    buttonText = 'Berlangganan',
    onSubscribe,
    className = '',
}) {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (email && onSubscribe) {
            onSubscribe(email);
        }
        setIsSubmitted(true);
    };

    return (
        <section className={`py-12 ${className}`}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-[#c0392b]/15 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 text-center max-w-xl mx-auto">
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                            {title}
                        </h3>

                        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                            {description}
                        </p>

                        {isSubmitted ? (
                            <div className="mt-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold animate-in fade-in">
                                Terima kasih! Anda telah terdaftar untuk menerima pembaruan informasi kejuaraan.
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                                <Input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="Masukkan alamat email resmi..."
                                    containerClassName="flex-1"
                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                                />
                                <Button type="submit" className="shadow-md">
                                    {buttonText}
                                </Button>
                            </form>
                        )}

                        <p className="mt-4 text-[11px] text-slate-400">
                            Kami menghargai privasi data Anda dan tidak mengirimkan spam.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
