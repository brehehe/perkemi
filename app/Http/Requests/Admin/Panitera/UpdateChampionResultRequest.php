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
            'champions.*' => ['required', 'array'],
            'champions.*.rank' => ['required', 'integer', 'between:1,4'],
            'champions.*.participant_key' => ['nullable', 'string', 'max:255'],
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
            'champions.*.rank.between' => 'Peringkat juara harus antara 1 sampai 4.',
        ];
    }
}
