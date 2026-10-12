<?php

namespace App\Http\Requests\Admin\Panitera;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateChampionResultRequest extends FormRequest
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
        return [
            'event_id' => ['required', 'uuid'],
            'champions' => ['required', 'array', 'min:1', 'max:4'],
            'champions.*' => ['required', 'array:rank,participant_key'],
            'champions.*.rank' => ['required', 'integer', 'between:1,4', 'distinct'],
            'champions.*.participant_key' => ['required', 'string', 'max:255', 'distinct'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'champions.required' => 'Susunan juara wajib diisi.',
            'champions.min' => 'Minimal satu juara harus dipilih.',
            'champions.max' => 'Maksimal empat juara dapat disimpan.',
            'champions.*.rank.required' => 'Peringkat juara wajib diisi.',
            'champions.*.rank.distinct' => 'Setiap peringkat hanya boleh digunakan satu kali.',
            'champions.*.participant_key.required' => 'Peserta untuk setiap peringkat wajib dipilih.',
            'champions.*.participant_key.distinct' => 'Peserta yang sama tidak boleh menempati dua peringkat.',
        ];
    }
}
