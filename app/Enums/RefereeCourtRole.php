<?php

namespace App\Enums;

enum RefereeCourtRole: string
{
    case Chief = 'chief';
    case RegionalOne = 'regional_1';
    case RegionalTwo = 'regional_2';
    case AssistantOne = 'assistant_1';
    case AssistantTwo = 'assistant_2';

    public function label(): string
    {
        return match ($this) {
            self::Chief => 'Wasit Utama',
            self::RegionalOne => 'Wasit Daerah 1',
            self::RegionalTwo => 'Wasit Daerah 2',
            self::AssistantOne => 'Wasit Pembantu 1',
            self::AssistantTwo => 'Wasit Pembantu 2',
        };
    }

    public function judgeNumber(): int
    {
        return match ($this) {
            self::Chief => 1,
            self::RegionalOne => 2,
            self::RegionalTwo => 3,
            self::AssistantOne => 4,
            self::AssistantTwo => 5,
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $role): string => $role->value, self::cases());
    }

    /** @return list<array{value: string, label: string}> */
    public static function options(): array
    {
        return array_map(fn (self $role): array => [
            'value' => $role->value,
            'label' => $role->label(),
        ], self::cases());
    }
}
