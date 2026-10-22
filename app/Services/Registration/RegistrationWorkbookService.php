<?php

namespace App\Services\Registration;

use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\Registration;
use App\Services\Reports\ReportWorkbook;
use Illuminate\Http\Request;

class RegistrationWorkbookService
{
    public function __construct(
        protected ReportWorkbook $workbook,
    ) {}

    /**
     * Build the Excel workbook for contingent registrations.
     *
     * @return array{filename: string, content: string}
     */
    public function exportRegistrasi(Event $event, Request $request): array
    {
        $status = $request->query('status', 'all');
        $search = $request->query('search');

        $query = Registration::query()
            ->with([
                'contingent' => fn ($contingentQuery) => $contingentQuery->withCount(['athletes', 'officials']),
                'event:id,name,is_paid',
                'paymentMethod:id,name',
            ])
            ->whereBelongsTo($event)
            ->latest();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('registration_number', 'like', "%{$search}%")
                    ->orWhereHas('contingent', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('city', 'like', "%{$search}%")
                            ->orWhere('manager_name', 'like', "%{$search}%");
                    });
            });
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $registrations = $query->get();

        $headers = [
            'No',
            'No. Registrasi',
            'Nama Kontingen / Dojo',
            'Kota / Wilayah',
            'Manajer Kontingen',
            'No. Telepon / WA',
            'Email',
            'Alamat',
            'Jumlah Atlet',
            'Jumlah Official',
            'Status Berkas',
            'Status Pembayaran',
            'Nominal Biaya (Rp)',
            'Metode Pembayaran',
            'No. Referensi Bayar',
            'Tanggal Registrasi',
        ];

        $rows = [];
        foreach ($registrations as $index => $registration) {
            $contingent = $registration->contingent;
            $statusLabel = match ($registration->status?->value ?? (string) $registration->status) {
                RegistrationStatus::Verified->value => 'Terverifikasi',
                RegistrationStatus::Rejected->value => 'Ditolak',
                default => 'Menunggu Verifikasi',
            };

            $paymentLabel = ! ($event->is_paid ?? true)
                ? 'Gratis · Tanpa Biaya'
                : match ($registration->payment_status?->value ?? (string) $registration->payment_status) {
                    PaymentStatus::Verified->value => 'Pembayaran Terverifikasi',
                    PaymentStatus::Submitted->value => 'Menunggu Verifikasi Bayar',
                    PaymentStatus::Rejected->value => 'Pembayaran Ditolak',
                    default => 'Belum Ada Pembayaran',
                };

            $amount = (float) ($registration->payment_amount ?: ($registration->final_amount ?: ($registration->total_amount ?: 0)));

            $rows[] = [
                $index + 1,
                $registration->registration_number ?? '-',
                $contingent?->name ?? '-',
                $contingent?->city ?? '-',
                $contingent?->manager_name ?? '-',
                $contingent?->phone ?? '-',
                $contingent?->email ?? '-',
                $contingent?->address ?? '-',
                (int) ($contingent?->athletes_count ?? 0),
                (int) ($contingent?->officials_count ?? 0),
                $statusLabel,
                $paymentLabel,
                $amount,
                $registration->paymentMethod?->name ?? ($registration->payment_method_id ? 'Transfer Bank' : '-'),
                $registration->payment_reference ?? '-',
                $registration->created_at?->translatedFormat('d M Y, H:i') ?? '-',
            ];
        }

        $title = 'DATA REGISTRASI KONTINGEN';
        $subtitle = $event->name.' · Diekspor pada '.now()->translatedFormat('d M Y, H:i');
        $content = $this->workbook->build($title, $subtitle, $headers, $rows);
        $filename = $this->workbook->filename($title, $event->name);

        return [
            'filename' => $filename,
            'content' => $content,
        ];
    }

    /**
     * Build the Excel workbook for Match Groups (Nomor & Kelompok Pertandingan).
     *
     * @return array{filename: string, content: string}
     */
    public function exportMatchGroups(Event $event, Request $request): array
    {
        $selectedRegistrationId = $request->query('registration_id');
        $type = $request->query('type', 'all');

        $registration = null;
        if ($selectedRegistrationId) {
            $registration = Registration::query()
                ->whereBelongsTo($event)
                ->whereKey($selectedRegistrationId)
                ->with('contingent')
                ->first();
        }

        $entriesQuery = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->with([
                'athlete.contingent:id,name,city',
                'matchCategory.ageCategory:id,name,min_age,max_age',
            ])
            ->when($registration, function ($q) use ($registration) {
                $q->whereHas('athlete', fn ($aq) => $aq->where('contingent_id', $registration->contingent_id));
            })
            ->when($type && $type !== 'all', function ($q) use ($type) {
                $q->whereHas('matchCategory', fn ($mq) => $mq->where('type', $type));
            });

        $entries = $entriesQuery->get();

        // Load all Embu team techniques for this event
        $techniques = EmbuTeamTechnique::query()
            ->where('event_id', $event->id)
            ->when($registration, fn ($q) => $q->where('contingent_id', $registration->contingent_id))
            ->with('technique:id,name')
            ->orderBy('order')
            ->get()
            ->groupBy(fn (EmbuTeamTechnique $item): string => "{$item->contingent_id}:{$item->event_match_category_id}:{$item->team_number}");

        $sortedEntries = $entries->sortBy([
            fn (AthleteMatchCategoryEntry $a, AthleteMatchCategoryEntry $b) => strcmp($a->athlete?->contingent?->name ?? '', $b->athlete?->contingent?->name ?? ''),
            fn (AthleteMatchCategoryEntry $a, AthleteMatchCategoryEntry $b) => ($a->matchCategory?->order ?? 999) <=> ($b->matchCategory?->order ?? 999),
            fn (AthleteMatchCategoryEntry $a, AthleteMatchCategoryEntry $b) => ($a->team_number ?? 1) <=> ($b->team_number ?? 1),
            fn (AthleteMatchCategoryEntry $a, AthleteMatchCategoryEntry $b) => strcmp($a->athlete?->name ?? '', $b->athlete?->name ?? ''),
        ])->values();

        $headers = [
            'No',
            'Nama Kontingen / Dojo',
            'Kota / Wilayah',
            'Nomor Pertandingan',
            'Kategori',
            'Kelompok Usia',
            'Jenis Kelamin',
            'Tim / Regu',
            'Nama Atlet',
            'No. Kenshi',
            'Tingkatan (Kyu/Dan)',
            'Berat Badan (kg)',
            'Teknik Embu (Jurus)',
        ];

        $rows = [];
        foreach ($sortedEntries as $index => $entry) {
            $athlete = $entry->athlete;
            $contingent = $athlete?->contingent;
            $category = $entry->matchCategory;

            $categoryTypeLabel = match ($category?->type) {
                'embu' => 'Embu (Kerapian Teknik)',
                'randori' => 'Randori (Perkelahian Bebas)',
                default => ucfirst((string) $category?->type),
            };

            $genderLabel = match ($category?->gender) {
                'male' => 'Putra',
                'female' => 'Putri',
                'mixed' => 'Campuran',
                default => '-',
            };

            $teamLabel = $category?->type === 'embu'
                ? 'Tim / Regu '.($entry->team_number ?? 1)
                : 'Perorangan';

            $techniqueKey = "{$contingent?->id}:{$category?->id}:".($entry->team_number ?? 1);
            $techniqueNames = $techniques->get($techniqueKey, collect())
                ->map(fn (EmbuTeamTechnique $t, int $i): string => ($i + 1).'. '.($t->technique?->name ?? '-'))
                ->implode('; ');

            $rows[] = [
                $index + 1,
                $contingent?->name ?? '-',
                $contingent?->city ?? '-',
                $category?->name ?? '-',
                $categoryTypeLabel,
                $category?->ageCategory?->name ?? '-',
                $genderLabel,
                $teamLabel,
                $athlete?->name ?? '-',
                $athlete?->kenshi_number ?? '-',
                $athlete?->kyu_dan ?? '-',
                $athlete?->weight ? (float) $athlete->weight : '-',
                $techniqueNames ?: '-',
            ];
        }

        $title = 'DATA NOMOR DAN KELOMPOK PERTANDINGAN';
        $subtitle = $event->name
            .($registration ? ' · Kontingen: '.$registration->contingent?->name : '')
            .(' · Diekspor pada '.now()->translatedFormat('d M Y, H:i'));

        $content = $this->workbook->build($title, $subtitle, $headers, $rows);
        $filename = $this->workbook->filename($title, $event->name);

        return [
            'filename' => $filename,
            'content' => $content,
        ];
    }

    /**
     * Build the Excel workbook for Athlete Verification (Verifikasi Atlet & Berkas).
     *
     * @return array{filename: string, content: string}
     */
    public function exportVerification(Event $event, Request $request): array
    {
        $search = $request->query('search');
        $contingentId = $request->query('contingent_id');
        $categoryType = $request->query('category_type');

        $query = Athlete::query()
            ->with([
                'contingent:id,name,city',
                'matchCategoryEntries' => fn ($entryQuery) => $entryQuery
                    ->whereBelongsTo($event)
                    ->with('matchCategory:id,name,type,order'),
            ])
            ->whereHas('contingent', fn ($cq) => $cq->whereBelongsTo($event))
            ->orderBy('contingent_id')
            ->orderBy('name');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('kyu_dan', 'like', "%{$search}%")
                    ->orWhere('kenshi_number', 'like', "%{$search}%");
            });
        }

        if ($contingentId) {
            $query->where('contingent_id', $contingentId);
        }

        if ($categoryType && in_array($categoryType, ['embu', 'randori'], true)) {
            $query->whereHas('matchCategoryEntries', fn ($entryQuery) => $entryQuery
                ->whereBelongsTo($event)
                ->whereHas('matchCategory', fn ($mq) => $mq->where('type', $categoryType)));
        }

        $athletes = $query->get();

        $headers = [
            'No',
            'Nama Atlet',
            'Kontingen / Dojo',
            'Kota / Wilayah',
            'Jenis Kelamin',
            'Tanggal Lahir',
            'Usia (Thn)',
            'NIK / No. Identitas',
            'No. Kenshi',
            'Tingkatan (Kyu/Dan)',
            'Berat Badan (kg)',
            'Tinggi Badan (cm)',
            'Nomor Pertandingan Diikuti',
            'Total Nomor',
            'Status Kesiapan Tanding',
        ];

        $rows = [];
        foreach ($athletes as $index => $athlete) {
            $contingent = $athlete->contingent;
            $entries = $athlete->matchCategoryEntries;

            $categoryNames = $entries
                ->sortBy(fn (AthleteMatchCategoryEntry $e) => $e->matchCategory?->order ?? 999)
                ->map(fn (AthleteMatchCategoryEntry $e) => ($e->matchCategory?->name ?? '-').($e->team_number ? ' (Tim '.$e->team_number.')' : ''))
                ->implode(', ');

            $genderLabel = match ($athlete->gender) {
                'male' => 'Putra',
                'female' => 'Putri',
                default => '-',
            };

            $age = $athlete->birth_date ? (int) $athlete->birth_date->diffInYears(now()) : '-';
            $readiness = $entries->isNotEmpty() ? 'Siap Tanding' : 'Belum Memilih Nomor';

            $rows[] = [
                $index + 1,
                $athlete->name ?? '-',
                $contingent?->name ?? '-',
                $contingent?->city ?? '-',
                $genderLabel,
                $athlete->birth_date?->format('d/m/Y') ?? '-',
                $age,
                $athlete->nik ?? '-',
                $athlete->kenshi_number ?? '-',
                $athlete->kyu_dan ?? '-',
                $athlete->weight ? (float) $athlete->weight : '-',
                $athlete->height ? (float) $athlete->height : '-',
                $categoryNames ?: '-',
                $entries->count(),
                $readiness,
            ];
        }

        $title = 'DATA VERIFIKASI PESERTA DAN ATLET';
        $subtitle = $event->name.' · Diekspor pada '.now()->translatedFormat('d M Y, H:i');
        $content = $this->workbook->build($title, $subtitle, $headers, $rows);
        $filename = $this->workbook->filename($title, $event->name);

        return [
            'filename' => $filename,
            'content' => $content,
        ];
    }
}
