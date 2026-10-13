<?php

namespace App\Http\Requests\Admin\Panitera;

use App\Services\Panitera\EmbuPenaltyCatalog;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmbuPenaltiesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $penaltyKeys = implode(',', EmbuPenaltyCatalog::ManualKeys);

        return [
            'event_id' => ['required', 'uuid'],
            'violation_penalties' => ['required', "array:{$penaltyKeys}"],
            'violation_penalties.composition_count' => ['nullable', 'integer', Rule::in([0, 1])],
            'violation_penalties.rank_mismatch' => ['nullable', 'integer', 'min:0', 'max:6'],
            'violation_penalties.group_unsynchronized' => ['nullable', 'integer', Rule::in([0, 1])],
            'violation_penalties.group_signal' => ['nullable', 'integer', Rule::in([0, 1])],
            'violation_penalties.group_composition_mismatch' => ['nullable', 'integer', Rule::in([0, 1])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'violation_penalties.required' => 'Pilih kondisi denda teknis Embu terlebih dahulu.',
            'violation_penalties.array' => 'Pilihan denda teknis Embu tidak valid.',
            'violation_penalties.*.integer' => 'Jumlah pelanggaran harus berupa angka bulat.',
            'violation_penalties.*.in' => 'Pilihan pelanggaran Embu tidak valid.',
            'violation_penalties.rank_mismatch.max' => 'Maksimal enam teknik dapat ditandai tidak sesuai tingkat.',
        ];
    }
}
