<?php

namespace App\Http\Requests\Admin\Panitera;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreEmbuScoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('judge_scores') && is_array($this->input('judge_scores'))) {
            $filtered = array_values(array_filter(
                $this->input('judge_scores'),
                fn ($val) => $val !== null && $val !== ''
            ));

            $this->merge([
                'judge_scores' => $filtered,
            ]);
        }
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
            'judge_scores' => ['required', 'array', 'min:1', 'max:5'],
            'judge_scores.*' => ['required', 'numeric', 'between:0,100'],
            'duration_seconds' => ['nullable', 'integer', 'between:0,600'],
            'penalty_override' => ['nullable', 'numeric', 'between:0,100'],
            'tiebreak_round' => ['required', 'integer', 'between:0,20'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'return_to_match' => ['nullable', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'judge_scores.required' => 'Minimal satu nilai juri wajib diisi.',
            'judge_scores.min' => 'Minimal satu nilai juri wajib diisi.',
            'judge_scores.max' => 'Maksimal lima nilai juri dapat dimasukkan.',
            'judge_scores.*.between' => 'Nilai setiap juri harus berada pada rentang 0 sampai 100.',
            'duration_seconds.between' => 'Durasi pertandingan harus berada pada rentang 0 sampai 600 detik.',
        ];
    }
}
