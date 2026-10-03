import { useState } from 'react';
import Button from '../Elements/Button';
import Input from '../Forms/Input';
import RadioGroup from '../Forms/RadioGroup';
import Textarea from '../Forms/Textarea';

export default function Checkout({
    onSubmit,
    isSubmitting = false,
    className = '',
}) {
    const [paymentMethod, setPaymentMethod] = useState('qris');

    return (
        <form onSubmit={onSubmit} className={`space-y-8 ${className}`}>
            {/* Shipping Address */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Alamat Pengiriman Kontingen / Pribadi
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Nama Penerima" required placeholder="Sensei / Manajer Kontingen..." />
                    <Input type="tel" label="Nomor WhatsApp" required placeholder="08123456789" />
                </div>

                <Textarea
                    label="Alamat Lengkap & Kota / Kabupaten"
                    rows={3}
                    required
                    placeholder="Nama jalan, nomor gedung/dojo, RT/RW, Kecamatan, Kota, Kode Pos..."
                />
            </div>

            {/* Payment Method */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Metode Pembayaran
                </h3>

                <RadioGroup
                    name="payment"
                    variant="cards"
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    options={[
                        { value: 'qris', label: 'QRIS Instant', description: 'Scan dari seluruh e-wallet & m-banking' },
                        { value: 'va', label: 'Virtual Account', description: 'BCA, Mandiri, BNI, BRI' },
                        { value: 'transfer', label: 'Transfer Manual', description: 'Konfirmasi bukti transfer admin' },
                    ]}
                />
            </div>

            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full shadow-lg shadow-red-600/20">
                {isSubmitting ? 'Memproses Pesanan...' : 'Bayar Sekarang & Konfirmasi'}
            </Button>
        </form>
    );
}
