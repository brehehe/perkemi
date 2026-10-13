<?php

namespace App\Services\Panitera;

use Illuminate\Support\Str;

final class EmbuPenaltyCatalog
{
    public const CompositionCount = 'composition_count';

    public const RankMismatch = 'rank_mismatch';

    public const GroupUnsynchronized = 'group_unsynchronized';

    public const GroupSignal = 'group_signal';

    public const GroupCompositionMismatch = 'group_composition_mismatch';

    /** @var list<string> */
    public const ManualKeys = [
        self::CompositionCount,
        self::RankMismatch,
        self::GroupUnsynchronized,
        self::GroupSignal,
        self::GroupCompositionMismatch,
    ];

    /**
     * @return list<array{key: string, number: int, label: string, points: int, per_item: bool, maximum_quantity: int, explanation: string}>
     */
    public function options(string $categoryName): array
    {
        $options = [
            [
                'key' => self::CompositionCount,
                'number' => 3,
                'label' => 'Jumlah komposisi tidak 6',
                'points' => 10,
                'per_item' => false,
                'maximum_quantity' => 1,
                'explanation' => 'Embu wajib terdiri dari enam rangkaian teknik (Zanshin ke Zanshin).',
            ],
            [
                'key' => self::RankMismatch,
                'number' => 4,
                'label' => 'Teknik tidak sesuai tingkat (rank)',
                'points' => 10,
                'per_item' => true,
                'maximum_quantity' => 6,
                'explanation' => 'Dikurangi 10 poin untuk setiap teknik yang tidak sesuai tingkat peserta.',
            ],
        ];

        if ($this->isGroup($categoryName)) {
            $options = [
                ...$options,
                [
                    'key' => self::GroupUnsynchronized,
                    'number' => 5,
                    'label' => 'Gerakan beregu tidak seragam',
                    'points' => 10,
                    'per_item' => false,
                    'maximum_quantity' => 1,
                    'explanation' => 'Anggota beregu tidak melakukan gerakan secara seragam atau sinkron.',
                ],
                [
                    'key' => self::GroupSignal,
                    'number' => 6,
                    'label' => 'Menggunakan aba-aba atau sinyal',
                    'points' => 5,
                    'per_item' => false,
                    'maximum_quantity' => 1,
                    'explanation' => 'Terdapat kode suara atau gerakan untuk menyamakan penampilan beregu.',
                ],
                [
                    'key' => self::GroupCompositionMismatch,
                    'number' => 7,
                    'label' => 'Komposisi beregu berbeda antaranggota',
                    'points' => 10,
                    'per_item' => false,
                    'maximum_quantity' => 1,
                    'explanation' => 'Ada anggota yang melakukan rangkaian Embu berbeda dari anggota lainnya.',
                ],
            ];
        }

        return $options;
    }

    /** @param array<string, mixed> $penalties
     * @return array<string, int>
     */
    public function normalize(array $penalties, string $categoryName): array
    {
        return collect($this->options($categoryName))
            ->mapWithKeys(function (array $option) use ($penalties): array {
                $quantity = max(0, min($option['maximum_quantity'], (int) ($penalties[$option['key']] ?? 0)));

                return $quantity > 0 ? [$option['key'] => $quantity] : [];
            })
            ->all();
    }

    /** @param array<string, mixed> $penalties */
    public function points(array $penalties, string $categoryName): float
    {
        $normalized = $this->normalize($penalties, $categoryName);

        return (float) collect($this->options($categoryName))
            ->sum(fn (array $option): int => ($normalized[$option['key']] ?? 0) * $option['points']);
    }

    /** @param array<string, mixed> $penalties
     * @return list<array{key: string, number: int, label: string, quantity: int, points: int}>
     */
    public function summaries(array $penalties, string $categoryName): array
    {
        $normalized = $this->normalize($penalties, $categoryName);

        return collect($this->options($categoryName))
            ->filter(fn (array $option): bool => isset($normalized[$option['key']]))
            ->map(fn (array $option): array => [
                'key' => $option['key'],
                'number' => $option['number'],
                'label' => $option['label'],
                'quantity' => $normalized[$option['key']],
                'points' => $normalized[$option['key']] * $option['points'],
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{number: int, label: string, sanction: string, explanation: string}>
     */
    public function automaticRules(): array
    {
        return [
            [
                'number' => 1,
                'label' => 'Waktu Embu kurang atau melebihi batas',
                'sanction' => 'Denda waktu otomatis',
                'explanation' => 'Dihitung dari durasi resmi pada timer Panitera dan tidak perlu dipilih Wasit.',
            ],
            [
                'number' => 2,
                'label' => 'Melebihi waktu maksimum (>3 menit)',
                'sanction' => 'Diskualifikasi otomatis',
                'explanation' => 'Status diskualifikasi ditetapkan otomatis dari durasi resmi pertandingan.',
            ],
        ];
    }

    public function isGroup(string $categoryName): bool
    {
        return Str::contains(Str::lower($categoryName), ['beregu', 'group']);
    }
}
