<?php

namespace Database\Factories;

use App\Models\EmbuJudgeScore;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmbuJudgeScore>
 */
class EmbuJudgeScoreFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tiebreak_round' => 0,
            'judge_number' => 1,
            'role' => 'chief',
            'aspect_scores' => [
                'goho_attack' => 8,
                'goho_defense' => 8,
                'goho_counter' => 8,
                'juho_escape' => 8,
                'juho_lock_throw' => 8,
                'juho_ground' => 8,
                'expression_sequence' => 8,
                'expression_stance' => 8,
                'expression_spirit' => 8,
                'expression_breath_zanshin' => 8,
            ],
            'completed_items' => 10,
            'technique_subtotal' => 48,
            'expression_subtotal' => 32,
            'total_score' => 80,
            'status' => 'submitted',
            'signature' => 'data:image/png;base64,'.base64_encode('factory-signature'),
            'signed_at' => now(),
            'submitted_at' => now(),
        ];
    }
}
