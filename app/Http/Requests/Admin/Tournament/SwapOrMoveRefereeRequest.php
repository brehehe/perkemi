<?php

namespace App\Http\Requests\Admin\Tournament;

use Illuminate\Foundation\Http\FormRequest;

class SwapOrMoveRefereeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'event_id' => ['required', 'uuid', 'exists:events,id'],
            'source_referee_id' => ['required', 'uuid', 'exists:referees,id'],
            'target_referee_id' => ['nullable', 'uuid', 'exists:referees,id', 'different:source_referee_id'],
            'target_court_id' => ['nullable', 'uuid', 'exists:event_courts,id'],
            'target_role' => ['nullable', 'string', 'in:chief,assistant_1,assistant_2,assistant_3,assistant_4,regional_1,regional_2,reserve'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'source_referee_id.required' => 'Pilih wasit yang ingin dipindah atau ditukar.',
            'source_referee_id.exists' => 'Wasit asal tidak ditemukan dalam master data.',
            'target_referee_id.different' => 'Wasit tujuan tidak boleh sama dengan wasit asal.',
            'target_referee_id.exists' => 'Wasit tujuan tidak ditemukan dalam master data.',
            'target_court_id.exists' => 'Court tujuan tidak ditemukan.',
            'target_role.in' => 'Posisi wasit yang dipilih tidak valid.',
        ];
    }
}
