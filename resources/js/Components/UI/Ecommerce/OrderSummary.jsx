import { useState } from 'react';
import Button from '../Elements/Button';
import Input from '../Forms/Input';

export default function OrderSummary({
    subtotal = 'Rp 650.000',
    shipping = 'Rp 25.000',
    tax = 'Rp 0',
    total = 'Rp 675.000',
    onApplyVoucher,
    onCheckout,
    className = '',
}) {
    const [voucherCode, setVoucherCode] = useState('');

    const handleApply = (e) => {
        e.preventDefault();
        if (voucherCode && onApplyVoucher) {
            onApplyVoucher(voucherCode);
        }
    };

    return (
        <div className={`p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 ${className}`}>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ringkasan Pesanan
            </h3>

            {/* Voucher input */}
            <form onSubmit={handleApply} className="flex gap-2">
                <Input
                    value={voucherCode}
                    onChange={(event) => setVoucherCode(event.target.value)}
                    placeholder="Kode Kupon / Voucher..."
                    containerClassName="flex-1"
                    size="sm"
                />
                <Button type="submit" variant="dark" size="sm">
                    Pakai
                </Button>
            </form>

            {/* Price breakdown */}
            <div className="space-y-3 text-xs border-y border-slate-100 dark:border-slate-800 py-4">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal Produk</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Estimasi Ongkos Kirim</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{shipping}</span>
                </div>
                {tax && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Biaya Administrasi</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{tax}</span>
                    </div>
                )}
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Total Pembayaran</span>
                <span className="text-xl font-black text-[#c0392b] dark:text-[#f0c060]">{total}</span>
            </div>

            {onCheckout && (
                <Button type="button" onClick={onCheckout} className="w-full shadow-md shadow-red-600/20">
                    Proses Pesanan Sekarang
                </Button>
            )}
        </div>
    );
}
