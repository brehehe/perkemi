<?php

namespace App\Http\Requests\Admin\Master;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEventTournamentSettingsRequest extends FormRequest
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
            'match_duration_minutes' => ['required', 'integer', 'min:1', 'max:120'],
            'minimum_rest_minutes' => ['required', 'integer', 'min:0', 'max:240'],
            'minimum_entries_per_category' => ['required', 'integer', 'min:2', 'max:32'],
            'minimum_contingents_per_category' => ['required', 'integer', 'min:2', 'max:32'],
        ];
    }
}
