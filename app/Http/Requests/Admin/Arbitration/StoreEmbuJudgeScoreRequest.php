<?php

namespace App\Http\Requests\Admin\Arbitration;

use App\Services\Panitera\EmbuPenaltyCatalog;
use App\Services\Referee\EmbuRefereeScoreService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreEmbuJudgeScoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) ($user?->hasRole('Wasit') && ! $user->hasAnyRole(['Super Admin', 'Admin']));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $aspectKeys = implode(',', EmbuRefereeScoreService::AspectKeys);
        $penaltyKeys = implode(',', EmbuPenaltyCatalog::ManualKeys);

        return [
            'event_id' => ['required', 'uuid', 'exists:events,id'],
            'aspect_scores' => ['required', "array:{$aspectKeys}"],
            'aspect_scores.*' => ['nullable', 'integer', Rule::in([0, 7, 8, 9, 10])],
            'violation_penalties' => ['sometimes', "array:{$penaltyKeys}"],
            'violation_penalties.composition_count' => ['nullable', 'integer', Rule::in([0, 1])],
            'violation_penalties.rank_mismatch' => ['nullable', 'integer', 'min:0', 'max:6'],
            'violation_penalties.group_unsynchronized' => ['nullable', 'integer', Rule::in([0, 1])],
            'violation_penalties.group_signal' => ['nullable', 'integer', Rule::in([0, 1])],
            'violation_penalties.group_composition_mismatch' => ['nullable', 'integer', Rule::in([0, 1])],
            'signature' => ['nullable', 'string', 'max:2000000', 'regex:/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['draft', 'submitted'])],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->string('status')->toString() !== 'submitted') {
                    return;
                }

                $scores = $this->input('aspect_scores', []);
                $isComplete = collect(EmbuRefereeScoreService::AspectKeys)
                    ->every(fn (string $key): bool => array_key_exists($key, $scores) && $scores[$key] !== null && $scores[$key] !== '');

                if (! $isComplete) {
                    $validator->errors()->add('aspect_scores', 'Lengkapi seluruh 10 aspek penilaian sebelum mengirim nilai.');
                }

                if ($this->string('signature')->trim()->isEmpty()) {
                    $validator->errors()->add('signature', 'Tanda tangan Wasit wajib diisi sebelum mengirim nilai.');
                }
            },
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'aspect_scores.*.in' => 'Nilai setiap aspek hanya boleh 0, 7, 8, 9, atau 10.',
            'aspect_scores.*.integer' => 'Nilai setiap aspek harus berupa angka bulat.',
            'violation_penalties.array' => 'Pilihan pelanggaran Embu tidak valid.',
            'violation_penalties.*.integer' => 'Jumlah pelanggaran harus berupa angka bulat.',
            'violation_penalties.*.in' => 'Pilihan pelanggaran Embu tidak valid.',
            'violation_penalties.rank_mismatch.max' => 'Maksimal enam teknik dapat ditandai tidak sesuai tingkat.',
            'signature.regex' => 'Format tanda tangan digital tidak valid.',
            'signature.max' => 'Ukuran tanda tangan digital terlalu besar.',
            'notes.max' => 'Catatan maksimal 1.000 karakter.',
        ];
    }
}
