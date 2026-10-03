<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class WelcomeService
{
    /**
     * Get all data needed for the landing page.
     *
     * @return array{
     *     stats: array{peserta: string, nomor: string, kontingen: string},
     *     techniquesByLevel: array<int, array{name: string, techniques: array<int, array{name: string}>}>
     * }
     */
    public function getLandingData(): array
    {
        return [
            'stats' => $this->getStats(),
            'techniquesByLevel' => $this->getTechniquesByLevel(),
        ];
    }

    /**
     * Get championship statistics with Redis caching.
     *
     * @return array{peserta: string, nomor: string, kontingen: string}
     */
    public function getStats(): array
    {
        return Cache::remember('welcome_stats', 600, function (): array {
            return [
                'peserta' => '500+',
                'nomor' => '30+',
                'kontingen' => '20+',
            ];
        });
    }

    /**
     * Get official Shorinji Kempo techniques grouped by belt/kyu level.
     *
     * @return array<int, array{name: string, techniques: array<int, array{name: string}>}>
     */
    public function getTechniquesByLevel(): array
    {
        return Cache::remember('welcome_techniques', 3600, function (): array {
            return [
                [
                    'name' => 'Kyu 6 & 5',
                    'techniques' => [
                        ['name' => 'Tsuki / Uchi (Pukulan & Tebasan)'],
                        ['name' => 'Keri (Tendangan Dasar)'],
                        ['name' => 'Uke (Tangkisan Dasar)'],
                        ['name' => 'Ryote Yori Ude Morote Dori'],
                        ['name' => 'Kote Nuki'],
                        ['name' => 'Ude Juji Gatame'],
                    ],
                ],
                [
                    'name' => 'Kyu 4 & 3',
                    'techniques' => [
                        ['name' => 'Gyaku Geri'],
                        ['name' => 'Uchi Uke Tsuki'],
                        ['name' => 'Ryote Yori Kote Nuki'],
                        ['name' => 'Gyaku Gote'],
                        ['name' => 'Maki Gote'],
                        ['name' => 'Kiri Gaeshi'],
                    ],
                ],
                [
                    'name' => 'Kyu 2 & 1',
                    'techniques' => [
                        ['name' => 'Chudan Tsuki & Uchi Geri'],
                        ['name' => 'Jodan Uke Dageki'],
                        ['name' => 'Okuri Gote'],
                        ['name' => 'Kiri Gote'],
                        ['name' => 'Gassho Gote'],
                        ['name' => 'Ude Maki'],
                    ],
                ],
                [
                    'name' => 'Dan 1 (Shodan)',
                    'techniques' => [
                        ['name' => 'Tsubame Gaeshi'],
                        ['name' => 'Chidori Gaeshi'],
                        ['name' => 'Kumo Garami'],
                        ['name' => 'Oshi Kiri Gote'],
                        ['name' => 'Gyaku Gote Sode Maki'],
                        ['name' => 'Ryote Maki Gote'],
                    ],
                ],
                [
                    'name' => 'Dan 2 (Nidan)',
                    'techniques' => [
                        ['name' => 'Furi Dori Gyaku Gote'],
                        ['name' => 'Hiki Gote'],
                        ['name' => 'Kubi Jime Nuki'],
                        ['name' => 'Tora Otoshi'],
                        ['name' => 'Kusari Gote'],
                        ['name' => 'Me Nuki Dori'],
                    ],
                ],
            ];
        });
    }
}
